"""Bandingkan n8n vs chatbot-mrp dengan body yang identik.
Jalankan di VPS: nohup python3 uji-banding.py > uji-banding.log 2>&1 &
Hasil: uji-banding.json (berisi jawaban; jangan dibagikan).
Jeda 25 detik antar-panggilan Groq (batas ±8000 TPM)."""
import json, time, urllib.parse, urllib.request

N8N = "https://n8n.mrproperti.com/webhook/mr-konsultasi"
GO = "http://127.0.0.1:8081/webhook/mr-konsultasi"
KB = "https://mrproperti.com/api/chat/knowledge"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
TOKEN = next(l.split("=", 1)[1].strip() for l in open("/root/chatbot-mrp/.env") if l.startswith("MR_CHAT_TOKEN="))
JEDA = 25


def call(url, body, token=TOKEN):
    req = urllib.request.Request(url, json.dumps(body).encode(), {
        "Content-Type": "application/json", "User-Agent": UA, **({"x-mr-token": token} if token else {})})
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            code, raw = r.status, r.read()
    except urllib.error.HTTPError as e:
        code, raw = e.code, e.read()
    except Exception as e:
        code, raw = 0, repr(e).encode()
    ms = int((time.time() - t) * 1000)
    try:
        out = json.loads(raw)
    except Exception:
        out = raw.decode(errors="replace")[:300]
    return {"code": code, "ms": ms, "out": out}


def knowledge(q):
    req = urllib.request.Request(KB + "?search=" + urllib.parse.quote(q), headers={"x-mr-token": TOKEN, "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)["sources"]


hasil = []


def banding(nama, body, groq=True, token=TOKEN):
    ids = {s["id"] for s in body.get("sources", [])}
    r = {"nama": nama, "message": body.get("message"), "jumlah_sumber": len(body.get("sources", []))}
    for k, url in (("n8n", N8N), ("go", GO)):
        r[k] = call(url, body, token)
        o = r[k]["out"]
        r[k]["id_valid"] = isinstance(o, dict) and all(i in ids for i in o.get("source_ids", [])) if ids else None
        print(f"{nama} {k}: HTTP {r[k]['code']} {r[k]['ms']} ms", flush=True)
        if groq:
            time.sleep(JEDA)
    hasil.append(r)
    json.dump(hasil, open("uji-banding.json", "w"), ensure_ascii=False, indent=1)
    return r


# Deterministik (tanpa Groq)
banding("token salah", {"message": "halo"}, groq=False, token="salah")
banding("tanpa token", {"message": "halo"}, groq=False, token="")
banding("pesan kosong", {"message": "   ", "history": [], "sources": []}, groq=False)
banding("pesan 1201 karakter", {"message": "a" * 1201}, groq=False)

# Pertanyaan nyata (sumber sama persis untuk kedua sisi)
soal = [
    "Ada rumah dijual di Cikarang di bawah 500 juta?",
    "Rumah over kredit di Bekasi yang 2 kamar ada?",
    "Berapa harga cuci AC?",
    "Bagaimana cara titip properti di MR Properti?",
    "Ada rumah disewakan di Karawang?",
    "Saya mau komplain, tukang yang datang kemarin tidak menyelesaikan pekerjaan.",
]
pertama = None
for q in soal:
    r = banding(q, {"message": q, "history": [], "sources": knowledge(q)})
    pertama = pertama or r

# Sapaan tanpa sumber → kedua sisi mengambil knowledge sendiri
banding("halo (tanpa sumber)", {"message": "halo", "history": []})

# Lanjutan percakapan dengan riwayat
q0 = soal[0]
lanjut = "Yang paling murah yang mana?"
hist = [{"role": "user", "content": q0},
        {"role": "assistant", "content": (pertama["n8n"]["out"] or {}).get("reply", "") if isinstance(pertama["n8n"]["out"], dict) else ""}]
banding("lanjutan dengan riwayat", {"message": lanjut, "history": hist, "sources": knowledge(lanjut + " " + q0)})
print("SELESAI", flush=True)
