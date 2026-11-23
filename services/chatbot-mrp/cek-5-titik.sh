#!/bin/sh
# Cek pasca-perubahan Caddy: chat MRP (lewat website), chat Lavile, editor n8n,
# mrproperti.com, lavilecikarang.com. Keluar dengan jumlah yang GAGAL.
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
GAGAL=0
hasil() { if [ "$1" = 0 ]; then echo "LULUS  $2"; else echo "GAGAL  $2"; GAGAL=$((GAGAL+1)); fi; }
T=$(mktemp -d)

LOG0=$(docker logs chatbot-mrp 2>&1 | grep -c groq_)
code=$(curl -s -o $T/mrp -w "%{http_code}" -A "$UA" -H "Origin: https://mrproperti.com" -H "Content-Type: application/json" \
  -d '{"message":"Ada rumah dijual di Cikarang di bawah 500 juta?","history":[]}' https://mrproperti.com/api/chat)
python3 -c "import json,sys; d=json.load(open('$T/mrp')); sys.exit(0 if '$code'=='200' and d.get('handoff') is False and d.get('sources') and d.get('reply') else 1)" 2>/dev/null
hasil $? "chat mrproperti.com /api/chat (HTTP $code, $(python3 -c "import json; d=json.load(open('$T/mrp')); print('handoff', d.get('handoff'), len(d.get('sources') or []), 'sumber')" 2>/dev/null))"
sleep 2
LOG1=$(docker logs chatbot-mrp 2>&1 | grep -c groq_)
echo "       dilayani chatbot-mrp (Go)? $([ "$LOG1" -gt "$LOG0" ] && echo YA || echo TIDAK — dilayani n8n)"

sleep 25
code=$(curl -s -o $T/lvl -w "%{http_code}" -A "$UA" -H "Origin: https://lavilecikarang.com" -H "Content-Type: application/json" \
  -d '{"action":"sendMessage","sessionId":"cek-'$(date +%s)'","chatInput":"Tipe rumahnya apa saja?"}' \
  https://n8n.mrproperti.com/webhook/lavile-chatbot-groq/chat)
python3 -c "import json,sys; d=json.load(open('$T/lvl')); o=d.get('output',''); sys.exit(0 if '$code'=='200' and o and not o.startswith('Maaf, silakan hubungi') else 1)" 2>/dev/null
hasil $? "chat Lavile webhook n8n (HTTP $code)"

code=$(curl -s -o $T/ed -w "%{http_code}" -A "$UA" https://n8n.mrproperti.com/)
grep -qi "n8n" $T/ed; [ "$code" = 200 ]; a=$?; grep -qi n8n $T/ed || a=1
hasil $a "editor n8n https://n8n.mrproperti.com/ (HTTP $code)"
code=$(curl -s -o /dev/null -w "%{http_code}" -A "$UA" https://n8n.mrproperti.com/healthz)
[ "$code" = 200 ]; hasil $? "n8n /healthz (HTTP $code)"

code=$(curl -s -o /dev/null -w "%{http_code}" -A "$UA" https://mrproperti.com/)
[ "$code" = 200 ]; hasil $? "mrproperti.com (HTTP $code)"
code=$(curl -s -o /dev/null -w "%{http_code}" -A "$UA" https://lavilecikarang.com/)
[ "$code" = 200 ]; hasil $? "lavilecikarang.com (HTTP $code)"
rm -r $T
echo "JUMLAH GAGAL: $GAGAL"
exit $GAGAL
