import urllib.request, json, sys

def test_dashboard():
    # 0. Register
    try:
        req_reg = urllib.request.Request(
            'http://localhost:5000/api/register',
            data=json.dumps({'username': 'test100', 'password': 'pw', 'email': 't100@t.com', 'role': 'proprietaire'}).encode(),
            headers={'Content-Type': 'application/json'}
        )
        urllib.request.urlopen(req_reg)
    except:
        pass

    # 1. Login
    req_login = urllib.request.Request(
        'http://localhost:5000/api/login',
        data=json.dumps({'username': 't100@t.com', 'password': 'pw'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        res_login = urllib.request.urlopen(req_login)
        data = json.loads(res_login.read().decode())
        token = data.get('access_token')
        print(f"Login successful. Token: {token[:20]}...")
    except urllib.error.HTTPError as e:
        print("Login Error:", e.read().decode())
        return

    # 2. Access Dashboard
    req_dash = urllib.request.Request(
        'http://localhost:5000/api/dashboard/proprietaire',
        headers={'Authorization': f'Bearer {token}'}
    )
    try:
        res_dash = urllib.request.urlopen(req_dash)
        print("Dashboard Success:", res_dash.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Dashboard Error ({e.code}):", e.read().decode())

test_dashboard()

