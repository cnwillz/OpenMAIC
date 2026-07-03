#!/bin/bash
# Test GitHub access and fork the repo
set -e

# Read token from env (not printed)
TOKEN="${GITHUB_TOKEN:-$GH_TOKEN}"

# 1. Check current user
echo "=== Checking current user ==="
USER_INFO=$(curl -sf -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/user")
echo "$USER_INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print('User:', d['login'], '/', d.get('name',''))"

# Extract username
GH_USER=$(echo "$USER_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")
echo "Username: $GH_USER"

# 2. Check if already forked
echo ""
echo "=== Checking if fork exists ==="
FORK_CHECK=$(curl -sf -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${GH_USER}/OpenMAIC" 2>&1 || echo "NOT_FOUND")
if echo "$FORK_CHECK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id','?'), d.get('fork','?'))" 2>/dev/null; then
  echo "Fork already exists!"
else
  echo "No fork exists. Creating..."
  FORK_RESULT=$(curl -sf -X POST -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/THU-MAIC/OpenMAIC/forks" 2>&1)
  echo "$FORK_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Fork created:', d.get('clone_url',''))"
fi

# 3. Show repo URLs
echo ""
echo "=== Repo URLs ==="
echo "Origin (upstream): https://github.com/THU-MAIC/OpenMAIC.git"
echo "Fork: https://${GH_USER}@github.com/${GH_USER}/OpenMAIC.git"
