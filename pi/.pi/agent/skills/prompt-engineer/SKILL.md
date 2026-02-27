---
name: prompt-engineer
description: Review, generate, optimize, and look up prompt engineering techniques for LLM systems.
---

# Prompt Engineer Skill

Systematic prompt engineering using established techniques. Four modes: review, generate, lookup, optimize.

## When to trigger

- User asks: "review this prompt", "critique my prompt", "what's wrong with this prompt"
- User asks: "write a prompt for", "generate a prompt", "prompt for X"
- User asks: "what technique", "how does CoT work", "explain ReAct"
- User asks: "optimize this prompt", "fix this prompt", "the model keeps doing X"
- User invokes `/prompt-engineer`

## Modes

Detect mode from context. If ambiguous, ask.

### Mode 1: Review (`/prompt-engineer review`)

Analyze an existing prompt for weaknesses and improvements.

**Process:**

1. Get the prompt (user pastes it, or read from file)
2. Identify the four elements present or missing:
   - **Instruction** -- specific task or command
   - **Context** -- background information, constraints, domain
   - **Input Data** -- the data to process
   - **Output Indicator** -- format, type, or structure of expected output
3. Evaluate against these criteria:

   **Structure:**
   - Is the instruction at the beginning, clearly separated?
   - Are delimiters used to separate instruction/context/input (###, ```, XML tags)?
   - Is the output format specified?

   **Specificity:**
   - Are instructions precise or vague? ("Write something about X" vs "Write a 2-paragraph summary of X for a technical audience")
   - Does it use "do" framing instead of "don't" framing?
   - Are constraints explicit (length, format, tone, audience)?

   **Technique gaps:**
   - Would few-shot examples improve consistency?
   - Would CoT improve reasoning? ("Let's think step by step")
   - Is the model asked to do too much in one pass? (needs prompt chaining)
   - Is external knowledge needed? (needs RAG or generated knowledge)
   - For tool-use prompts: are tool descriptions clear, with examples?

   **Small model considerations:**
   - For models under 8B: is the prompt too complex? Small models need simpler, more explicit instructions.
   - Are output rules repeated/reinforced? Small models forget rules mid-generation.
   - Are negative examples provided alongside positive? Small models follow "do X" better than "never do Y".

   **Adversarial robustness:**
   - Can user input override instructions? (prompt injection risk)
   - Are system/user boundaries clear?
   - Is the prompt leakable?

4. Output findings as prioritized list (P0-P3) with specific rewrites.

### Mode 2: Generate (`/prompt-engineer generate`)

Create a prompt from a task description.

**Process:**

1. Clarify: what model? what task? what input/output? what failure modes to avoid?
2. Select technique based on task type:

   | Task Type | Recommended Technique |
   |-----------|----------------------|
   | Simple classification/extraction | Zero-shot with output format |
   | Tasks needing consistent format | Few-shot (1-5 examples) |
   | Math, logic, multi-step reasoning | Chain-of-Thought or PAL |
   | Complex reasoning with exploration | Tree of Thoughts |
   | Knowledge-intensive QA | RAG or Generated Knowledge |
   | Multi-step with tools | ReAct (Thought/Action/Observation) |
   | Long complex workflows | Prompt Chaining (subtask pipeline) |
   | Tasks needing self-correction | Reflexion (actor/evaluator/reflect loop) |
   | Noisy reasoning tasks | Self-Consistency (sample k, majority vote) |

3. Build the prompt using this structure:
   ```
   [System context / role]
   [Constraints and rules]
   [Output format specification]
   [Few-shot examples if needed]
   [Input delimiter]
   [Input data]
   [Output delimiter / indicator]
   ```

4. For small models (under 8B):
   - Keep system prompt under 500 tokens
   - Use explicit section headers (## Rules, ## Output Format)
   - Repeat critical rules near the output indicator
   - Prefer positive instructions over prohibitions
   - Use structured output (JSON, markdown) over free-form

5. Output the complete prompt with annotations explaining technique choices.

### Mode 3: Lookup (`/prompt-engineer lookup <technique>`)

Explain a prompting technique with actionable pattern.

**Technique Reference:**

**Zero-Shot Prompting**
- What: Direct instruction with no examples. Relies on model's training.
- When: Simple tasks (classification, extraction, translation). Try first.
- Pattern: `[Instruction]\n[Input]\n[Output indicator]`

**Few-Shot Prompting**
- What: Provide 1-5 labeled demonstrations before the query.
- When: Zero-shot output format is inconsistent. Need to steer style/format.
- Pattern: `Example 1: [input] -> [output]\nExample 2: [input] -> [output]\n[query] ->`

**Chain-of-Thought (CoT)**
- What: Elicit intermediate reasoning steps before the final answer.
- When: Math, logic, multi-step reasoning. Model jumps to wrong conclusions.
- Pattern: Add "Let's think step by step." or show worked examples.

**Zero-Shot CoT**
- What: Append "Let's think step by step" without demonstrations.
- When: No examples available but reasoning is needed.
- Pattern: `[Question]\n\nLet's think step by step.`

**Self-Consistency**
- What: Sample k diverse reasoning paths, take majority vote on answer.
- When: Arithmetic, commonsense reasoning. Single CoT path may be wrong.
- Pattern: Generate 5-10 CoT outputs at temperature > 0, aggregate answers.

**Tree of Thoughts (ToT)**
- What: Explore reasoning as a tree with BFS/DFS and self-evaluation.
- When: Complex problems needing backtracking (puzzles, planning, math proofs).
- Pattern: Generate candidates, evaluate as sure/maybe/impossible, search.

**RAG (Retrieval-Augmented Generation)**
- What: Retrieve external documents, concatenate with prompt before generation.
- When: Factual QA, evolving knowledge, need to ground outputs.
- Pattern: `[Retrieved context]\n[Instruction]\n[Query]`

**ReAct (Reasoning + Acting)**
- What: Interleave reasoning traces with tool actions.
- When: Multi-step tasks needing external data (search, API calls, DB queries).
- Pattern: `Thought: [reasoning]\nAction: [tool call]\nObservation: [result]\n...repeat`

**Prompt Chaining**
- What: Pipeline subtasks, feeding each output as next input.
- When: Complex tasks with multiple transformations. Single prompt too complex.
- Pattern: `Prompt 1 -> Output 1 -> Prompt 2 (with Output 1) -> Final`

**PAL (Program-Aided Language)**
- What: LLM generates executable code as reasoning; run code for answer.
- When: Math, date calculation, logic where exact computation matters.
- Pattern: Prompt for Python code, execute, read result.

**Generated Knowledge**
- What: First generate relevant knowledge, then use it to answer.
- When: Commonsense reasoning, domain tasks where model lacks context.
- Pattern: Step 1: "Generate facts about X." Step 2: "Given these facts, answer Y."

**Reflexion**
- What: Agent generates attempt, evaluates it, reflects on mistakes, retries.
- When: Trial-and-error tasks (coding, decision-making, iterative improvement).
- Pattern: Act -> Evaluate -> Reflect (verbal feedback to memory) -> Retry.

**Active-Prompt**
- What: Identify high-uncertainty examples, get human annotations, use as exemplars.
- When: Need task-specific few-shot examples but unsure which ones help most.
- Pattern: Sample k outputs -> measure disagreement -> annotate uncertain cases.

**APE (Automatic Prompt Engineer)**
- What: LLM generates and evaluates instruction candidates; select best performer.
- When: Optimizing prompts at scale. Manual iteration too slow.
- Pattern: Generate N instructions -> score each -> select top performer.

**ART (Automatic Reasoning and Tool-use)**
- What: Auto-select reasoning and tool-use demonstrations from a library.
- When: New tasks needing tool integration without manual prompt engineering.
- Pattern: Retrieve relevant demos -> interleave generation with tool calls.

**Meta Prompting**
- What: Use abstract structural templates instead of specific content examples.
- When: Token-efficient prompting. Structure matters more than content.
- Pattern: Show structural skeleton, not filled-in examples.

**Directional Stimulus Prompting (DSP)**
- What: Small policy model generates hints to steer a larger frozen model.
- When: Fine-grained control of black-box LLM behavior. Requires training budget.
- Pattern: Policy LM hint -> main LLM generation guided by hint.

**Multimodal CoT**
- What: Combine text and vision inputs for two-stage reasoning.
- When: Tasks requiring both text and image understanding.
- Pattern: Stage 1: generate rationale from text+image. Stage 2: answer from rationale.

### Mode 4: Optimize (`/prompt-engineer optimize`)

Fix a prompt based on observed failure mode.

**Process:**

1. Get the prompt and the failure description (what the model does wrong)
2. Diagnose using this failure-to-technique map:

   | Failure Mode | Likely Cause | Fix |
   |-------------|-------------|-----|
   | Model hallucinates facts | No grounding, no constraints | Add "Only state facts present in [context]." Add RAG. |
   | Model ignores instructions | Instructions buried, too many rules | Move instructions to top. Use delimiters. Reduce rule count. |
   | Output format inconsistent | No format spec, no examples | Add output indicator. Add 1-2 few-shot examples. |
   | Model can't reason through problem | No reasoning elicitation | Add CoT ("Let's think step by step") or few-shot with worked examples. |
   | Model does too much / rambles | No length/scope constraints | Add explicit length ("2-3 sentences"), scope ("only X, not Y"). |
   | Model leaks internal data | System/user boundary unclear, raw IDs in context | Sanitize context before delivery. Reinforce output rules. |
   | Model answers "I don't know" when data exists | Context trimmed, budget too tight, data not reaching model | Check context pipeline. Increase budget. Verify data delivery. |
   | Small model forgets rules mid-output | System prompt too long, rules only stated once | Shorten prompt. Repeat critical rules near output. Use structured output. |
   | Model parrots input verbatim | No transformation instruction | Add explicit transformation: "Summarize", "Rewrite as", "Extract only". |
   | Tool use syntax wrong | Tool descriptions unclear | Add concrete tool call examples. Show expected input/output format. |
   | Model calls tools when it shouldn't | No "when to use tools" guidance | Add decision criteria: "Only call tools when [condition]. Otherwise answer from context." |

3. Apply fix. Show before/after with explanation of which technique was applied and why.

## Principles

These apply across all modes:

1. **Instruction first.** Place the task instruction at the top, separated from context.
2. **Be specific, not clever.** "Use 2-3 sentences to explain X to a high school student" beats "Keep it short and simple."
3. **Do, not don't.** "Respond with: Sorry, I can't help with that." beats "Don't answer questions about X."
4. **Delimiters matter.** Use ###, ```, XML tags, or markdown headers to separate sections.
5. **Output format is an instruction.** Always specify what the output should look like.
6. **Few-shot is format control.** Examples steer output structure more than instructions alone.
7. **Small models need repetition.** Repeat critical rules near the output point.
8. **Context is finite.** Every token in the prompt competes with output tokens. Be economical.
9. **Test adversarially.** Try inputs that break the prompt before shipping it.
10. **Iterate.** Prompts are code. Version them, test them, diff them.

## Tool access

allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - Bash

## Output method

1. For **review** and **optimize**: output findings inline (no file needed unless user asks).
2. For **generate**: output the complete prompt in a code block. If user asks, write to file.
3. For **lookup**: output the technique reference inline.
4. For all modes: if the prompt is for a specific project, read existing prompts/system prompts from codebase for context.
