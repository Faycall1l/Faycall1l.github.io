---
title: "Agent Memory in Practice: Threads, Stores, and the Two-Layer Habit"
description: "Short-term continuity with checkpointers, long-term recall with stores, write policies that decide what deserves persisting, and an honest map of Mem0, Zep, Letta, and LangMem."
date: 2026-09-18
tags: ["agents", "memory", "langgraph", "context-management", "tutorial"]
---

Last week managed a single context window. This week persists across windows. The organizing principle, taken from LangGraph's persistence design because it is the cleanest available: **two layers with different jobs.** A checkpointer keeps the current thread going (short-term, per-conversation). A store keeps facts alive across threads (long-term, per-user or per-application). Most confusion in agent memory comes from asking one layer to do the other's job, so we will build each separately, verify each mechanically, then combine them.

## 1. Layer one: thread continuity with a checkpointer

A checkpointer snapshots graph state at every step, keyed by thread ID. Same thread, the agent remembers; new thread, fresh start. Everything below runs without any model API key, using a stub, because continuity is a state mechanic, not a model behavior. Do not pay for tokens to test plumbing.

```python
from langgraph.graph import StateGraph, START, MessagesState
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import HumanMessage, AIMessage

def echo(state: MessagesState):
    n = sum(isinstance(m, HumanMessage) for m in state["messages"])
    return {"messages": [AIMessage(f"turn {n} acknowledges prior turns")]}

graph = StateGraph(MessagesState)
graph.add_node("echo", echo)
graph.add_edge(START, "echo")
app = graph.compile(checkpointer=InMemorySaver())

config = {"configurable": {"thread_id": "demo-1"}}
app.invoke({"messages": [HumanMessage("My deploy region is eu-west.")]}, config)
result = app.invoke({"messages": [HumanMessage("Which region?")]}, config)
print("thread holds", len(result["messages"]), "messages")
# New thread, same agent: nothing carries over. That is the point.
fresh = app.invoke(
    {"messages": [HumanMessage("Which region?")]},
    {"configurable": {"thread_id": "demo-2"}},
)
print("fresh thread holds", len(fresh["messages"]), "messages")
```

Checkpoints also buy fault tolerance (failed steps resume without recomputing successful ones), human-in-the-loop (inspect and edit state mid-run), and time travel (replay from any prior checkpoint). Those three are why a checkpointer is infrastructure rather than a convenience. Two operational notes from the docs: the in-memory saver evaporates on restart (use the Postgres or SQLite backends for anything real; run setup once to create tables), and checkpoints accumulate without bound, so set a retention policy on long-lived threads. Keep thread IDs under 255 characters on Postgres backends.

## 2. Layer two: cross-thread facts with a store

The store is a namespaced key-value memory: tuples like ("ada", "preferences") scope facts, keys identify them, values are plain dicts with creation and update timestamps attached. Same mechanics, no API key:

```python
from langgraph.store.memory import InMemoryStore

store = InMemoryStore()
store.put(("ada", "preferences"), "style", {"tone": "terse"})
store.put(("ada", "facts"), "region", {"deploy_region": "eu-west"})

print(store.get(("ada", "preferences"), "style").value)
# Prefix search lists a namespace; exact namespaces stay isolated.
for item in store.search(("ada",)):
    print(item.namespace, item.key, item.value)
```

Three behaviors worth knowing before they surprise you: prefix search matches by prefix (searching ("ada",) returns preferences *and* facts), results past the limit truncate silently (default 10), and ordering is backend-dependent (insertion order in memory, last-updated-first on Postgres). If order matters, sort client-side on the update timestamp. If you need to enumerate users rather than memories, namespace listing exists for exactly that.

For semantic recall, the store takes an index configuration with an embedding provider, after which search accepts a natural-language query and returns ranked items. That path needs an embedding API and is therefore shown here from the docs rather than executed:

```python
from langchain.embeddings import init_embeddings

store = InMemoryStore(index={
    "embed": init_embeddings("openai:text-embedding-3-small"),
    "dims": 1536,
    "fields": ["$"],  # embed whole values; name fields to narrow it
})
hits = store.search(("ada", "facts"), query="where do we deploy?", limit=3)
```

Control what gets embedded per item by naming fields on write, or flag records that should be retrievable but never ranked. Embedding everything is how stores get slow and weird; the field list is a retrieval policy, treat it like one.

## 3. Combining them: the node that reads memory

Compilation accepts both layers at once, and any node can read the store through the runtime. The canonical pattern: namespace by user, retrieve with the latest message as the query, inject hits into the model call.

```python
from dataclasses import dataclass
from langgraph.graph import START
from langgraph.runtime import Runtime
from langchain.chat_models import init_chat_model

model = init_chat_model("openai:gpt-4o-mini")  # any chat model works

@dataclass
class Context:
    user_id: str

def call_model(state: MessagesState, runtime: Runtime[Context]):
    namespace = (runtime.context.user_id, "facts")
    memories = runtime.store.search(
        namespace, query=state["messages"][-1].content, limit=3,
    )
    briefing = "\n".join(m.value["text"] for m in memories)
    prompt = (
        f"Known facts about this user:\n{briefing}\n"
        "Answer using them when relevant; never invent facts."
    )
    return {"messages": [model.invoke(
        [{"role": "system", "content": prompt}, *state["messages"]]
    )]}

builder = StateGraph(MessagesState)
builder.add_node("call_model", call_model)
builder.add_edge(START, "call_model")
app = builder.compile(checkpointer=InMemorySaver(), store=store)
app.invoke(
    {"messages": [HumanMessage("Which region?")]},
    {"configurable": {"thread_id": "demo-3"}},
    context=Context(user_id="ada"),
)
```

A companion write path decides what deserves persisting: after turns that establish durable facts, extract and store them (a small model call with an extraction prompt), namespaced by user and topic. The discipline from the memory literature applies directly: **store decisions, not transcripts.** Transcripts belong in the checkpointer; conclusions belong in the store. Anything that has not proven durable across at least two turns has not earned a write.

## 4. The managed options, honestly compared

If you would rather not operate this yourself, four systems cover the space differently. Numbers below are vendor-reported (their benchmarks, their harnesses); treat them as directional, and note the metric mismatch problem from the survey literature, where LLM-judged accuracy and token-F1 are routinely compared as if they were the same thing.

| System | Architecture | Best fit | Caveats |
|---|---|---|---|
| **Mem0 / Mem0^g** | Extracted facts (+ optional graph), token-budget retrieval; reports 92.5 LoCoMo / 94.4 LongMemEval at ~7k tokens per call | Production recall across many users, LangChain/LlamaIndex stacks | Graph memory paywalled; vendor benchmarks |
| **Zep (Graphiti)** | Temporal knowledge graph over episodes, bi-temporal validity | Relationship-heavy, time-sensitive memory | Graph features on paid tiers; heavier to operate self-hosted |
| **Letta (ex-MemGPT)** | OS-style tiered memory agents edit themselves | Self-improving long-horizon agents | A full runtime, not a drop-in layer; direction shifted toward git-backed files in 2026 |
| **LangMem** | LangGraph-native procedural + semantic memory, MIT | LangGraph stacks that want memory without new infra | No managed service; narrower benchmark coverage |

The selection logic mirrors last month's substrate matrix: need citations, choose token stores with provenance; need multi-hop relations, choose graphs; need the agent to manage its own memory, choose Letta-style runtimes; need zero new infrastructure on LangGraph, choose LangMem. No system currently gives you admission control, temporal versioning, *and* measured abstention in one package. That gap is where new work goes, and a later series will go there.

## Exercises

1. Give the echo agent a SQLite backend, restart the process, and confirm the first thread still answers from history. Persistence you have not restart-tested is a demo.
2. Implement the write path: after each turn, ask a cheap model to extract durable fact/topic pairs and store them under the user's topic namespace. Then query from a fresh thread and confirm recall without history.
3. Break scoping on purpose: store two users' conflicting preferences, query with the wrong user ID, and confirm isolation. Namespace bugs are privacy bugs; test them like it.

## References

1. LangGraph docs. *Persistence: checkpointers and stores.* https://docs.langchain.com/oss/python/langgraph/persistence
2. LangGraph docs. *Stores, semantic search, custom stores.* https://docs.langchain.com/oss/python/langgraph/stores
3. LangGraph forum (2026). *Checkpointer vs. application tables for UI history.* https://forum.langchain.com
4. Mem0 (2026). *Long-term memory for AI agents: what, why, how.* https://mem0.ai/blog/long-term-memory-ai-agents
5. Mem0 et al. (2025). *Building production-ready agents with scalable long-term memory.* https://arxiv.org/abs/2504.19413
6. Atlan (2026). *Mem0 alternatives: benchmarks and pricing.* https://atlan.com/know/mem0-alternatives
7. Particula (2026). *Mem0 vs Zep vs Letta vs Cognee.* https://particula.tech/blog/agent-memory-frameworks-tested-mem0-zep-letta-cognee-2026
