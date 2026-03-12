import os
from pathlib import Path

# The core directory for Antigravity Workspace Skills
BASE_DIR = Path(".agent/skills")

# Dictionary containing the folder names, subdirectories, and SKILL.md content
SKILLS = {
    "python-feed-parser": {
        "subdirs": ["scripts"],
        "content": """---
name: python-feed-parser
description: Generates robust, uniform Python parsers for external RSS and API feeds.
---
# Python Feed Parser
## When to use this skill
- When parsing AI news RSS feeds or the Ticketmaster/Songkick APIs for Scottish metal concerts.
## How to use it
1. **Always Use Python:** When extracting or aggregating data from external sources, always use Python natively.
2. **Standardize Output:** Ensure the final parsed output is a clean, unified JSON structure.
3. **Error Handling:** Wrap all external API requests in `try/except` blocks.
"""
    },
    "rag-context-manager": {
        "subdirs": ["scripts"],
        "content": """---
name: rag-context-manager
description: Governs the complex RAG logic for the Qwen 3.5 AI memory.
---
# RAG Context Manager
## When to use this skill
- When configuring the prompt construction payload sent to the vLLM Cloud Run instance.
## How to use it
1. **10-Day Rolling Window:** Strictly enforce a timestamp filter that ignores any standard message older than 10 days.
2. **Permanent Save Override:** Your SQL query MUST include an `OR` condition. If `is_saved = TRUE`, that message must be retrieved.
"""
    },
    "health-connect-simulator": {
        "subdirs": ["examples"],
        "content": """---
name: health-connect-simulator
description: Solves the hardware limitation of testing Samsung Watch biometric syncing within the IDE.
---
# Health Connect Simulator
## When to use this skill
- When testing the "On-Open Sync" frontend logic in the `/mobile` React Native app.
## How to use it
1. **Mock Data Injection:** Import dummy JSON payloads representing the expected output of `react-native-health-connect`.
2. **State Simulation:** Force the React Native state to populate with the mock data upon component mount.
"""
    },
    "oled-theme-enforcer": {
        "subdirs": ["resources"],
        "content": """---
name: oled-theme-enforcer
description: Maintains absolute visual consistency between the Vite web dashboard and Expo mobile app.
---
# OLED Theme Enforcer
## When to use this skill
- When building any new screen, button, or layout in either `/web` or `/mobile`.
## How to use it
1. **Strict Dark Mode:** VibeOS does not have a light mode. Never use light hex codes (#FFFFFF).
2. **Color Palette:** Backgrounds must be deep blacks (#000000 to #0A0A0A). Surfaces must be slate grays.
"""
    },
    "supabase-rls-auditor": {
        "subdirs": ["examples"],
        "content": """---
name: supabase-rls-auditor
description: Guarantees that personal health data and tasks are never exposed via the public API.
---
# Supabase RLS Auditor
## When to use this skill
- After creating a new table or modifying existing schemas in the `/supabase` directory.
## How to use it
1. **Default Deny:** Ensure Row Level Security (RLS) is enabled on all tables by default.
2. **Owner-Only Access:** Write RLS policies that strictly compare `auth.uid()` to the `user_id` column.
"""
    },
    "vllm-deployment-optimizer": {
        "subdirs": ["resources"],
        "content": """---
name: vllm-deployment-optimizer
description: Maximizes Google Cloud Run efficiency and prevents idle GPU charges.
---
# vLLM Deployment Optimizer
## When to use this skill
- When updating the `Dockerfile` or `cloudbuild.yaml` for the AI inference container.
## How to use it
1. **Scale-to-Zero:** Strictly enforce the Cloud Run configuration `min-instances=0`. 
2. **Concurrency Limits:** Set appropriate concurrency limits based on allocated GPU memory to prevent OOM crashes.
"""
    },
    "glasgow-concert-parser": {
        "subdirs": ["scripts"],
        "content": """---
name: glasgow-concert-parser
description: Specialized logic for extracting and formatting Scottish metal and rock concert data.
---
# Glasgow Concert Parser
## When to use this skill
- When configuring the FastAPI routes to fetch live music events.
## How to use it
1. **Target Venues:** Focus specifically on parsing payloads for major Scottish venues (Barrowlands, O2 Academy, SWG3).
2. **Filtering:** Implement strict keyword filtering. Only return objects matching Metal, Heavy Metal, Rock, etc.
"""
    },
    "fastapi-cors-shield": {
        "subdirs": ["scripts"],
        "content": """---
name: fastapi-cors-shield
description: Strict CORS configuration for the FastAPI gateway.
---
# FastAPI CORS Shield
## When to use this skill
- When initializing the `FastAPI()` application instance in `main.py`.
## How to use it
1. **No Wildcards:** Never use `allow_origins=["*"]`. 
2. **Strict Allowed Origins:** Explicitly define the exact URLs of the Vite production build and Expo dev tunnels.
"""
    },
    "supabase-rollback-strategist": {
        "subdirs": ["examples"],
        "content": """---
name: supabase-rollback-strategist
description: Mandates the creation of 'Down' migrations for every 'Up' migration.
---
# Supabase Rollback Strategist
## When to use this skill
- When generating any `.sql` file in the `/supabase/migrations` directory.
## How to use it
1. **The Revert Plan:** For every `CREATE TABLE` or `ALTER TABLE`, you MUST write the exact inverse command (e.g., `DROP TABLE`).
2. **Data Preservation:** If dropping a column, ensure you write a temporary backup strategy.
"""
    },
    "self-healing-execution-loop": {
        "subdirs": ["scripts"],
        "content": """---
name: self-healing-execution-loop
description: Guidelines for autonomous error recovery and stack trace analysis.
---
# Self-Healing Execution Loop
## When to use this skill
- When a terminal command, test script, or build process fails.
## How to use it
1. **Analyze & Patch:** Read the error log carefully, formulate a hypothesis, and implement a code fix.
2. **Escalation Limit:** Attempt to self-heal up to 3 times before halting and generating a Bug Report Artifact.
"""
    }
}

def generate_skills():
    """Creates the skill directories, subdirectories, and populates the SKILL.md files."""
    print("Initializing Antigravity Skills Architecture...\n")
    
    # Create the base .agent/skills directory if it doesn't exist
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    
    for skill_name, data in SKILLS.items():
        skill_dir = BASE_DIR / skill_name
        skill_dir.mkdir(exist_ok=True)
        
        # Create subdirectories (scripts, examples, resources)
        for subdir in data.get("subdirs", []):
            (skill_dir / subdir).mkdir(exist_ok=True)
            
        # Write the SKILL.md file
        skill_file = skill_dir / "SKILL.md"
        with open(skill_file, "w", encoding="utf-8") as f:
            f.write(data["content"].strip() + "\n")
            
        print(f"  [+] Created skill: {skill_name}")
        
    print("\nSuccess: All skills successfully populated!")

if __name__ == "__main__":
    generate_skills()