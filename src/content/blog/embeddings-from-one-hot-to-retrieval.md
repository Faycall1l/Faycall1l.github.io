---
title: "Embeddings: From One-Hot Vectors to Retrieval-Ready Models"
description: "A ground-up tutorial on embeddings: where the numbers come from, how word2vec, BERT and SBERT produce them, how similarity is computed, and what to read to go deeper."
date: 2026-10-30
tags: ["nlp", "embeddings", "tutorial", "series"]
---

This is the first installment of a new series on NLP fundamentals, separate from the memory series. It starts where the field started: the problem of giving text to a model that only accepts numbers, and the solutions that followed over four decades. The later sections assume nothing beyond basic linear algebra, and every animation in the article is a mechanism you can trace in code afterwards.

Figures here come in two kinds: original animations built for this article, and one reproduced figure from the Sentence-BERT paper under CC BY-SA 4.0. References are listed at the end with links.

## 1. The representation problem

A neural network takes tensors and returns tensors. Text is a sequence of symbols. The first task of any NLP system is a translation in the mathematical sense: turn symbols into numbers without losing the properties you need later, which are mostly similarity and relation.

The naive answer is one-hot encoding. Give every word in the vocabulary a unique index, represent each word as a vector of length V with a 1 in its slot and 0 everywhere else.

<figure class="anim" data-anim="onehot">
  <div class="anim-stage"></div>
  <figcaption>Original animation. Left: three one-hot vectors share nothing. Right: learned dense vectors for the same three words. Columns 1 and 7 light up for both cat and dog because the training signal put them there.</figcaption>
</figure>

One-hot encoding has two fatal properties. First, it scales linearly with vocabulary size: 100,000 dimensions per word, almost all of them zero. Second, every pair of one-hot vectors has dot product 0 and cosine similarity 0. The representation of *cat* and *dog* is exactly as close as the representation of *cat* and *quantum*. The encoding carries identity and nothing else.

Everything that follows in this article is a better answer to the same question: how do you get a vector for a word such that the geometry of the vector space means something?

## 2. The idea that made it possible

The observation behind every embedding method is old. J. R. Firth wrote it in 1957: "You shall know a word by the company it keeps." Zellig Harris had made the same argument for identifying morphemes in 1954. The statistical version is simple enough to state in one line: words that appear in similar contexts have similar meanings.

This is the distributional hypothesis, and it turns semantics into something countable. If you record the contexts in which every word occurs across a corpus, two words with overlapping context distributions are probably related. The engineering question is then how to compress those counts into a fixed-length vector while keeping the similarities intact.

## 3. Static embeddings

A static embedding assigns one vector per vocabulary item, learned from a corpus. Every occurrence of *bank* gets the same vector regardless of sentence. This section covers the three classics.

### 3.1 word2vec

Mikolov and colleagues (2013) proposed training embeddings as a byproduct of a prediction task rather than as a reconstruction of count matrices. Two variants share one idea:

- **Skip-gram**: predict the surrounding words from the center word.
- **CBOW** (continuous bag of words): predict the center word from the surrounding words.

<figure class="anim" data-anim="window">
  <div class="anim-stage"></div>
  <figcaption>Original animation. A training window slides across a sentence. The center word (filled) is predicted from its neighbors (outlined), which is exactly the skip-gram objective at one position.</figcaption>
</figure>

The training loop is the diagram above, repeated over every position in the corpus. For each (center, context) pair, the model adjusts the vectors to raise the probability of the observed context word. Words that occur in interchangeable contexts receive gradients that push their vectors in similar directions, because the same context predicts them from similar starting points.

Two implementation details matter in practice:

**Negative sampling.** The full softmax over the vocabulary is expensive: one update requires normalizing over V entries. word2vec approximates it by sampling a handful of negative examples (words that did not appear) and training a binary classifier against them. The normalization cost drops from V to a small constant per update.

**Subsampling of frequent words.** Very common words (*the*, *a*) appear in almost every context and carry little signal, while dominating the update count. Randomly discarding them during training both speeds the run up and improves the resulting vectors.

The result of training at scale (the original Google News run used about 100 billion words, 300-dimensional vectors, a vocabulary of roughly 3 million entries) is a vector space with arithmetic structure. The famous example:

<figure class="anim" data-anim="analogy">
  <div class="anim-stage"></div>
  <figcaption>Original animation. Analogy as vector arithmetic: start at king, add the offset from man to woman, land on queen. The relation is encoded as a direction, and cosine similarity finds the nearest vocabulary item along it.</figcaption>
</figure>

The mechanism behind the animation: to answer "king is to man as woman is to ?", you compute the vector `king - man + woman` and return the nearest word by cosine similarity. The gender relation exists in the space as a direction, and the analogy recovers it by addition and subtraction. That the geometry supports this at all was the surprise in 2013, and it follows directly from the training objective: words sharing contexts share gradients.

The arithmetic is approximate. It works well for syntactic relations (*walking* to *walked* is close to *swimming* to *swam*) and for clean semantic relations, and it degrades for anything requiring more than one relation at a time. Treat it as a property of the space, not a reasoning ability.

### 3.2 GloVe

GloVe (Pennington et al., 2014) takes the other route to the same destination: factorize the global word-word co-occurrence matrix rather than predict local windows. The objective weights each co-occurrence by the logarithm of its count, which tames the dynamic range between frequent and rare pairs. The result is comparable to word2vec on downstream tasks, and the training matrix is inspectable, which made it a favorite for analysis.

### 3.3 fastText

fastText (Bojanowski et al., 2017) keeps the word2vec objective but represents each word as the sum of its character n-grams (typically lengths 3 to 6) plus the word itself. A word seen in training still gets a word vector, but words never seen before can be composed from n-grams that were. This fixes out-of-vocabulary words, which matters for morphology-rich languages and for typos, at the cost of larger models.

### 3.4 What static embeddings cannot do

One vector per word is one vector per word. *Bank* in "river bank" and *bank* in "bank account" share a vector, and no amount of training data fixes this, because the lookup table has one slot for the type. The same limit appears in the other direction: a word's meaning in a sentence is not a property of the word alone but of the word in context.

Static embeddings also predate the fine-tuning era. Their practical role today is mostly as a cheap baseline, a feature extractor for small-data classifiers, and a conceptual foundation. The production systems in the retrieval and memory articles use contextual encoders instead.

## 4. Measuring similarity

Once every item has a vector, comparing two of them is arithmetic. Three distance notions dominate, and they are not interchangeable.

**Cosine similarity.** The cosine of the angle between vectors: dot product divided by the product of magnitudes. It ignores length and measures direction only. This is the default for text embeddings, because vector magnitude in trained models correlates with frequency and token count rather than with content.

**Dot product.** Cosine multiplied by both magnitudes. If the vectors are normalized to unit length first, dot and cosine are identical, which is why normalization is often done once at indexing time and every retrieval comparison becomes a dot product.

**Euclidean distance.** Straight-line distance. In high dimensions it behaves differently from what intuition expects: distances between random pairs converge, so nearest-neighbor structure becomes weak. Cosine sidesteps the magnitude component but not the concentration effect entirely; for dense retrieval, either works if applied consistently.

<figure class="anim" data-anim="cosine">
  <div class="anim-stage"></div>
  <figcaption>Original animation. One vector held fixed, the other sweeping. Cosine similarity is 1 when directions match, 0 when orthogonal, negative when opposed. The bar below tracks the value from -1 to +1.</figcaption>
</figure>

The readout in the animation is the quantity you will compute most often in practice. One warning that recurs in evaluation work: a similarity value is meaningful relative to other values from the same model on the same data. An absolute cosine of 0.8 means nothing without the distribution it came from. Models differ in how they spread similarities, so thresholds do not transfer between them.

## 5. Contextual embeddings

The fix for static embeddings came from language models that read the whole sentence: the vector for a word becomes a function of the input, computed at encoding time.

**ELMo** (Peters et al., 2018) built word representations from a pretrained bidirectional language model: run the LSTM over the sentence, combine internal states from multiple layers. Different layers encode different things, and lower layers carry syntax while higher layers carry meaning, a finding that influenced layer selection for years after.

**BERT** (Devlin et al., 2019) replaced recurrence with self-attention and pretrains with masked language modeling: hide 15% of tokens, predict them from both left and right context. Because every layer attends to every other token, each output vector has been shaped by the entire input. The base model: 12 layers, 768 hidden dimensions, about 110 million parameters, maximum input of 512 tokens.

<figure class="anim" data-anim="context">
  <div class="anim-stage"></div>
  <figcaption>Original animation. The token "bank" in two sentences, projected into the same 2D space. Its vector moves with the sentence, landing near the river cluster or the money cluster. A static embedding would keep it in one place.</figcaption>
</figure>

The animation is the whole motivation: same token, different vector, decided by context. Downstream, BERT is fine-tuned per task, and for retrieval it is used in one of two modes. Either take a special token's output (the original approach, which was weak for sentences) or pool the token vectors into a single sentence vector, which is what the next section is about.

### How context gets mixed: attention in one paragraph

Self-attention lets each token collect information from every other token, weighted by relevance. Each token produces a query (what am I looking for), a key (what I contain), and a value (what I will pass on). Query compared against all keys gives weights; the weighted sum of values becomes the token's updated representation. Stacking layers composes this: early layers handle proximity and syntax, later layers handle reference and semantics.

<figure class="anim" data-anim="attention">
  <div class="anim-stage"></div>
  <figcaption>Original animation. Attention weights from one query token to all tokens in a sentence. Thicker arcs carry more weight. The pronoun "it" attends strongly to "cat" (its referent) and to the second "it", which is how reference resolution emerges without an explicit step.</figcaption>
</figure>

The weights in the animation are illustrative rather than from a trained model, but the pattern they show matches what probing studies find: pronouns attend to their antecedents, and attention heads specialize in recoverable relations. The output of the last layer, one vector per input token, is what everything downstream consumes.

## 6. From token vectors to one sentence vector

Retrieval, clustering, and deduplication all need one vector for a passage, not one per token. The reduction step is pooling, and the training objective around it decides whether the result is useful.

<figure class="anim" data-anim="pooling">
  <div class="anim-stage"></div>
  <figcaption>Original animation. Token vectors (one highlighted dimension each) are combined by mean pooling into a single sentence vector. Other options are max pooling and taking a special token's output; mean pooling works well in practice.</figcaption>
</figure>

Naive use of BERT for this failed in an instructive way. The original paper evaluated sentence similarity by feeding a sentence pair through the full cross-encoder and comparing the output, which produces good numbers and is unusable for search: scoring 1,000 candidates against a query needs 1,000 forward passes. Encoding each sentence once and comparing vectors needs 1,000 matrix multiplications after one pass per unique sentence. The cross-encoder is accurate and quadratic; the bi-encoder is cheap and needs training to close the accuracy gap.

Sentence-BERT (Reimers & Gurevych, 2019) closed much of that gap by fine-tuning a siamese BERT with pooling and a loss that pulls matching pairs together:

![Sentence-BERT architecture: two BERT encoders with pooling produce u and v, compared either by concatenation with a softmax classifier or by cosine similarity](/blog/embeddings/sbert-siamese.png)

*Figure 1 from Reimers and Gurevych (2019), CC BY-SA 4.0. Left: training configuration, the pair (u, v, |u−v|) fed to a classifier over the NLI labels. Right: inference, cosine similarity between the two pooled encodings, in the -1 to 1 range. Both sentences pass through the same weights, so encoding is independent per sentence and results cache.*

Two sentences through shared weights, mean-pooled, compared by cosine. The design consequence is the sentence similarity search that every embedding API today provides: encode once, store, compare forever.

### Training with contrastive losses

Modern embedding models are trained on triplets and batches rather than pairs:

- **Contrastive loss**: one positive, one negative, push apart, pull together.
- **Triplet loss**: anchor, positive, negative, with a margin requirement.
- **Multiple negatives ranking loss**: in a batch of B sentences, each sentence's positive is its pair, and the other B-1 sentences in the batch are negatives for free. This is the workhorse of current sentence embedding training, because a batch of 64 gives 64 negatives per example at no labeling cost.

Hard negatives matter more than their quantity. Random negatives from the same corpus are usually unrelated topics, and separating them teaches the model coarse topic discrimination. Negatives that are topically close but differ on the decisive detail (same product category, wrong model number) force the model to use the features that retrieval actually depends on. Constructing them well is most of the engineering in training a modern retriever.

Instruction-tuned variants add a text prompt before the input ("Represent this sentence for searching relevant passages: ..."), which lets one model serve differently framed queries, a pattern introduced by instruction-based and E5-style training and now common in API models.

## 7. Practical properties of embedding vectors

**Dimension.** Classic sizes: 768 or 1024 from BERT-class encoders, 384 from distilled MiniLM models, 1536 and 3072 from OpenAI's embedding models. Smaller dimensions cut index memory and speed up search, with an accuracy cost that depends on the model. Matryoshka representation training (Kusupati et al., 2022) makes dimensions fungible: the model is trained so the first k dimensions of its output remain a good embedding on their own, and you can truncate at any trained size. OpenAI's text-embedding-3 models support this directly, so you can request 256 dimensions from a 3072-dim model when the index budget demands it.

**Normalization.** Unit-normalize at insert time if you intend to compare by cosine, and then compare by dot product, since they are equal for unit vectors. Normalizing is cheap; forgetting it and mixing normalized with raw vectors is a common silent bug that manifests as similarity values slightly off rather than obviously wrong.

**Chunking.** Embeddings are computed under a model's maximum input length, and a vector summarizes everything it saw. A 2,000-word document passed whole becomes one point averaging several topics, and a query about the fifth paragraph must compete against that average. Chunking into passages of a few hundred tokens before encoding keeps each vector about one topic. Chunk boundaries are therefore a retrieval quality decision, and they interact with the query: chunks that duplicate overlap text reduce boundary misses at the cost of index size.

**Batch effects.** The same text encoded twice gives the same vector (models are deterministic in inference), but the same text at different truncation lengths gives different ones. Re-encoding after a model upgrade changes every vector in the index; similarity values computed across two model versions are meaningless. Upgrades require reindexing, and the cost scales with corpus size.

## 8. What the index does with them

Storing N vectors and finding the k nearest to a query by brute force costs O(N) similarity computations per query, which is acceptable into the low millions on modern hardware. Beyond that, approximate nearest neighbor (ANN) indexes trade a bounded amount of recall for large speedups. The family that dominates current systems is graph-based: HNSW (Malkov and Yashunin, 2018) builds a navigable small-world graph over the vectors, and search walks it greedily, reaching near-neighbors in O(log N) steps instead of scanning. The cost lives in memory, since every vector stores graph links, and in build time.

Quantization variants compress vectors (product quantization, binary codes) to cut memory further, trading more recall for less RAM. This layer is where vector databases live, and it is agnostic to how the vectors were produced: any encoder that yields comparable vectors can be indexed.

Two rules carry across every implementation. Vectors from different models are never comparable, so the index records which model and version produced it. And filtering (by tenant, date, permission) interacts with ANN: a filter applied after search can return fewer than k results or none, so filtered search either over-fetches and filters or falls back to brute force over the filtered subset.

## 9. Evaluation

**Intrinsic evaluation** measures the vector space directly: analogy accuracy, word similarity correlation against human judgments. Fast to run, narrow in what they tell you, and largely retired with static embeddings.

**Extrinsic evaluation** measures a downstream task: retrieval quality, classification accuracy, clustering scores. Slower, and what you actually care about.

For retrieval specifically, the standard vocabulary:

- **Recall@k**: fraction of queries where a relevant item appears in the top k. The retriever's number, measured before anything downstream sees the results.
- **MRR** (mean reciprocal rank): 1 divided by the rank of the first relevant result, averaged over queries. Punishes relevant items buried at rank 10 more sharply than recall does.
- **nDCG**: rank-position-weighted gain, normalized per query so scores are comparable across queries with different numbers of relevant items.
- **MTEB** (Muennighoff et al., 2023): the standard multi-task embedding benchmark, 56 datasets across retrieval, clustering, classification, and similarity tasks. Scores are model-agnostic and comparable; leaderboards overstate small differences, so read the task breakdown rather than the aggregate.
- **BEIR** (Thakur et al., 2021): 18 heterogeneous retrieval datasets built to test generalization. Models tuned on web data degrade on scientific, legal, and biomedical corpora, which is why in-domain evaluation beats leaderboard position when your domain is specialized.

One procedural rule from evaluation practice: keep a held-out test set your model never saw in training or development, and beware train-test contamination in public benchmarks. Embedding models trained on large web corpora have often seen benchmark pairs in pretraining, which inflates reported scores relative to what you observe on your own data. Your own labeled pairs, even 200 of them, tell you more than a benchmark point.

## 10. Failure modes

**Negation and quantifiers.** "The treatment worked" and "The treatment did not work" differ by one token, and embedding models frequently place them close together because the surrounding context is nearly identical. Systems that answer yes/no questions from retrieved text inherit this as a confabulation risk. If the decision depends on polarity, do not let cosine similarity make the call; pass the text to a reader model that must read it.

**Domain shift.** A model trained on web text encodes web-text similarity. Legal, medical, and code corpora have their own notions of "similar", and an out-of-domain model fails quietly: it returns confident, fluent, wrong-neighborhood results. Benchmark on your domain before trusting general numbers.

**Similarity is not entailment.** High cosine means the vectors point the same way, which usually means topically related. It does not mean one statement implies the other, contradicts it, or is more specific. Retrieval systems that treat similarity as relevance hit this when the nearest passage shares a topic and contradicts the fact in question.

**Length effects.** Long inputs truncate at the model limit, silently: text past the cutoff contributes nothing, and the failure is invisible unless you check token counts. Very short inputs produce vectors with higher variance. Both are handled by chunking policies rather than model changes.

**Staleness.** Embeddings date. Facts change, products are renamed, vocabulary moves. A vector index built a year ago encodes last year's text distribution, and the drift is not measurable from inside the index. Re-encoding schedules belong next to the database maintenance tasks.

## 11. Where this connects

The retrieval tutorial from September in this blog picks up at the point this article ends: hybrid search combining these vectors with lexical retrieval, rewriting queries, reranking, and evaluating the pipeline. The memory series covers what happens after retrieval, how systems decide what to store in the first place. This article is the representation layer underneath both.

For practice, the path from here is short: take a small corpus, encode it with an open-source sentence transformer, search it by cosine, measure recall@10 on hand-labeled pairs, then break something on purpose (normalize inconsistently, chunk at 5,000 words, mix two model versions) and watch the numbers move. The failure modes in section 10 are all reproducible in an afternoon.

## Reading list

Ordered by the sequence in which it helps to read them, not by date.

**Foundations**

1. Firth, J. R. (1957). *A Synopsis of Linguistic Theory.* (the distributional hypothesis, one sentence that organizes the field)
2. Harris, Z. S. (1954). *Distributional Structure.* Word, 10(2-3), 146-162.
3. Mikolov, T. et al. (2013). *Efficient Estimation of Word Representations in Vector Space.* https://arxiv.org/abs/1301.3781 (skip-gram and CBOW)
4. Mikolov, T. et al. (2013). *Distributed Representations of Words and Phrases and their Compositionality.* https://arxiv.org/abs/1310.4546 (negative sampling, subsampling, the analogy arithmetic)
5. Pennington, J. et al. (2014). *GloVe: Global Vectors for Word Representation.* https://aclanthology.org/D14-1162/
6. Bojanowski, P. et al. (2017). *Enriching Word Vectors with Subword Information.* https://arxiv.org/abs/1607.01759 (fastText)

**Contextual encoders**

7. Peters, M. et al. (2018). *Deep Contextualized Word Representations.* https://arxiv.org/abs/1802.05365 (ELMo)
8. Devlin, J. et al. (2019). *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding.* https://arxiv.org/abs/1810.04805
9. Vaswani, A. et al. (2017). *Attention Is All You Need.* https://arxiv.org/abs/1706.03762 (the transformer; read section 3.2-3.3 with section 5 of this article open)

**Sentence embeddings and retrieval**

10. Reimers, N. and Gurevych, I. (2019). *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks.* https://arxiv.org/abs/1908.10084 (figure reproduced above)
11. Gao, T. et al. (2021). *SimCSE: Simple Contrastive Learning of Sentence Embeddings.* https://arxiv.org/abs/2104.08821 (contrastive training, clean and short)
12. Karpukhin, V. et al. (2020). *Dense Passage Retrieval for Open-Domain Question Answering.* https://arxiv.org/abs/2004.04906 (dual encoders for retrieval)
13. Khattab, O. and Zaharia, M. (2020). *ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT.* https://arxiv.org/abs/2004.12832 (the middle ground between bi- and cross-encoders)
14. Kusupati, A. et al. (2022). *Matryoshka Representation Learning.* https://arxiv.org/abs/2205.13147 (adjustable dimensions)

**Benchmarks and practice**

15. Thakur, N. et al. (2021). *BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models.* https://arxiv.org/abs/2104.08663
16. Muennighoff, N. et al. (2023). *MTEB: Massive Text Embedding Benchmark.* https://arxiv.org/abs/2210.07316
17. Malkov, Y. and Yashunin, D. (2018). *Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs.* https://arxiv.org/abs/1804.08237 (HNSW)
18. Jurafsky, D. and Martin, J. H. *Speech and Language Processing.* https://web.stanford.edu/~jurafsky/slp3/ (draft, free; chapters 6 and 15 cover embeddings and transformers with more derivations than any paper listed here)

---

Next in this series: tokenization and what subword models actually optimize, which is the step before embeddings that most tutorials skip.
