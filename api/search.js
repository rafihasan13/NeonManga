export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); return res.status(204).end(); }
  const q = String(req.query.q || '').trim();
  const mode = String(req.query.mode || 'search');
  if (!q && !['latest','trending','popular'].includes(mode)) return res.status(400).json({error:'Enter a title to search.'});
  const params = new URLSearchParams();
  params.set('limit', mode === 'latest' ? '24' : '24');
  params.set('includes[]','cover_art');
  params.set('availableTranslatedLanguage[]','en');
  if (mode === 'latest') {
    params.set('order[latestUploadedChapter]','desc');
    params.set('hasAvailableChapters','true');
  } else if (mode === 'trending' || mode === 'popular' || !q) {
    params.set('order[followedCount]','desc');
  } else {
    params.set('title',q);
    params.set('order[relevance]','desc');
  }
  try {
    const upstream = await fetch('https://api.mangadex.org/manga?' + params.toString(), {headers:{'User-Agent':'NeonManga/0.3'}});
    if (!upstream.ok) return res.status(upstream.status).json({error:'MangaDex API returned '+upstream.status});
    const body = await upstream.json();
    const mangas = body.data || [];
    const ids = mangas.map(m=>m.id).filter(Boolean);
    const coverByManga = new Map();
    if(ids.length) {
      const cp = new URLSearchParams();
      ids.forEach(id=>cp.append('manga[]',id));
      cp.set('limit',String(Math.min(100,ids.length*5)));
      cp.set('order[volume]','desc');
      const cr = await fetch('https://api.mangadex.org/cover?'+cp.toString(),{headers:{'User-Agent':'NeonManga/0.3'}});
      if(cr.ok) {
        const cb = await cr.json();
        for(const cv of cb.data||[]) {
          const mid=(cv.relationships||[]).find(x=>x.type==='manga')?.id;
          const fn=cv.attributes?.fileName;
          if(mid&&fn&&!coverByManga.has(mid)) coverByManga.set(mid,fn);
        }
      }
    }
    const data = mangas.map(m=>{
      const a=m.attributes||{}, rel=m.relationships||[];
      const relCover=rel.find(x=>x.type==='cover_art');
      const filename=coverByManga.get(m.id)||relCover?.attributes?.fileName;
      const title=a.title?.en||Object.values(a.title||{})[0]||'Untitled';
      const tags=(a.tags||[]).map(t=>t.attributes?.name?.en).filter(Boolean);
      return {id:m.id,title,altTitles:(a.altTitles||[]).flatMap(x=>Object.values(x)),description:a.description?.en||Object.values(a.description||{})[0]||'',status:a.status||'',year:a.year||null,tags,cover:filename?'https://uploads.mangadex.org/covers/'+m.id+'/'+filename+'.512.jpg':'',coverFallback:filename?'https://uploads.mangadex.org/covers/'+m.id+'/'+filename+'.256.jpg':'',url:'https://mangadex.org/title/'+m.id,source:'MangaDex'};
    });
    // If the source does not have a real cover file, use a title-specific AniList cover when available.
    const missing=data.filter(x=>!x.cover);
    if(missing.length) {
      const safeTitle=missing.slice(0,8);
      await Promise.all(safeTitle.map(async item=>{
        try {
          const gql='query ($search:String) { Media(search:$search,type:MANGA) { coverImage { large extraLarge } title { english romaji } } }';
          const ar=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:gql,variables:{search:item.title}})});
          if(ar.ok){const aj=await ar.json();const media=aj.data?.Media;const url=media?.coverImage?.extraLarge||media?.coverImage?.large;if(url)item.cover=url;}
        } catch {}
      }));
    }
    return res.status(200).json({results:data,source:'MangaDex'});
  } catch(e) { return res.status(502).json({error:'MangaDex is temporarily unavailable. Please try again.',detail:String(e.message||e)}); }
}
