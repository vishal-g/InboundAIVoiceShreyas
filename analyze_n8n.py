import json
import sys

def analyze(filename):
    with open(filename, 'r') as f:
        data = json.load(f)
        
    print(f"--- Analyzing {filename} ---")
    nodes = data.get('nodes', [])
    connections = data.get('connections', {})
    
    print(f"Total Nodes: {len(nodes)}")
    for n in nodes:
        name = n.get('name')
        ntype = n.get('type')
        notes = n.get('notes', '')
        
        # for sticky notes
        if ntype == 'n8n-nodes-base.stickyNote':
            content = n.get('parameters', {}).get('content', '')
            if content:
                print(f"NOTE: {content[:100].replace(chr(10), ' ')}...")
            continue
            
        print(f"NODE: {name} ({ntype})")
        if n.get('parameters'):
            p = n['parameters']
            if 'text' in p: print(f"  PROMPT:\n{p['text']}\n")
            if 'url' in p: print(f"  URL: {p['url']}")
            if 'jsCode' in p: print(f"  CODE:\n{p['jsCode'][:200]}...\n")
            if 'method' in p: print(f"  METHOD: {p['method']}")

if __name__ == '__main__':
    analyze(sys.argv[1])
