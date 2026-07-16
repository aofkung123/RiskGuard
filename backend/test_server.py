import threading, time, urllib.request, json
import uvicorn
from app.main import app

def run_server():
    uvicorn.run(app, host='127.0.0.1', port=8888, log_level='info')

if __name__ == '__main__':
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(3)

    # 1. Login
    req = urllib.request.Request('http://127.0.0.1:8888/api/auth/login', 
        data=json.dumps({"email": "nattanun.aof47@gmail.com", "password": "Kurazo081147!"}).encode(),
        headers={'Content-Type': 'application/json'})
    token = None
    try:
        with urllib.request.urlopen(req) as res:
            token = json.loads(res.read())['access_token']
            print('Login OK')
    except Exception as e:
        print('Login Failed:', getattr(e, 'read', lambda: b'')().decode())
        exit(1)

    # 2. Get Overview
    req2 = urllib.request.Request('http://127.0.0.1:8888/api/dashboard/overview?project_id=1',
        headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req2) as res2:
            print('Overview OK:', res2.read().decode()[:200])
    except Exception as e:
        print('Overview Failed:', e, getattr(e, 'read', lambda: b'')().decode())
    
    # 3. Wait 1 sec to let Uvicorn print traceback
    time.sleep(1)
