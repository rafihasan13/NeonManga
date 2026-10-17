export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
  const id = String(req.query.id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'A valid chapter id is required.' });
  try {
    const r = await fetch('https://api.mangadex.org/at-home/server/' + encodeURIComponent(id));
    if (!r.ok) return res.status(r.status).json({ error: 'Chapter pages unavailable (' + r.status + ').' });
    const j = await r.json();
    const base = j.baseUrl, ch = j.chapter || {};
    if (!base || !ch.hash || !Array.isArray(ch.data)) return res.status(502).json({ error: 'This chapter has no readable pages.' });
    return res.status(200).json({ hash: ch.hash, pages: ch.data.map(file => base + '/data/' + ch.hash + '/' + encodeURIComponent(file)), dataSaver: (ch.dataSaver || []).map(file => base + '/data-saver/' + ch.hash + '/' + encodeURIComponent(file)) });
  } catch (e) { return res.status(502).json({ error: 'Could not load chapter pages. Try another chapter.' }); }
}
