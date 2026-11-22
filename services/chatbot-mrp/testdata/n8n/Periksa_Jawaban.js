const item = $input.first().json || {};
const allowed = new Set($('Susun Prompt').first().json.sourceIds || []);
const fail = d => [{ json: { ok: false, diagnostic: d, reply: '', handoff: true, source_ids: [] } }];
if (item.error) return fail('groq_error:' + String(item.error.code || item.error.type || item.error.message || 'x').slice(0, 80));
const text = item.choices && item.choices[0] && item.choices[0].message && item.choices[0].message.content;
if (typeof text !== 'string') return fail('groq_no_content');
let p;
try { p = JSON.parse(text.replace(/```(?:json)?/gi, '').trim()); } catch (e) { return fail('groq_bad_json'); }
let reply = typeof p.reply === 'string' ? p.reply : '';
reply = reply
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/https?:\/\/\S+|www\.\S+|wa\.me\S*/gi, '')
  .replace(/<[^>]*>/g, '')
  .replace(/\*\*/g, '')
  .trim().slice(0, 2400);
const handoff = p.handoff === true;
let ids = Array.isArray(p.source_ids) ? [...new Set(p.source_ids.filter(id => allowed.has(id)))].slice(0, 8) : [];
if (!handoff && !reply) return fail('groq_empty');
if (!handoff && !ids.length) {
  if (!allowed.has('site:overview')) return fail('groq_no_sources');
  ids = ['site:overview'];
}
return [{ json: { ok: true, diagnostic: 'groq_ok', reply: reply || 'Baik.', handoff, source_ids: handoff ? [] : ids } }];