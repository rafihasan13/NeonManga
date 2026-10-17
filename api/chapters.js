export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const id = String(req.query.id || '').trim();
  const lang = String(req.query.lang || 'en').trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'A valid manga id is required.' });
  const buildParams = (language) => {
    const p = new URLSearchParams();
    p.set('manga', id);
    p.set('limit', '100');
    p.set('offset', String(Math.max(0, Math.min(10000, Number(req.query.offset || 0))));
    p.set('translatedLanguage[]', language);
    p.set('order[chapter]', 'asc');
    p.set('order[volume]', 'asc');
    p.set('includes[]', 'scanlation_group');
    return p;
  };
  try {
    let upstream = await fetch('https://api.mangadex.org/chapter?' + buildParams(lang).toString(), {
      headers: { 'User-Agent': 'NeonManga/0.2 (manga discovery reader)' }
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'MangaDex chapter API returned ' + upstream.status + '.' });
    let body = await upstream.json();
    let languageUsed = lang;
    // If there are no English chapters, try chapters in any language so the user can see what exists.
    if (!(body.data || []).length && lang === 'en' && req.query.fallback !== 'false') {
      const p = new URLSearchParams();
      p.set('manga', id); p.set('limit', '100');
      p.set('offset', String(Math.max(0, Math.min(10000, Number(req.query.offset || 0)))));
      p.set('order[chapter]', 'asc'); p.set('order[volume]', 'asc');
      p.set('includes[]', 'scanlation_group');
      upstream = await fetch('https://api.mangadex.org/chapter?' + p.toString(), {
        headers: { 'User-Agent': 'NeonManga/0.2 (manga discovery reader)' }
      });
      if (upstream.ok) { body = await upstream.json(); languageUsed = 'all'; }
    }
    const results = (body.data || []).map(c => ({
      id: c.id, chapter: c.attributes?.chapter || '?', title: c.attributes?.title || '',
      volume: c.attributes?.volume || '', language: c.attributes?.translatedLanguage || languageUsed,
      pages: c.attributes?.pages || 0, published: c.attributes?.publishAt || '',
      group: (c.relationships || []).find(x => x.type === 'scanlation_group')?.attributes?.name || ''
    }));
    return res.status(200).json({ total: body.total || results.length, offset: body.offset || 0, languageUsed, results });
  } catch (e) {
    return res.status(502).json({ error: 'Could not load chapters right now. Please try again.' });
  }
}
