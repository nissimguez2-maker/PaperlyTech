#!/usr/bin/env python3
"""
Extract and analyze Paperly source code from JSON
"""
import json
import sys
import re
from pathlib import Path

# Try both possible paths
possible_paths = [
    r"C:\Users\debug\AppData\Roaming\Claude\local-agent-mode-sessions\adef3e64-d68b-4ef0-a521-1e729eb50d1f\ddda3d68-9395-4a81-908f-3efb1d7294c6\local_05995f81-fa09-45d0-81f6-81d3f0428097\.claude\projects\C--Users-debug-AppData-Roaming-Claude-local-agent-mode-sessions-adef3e64-d68b-4ef0-a521-1e729eb50d1f-ddda3d68-9395-4a81-908f-3efb1d7294c6-local-05995f81-fa09-45d0-81f6-81d3f0428097-outputs\a99a139d-81b2-4d66-8cd8-c200e99afc66\tool-results\mcp-workspace-web_fetch-1776065114355.txt",
]

html = None
for path in possible_paths:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list) and len(data) > 0:
                html = data[0].get('text', '')
                print(f"Successfully loaded HTML from {path}")
                break
    except Exception as e:
        print(f"Failed to load from {path}: {e}", file=sys.stderr)

if not html:
    print("Could not load HTML from any source", file=sys.stderr)
    sys.exit(1)

# Save it so we can read it in chunks
output_file = Path(__file__).parent / "paperly_source.html"
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nExtracted HTML ({len(html)} chars) to {output_file}")

# Perform basic analysis
print("\n=== CODE METRICS ===")
print(f"Lines: {len(html.splitlines())}")
print(f"useState hooks: {html.count('useState')}")
print(f"useEffect hooks: {html.count('useEffect')}")
print(f"useCallback hooks: {html.count('useCallback')}")
print(f"useMemo hooks: {html.count('useMemo')}")
print(f"useRef hooks: {html.count('useRef')}")
print(f"useContext hooks: {html.count('useContext')}")
print(f"const declarations: {len(re.findall(r'const\\s+\\w+\\s*=', html))}")
print(f"function declarations: {len(re.findall(r'function\\s+\\w+', html))}")
print(f"arrow functions: {len(re.findall(r'=>', html))}")
print(f"async/await: {html.count('async ')} / {html.count('await ')}")
print(f"fetch calls: {html.count('fetch(')}")
print(f"onClick handlers: {html.count('onClick')}")
print(f"className attributes: {html.count('className')}")
print(f"style attributes: {html.count('style=')}")

# Look for API endpoints
api_endpoints = re.findall(r'(?:https?://[^\s"\']+|/api/[^\s"\']+)', html)
print(f"\nAPI endpoints found: {len(set(api_endpoints))}")
for ep in sorted(set(api_endpoints))[:10]:
    print(f"  - {ep}")

# Look for component names
components = re.findall(r'(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*(?:\(|=)', html)
print(f"\nComponent names ({len(set(components))} unique):")
for comp in sorted(set(components))[:20]:
    print(f"  - {comp}")

# Look for state variable names
state_vars = re.findall(r'const\s+\[([^,\]]+),\s*set[A-Z]', html)
print(f"\nState variables ({len(set(state_vars))} unique):")
for var in sorted(set(state_vars))[:20]:
    print(f"  - {var}")
