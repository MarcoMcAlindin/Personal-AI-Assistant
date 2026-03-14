---
description: Scans the frontend and backend environments for known vulnerabilities.
---

# Dependency Audit

1. **Python Security:** Navigate to `/backend`. Run `pip-audit` (or a similar Python-native vulnerability scanner) against the `requirements.txt` file.
2. **Frontend Security:** Navigate to `/web` and run `npm audit`. Repeat this in the `/mobile` directory.
3. If any High or Critical vulnerabilities are found, halt the workflow immediately and generate a `Security_Threat_Report.md` Artifact detailing the exposed packages and recommended upgrade paths.
4. If the audit is clean, print: "Security audit passed. Zero critical vulnerabilities."