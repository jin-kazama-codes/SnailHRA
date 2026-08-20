# Karpathy Guidelines (Coding Rules)

Behavioral guidelines to reduce common LLM coding mistakes, derived from Andrej Karpathy's observations.

## 1. Think Before Coding
- **Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask rather than guess.
- If multiple interpretations exist, present them.
- If a simpler approach exists, propose it.

## 2. Simplicity First
- **Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.

## 3. Surgical Changes
- **Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style.
- Clean up only the orphans/imports your own changes made unused.

## 4. Goal-Driven Execution
- **Define success criteria. Loop until verified.**
- Transform tasks into verifiable goals with tests and checks.
- For multi-step tasks, execute systematically and verify each step.
