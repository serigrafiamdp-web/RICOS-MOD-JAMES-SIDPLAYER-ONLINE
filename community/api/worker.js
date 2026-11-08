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
async function hashSecret(secret){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
async function hasValidBetaKey(request,env){
 const configured=env.BETA_EDIT_KEY;
 const supplied=request.headers.get('X-Beta-Key')||'';
 if(typeof configured!=='string'||!configured)return false;
 if(typeof supplied!=='string'||!supplied||supplied.length>128)return false;
 return (await hashSecret(supplied))===(await hashSecret(configured));
}
// TEST83: contributed SID files are stored under their SHA-256 content IDs in R2.
// No modification to the existing HVSC-only playlist registry.
function sidBase64Bytes(value) {
  if(typeof value!=='string'||!value.length||value.length>96000||
     !/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('Invalid SID binary encoding');
  const binary=atob(value);
  if(binary.length<118||binary.length>65536)throw Error('SID size must be 118–65536 bytes');
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  const magic=String.fromCharCode(...bytes.slice(0,4));
  if(magic!=='PSID'&&magic!=='RSID')throw Error('Not a PSID/RSID file');
  const version=(bytes[4]<<8)|bytes[5];
  const offset=(bytes[6]<<8)|bytes[7];
  if(version<1||version>4||offset<118||offset>=bytes.length)
    throw Error('Invalid SID header');
  return bytes;
}
async function sidSha(bytes){
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
// TEST84: optional GitHub-backed SID storage for a small, beta-key-authorized group.
// GitHub credential is a Worker secret limited to the dedicated asset repository.
// Keep this repo independent of the player's source and of HVSC.
const SID_GITHUB_REPO='serigrafiamdp-web/ricos-sid-uploads';
function githubSidHeaders(env){
  return {'Authorization':'Bearer '+env.GITHUB_SID_TOKEN,
    'Accept':'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'ricos-sid-community-worker'};
}
function githubSidUrl(id){
  if(!/^[0-9a-f]{64}$/.test(id))throw Error('Invalid asset digest');
  return 'https://api.github.com/repos/'+SID_GITHUB_REPO+'/contents/sid/'+id+'.sid';
}
function sidUploadProvider(env){
  if(env.SID_BUCKET)return 'r2';
  if(env.GITHUB_SID_TOKEN)return 'github';
  return '';
}
async function githubSidRead(id,env){
  // Repository is public, but this uses GitHub's Contents API to avoid
  // propagation delays of raw.githubusercontent.com immediately after upload.
  const response=await fetch(githubSidUrl(id),{
    headers:{'Accept':'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28','User-Agent':'ricos-sid-community-worker'},
    cf:{cacheTtl:0}
  });
  if(response.status===404)return null;
  if(!response.ok)throw Error('GitHub SID read error ('+response.status+')');
  const data=await response.json();
  if(data.encoding!=='base64'||typeof data.content!=='string')throw Error('Invalid GitHub asset');
  const bytes=sidBase64Bytes(data.content.replace(/\s+/g,''));
  if((await sidSha(bytes))!==id)throw Error('SID asset content does not match hash');
  return bytes;
}
async function githubSidPut(item,env){
  const url=githubSidUrl(item.id);
  const headers=githubSidHeaders(env);
  const existing=await fetch(url,{headers,cf:{cacheTtl:0}});
  if(existing.ok){
    // Existing filename is content-addressed. Reject unexpected corruption.
    const same=await githubSidRead(item.id,env);
    if(!same)throw Error('SID content disappeared from GitHub');
    return;
  }
  if(existing.status!==404)throw Error('GitHub lookup failed ('+existing.status+')');
  let binary='';
  for(let i=0;i<item.bytes.length;i+=8192)
    binary+=String.fromCharCode(...item.bytes.subarray(i,i+8192));
  const encoded=btoa(binary);
  const saved=await fetch(url,{method:'PUT',headers:{...headers,
    'Content-Type':'application/json'},body:JSON.stringify({
      message:'Add contributed SID '+item.id,
      content:encoded,branch:'main'
    })});
  if(!saved.ok)throw Error('GitHub SID write failed ('+saved.status+')');
}

async function contributedCollections(request,env,url,origin){
  const provider=sidUploadProvider(env);
  const enabled=!!(provider&&env.DB&&env.BETA_EDIT_KEY);
  if(request.method==='GET'&&url.pathname==='/collections'){
    if(!env.DB)return text('Database not configured',503,origin);
    const rows=await env.DB.prepare(
      'SELECT id,title,creator,track_count FROM sid_collections ORDER BY created_at DESC LIMIT 500'
    ).all();
    return json({format:'ricos-sid-collections',version:1,collections:rows.results.map(x=>({
      id:x.id,name:x.title,createdBy:x.creator,tracks:x.track_count
    }))},200,origin);
  }
  const match=/^\/collections\/([0-9a-f-]{36})$/.exec(url.pathname);
  if(request.method==='GET'&&match){
    if(!env.DB)return text('Database not configured',503,origin);
    const record=await env.DB.prepare(
      'SELECT id,title,creator,track_count FROM sid_collections WHERE id=?'
    ).bind(match[1]).first();
    if(!record)return text('Collection not found',404,origin);
    const rows=await env.DB.prepare(
      'SELECT position,sid_id,filename FROM sid_collection_tracks WHERE collection_id=? ORDER BY position ASC'
    ).bind(record.id).all();
    return json({format:'ricos-sid-collection',version:1,id:record.id,name:record.title,
      createdBy:record.creator,tracks:rows.results.map(x=>({sidId:x.sid_id,file:x.filename}))},200,origin);
  }
  const asset=/^\/sid-assets\/([0-9a-f]{64})$/.exec(url.pathname);
  if(request.method==='GET'&&asset){
    if(!provider)return text('SID storage unavailable',503,origin);
    const headers={'content-type':'application/octet-stream',
      'cache-control':'public, max-age=31536000, immutable',
      'x-content-type-options':'nosniff'};
    if(origin===ORIGIN)headers['access-control-allow-origin']=origin;
    try {
      if(provider==='r2'){
        const object=await env.SID_BUCKET.get('sid/'+asset[1]+'.sid');
        return object?new Response(object.body,{status:200,headers}):
          text('SID file not found',404,origin);
      }
      const bytes=await githubSidRead(asset[1],env);
      return bytes?new Response(bytes,{status:200,headers}):
        text('SID file not found',404,origin);
    }catch(error){console.error('SID read error',error);return text('SID temporarily unavailable',503,origin);}
  }
  if(request.method!=='POST'||url.pathname!=='/collections')return null;
  if(origin!==ORIGIN)return text('Origin not allowed',403,origin);
  if(!enabled)return text('SID publishing unavailable: configure D1 and an asset provider first',503,origin);
  if(!(await hasValidBetaKey(request,env)))return text('Invalid beta key',403,origin);
  if((Number(request.headers.get('Content-Length'))||0)>1800000)
    return text('Collection exceeds 1.8 MB upload limit',413,origin);
  let data,raw;
  try{raw=await request.text();if(raw.length>1800000)throw Error('Upload too large');
      data=JSON.parse(raw);}catch(e){return text('Invalid collection payload',400,origin);}
  const uploadLimit=provider==='github'?15:40;
  if(!data||data.format!=='ricos-sid-upload'||data.version!==1||
     typeof data.name!=='string'||!data.name.trim()||data.name.trim().length>100||
     typeof data.createdBy!=='string'||!data.createdBy.trim()||data.createdBy.trim().length>60||
     !Array.isArray(data.tracks)||!data.tracks.length||data.tracks.length>uploadLimit)
     return text('Invalid collection metadata or number of SID files (1–'+uploadLimit+')',400,origin);
  const prepared=[];let total=0;
  try{
    for(const entry of data.tracks){
      if(!entry||typeof entry.file!=='string'||!/^[^<>:*?|\\/]{1,200}\.sid$/i.test(entry.file))
        throw Error('Invalid SID filename');
      const bytes=sidBase64Bytes(entry.sidBase64);
      total+=bytes.length;if(total>1200000)throw Error('SID binary total exceeds 1.2 MB');
      prepared.push({file:entry.file,bytes,id:await sidSha(bytes)});
    }
  }catch(error){return text(error.message,400,origin);}
  // Optional rate limit is shared with public playlists, and key authorization
  // is mandatory. Failed DB commits never create visible collection references.
  const now=Date.now();
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const ipHash=await hashSecret(ip+':'+(env.RATE_SALT||''));
  const count=await env.DB.prepare('SELECT COUNT(*) as n FROM submissions WHERE ip_hash=? AND created_ms>?')
    .bind(ipHash,now-3600000).first();
  if((count?.n||0)>=5)return text('Too many publications this hour',429,origin);
  try{
    const unique=new Map(prepared.map(x=>[x.id,x]));
    for(const item of unique.values()){
      const key='sid/'+item.id+'.sid';
      if(provider==='r2'){
        if(!(await env.SID_BUCKET.head(key))){
          await env.SID_BUCKET.put(key,item.bytes,{httpMetadata:{contentType:'application/octet-stream'}});
        }
      }else{
        await githubSidPut(item,env);
      }
    }
    const id=crypto.randomUUID();
    const operations=[
      env.DB.prepare('INSERT INTO sid_collections(id,title,creator,track_count,created_at) VALUES(?,?,?,?,?)')
        .bind(id,data.name.trim(),data.createdBy.trim(),prepared.length,now),
      ...prepared.map((t,i)=>env.DB.prepare(
        'INSERT INTO sid_collection_tracks(collection_id,position,sid_id,filename) VALUES(?,?,?,?)'
      ).bind(id,i,t.id,t.file)),
      ...[...unique.values()].map(t=>env.DB.prepare(
        'INSERT OR IGNORE INTO sid_assets(id,size,created_at) VALUES(?,?,?)'
      ).bind(t.id,t.bytes.length,now)),
      env.DB.prepare('INSERT INTO submissions(ip_hash,created_ms) VALUES(?,?)').bind(ipHash,now)
    ];
    await env.DB.batch(operations);
    return json({id,name:data.name.trim(),tracks:prepared.length,published:true},201,origin);
  }catch(error){
    console.error('SID collection publish failed',error);
    return text('Unable to store SID collection. Try again.',500,origin);
  }
}

export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const url=new URL(request.url);
  if(request.method==='OPTIONS'){
   if(origin!==ORIGIN)return new Response(null,{status:403});
   return new Response(null,{status:204,headers:{
    'access-control-allow-origin':origin,'access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers':'Content-Type, X-Beta-Key','access-control-max-age':'86400'}});
  }
  if(request.method==='POST' && origin!==ORIGIN)return text('Origin not allowed',403,origin);
  // Independent non-HVSC binary collection endpoints.
  if(url.pathname==='/collections'||url.pathname.startsWith('/collections/')||
     url.pathname.startsWith('/sid-assets/')){
    const contributed=await contributedCollections(request,env,url,origin);
    if(contributed)return contributed;
  }

  if(request.method==='GET' && url.pathname==='/capabilities'){
    return json({format:'ricos-community-capabilities',version:1,
      betaKeyRequired:true,editMode:'metadata-and-delete',
      sidUploadsEnabled:!!(sidUploadProvider(env)&&env.DB&&env.BETA_EDIT_KEY),
      sidUploadProvider:sidUploadProvider(env)||null,
      sidUploadLimit:sidUploadProvider(env)==='github'?15:40,
      configured:!!env.BETA_EDIT_KEY},200,origin);
  }
  if(request.method==='GET' && url.pathname==='/playlists'){
    const rows=await env.DB.prepare('SELECT id, title, creator, track_count FROM playlists ORDER BY created_at ASC LIMIT 500').all();
    return json({format:'ricos-community-catalog',version:1,playlists:rows.results.map(x=>({id:x.id,title:x.title,createdBy:x.creator,tracks:x.track_count}))},200,origin);
  }
  const match=/^\/playlists\/([a-z0-9-]{12,48})$/.exec(url.pathname);
  if(request.method==='GET' && match){
    const row=await env.DB.prepare('SELECT payload FROM playlists WHERE id=?').bind(match[1]).first();
    return row?json(JSON.parse(row.payload),200,origin):text('Playlist not found',404,origin);
  }
  const updateMatch=/^\/playlists\/([a-z0-9-]{12,48})$/.exec(url.pathname);
  const isCreate=request.method==='POST'&&url.pathname==='/playlists';
  const isUpdate=request.method==='PUT'&&!!updateMatch;
  const isMetadata=request.method==='PATCH'&&!!updateMatch;
  const isDelete=request.method==='DELETE'&&!!updateMatch;
  if(!isCreate&&!isUpdate&&!isMetadata&&!isDelete)return text('Not found',404,origin);
  if(origin!==ORIGIN)return text('Origin not allowed',403,origin);
  // Every persistent write, including metadata and deletion, requires server authorization.
  if(!(await hasValidBetaKey(request,env)))return text('Invalid beta key or server beta key not configured',403,origin);
  if(isDelete){
    const row=await env.DB.prepare('SELECT id FROM playlists WHERE id=?').bind(updateMatch[1]).first();
    if(!row)return text('Playlist not found',404,origin);
    await env.DB.prepare('DELETE FROM playlists WHERE id=?').bind(row.id).run();
    return json({deleted:true,id:row.id},200,origin);
  }
  if((Number(request.headers.get('Content-Length'))||0)>180000)return text('Payload too large',413,origin);
  let data;
  try{const raw=await request.text();if(raw.length>180000)return text('Payload too large',413,origin);data=JSON.parse(raw);}
  catch(e){return text('Invalid JSON',400,origin);}
  if(isMetadata){
    if(!data||typeof data.name!=='string'||!data.name.trim()||data.name.trim().length>100||
      typeof data.createdBy!=='string'||!data.createdBy.trim()||data.createdBy.trim().length>60)
      return text('Invalid title or creator',400,origin);
    const record=await env.DB.prepare('SELECT id, payload FROM playlists WHERE id=?')
      .bind(updateMatch[1]).first();
    if(!record)return text('Playlist not found',404,origin);
    const prior=JSON.parse(record.payload);
    prior.name=data.name.trim();
    prior.createdBy=data.createdBy.trim();
    prior.updatedAt=new Date().toISOString();
    const result=await env.DB.prepare(
      'UPDATE playlists SET title=?,creator=?,payload=? WHERE id=? AND payload=?')
      .bind(prior.name,prior.createdBy,JSON.stringify(prior),record.id,record.payload).run();
    if(result.meta?.changes!==1)return text('Playlist changed; reload before editing',409,origin);
    return json({id:record.id,title:prior.name,createdBy:prior.createdBy,tracks:prior.tracks.length,updated:true},200,origin);
  }
  if(!data||data.format!=='ricos-sid-playlist'||data.version!==2||
    typeof data.name!=='string'||!data.name.trim()||data.name.length>100||
    typeof data.createdBy!=='string'||!data.createdBy.trim()||data.createdBy.length>60||
    !Array.isArray(data.tracks)||!data.tracks.length||data.tracks.length>2000||
    !data.tracks.every(validReference))return text('Invalid playlist metadata or SID references',400,origin);
  const tracks=data.tracks.map(x=>({pack:x.pack,file:x.file}));
  if(new Set(tracks.map(t=>t.pack+'::'+t.file)).size!==tracks.length)return text('Duplicate SID reference',400,origin);
  const now=Date.now();
  if(isUpdate){
    const record=await env.DB.prepare('SELECT id,title,creator,created_at,payload FROM playlists WHERE id=?')
      .bind(updateMatch[1]).first();
    if(!record)return text('Playlist not found',404,origin);
    if(data.name.trim()!==record.title||data.createdBy.trim()!==record.creator)
      return text('Name and creator cannot change in removal-only edits',400,origin);
    const original=JSON.parse(record.payload);
    if(!Array.isArray(original.tracks))return text('Stored playlist invalid',500,origin);
    // Only removals are allowed: same order, no new SID entries, no reordering.
    let cursor=0;
    for(const track of tracks){
      while(cursor<original.tracks.length &&
        (original.tracks[cursor].pack!==track.pack||original.tracks[cursor].file!==track.file))cursor++;
      if(cursor>=original.tracks.length)return text('Only removing existing SID is allowed',400,origin);
      cursor++;
    }
    if(tracks.length>=original.tracks.length)
      return text('Remove at least one SID before saving',400,origin);
    const payload={...original,tracks,updatedAt:new Date(now).toISOString()};
    // Optimistic concurrency: old payload must still match, to avoid stale overwrites.
    const write=await env.DB.prepare(
      'UPDATE playlists SET track_count=?,payload=? WHERE id=? AND payload=?')
      .bind(tracks.length,JSON.stringify(payload),record.id,record.payload).run();
    if(write.meta?.changes!==1)return text('Playlist changed; reload before editing',409,origin);
    return json({id:record.id,title:record.title,createdBy:record.creator,tracks:tracks.length,updated:true},200,origin);
  }
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const ipHash=await hashSecret(ip+':'+(env.RATE_SALT||''));
  const count=await env.DB.prepare('SELECT COUNT(*) as n FROM submissions WHERE ip_hash=? AND created_ms>?')
    .bind(ipHash,now-3600000).first();
  if((count?.n||0)>=5)return text('Too many playlists; try again later',429,origin);
  const id=crypto.randomUUID();
  const payload={format:'ricos-sid-playlist',version:2,id,name:data.name.trim(),
    createdBy:data.createdBy.trim(),createdAt:new Date(now).toISOString(),tracks};
  await env.DB.batch([
    env.DB.prepare('INSERT INTO playlists(id,title,creator,track_count,payload,created_at) VALUES(?,?,?,?,?,?)')
      .bind(id,payload.name,payload.createdBy,tracks.length,JSON.stringify(payload),now),
    env.DB.prepare('INSERT INTO submissions(ip_hash,created_ms) VALUES(?,?)').bind(ipHash,now)
  ]);
  return json({id,title:payload.name,createdBy:payload.createdBy,tracks:tracks.length},201,origin);
 }
};
