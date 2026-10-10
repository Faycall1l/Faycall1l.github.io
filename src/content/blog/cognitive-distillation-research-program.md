---
title: "Cognitive Distillation, or How to Teach an Agent to Remember"
description: "Asking how raw agent experience becomes executable schemas, one sandboxed experiment at a time."
date: 2026-08-06
tags: ["agents", "memory", "schemas"]
---

**Title:** Cognitive Distillation and Schema Formation for Autonomous AI Agents

*Topic originally proposed by Prof. Okba Tibermacine; the synthesis and commentary here are my own.*

This article states the problem, the proposed direction, and the criteria by which the direction should be judged.

## The problem

Recent LLM-based agents are genuinely impressive until you ask them to learn. They reason, plan, call tools, navigate the web, and interact with their environment. Then, on the next occurrence of the same task, they do all of it again, as if they had never seen the task before.

Strictly speaking they have seen it. Every observation, action, and outcome is dutifully appended to an interaction history. The agent does not learn from this history so much as reread it, because rereading is simpler than understanding. The approach produces three failure modes, each more expensive than the last:

- **Inefficiency.** Every decision requires processing an ever-growing backlog. The computational cost of "what should I do next" becomes proportional to "everything that has ever happened."
- **Fragility.** Matching is literal, not abstract. Change the color of a button, and the agent may no longer recognize the button, the task, or the surrounding workflow.
- **Information overload.** Memory saturates with redundant, noisy, and outdated entries. No mechanism distinguishes the valuable from the irrelevant, so both share a single, very large pile.

Human memory suggests the alternative: consolidation during rest, abstraction over episodes, and active forgetting of what no longer serves. The proposal below takes that architecture seriously and treats it as an engineering specification.

## The idea

We introduce **cognitive distillation**: the systematic transformation of raw experience into compact, executable *schemas*, reusable behavioral structures that function as the agent's mental playbook.

The project designs, implements, and formally analyzes agents that do this continuously: form schemas, consolidate them, maintain them, and, when necessary, forget them. The end state is a principled framework for autonomous expertise development, in which the agent improves at tasks as a consequence of having performed them.

## Core research question

> How can an autonomous AI agent dynamically compress its unstructured experiences into a structured and executable "mental playbook" that maximizes task success while minimizing computational cost?

This article does not answer that question. The question organizes everything below.

## Objectives

1. **Distillation Trigger Mechanism.** Detect when a collection of experiences has become stable and recurrent enough to justify abstraction. Distilling too early overfits noise; distilling too late wastes computation. The trigger must locate the point between the two.
2. **Self-Verifying Behavioral Sandbox.** An internal execution environment where candidate behavioral scripts are generated, tested, validated, and refined before being admitted to long-term memory. This amounts to admission control for the agent's own habits.
3. **Adaptive Pruning System.** Biologically inspired forgetting: obsolete, redundant, or ineffective schemas decay and are removed. The goal is memory that edits itself, since a store that only grows eventually serves nothing well.
4. **A Theory of Artificial Expertise.** A mathematical framework characterizing expertise as a function of task performance, adaptability, knowledge compactness, and computational efficiency, so that intuitions about expertise become testable statements.
5. **Stability and Convergence Proofs.** Formal guarantees that the resulting memory stays bounded, stable, and efficient over time, rather than growing without bound.

## Methodology

The work is organized into four sequential phases, each building on the previous one.

**Phase 1: Program Induction.** Transform raw interaction histories into compact, executable programs. The agent identifies recurring behavioral patterns and synthesizes reusable procedures from a dynamically evolving library of actions and abstractions. Generated programs are executed and validated in the sandbox before being promoted to memory, with correctness, safety, and effectiveness verified in that order.

**Phase 2: Schema Graph Construction.** Build a structured *Schema Graph*: nodes are abstract world states, beliefs, or preconditions; edges are verified executable programs that transform one state into another. This graph is the agent's long-term semantic memory, and it supports retrieval and reasoning without replaying full interaction histories.

**Phase 3: Active Forgetting and Knowledge Consolidation.** Inspired by synaptic pruning. Rarely used, overly complex, or poorly performing schemas decay; successful ones are reinforced through use and validation. In short, the agent forgets by design.

**Phase 4: Real-World Benchmarking.** Evaluate in open-ended environments requiring long-term planning and adaptation: WebArena for web navigation, Crafter for survival, chosen because both demand long-horizon planning under partial observability. Results are compared against retrieval-based memory systems and long-context agents.

## Expected contributions

- **A new memory paradigm for autonomous agents**, in which episodic experience becomes structured, executable knowledge.
- **Theoretical foundations for artificial expertise**, including formal definitions and quantitative measures that ground future lifelong-learning agents.
- **Algorithms for schema formation and maintenance**, covering induction, validation, consolidation, and forgetting.
- **Formal guarantees on memory evolution**, including stability, convergence, and resource-performance trade-offs.

## References

1. Anokhin, P., et al. (2024). *AriGraph: Learning Knowledge Graph World Models with Episodic Memory for LLM Agents.* arXiv:2407.04363. https://doi.org/10.48550/arxiv.2407.04363
2. Hu, Y., et al. (2025). *Memory in the Age of AI Agents.* arXiv:2512.13564. https://doi.org/10.48550/arxiv.2512.13564
3. Hatalis, K., et al. (2024). *Memory Matters: The Need to Improve Long-Term Memory in LLM-Agents.* AAAI Symposium Series. https://doi.org/10.1609/aaaiss.v2i1.27688
4. Du, P. (2026). *Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and Emerging Frontiers.*
5. Yang, C., et al. (2026). *Graph-based Agent Memory: Taxonomy, Techniques, and Applications.* arXiv:2602.05665. https://doi.org/10.48550/arxiv.2602.05665
6. Jia, S., et al. (2025). *PISA: A Pragmatic Psych-Inspired Unified Memory System for Enhanced AI Agency.* arXiv:2510.15966. https://doi.org/10.48550/arxiv.2510.15966
7. Xu, W., et al. (2025). *A-MEM: Agentic Memory for LLM Agents.* arXiv:2502.12110. https://doi.org/10.48550/arxiv.2502.12110
8. Abtahi, S. M., et al. (2026). *Memanto: Typed Semantic Memory with Information-Theoretic Retrieval for Long-Horizon Agents.*
9. Wei, L., et al. (2026). *FadeMem: Biologically-Inspired Forgetting for Efficient Agent Memory.* arXiv:2601.18642. https://doi.org/10.48550/arxiv.2601.18642
10. Zhang, Z., et al. (2025). *A Survey on the Memory Mechanism of Large Language Model based Agents.* ACM TOIS. https://doi.org/10.1145/3748302
