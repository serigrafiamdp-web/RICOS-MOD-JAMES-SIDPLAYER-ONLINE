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
// TEST165: playlists may reference the verified HVSC pack OR one immutable
// contributed SID asset from NO HVSC (never arbitrary remote URLs).
function validReference(x){
  if(!x||typeof x.file!=='string'||x.file.length>220||
     !/^[^<>:*?|\\/]{1,220}\.sid$/i.test(x.file))return false;
  if(typeof x.sidId==='string')return /^[a-f0-9]{64}$/.test(x.sidId)&&!x.pack;
  return typeof x.pack==='string'&&x.pack.length<=260&&
    /^library\/packs\/(?:musicians|demos)\/[A-Za-z0-9_./-]+\.zip$/.test(x.pack)&&
    !x.pack.includes('..')&&!x.file.includes('..')&&!x.file.startsWith('/')&&
    !x.file.includes('\\');
}
function canonicalReference(x){
  return x.sidId?{sidId:x.sidId,file:x.file}:{pack:x.pack,file:x.file};
}
function referenceKey(x){
  return (x.sidId?'sid:'+x.sidId:'pack:'+x.pack)+'::'+x.file;
}
function referencePair(x){return [x.sidId||x.pack,x.file];}
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
  // TEST94: reorder only the existing SID references in a contributed collection.
  // No SID upload, deletion, new asset, title change or track-count change.
  const orderMatch=/^\/collections\/([0-9a-f-]{36})\/order$/.exec(url.pathname);
  if(request.method==='PUT'&&orderMatch){
    if(origin!==ORIGIN)return text('Origin not allowed',403,origin);
    if(!env.DB||!env.BETA_EDIT_KEY)return text('Collection editing unavailable',503,origin);
    if(!(await hasValidBetaKey(request,env)))return text('Invalid beta key',403,origin);
    let data,raw;
    try{
      raw=await request.text();
      if(raw.length>16000)throw Error('Payload too large');
      data=JSON.parse(raw);
    }catch(e){return text('Invalid order payload',400,origin);}
    const id=orderMatch[1];
    const collection=await env.DB.prepare('SELECT id,track_count FROM sid_collections WHERE id=?').bind(id).first();
    if(!collection)return text('Collection not found',404,origin);
    const old=(await env.DB.prepare(
      'SELECT sid_id,filename FROM sid_collection_tracks WHERE collection_id=? ORDER BY position ASC'
    ).bind(id).all()).results;
    if(!old||old.length!==collection.track_count||old.length>40)return text('Invalid stored collection',500,origin);
    if(!data||data.format!=='ricos-sid-order'||data.version!==1||
       !Array.isArray(data.expected)||data.expected.length!==old.length||
       !Array.isArray(data.order)||data.order.length!==old.length||
       data.order.some(x=>!Number.isInteger(x)||x<0||x>=old.length)||
       new Set(data.order).size!==old.length)
       return text('Invalid SID order',400,origin);
    if(!data.expected.every((entry,i)=>entry&&entry.sidId===old[i].sid_id&&entry.file===old[i].filename))
      return text('Collection changed; reload before editing',409,origin);
    if(data.order.every((item,i)=>item===i))
      return json({id,tracks:old.length,updated:false},200,origin);
    const reordered=data.order.map(index=>old[index]);
    const operations=[
      env.DB.prepare('DELETE FROM sid_collection_tracks WHERE collection_id=?').bind(id),
      ...reordered.map((row,i)=>env.DB.prepare(
        'INSERT INTO sid_collection_tracks(collection_id,position,sid_id,filename) VALUES(?,?,?,?)'
      ).bind(id,i,row.sid_id,row.filename))
    ];
    // D1 batch applies changes together, preserving the files and other collection records.
    await env.DB.batch(operations);
    return json({id,tracks:old.length,updated:true},200,origin);
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



// TEST165 — Non-HVSC preservation collection, independent of HVSC. Files are
// immutable and addressed by SHA-256, so re-imports are idempotent. A separate
// payload hash can identify renamed PSID headers during later HVSC research.
const NO_HVSC_COLLECTION_ID='00000000-0000-4000-8000-000000000001';
async function noHvscArchive(request,env,url,origin){
  if(url.pathname!=='/no-hvsc')return null;
  if(!env.DB)return text('Community database unavailable',503,origin);
  const provider=sidUploadProvider(env);
  // Create the provenance schema lazily. This does not modify any existing
  // playlist, SID data or metadata from other collections.
  try{
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS sid_provenance ('+
      'sid_id TEXT PRIMARY KEY, filename TEXT NOT NULL, title TEXT NOT NULL,'+
      'author TEXT NOT NULL, released TEXT NOT NULL, data_hash TEXT NOT NULL,'+
      "hvsc_status TEXT NOT NULL DEFAULT 'unverified', "+
      'first_seen INTEGER NOT NULL)').run();
  }catch(error){console.error('NO HVSC schema failed',error);return text('NO HVSC database unavailable',503,origin);}
  if(request.method==='GET'){
    try{
      const rows=await env.DB.prepare(
        'SELECT sid_id,filename,title,author,released,data_hash,hvsc_status,first_seen '+
        'FROM sid_provenance ORDER BY first_seen DESC LIMIT 10000'
      ).all();
      return json({format:'ricos-no-hvsc',version:1,collectionId:NO_HVSC_COLLECTION_ID,
        tracks:rows.results.map(row=>({sidId:row.sid_id,file:row.filename,
          title:row.title,author:row.author,released:row.released,
          dataHash:row.data_hash,hvscStatus:row.hvsc_status,
          firstSeen:row.first_seen}))},200,origin);
    }catch(error){console.error('NO HVSC fetch failed',error);return text('NO HVSC archive unavailable',503,origin);}
  }
  if(request.method!=='POST')return text('Method not allowed',405,origin);
  if(origin!==ORIGIN)return text('Origin not allowed',403,origin);
  if(!provider||!env.BETA_EDIT_KEY)return text('SID archive storage not configured',503,origin);
  if(!(await hasValidBetaKey(request,env)))return text('Invalid beta key',403,origin);
  if((Number(request.headers.get('Content-Length'))||0)>1800000)
    return text('SID archive request too large',413,origin);
  let data,raw;
  try{
    raw=await request.text();
    if(raw.length>1800000)throw Error('Request too large');
    data=JSON.parse(raw);
  }catch(error){return text('Invalid NO HVSC upload request',400,origin);}
  const maxBatch=provider==='github'?15:40;
  if(!data||data.format!=='ricos-no-hvsc-upload'||data.version!==1||
    !Array.isArray(data.tracks)||!data.tracks.length||data.tracks.length>maxBatch)
    return text('Invalid NO HVSC upload batch',400,origin);
  const entries=[];let total=0;
  try{
    for(const track of data.tracks){
      if(!track||typeof track.file!=='string'||
        !/^[^<>:*?|\/\\]{1,200}\.sid$/i.test(track.file))
        throw Error('Invalid SID filename');
      const bytes=sidBase64Bytes(track.sidBase64);
      total+=bytes.length;if(total>1200000)throw Error('SID batch exceeds storage capacity');
      const offset=(bytes[6]<<8)|bytes[7];
      function field(at){
        return new TextDecoder('latin1').decode(bytes.slice(at,at+32))
          .replace(/\x00.*$/s,'').trim();
      }
      entries.push({id:await sidSha(bytes),bytes,file:track.file,
        title:field(22)||track.file.replace(/\.sid$/i,''),
        author:field(54)||'Unknown',released:field(86)||'',
        dataHash:await sidSha(bytes.subarray(offset))});
    }
  }catch(error){return text(error.message,400,origin);}
  // Always store the original bytes first. If D1 later fails, retrying with
  // the same beta key resumes safely without duplicating the binary assets.
  try{
    const unique=new Map(entries.map(x=>[x.id,x]));
    for(const asset of unique.values()){
      if(provider==='r2'){
        if(!(await env.SID_BUCKET.head('sid/'+asset.id+'.sid')))
          await env.SID_BUCKET.put('sid/'+asset.id+'.sid',asset.bytes,{
            httpMetadata:{contentType:'application/octet-stream'}});
      }else await githubSidPut(asset,env);
    }
    const now=Date.now();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO sid_collections(id,title,creator,track_count,created_at) VALUES(?,?,?,0,?)"
    ).bind(NO_HVSC_COLLECTION_ID,'NO HVSC','SpotySid',now).run();
    const oldRows=await env.DB.prepare(
      'SELECT sid_id FROM sid_collection_tracks WHERE collection_id=? ORDER BY position ASC'
    ).bind(NO_HVSC_COLLECTION_ID).all();
    const known=new Set(oldRows.results.map(x=>x.sid_id));
    const operations=[];
    let added=0;
    for(const asset of unique.values()){
      operations.push(env.DB.prepare(
        'INSERT OR IGNORE INTO sid_assets(id,size,created_at) VALUES(?,?,?)'
      ).bind(asset.id,asset.bytes.length,now));
      operations.push(env.DB.prepare(
        'INSERT OR IGNORE INTO sid_provenance('+
        'sid_id,filename,title,author,released,data_hash,hvsc_status,first_seen) '+
        "VALUES(?,?,?,?,?,?,'unverified',?)"
      ).bind(asset.id,asset.file,asset.title,asset.author,asset.released,asset.dataHash,now));
      if(!known.has(asset.id)){
        known.add(asset.id);
        operations.push(env.DB.prepare(
          'INSERT INTO sid_collection_tracks(collection_id,position,sid_id,filename) VALUES(?,?,?,?)'
        ).bind(NO_HVSC_COLLECTION_ID,oldRows.results.length+added,asset.id,asset.file));
        added++;
      }
    }
    operations.push(env.DB.prepare(
      'UPDATE sid_collections SET track_count=('+
      'SELECT COUNT(*) FROM sid_collection_tracks WHERE collection_id=?) WHERE id=?'
    ).bind(NO_HVSC_COLLECTION_ID,NO_HVSC_COLLECTION_ID));
    await env.DB.batch(operations);
    // Return the deduplicated stable references in the uploaded order.
    return json({format:'ricos-no-hvsc-receipt',version:1,
      collectionId:NO_HVSC_COLLECTION_ID,added,tracks:entries.map(x=>({
        sidId:x.id,file:x.file,title:x.title,author:x.author,
        released:x.released,dataHash:x.dataHash,hvscStatus:'unverified'
      }))},200,origin);
  }catch(error){
    console.error('NO HVSC archive write failed',error);
    return text('SID was not confirmed in NO HVSC. Try again; the original local file is unchanged.',503,origin);
  }
}

// TEST159 — Persist the DISPLAY order of Community Playlist rows, not SID tracks.
// The beta key authorizes global writes; GET is public. D1 revision avoids
// silently overwriting another editor's more recent ordering.
async function communityCatalogOrder(request,env,origin){
  if(!env.DB)return text('Community database unavailable',503,origin);
  const save=request.method==='PUT';
  if(save){
    if(origin!==ORIGIN)return text('Origin not allowed',403,origin);
    if(!(await hasValidBetaKey(request,env)))
      return text('Invalid beta key or server beta key not configured',403,origin);
  }
  try {
    await env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS community_catalog_order ('+
      'scope TEXT PRIMARY KEY, order_json TEXT NOT NULL, '+
      'revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0)'
    ).run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO community_catalog_order(scope,order_json,revision,updated_at) "+
      "VALUES('community','[]',0,0)"
    ).run();
    const read=()=>env.DB.prepare(
      "SELECT order_json,revision,updated_at FROM community_catalog_order WHERE scope='community'"
    ).first();
    if(!save){
      const row=await read();
      const order=JSON.parse(row?.order_json||'[]');
      return json({format:'ricos-community-catalog-order',version:1,
        order,revision:Number(row?.revision)||0,updatedAt:Number(row?.updated_at)||0},200,origin);
    }
    if((Number(request.headers.get('Content-Length'))||0)>90000)
      return text('Catalog order payload too large',413,origin);
    let payload;
    try{
      const body=await request.text();
      if(body.length>90000)return text('Catalog order payload too large',413,origin);
      payload=JSON.parse(body);
    }catch(error){return text('Invalid catalog order JSON',400,origin);}
    const keys=payload?.order;
    const revision=payload?.expectedRevision;
    const validKey=key=>typeof key==='string'&&(
      /^remote:[a-z0-9-]{12,48}$/.test(key)||
      /^static:community\/playlists\/[a-zA-Z0-9_-]+\.json$/.test(key)
    );
    if(!Array.isArray(keys)||!keys.length||keys.length>550||
       !keys.every(validKey)||new Set(keys).size!==keys.length||
       !Number.isSafeInteger(revision)||revision<0)
      return text('Invalid community order or revision',400,origin);
    const now=Date.now();
    const write=await env.DB.prepare(
      "UPDATE community_catalog_order SET order_json=?, revision=revision+1, updated_at=? "+
      "WHERE scope='community' AND revision=?"
    ).bind(JSON.stringify(keys),now,revision).run();
    if(write.meta?.changes!==1)
      return text('Community order changed elsewhere; reload before saving',409,origin);
    return json({format:'ricos-community-catalog-order',version:1,
      order:keys,revision:revision+1,updatedAt:now,saved:true},200,origin);
  }catch(error){
    console.error('Community order save/read failed',error);
    return text('Community catalog order unavailable',503,origin);
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
  if(url.pathname==='/catalog-order' && (request.method==='GET'||request.method==='PUT'))
    return communityCatalogOrder(request,env,origin);
  if(url.pathname==='/no-hvsc')return noHvscArchive(request,env,url,origin);
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
      playlistReorder:true,sidCollectionReorder:true,
      playlistTrackAdditions:true,catalogOrder:true,noHvscArchive:true,
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
  const tracks=data.tracks.map(canonicalReference);
  if(new Set(tracks.map(referenceKey)).size!==tracks.length)return text('Duplicate SID reference',400,origin);
  const now=Date.now();
  if(isUpdate){
    const record=await env.DB.prepare('SELECT id,title,creator,created_at,payload FROM playlists WHERE id=?')
      .bind(updateMatch[1]).first();
    if(!record)return text('Playlist not found',404,origin);
    if(data.name.trim()!==record.title||data.createdBy.trim()!==record.creator)
      return text('Playlist name or creator changed; reload before saving',409,origin);
    const original=JSON.parse(record.payload);
    if(!Array.isArray(original.tracks))return text('Stored playlist invalid',500,origin);
    // TEST118: content-update may add new, verified HVSC references without
    // changing the published ID. Require the exact source snapshot; keep legacy
    // PUT behavior limited to removals and reordering.
    if(data.contentUpdate===true){
      if(typeof data.expectedBaseHash!=='string'||
         !/^[a-f0-9]{64}$/.test(data.expectedBaseHash))
        return text('Expected original playlist hash is required',400,origin);
      const originalRefs=original.tracks.map(referencePair);
      const actualHash=await hashSecret(JSON.stringify(originalRefs));
      if(actualHash!==data.expectedBaseHash)
        return text('Playlist changed since editing started; keep your draft and reload the public list',409,origin);
    }else{
      const originalKeys=new Set(original.tracks.map(referenceKey));
      if(tracks.some(t=>!originalKeys.has(referenceKey(t))))
        return text('Only reordering or removing existing SID is allowed',400,origin);
    }
    if(tracks.length===original.tracks.length&&
       tracks.every((t,i)=>referenceKey(t)===referenceKey(original.tracks[i])))
      return text('No playlist changes to save',400,origin);
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
