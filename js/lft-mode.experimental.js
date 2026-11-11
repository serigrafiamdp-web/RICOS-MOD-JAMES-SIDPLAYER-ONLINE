/* SpotySid TEST173: isolated experimental backend for the published LFT playlist.
   This file never changes the bundled TinySID engine and only installs its SID
   sample adapter while a verified LFT-only published playlist is playing.
   libsidplayfp-wasm and its attribution live in ./lft-wasm/. */
(function(){
  'use strict';
  if(!window.sidPlayer||!window.SID||window.RicoLftMode)return;
  var player=window.sidPlayer, sid=window.SID;
  var PACK='library/packs/musicians/L/Lft.zip';
  var FRAME=4096, HIGH_WATER=8, PRIMING=4;
  var nativeLoad=player.loadSIDData, nativeStop=player.stop;
  var originalSid={}, hooked=false, active=false, engine=null, epoch=0, trackEpoch=0;
  var queue=[], frame=new Float32Array(FRAME), quiet=new Float32Array(FRAME);
  var fillTask=null, lastBytes=null, currentSong=0, songReady=false;
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
    if(queue.length<4)void refill(trackEpoch,HIGH_WATER).catch(function(error){
      if(active)sayFailure(error);
    });
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
    epoch++;trackEpoch++;
    active=false;songReady=false;lastBytes=null;
    queue=[];frame=quiet;
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
  async function prepare(data,remoteId){
    deactivate();
    if(!eligible(data,remoteId))return false;
    var current=++epoch, instance=null;
    try{
      player.initWebAudio();
      // Local, lazy-loaded files; no global TinySID engine replacement.
      var lib=await import('./lft-wasm/index.js');
      instance=new lib.SidAudioEngine({
        engine:'residfp',sampleRate:player.sampleRate||44100,stereo:false,cacheSecondsLimit:2
      });
      var name=await instance.getEngineName();
      if(name!=='WasmReSIDfp')throw Error('Expected reSIDfp engine, received '+name);
      if(current!==epoch){instance.dispose();return false;}
      engine=instance;
      // Respect each PSID header's 6581/8580 and PAL flags; do not force
      // MOS8580 for the whole collection, because LFT includes both chips.
      active=true;queue=[];frame=quiet;
      patchSid();
      return true;
    }catch(error){
      if(instance&&instance!==engine)try{instance.dispose();}catch(ignore){}
      if(current===epoch){sayFailure(error);deactivate();}
      return false;
    }
  }
  player.loadSIDData=function(bytes){
    if(!active)return nativeLoad.apply(this,arguments);
    if(!sidHeaderOK(bytes)){
      sayFailure(new Error('Invalid SID header or data offset'));
      deactivate();
      return nativeLoad.apply(this,arguments);
    }
    void startSong(new Uint8Array(bytes),null,true);
    return true;
  };
  player.stop=function(){
    var result=nativeStop.apply(this,arguments);
    if(active&&lastBytes)void startSong(lastBytes,currentSong,false);
    return result;
  };
  window.RicoLftMode={prepare:prepare,deactivate:deactivate,eligible:eligible,
    active:function(){return active;},version:'TEST173-prototype'};
})();
