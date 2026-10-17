export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = String(req.query.q || '').trim();
  const mode = String(req.query.mode || 'search');
  if (!q && mode !== 'latest') return res.status(400).json({ error: 'Enter a title to search.' });
  const params = new URLSearchParams();
  params.set('limit', mode === 'latest' ? '24' : '20');
  params.set('includes[]', 'cover_art');
  params.set('availableTranslatedLanguage[]', 'en');
  if (mode === 'latest') {
    params.set('order[latestUploadedChapter]', 'desc');
    params.set('hasAvailableChapters', 'true');
  } else {
    params.set('title', q);
    params.set('order[relevance]', 'desc');
  }
  try {
    const upstream = await fetch('https://api.mangadex.org/manga?' + params.toString(), {
      headers: { 'User-Agent': 'NeonManga/0.2 (manga discovery reader)' }
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'MangaDex API returned ' + upstream.status });
    const body = await upstream.json();
    const mangas = body.data || [];
    // MangaDex may omit cover attributes from manga relationships; retrieve cover filenames explicitly in one batch.
    const ids = mangas.map(m => m.id).filter(Boolean);
    const coverByManga = new Map();
    if (ids.length) {
      const cp = new URLSearchParams();
      ids.forEach(id => cp.append('manga[]', id));
      cp.set('limit', String(Math.min(100, ids.length * 2)));
      cp.set('order[volume]', 'desc');
      const cr = await fetch('https://api.mangadex.org/cover?' + cp.toString(), {
        headers: { 'User-Agent': 'NeonManga/0.2 (manga discovery reader)' }
      });
      if (cr.ok) {
        const cb = await cr.json();
        for (const cv of (cb.data || [])) {
          const mid = (cv.relationships || []).find(x => x.type === 'manga')?.id;
          const fn = cv.attributes?.fileName;
          if (mid && fn && !coverByManga.has(mid)) coverByManga.set(mid, fn);
        }
      }
    }
    const data = mangas.map(m => {
      const a = m.attributes || {};
      const rel = m.relationships || [];
      const cover = rel.find(x => x.type === 'cover_art');
      const filename = coverByManga.get(m.id) || cover?.attributes?.fileName;
      const title = a.title?.en || Object.values(a.title || {})[0] || 'Untitled';
      return {
        id: m.id, title, altTitles: (a.altTitles || []).flatMap(x => Object.values(x)),
        description: a.description?.en || Object.values(a.description || {})[0] || '',
        status: a.status || '', year: a.year || null,
        cover: filename ? 'https://uploads.mangadex.org/covers/' + m.id + '/' + filename + '.256.jpg' : '',
        url: 'https://mangadex.org/title/' + m.id,
        source: 'MangaDex'
      };
    });
    return res.status(200).json({ results: data, source: 'MangaDex' });
  } catch (e) {
    return res.status(502).json({ error: 'MangaDex is temporarily unavailable. Please try again.', detail: String(e.message || e) });
  }
}
