---
title: "Leto: Utility-Centric Agent Memory"
description: "Selects agent memory by predicting which retained context will improve the next response."
date: 2026-11-26
tags: ["memory", "agents", "context", "tools"]
---

## Leto: Utility-Centric Agent Memory

Most agent memory systems are built around fidelity: store an accurate record of the past and retrieve the part that looks similar to the current request. That criterion misses the point. A memory matters only if the response improves, and that cannot be known when the memory is written. [Leto](https://arxiv.org/abs/2611.33005) treats memory selection as a prediction problem and optimises for the future response instead of the past conversation. It is an arXiv preprint from 24 November 2026, released under CC BY 4.0.

![Leto workflow: atomic facts index their source conversations, replay composes a profile and task state, and a utility loop updates each memory's forecast from outcomes](/blog/leto/fig2-workflow.svg)

*Figure 2 from Chen and Paracha (2026), CC BY 4.0. The three parts of the system: facts pointing back to retained sources, standing context composed before a request arrives, and a utility forecast revised after each serve.*

At write time, Leto keeps every conversation and extracts atomic facts from it. A fact is a single self-contained claim, and it acts as a key to the span of messages it came from. That distinction is the core design choice. Most systems serve the extracted fact itself. Leto serves the source behind a matching fact, so the original wording and qualifications stay reachable while unrelated conversation text stays out of the context.

Between requests, a replay step re-reads the store and composes standing context. For personal use this is a short user profile of preferences and constraints, rewritten when new sessions arrive. For a declared long-horizon task it is a task state: current facts grouped by entity, followed by summaries of earlier sessions. Both are produced before the next request, so the agent starts with information the request may never restate.

At serving time, each memory carries a utility index between zero and one. A retrieved memory is served when its index clears a threshold. A low score does not delete anything, it only lowers serving priority. After the response, lexical signals such as confirmations, uses and corrections update the estimate. That is the utility loop.

![Pass-rate gain over No Memory by chain position in MemoryArena shopping and search](/blog/leto/fig4-arena-depth.svg)

*Figure 4 from Chen and Paracha (2026), CC BY 4.0. Gain over the No Memory baseline by position in a task chain. The number under each bar counts the chains that reach that position.*

Leto is evaluated against six memory systems across five benchmarks and three scenarios. On PrefEval it reaches 60.5% preference-following accuracy, against 44.2% for Hindsight, the strongest compared system, a gap of 16.3 percentage points. Preference-unaware violations fall from 33.8% to 19.1%.

On MemoryArena, Leto has the highest overall progress score and success rate among the compared methods, at 32.01% and 18.33%. Figure 4 shows why the chain matters. In shopping, the gain over No Memory rises from 1.3 points at the first purchase to 7.3 at the sixth. In search, it starts at zero and reaches about 14 points by the eighth question, where most other systems remain close to zero.

Long-context understanding is the least favourable case for the memory design. Leto scores 71.82% on LoCoMo and 73.20% on LongMemEval, the best among the memory systems, but RAG is 2.79 points ahead on LoCoMo while retrieving about 1.7 times as many tokens. On LongMemEval, Leto is 6.80 points ahead of RAG with roughly eight times fewer tokens.

The interesting move is the separation of retention from serving. A memory can stay in the store with a low forecast and still become useful later if feedback changes its score. That is a more careful policy than dropping what a first pass judged irrelevant, and it fits work on temporal stores where a correction closes a validity window instead of erasing the old record.

The cost is explicit. Keeping every conversation spends storage and write-time computation, and a detail can only be recovered if some fact points to a source containing it. The utility signal is also coarse: one response outcome is shared by every memory served for it, so an unnecessary memory can be rewarded and a correct one can be penalised. A memory that is never served never earns an observation.

I read the long-context result as the useful boundary condition. When a question names the fact it wants, plain retrieval over raw history is already strong, and memory organisation buys little. The advantage appears when the request leaves something unstated: a standing preference, a constraint, or the state of a task that started several sessions earlier. That is where prediction about the next response beats similarity to the current one.

Source: Shuguang Chen and Salman Paracha, *Leto: Utility-Centric Agent Memory*, [arXiv:2611.33005](https://arxiv.org/abs/2611.33005), 24 November 2026, CC BY 4.0. Figures 2 and 4 reproduced under CC BY 4.0.

:)
