#!/usr/bin/env python3
"""Bangun `MRP-MR Properti Blog — Next.js-groq` dari ekspor workflow blog lama.

Pakai (di VPS, ekspor berisi API key blog jadi JANGAN disalin ke repo):
  python3 build-mrp-blog-groq.py <cpGzooOPgTWuBXQc.json> uji  > uji.json
  python3 build-mrp-blog-groq.py <cpGzooOPgTWuBXQc.json> prod > prod.json

Perubahan terhadap aslinya:
- Node AI OpenRouter (model :free sudah hilang) + Gemini Cadangan (key tidak valid) diganti
  HTTP Request ke Groq dengan mode JSON: gpt-oss-120b, bila gagal gpt-oss-20b.
- Node "Ambil Teks" mengubah jawaban Groq ke {text}, sehingga "Validasi Artikel" tetap sama persis.
- uji : dryRun=true, jadwal dinonaktifkan, ditambah webhook uji (header x-mr-token) → respons = node terakhir.
- prod: sama dengan aslinya (jadwal 07/11/15/19 WIB, dryRun=false), tanpa webhook uji.
"""
import json
import sys
import uuid

src, mode = sys.argv[1], sys.argv[2]
assert mode in ("uji", "prod")
w = json.load(open(src))
CRED_GROQ = {"id": "LOany4qg8SAJpkVj", "name": "MRP Groq"}
CRED_WEBHOOK = {"id": "rRIUlBypysmaC69N", "name": "MRP Chat Webhook"}

drop = {"Tulis Artikel", "AI OpenRouter", "Gemini Cadangan"}
nodes = [n for n in w["nodes"] if n["name"] not in drop]
by = {n["name"]: n for n in nodes}

jadwal = by["Jadwal dan Topik"]
code = jadwal["parameters"]["jsCode"]
assert "const dryRun = false;" in code
if mode == "uji":
    jadwal["parameters"]["jsCode"] = code.replace("const dryRun = false;", "const dryRun = true;")
    by["Jadwal Blog WIB"]["disabled"] = True


def groq(name, model, pos):
    body = (
        "={{ JSON.stringify({ model: '" + model + "', temperature: 0.7, max_completion_tokens: 4000, "
        "reasoning_effort: 'low', response_format: { type: 'json_object' }, "
        "messages: [ { role: 'user', content: $('Siapkan Artikel').first().json.prompt } ] }) }}"
    )
    return {
        "parameters": {
            "method": "POST", "url": "https://api.groq.com/openai/v1/chat/completions",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "groqApi",
            "sendBody": True, "specifyBody": "json", "jsonBody": body,
            "options": {"timeout": 120000},
        },
        "name": name, "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": pos,
        "id": str(uuid.uuid4()), "credentials": {"groqApi": CRED_GROQ},
        "retryOnFail": True, "maxTries": 2, "waitBetweenTries": 5000,
    }


tulis = groq("Tulis Artikel Groq", "openai/gpt-oss-120b", [1500, 300])
tulis["onError"] = "continueErrorOutput"
cadangan = groq("Tulis Artikel Cadangan", "openai/gpt-oss-20b", [1720, 480])
ambil = {
    "parameters": {"jsCode": (
        "const c = $input.first().json.choices?.[0]?.message?.content;\n"
        "if (typeof c !== 'string' || !c.trim()) throw new Error('Groq tidak mengembalikan teks artikel.');\n"
        "return [{ json: { text: c } }];"
    )},
    "name": "Ambil Teks", "type": "n8n-nodes-base.code", "typeVersion": 2,
    "position": [1940, 300], "id": str(uuid.uuid4()),
}
nodes += [tulis, cadangan, ambil]

conn = {k: v for k, v in w["connections"].items() if k not in drop}
conn["Siapkan Artikel"] = {"main": [[{"node": "Tulis Artikel Groq", "type": "main", "index": 0}]]}
conn["Tulis Artikel Groq"] = {"main": [[{"node": "Ambil Teks", "type": "main", "index": 0}],
                                        [{"node": "Tulis Artikel Cadangan", "type": "main", "index": 0}]]}
conn["Tulis Artikel Cadangan"] = {"main": [[{"node": "Ambil Teks", "type": "main", "index": 0}]]}
conn["Ambil Teks"] = {"main": [[{"node": "Validasi Artikel", "type": "main", "index": 0}]]}

if mode == "uji":
    nodes.append({
        "parameters": {"httpMethod": "POST", "path": "mrp-blog-groq-uji", "authentication": "headerAuth",
                       "responseMode": "lastNode", "options": {}},
        "name": "Uji Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 600],
        "id": str(uuid.uuid4()), "webhookId": str(uuid.uuid4()), "credentials": {"httpHeaderAuth": CRED_WEBHOOK},
    })
    conn["Uji Webhook"] = {"main": [[{"node": "Jadwal dan Topik", "type": "main", "index": 0}]]}

settings = {k: v for k, v in (w.get("settings") or {}).items() if k in ("executionOrder", "timezone")}
settings.setdefault("executionOrder", "v1")
name = "MRP-MR Properti Blog — Next.js-groq" + (" (UJI)" if mode == "uji" else "")
print(json.dumps({"name": name, "nodes": nodes, "connections": conn, "settings": settings}, ensure_ascii=False))
