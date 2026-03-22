# Documentation Versioning Rule (Rule 32)

## 1. Creation Protocol
Every time a new document or artifact is created, it MUST include a creation date in the header or frontmatter.
Format: `Created: YYYY-MM-DD`

## 2. Modification Protocol
Every time an existing document is modified, a record of the change MUST be added. 
- **Method:** Use markdown comments or a "Changelog" section at the end of the document.
- **Required Info:**
  - Date of modification.
  - **What** was changed (specific sections/files).
  - **Why** the change was made (rationale/request).

## 3. Example
```markdown
<!-- 
Modified: 2026-03-22
What: Fixed double /v1 in Qwen URL in PRD Section 3.1
Why: User reported 404 errors in health analysis logs
-->
```

## 4. Scope
This applies to:
- PRD, GEMINI.md, and all core documentation.
- All `.agent/rules/` and `.agent/workflows/`.
- All ASSISTANT-generated artifacts (task.md, implementation_plan.md, etc.).
