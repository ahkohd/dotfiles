#!/usr/bin/env python3
"""Paper Design MCP client — thin wrapper for tool calls.

Usage:
  paper.py <tool> [json_args]
  paper.py get_basic_info
  paper.py get_screenshot '{"nodeId":"1-0"}'
  paper.py write_html '{"html":"<div style=\"padding:20px\">Hello</div>","targetNodeId":"1-0","mode":"insert-children"}'
"""

import json, sys, base64, urllib.request, os

MCP_URL = "http://127.0.0.1:29979/mcp"
SESSION_FILE = "/tmp/paper-mcp-session"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}


def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def parse_sse(body: str) -> dict:
    """Extract JSON from SSE 'data:' line."""
    for line in body.splitlines():
        if line.startswith("data:"):
            return json.loads(line[5:].strip())
    die(f"No SSE data in response:\n{body[:500]}")


def mcp_request(payload: dict, session_id: str | None = None) -> tuple[str, dict]:
    """Send JSON-RPC request, return (session_id, parsed_result)."""
    hdrs = dict(HEADERS)
    if session_id:
        hdrs["mcp-session-id"] = session_id
    req = urllib.request.Request(
        MCP_URL,
        data=json.dumps(payload).encode(),
        headers=hdrs,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            sid = resp.headers.get("mcp-session-id", session_id)
            body = resp.read().decode()
            return sid, parse_sse(body)
    except urllib.error.URLError:
        die("Cannot reach Paper MCP server. Is Paper running?")


def get_session() -> str:
    """Get or create an MCP session."""
    if os.path.exists(SESSION_FILE):
        return open(SESSION_FILE).read().strip()
    payload = {
        "jsonrpc": "2.0",
        "id": 0,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": {"name": "pi", "version": "1.0"},
        },
    }
    sid, _ = mcp_request(payload)
    if not sid:
        die("No session ID returned from initialize")
    with open(SESSION_FILE, "w") as f:
        f.write(sid)
    return sid


def call_tool(tool: str, args: dict) -> dict:
    """Call a Paper MCP tool and return the result."""
    sid = get_session()
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool, "arguments": args},
    }
    _, result = mcp_request(payload, sid)
    return result


def main():
    if len(sys.argv) < 2:
        print(__doc__.strip())
        sys.exit(1)

    tool = sys.argv[1]
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

    result = call_tool(tool, args)

    # Screenshots: decode base64 image to file
    if tool == "get_screenshot":
        outfile = sys.argv[3] if len(sys.argv) > 3 else "/tmp/paper-screenshot.jpg"
        for c in result.get("result", {}).get("content", []):
            if c.get("type") == "image":
                with open(outfile, "wb") as f:
                    f.write(base64.b64decode(c["data"]))
                print(outfile)
                return
    
    print(json.dumps(result))


if __name__ == "__main__":
    main()
