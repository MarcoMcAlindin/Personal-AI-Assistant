import os
import sys
import re

# Rule 21: [ISSUE-ID]_[AGENT]_[DOC-TYPE]_v[VERSION].md
# Note: Legacy files might need a grace period or manual fixed list
NAMING_PATTERN = re.compile(r"^VOS-\d+_[A-Z]+_(plan|handoff|audit)_v\d+\.md$")

TARGET_DIRS = [
    ".agent/handoffs",
    ".agent/implementation_plans"
]

def verify_naming():
    errors = []
    
    for root_dir in TARGET_DIRS:
        if not os.path.exists(root_dir):
            continue
            
        for root, dirs, files in os.walk(root_dir):
            for f in files:
                if not f.endswith(".md"):
                    continue
                
                # Check naming
                if not NAMING_PATTERN.match(f):
                    errors.append(os.path.join(root, f))

    if errors:
        print("❌ NAMING CONVENTION VIOLATION (Rule 21):")
        for e in errors:
            print(f"  - {e}")
        print("\nRequired format: [ISSUE-ID]_[AGENT]_[DOC-TYPE]_v[VERSION].md")
        print("Example: VOS-001_WHITE_handoff_v1.md")
        return 1

    print("✅ All documentation files follow Rule 21 naming conventions.")
    return 0

if __name__ == "__main__":
    sys.exit(verify_naming())
