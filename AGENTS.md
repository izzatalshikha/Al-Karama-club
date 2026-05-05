# AI Coding Agent Custom Instructions

## Strict Code Preservation & Avoidance of Accidental Deletions

1. **NEVER delete existing fields, UI elements, data attributes, or functionality** unless the user explicitly and clearly requests to remove them.
2. **Preserve Context & Surrounding Code**: When modifying a component, fixing a bug, or changing a style, strictly ensure that all children, properties, state variables, and secondary fields (such as International ID, Federal ID, National Number, etc.) remain intact exactly as they were. Do not skip or summarize code!
3. **Surgical Formatting**: Do not "summarize" or arbitrarily trim down code blocks during replacements. If you are replacing a section, the replaced section MUST include all the existing logical pieces, simply adding the new requested change.
4. **No Clean-ups unless requested**: Do not assume that variables or HTML elements are "unused" or "unnecessary". Keep all original code unless the task is explicitly a cleanup or refactor task requested by the user.
5. **Verify Before Overwriting**: Always verify that the `ReplacementContent` retains all functional logic and data bindings that were originally present in the `TargetContent`.

Following these rules is CRITICAL to prevent data loss, UI regressions, and collateral damage to the user's application during edits.
