/* SpotySid TEST173: isolated experimental backend for the published LFT playlist.
   This file never changes the bundled TinySID engine and only installs its SID
   sample adapter while a verified LFT-only published playlist is playing.
   libsidplayfp-wasm and its attribution live in ./lft-wasm/. */
(function(){
  'use strict';
  if(!window.sidPlayer||!window.SID||window.RicoLftMode)return;
  var player=window.sidPlayer, sid=window.SID;
  var PACK='library/packs/musicians/L/Lft.zip';
  // TEST177: immutable 66-file approval list taken from HVSC #85 musician index.
  // This is a reference allowlist, not a filename/author guess.
  var APPROVED=new Map([["A_Chipful_of_Love_for_You.sid",5294],["A_Computer_in_My_Backpack.sid",4990],["A_Mind_Is_Born.sid",380],["Air_on_a_Rasterline.sid",2978],["Allt_under_himmelens_faeste.sid",6619],["Allt_under_himmelens_faeste_v2.sid",6569],["Arrow_of_Time.sid",6270],["Cherry_Waffle.sid",5758],["Computational_Soup_2KB.sid",614],["Crank_Crank_Airwolf.sid",2686],["Crank_Crank_Revolution.sid",3710],["Dishwasher_Groove.sid",4990],["Dithered_Island.sid",6270],["Elvendance.sid",4734],["Euclid_Was_Here.sid",6270],["Fargo.sid",4222],["Fjaellevator_Music.sid",5502],["Foerklaedd_Gud_alpha.sid",4740],["Foerklaedd_Gud_beta.sid",4162],["Foerklaedd_Gud_delta.sid",4235],["Foerklaedd_Gud_epsilon.sid",3173],["Foerklaedd_Gud_eta.sid",3532],["Foerklaedd_Gud_gamma.sid",3280],["Foerklaedd_Gud_zeta.sid",3574],["Fratres_Arvo_Paert_2SID.sid",7435],["Fugue_on_a_Theme_by_D_M_Hanlon.sid",3198],["Glyptodont.sid",6270],["Hachi_Bitto_Whirlwind.sid",6526],["Hardsync.sid",4943],["In_Darkness_Hope.sid",6270],["Into_the_Unknown.sid",5502],["King_Fisher_0x28.sid",5463],["Lunatico_End.sid",1022],["Lunatico_Note.sid",6270],["Lunatico_Side_1.sid",5502],["Lunatico_Side_2.sid",5502],["Machine_Yearning_2SID.sid",6313],["Maple_Leaf_Rag.sid",3966],["Nine.sid",4478],["Nymphaea.sid",4754],["Perfectly_Well-Adjusted.sid",5758],["Perpetual_Fragility.sid",435],["Platform_Hopping.sid",12925],["Quintessence.sid",5758],["Quondam_Tunneling.sid",4734],["Racing_the_Beam.sid",6782],["Reminiscence.sid",5502],["Revolutions_Delivered.sid",5246],["Rodents_in_the_Attic.sid",5246],["Scene_Spirit.sid",8176],["Scene_Spirit_v2.sid",7038],["Shards_of_Fancy.sid",4950],["Sideways.sid",8956],["Slaepwerigne.sid",6795],["Sommargubbe.sid",6782],["Specular_Highlight.sid",9813],["Spin_Crazy_World.sid",6014],["Summer_Cloud.sid",6205],["Summer_Cloud_v2.sid",5502],["Thus_Spoke_the_PC_Speaker.sid",6270],["To_Die_For.sid",4734],["To_Die_For_II.sid",3966],["Toy_Rocket.sid",5758],["Trinket.sid",3454],["Withering_Bytes.sid",5246],["Your_Heptacular_Eyes.sid",6526]]);
  var FRAME=4096, HIGH_WATER=8, PRIMING=4;
  var nativeLoad=player.loadSIDData, nativeStop=player.stop;
  var originalSid={}, hooked=false, active=false, engine=null, epoch=0, trackEpoch=0;
  var queue=[], frame=new Float32Array(FRAME), quiet=new Float32Array(FRAME);
  var fillTask=null, lastBytes=null, currentSong=0, songReady=false;
  var approvedNext=null, initTask=null, requestSerial=0;
  var MODE_OFF=/(?:^|[?&])lftmode=off(?:&|$)/i.test(String(window.location&&window.location.search||''));

  function eligible(data,remoteId){
    return !MODE_OFF && typeof remoteId==='string' && /^[a-z0-9-]{12,48}$/i.test(remoteId) &&
      data && data.format==='ricos-sid-playlist' && data.version===2 &&
      String(data.name||'').trim().toUpperCase()==='LFT' &&
      Array.isArray(data.tracks) && data.tracks.length>0 &&
      data.tracks.every(function(t){
        return t && !t.sidId && t.pack===PACK &&
          typeof t.file==='string' && /^[^\/\\]+\.sid$/i.test(t.file);
      });
  }
  function eligibleRef(ref){
    return !MODE_OFF && !!ref && !ref.sidId && ref.pack===PACK &&
      typeof ref.file==='string' && APPROVED.has(ref.file);
  }
  function syncModeLabel(){
    var title=document.getElementById('ricoLivePlaylistTitle');
    if(!title)return;
    var base=title.textContent.replace(/ · LFT MODE ON$/,'');
    title.textContent=base+((active&&songReady&&player.isPlaying)?' · LFT MODE ON':'');
  }
  function sidHeaderOK(bytes){
    if(!(bytes instanceof Uint8Array)||bytes.length<0x7c||bytes.length>256*1024)return false;
    var magic=String.fromCharCode(bytes[0],bytes[1],bytes[2],bytes[3]);
    if(magic!=='PSID'&&magic!=='RSID')return false;
    var offset=(bytes[6]<<8)|bytes[7];
    // Pre-3.1.2 libsidplayfp has a documented out-of-bounds vulnerability
    // on malformed data offsets. Fail closed even though this mode only reads
    // immutable HVSC Lft.zip assets.
    if(offset<0x76||offset+2>bytes.length)return false;
    return true;
  }
  function be16(bytes,p){return (bytes[p]<<8)|bytes[p+1];}
  function credit(bytes,p){
    var out='';
    for(var i=p;i<p+32&&bytes[i];i++){
      var c=bytes[i];
      out+=c>=32&&c<=255?String.fromCharCode(c):' ';
    }
    return out.trim();
  }
  function songMeta(bytes){
    var songs=Math.max(1,be16(bytes,14)),start=Math.max(0,Math.min(songs-1,be16(bytes,16)-1));
    return {loadAddr:be16(bytes,8),playSpeed:0,maxSubsong:songs-1,
      actualSubsong:start,songName:credit(bytes,22)||'LFT SID',
      songAuthor:credit(bytes,54)||'Linus Åkesson (lft)',
      songReleased:credit(bytes,86)||''};
  }
  function errorText(error){return error&&error.message?error.message:String(error);}
  function sayFailure(error){
    console.warn('TEST173 LFT MODE failed, returning to TinySID:',error);
    var node=document.getElementById('ricoLiveStatus');
    if(node)node.textContent='LFT MODE experimental: '+errorText(error);
  }
  function changeRender(){
    if(!active)return;
    var next=queue.length?queue.shift():quiet;
    frame=next;
    // Never start WASM rendering inside Web Audio's real-time callback.
    if(queue.length<4)Promise.resolve().then(function(){
      return refill(trackEpoch,HIGH_WATER);
    }).catch(function(error){if(active)sayFailure(error);});
  }
  function patchSid(){
    if(hooked)return;
    ['computeAudioSamples','getAudioBuffer','getAudioBufferLength',
      'getResampledAudio','getResampleBuffer','evalTrackOptions',
      'getChannelBuffer','readFloatSample','enableVoices',
      'setFilterEnabled'].forEach(function(key){originalSid[key]=sid[key];});
    sid.computeAudioSamples=function(){if(!active)return originalSid.computeAudioSamples.apply(sid,arguments);changeRender();return 0;};
    sid.getAudioBuffer=function(){return active?0:originalSid.getAudioBuffer.apply(sid,arguments);};
    sid.getAudioBufferLength=function(){return active?FRAME:originalSid.getAudioBufferLength.apply(sid,arguments);};
    sid.getResampledAudio=function(){return active?FRAME:originalSid.getResampledAudio.apply(sid,arguments);};
    sid.getResampleBuffer=function(){return active?frame:originalSid.getResampleBuffer.apply(sid,arguments);};
    sid.evalTrackOptions=function(opts){
      if(!active)return originalSid.evalTrackOptions.apply(sid,arguments);
      var requested=opts&&Number(opts.track);
      if(songReady&&Number.isInteger(requested)&&requested!==currentSong&&lastBytes){
        void startSong(lastBytes,requested,true);
      }
      return 0;
    };
    sid.getChannelBuffer=function(channel){
      return active?(channel===1?-1:0):originalSid.getChannelBuffer.apply(sid,arguments);
    };
    sid.readFloatSample=function(buffer,index){
      return active?(buffer===-1?(frame[index%FRAME]||0):0):
        originalSid.readFloatSample.apply(sid,arguments);
    };
    sid.enableVoices=function(mask){
      if(!active)return originalSid.enableVoices.apply(sid,arguments);
      if(engine&&typeof engine.mute==='function'){
        for(var i=0;i<3;i++)engine.mute(0,i,!(mask&(1<<i)));
      }
    };
    sid.setFilterEnabled=function(value){
      if(!active)return originalSid.setFilterEnabled.apply(sid,arguments);
      if(engine&&typeof engine.setFilterEnabled==='function')engine.setFilterEnabled(0,!!value);
    };
    hooked=true;
  }
  function restoreSid(){
    if(!hooked)return;
    Object.keys(originalSid).forEach(function(name){sid[name]=originalSid[name];});
    hooked=false;
  }
  function deactivate(){
    epoch++;trackEpoch++;requestSerial++;
    active=false;songReady=false;lastBytes=null;approvedNext=null;initTask=null;
    queue=[];frame=quiet;
    syncModeLabel();
    restoreSid();
    var old=engine;engine=null;
    if(old)try{old.dispose();}catch(error){console.warn('LFT MODE release:',error);}
    player._numberOfSamplesToRender=0;
  }
  async function refill(expected,needed){
    if(!active||expected!==trackEpoch||!engine)return;
    if(fillTask){await fillTask;return;}
    var source=engine;
    fillTask=(async function(){
      while(active&&source===engine&&expected===trackEpoch&&queue.length<needed){
        var pcm=await source.renderFrames(FRAME);
        if(!active||source!==engine||expected!==trackEpoch)return;
        if(!(pcm instanceof Int16Array))throw Error('Unexpected PCM frame format');
        var next=new Float32Array(FRAME);
        for(var i=0;i<Math.min(FRAME,pcm.length);i++)next[i]=pcm[i]/32768;
        queue.push(next);
      }
    })();
    try{await fillTask;}finally{fillTask=null;}
  }
  async function startSong(bytes,subsong,autoplay){
    if(!active||!engine)return;
    var sequence=++trackEpoch,local=engine;
    player.autoLoading=true;player._numberOfSamplesToRender=0;
    songReady=false;queue=[];frame=quiet;
    try{
      // Drain previous rendering before replacing the WASM engine's tune.
      if(fillTask)await fillTask.catch(function(){});
      if(!active||sequence!==trackEpoch||engine!==local)return;
      var meta=songMeta(bytes),song=Number.isInteger(subsong)?subsong:meta.actualSubsong;
      song=Math.max(0,Math.min(meta.maxSubsong,song));
      await local.loadSidBuffer(bytes,song);
      if(!active||sequence!==trackEpoch||engine!==local)return;
      currentSong=song;lastBytes=bytes;
      await refill(sequence,PRIMING);
      if(!active||sequence!==trackEpoch||engine!==local)return;
      songReady=true;meta.actualSubsong=song;
      if(autoplay){
        player.playSong(song); // existing SpotySid transition and timer remain in control
        player.setSongInfo(meta);
        syncModeLabel();
      }else{
        player.setSongInfo(meta);
        player.autoLoading=false;
        player.isPlaying=false;player.isPaused=false;
        var play=document.getElementById('playButton');
        if(play)play.textContent='Play';
      }
    }catch(error){
      if(!active||sequence!==trackEpoch)return;
      sayFailure(error);
      deactivate();
      // Narrow fallback: after a failed LFT song, return to the original
      // unmodified engine. The rest of SpotySid is never reconfigured.
      if(autoplay)nativeLoad.call(player,bytes);
    }
  }
  async function ensureEngine(){
    if(active&&engine)return true;
    if(initTask)return initTask;
    var generation=epoch;
    var work=(async function(){
      var instance=null;
      try{
        player.initWebAudio();
        var lib=await import('./lft-wasm/index.js');
        instance=new lib.SidAudioEngine({
          engine:'residfp',sampleRate:player.sampleRate||44100,stereo:false,cacheSecondsLimit:2
        });
        var name=await instance.getEngineName();
        if(name!=='WasmReSIDfp')throw Error('Expected reSIDfp engine, received '+name);
        if(generation!==epoch){instance.dispose();return false;}
        engine=instance;active=true;queue=[];frame=quiet;
        patchSid();
        return true;
      }catch(error){
        if(instance&&instance!==engine)try{instance.dispose();}catch(ignore){}
        if(generation===epoch){sayFailure(error);deactivate();}
        return false;
      }
    })();
    initTask=work;
    try{return await work;}
    finally{if(initTask===work)initTask=null;}
  }
  // Retained for existing standalone diagnostics. Production routing
  // uses one verified HVSC reference at a time, never playlist name alone.
  async function prepare(data,remoteId){
    deactivate();
    if(!eligible(data,remoteId))return false;
    return ensureEngine();
  }
  player.loadSIDData=function(bytes){
    var ref=approvedNext;
    approvedNext=null;
    if(!ref){
      if(active||initTask||engine)deactivate();
      return nativeLoad.apply(this,arguments);
    }
    // Prevent arbitrary imported SIDs from entering the older test-only
    // WebAssembly binary, even if called with a forged source reference.
    if(!sidHeaderOK(bytes)||bytes.length!==APPROVED.get(ref.file)){
      if(active||initTask||engine)deactivate();
      return nativeLoad.apply(this,arguments);
    }
    var serial=++requestSerial,sidBytes=new Uint8Array(bytes);
    void (async function(){
      if(!await ensureEngine()||serial!==requestSerial)return;
      await startSong(sidBytes,null,true);
    })().catch(function(error){
      if(serial!==requestSerial)return;
      sayFailure(error);deactivate();
      nativeLoad.call(player,sidBytes);
    });
    return true;
  };
  player.stop=function(){
    var result=nativeStop.apply(this,arguments);
    if(active&&lastBytes)void startSong(lastBytes,currentSong,false);
    return result;
  };
  function approveTrustedReference(ref){
    approvedNext=eligibleRef(ref)?ref:null;
    return !!approvedNext;
  }
  window.RicoLftMode={prepare:prepare,deactivate:deactivate,eligible:eligible,
    approveTrustedReference:approveTrustedReference,eligibleRef:eligibleRef,
    active:function(){return active;},playingApproved:function(){return active&&songReady&&player.isPlaying;},
    version:'TEST177-per-track'};
})();
