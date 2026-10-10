---
title: "Memory for AI Agents: An Introduction"
description: "Why agents need memory beyond context, a map of the territory, the tensions that define the field, and the series of deep-dives to come."
date: 2026-10-10
tags: ["memory", "agents", "survey", "series"]
---

The companion article on [agents, tools, and loops](/blog/from-prompts-to-agents-tools-loops-frameworks/) ended with an unresolved problem. The loop appends every thought, action, and observation to its context. That works for ten steps and fails for ten sessions: costs grow, stale facts linger, and the model cannot distinguish a verified proposition from a plausible summary. This article introduces **memory** as the subsystem that addresses exactly that, and lays out a series in which each approach, direction, and tool gets its own installment. One broad survey per article is how fields get summarized; one idea per article is how they get understood.

All figures below are reproduced from Hu et al. (2026), released under CC BY 4.0, via [arXiv:2512.13564](https://arxiv.org/abs/2512.13564). Figure numbers follow the original paper.

## 1. Why memory, precisely

Consider what goes wrong when an agent has no memory system and only a growing context window:

- **Inefficiency.** Every decision re-processes everything that ever happened. The cost of "what next" becomes proportional to "everything so far."
- **Brittleness.** Matching is literal. The agent retrieves what resembles the query, not what is true, current, or relevant.
- **Saturation.** Redundant, noisy, and outdated entries accumulate with no mechanism to distinguish the valuable from the irrelevant.

Increasing the context window mitigates none of these structurally. It postpones saturation while worsening the other two, since a larger pile is a noisier pile. Memory, properly understood, is not "more context." It is a set of **policies over time**: what is admitted, how it is organized, how it changes, what is forgotten, and when the system should abstain rather than answer.

## 2. What memory is not

Three boundaries, following Hu et al. (2026, §2), prevent most category errors. Stated briefly here; each gets revisited in its own installment:

- **Not RAG.** Retrieval-augmented generation fetches external documents at query time. Memory additionally manages what gets *written*, how it changes, and what is forgotten. A RAG index with no write policy is not a memory.
- **Not context engineering.** Assembling the current prompt is stagecraft; deciding what survives *between* prompts is record-keeping. Both matter, and they are different jobs.
- **Not the model's weights.** What a language model "knows" parametrically is hard to inspect, harder to retract, and impossible to cite. Memory systems exist precisely because weights are a poor substrate for facts that change.

![Conceptual comparison of agent memory with LLM memory, RAG, and context engineering](/blog/memory-intro/boundaries.png)

*Figure 2 from Hu et al. (2026). Agent memory overlaps its neighbors in implementation (graph retrieval, KV reuse) but differs in kind: unlike the static knowledge of RAG or the architectural optimizations of LLM memory, it manages information across tasks and over time.*

## 3. A map of the territory

The survey organizes the field through three lenses: forms, functions, and dynamics. The landscape below positions memory artifacts by their dominant form and primary function, and maps representative systems into it. It is worth studying directly before reading on.

![Overview of agent memory organized by forms, functions, and dynamics, with representative systems mapped into the taxonomy](/blog/memory-intro/landscape.png)

*Figure 1 from Hu et al. (2026). The consolidated landscape: forms along the base (token-level, parametric, latent), functions along the side (factual, experiential, working; long- versus short-term), with systems placed where they belong.*

### 3.1 Forms: what carries memory

The survey distinguishes three substrates, and the figure makes the progression concrete: flat 1D stores (dialogues, chunks, summaries) with no relations between units; planar 2D stores (trees, graphs) that buy multi-hop reasoning at extraction cost; and hierarchical 3D stores (pyramids, multi-layer planes) that add abstraction levels.

![Taxonomy of token-level memory: flat 1D, planar 2D, hierarchical 3D](/blog/memory-intro/forms.png)

*Figure 3 from Hu et al. (2026). Token-level memory by dimensionality: (a) flat sequences without inter-unit topology, (b) planar graphs and trees with typed nodes and edges, (c) hierarchical pyramids and multi-layer stores.*

The central judgment: for factual memory that must be cited and corrected, the viable substrate is token-level and structured. Latent vectors are excellent for *finding* candidates and disqualified from *justifying* answers. Parametric memory (weights, adapters) retains behavior with zero retrieval latency but cannot be audited or cleanly retracted. Each form will get its own deep-dive.

### 3.2 Functions: why agents need it

Factual memory (who the user is, how the world stands), experiential memory (cases, strategies, executable skills), and working memory (condensing the current task into something tractable), spread across long-term and short-term domains. Note how fine-grained the leaves are: dialogue coherence and goal consistency are different jobs served by different systems, and skill memory bottoms out in code, functions, and MCP servers.

![Functional taxonomy of agent memory: factual, experiential, and working memory](/blog/memory-intro/functions.png)

*Figure 6 from Hu et al. (2026). The functional taxonomy across (a) long-term memory (factual and experiential) and (b) short-term working memory (single-turn condensation versus multi-turn consolidation, folding, and planning).*

Two observations for the practically minded. First, factual memory is the trust bottleneck: preferences that silently flip and world states that go stale are the failures users actually notice. Experiential memory improves efficiency; factual memory determines trustworthiness. Second, working memory is where the token costs are paid, and systems that report answer quality without reporting those costs are hiding half the trade-off.

### 3.3 Dynamics: how it operates

Formation (turning raw interaction into memory units), evolution (consolidating, updating, forgetting against an existing store), and retrieval (timing, query construction, strategies, post-processing), arranged around a central memory base. This is where most systems actually differ and where most evaluations actually discriminate, so the series will spend the most time here.

![Operational dynamics of agent memory: formation, evolution, and retrieval](/blog/memory-intro/dynamics.png)

*Figure 8 from Hu et al. (2026). The memory lifecycle: (1) formation transforms raw data into memory units, (2) evolution integrates them with the existing repository through consolidation, updating, and forgetting, (3) retrieval serves the agent backbone through timed, constructed, and consolidated queries.*

## 4. A critical reading: what the taxonomy implies

Summarizing is not contributing, so here are three claims I will defend. Each is grounded in the figures above; each will be tested against systems in later installments.

**Claim 1: citability draws the real line, not dimensionality.** The survey's own paradigm comparison sorts the field the way this article does. Token-level memory is symbolic and addressable, which places it in high-stakes domains (law, finance, medicine). Parametric and latent memory trade that away for generalization and efficiency. Dimensionality (1D vs. 2D vs. 3D) then decides *how well* token memory serves multi-hop and abstraction needs, not *whether* it can be cited at all.

![Three memory paradigms: token-level, parametric, and latent, with features and suitable applications](/blog/memory-intro/paradigm-comparison.png)

*Figure 5 from Hu et al. (2026). The three paradigms differ in representational form, update dynamics, interpretability, and efficiency, which places them in different application domains.*

The practical consequence is a selection matrix. If answers must cite sources, half the substrate space is eliminated before any benchmark runs. If facts change over time, no substrate earns full marks, because updating is a policy, not a storage property. And if the system must refuse when unsure, nothing earns full marks either, because abstention lives in consultation, not in storage.

![Decision matrix of memory substrate fit per requirement](/blog/memory-intro/decision-matrix.svg)

*Author's synthesis of survey judgments (Hu et al., 2026, §§3-4). Qualitative. Note the two rows with no full marks: change and refusal are policies the taxonomy does not assign to any substrate.*

**Claim 2: auditability and cost form a frontier, and parametric factual memory sits off it.** Plotted schematically, latent vectors are cheap and unauditable, token stores are auditable at growing maintenance cost, and weights cost the most to change while offering the least to audit. That makes parametric storage the worst substrate for facts and a reasonable one for skills, yet systems are routinely benchmarked on factual recall over parametric stores. The mismatch between what is stored where and what is measured is, in my view, one of the field's quieter methodological problems.

![Schematic trade-off between auditability and operational cost across memory substrates](/blog/memory-intro/tradeoff-schematic.svg)

*Author's schematic, positions qualitative. Solid dots sit on the efficient frontier; hollow dots are dominated on both axes under the survey's own judgments.*

**Claim 3: the taxonomy classifies what memory is, not what it does.** Formation, evolution, and retrieval (Figure 8) describe operations, but the write path, the update policy, and the refusal rule are where deployed systems actually diverge. Two systems can share a quadrant of the landscape and differ completely in admission control, versioning, and abstention behavior. The series will therefore evaluate systems on those policies first and on their taxonomy address second.

## 5. The tensions that define the field

If there is one thing to carry into the series, it is that every memory design is a position on four tensions. Papers should be read as arguments about them:

1. **Remembering vs. forgetting.** Naive systems only append, so conflicts and staleness accumulate. But deletion is irreversible and often wrong: time-based forgetting discards rare but critical facts, and aggressive consolidation smooths away outliers. The defensible position, in my view, is *versioning over deletion*: close validity windows, preserve history, and let forgetting govern what is shown rather than destroy what is kept. Whether that scales is an open empirical question the series will return to.
2. **Citing vs. guessing.** A system that answers from weak evidence looks more capable than one that abstains, until it is wrong in a setting that matters. Abstention is therefore not a missing feature but a *capability to be measured*, alongside accuracy and cost. Systems that report no abstention rate report no honesty metric.
3. **Quality vs. cost.** Retrieval depth, reranking, and LLM-based extraction all improve answers at measurable token and latency prices. The literature under-reports these costs badly; a memory paper without a cost column should invite skepticism.
4. **Generality vs. governance.** Domain-free cores compose well but enforce nothing; domain rules enforce much but compose poorly. The architecture question (where norms live, who checks them, what happens on refusal) deserves first-class treatment and will get a dedicated installment.

Reasonable researchers disagree on each of these, and the series will present the disagreements rather than flatten them.

## 6. The series ahead

Each installment takes one approach, direction, or tool, reconstructs its argument, and states plainly what it contributes and where it stops:

- **Forms, deep-dives.** Flat vs. planar vs. hierarchical token memory; parametric memory and its retraction problem; latent memory as infrastructure.
- **Systems under the microscope.** A-MEM's agentic note-taking and evolution; structured graph systems (Mem0^g, GraphRAG, HippoRAG, Zep); typed-schema stores and their auditability limits.
- **Dynamics.** How memories form (summarization vs. distillation vs. construction), evolve (consolidation, updating, forgetting), and get retrieved (strategies, reranking, the primacy of query quality).
- **Evaluation and governance.** Benchmarks (LoCoMo, LongMemEval, HaluMem, preference retention), what each actually measures, and how norms, abstention, and audit trails fit in.

No flooding: one piece at a time, each self-contained, each with figures credited to their authors. Next up is the first forms deep-dive.

## References

1. Hu, Y. et al. (2026). *Memory in the Age of AI Agents.* https://arxiv.org/abs/2512.13564 (the map this series follows; CC BY 4.0; Figures 1, 2, 3, 5, 6, and 8 reproduced from this work with attribution; remaining figures are the author's schematics)
2. Xu, W. et al. (2025). *A-MEM: Agentic Memory for LLM Agents.* https://arxiv.org/abs/2502.12110
3. Maharana, A. et al. (2024). *LoCoMo: Evaluating Very Long-Term Conversational Memory.* https://arxiv.org/abs/2402.17753
