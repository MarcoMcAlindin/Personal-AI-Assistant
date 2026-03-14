import json
import sys
import subprocess

# This script filters the Plane MCP tools to stay under the 100 limit.
def filter_tools(response):
    if "method" in response or "result" in response:
        # We look for the tool list in the MCP 'list_tools' response
        try:
            if response.get("result", {}).get("tools"):
                tools = response["result"]["tools"]
                # We keep only the first 90 tools (focusing on Issues/Projects)
                # This ensures we stay well under the 100 limit.
                response["result"]["tools"] = tools[:90]
        except (KeyError, TypeError):
            pass
    return response

proc = subprocess.Popen(
    ["python3", "-m", "plane_mcp_server", "stdio"], # Faster than uvx
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=sys.stderr,
    text=True
)

# Standard MCP communication loop
for line in sys.stdin:
    proc.stdin.write(line)
    proc.stdin.flush()
    output = proc.stdout.readline()
    if not output:
        break
    
    # Filter the output before sending it to Antigravity
    try:
        data = json.loads(output)
        filtered_data = filter_tools(data)
        print(json.dumps(filtered_data), flush=True)
    except:
        print(output, end="", flush=True)