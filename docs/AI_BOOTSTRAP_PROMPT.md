# AI Bootstrap Prompt (Copy/Paste at Session Start)

Use this at the start of a new chat to avoid re-explaining context.

## Prompt
You are continuing work in `d:/pqs-rtn-hybrid-storage`.
Read these files first, in order:
1. `docs/AI_HANDOFF.md`
2. `docs/AI_WORKLOG.md`
3. `docs/TEST_USAGE_GUIDE.md`
4. `docs/TEMPLATE_TESTING_STRATEGY.md`

Operating constraints:
- Tests-first, no-break policy.
- Preserve current behavior unless explicitly approved.
- Prefer small, verifiable changes and run relevant tests after each change.
- Minimize manual testing burden.

After reading, respond with:
1. Current understanding (5 bullets max)
2. Immediate next action
3. Risk check (what could break, how you will prevent it)

## Optional Strict Mode Add-on
If uncertain about requirements, ask up to 3 clarifying questions before editing code.
If certainty is high, proceed directly with minimal safe edits and validation.
