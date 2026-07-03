import subprocess, os, json

# Check GitHub auth with the token
# GH_TOKEN is set in environment, pass it explicitly
token = os.environ.get('GH_TOKEN', '')
print(f"Token length: {len(token)}")

# Use subprocess with env dict that includes the token
env = os.environ.copy()
result = subprocess.run(
    ['curl', '-s', '-H', f'Authorization: Bearer {token}', 
     '-H', 'Accept: application/vnd.github.v3+json',
     'https://api.github.com/user'],
    capture_output=True, text=True, env=env
)
try:
    d = json.loads(result.stdout)
    print(f"Login: {d.get('login')}")
    print(f"Name: {d.get('name')}")
    print(f"Token scopes: {result.stderr[:200] if 'X-OAuth-Scopes' in result.stderr else 'n/a'}")
except:
    print(f"Error response ({result.returncode}): {result.stdout[:300]}")
    print(f"Stderr: {result.stderr[:300]}")
