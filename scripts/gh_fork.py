import os, json, urllib.request

# Read token from environment
token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
print(f"Token found: {bool(token)}, length: {len(token) if token else 0}")

if not token:
    print("ERROR: No GitHub token found")
    exit(1)

# 1. Check current user
req = urllib.request.Request(
    'https://api.github.com/user',
    headers={
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'HermesAgent'
    }
)
try:
    resp = urllib.request.urlopen(req)
    user_data = json.loads(resp.read().decode())
    gh_user = user_data['login']
    print(f"AUTH_USER:{gh_user}")
    print(f"AUTH_NAME:{user_data.get('name', '')}")
except Exception as e:
    print(f"AUTH_FAILED:{e}")
    exit(1)

# 2. Check if fork exists
req2 = urllib.request.Request(
    f'https://api.github.com/repos/{gh_user}/OpenMAIC',
    headers={
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'HermesAgent'
    }
)
try:
    resp2 = urllib.request.urlopen(req2)
    fork_data = json.loads(resp2.read().decode())
    print(f"FORK_EXISTS:1")
    print(f"FORK_URL:{fork_data.get('html_url')}")
    print(f"FORK_CLONE:{fork_data.get('clone_url')}")
except urllib.error.HTTPError as e:
    if e.code == 404:
        print(f"FORK_EXISTS:0")
        print("Creating fork...")
        req3 = urllib.request.Request(
            'https://api.github.com/repos/THU-MAIC/OpenMAIC/forks',
            data=b'{}',
            headers={
                'Authorization': f'token {token}',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'HermesAgent',
                'Content-Type': 'application/json'
            },
            method='POST'
        )
        try:
            resp3 = urllib.request.urlopen(req3)
            new_fork = json.loads(resp3.read().decode())
            print(f"FORK_CREATED:1")
            print(f"FORK_URL:{new_fork.get('html_url')}")
            print(f"FORK_CLONE:{new_fork.get('clone_url')}")
        except Exception as e2:
            print(f"FORK_CREATE_FAILED:{e2}")
    else:
        print(f"FORK_CHECK_ERR:{e.code}:{e.reason}")

# 3. Output git remote commands
if os.environ.get('GH_USER'):
    u = os.environ['GH_USER']
else:
    u = gh_user
print(f"REMOTE_CMD:git remote add fork https://{u}@github.com/{u}/OpenMAIC.git")
print(f"PUSH_CMD:git push fork main")
