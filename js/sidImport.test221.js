/* TEST221 — Exact HVSC + NO HVSC import audit. No upload happens here.
   SHA-256 is computed on the FULL original PSID/RSID bytes. Equal names or
   similar titles never count as a match. */
(function(root){
  'use strict';
  var indexPromise=null,archiveCache=new Map(),fileHashes=new Map();
  var UCTUMI_PACK='library/packs/musicians/U/Uctumi.zip';
  var FIX_FILE='Mujer_Amante.sid';
  // This particular file is a SpotySid supplemental replacement, NOT an
  // official HVSC #85 match. Keep it eligible for NO HVSC FIX preservation.
  function supplemental(pack,file){return pack===UCTUMI_PACK&&file===FIX_FILE;}
  function notify(options,stage,done,total){
    if(options&&typeof options.progress==='function')
      options.progress(stage,done,total);
  }
  async function hash(bytes){
    if(!root.crypto||!root.crypto.subtle)throw Error('Secure SHA-256 unavailable');
    var result=await root.crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(result),function(v){
      return v.toString(16).padStart(2,'0');
    }).join('');
  }
  async function fetchJson(url){
    var response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('HVSC index unavailable ('+response.status+')');
    return response.json();
  }
  function makeIndex(progress){
    return (async function(){
      var overview=await fetchJson('library/index.json');
      if(!overview||overview.format!=='ricos-hvsc-library'||!overview.categories)
        throw Error('Invalid HVSC library index');
      var shelves=[];
      ['musicians','demos'].forEach(function(category){
        var sections=overview.categories[category];
        if(sections&&Array.isArray(sections.shelves))
          shelves.push.apply(shelves,sections.shelves.filter(function(s){
            return typeof s.file==='string'&&/^library\/data\/[A-Za-z0-9_-]+\.json$/.test(s.file);
          }));
      });
      if(!shelves.length)throw Error('Empty HVSC index');
      var bySize=new Map(),cursor=0,completed=0,workers=[];
      notify({progress},'CHECKING HVSC',0,shelves.length);
      async function work(){
        while(cursor<shelves.length){
          var at=cursor++,file=shelves[at].file;
          var shelf=await fetchJson(file);
          if(!shelf||!Array.isArray(shelf.sections))throw Error('Invalid HVSC shelf: '+file);
          shelf.sections.forEach(function(section){
            if(!Array.isArray(section.tracks))return;
            section.tracks.forEach(function(track){
              var pack=track.pack||section.pack,size=track.bytes;
              if(!Number.isSafeInteger(size)||size<118||typeof pack!=='string'||
                 !/^library\/packs\/(?:musicians|demos)\/[A-Za-z0-9_.\/-]+\.zip$/.test(pack)||
                 pack.includes('..')||typeof track.file!=='string'||track.file.includes('..')||
                 !/\.sid$/i.test(track.file)||supplemental(pack,track.file))return;
              var list=bySize.get(size);
              if(!list){list=[];bySize.set(size,list);}
              list.push({pack:pack,file:track.file});
            });
          });
          completed++;
          notify({progress},'CHECKING HVSC',completed,shelves.length);
        }
      }
      for(var i=0;i<Math.min(5,shelves.length);i++)workers.push(work());
      await Promise.all(workers);
      return bySize;
    })();
  }
  async function index(progress){
    if(!indexPromise)indexPromise=makeIndex(progress).catch(function(error){
      indexPromise=null;throw error;
    });
    var result=await indexPromise;
    notify({progress},'CHECKING HVSC',1,1);
    return result;
  }
  async function getZip(pack){
    if(!root.JSZip)throw Error('SID archive decoder unavailable');
    var old=archiveCache.get(pack);
    if(old)return old;
    var job=(async function(){
      var source=pack===UCTUMI_PACK?pack+'?v=test213mujerfix':pack;
      var response=await fetch(source);
      if(!response.ok)throw Error('HVSC archive unavailable ('+response.status+'): '+pack);
      return root.JSZip.loadAsync(await response.arrayBuffer());
    })();
    archiveCache.set(pack,job);
    if(archiveCache.size>8){
      var first=archiveCache.keys().next().value;
      if(first!==pack)archiveCache.delete(first);
    }
    try{return await job;}
    catch(error){archiveCache.delete(pack);throw error;}
  }
  async function compare(candidate,digest){
    var key=candidate.pack+'::'+candidate.file,existing=fileHashes.get(key);
    if(!existing){
      existing=(async function(){
        var zip=await getZip(candidate.pack);
        var item=zip.file(candidate.file);
        if(!item)throw Error('HVSC SID missing: '+candidate.file);
        return hash(await item.async('uint8array'));
      })();
      fileHashes.set(key,existing);
    }
    try{return (await existing)===digest;}
    catch(error){fileHashes.delete(key);throw error;}
  }
  async function isKnownUctumiFix(entry,digest){
    if(!entry||!entry.localBytes||entry.localBytes.length!==7667||
       !/mujer\s*amante/i.test(String(entry.name||'').replace(/_/g,' ')))return false;
    return compare({pack:UCTUMI_PACK,file:FIX_FILE},digest);
  }
  function sameResult(target,prior){
    if(prior._hvscRef)target._hvscRef={pack:prior._hvscRef.pack,file:prior._hvscRef.file};
    if(prior._noHvscAssetId){
      target._noHvscAssetId=prior._noHvscAssetId;
      target._noHvscFile=prior._noHvscFile;
    }
    if(prior._noHvscFix)target._noHvscFix=true;
  }
  async function analyze(entries,options){
    options=options||{};
    if(!Array.isArray(entries)||!entries.length)
      return {hvsc:0,noHvsc:0,missing:0,repeated:0};
    var hashes=new Map(),ids=[];
    notify(options,'ANALYZING',0,entries.length);
    for(var i=0;i<entries.length;i++){
      var entry=entries[i];
      if(!(entry.localBytes instanceof Uint8Array))throw Error('Invalid imported SID data');
      var digest=await hash(entry.localBytes);
      entry._ricoSha256=digest;
      ids.push(digest);
      notify(options,'ANALYZING',i+1,entries.length);
    }
    var bySize=await index(options.progress);
    var response=await fetch(options.apiBase+'/no-hvsc',{cache:'no-store'});
    if(!response.ok)throw Error('NO HVSC index unavailable ('+response.status+')');
    var archive=await response.json();
    if(!archive||!Array.isArray(archive.tracks))
      throw Error('Invalid NO HVSC index');
    var known=new Map(archive.tracks.filter(function(row){
      return row&&typeof row.sidId==='string'&&/^[a-f0-9]{64}$/.test(row.sidId);
    }).map(function(row){return [row.sidId,row];}));
    var hvsc=0,noHvsc=0,missing=0,repeated=0;
    notify(options,'CHECKING HVSC',0,entries.length);
    for(var n=0;n<entries.length;n++){
      var track=entries[n],id=ids[n],prior=hashes.get(id);
      if(prior){
        sameResult(track,prior);repeated++;
      }else{
        hashes.set(id,track);
        var matches=bySize.get(track.localBytes.length)||[],found=null;
        // Fast check first: likely filename/artist; then exhaustive same-size
        // candidates for exact content, including differently named files.
        var base=String(track.file||'').split('/').pop().toLowerCase();
        var list=matches.slice().sort(function(a,b){
          var ap=a.file.toLowerCase()===base?0:1;
          var bp=b.file.toLowerCase()===base?0:1;
          return ap-bp;
        });
        for(var j=0;j<list.length;j++){
          // The bar advances even while checking multiple ZIPs for one SID.
          if(j%3===0)notify(options,'CHECKING HVSC',
            n+j/Math.max(1,list.length),entries.length);
          if(await compare(list[j],id)){found=list[j];break;}
        }
        if(found){
          track._hvscRef={pack:found.pack,file:found.file};
          hvsc++;
        }else if(known.has(id)){
          track._noHvscAssetId=id;
          track._noHvscFile=known.get(id).file;
          noHvsc++;
        }else{
          // SpotySid's supplemental Mujer Amante repair must go to NO HVSC
          // as FIX, not be misclassified as an original HVSC SID.
          track._noHvscFix=await isKnownUctumiFix(track,id);
          missing++;
        }
      }
      notify(options,'CHECKING HVSC',n+1,entries.length);
    }
    return {hvsc:hvsc,noHvsc:noHvsc,missing:missing,repeated:repeated};
  }
  root.RicoSidImport={analyze:analyze};
})(window);
