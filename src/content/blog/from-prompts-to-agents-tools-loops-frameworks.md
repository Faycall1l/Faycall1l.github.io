---
title: "From Prompts to Agents: Tools, Loops, and Frameworks"
description: "What turns a language model into an agent, how the ReAct loop works, and a hands-on minimal agent in LangGraph, with notes on when not to use one."
date: 2026-09-04
tags: ["agents", "langchain", "langgraph", "tutorial"]
---

Most explanations of AI agents start with a framework. This one starts with the loop, because the loop is the agent and frameworks only implement it. Once the loop is clear, tools, planning patterns, and the choice between LangChain, LangGraph, and their alternatives become engineering decisions rather than mysteries.

## 1. What counts as an agent?

A useful working definition, following the survey literature on LLM-based agents (see e.g. Hu et al., 2026, §2), is: an **agent** is a system in which a language model repeatedly **reasons, acts through tools, and observes the results**, until a goal is reached or a budget is spent. Three ingredients distinguish it from a chatbot:

1. **An action space beyond text.** The model can call tools (search, code execution, databases, APIs), and its outputs change something outside the conversation.
2. **A control loop.** The model decides *which* action to take next based on prior observations, rather than following a fixed script.
3. **A termination policy.** The loop stops on success, on explicit abstention, or on a budget (steps, time, cost), never "when it feels done."

There is a genuine spectrum here, and the field disagrees about where to draw the line. Anthropic's widely cited engineering guidance distinguishes **workflows** (fixed paths through model calls and tools) from **agents** (the model directs its own path), and argues, with evidence from their deployments, that most production tasks are better served by workflows, reserving full agency for open-ended problems. Lilian Weng's earlier overview makes a compatible point: autonomy is a dial, not a binary. I find this framing the most defensible: start with the least agency that solves the task, and add loop-driven autonomy only where fixed paths keep breaking.

## 2. The loop: ReAct in one diagram

The dominant loop pattern is **ReAct** (Yao et al., 2022): interleave *thought*, *action*, and *observation*. Each turn appends its trace to the context, so the model's next decision sees the full history of what was tried and what came back.

![The ReAct agent loop: thought, action through tools, observation, repeat until answer or budget](/blog/agent-loop/agent-loop.svg)

*Figure 1. Original diagram. The loop after Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models" (2022). Frameworks implement this loop; they do not change its structure.*

Two failure modes of this loop are worth naming early, because every framework feature below is a response to one of them:

- **Context saturation.** The trace grows with every step. Long tasks drown the model in its own history. That is precisely the memory problem, treated in the companion article, [Memory for AI Agents: An Introduction](/blog/memory-for-ai-agents-an-introduction/).
- **Ungoverned side effects.** A loop that can act can also act wrongly: repeat a payment, delete data, exfiltrate context into a tool call. Guardrails (step budgets, tool allow-lists, approval gates for irreversible actions) belong *outside* the model, in code, not in the prompt.

## 3. Tools: the actual interface

If the loop is the engine, tools are the transmission. A tool is a documented function the model may invoke: a name, a natural-language description, a parameter schema, and executable code. Practical experience converges on a few rules:

- **Descriptions are the API.** The model selects tools by reading their descriptions. Vague descriptions ("searches data") produce vague tool choices; precise ones ("returns current sensor readings for a named site unit, 2024 to present") produce precise ones.
- **Schemas beat prose.** Typed parameters with examples and constraints outperform free-text arguments. Validate in code and return errors as observations. The loop can recover from a well-described error, but not from a silent wrong call.
- **Prefer idempotent, scoped tools.** A `get_reading(unit)` tool is safer than a `run_sql(query)` tool. Broad tools (shell, raw SQL, arbitrary HTTP) concentrate risk; narrow tools distribute it.
- **Standardize where possible.** The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) gives tools a uniform discovery and invocation envelope across hosts, which matters as soon as two teams share tools. It does not remove the need for the rules above. A badly described tool is badly described in any protocol.

## 4. Frameworks, objectively compared

| Framework | Core abstraction | Strengths | Costs / caveats |
|---|---|---|---|
| **LangChain** (LCEL chains) | Composable runnables: prompt → model → parser → tool | Largest ecosystem, most integrations, good for fixed workflows | Agent behavior is implicit in chain wiring; easy to build loops you cannot inspect |
| **LangGraph** | Explicit state machine / graph of steps | The loop is visible: nodes, edges, checkpoints, human-in-the-loop interrupts | More boilerplate for simple tasks; you design the graph |
| **AutoGen** | Conversable agents with roles | Natural fit for multi-agent discussion patterns | Conversation-first design can obscure state and budgets |
| **CrewAI** | Role/crew/task presets | Fast onboarding for role-based demos | Opinionated; harder to customize the loop itself |
| **smolagents** | Minimal code-first agents | Tiny surface, readable defaults | Fewer integrations and enterprise controls |

The honest summary: for *learning*, LangGraph's explicitness is an advantage. You see every edge the agent can traverse. For *shipping a fixed pipeline*, plain LangChain chains or even direct API calls are often simpler. Multi-agent discussion (AutoGen, CrewAI) earns its complexity only when subtasks genuinely benefit from separate roles with separate contexts; a single loop with good tools beats three agents with bad ones.

## 5. Hands-on: a minimal agent, two ways

**Goal.** Build an agent that answers factual questions over a small local knowledge source, with a visible loop, a step budget, and graceful abstention. The pattern below is deliberately small (two tools, one loop), because every production agent is this pattern with more tools and more guardrails.

**Setup** (pinned to avoid version drift):

```bash
pip install "langchain>=0.3" "langgraph>=0.2" "langchain-openai>=0.2"
# or with uv: uv add langchain langgraph langchain-openai
```

### 5a. The loop without a framework (~40 lines)

Before touching a framework, write the loop once by hand. Everything LangGraph does later will map onto this:

```python
import json

MAX_STEPS = 6

TOOLS = {
    "lookup": lambda q: f"KB hit for {q!r}: Ada works at Acme (source: episode #12).",
    "calculator": lambda expr: str(eval(expr, {"__builtins__": {}})),  # demo only
}

def llm_decide(history) -> dict:
    """Stand-in for a model call with tool_choice.
    Real version: POST messages + tool schemas, parse the tool call."""
    last = history[-1]
    if last["role"] == "tool":
        return {"thought": "Have evidence; answer with citation.",
                "tool": None, "args": {},
                "answer": f"Answer (cited): {last['content']}"}
    text = last["content"]
    if "sqrt" in text or "calculate" in text:
        return {"thought": "Need arithmetic.", "tool": "calculator",
                "args": {"expr": "841**0.5"}, "answer": None}
    return {"thought": "Need a fact.", "tool": "lookup",
            "args": {"q": text}, "answer": None}

def run_agent(question: str) -> str:
    history = [{"role": "user", "content": question}]
    for _ in range(MAX_STEPS):
        decision = llm_decide(history)
        history.append({"role": "assistant", "content": json.dumps(decision)})
        if decision["answer"]:
            return decision["answer"]
        obs = TOOLS[decision["tool"]](**decision["args"])
        history.append({"role": "tool", "content": str(obs)})
    return "I don't know: step budget spent without an answer."

print(run_agent("Where does Ada work?"))
print(run_agent("What is sqrt(841)?"))
```

Note the two load-bearing lines: the `for` bound (termination policy) and the final abstention string. Real agents fail most often by omitting exactly these.

### 5b. The same agent in LangGraph

`create_react_agent` packages the loop above: model node, tool node, conditional edges, checkpointing.

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

@tool
def lookup(query: str) -> str:
    """Look up a stored fact about people and organizations.
    Input: a short natural-language question. Returns a cited snippet."""
    return "Ada works at Acme (source: episode #12)."

@tool
def calculator(expression: str) -> str:
    """Evaluate a plain arithmetic expression, e.g. '841**0.5'."""
    import ast, operator
    ops = {ast.Add: operator.add, ast.Sub: operator.sub,
           ast.Mult: operator.mul, ast.Pow: operator.pow,
           ast.Div: operator.truediv, ast.USub: operator.neg}
    def ev(n):
        if isinstance(n, ast.Constant): return n.value
        if isinstance(n, ast.UnaryOp): return ops[type(n.op)](ev(n.operand))
        if isinstance(n, ast.BinOp): return ops[type(n.op)](ev(n.left), ev(n.right))
        raise ValueError("unsupported")
    return str(ev(ast.parse(expression, mode="eval").body))

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)  # or any chat model
agent = create_react_agent(model, [lookup, calculator])

result = agent.invoke(
    {"messages": [("user", "Where does Ada work?")]},
    config={"recursion_limit": 12},  # the step budget, in framework terms
)
print(result["messages"][-1].content)
```

**Exercises** (each isolates one real-world concern):

1. Add a `recursion_limit` experiment: set it to 3 on a two-hop question and watch the agent fail honestly. Budgets are behavior.
2. Add an approval gate: wrap `calculator` so expressions containing anything but digits and operators return `"Refused: out-of-scope input."` Tool-level refusal is governance in miniature.
3. Swap the model for a local one (e.g. via Ollama) and note what degrades first: usually tool-argument formatting, not reasoning. That observation motivates schema strictness.

## 6. When not to use an agent

- A fixed 3-step pipeline answers the question → use a chain, not a loop.
- Inputs are adversarial or costs scale with steps → the loop multiplies both.
- You cannot enumerate the tools' side effects → do not grant autonomy; grant a *workflow with approval gates*.
- Evaluation is missing → an unevaluated agent is a random walk with good PR. At minimum, fix a question set, record answers and traces, and re-run on every prompt or tool change. (Benchmark practice for memory systems is covered in the survey series; the same discipline applies here.)

## 7. Bridge: where memory enters

The loop above treats context as a growing list. That works for ten steps and fails for ten sessions: costs grow, stale facts linger, and the model cannot distinguish a verified proposition from a plausible summary. The agent literature therefore treats **memory as a first-class subsystem**: what is stored, in what form, why, and how it is consulted, rather than as "more context." The companion article develops exactly that: [Memory for AI Agents: An Introduction](/blog/memory-for-ai-agents-an-introduction/).

## References

1. Yao, S. et al. (2022). *ReAct: Synergizing Reasoning and Acting in Language Models.* https://arxiv.org/abs/2210.03629
2. Hu, Y. et al. (2026). *Memory in the Age of AI Agents.* https://arxiv.org/abs/2512.13564
3. Anthropic (2024). *Building Effective Agents.* https://www.anthropic.com/research/building-effective-agents
4. Weng, L. (2023). *LLM-Powered Autonomous Agents.* https://lilianweng.github.io/posts/2023-06-23-agent/
5. LangGraph documentation: ReAct agents. https://langchain-ai.github.io/langgraph/
6. Model Context Protocol specification. https://modelcontextprotocol.io/
