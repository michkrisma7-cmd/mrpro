const b = $('Chat Webhook').first().json.body || {};
const message = typeof b.message === 'string' ? b.message.trim() : '';
const history = Array.isArray(b.history)
  ? b.history.slice(-6)
      .filter(h => h && ['user', 'assistant'].includes(h.role) && typeof h.content === 'string')
      .map(h => ({ role: h.role, content: h.content.slice(0, 1200) }))
  : [];
const sources = Array.isArray(b.sources)
  ? b.sources.slice(0, 12)
      .filter(s => s && typeof s.id === 'string' && typeof s.text === 'string')
      .map(s => ({ id: s.id.slice(0, 80), title: String(s.title || '').slice(0, 160), text: s.text.slice(0, 1600) }))
  : [];
return [{ json: { message, history, sources, hasSources: sources.length > 0,
  valid: message.length > 0 && message.length <= 1200 } }];