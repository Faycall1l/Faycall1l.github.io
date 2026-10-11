---
title: "Retrieval Agents Can Trust: Hybrid Search, Rewriting, Reranking, and Evaluation"
description: "BM25 plus dense retrieval fused with RRF, query rewriting with cost-aware routing, reranking, and an eval harness that measures recall, citations, and abstention. All runnable."
date: 2026-09-25
tags: ["agents", "retrieval", "rag", "context-management", "tutorial"]
---

The first three tutorials gave agents a loop, a budget, and a memory. This one gives them evidence worth reasoning over. Retrieval is where agent answers succeed or fail, and the 2026 literature is unusually unanimous on two points: **no single retrieval strategy wins**, and **unevaluated retrieval is decoration**. So this tutorial builds a hybrid retriever from scratch (no API keys, fully runnable), adds rewriting and reranking as explicit policies with measured trade-offs, and wraps it all in an evaluation harness you can steal for any project.

## 1. Tutorial A: hybrid search from scratch with RRF

Dense vectors miss exact terms ("Lyon office" vs. "Lyon branch" is fine; "ERR_TIMEOUT_7" vs. its paraphrase is not). Keyword search misses meaning. Production systems run both and fuse rankings with Reciprocal Rank Fusion, which needs no tuning and no scores, only ranks. Here is the complete thing, small enough to read in one sitting:

```python
import math, re
from collections import Counter

def tokenize(s): return re.findall(r"[a-z0-9]+", s.lower())

class BM25:
    def __init__(self, docs, k1=1.5, b=0.75):
        self.docs = [tokenize(d) for d in docs]
        self.N = len(docs)
        self.avg = sum(map(len, self.docs)) / self.N
        df = Counter(t for d in self.docs for t in set(d))
        self.idf = {t: math.log(1 + (self.N - c + 0.5) / (c + 0.5))
                    for t, c in df.items()}
        self.k1, self.b = k1, b

    def scores(self, query):
        out = []
        for d in self.docs:
            tf, s = Counter(d), 0.0
            for t in tokenize(query):
                f = tf.get(t, 0)
                s += self.idf.get(t, 0) * f * (self.k1 + 1) / (
                    f + self.k1 * (1 - self.b + self.b * len(d) / self.avg))
            out.append(s)
        return out

def rrf(*rankings, k=60):
    """Fuse ranked index lists. k=60 is the literature default."""
    fused = Counter()
    for ranking in rankings:
        for rank, idx in enumerate(ranking):
            fused[idx] += 1.0 / (k + rank + 1)
    return [i for i, _ in fused.most_common()]

DOCS = [
    "Ada works at Acme in Paris since 2021",
    "Acme quarterly revenue grew in Paris",
    "Bob likes pizza and teaches agents",
    "Paris office moved to Lyon in 2023",
]
bm25 = BM25(DOCS)
query = "Where does Ada work in Paris"
lexical = sorted(range(len(DOCS)), key=lambda i: -bm25.scores(query)[i])
print("BM25 order:", lexical, "->", DOCS[lexical[0]])
```

Swap the second channel for real dense retrieval (embeddings plus cosine) and fuse with the same `rrf`. The fusion function does not change, which is the point: **channels come and go, fusion stays.** A useful third channel costs nothing: exact-phrase match over the same index, which rescues error codes, names, and version strings that both BM25 tokenization and dense models mangle.

A note on chunking, since retrieval quality is decided at ingestion: keep chunks small enough that one chunk holds one idea (a few hundred tokens is the common default), overlap boundaries so ideas split across edges survive, and attach metadata (source, date, section) at write time. Metadata attached late is metadata reconstructed wrong. These are heuristics with wide support, not laws; your eval harness (section 4) is how you tune them for your corpus.

## 2. Query rewriting: coverage source, not replacement

Queries and documents speak different dialects: users ask questions, documents state facts. Rewriting bridges the gap, and the September 2026 evidence pins down exactly how. Tested against a strong baseline (dense retrieval plus cross-encoder reranking plus diversification), no single rewriting method beats the baseline alone, but a **union of complementary methods** gains +12.5 HIT@10 points on enterprise data, because different strategies fail on different questions. And rewriting can hurt: on ambiguous questions the same fusion scored *below* the best solo method. The correct mental model, per the authors: rewriting is a complementary coverage source applied through cost-aware routing, not a default stage.

Concretely, three rewrite policies worth implementing as tools your agent can choose between:

1. **Decompose.** Split multi-hop questions into sub-questions, retrieve per sub-question, then synthesize. Best when the question names two facts that live in different documents.
2. **HyDE (hypothetical documents).** Ask the model to write the passage that *would* answer the question, then retrieve by the passage embedding rather than the question embedding. The 2026 comparison prompt is disarmingly plain: "Please write a passage to answer the question. Question: {q} Passage:". Best when vocabulary mismatch is the bottleneck.
3. **Route, don't always rewrite.** Run the cheap baseline first; rewrite only when its top-1 score is low. Simulation captures about half the full-merge gain while paying rewriting cost on under 40 percent of queries, and automatically declines on question types where rewriting hurts. A confidence gate is three lines and saves real money.

```python
def retrieve_with_routing(query, baseline_top1_score, threshold=0.35):
    """Cost-aware rewriting: pay for HyDE only when baseline looks weak."""
    if baseline_top1_score >= threshold:
        return fused_search(query)              # cheap path
    hypo = llm(f"Please write a passage to answer the question.\n"
               f"Question: {query}\nPassage:")  # HyDE expansion
    return fused_search(query, extra_queries=[hypo, decompose(query)])
```

Teach the agent these as separate tools (`search`, `search_with_rewrite`) with honest descriptions, and let the loop decide. Rewriting the agent cannot decline is a tax; rewriting it chooses is a skill.

## 3. Reranking: spend compute where it matters

Retrieval optimizes recall over hundreds of candidates; generation needs precision in the top handful. Reranking bridges the two: a cross-encoder (or listwise LLM judge) scores query-document pairs jointly, which is far more accurate than embedding similarity and far too expensive to run over the whole corpus. The standard pipeline is therefore **retrieve-then-rerank**: cheap channels fetch 50 to 100 candidates, the reranker orders them, the top 3 to 5 enter context. Frameworks ship this as one line (Cohere, Jina, and open cross-encoders all plug into the same slot), but understand what the line does: every rerank call is a model inference per pair, so candidate count is a cost dial, and the reranker's own biases (position, verbosity, literal matching, all documented in 2026 work) become your system's biases. Evaluate with the reranker on, never off, since rankings interact with everything downstream.

## 4. Tutorial B: the eval harness that makes all of this real

None of the above means anything without measurement. The minimal harness has four metrics and one rule. Recall@k (is the answer present?), citation precision (does each claim point at a supporting span?), abstention rate on unanswerables (does it say "I don't know" when the corpus cannot answer?), and tokens per query (what did quality cost?). The rule, from Ragas' own improvement guides: **change one thing at a time**, naive baseline first, then each addition measured against it. Their worked example is instructive: naive single-shot RAG at 65 percent, agentic multi-search RAG at 88 percent, same corpus, same judge. The gain came from retrieval behavior, not a bigger model.

```python
def evaluate(retriever, cases):
    """cases: list of (query, gold_doc_idx or None if unanswerable).
    retriever(query, k) returns (hits, tokens_used); hits is a list of
    (doc_idx, score). Wrap Tutorial A to match this interface."""
    stats = {"recall": [], "abstained": [], "tokens": []}
    for query, gold in cases:
        hits, used_tokens = retriever(query, k=5)
        stats["tokens"].append(used_tokens)
        if gold is None:  # unanswerable: abstention is the correct answer
            stats["abstained"].append("I don't know" in answer(hits, query))
            continue
        stats["recall"].append(gold in [h for h, _ in hits])
    return {
        "recall@5": sum(stats["recall"]) / max(len(stats["recall"]), 1),
        "abstention": sum(stats["abstained"]) / max(len(stats["abstained"]), 1),
        "avg_tokens": sum(stats["tokens"]) / len(stats["tokens"]),
    }

baseline = evaluate(naive_retriever, CASES)
candidate = evaluate(hybrid_rrf_retriever, CASES)
print(baseline, candidate)  # ship it only if recall rises at honest cost
```

Include unanswerable cases deliberately. A harness without them rewards guessing, and guessing is the failure mode the abstention metric exists to catch. Report all four numbers on every change: recall, citation precision (spot-checked by hand on a sample; judges help but do not replace reading), abstention, tokens. A retrieval change that gains two recall points at triple the tokens is a cost decision, not a win, and should be presented as one.

## Exercises

1. Extend Tutorial A with the exact-phrase third channel and measure recall@5 before and after on 20 hand-written queries, 5 of them unanswerable. Keep the harness; you will reuse it all year.
2. Implement the confidence router with a real embedder and find your corpus's threshold: sweep 0.2 to 0.5 and plot gain versus rewrite rate. The curve, not the constant, is the deliverable.
3. Add citation enforcement to generation: require every factual sentence to carry a `[doc n]` marker, then hand-score 20 answers for citation precision. The gap between recall and precision is your next quarter of work.

## References

1. Gao et al. (2023). *Precise zero-shot dense retrieval without relevance labels (HyDE).* https://arxiv.org/abs/2212.10496
2. Shanian et al. (2026). *Better together: complementary query rewriting.* https://arxiv.org/abs/2609.05637
3. Fayyaz et al. via ACL (2026). *Masking or mitigating? Query rewriting and retriever bias.* https://aclanthology.org/2026.findings-acl.414.pdf
4. Anonymous (2026). *Is agentic RAG worth it?* https://arxiv.org/html/2601.07711v1
5. Ragas docs. *Evaluate and improve a RAG app.* https://docs.ragas.io
6. Agno docs. *Agentic RAG with reranking.* https://docs.agno.com/knowledge/concepts/search-and-retrieval/agentic-rag
7. Eastondev (2026). *RAG optimization: hybrid search, reranking, evaluation.* https://eastondev.com/blog/en/posts/ai/20260421-rag-optimization-balance
