---
title: "When to Remember"
description: "Agents that rewrite their memory after every task can get worse. What a recent paper found, and what it means for how I read the literature."
date: 2026-11-15
tags: ["memory", "agents", "consolidation", "skills"]
---

Most agent memory systems do the same thing after a task. They write down what they learned. A summary, an insight, a new skill, a workflow note. The assumption behind this is that a new entry either helps or does no harm. Zhang et al. (2026) name four systems built this way: CLIN, Agent Workflow Memory, Dynamic Cheatsheet and ACE. They write that such designs treat each consolidation step as "at worst neutral." I did not count how many systems follow this pattern, but four is enough to ask whether the assumption holds.

Their paper tests it. An LLM agent rewrites a text memory bank from its own trajectories, and the authors measure whether that memory still helps. At first it does. Then it stops. In ScienceWorld the success rate climbs for the first twenty steps or so and then falls, and on WebShop the distilled memory ends near the no-memory level while the raw trajectories stay well above it.

![Zhang et al. figure 1. Left: ScienceWorld success rises for about twenty steps, then falls. Right: on WebShop, distilled memory ends near the no-memory level while raw trajectories stay higher.](/blog/when-to-remember/zhang-fig1-utility-erosion.png)

*Figure 1 from Zhang et al. (2026), CC BY 4.0. Utility rises early and then erodes across memory sizes. On WebShop, raw trajectories (orange) stay above the distilled memory (purple).*

An obvious objection is that the agent stored bad experience. So the authors remove that excuse. On a 19-problem ARC-AGI slice, GPT-5.4 solves every problem without memory, and the memory manager receives the ground-truth solution at each step. Every input is correct. They then compare two schedules. In one, the agent consolidates the whole pool once. In the other, it updates memory after each problem. The first stays at 94.7 percent. The second falls to 73.7 percent after one refresh round and 52.6 percent after ten.

![Zhang et al. figure 2. Static consolidation stays at 94.7 percent. Streaming consolidation falls to 73.7 percent and then 52.6 percent.](/blog/when-to-remember/zhang-fig2-stream-collapse.png)

*Figure 2 from Zhang et al. (2026), CC BY 4.0. Same problems, same correct inputs. Consolidating once keeps accuracy near the ceiling. Updating after each problem lowers it to 52.6 percent by round 10.*

The experience was identical in both runs. Only the schedule changed, which places the fault in the consolidation step. A larger test points the same way. On 33 tasks the agent solves without memory, mean accuracy drops from 58.5 to 38.5 percent after ten epochs of consolidated memory, and 40 percent of those tasks are never solved in ten attempts. Stronger models behave similarly. In the paper's Table 3, GPT-5.5 scores 78.0 with no memory, peaks at 80.0 with memory, and ends at 68.0 after 400 steps.

The authors give three reasons. The agent sometimes groups episodes that share no structure and abstracts over the mixture. Even when the grouping is right, abstraction can remove the conditions under which a lesson applies, so it fires in the wrong place. And when the input stream is narrow, the abstraction fits the cases it has seen and little else. Each rewrite starts from the lossy version left by the last one, so the losses add up.

The same paper tests a remedy. The agent keeps a buffer of raw episodes and chooses at each step to retain one, delete one or consolidate. A control forces consolidation every round. With GPT-5.4 the best gated setting reaches 43.2 percent. Forced consolidation reaches 35.0 and no memory reaches 35.5. The authors advise treating raw episodes as primary evidence and gating consolidation. They also say this cannot be the final answer, because raw histories grow without bound and cannot be reused across tasks. Compression needs abstraction eventually. The open problem is how to abstract without overwriting the evidence. I should add that the results come from a small set of benchmarks, with ARC-AGI Stream as the controlled case, so I do not know how far they carry to web or software agents.

![Zhang et al. figure 5. On ARC-AGI Stream, the agent that chooses to keep raw episodes reaches 43.2 percent with GPT-5.4, against 35.0 for forced consolidation and 35.5 for no memory.](/blog/when-to-remember/zhang-fig5-episodic-buffer.png)

*Figure 5 from Zhang et al. (2026), CC BY 4.0. An agent that may keep raw episodes (orange) matches or beats forced abstraction (purple dotted) and no memory (grey dashed) on both backbones.*

Other work gates in different ways. Nemori (Ma et al., 2026) turns interactions into narrative episodes and then keeps only what existing knowledge fails to predict. That is a rule for what deserves to be remembered. I have not checked how it behaves when the memory is updated many times. In the skills literature, Li (2026) audits 124 papers on evolving skill libraries and finds that admission, the check a skill passes before entering the library, comes up again and again. He also reports that retrieval from a flat library degrades as the library grows, citing one study with a sharp decline beyond roughly 64 to 128 skills. So that field already asks when to keep something.

![Nemori framework diagram: episodic memory integration on top, semantic distillation by prediction error below.](/blog/when-to-remember/nemori-framework.png)

*Figure 1 from Ma et al. (2026), CC BY 4.0. Two modules. The second keeps what the first cannot predict.*

Accuracy is also not the only cost. Zhan et al. (2026) look at what consolidation does to the source of a claim. A note from an authorized user and a note from an unverified third party can merge into one memory that no longer says who said what. In their benchmark this happened in 48 of 49 combinations of consolidator and model. Without authority labels, such memories led to unauthorized actions 50.3 percent of the time in a controlled test. With predicted labels stored, the rate fell from 16.9 to 0.0 percent end to end. I have read only the abstract and introduction of this paper, so I report these numbers as theirs.

All of this changes how I read the literature. Surveys of skills and memory mostly follow the lifecycle of an entry: how it is represented, acquired, retrieved and updated. I would rather follow the decisions. When should an agent turn experience into a rule? What should a rule pass before it is kept? What should be forgotten, and when? And what should a memory system be compared against? The last question gets the least attention. A fair test needs a raw-episode baseline and an always-on baseline, with cost and store size reported next to success. Zhang et al. show why. Without a raw-episode baseline, a memory that makes the agent worse can still beat an agent with no memory at all.

Memory systems and skill libraries face the same decision, so the survey I am planning will treat them together. I may be wrong about the gap. Li already covers triggers and admission for skill libraries. What I expect to add is the link to memory systems and the check on baselines, and the survey will show whether that holds.

---

**Sources**

1. Zhang, D., Lin, Y., Wu, Z., Sun, Y., Li, B., Li, D., Peng, H. (2026). *Useful Memories Become Faulty When Continuously Updated by LLMs.* [arXiv:2605.12978](https://arxiv.org/abs/2605.12978). CC BY 4.0.
2. Ma, W., Nan, J., Wu, W., Chen, Y. (2026). *What Deserves Memory: Adaptive Memory Distillation for LLM Agents (Nemori).* [arXiv:2508.03341](https://arxiv.org/abs/2508.03341). CC BY 4.0.
3. Li, Y. (2026). *Dynamic Agent Skills: A Lifecycle Survey and Taxonomy of Evolving Skill Libraries.* TMLR. [arXiv:2607.10113](https://arxiv.org/abs/2607.10113). CC BY 4.0.
4. Zhan, Q., Zhang, R., Guo, S., Zhao, L., Liu, Z. (2026). *When Memory Becomes Authority: Benchmarking Authority Collapse at the Memory Consolidation Boundary.* [arXiv:2608.01679](https://arxiv.org/abs/2608.01679).
