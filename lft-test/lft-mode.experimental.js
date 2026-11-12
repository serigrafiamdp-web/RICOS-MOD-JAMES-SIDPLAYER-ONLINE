/* SpotySid TEST173: isolated experimental backend for the published LFT playlist.
   This file never changes the bundled TinySID engine and only installs its SID
   sample adapter while a verified LFT-only published playlist is playing.
   libsidplayfp-wasm and its attribution live in ./lft-wasm/. */
(function(){
  'use strict';
  if(!window.sidPlayer||!window.SID||window.RicoLftMode)return;
  var player=window.sidPlayer, sid=window.SID;
  // Resolve WASM from this script's URL, independent of the HTML page/base URL.
  var engineScriptUrl=document.currentScript&&document.currentScript.src;
  var engineModuleUrl=new URL('./lft-wasm/index.js',engineScriptUrl||document.baseURI).href;
  var PACK='library/packs/musicians/L/Lft.zip';
  // TEST188: exact known HVSC source for the Uctumi 8580 filter regression.
  // No general Uctumi or filename-based routing.
  var UCTUMI_PACK='library/packs/musicians/U/Uctumi.zip';
  var UCTUMI_8580=new Map([['Loco_un_Poco.sid',6641]]);
  // TEST177: immutable 66-file approval list taken from HVSC #85 musician index.
  // This is a reference allowlist, not a filename/author guess.
  var APPROVED=new Map([["A_Chipful_of_Love_for_You.sid",5294],["A_Computer_in_My_Backpack.sid",4990],["A_Mind_Is_Born.sid",380],["Air_on_a_Rasterline.sid",2978],["Allt_under_himmelens_faeste.sid",6619],["Allt_under_himmelens_faeste_v2.sid",6569],["Arrow_of_Time.sid",6270],["Cherry_Waffle.sid",5758],["Computational_Soup_2KB.sid",614],["Crank_Crank_Airwolf.sid",2686],["Crank_Crank_Revolution.sid",3710],["Dishwasher_Groove.sid",4990],["Dithered_Island.sid",6270],["Elvendance.sid",4734],["Euclid_Was_Here.sid",6270],["Fargo.sid",4222],["Fjaellevator_Music.sid",5502],["Foerklaedd_Gud_alpha.sid",4740],["Foerklaedd_Gud_beta.sid",4162],["Foerklaedd_Gud_delta.sid",4235],["Foerklaedd_Gud_epsilon.sid",3173],["Foerklaedd_Gud_eta.sid",3532],["Foerklaedd_Gud_gamma.sid",3280],["Foerklaedd_Gud_zeta.sid",3574],["Fratres_Arvo_Paert_2SID.sid",7435],["Fugue_on_a_Theme_by_D_M_Hanlon.sid",3198],["Glyptodont.sid",6270],["Hachi_Bitto_Whirlwind.sid",6526],["Hardsync.sid",4943],["In_Darkness_Hope.sid",6270],["Into_the_Unknown.sid",5502],["King_Fisher_0x28.sid",5463],["Lunatico_End.sid",1022],["Lunatico_Note.sid",6270],["Lunatico_Side_1.sid",5502],["Lunatico_Side_2.sid",5502],["Machine_Yearning_2SID.sid",6313],["Maple_Leaf_Rag.sid",3966],["Nine.sid",4478],["Nymphaea.sid",4754],["Perfectly_Well-Adjusted.sid",5758],["Perpetual_Fragility.sid",435],["Platform_Hopping.sid",12925],["Quintessence.sid",5758],["Quondam_Tunneling.sid",4734],["Racing_the_Beam.sid",6782],["Reminiscence.sid",5502],["Revolutions_Delivered.sid",5246],["Rodents_in_the_Attic.sid",5246],["Scene_Spirit.sid",8176],["Scene_Spirit_v2.sid",7038],["Shards_of_Fancy.sid",4950],["Sideways.sid",8956],["Slaepwerigne.sid",6795],["Sommargubbe.sid",6782],["Specular_Highlight.sid",9813],["Spin_Crazy_World.sid",6014],["Summer_Cloud.sid",6205],["Summer_Cloud_v2.sid",5502],["Thus_Spoke_the_PC_Speaker.sid",6270],["To_Die_For.sid",4734],["To_Die_For_II.sid",3966],["Toy_Rocket.sid",5758],["Trinket.sid",3454],["Withering_Bytes.sid",5246],["Your_Heptacular_Eyes.sid",6526]]);
  var FRAME=4096, HIGH_WATER=8, PRIMING=4;
  var nativeLoad=player.loadSIDData, nativeStop=player.stop;
  var originalSid={}, hooked=false, active=false, engine=null, epoch=0, trackEpoch=0;
  var queue=[], frame=new Float32Array(FRAME), quiet=new Float32Array(FRAME);
  // TEST178: 3 visually independent voice traces. The PCM audio remains the
  // unaltered reSIDfp mixed signal; the traces estimate raw SID oscillators
  // from the *real emulated chip registers*, not from the mono audio mix.
  var voiceFrames=[quiet,quiet,quiet];
  // TEST194: source-specific, gentle loudness compensation. No SID register,
  // FILTER, channel or LINUS modifications. Reset at each Loco song start.
  var locoLevel=null;
  function liftLocoMix(pcm,mix){
    if(!active8580||!locoLevel)return;
    var st=locoLevel,n=Math.min(FRAME,pcm.length),sum=0;
    for(var j=0;j<n;j++){var v=pcm[j]/32768;sum+=v*v;}
    var rms=n?Math.sqrt(sum/n):0;
    var dt=n/(player.sampleRate||44100);
    st.seconds+=dt;
    var alpha=1-Math.exp(-dt/0.9);
    st.average=st.average===0?rms:st.average+(rms-st.average)*alpha;
    // Learn the initial audible level; hold it when the rhythm drops.
    if(!st.boost&&rms>0.012&&st.seconds<24)
      st.intro=Math.max(st.intro,st.average);
    if(st.seconds>2&&st.intro>0.02&&st.average>0.009&&
       st.average<st.intro*0.73)st.lowFor+=dt;
    else st.lowFor=Math.max(0,st.lowFor-dt*2);
    if(st.lowFor>=0.85)st.boost=true;
    var target=st.boost?1.48:1; // maximum +3.4 dB, never changes master volume
    var smooth=1-Math.exp(-dt/(target>st.gain?1.1:1.8));
    var start=st.gain;
    st.gain+=smooth*(target-st.gain);
    // Per-sample smooth ramp; soft limit only samples nearing full scale.
    for(var k=0;k<n;k++){
      var a=mix[k]*(start+(st.gain-start)*(k/n));
      var abs=Math.abs(a);
      mix[k]=abs>0.92?Math.sign(a)*(0.92+0.08*Math.tanh((abs-0.92)/0.08)):a;
    }
  }
  var osc=[], latestRegs=null, C64_PAL_CLOCK=985248, SID_PHASE_RANGE=16777216;
  var ATTACK=[.002,.008,.016,.024,.038,.056,.068,.080,.100,.250,.500,.800,1.0,3.0,5.0,8.0];
  var DECAY=[.006,.024,.048,.072,.114,.168,.204,.240,.300,.750,1.50,2.40,3.0,9.0,15.0,24.0];
  function resetVoiceState(){
    osc=[0,1,2].map(function(i){return {
      phase:0,level:0,stage:0,gate:false,
      noise:(0x654321^(i*0x15a75d))&0x7fffff
    };});
    voiceFrames=[quiet,quiet,quiet];latestRegs=null;
  }
  resetVoiceState();
  function renderVoiceSegment(traces,offset,length,regs){
    if(!regs||regs.length<25)return;
    latestRegs=Array.from(regs);
    var sampleRate=player.sampleRate||44100;
    var volume=(regs[24]&15)/15;
    for(var voice=0;voice<3;voice++){
      var base=voice*7,control=regs[base+4];
      var frequency=regs[base]|(regs[base+1]<<8);
      var increment=frequency*C64_PAL_CLOCK/(SID_PHASE_RANGE*sampleRate);
      var pulse=((regs[base+2]|((regs[base+3]&15)<<8))/4096);
      var ad=regs[base+5],sr=regs[base+6];
      var attack=Math.max(1,ATTACK[ad>>4]*sampleRate);
      var decay=Math.max(1,DECAY[ad&15]*sampleRate);
      var release=Math.max(1,DECAY[sr&15]*sampleRate);
      var sustain=((sr>>4)&15)/15,gate=!!(control&1);
      var state=osc[voice],output=traces[voice];
      if(gate!==state.gate){state.stage=gate?1:3;state.gate=gate;}
      var activeWave=control&0xf0;
      var testBit=control&8;
      for(var i=offset,end=offset+length;i<end;i++){
        if(state.stage===1){
          state.level+=1/attack;
          if(state.level>=1){state.level=1;state.stage=2;}
        }else if(state.stage===2){
          state.level=Math.max(sustain,state.level-(1-sustain)/decay);
        }else if(state.stage===3){
          state.level=Math.max(0,state.level-1/release);
          if(state.level===0)state.stage=0;
        }
        if(!activeWave||!frequency||testBit){output[i]=0;continue;}
        var phase=state.phase,shape=0,count=0;
        // These oscillator shapes follow actual reSIDfp frequency, pulse
        // width, control and ADSR registers; analogue combined waveforms,
        // filters and ring modulation remain a visual approximation.
        if(control&16){shape+=1-4*Math.abs(phase-.5);count++;}
        if(control&32){shape+=2*phase-1;count++;}
        if(control&64){shape+=phase<pulse?1:-1;count++;}
        if(control&128){shape+=((state.noise&255)/127.5)-1;count++;}
        output[i]=(shape/Math.max(1,count))*state.level*volume*.027;
        phase+=increment;
        if(phase>=1){
          phase-=Math.floor(phase);
          var tap=((state.noise>>22)^(state.noise>>17))&1;
          state.noise=((state.noise<<1)|tap)&0x7fffff;
        }
        state.phase=phase;
      }
    }
  }
  var fillTask=null, lastBytes=null, currentSong=0, songReady=false;
  var approvedNext=null, initTask=null, requestSerial=0, active8580=false;
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
    return !MODE_OFF && !!ref && !ref.sidId && typeof ref.file==='string' &&
      ((ref.pack===PACK && APPROVED.has(ref.file)) ||
       (ref.pack===UCTUMI_PACK && UCTUMI_8580.has(ref.file)));
  }
  function syncModeLabel(){
    var title=document.getElementById('ricoLivePlaylistTitle');
    if(!title)return;
    var base=title.textContent.replace(/ · LFT MODE ON$/,'');
    title.textContent=base+((!active8580&&active&&songReady&&player.isPlaying)?' · LFT MODE ON':'');
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
      actualSubsong:start,songName:credit(bytes,22)||'SID',
      songAuthor:credit(bytes,54)||'Unknown',
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
    var next=queue.length?queue.shift():null;
    frame=next?next.audio:quiet;
    voiceFrames=next?next.voices:[quiet,quiet,quiet];
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
      // SIDPlayer's existing OSC draws voices 1..3 and probes voice 4.
      // Dedicated negative handles are visual only; no change to audio PCM.
      return active?(channel>=1&&channel<=3?-100-channel:0):
        originalSid.getChannelBuffer.apply(sid,arguments);
    };
    sid.readFloatSample=function(buffer,index){
      if(!active)return originalSid.readFloatSample.apply(sid,arguments);
      var channel=-101-buffer;
      return (channel>=0&&channel<3&&index>=0&&index<FRAME)
        ?(voiceFrames[channel][index]||0):0;
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
    active=false;songReady=false;lastBytes=null;approvedNext=null;initTask=null;active8580=false;
    queue=[];frame=quiet;locoLevel=null;
    resetVoiceState();
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
        // Preserve the SAME 4096-frame render call used by TEST177. The
        // visualizer only reads registers *after* the mixed PCM is finished:
        // no additional emulation or change to the audible sample stream.
        var pcm=await source.renderFrames(FRAME);
        if(!active||source!==engine||expected!==trackEpoch)return;
        if(!(pcm instanceof Int16Array))throw Error('Unexpected PCM frame format');
        var next=new Float32Array(FRAME);
        for(var i=0;i<Math.min(FRAME,pcm.length);i++)next[i]=pcm[i]/32768;
        liftLocoMix(pcm,next);
        var voices=[new Float32Array(FRAME),new Float32Array(FRAME),new Float32Array(FRAME)];
        var regs=null;
        try{regs=source.getSidStatus(0);}catch(visualError){
          // Scope extraction must never interrupt audible music.
          if(!source._ricoScopeWarning){
            console.warn('LFT scope registers unavailable:',visualError);
            source._ricoScopeWarning=true;
          }
        }
        renderVoiceSegment(voices,0,FRAME,regs);
        queue.push({audio:next,voices:voices});
      }
    })();
    try{await fillTask;}finally{fillTask=null;}
  }
  async function startSong(bytes,subsong,autoplay){
    if(!active||!engine)return;
    var sequence=++trackEpoch,local=engine;
    player.autoLoading=true;player._numberOfSamplesToRender=0;
    songReady=false;queue=[];frame=quiet;
    locoLevel=active8580?{seconds:0,average:0,intro:0,lowFor:0,boost:false,gain:1}:null;
    try{
      // Drain previous rendering before replacing the WASM engine's tune.
      if(fillTask)await fillTask.catch(function(){});
      if(!active||sequence!==trackEpoch||engine!==local)return;
      var meta=songMeta(bytes),song=Number.isInteger(subsong)?subsong:meta.actualSubsong;
      song=Math.max(0,Math.min(meta.maxSubsong,song));
      await local.loadSidBuffer(bytes,song);
      if(!active||sequence!==trackEpoch||engine!==local)return;
      // TEST188: explicitly select MOS8580 for Loco un Poco only.
      // ReSIDfp applies the model and reloads this SID from its start.
      if(active8580){
        await local.setEmulationConfig({sidModel:'MOS8580',forceSidModel:true});
        if(!active||sequence!==trackEpoch||engine!==local)return;
      }
      // The original TinySID loader normally resets this flag. LFT's bridge
      // must do it too, or a stale fourth-voice lane survives a playlist switch.
      player.sidHasSamples=false;
      var fourth=document.getElementById('voice4Control');
      if(fourth)fourth.style.display='none';
      resetVoiceState();
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
        var lib=await import(engineModuleUrl);
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
    var route8580=ref.pack===UCTUMI_PACK && UCTUMI_8580.has(ref.file);
    var expectedSize=route8580?UCTUMI_8580.get(ref.file):APPROVED.get(ref.file);
    if(!sidHeaderOK(bytes)||bytes.length!==expectedSize){
      if(active||initTask||engine)deactivate();
      return nativeLoad.apply(this,arguments);
    }
    // Do not carry a forced 8580 model over into Linus or other tracks.
    if(active8580&&!route8580)deactivate();
    var serial=++requestSerial,sidBytes=new Uint8Array(bytes);
    void (async function(){
      if(!await ensureEngine()||serial!==requestSerial)return;
      active8580=route8580;
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
    active:function(){return active;},playingApproved:function(){return !active8580&&active&&songReady&&player.isPlaying;},
    scopeRegisters:function(){return latestRegs?latestRegs.slice():null;},
    version:'TEST194-loco-leveler'};
})();
