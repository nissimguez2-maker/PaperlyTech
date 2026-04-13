#!/usr/bin/env python3
"""
Extract HTML from JSON and save in chunks for analysis
"""
import json

file_path = r"C:\Users\debug\AppData\Roaming\Claude\local-agent-mode-sessions\adef3e64-d68b-4ef0-a521-1e729eb50d1f\ddda3d68-9395-4a81-908f-3efb1d7294c6\local_05995f81-fa09-45d0-81f6-81d3f0428097\.claude\projects\C--Users-debug-AppData-Roaming-Claude-local-agent-mode-sessions-adef3e64-d68b-4ef0-a521-1e729eb50d1f-ddda3d68-9395-4a81-908f-3efb1d7294c6-local-05995f81-fa09-45d0-81f6-81d3f0428097-outputs\a99a139d-81b2-4d66-8cd8-c200e99afc66\tool-results\mcp-workspace-web_fetch-1776065114355.txt"

print("Loading JSON...")
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

html = data[0]['text']
print(f"Loaded {len(html)} characters")

# Save full HTML
with open(r"C:\Users\debug\Documents\Claude\Projects\Paperly\paperly_full.html", 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved full HTML")

# Save in quarters
chunk_size = len(html) // 4
for i in range(4):
    start = i * chunk_size
    end = start + chunk_size if i < 3 else len(html)
    chunk = html[start:end]
    filename = f"paperly_chunk_{i+1}.html"
    with open(rf"C:\Users\debug\Documents\Claude\Projects\Paperly\{filename}", 'w', encoding='utf-8') as f:
        f.write(chunk)
    print(f"Saved {filename} ({len(chunk)} chars)")

print("\nDone! Files saved to Paperly folder.")
