import subprocess
import sys

# Configuration based on @Git_Architecture.md and @Team.md
AGENT_BRANCHES = {
    "white": "feature/white/01-database-foundation",  # Phase 1: Supabase & RLS [cite: 61, 142]
    "green": "feature/green/02-api-gateway-setup",   # Phase 1: FastAPI & Repos [cite: 62, 123]
    "blue": "feature/blue/03-frontend-scaffold",     # Phase 3: Web & Mobile setup [cite: 67, 113]
    "red": "feature/red/04-cloud-intelligence",      # Phase 2: vLLM & Actions [cite: 64, 132]
}

def run_git(args):
    """Helper to run git commands safely."""
    result = subprocess.run(['git'] + args, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  [!] Git Error: {result.stderr.strip()}")
        return False
    return True

def build_architecture():
    print("🚀 Initializing SuperCyan Git Architecture...\n")

    # 1. Create Staging from Main
    print("[+] Creating 'staging' branch...")
    run_git(['checkout', '-b', 'staging'])
    run_git(['push', '-u', 'origin', 'staging'])

    # 2. Create Agent Feature Branches
    for agent, branch_name in AGENT_BRANCHES.items():
        print(f"[+] Creating branch for Mr. {agent.capitalize()}: {branch_name}")
        
        # Always branch off staging for features
        run_git(['checkout', 'staging'])
        if run_git(['checkout', '-b', branch_name]):
            # Optional: Push to remote immediately
            # run_git(['push', '-u', 'origin', branch_name])
            pass

    # 3. Return to staging
    run_git(['checkout', 'staging'])
    print("\n✅ Success: All initial branches created.")
    print("Tip: Run 'git branch' to see your new structure.")

if __name__ == "__main__":
    build_architecture()