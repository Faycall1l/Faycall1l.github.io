---
title: "Context Engineering for Agents: Budgets, Trimming, Compaction, and Just-in-Time Context"
description: "Context is finite and degrades before it fills. Token budgets, valid trimming, running summaries, compaction, and just-in-time retrieval, with runnable LangGraph code."
date: 2026-09-11
tags: ["agents", "context-management", "langgraph", "tutorial"]
---

The first article in this series built an agent loop. This one keeps that loop alive past turn ten. The core fact, documented independently by Anthropic, LangChain, Cognition, and a growing experimental literature, is simple: **context is a finite resource that degrades before it fills.** Models lose precision on long inputs well short of their advertised windows (Anthropic calls the slope a performance gradient, not a cliff; production observers call the symptom "context rot"). Token spend, latency, and error rate all grow with what you put in the window. Context engineering is the discipline of deciding what goes in, what stays out, and what gets rewritten along the way.

## 1. The mental model: transient vs. persistent

LangChain's current framing is the clearest available, so I adopt it. Every turn of the loop touches three context types:

| Context | What you control | Lifetime |
|---|---|---|
| **Model context** | Instructions, message history, tools, response format for one call | Transient: affects a single call, nothing saved |
| **Tool context** | What tools read (state, store, config) and write back | Persistent: writes survive the turn |
| **Life-cycle context** | What happens between steps: summarization, guardrails, logging | Persistent: rewrites state for all future turns |

The distinction that matters: trimming messages before a model call is **transient** (the full history still exists in state), while summarization is **persistent** (old messages are replaced for every future turn). Confusing the two is the source of a classic production bug, covered in section 4.

## 2. Tutorial A: enforce a token budget with valid trimming

The cheapest context policy is a budget: never send more than N tokens of history, keep the system prompt, keep the recent tail, and always produce history the model accepts. The trimming function implements exactly this, and its validity rules are worth memorizing: history should start with a human message (or system then human), tool messages must follow the assistant message that requested them, and the system message should survive trimming.

```python
from langchain_core.messages import (
    HumanMessage, AIMessage, SystemMessage, trim_messages,
)

history = [
    SystemMessage("You are a concise site-reliability assistant."),
    HumanMessage("The checkout latency p99 spiked at 14:00."),
    AIMessage("Checking the deploy log and recent config changes."),
    HumanMessage("It started right after the cache rollout."),
    AIMessage("Likely cause: cache rollout. Recommend rollback first."),
    HumanMessage("Draft the incident note."),
]

trimmed = trim_messages(
    history,
    token_counter=len,   # len counts messages; swap in a model for tokens
    max_tokens=4,        # budget: system + 3 most recent
    strategy="last",
    start_on="human",    # guarantees valid history shape
    include_system=True, # system prompt survives trimming
)
for m in trimmed:
    print(type(m).__name__, "-", m.content[:60])
```

With length-based counting, the budget counts messages; with a chat model (or the approximate counter) it counts tokens. The settings above are the ones the reference docs recommend as defaults, and deviating from any of them has a known failure attached: dropping the system-message flag loses your instructions mid-conversation, dropping the human-start rule produces histories some providers reject, and trimming tool-call pairs apart produces orphan tool messages the next call chokes on. That last one deserves emphasis: **never trim between an assistant tool call and its tool result.** Trim around complete pairs.

Where this belongs in an agent: wrap it in the model-call path (middleware hooks in recent LangChain versions) so the stored history stays complete while each individual call sees a bounded window. Transient control, persistent record. That separation is the whole game.

## 3. Tutorial B: running summaries that compound

Trimming discards. Summarization compresses: when history passes a threshold, fold the old part into a running summary, delete the originals, and prepend the summary on future turns. The standard pattern, from LangGraph's own how-to guides:

```python
from langchain.chat_models import init_chat_model

model = init_chat_model("openai:gpt-4o-mini")  # any chat model works
# Requires OPENAI_API_KEY in the environment.

from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import (
    HumanMessage, SystemMessage, RemoveMessage,
)

class State(MessagesState):
    summary: str  # running summary lives alongside messages

def call_model(state: State):
    messages = state["messages"]
    if state.get("summary"):
        messages = [
            SystemMessage(f"Summary of earlier conversation: {state['summary']}")
        ] + messages
    return {"messages": [model.invoke(messages)]}

def maybe_summarize(state: State):
    # Keep this policy explicit: summarize past N, keep the recent tail.
    if len(state["messages"]) <= 8:
        return {"messages": []}
    to_fold = state["messages"][:-2]
    prompt = (
        "Condense these turns into durable facts, open questions, "
        "and decisions. Drop chit-chat."
        if not state.get("summary") else
        f"Prior summary: {state['summary']}\nFold in the new turns below, "
        "keeping facts, open questions, and decisions. Drop chit-chat."
    )
    summary = model.invoke(to_fold + [HumanMessage(prompt)]).content
    # RemoveMessage deletes by id; keep the recent tail intact.
    deletions = [RemoveMessage(id=m.id) for m in to_fold]
    return {"summary": summary, "messages": deletions}
```

Three details that separate working implementations from broken ones:

1. **The summary prompt must say what to keep.** "Summarize" alone produces narrative; "durable facts, open questions, decisions" produces working memory. The compaction literature (Anthropic, 2025) converges on the same point: summaries need a schema, even an informal one.
2. **Removal requires the messages reducer.** Deletion markers only take effect on state declared with MessagesState (or the equivalent message reducer). On a plain list field they are appended as literal messages, which I verified the embarrassing way. If your deletions silently do nothing, check the reducer first.
3. **Summarize on count or on tokens, never on vibes.** A fixed threshold (messages, or better, measured tokens against the model's window) makes the behavior testable. A common production setting is compacting at 70 to 80 percent of the window while keeping the last 10 to 20 messages verbatim.

## 4. The UI bug everyone ships once

Summarization permanently rewrites checkpointer state: after compaction, the thread holds the summary plus the recent tail, and the originals are gone. That is correct for the model and catastrophic for the product if your interface reads from the same state, because the user's visible history vanishes mid-conversation. The fix, articulated well in LangChain community practice: **keep two records.** An append-only table of every message ever (for the UI, owned by your application code, never rewritten) and the checkpointer's working context (for the model, rewritten freely). One is a log; the other is memory. They serve different readers.

## 5. Beyond the window: compaction, notes, and just-in-time context

Trimming and summarization manage a single window. Long-horizon work needs three more moves:

- **Compaction across windows.** When a session nears the limit, summarize the whole thing and restart fresh with the summary, as coding agents (Claude Code, Cursor) do routinely. Anthropic's harness research adds a practical refinement: the *first* session should be an initializer that leaves structured artifacts (progress file, specs, git history) so the next window starts from state, not from a vague recap. A progress file the agent maintains itself beats a summary generated blindly, because it records intent, not just events.
- **Structured note-taking.** Have the agent persist small notes outside the window (decisions, user facts, strategies that worked) and pull them back selectively. This keeps recall cheap: small notes in, small notes out, and the window holds only the current task.
- **Just-in-time retrieval over stuffing.** Prefer fetching context when needed (a file read, a memory lookup, a doc search) over preloading everything that might matter. Anthropic's multi-agent work is the extreme version: many subagents with narrow isolated windows outperform one agent with everything, though at up to 15x the token cost. Narrow, relevant context beats broad, complete context: pruned recent-tool context beats full history on both accuracy and cost in the 2026 experiments cited below.

Two more budget lines practitioners underrate: **tool definitions are context too.** Every tool's name, description, and schema is sent on every model call, so a 40-tool agent pays for 40 tools per step whether it uses them or not. Curate the set per stage (retrieval over tool descriptions, per-task subsets), and write descriptions precisely, as last week's tools section argued. And **examples are expensive**: few-shot demonstrations work, but a laundry list of edge cases in the system prompt is usually the largest single compressible block. Move stable examples to retrieval; keep the prompt minimal.

## Exercises

1. Attach a token counter to Tutorial A and plot kept-tokens versus turns for a 30-turn scripted conversation, with and without trimming. The curve is the reason budgets exist.
2. Break Tutorial B on purpose: summarize with the prompt "summarize this" and compare what survives versus the facts/questions/decisions prompt on a technical discussion. Keep the diff; it is your specification for summary quality.
3. Implement the two-record split: an append-only list for display plus checkpointer state for the model, and demonstrate that compaction no longer touches the display log.

## References

1. Anthropic (2025). *Effective context engineering for AI agents.* https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
2. Anthropic (2025). *Effective harnesses for long-running agents.* https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
3. LangChain docs. *Context engineering in agents.* https://docs.langchain.com/oss/python/langchain/context-engineering
4. LangChain docs. *Chat history and message management.* https://python.langchain.com/docs/concepts/chat_history
5. LangGraph how-to. *Add summary of the conversation history* and *Manage conversation history.* https://github.com/dkacz/langgraph-app
6. LangChain Open Tutorial. *Conversation summaries with LangGraph.* https://github.com/LangChain-OpenTutorial/LangChain-OpenTutorial
7. Kang et al. (2026). *Less Context, Better Agents.* https://arxiv.org/html/2606.10209v1
8. Cognition / Windsurf, via LangChain blog (2025). *Context engineering for agents.* https://www.langchain.com/blog/context-engineering-for-agents
