import os
import sys
import subprocess
import re

DOMAINS = {
    "WHITE": ["supabase/"],
    "GREEN": ["backend/"],
    "RED": [".github/workflows/", "vllm_deployment/"],
    "BLUE": ["web/", "mobile/"],
    "PINK": [".agent/rules/", ".agent/skills/", "docs/", ".agent/performance_log.md"]
}

def get_changed_files():
    try:
        # Check against staging or main depending on context
        result = subprocess.run(["git", "diff", "--name-only", "origin/staging...HEAD"], capture_output=True, text=True)
        if result.returncode != 0:
            # Fallback for local testing
            result = subprocess.run(["git", "diff", "--name-only", "HEAD"], capture_output=True, text=True)
        return result.stdout.splitlines()
    except Exception as e:
        print(f"Error getting changed files: {e}")
        return []

def get_agent_from_branch():
    try:
        branch = subprocess.check_output(["git", "branch", "--show-current"], text=True).strip()
        # feature/color/issue-desc
        match = re.match(r"feature/([^/]+)/", branch)
        if match:
            return match.group(1).upper()
    except:
        pass
    return None

def verify():
    changed_files = get_changed_files()
    agent = get_agent_from_branch()
    
    if not agent:
        print("Warning: Could not determine agent from branch. Skipping strict domain check.")
        return 0

    if agent not in DOMAINS:
        print(f"Agent {agent} not found in DOMAINS. Skipping.")
        return 0

    allowed_prefixes = DOMAINS[agent]
    violations = []

    for f in changed_files:
        is_allowed = False
        for prefix in allowed_prefixes:
            if f.startswith(prefix):
                is_allowed = True
                break
        
        # Exceptions for common files if any (e.g. .gitignore, task.md)
        if f in [".gitignore", "README.md"]:
            is_allowed = True
            
        if not is_allowed:
            violations.append(f)

    if violations:
        print(f"❌ DOMAIN VIOLATION: Agent {agent} is editing files outside their domain:")
        for v in violations:
            print(f"  - {v}")
        print("\nRule 1: You must NEVER edit files outside your assigned territory.")
        return 1

    print(f"✅ Domain check passed for agent {agent}.")
    return 0

if __name__ == "__main__":
    sys.exit(verify())
