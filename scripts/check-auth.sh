#!/bin/bash
# Check GitHub auth status
RESULT=$(curl -s -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/user" 2>&1)
echo "$RESULT" | python3 -c "
import sys,json
try:
    d = json.load(sys.stdin)
    print('Login:', d.get('login','?'))
    print('Name:', d.get('name','?'))
except:
    print('Error:', sys.stdin.read()[:200])
"
