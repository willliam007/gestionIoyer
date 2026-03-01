import urllib.request, json, sys

req = urllib.request.Request(
    'http://localhost:5000/api/register',
    data=json.dumps({'username': 'test10', 'password': 'pw', 'email': 't10@t.com', 'role': 'locataire'}).encode(),
    headers={'Content-Type': 'application/json'}
)

try:
    res = urllib.request.urlopen(req)
    print("Success:", res.read().decode())
except urllib.error.HTTPError as e:
    print("Error:", e.read().decode())
