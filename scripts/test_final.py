#!/usr/bin/env python3
"""最后尝试各种百炼API调用方式"""
import json, time, urllib.request, urllib.error, sys
from pathlib import Path
from PIL import Image
import io

API_KEY = "sk-ws-H.EHMLEYD.ligj.MEQCIEhFOv1FAevkkQuHNcrHapLFysqlNiSSs6cHCErOMIF1AiBFfWlMfizg2Pz1pur6EbqIMYD829Pksb7tWf1iEGFDcw"
HOSTS = [
    "dashscope.aliyuncs.com",
    "llm-kgeb7ky4c3uo8fjl.cn-beijing.maas.aliyuncs.com",
]
OUT = Path(__file__).parent.parent / "public/images/words"
OUT.mkdir(parents=True, exist_ok=True)
PROMPT = "cute kawaii cartoon cat, white background, children illustration"

def post(host, path, payload, headers=None, timeout=120):
    h = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    if headers: h.update(headers)
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f"https://{host}{path}", data=data, headers=h, method="POST")
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        try: return e.code, json.loads(body)
        except: return e.code, body

def get(host, path, timeout=30):
    req = urllib.request.Request(f"https://{host}{path}", headers={"Authorization": f"Bearer {API_KEY}"}, method="GET")
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")

def download(url, name):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    r = urllib.request.urlopen(req, timeout=60)
    raw = r.read()
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    img = img.resize((448,448), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80, optimize=True)
    out = buf.getvalue()
    p = OUT / f"{name}.png"
    p.write_bytes(out)
    print(f"  SAVED {p.name} ({len(out)/1024:.1f} KB)")
    return True

# Try synchronous (non-async) call on text2image endpoint
print("=== Sync text2image (no async header) ===")
for host in HOSTS:
    for model in ["wan2.7-image-pro", "wan2.7-image", "qwen-image-2.0-pro-2026-06-22"]:
        code, resp = post(host, "/api/v1/services/aigc/text2image/image-synthesis",
            {"model": model, "input": {"prompt": PROMPT}, "parameters": {"size": "1024*1024", "n": 1}},
            timeout=120)
        print(f"  {model:30s} @ {host[:30]:30s} -> {code}")
        if code == 200:
            print(f"    Response: {json.dumps(resp, ensure_ascii=False)[:500]}")
            # Check task_id
            task_id = resp.get("output",{}).get("task_id")
            results = resp.get("output",{}).get("results",[])
            if results and results[0].get("url"):
                download(results[0]["url"], f"test_sync_{model}")
                sys.exit(0)
            elif task_id:
                # Poll
                print(f"    Task: {task_id}, polling...")
                for _ in range(30):
                    time.sleep(3)
                    sc, sr = get(host, f"/api/v1/tasks/{task_id}")
                    if sc == 200:
                        ts = sr.get("output",{}).get("task_status","?")
                        print(f"    [{_*3}s] {ts}")
                        if ts == "SUCCEEDED":
                            res = sr["output"].get("results",[])
                            if res and res[0].get("url"):
                                download(res[0]["url"], f"test_sync_{model}")
                                sys.exit(0)
                            break
                        elif ts in ("FAILED","CANCELED"):
                            print(f"    FAILED: {json.dumps(sr, ensure_ascii=False)[:300]}")
                            break
        else:
            msg = resp.get("message","")[:100] if isinstance(resp,dict) else str(resp)[:100]
            ec = resp.get("code","") if isinstance(resp,dict) else ""
            if ec != "AccessDenied.Unpurchased" and "FreeTierOnly" not in ec:
                print(f"    {ec} {msg}")
        time.sleep(0.5)

print("\nAll attempts failed.")
