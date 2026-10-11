---
title: "GMem: Layered Agent Memory with Evidence Links"
description: "Technical report: a three-layer representation contract with adjudicated writes, versioned facts, and measured abstention, plus the negatives."
date: 2026-08-20
tags: ["memory", "agents", "technical-report"]
---

Most agent memory stores history first and governs it afterward, if at all. GMem reverses the order: every item is checked on the way in, versioned when it changes, and the system answers "I don't know" when the file is empty. This report describes the design, the measured standing, and the approaches that failed. The failures are included because they constrain the design more than the wins do.

## 1. Problem

Agent memories are predominantly flat token histories or planar entity graphs. Both collapse abstraction levels: a retrieved triple carries no auditable path to its source span, and a summary carries no path to its supporting facts. The survey literature names the consequence directly: no traceable access paths, no verifiable updates, hallucination without abstention (Hu et al., 2026, §7.7). GMem is one minimal attempt at that frontier, scoped to factual memory only. It makes no claim on experiential strategies, skills, parametric storage, or privacy controls.

## 2. Architecture: three layers, one checker

The representation contract has three addressable planes with typed cross-layer edges:

| Layer | Contains | Write rule |
|---|---|---|
| L0 Evidence | Immutable interaction records (episodes, spans) | Append-only, never edited |
| L1 Distilled | Relational propositions | Admitted only through adjudication, with validity windows; updates close windows, never delete |
| L2 Synthesized | Summaries, communities | Always list their sources; can never enter the warranted store |

Edge kinds are closed and domain-free: `grounds` (proposition to source span), `distills`, `synthesizes` (gist of sources), `relates` (lateral L1 relation), `groups` (community membership), `succeeds` (temporal succession with lineage). Every L1 proposition holds at least one `grounds` edge; every L2 node holds a non-empty source set. Any returned claim drills to its source span in at most three steps.

The single checker adjudicates each candidate proposition as redundant, endorse, succeed, or refuse, with refusals recorded with reasons. Governance is packaged as priority-ordered norms with a corroboration lifecycle (for example, dosage-required and recalled-drug-forbidden in a healthcare adapter, citation-shaped identity in a legal one). The core stays domain-blind: it reasons about layers, never about patients, drugs, or contracts.

Reading is read-only and cited. Seven primitives cover navigation: `overview` (enter at syntheses), `drill` (expand to propositions, then spans), `rollup` (which syntheses cover these propositions), `traverse` (lateral walk with temporal and namespace filters), `facet` (slice by kind, namespace, time, provenance), `time_travel` (reconstruct state at time t from validity windows), and `trace` (full path back to source spans for any returned item). Empty evidence returns an explicit empty with a reason. It never synthesizes filler.

Retention is tiered without deletion: hot and cold tiers hold consultation cost flat while every byte stays drillable.

## 3. Measured standing

Same harness, same seed (42), same questions, October 2026 remeasure on LoCoMo full-QA (105 questions):

| Backend | F1 | EM | Notes |
|---|---|---|---|
| mem0 2.2.1 | 0.435 | 0.148 | verbose partials |
| gmem | 0.423 | 0.247 | highest exact match |
| cognee 1.6.2 | 0.321 | 0.037 | upstream regression noted in log |

On HaluMem QA (70 questions): gmem 0.457, cognee 0.400, mem0 0.386, with correct abstention on all boundary probes in the measured slice.

Three caveats, stated plainly. First, the gap to mem0 on F1 is 0.012 with slice noise near 0.03, so the honest reading is near-parity on partial credit with a real lead on exact match, not a victory. Second, pooled figures over larger mixed runs favor mem0, which means the headline table describes the matched harness, not the universe. Third, everything runs on a single extractor and a single model family, English text only. Any single one of the three tested claims holding at full-suite scale (citation precision at matched recall, temporal reconstruction accuracy, unsupported-claim rate at bounded abstention cost) would constitute the publishable unit. None is claimed as held yet.

## 4. What did not work

The restudy ledger records negatives with the same care as wins, because each one removed an option from the design space:

- **Semantic reranking.** Local embedding fusion wired end to end: within run variance of baseline at roughly twice the wall time. Default stays off. Retrieval breadth was adequate; precision into the top ranks and composer focus were the bottlenecks, in that order.
- **Query expansion.** LLM terms appended for recall: F1 fell while one correct abstention flipped to a confident wrong answer. Query drift in, honesty out. Rejected as a default.
- **Two-stage composer.** Answering from a sharp top-5 window with fallback expansion scored well below the single full-window pass. The first stage accepted plausible-but-wrong answers that the full evidence would have corrected.
- **Deterministic pronoun pre-resolution.** Unit-clean, live-negative on both slice and full scale. Pre-resolution strips the pronoun signal the proposer model uses for its own context-aware resolution, and a wrong name is confident poison where a vague pronoun was merely dilute. Reverted.
- **Succession head-verb canon.** Lexical equivalence rules bought small succession gains at the cost of live accuracy. Complement-packed relations make "same act" undecidable lexically. Reverted; embedding-tier or slot-aware succession remains open.
- **Compact evidence rendering.** Same exact answers for roughly a quarter of the tokens, at a small F1 cost on partials. Kept as a cost option, not a quality claim.

The pattern across these: prompt-level rules are noise-fragile, lexical fixes fail where the phenomenon is semantic, and anything that spends the abstention budget must carry its hallucination measurement with it.

## 5. Position against related systems

Three 2025 to 2026 systems bound the design space. A-MEM (Xu et al., NeurIPS 2025) contributes Zettelkasten-style atomic notes with link generation and memory evolution, evaluated on LoCoMo with large token savings; it has no admission gate and no abstention accounting, which is exactly where a representation contract bites. The two ideas compose rather than compete. PISA (Jia et al., 2025) grounds schemas in Piaget theory with trimodal adaptation and introduced its own benchmark; its schemas are designer-provided where ours are policy packages with enforced norms and tests. Memanto (Abtahi et al., 2026) runs a thirteen-category typed schema with conflict resolution and names its enemy well ("Memory Tax": compute plus latency plus complexity); its accuracy figures are LLM-judged correctness, a different metric from token-F1, and the numbers should never be compared raw. None of the three combines an admission gate with abstention accounting and governance, which is the combo this report defends.

## 6. Limits and next steps

Single-extractor dependence. English text only. No distributed deployment. No privacy or access-control evaluation. LLM-judge bias mitigated with pinned judge versions and span reporting, not eliminated.

Next, in order: formal model definitions with multi-model evaluation, one unified ablation table (configuration by F1, exact match, abstention, cost), judge-accuracy reported next to exact match everywhere, and full-suite numbers only. Cost and latency reporting is part of the contribution, since the 2026 survey of memory papers found only about a fifth report any efficiency metric at all.

## References

1. Hu, Y. et al. (2026). *Memory in the Age of AI Agents.* https://arxiv.org/abs/2512.13564
2. Maharana, A. et al. (2024). *LoCoMo: Evaluating Very Long-Term Conversational Memory.* https://arxiv.org/abs/2402.17753
3. Xu, W. et al. (2025). *A-MEM: Agentic Memory for LLM Agents.* https://arxiv.org/abs/2502.12110
4. Jia, S. et al. (2025). *PISA: A Pragmatic Psych-Inspired Unified Memory System.* https://arxiv.org/abs/2510.15966
5. Abtahi, S. M. et al. (2026). *Memanto: Typed Semantic Memory with Information-Theoretic Retrieval.*
