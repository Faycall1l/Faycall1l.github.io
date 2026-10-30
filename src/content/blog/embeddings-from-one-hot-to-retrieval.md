---
title: "Embeddings: From One-Hot Vectors to Retrieval-Ready Models"
description: "A ground-up tutorial on embeddings: where the numbers come from, how word2vec, BERT and SBERT produce them, how similarity is computed, worked examples throughout, and a reading list."
date: 2026-10-30
tags: ["nlp", "embeddings", "tutorial", "series"]
---

This is the first installment of a new series on NLP fundamentals, separate from the memory series. It covers how text becomes numbers: the naive encodings, the models that place words by their contexts, and the systems that turn documents into vectors you can search. Every term is defined where it first appears. The only background that helps is arithmetic.

The article uses two kinds of figures. Animated diagrams were built for this text. Diagrams reproduced from published papers carry a credit line underneath with authors and license. The reading list at the end is ordered by reading sequence.

## 1. The representation problem

A neural network reads numbers and returns numbers. Text is a sequence of symbols. The first job of any NLP system is to convert symbols to numbers without losing the properties you need later, and those properties are similarity and relation.

Some vocabulary before the examples. A **vector** is a list of numbers. The **dimension** of a vector is how many numbers it holds. The set of distinct tokens the system knows is its **vocabulary**, and a **token** is one unit the model reads: a word, a word-piece, or a punctuation mark. A **corpus** is the collection of text a model learns from.

The naive conversion is one-hot encoding. Assign every vocabulary item a unique index. Represent each word as a vector of length V, where V is the vocabulary size, with a 1 in its slot and 0 everywhere else. With a five-word vocabulary, the encoding of `cat` is `[1, 0, 0, 0, 0]` and the encoding of `quantum` is `[0, 0, 0, 1, 0]`.

<figure class="anim" data-anim="onehot">
  <div class="anim-stage"></div>
  <figcaption>Left: three one-hot vectors. Every pair shares no positions. Right: learned dense vectors for the same words. Columns 1 and 7 hold high values for both cat and dog, so those two vectors point in a similar direction; car occupies different columns.</figcaption>
</figure>

One-hot encoding has two problems.

**Size.** Each word needs V numbers. Real vocabularies run from about 50,000 tokens in small models to 3 million entries in the original word2vec Google News release. Every word becomes a vector of that length, almost all zeros, and storage and computation both scale with V.

**Geometry.** The dot product of two vectors is the sum of their term-by-term products. Two different one-hot vectors share no nonzero positions, so their dot product is 0, and their cosine similarity is 0 as well (the vectors sit at a right angle in V dimensions). The pair `cat`/`dog` is exactly as close as the pair `cat`/`quantum`. The encoding records which word it is and nothing about how words relate.

Everything after this section is an attempt to fix those two problems at once: place every word in a space of fixed, manageable dimension where distances match meaning.

## 2. The idea that made it possible

The observation behind every embedding method is older than neural networks for NLP. J. R. Firth wrote it in 1957: "You shall know a word by the company it keeps." Zellig Harris had made the same argument for identifying morphemes in 1954. The statistical version fits in one sentence: words that appear in similar contexts have similar meanings.

This is the distributional hypothesis, and it turns meaning into something countable. The word *dog* appears in contexts like "the dog barked", "walk the dog", "pet the dog". The word *cat* shares many of them: "pet the cat", "the cat sat". The word *quantum* appears in "the quantum field", "quantum mechanics" and shares almost none. Counting contexts already groups cat with dog and separates quantum from both.

The engineering question is how to compress those counts into a fixed-length vector while preserving the similarities. Build a vocabulary-by-vocabulary matrix of how often each word pair occurs in context, then reduce each row to a vector of manageable size. The methods in the next section are different answers to that compression problem.

## 3. Static embeddings

A **static** embedding assigns one vector per vocabulary item, learned once from a corpus and reused everywhere afterwards. Every occurrence of *bank* receives the same vector regardless of the sentence. This section covers the three classic methods.

### 3.1 word2vec

Mikolov and colleagues (2013) learned embeddings as a side effect of a prediction task instead of compressing a count matrix. Two variants differ only in prediction direction:

- **Skip-gram**: predict the surrounding words from the center word.
- **CBOW** (continuous bag of words): predict the center word from the surrounding words.

<div class="img-scroll">
<img src="/blog/embeddings/cbow-skipgram.png" alt="CBOW and skip-gram architectures: CBOW maps four context words to a hidden layer that predicts the center word; skip-gram maps a center word to a hidden layer that predicts each context word, with the two objective functions shown below the diagrams" />
</div>

*Diagrams of the two objectives from Aelu013, Wikimedia Commons, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Left: CBOW predicts w_t from the surrounding words w_{t+j}. Right: skip-gram predicts each w_{t+j} from w_t. The sums underneath are the training objectives: total log probability of the predicted words over all positions t in the corpus.*

The words available for prediction form a **window**: the center word plus the words within a fixed radius c on each side (the original implementations commonly use a radius of 5).

<figure class="anim" data-anim="window">
  <div class="anim-stage"></div>
  <figcaption>A training window slides across a sentence. The center word, drawn filled, is predicted from the words inside the green frame. Each position in the corpus produces training pairs like this one.</figcaption>
</figure>

The loop behind the figure runs over every position of every sentence in the corpus. Training means this: the model stores **parameters** (the numbers that make up the vectors and the predictor), the prediction produces an error, and each step adjusts the parameters to reduce that error. After billions of steps the vectors settle into their final positions. Words that routinely serve as context for the same center words receive similar adjustments, so their vectors end up pointing in similar directions.

Two implementation details make the training affordable:

**Negative sampling.** Computing the probability of the predicted word against the full vocabulary requires one evaluation per vocabulary item: 100,000+ operations per training step, 3 million in the Google News setting. Negative sampling replaces that with a binary classifier over a handful of words: the observed word and k words that did not appear (k = 5 by default; the original paper suggests 2 to 10). Each step then costs k + 1 evaluations instead of V, and the geometric effect is the same: observed pairs are pulled together, random pairs are pushed apart.

**Subsampling of frequent words.** Tokens like *the*, *a* and *of* appear in almost every window and carry little meaning, yet they dominate the step count. word2vec discards them randomly during training, with the discard probability rising with frequency (default frequency threshold t = 1e-5: a word occurring more than once per 100,000 tokens is eligible). The original paper reports that this both speeds up training and improves the resulting vectors.

Training at scale produces a space with arithmetic structure. The well-known example:

<figure class="anim" data-anim="analogy">
  <div class="anim-stage"></div>
  <figcaption>The offset from man to woman equals the offset from king to queen: the two dashed lines are parallel and equal in length. The analogy computes king + (woman − man), drawn as the moving point, and arrives at queen. Cosine similarity then finds the vocabulary word nearest to that point.</figcaption>
</figure>

To answer "king is to man as woman is to ?", the system computes `king - man + woman` and returns the word with the highest cosine similarity to the result. The arithmetic works because `king − man` and `queen − woman` are near-equal vectors: both encode the same relation between the pairs, and the relation appears as a direction in the space.

The result is approximate. Single clean relations work: *walking* to *walked* sits close to *swimming* to *swam*, and gender, tense and number pairs all behave this way. Anything requiring two relations at once, or abstraction over the vocabulary, degrades. Analogy accuracy measures a property of the vector space. It does not measure a reasoning ability.

### 3.2 GloVe

GloVe (Pennington et al., 2014) builds the global word-word co-occurrence matrix from the corpus in one counting pass, then factorizes it directly. The objective weights each cell by the logarithm of its count: pairs that co-occur often dominate the loss, and rare pairs still count but far less. Accuracy on word similarity and analogy tasks matches word2vec. The advantage is transparency: the training matrix is a table you can inspect, which made GloVe a standard tool for linguistic analysis.

### 3.3 fastText

fastText (Bojanowski et al., 2017) keeps the word2vec objective but changes what a word is. Each word is represented as the sum of its character n-grams plus the word itself. For *airport*, the n-grams include sequences such as "air", "irp", "rpo", "por", "ort" (typical lengths 3 to 6), each with its own vector, shared across every word containing that sequence.

The consequence: a word never seen in training can still be composed from n-grams that were. *Reconfirm* receives a useful vector even if the exact token never occurred, because "confirm" and the affixes around it did. This helps languages where words change form frequently (a verb takes a dozen suffixes), and it handles typos at inference time. The cost is a larger model: every token now touches several stored vectors instead of one.

### 3.4 What static embeddings cannot do

One vector per vocabulary item means one vector per word type, in every context. *Bank* in "river bank" and *bank* in "bank account" share a single vector, and no amount of training data separates them, because the lookup table has one slot for the token. The limit runs the other way too: the meaning of a word in a sentence depends on the rest of the sentence, and a static vector cannot receive that information because it is computed once, before any sentence is read.

Static embeddings still appear as cheap baselines, as features for small classifiers, and as subword machinery inside larger systems. Retrieval and memory systems use contextual encoders instead, covered in section 5.

| Method | Learns from | New words at inference | Main cost |
|---|---|---|---|
| word2vec | prediction within sliding windows | no; one vector per known token | a training run over the corpus |
| GloVe | global co-occurrence counts | no; one vector per known token | counting pass plus factorization |
| fastText | prediction over character n-grams | yes; composed from known n-grams | larger model, slower training |

## 4. Measuring similarity

Once every item has a vector, comparison is arithmetic. Three measures dominate, and they are not interchangeable.

**Dot product.** Multiply terms position by position and sum: for `a = [1, 2]` and `b = [3, 4]`, `a · b = 1×3 + 2×4 = 11`. The dot product mixes direction and length in one number.

**Cosine similarity.** The dot product divided by the product of the two magnitudes: `cos(a, b) = a · b / (‖a‖ × ‖b‖)`. The magnitude of a vector is the square root of the sum of its squared terms, so `‖a‖ = √5 ≈ 2.24` and `‖b‖ = 5`, and the cosine of the pair above is `11 / (2.24 × 5) ≈ 0.98`. Cosine reports direction only: 1 for identical directions, 0 for a right angle, −1 for opposite directions.

**Euclidean distance.** Straight-line distance. In high dimensions the distances between random pairs of points concentrate: they cluster into a narrow band, so the gap between a true neighbor and a random point shrinks relative to the spread. This weakens nearest-neighbor structure for raw Euclidean comparison.

<figure class="anim" data-anim="cosine">
  <div class="anim-stage"></div>
  <figcaption>One vector fixed, the other rotating. Cosine similarity reads 1 for identical directions, 0 for a right angle, −1 for opposite directions. The bar tracks the value from −1 to +1.</figcaption>
</figure>

Why text retrieval defaults to cosine (or to dot product after normalization):

**Normalization** rescales a vector to length 1: divide each term by the magnitude. Once both vectors have unit length, their dot product equals their cosine similarity, because the denominator in the formula is 1 × 1. Systems therefore normalize each vector once when it enters the index, and every subsequent comparison is a plain dot product, which is cheaper than computing magnitudes each time.

Vector length in trained models reflects how often the model encountered the pattern and how long the input was, rather than what the text means. Cosine discards that component by construction.

One warning that appears in every evaluation cycle: a similarity value is only meaningful relative to other values from the same model on the same data. An absolute cosine of 0.8 has no interpretation without the distribution behind it, because models spread their similarity scores differently. Thresholds do not transfer between models.

## 5. Contextual embeddings

The fix for static embeddings came from models that read the whole input before producing any vector. The vector for a token becomes a function of the entire sentence, computed fresh each time the sentence is encoded.

**ELMo** (Peters et al., 2018) built vectors from a pretrained **bidirectional LSTM** (a recurrent network that processes the sequence left to right and right to left simultaneously). The model is trained to predict the next and previous word, and the vectors handed downstream are learned combinations of internal states from several layers. Analysis showed the split that guided later work: lower layers carry syntax, higher layers carry meaning.

**BERT** (Devlin et al., 2019) replaced recurrence with stacks of self-attention and pretrained with masked language modeling: hide 15% of the tokens and predict each hidden token from both the words before it and the words after it, which a left-to-right language model cannot do. Because every layer exchanges information between all positions, each output vector has been shaped by the whole input.

BERT base specifications, since these numbers recur later: 12 layers, 768 hidden values per token, 12 attention heads per layer, about 110 million parameters, and a maximum input of 512 tokens.

<div class="img-scroll">
<img src="/blog/embeddings/bert-pretraining-finetuning.png" alt="BERT pre-training and fine-tuning: left, a stack of BERT layers trained with masked language modeling and next-sentence prediction on unlabeled sentence pairs; right, the same stack copied for each task and fine-tuned with a small output head for entailment, named entity recognition and question answering" />
</div>

*Figure 1 from Devlin et al. (2019), [CC BY 4.0](https://aclanthology.org/N19-1423/). Left: pre-training on unlabeled text with two objectives, masked language modeling and next-sentence prediction. Right: fine-tuning, where the trained stack is copied per task and a small output layer is trained on labeled data for classification or span prediction. Most parameters are reused across both halves.*

**Fine-tuning**, as the figure's right half shows, means continuing training on a task-specific dataset: start from the pretrained stack, add a small output layer, update the weights on labeled examples. Most of the network carries over from pre-training, which is why a model pretrained once serves many tasks.

<figure class="anim" data-anim="context">
  <div class="anim-stage"></div>
  <figcaption>The token "bank" in two sentences, projected into a shared 2D space. Its vector moves to the cluster that matches the sentence. A static embedding places it in one fixed position for both.</figcaption>
</figure>

The figure is the whole motivation: same token, different vector, decided by context. Section 6 covers how BERT output becomes one vector per sentence; the rest of this section covers the mechanism that mixes the context.

### How context gets mixed: self-attention

Self-attention lets each token collect information from every other token, weighted by relevance. Each token produces three vectors: a **query** (what this position is looking for), a **key** (what this position offers for matching), and a **value** (what this position contributes if selected). Each query is compared against every key with a dot product, and **softmax** converts the resulting scores into weights: positive numbers that sum to 1 across all positions (softmax exponentiates each score and divides by the sum of all exponentials, so higher scores take larger shares). The token's updated vector is the weighted sum of the values, using those weights.

Two structural details from the BERT numbers above: 12 heads run this computation in parallel per layer, each with its own query, key and value projections, so a single position can track a dozen different relations at once (768 hidden values split across 12 heads gives 64 per head). And 12 layers stack on top: early layers handle proximity and syntax, later layers handle reference and meaning.

<div class="img-scroll">
<img src="/blog/embeddings/transformer-architecture.png" alt="The transformer architecture: the encoder stack on the left with multi-headed self-attention, feed-forward networks, normalization and residual connections repeated Nx times; the decoder stack on the right adding masked multi-headed self-attention and cross-attention over the encoder output" />
</div>

*Diagram by dvgodoy, Wikimedia Commons, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The full transformer: input embeddings plus positional encoding enter at the bottom, the encoder (left) applies self-attention and a feed-forward block per layer with normalization and residual additions (the circled pluses), and the decoder (right) adds masked self-attention and cross-attention over the encoder output. BERT uses only the encoder column, repeated 12 times. Generative models add the decoder column.*

The figure shows where attention sits in the block diagram: attention mixes information across positions, the feed-forward network processes each position independently, residual additions and normalization keep the signal flowing through a deep stack, and positional encoding injects word order (attention itself treats input as an unordered set).

<figure class="anim" data-anim="attention">
  <div class="anim-stage"></div>
  <figcaption>Attention arcs from one query token to every token in the sentence; arc thickness is the weight. The pronoun "it" puts most weight on "cat", its antecedent, and some weight on the second "it". The weights here are illustrative; probing studies of trained models recover the same pattern.</figcaption>
</figure>

The output of the final layer, one vector per input token, is what every downstream stage consumes.

## 6. From token vectors to one sentence vector

Retrieval, clustering and deduplication compare documents, and documents are longer than tokens. The reduction step is **pooling**: combine the per-token vectors into one vector for the whole input.

<figure class="anim" data-anim="pooling">
  <div class="anim-stage"></div>
  <figcaption>Each token contributes one dimension of its vector, drawn as a bar. Mean pooling averages them into a single sentence vector, drawn at the bottom.</figcaption>
</figure>

The options: **mean pooling** averages all token vectors (a robust default that needs no training signal to be useful), **max pooling** keeps the largest value per dimension, or the vector of a special marker token prepended to the input (BERT's `[CLS]`). The marker variant only works if training taught that position to summarize the input; mean pooling works without that step.

### One vector per text versus one score per pair

Two architectures produce similarity scores, and their cost structures differ by orders of magnitude.

**Cross-encoder**: feed the query and one candidate together through the model, read off one score. Accurate, because the query and candidate interact inside every layer. The cost: scoring one query against 1,000 candidates is 1,000 full forward passes, and every new query repeats all 1,000. The Sentence-BERT paper quantifies the extreme case: finding the most similar pair in a collection of 10,000 sentences requires about 50 million pair computations, roughly 65 hours with BERT.

**Bi-encoder**: encode the query and each candidate separately into vectors, then compare with dot products. Every text is encoded once, ever. The same 10,000-sentence workload drops to about 5 seconds of comparison after encoding, because a dot product is a few hundred multiplications instead of a forward pass. The gap between the two architectures is a training problem: a bi-encoder never sees the query and candidate together, so it must be trained to place related texts near each other.

Sentence-BERT (Reimers & Gurevych, 2019) closed that gap by fine-tuning a siamese BERT: two shared-weight encoders, pooling on each output, and a loss over sentence pairs.

<div class="img-scroll">
<img src="/blog/embeddings/sbert-siamese.png" alt="Sentence-BERT architecture: two BERT encoders with pooling produce u and v, compared either by concatenation with a softmax classifier or by cosine similarity" />
</div>

*Figure 1 from Reimers and Gurevych (2019), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Left: training, where the pair (u, v, |u−v|) is fed to a classifier over the three natural language inference labels. Right: inference, where cosine similarity between the pooled encodings gives a score in the −1 to 1 range. Both sentences pass through the same weights, so each encoding is computed independently and cached.*

That design is what every embedding API implements today: encode once per text, store the vector, compare with a dot product from then on.

### Training with contrastive losses

A **positive** is a pair of texts that should match; a **negative** is a pair that should not. Contrastive training raises the similarity of positives and lowers the similarity of negatives. Three variants:

- **Contrastive loss**: one positive pair and one negative pair per step, with a margin separating their similarities.
- **Triplet loss**: an anchor, a positive and a negative; the loss requires the anchor-positive similarity to exceed the anchor-negative similarity by a fixed margin.
- **Multiple negatives ranking loss**: take a batch of B pairs and compute the B × B similarity matrix. The diagonal holds the positives; the B − 1 off-diagonal entries in each row are negatives supplied by the batch itself. A batch of 64 pairs therefore yields 63 negatives per anchor with no additional labeling, which is why this loss dominates current sentence embedding training.

<div class="img-scroll">
<img src="/blog/embeddings/simcse-contrastive.png" alt="SimCSE training setups: left, the unsupervised variant encodes the same sentence twice with different dropout masks and pulls the two outputs together; right, the supervised variant uses entailment pairs from natural language inference as positives and contradiction pairs as hard negatives" />
</div>

*Figure 1 from Gao et al. (2021), [CC BY 4.0](https://aclanthology.org/2021.emnlp-main.552/). Left: unsupervised SimCSE encodes the same sentence twice under different dropout masks (dropout randomly zeroes activations during training; here it stays active during encoding to create two variants) and treats the two outputs as a positive pair, with other batch sentences as negatives. Right: supervised SimCSE uses natural language inference labels: entailment pairs are positives, contradiction pairs are hard negatives. Solid arrows are positive instances, dashed arrows negatives.*

The SimCSE figure illustrates the two ends of the spectrum. On the left, the positive pair comes from dropout noise: no labeled data at all, and the paper reports it performs on par with earlier supervised methods. On the right, labeled entailment and contradiction pairs supply positives and negatives directly.

**Hard negatives** decide the quality of the trained space. Random negatives from a corpus usually belong to different topics, and separating them teaches the model topic discrimination only. A negative that shares the topic but differs on the decisive detail (same product line, wrong model number; same event, wrong date) forces the model to use the features retrieval actually depends on. Selecting these examples is most of the engineering in retriever training.

**Instruction prefixes** are a simpler variant now standard in embedding APIs: prepend a short marker to the text before encoding, for example E5's `query: ` and `passage: ` prefixes. Training teaches the model different behaviors per prefix, and inference must use the same prefixes the model was trained with.

## 7. Practical properties of embedding vectors

| Model | Dimensions | Input limit | Notes |
|---|---|---|---|
| all-MiniLM-L6-v2 | 384 | 256 wordpieces | distilled, fast, common default |
| all-mpnet-base-v2 | 768 | 384 wordpieces | stronger and slower |
| e5-large-v2 | 1024 | 512 tokens | expects `query: ` / `passage: ` prefixes |
| text-embedding-3-small | 1536, reducible to 512 or 256 | 8191 tokens | API model |
| text-embedding-3-large | 3072, reducible to 1024, 512 or 256 | 8191 tokens | API model |

A **wordpiece** is a subword unit produced by the tokenizer; a word like *airport* may split into two pieces. The limits column is what the encoder truncates at, covered below.

**Dimension.** Smaller vectors cut index memory and speed up search; the accuracy cost depends on the model, so measure it rather than assume it. Matryoshka representation training (Kusupati et al., 2022) makes dimensions interchangeable: the model is trained so its first k outputs remain a good embedding at any trained size k, and the API models in the table expose this as a dimensions parameter. Reducing a 3072-dimensional model to 256 dimensions cuts storage by 12×, with a quality loss you measure on your own evaluation data.

**Normalization.** Unit-normalize when the vector enters the index if you intend to compare with cosine, then compare with dot product (they are equal for unit vectors). Two failure patterns to check for in review: vectors normalized in one service but not another, and vectors from a model that already normalizes normalized again (double normalization is harmless; mixing normalized and raw vectors is not). Neither raises an error; the similarity values are just wrong by a bounded amount.

**Chunking.** A vector summarizes everything the encoder saw, up to its input limit. BERT's 512 tokens cover roughly 350 to 400 English words, so a 2,000-word document exceeds the limit by about 5× and the model reads only the first fifth unless you split the text first. Splitting into chunks of 200 to 500 tokens before encoding keeps each vector about one topic: a query about paragraph five competes against a vector that actually contains paragraph five. Optional overlap (50 tokens or so) puts content that spans a boundary into at least one chunk in full. Chunk size is a retrieval quality parameter: smaller chunks match queries more precisely and grow the index; larger chunks carry more context and average several topics together.

**Consistency across runs and versions.** Inference is deterministic: the same text at the same truncation length gives the same vector. The same text at a different truncation length does not. And every encoder upgrade changes all vectors at once, which invalidates similarity values computed across versions: scores from model A and model B in one index do not compare. Upgrades require re-encoding the corpus, and the cost scales with corpus size, so the index should record which model and version produced its vectors.

## 8. What the index does with them

An **index** is the data structure that stores vectors and answers "which vectors are nearest to this query vector?".

**Brute force** compares the query against all N stored vectors: for 1 million vectors of 768 dimensions that is 768 million multiply-adds per query, a matrix multiplication modern hardware completes within tens of milliseconds. Acceptable into the low millions of vectors, or at low query rates.

**Approximate nearest neighbor (ANN)** search returns vectors close to the true nearest ones without guaranteeing exactness, trading a measurable amount of recall for latency. The dominant approach is graph-based. HNSW (Malkov and Yashunin, 2018) connects each vector to its near neighbors in a multi-layer graph: search walks greedily from an entry point, descending through layers that hold fewer, longer-range links, and reaches the neighborhood in O(log N) steps instead of scanning. The costs are memory (every vector stores graph links on top of its values) and build time.

**Quantization** compresses stored vectors: binary codes store 1 bit per dimension, so 768 dimensions occupy 96 bytes instead of the 3,072 bytes of 32-bit floats, a 32× reduction; product quantization splits each vector into blocks and replaces each block with a short codebook index. Both trade recall for RAM and are tunable per workload.

Libraries such as FAISS (Johnson et al., 2017) implement these indexes for CPU and GPU. The index layer depends only on the vectors themselves: any encoder that yields comparable vectors can be indexed.

Two rules hold across every implementation. First, vectors are comparable only within one model and version, so the index stores that identity alongside the vectors. Second, metadata filters (tenant, date, permission) interact with graph search: a filter applied after candidate generation can leave fewer than k results or none, because the filtered-out vectors were used to navigate. The usual answers are to over-fetch (request more than k candidates, then filter) or to fall back to brute force over the filtered subset; the choice trades correctness for speed explicitly.

## 9. Evaluation

**Intrinsic evaluation** measures the vector space directly: analogy accuracy, or correlation between word similarity scores and human judgments. Cheap to run, narrow in what it tells you, and largely retired with static embeddings.

**Extrinsic evaluation** measures a downstream task: retrieval quality, classification accuracy, clustering scores. Slower, and what deployment decisions should rest on.

For retrieval, three metrics cover most reports, each with a worked example:

| Metric | What it reports | Worked example |
|---|---|---|
| recall@k | share of queries with a relevant item in the top k results | 63 of 100 queries have a relevant item in the top 10 → 0.63 |
| MRR | position of the first relevant result, as 1/rank, averaged over queries | first relevant item at rank 3 → 1/3 ≈ 0.33 |
| nDCG@k | whether the top ranks are ordered by relevance, compared per query with the ideal ordering | relevant items at ranks 1 and 3 score higher than at ranks 2 and 8, even with the same set retrieved |

recall@k describes the retriever before any downstream component sees the results. MRR punishes a relevant item buried at rank 10 more sharply than recall does, because it scores only the first hit. nDCG handles queries with different numbers of relevant items by normalizing each query against its own ideal ranking, which makes scores comparable across queries.

Two standard benchmarks:

- **MTEB** (Muennighoff et al., 2023): 56 datasets spanning retrieval, clustering, classification, similarity and related tasks, with per-task scores behind one aggregate. Read the task breakdown: an aggregate score hides a model that is strong on retrieval and weak on clustering. Small gaps between adjacent leaderboard entries are within noise; they do not survive changes of pooling or test set.
- **BEIR** (Thakur et al., 2021): 18 zero-shot retrieval datasets built to test generalization. Models tuned on web-style text lose ground on scientific, legal and biomedical corpora, so in-domain evaluation replaces leaderboard position for specialized domains.

Two procedural rules for your own work. Keep a held-out test set that never appears in training or development, so the number you report reflects data the model did not see. And account for contamination: embedding models trained on large web corpora have absorbed text from public benchmarks, which inflates benchmark scores relative to what you observe in production. A few hundred labeled query-document pairs from your own domain give a more trustworthy number than a leaderboard position.

## 10. Failure modes

**Negation and quantifiers.** "The treatment worked" and "The treatment did not work" differ by one token, and the surrounding context is nearly identical, so embedding models often place the pair close together. The same applies to "every patient recovered" versus "some patients recovered". Systems that answer yes/no questions from retrieved passages inherit this as a wrong-polarity risk. When the decision depends on polarity, cosine similarity cannot make the decision; a model that reads the passage must.

**Domain shift.** A model trained on web text measures web-text similarity. Legal, medical and code corpora define similarity differently, and an out-of-domain encoder returns fluent results with the wrong neighbors and no error signal. Benchmark on your domain before trusting general numbers.

**Similarity is not entailment.** High cosine means the vectors point in the same direction, which usually means the texts are topically related. It says nothing about whether one statement implies the other, contradicts it, or is more specific. A nearest passage can share the topic and contradict the fact being verified. Treat retrieval relevance and textual entailment as separate judgments: the first is a vector comparison, the second requires reading the text.

**Length effects.** Input above the model's limit is truncated without warning: text past the cutoff contributes nothing, and nothing in the API response reports it (count tokens when this matters). Very short inputs produce vectors with higher variance. Chunking policies and minimum-length policies handle both; the model itself does not change.

**Staleness.** Facts change, products are renamed, entities appear and disappear. An index built months ago encodes the text distribution as it was, and drift cannot be detected from inside the index. Re-encoding schedules (regenerate vectors after corpus changes, and after model upgrades) belong with the other database maintenance tasks.

## 11. Where this connects

The retrieval tutorial in this blog continues from where this article ends: hybrid search that combines these vectors with lexical retrieval, query rewriting, reranking, and pipeline evaluation. The memory series covers the step before retrieval: how a system decides what to store in the first place. This article is the representation layer both depend on.

A concrete practice sequence that exercises every section above:

1. Encode a small corpus (a few thousand documents) with an open-source sentence encoder.
2. Label about 100 query-document pairs from that corpus as relevant or not.
3. Search by cosine similarity and measure recall@10 against your labels.
4. Change one thing at a time and record the metric: skip normalization for half the vectors, chunk at 5,000 tokens instead of 400, mix vectors from two model versions in one index.
5. Read which change moved recall@10, and by how much.

Each controlled change reproduces one failure mode from section 10 with numbers you measured yourself.

## Reading list

**Foundations**

1. Firth, J. R. (1957). *A Synopsis of Linguistic Theory.* (the distributional hypothesis in one sentence)
2. Harris, Z. S. (1954). *Distributional Structure.* Word, 10(2-3), 146-162.
3. Mikolov, T. et al. (2013). *Efficient Estimation of Word Representations in Vector Space.* https://arxiv.org/abs/1301.3781 (skip-gram and CBOW)
4. Mikolov, T. et al. (2013). *Distributed Representations of Words and Phrases and their Compositionality.* https://arxiv.org/abs/1310.4546 (negative sampling, subsampling, analogy arithmetic)
5. Pennington, J. et al. (2014). *GloVe: Global Vectors for Word Representation.* https://aclanthology.org/D14-1162/
6. Bojanowski, P. et al. (2017). *Enriching Word Vectors with Subword Information.* https://arxiv.org/abs/1607.01759 (fastText)

**Contextual encoders**

7. Peters, M. et al. (2018). *Deep Contextualized Word Representations.* https://arxiv.org/abs/1802.05365 (ELMo)
8. Devlin, J. et al. (2019). *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding.* https://aclanthology.org/N19-1423/ (figure 1 reproduced above)
9. Vaswani, A. et al. (2017). *Attention Is All You Need.* https://arxiv.org/abs/1706.03762 (the transformer; read sections 3.2 to 3.3 with section 5 of this article open)

**Sentence embeddings and retrieval**

10. Reimers, N. and Gurevych, I. (2019). *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks.* https://arxiv.org/abs/1908.10084 (65 hours to 5 seconds; figure reproduced above)
11. Gao, T. et al. (2021). *SimCSE: Simple Contrastive Learning of Sentence Embeddings.* https://aclanthology.org/2021.emnlp-main.552/ (dropout as free augmentation; 76.3 and 81.6 Spearman average for the unsupervised and supervised variants; figure reproduced above)
12. Wang, L. et al. (2022). *Text Embeddings by Weakly-Supervised Contrastive Pre-training.* https://arxiv.org/abs/2212.03533 (E5; the `query: ` / `passage: ` prefixes)
13. Karpukhin, V. et al. (2020). *Dense Passage Retrieval for Open-Domain Question Answering.* https://arxiv.org/abs/2004.04906 (dual encoders for retrieval)
14. Khattab, O. and Zaharia, M. (2020). *ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT.* https://arxiv.org/abs/2004.12832 (the middle ground between bi- and cross-encoders)
15. Kusupati, A. et al. (2022). *Matryoshka Representation Learning.* https://arxiv.org/abs/2205.13147 (adjustable dimensions)

**Benchmarks, indexes and practice**

16. Thakur, N. et al. (2021). *BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models.* https://arxiv.org/abs/2104.08663
17. Muennighoff, N. et al. (2023). *MTEB: Massive Text Embedding Benchmark.* https://arxiv.org/abs/2210.07316
18. Malkov, Y. and Yashunin, D. (2018). *Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs.* https://arxiv.org/abs/1804.08237 (HNSW)
19. Johnson, J. et al. (2017). *Billion-scale Similarity Search with GPUs.* https://arxiv.org/abs/1702.08734 (FAISS)
20. Jurafsky, D. and Martin, J. H. *Speech and Language Processing.* https://web.stanford.edu/~jurafsky/slp3/ (draft, free; chapters 6 and 15 carry more derivations than any paper listed here)

---

Next in this series: tokenization and what subword models optimize, the step before embeddings that most tutorials skip.
