#!/usr/bin/env python3
"""Bangun `MRP-MR Properti Blog — Next.js-groq-tulisulang` dari ekspor `Zm0ZBgFDJW0P1u7H` (22-11-2026).

Pakai (di VPS, ekspor berisi API key blog jadi JANGAN disalin ke repo):
  python3 build-mrp-blog-tulisulang.py <Zm0ZBgFDJW0P1u7H.json> uji  > uji.json
  python3 build-mrp-blog-tulisulang.py <Zm0ZBgFDJW0P1u7H.json> prod > prod.json

Perubahan: artikel di luar 350-1000 kata tidak langsung gagal, tetapi ditulis ulang SEKALI:
  Validasi Artikel → Perlu Tulis Ulang? → Jeda Batas Groq (60 s, batas ±8000 TPM)
  → Tulis Ulang Groq (prompt asli + artikel lama + permintaan 450-700 kata) → Ambil Teks Ulang
  → Validasi Artikel lagi (rewritten=true: kalau masih di luar batas → error, tidak terbit).
Aturan lain di Validasi Artikel tidak berubah (pelanggaran format tetap langsung gagal).
- uji : dryRun=true, jadwal dinonaktifkan, prompt minta 150-250 kata supaya jalur tulis ulang
        PASTI terpakai, ditambah webhook uji `mrp-blog-tulisulang-uji` (header x-mr-token).
- prod: jadwal 07/11/15/19 WIB, dryRun=false, tanpa webhook uji.
"""
import copy
import json
import sys
import uuid

src, mode = sys.argv[1], sys.argv[2]
assert mode in ("uji", "prod")
CRED_WEBHOOK = {"id": "rRIUlBypysmaC69N", "name": "MRP Chat Webhook"}
w = json.load(open(src))
nodes = w["nodes"]
N = {n["name"]: n for n in nodes}
uid = lambda: str(uuid.uuid4())

v = N["Validasi Artikel"]["parameters"]
old = "if(all.split(/\\s+/).length<350||all.split(/\\s+/).length>1000)throw new Error('Panjang artikel di luar batas 350-1000 kata.');"
assert old in v["jsCode"]
v["jsCode"] = v["jsCode"].replace(old, (
    "const wordCount=all.split(/\\s+/).length;\n"
    "if(wordCount<350||wordCount>1000){\n"
    " // MRP 22-11-2026: tulis ulang otomatis sekali (lewat Perlu Tulis Ulang?) sebelum menyerah.\n"
    " if(!response.rewritten)return [{json:{rewrite:true,wordCount,previous:cleaned}}];\n"
    " throw new Error('Panjang artikel di luar batas 350-1000 kata ('+wordCount+' kata) setelah ditulis ulang.');\n"
    "}"))
old = "return [{json:{dryRun:ctx.dryRun,"
assert old in v["jsCode"]
v["jsCode"] = v["jsCode"].replace(old, "return [{json:{rewrite:false,wordCount,rewritten:!!response.rewritten,dryRun:ctx.dryRun,")
vx, vy = N["Validasi Artikel"]["position"]

perlu = copy.deepcopy(N["Uji Manual Saja?"])
perlu.update(id=uid(), name="Perlu Tulis Ulang?", position=[vx + 120, vy - 240])
cond = perlu["parameters"]["conditions"]["conditions"][0]
cond.update(id=uid(), leftValue="={{ $json.rewrite }}")

jeda = {"id": uid(), "name": "Jeda Batas Groq", "type": "n8n-nodes-base.wait", "typeVersion": 1.1,
        "webhookId": uid(), "position": [vx + 340, vy - 400], "parameters": {"amount": 60, "unit": "seconds"},
        "notes": "Groq gpt-oss-120b dibatasi ±8000 token/menit; tunggu 60 detik sebelum menulis ulang."}

ulang = copy.deepcopy(N["Tulis Artikel Groq"])
ulang.pop("onError", None)  # gagal di sini = menyerah (workflow error, tidak terbit)
ulang.update(id=uid(), name="Tulis Ulang Groq", position=[vx + 560, vy - 400])
ulang["parameters"]["jsonBody"] = (
    "={{ JSON.stringify({ model: 'openai/gpt-oss-120b', temperature: 0.5, max_completion_tokens: 4000, "
    "reasoning_effort: 'low', response_format: { type: 'json_object' }, messages: ["
    " { role: 'user', content: $('Siapkan Artikel').first().json.prompt },"
    " { role: 'assistant', content: $json.previous },"
    " { role: 'user', content: 'Artikel di atas ' + $json.wordCount + ' kata, di luar batas 350-1000 kata. "
    "Tulis ulang artikel yang sama menjadi 450-700 kata. Semua aturan sebelumnya tetap berlaku, termasuk 4-6 "
    "bagian dan bentuk JSON yang sama persis. Balas HANYA JSON valid.' }"
    " ] }) }}")

ambil = copy.deepcopy(N["Ambil Teks"])
ambil.update(id=uid(), name="Ambil Teks Ulang", position=[vx + 780, vy - 400])
ambil["parameters"]["jsCode"] = (
    "const c = $input.first().json.choices?.[0]?.message?.content;\n"
    "if (typeof c !== 'string' || !c.trim()) throw new Error('Groq tidak mengembalikan teks artikel tulis ulang.');\n"
    "return [{ json: { text: c, rewritten: true } }];")
nodes += [perlu, jeda, ulang, ambil]

conn = w["connections"]
conn["Validasi Artikel"] = {"main": [[{"node": "Perlu Tulis Ulang?", "type": "main", "index": 0}]]}
conn["Perlu Tulis Ulang?"] = {"main": [[{"node": "Jeda Batas Groq", "type": "main", "index": 0}],
                                       [{"node": "Uji Manual Saja?", "type": "main", "index": 0}]]}
conn["Jeda Batas Groq"] = {"main": [[{"node": "Tulis Ulang Groq", "type": "main", "index": 0}]]}
conn["Tulis Ulang Groq"] = {"main": [[{"node": "Ambil Teks Ulang", "type": "main", "index": 0}]]}
conn["Ambil Teks Ulang"] = {"main": [[{"node": "Validasi Artikel", "type": "main", "index": 0}]]}

if mode == "uji":
    jadwal = N["Jadwal dan Topik"]["parameters"]
    assert "const dryRun = false;" in jadwal["jsCode"]
    jadwal["jsCode"] = jadwal["jsCode"].replace("const dryRun = false;", "const dryRun = true;")
    siap = N["Siapkan Artikel"]["parameters"]
    assert "Panjang 450-700 kata." in siap["jsCode"]
    siap["jsCode"] = siap["jsCode"].replace("Panjang 450-700 kata.", "Panjang 150-250 kata.")
    N["Jadwal Blog WIB"]["disabled"] = True
    nodes.append({
        "parameters": {"httpMethod": "POST", "path": "mrp-blog-tulisulang-uji", "authentication": "headerAuth",
                       "responseMode": "lastNode", "options": {}},
        "name": "Uji Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 600],
        "id": uid(), "webhookId": uid(), "credentials": {"httpHeaderAuth": CRED_WEBHOOK},
    })
    conn["Uji Webhook"] = {"main": [[{"node": "Jadwal dan Topik", "type": "main", "index": 0}]]}

settings = {k: v for k, v in (w.get("settings") or {}).items() if k in ("executionOrder", "timezone")}
settings.setdefault("executionOrder", "v1")
name = "MRP-MR Properti Blog — Next.js-groq-tulisulang" + (" (UJI)" if mode == "uji" else "")
print(json.dumps({"name": name, "nodes": nodes, "connections": conn, "settings": settings}, ensure_ascii=False))
