// RICOS MOD — public playlist registry. Cloudflare Worker + D1.
// No SID bytes are accepted or stored. Only HVSC pack/file references.
const ORIGIN='https://serigrafiamdp-web.github.io';
const SITE_PATH='/RICOS-MOD-JAMES-SIDPLAYER-ONLINE';
function json(value,status=200,origin=''){
  const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
  if(origin===ORIGIN)headers['access-control-allow-origin']=origin;
  return new Response(JSON.stringify(value),{status,headers});
}
function text(value,status,origin){return json({error:value},status,origin);}
function validReference(x){
  return !!x && typeof x.pack==='string' && typeof x.file==='string'
    && x.pack.length<=260 && x.file.length<=220
    && /^library\/packs\/(?:musicians|demos)\/[A-Za-z0-9_./-]+\.zip$/.test(x.pack)
    && !x.pack.includes('..') && !x.file.includes('..') && !x.file.startsWith('/')
    && !x.file.includes('\\') && /^[^<>:*?|]+\.sid$/i.test(x.file);
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const url=new URL(request.url);
  if(request.method==='OPTIONS'){
   if(origin!==ORIGIN)return new Response(null,{status:403});
   return new Response(null,{status:204,headers:{
    'access-control-allow-origin':origin,'access-control-allow-methods':'GET, POST, OPTIONS',
    'access-control-allow-headers':'Content-Type','access-control-max-age':'86400'}});
  }
  if(request.method==='POST' && origin!==ORIGIN)return text('Origin not allowed',403,origin);
  if(request.method==='GET' && url.pathname==='/playlists'){
    const rows=await env.DB.prepare('SELECT id, title, creator, track_count FROM playlists ORDER BY created_at ASC LIMIT 500').all();
    return json({format:'ricos-community-catalog',version:1,playlists:rows.results.map(x=>({id:x.id,title:x.title,createdBy:x.creator,tracks:x.track_count}))},200,origin);
  }
  const match=/^\/playlists\/([a-z0-9-]{12,48})$/.exec(url.pathname);
  if(request.method==='GET' && match){
    const row=await env.DB.prepare('SELECT payload FROM playlists WHERE id=?').bind(match[1]).first();
    return row?json(JSON.parse(row.payload),200,origin):text('Playlist not found',404,origin);
  }
  if(request.method!=='POST'||url.pathname!=='/playlists')return text('Not found',404,origin);
  if((Number(request.headers.get('Content-Length'))||0)>180000)return text('Payload too large',413,origin);
  let data;
  try{const raw=await request.text();if(raw.length>180000)return text('Payload too large',413,origin);data=JSON.parse(raw);}catch(e){return text('Invalid JSON',400,origin);}
  if(!data||data.format!=='ricos-sid-playlist'||data.version!==2||
    typeof data.name!=='string'||!data.name.trim()||data.name.length>100||
    typeof data.createdBy!=='string'||!data.createdBy.trim()||data.createdBy.length>60||
    !Array.isArray(data.tracks)||!data.tracks.length||data.tracks.length>2000||
    !data.tracks.every(validReference))return text('Invalid playlist metadata or SID references',400,origin);
  const tracks=data.tracks.map(x=>({pack:x.pack,file:x.file}));
  if(new Set(tracks.map(t=>t.pack+'::'+t.file)).size!==tracks.length)return text('Duplicate SID reference',400,origin);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  // Rate limit; hash the IP so it is never stored in plain text.
  const bytes=new TextEncoder().encode(ip+':'+(env.RATE_SALT||''));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const key=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
  const now=Date.now(),hour=now-3600000;
  const count=await env.DB.prepare('SELECT COUNT(*) as n FROM submissions WHERE ip_hash=? AND created_ms>?').bind(key,hour).first();
  if((count?.n||0)>=5)return text('Too many playlists; try again later',429,origin);
  const uuid=crypto.randomUUID(),id=uuid;
  const payload={format:'ricos-sid-playlist',version:2,id,name:data.name.trim(),
    createdBy:data.createdBy.trim(),createdAt:new Date(now).toISOString(),tracks};
  await env.DB.batch([
    env.DB.prepare('INSERT INTO playlists(id,title,creator,track_count,payload,created_at) VALUES(?,?,?,?,?,?)')
      .bind(id,payload.name,payload.createdBy,tracks.length,JSON.stringify(payload),now),
    env.DB.prepare('INSERT INTO submissions(ip_hash,created_ms) VALUES(?,?)').bind(key,now)
  ]);
  return json({id,title:payload.name,createdBy:payload.createdBy,tracks:tracks.length},201,origin);
 }
};
