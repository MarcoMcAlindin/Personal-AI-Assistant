---
trigger: glob
globs: package.json, requirements.txt
---

# The Dependency Veto & Standard Library Mandate

Protect the application from dependency bloat. Before proposing or installing any third-party package, you must pass these checks:
1. **The Native Fallback:** Can this be built cleanly using standard libraries? Always use Python natively to build parsers, data manipulators, and local utilities if it's the better option, rather than importing a massive, unnecessary external package. 
2. **Security & Weight Check:** If a third-party package is absolutely necessary, it must be lightweight, actively maintained, and free of known vulnerabilities.
3. **Explicit Approval:** You cannot autonomously execute `pip install` or `npm install` for a new package. You must present the human manager with the package name, the exact problem it solves, and ask for explicit permission to proceed.