# chatbot-mrp (MRP)

Pengganti 1:1 workflow n8n `MRP-Chat-groq` (`UI0HBaX7pESdq629`, versionId `0f416495…`).
Go stdlib saja → image `scratch` ±10 MB, RAM ±2 MB saat diam (batas container 64 MB).

- Endpoint sama: `POST /webhook/mr-konsultasi`, header `x-mr-token`, body `{message, history, sources}`,
  balasan `{reply, handoff, source_ids}` (200 / 502), token salah → 403 `Authorization data is wrong!`.
- Prompt: `prompt.txt` (disalin apa adanya dari node "Susun Prompt"). Model `openai/gpt-oss-120b`,
  cadangan `openai/gpt-oss-20b`, temperature 0.3, `max_completion_tokens` 1200, `reasoning_effort` low, mode JSON.
- Bukti 1:1: `testdata/n8n/*.js` = kode node live; `node testdata/gen-fixtures.js` menjalankannya pada kasus
  tepi → `testdata/fixtures.json`; `go test` memastikan hasil Go identik.
- Log stdout JSON per permintaan: waktu (WIB), id permintaan, model, hasil, status, lama (ms). Tanpa isi pesan.

## VPS (`/root/chatbot-mrp`)
```sh
sh build.sh <tag>          # vet + tes + kompilasi di container golang (RAM ≤512 MB) → chatbot-mrp:<tag> & :latest
docker compose up -d       # port 127.0.0.1:8081 (tes); Caddy nanti ke chatbot-mrp:8080 via jaringan hostme
python3 uji-banding.py     # banding n8n vs Go (jeda 25 s, pakai kuota Groq)
```
`.env` (chmod 600, tidak di git): `MR_CHAT_TOKEN` (= `N8N_CHAT_WEBHOOK_SECRET` di `/root/web-me/.env`), `GROQ_API_KEY`.

## Beda yang diketahui dengan n8n (tidak terlihat oleh website)
- Saat error internal (knowledge/Groq tidak terjangkau, kode node melempar error) n8n membalas 500 "Error in workflow";
  service ini juga 500. Website memperlakukan 500 dan 502 sama (pesan "belum tersedia" + WhatsApp).
- Potongan teks yang membelah emoji: JS menyisakan setengah karakter (surrogate), Go menjadi `�`.
