---
title: "Memory for AI Agents: An Introduction"
description: "Why agents need memory beyond context, a map of the territory, the tensions that define the field — and the series of deep-dives to come."
date: 2026-10-10
tags: ["memory", "agents", "survey", "series"]
---

The companion article on [agents, tools, and loops](/blog/from-prompts-to-agents-tools-loops-frameworks/) ended with an unresolved problem: the loop appends every thought, action, and observation to its context, and that works for ten steps but fails for ten sessions. Costs grow, stale facts linger, and the model cannot distinguish a verified proposition from a plausible summary. This article introduces **memory** as the subsystem that addresses exactly that — and lays out a series in which each approach, direction, and tool gets its own installment. One broad survey per article is how fields get summarized; one idea per article is how they get understood.

## 1. Why memory, precisely

Consider what goes wrong when an agent has no memory system and only a growing context window:

- **Inefficiency.** Every decision re-processes everything that ever happened. The cost of "what next" becomes proportional to "everything so far."
- **Brittleness.** Matching is literal. The agent retrieves what resembles the query, not what is true, current, or relevant.
- **Saturation.** Redundant, noisy, and outdated entries accumulate with no mechanism to distinguish the valuable from the irrelevant.

Increasing the context window mitigates none of these structurally — it postpones saturation while worsening the other two, since a larger pile is a noisier pile. Memory, properly understood, is not "more context." It is a set of **policies over time**: what is admitted, how it is organized, how it changes, what is forgotten, and when the system should abstain rather than answer.

## 2. What memory is not

Three boundaries, following Hu et al. (2026, §2), prevent most category errors — stated briefly here, each revisited in its own installment:

- **Not RAG.** Retrieval-augmented generation fetches external documents at query time. Memory additionally manages what gets *written*, how it changes, and what is forgotten. A RAG index with no write policy is not a memory.
- **Not context engineering.** Assembling the current prompt is stagecraft; deciding what survives *between* prompts is record-keeping. Both matter, and they are different jobs.
- **Not the model's weights.** What a language model "knows" parametrically is hard to inspect, harder to retract, and impossible to cite. Memory systems exist precisely because weights are a poor substrate for facts that change.

## 3. A map of the territory

The survey literature (Hu et al., 2026) organizes the field through three lenses. In one paragraph each:

- **Forms — what carries memory.** Token-level stores (flat histories, graph structures, hierarchical layers), parametric stores (weights, adapters), and latent stores (dense vectors, hidden states). The central judgment: for factual memory that must be cited and corrected, the viable substrate is token-level and structured; latent vectors are excellent for *finding* candidates and disqualified from *justifying* answers.
- **Functions — why agents need it.** Factual memory (who the user is, how the world stands), experiential memory (cases, strategies, executable skills), and working memory (condensing the current task into something tractable). Factual memory is the trust bottleneck; working memory is where the token costs are paid.
- **Dynamics — how it operates.** Formation (summarization, distillation, graph construction), evolution (consolidation, updating, forgetting), and retrieval (timing, query construction, strategies, post-processing). This is where most systems actually differ, and where most evaluations actually discriminate.

![Map of agent memory: forms versus functions, with the GMem layer contract as one positioned contribution](/blog/memory-forms-functions/memory-forms-functions.svg)

*Figure 1 — Original diagram adapting the survey's taxonomy (Hu et al., 2026, §§3–4, CC BY 4.0). Think of it as the series map: each box is a future installment, and the bottom row — our GMem project's representation contract — gets its own article rather than a paragraph here.*

## 4. The tensions that define the field

If there is one thing to carry into the series, it is that every memory design is a position on four tensions — and papers should be read as arguments about them:

1. **Remembering vs. forgetting.** Naive systems only append, so conflicts and staleness accumulate. But deletion is irreversible and often wrong: time-based forgetting discards rare-but-critical facts, and aggressive consolidation smooths away outliers. The defensible position, in my view, is *versioning over deletion* — close validity windows, preserve history, and let forgetting be reconstruction (what is shown) rather than destruction (what is kept). Whether that scales is an open empirical question the series will return to.
2. **Citing vs. guessing.** A system that answers from weak evidence looks more capable than one that abstains — until it is wrong in a setting that matters. Abstention is therefore not a missing feature but a *capability to be measured*, alongside accuracy and cost. Systems that report no abstention rate are reporting no honesty metric.
3. **Quality vs. cost.** Retrieval depth, reranking, and LLM-based extraction all improve answers at measurable token and latency prices. The literature under-reports these costs badly; a memory paper without a cost column should invite skepticism.
4. **Generality vs. governance.** Domain-free cores compose well but enforce nothing; domain rules (this drug requires a dosage, that contract has no force once repealed) enforce much but compose poorly. The architecture question — where norms live, who checks them, what happens on refusal — deserves first-class treatment, and will get a dedicated installment.

Reasonable researchers disagree on each of these, and the series will present the disagreements rather than flatten them.

## 5. The series ahead

Each installment takes one approach, direction, or tool, reconstructs its argument, and states plainly what it contributes and where it stops:

- **Forms, deep-dives.** Flat vs. planar vs. hierarchical token memory; parametric memory and its retraction problem; latent memory as infrastructure.
- **Systems under the microscope.** A-MEM's agentic note-taking and evolution; structured graph systems (Mem0^g, GraphRAG, HippoRAG, Zep); typed-schema stores and their auditability limits.
- **Dynamics.** How memories form (summarization vs. distillation vs. construction), evolve (consolidation, updating, forgetting), and get retrieved (strategies, reranking, the primacy of query quality).
- **Our contribution.** GMem's representation contract — evidence, adjudicated propositions, derived syntheses — with measured results *and* the recorded dead ends.
- **Evaluation and governance.** Benchmarks (LoCoMo, LongMemEval, HaluMem, preference retention), what each actually measures, and how norms, abstention, and audit trails fit in.

No flooding: one piece at a time, each self-contained, each with its own figures and credits. Next up is the first forms deep-dive.

## References

1. Hu, Y. et al. (2026). *Memory in the Age of AI Agents.* https://arxiv.org/abs/2512.13564 (the map this series follows; CC BY 4.0)
2. Xu, W. et al. (2025). *A-MEM: Agentic Memory for LLM Agents.* https://arxiv.org/abs/2502.12110
3. Maharana, A. et al. (2024). *LoCoMo: Evaluating Very Long-Term Conversational Memory.* https://arxiv.org/abs/2402.17753
