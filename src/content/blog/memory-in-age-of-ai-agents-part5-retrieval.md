---
title: "Memory in the Age of AI Agents, Part V: Retrieval"
description: "When retrieval fires and why, how queries are decomposed and rewritten, the strategies from lexical to graph and hybrid, and the post-processing that decides what the model actually reads, closing the series on the survey's retrieval half."
date: 2026-11-18
tags: ["memory", "survey", "agents", "series"]
---

Part IV took evolution apart: how a store absorbs what arrives after it exists. This installment closes the series on retrieval, the third dynamics pipeline and the one the September hybrid-search tutorial puts into practice. Part II mapped the four stages from a distance. Here they run in order.

The source remains Hu et al. (2026), released under CC BY 4.0 via [arXiv:2512.13564](https://arxiv.org/abs/2512.13564). Section numbers follow the original. Part II reproduced the survey's retrieval taxonomy, so the three figures here come from the systems papers it cites, each under CC BY 4.0 and credited in place.

```mermaid
flowchart LR
    Q["<b>Query</b><br/><span style='font-size:14px'>from the agent</span>"]
    T["<b>Timing and intent</b><br/><span style='font-size:14px'>when to look, which store</span>"]
    C["<b>Query construction</b><br/><span style='font-size:14px'>decompose, rewrite</span>"]
    S["<b>Strategy</b><br/><span style='font-size:14px'>lexical, semantic, graph, hybrid</span>"]
    P["<b>Post-processing</b><br/><span style='font-size:14px'>rerank, filter, aggregate</span>"]
    Q --> T --> C --> S --> P
```

*Original diagram adapted from Section 5.3 of Hu et al. (2026), CC BY 4.0. The four stages in execution order.*

## 1. Timing and intent: when to look, and where

Retrieval starts with a decision that has nothing to do with similarity: whether to look at all, and which store to look in. The survey calls these timing and intent. Always-on retrieval removes the question by fetching everything: MIRIX retrieves from all six of its memory databases for every query and concatenates the results, which is comprehensive and expensive. The autonomous alternative makes the model decide. The fast-then-deep variant is the cost-aware middle: ComoRAG and PRIME first produce a quick answer, evaluate whether it is adequate, and trigger deeper retrieval only when it fails. MemGen removes the hand-written trigger and learns it, converting retrieval timing into a latent trainable signal from rollout states.

Intent is the second half. AgentRR switches between low-level procedural templates and high-level experiential abstractions on environmental feedback. MemOS runs a MemScheduler that selects among parametric, activation, and plaintext memory by user, task, and organization context. H-MEM routes hierarchically, coarse to fine, from the domain layer down to the episode layer, narrowing the search space at each step.

![MemOS figure 7: the three-layer framework, with the scheduler in the operation layer selecting among memory types](/blog/memory-intro/retrieval/memos-framework.png)

*Figure 7 from Li et al. (2025), CC BY 4.0. MemOS's three layers: the interface layer parses the request, the operation layer schedules the memory work (MemScheduler, MemLifecycle, MemOperator), and the infrastructure layer stores and governs it. The scheduler is where timing and intent live.*

The survey's caution about autonomy is a specific failure mode, not a general one: when an agent overestimates what it already knows and does not retrieve, the gap surfaces as a hallucinated answer. The design problem is to give the agent essential information at the right moments without retrieving enough to drown the context.

## 2. Query construction: decomposition and rewriting

Once retrieval fires, the query has to match the index it is sent to. The finding that frames this stage is blunt: the quality of the retrieval query has a substantial impact on reasoning performance, and Auto-RAG's comparison of HyDE and Visconde under identical retrieval conditions selects the better strategy per task.

**Decomposition** splits a complex question into sub-questions. Visconde and ChemAgent have the LLM break the question apart, retrieve candidates for each part, and aggregate. PRIME and MA-RAG add a planner agent, in the ReAct style, that forms a global retrieval plan before splitting. Agent KB goes one level deeper with a teacher model that watches the student fail and generates sub-queries aimed at the gaps.

**Rewriting** keeps one question and changes its wording. HyDE asks the LLM for a hypothetical answer document and retrieves with its embedding. MemoRAG conditions a draft answer on compressed global memory and uses the draft as the query. MemGuide produces a short command-like phrase that describes intent. Rewrite-Retrieve-Read trains a small rewriter with reinforcement learning, and ToC clarifies the question progressively through a tree of clarifications.

The two are not rivals. Auto-RAG evaluates HyDE and Visconde under the same conditions and picks the better one per task. The applied rule from the September tutorial is the same instinct in operational form: rewrite when the baseline looks weak, because rewriting can hurt on ambiguous questions.

## 3. Strategies: from keywords to graphs

The retrieval strategy is how the store is searched, and the survey walks it from the oldest form to the current frontier.

**Lexical retrieval** matches keywords. TF-IDF and BM25 are fast and interpretable and precise on exact terms, and they break on wording: a question that phrases a fact differently finds nothing. **Semantic retrieval** encodes query and memories into a shared space and matches by meaning. It is the default in most agent frameworks and it drifts, because similarity is not relevance and forced top-K returns fill the tail with noise. **Graph retrieval** adds topology. Systems such as AriGraph, EMG-RAG, Mem0g, and SGMem pull the most relevant nodes or triples and expand to K-hop neighbors to build an ego-graph. HippoRAG seeds personalized PageRank on the retrieved nodes and ranks the rest of the graph by proximity to the seeds. CAM and D-SMART let the LLM steer the walk, selecting informative neighbors or running beam search over the knowledge graph. For temporal graphs, Zep and MemoTime constrain the traversal by time, so the answer satisfies the question's time rules.

**Generative retrieval** replaces the search with generation: the model emits the identifiers of relevant documents directly. It trains to internalize the candidate set, which is strong on small corpora and poor when the corpus keeps changing, and agent memory has paid it little attention for that reason.

**Hybrid retrieval** is where most systems land. Agent KB and MIRIX combine lexical and semantic channels, Semantic Anchoring searches embeddings and inverted indices in parallel, and Generative Agents scores by recency, importance, and relevance together. MAICC adds a mixed-utility score over similarity and predicted returns, and the common graph pattern is two-stage: semantic retrieval finds the nodes, topology expands the neighborhood.

![MAICC figure 1: the centralized embedding model distills team knowledge into decentralized models, and at execution sub-trajectories retrieve by similarity and hybrid utility](/blog/memory-intro/retrieval/maicc-workflow.png)

*Figure 1 from Jiang et al. (2025), CC BY 4.0. MAICC's workflow: dashed lines are the centralized training path, where the embedding model distills team knowledge into decentralized embedding models; solid lines are decentralized execution, where sub-trajectories retrieve by similarity and hybrid utility and adapt their decisions from what comes back.*

The strategy should follow the memory's structure. A graph built by the consolidation in Part IV is searchable by traversal, and a flat store of facts is searchable by similarity, and the mismatch between the two is where retrieval quality is lost.

## 4. Post-retrieval processing: rerank, filter, aggregate

Raw retrieval returns redundant, noisy fragments. Injecting them directly means long contexts, conflicting information, and reasoning pulled off course, so the survey treats post-processing as part of retrieval rather than an afterthought.

**Re-ranking and filtering** remove what does not belong and reorder what remains. Early systems use handcrafted signals: Semantic Anchoring scores entity and discourse alignment, and RCR-Router combines role relevance, task-stage priority, and recency. Learned variants replace the hand weights: learn-to-memorize formulates score aggregation as a reinforcement-learning problem, Memento predicts with Q-learning whether a retrieved item contributes to a correct answer, and MemGuide fine-tunes a small model to rank by marginal slot-completion gain. Temporal filtering matters for any store with validity windows: Zep and MemoTime filter by timestamp and validity so the answer respects the time the question asks about. LLM evaluators are the newest layer: Memory-R1's Answer Agent and Westhäußer et al.'s Self-Validator score retrieved content before it reaches the model.

**Aggregation and compression** rebuild the fragments into a context. ComoRAG's Integration Agent picks the historical signals aligned with the query and merges them into an abstract global summary. MA-RAG's Extractor Agent keeps only the content strongly relevant to each sub-query and emits concise snippets. G-Memory goes further and customizes: it condenses retrieved insights and sparsified trajectories, then has an LLM shape them into role-specific memory for the agent that will use them.

![G-Memory figure 2: query, insight, and interaction graphs with bi-directional traversal and trajectory condensation](/blog/memory-intro/retrieval/gmemory-overview.png)

*Figure 2 from Zhang et al. (2025), CC BY 4.0. G-Memory's overview: queries, insights, and interactions form separate graphs; traversal moves up to collective insights and down to concrete trajectories, and condensation turns interaction trajectories into distilled, role-ready memory.*

Two rules from Part II hold at the end of this stage: every returned item carries its source span, and empty evidence abstains instead of answering.

## 5. How the four stages compose

A multi-hop question runs the whole pipeline. Intent selects the store. Decomposition splits the question into the two facts it needs. Graph traversal walks from one node to the other and returns the connecting path. Post-processing reranks the path against the rest of the results, cuts the noise, and attaches the spans the answer will cite. Each stage narrows the next one's work, and each stage's failure shows up downstream: a wrong intent choice searches the wrong store, a bad query finds the wrong nodes, and skipped post-processing lets the noise reach the model.

The applied counterpart is the September hybrid-search tutorial, where rank fusion across lexical and semantic channels and a confidence router deciding when to rewrite are this pipeline in miniature.

## 6. The frontier: from retrieval to generation

The survey's closing position is that the field is moving from retrieving stored text toward generating memory. Under retrieval, the store is assumed well formed and the work is to find the right entries. Generation treats the store as raw material: retrieve-then-generate systems such as ComoRAG, G-Memory, and CoMEM reconstruct retrieved items into something concise and context-specific, while direct generation systems such as MemGen and VisMem build latent memory tokens from the current context with no explicit lookup at all. The survey asks future systems to be context-adaptive, to fuse heterogeneous signals into unified representations, and to learn when and how to generate rather than follow hand-written rules.

That is where this series ends. Part I laid out the forms and functions, Parts II through V walked the dynamics, and the frontier the survey names next is memory the agent generates rather than retrieves.

## References

1. Hu, Y. et al. (2026). *Memory in the Age of AI Agents.* https://arxiv.org/abs/2512.13564 (the map this series follows; CC BY 4.0)
2. Li, Z. et al. (2025). *MemOS: A Memory OS for AI System.* https://arxiv.org/abs/2507.03724 (CC BY 4.0; Figure 7 reproduced)
3. Jiang, T. et al. (2025). *Multi-agent In-Context Coordination via Decentralized Memory Retrieval.* https://arxiv.org/abs/2511.10030 (CC BY 4.0; Figure 1 reproduced)
4. Zhang, G. et al. (2025). *G-Memory: Tracing Hierarchical Memory for Multi-Agent Systems.* https://arxiv.org/abs/2506.07398 (CC BY 4.0; Figure 2 reproduced)
5. Gutierrez, B. J. et al. (2024). *HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models.* NeurIPS 2024.
