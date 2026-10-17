export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  const id = String(req.query.id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'A valid manga id is required.' });
  const p = new URLSearchParams();
  p.set('manga', id); p.set('limit', '100'); p.set('offset', String(Math.max(0, Number(req.query.offset || 0)));
  p.set('translatedLanguage[]', String(req.query.lang || 'en'));
  p.set('order[chapter]', 'asc'); p.set('order[volume]', 'asc');
  p.set('includes[]', 'scanlation_group'); p.set('contentRating[]', 'safe'); p.set('contentRating[]', 'suggestive');
  try {
    const r = await fetch('https://api.mangadex.org/chapter?' + p.toString());
    if (!r.ok) return res.status(r.status).json({ error: 'Chapter list unavailable (' + r.status + ').' });
    const j = await r.json();
    return res.status(200).json({ total: j.total || 0, offset: j.offset || 0, results: (j.data || []).map(c => ({
      id: c.id, chapter: c.attributes?.chapter || '?', title: c.attributes?.title || '',
      volume: c.attributes?.volume || '', language: c.attributes?.translatedLanguage || 'en',
      pages: c.attributes?.pages || 0, published: c.attributes?.publishAt || '',
      group: (c.relationships || []).find(x => x.type === 'scanlation_group')?.attributes?.name || ''
    })) });
  } catch (e) { return res.status(502).json({ error: 'Could not load chapters right now.' }); }
}
