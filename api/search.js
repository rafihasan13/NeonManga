export default async function handler(req, res) {
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method==='OPTIONS') return res.status(204).end();
  const q=String(req.query.q||'').trim();
  const mode=String(req.query.mode||'search');
  if(!q && !['latest','trending','popular'].includes(mode)) return res.status(400).json({error:'Enter a title to search.'});
  const p=new URLSearchParams();
  p.set('limit','24'); p.set('includes[]','cover_art'); p.set('availableTranslatedLanguage[]','en');
  if(mode==='latest'){p.set('order[latestUploadedChapter]','desc');p.set('hasAvailableChapters','true');}
  else if(mode==='trending'||mode==='popular'||!q){p.set('order[followedCount]','desc');}
  else {p.set('title',q);p.set('order[relevance]','desc');}
  try {
    const r=await fetch('https://api.mangadex.org/manga?'+p.toString(),{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'NeonManga/0.3'}});
    if(!r.ok) return res.status(502).json({error:'Manga catalogue temporarily unavailable ('+r.status+').'});
    const j=await r.json();
    const results=(j.data||[]).map(m=>{
      const a=m.attributes||{}, rel=m.relationships||[];
      const cover=rel.find(x=>x.type==='cover_art');
      const filename=cover?.attributes?.fileName;
      const title=a.title?.en||Object.values(a.title||{})[0]||'Untitled';
      return {id:m.id,title,altTitles:(a.altTitles||[]).flatMap(x=>Object.values(x)),description:a.description?.en||Object.values(a.description||{})[0]||'',status:a.status||'',year:a.year||null,tags:(a.tags||[]).map(t=>t.attributes?.name?.en).filter(Boolean),cover:filename?'https://uploads.mangadex.org/covers/'+m.id+'/'+filename+'.512.jpg':'',coverFallback:filename?'https://uploads.mangadex.org/covers/'+m.id+'/'+filename+'.256.jpg':'',url:'https://mangadex.org/title/'+m.id,source:'MangaDex'};
    });
    return res.status(200).json({results,source:'MangaDex'});
  } catch(e) { return res.status(502).json({error:'Could not load manga list. Try again in a moment.'}); }
}