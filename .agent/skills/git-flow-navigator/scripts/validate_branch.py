import subprocess
import re
import sys

def get_current_branch():
    """Fetches the current active Git branch."""
    result = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], capture_output=True, text=True)
    if result.returncode != 0:
        print("Error: Not inside a valid Git repository.")
        sys.exit(1)
    return result.stdout.strip()

def validate_branch_name(branch_name):
    """Validates the branch against the VibeOS naming convention."""
    if branch_name in ['main', 'staging']:
        print(f"Error: You are currently on the protected '{branch_name}' branch. Checkout a new branch immediately.")
        sys.exit(1)

    # Regex pattern: type/agent/number-description
    pattern = r"^(feature|fix|chore|hotfix)/(blue|green|red|white)/\d+-[a-z0-9-]+$"
    
    if not re.match(pattern, branch_name):
        print(f"Error: Branch name '{branch_name}' violates VibeOS architecture.")
        print("Required format: <type>/<agent>/<issue-number>-<short-description>")
        print("Example: feature/green/12-add-routes")
        sys.exit(1)
        
    print(f"Success: Branch '{branch_name}' is valid. You may proceed with pushing to remote.")
    sys.exit(0)

if __name__ == "__main__":
    current_branch = get_current_branch()
    validate_branch_name(current_branch)