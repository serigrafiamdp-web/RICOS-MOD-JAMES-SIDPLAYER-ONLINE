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
  // TEST189: audited all 99 Uctumi HVSC #85 headers: PAL clock;
  // 97 MOS8580 and two MOS6581. No headers or source files are modified.
  // Approval is by exact HVSC ZIP + filename + expected byte count.
  var UCTUMI_PACK='library/packs/musicians/U/Uctumi.zip';
  var UCTUMI_SIDS=new Map([["4Kindness.sid",2731,"MOS8580"],["A_Dog_in_My_Doorstep_short_version.sid",2725,"MOS8580"],["A_Felicidade.sid",3136,"MOS8580"],["A_Simple_Day.sid",4177,"MOS8580"],["Amigo.sid",5502,"MOS8580"],["Amor_clasificado.sid",7333,"MOS8580"],["Angels_and_Beans.sid",4561,"MOS8580"],["Another_World_Intro.sid",4238,"MOS8580"],["Anxious.sid",3794,"MOS8580"],["Arte_Poetica_Testicular.sid",2501,"MOS8580"],["Astronomia_Remix.sid",7208,"MOS8580"],["Balloon_Country_Bursts.sid",4500,"MOS8580"],["Barcoded_People.sid",5742,"MOS8580"],["Beautiful_Cruel_World.sid",3150,"MOS8580"],["Broken_and_Fixed.sid",2113,"MOS8580"],["Bye_bye.sid",4252,"MOS8580"],["Capybaras_Are_Born.sid",4209,"MOS8580"],["Carito.sid",4314,"MOS8580"],["Certas_Coisas.sid",6568,"MOS8580"],["Ciiiiid.sid",1744,"MOS8580"],["Cocktail_Blues.sid",3165,"MOS8580"],["Costumbres_argentinas.sid",4165,"MOS8580"],["Courier.sid",3057,"MOS8580"],["Courier_remix.sid",4366,"MOS8580"],["Crazy_Printer_Intro_Music.sid",3608,"MOS8580"],["Cuarentenauta.sid",3008,"MOS8580"],["Dance_with_the_Ugliest_One.sid",6579,"MOS8580"],["Dancing_Queen.sid",6601,"MOS8580"],["Der_Computer_Nr_64.sid",7912,"MOS8580"],["Digger.sid",6870,"MOS8580"],["Dinosaurios.sid",5872,"MOS8580"],["Dune_Buggy.sid",2635,"MOS8580"],["Elige_tu_propio_Gauchoide_part_1.sid",12210,"MOS8580"],["En_septiembre_fuiste_mia.sid",3507,"MOS8580"],["Everywhere_I_Go.sid",5566,"MOS6581"],["Everywhere_I_Go_final.sid",6247,"MOS8580"],["F600.sid",4404,"MOS8580"],["Fico_Assim_Sem_Voce.sid",5636,"MOS8580"],["Fluffy_Resistance.sid",4206,"MOS8580"],["Free_Falling.sid",3217,"MOS8580"],["Free_Hasel.sid",3175,"MOS8580"],["Frenetstipated.sid",3589,"MOS8580"],["Full_Contact_Intro.sid",3619,"MOS8580"],["Generador_Avanzado_de_Placas_Rojas.sid",3210,"MOS8580"],["Get_Witchy.sid",4256,"MOS8580"],["Glacial_Heart.sid",3717,"MOS8580"],["Guilty_Retro_Pleasure.sid",5101,"MOS8580"],["Hacelo_por_mi.sid",4904,"MOS8580"],["Helicoid.sid",5187,"MOS8580"],["Himno_ar.sid",4407,"MOS8580"],["Hindrance.sid",6107,"MOS8580"],["Ideas_del_Culo.sid",2994,"MOS8580"],["Illusions_are_Lost.sid",4149,"MOS8580"],["Im_Borg_Unit_6581.sid",3305,"MOS6581"],["Intro_Evita.sid",2518,"MOS8580"],["Jijiji.sid",5045,"MOS8580"],["Juana_Azurduy_Reggae_Mix.sid",5021,"MOS8580"],["La_Morocha.sid",2770,"MOS8580"],["Lamento_Boliviano.sid",3945,"MOS8580"],["Libertongo.sid",3365,"MOS8580"],["Loco_un_Poco.sid",6641,"MOS8580"],["Long_Piano.sid",4584,"MOS8580"],["Love_Profusion_C64_gone_wild.sid",5663,"MOS8580"],["Low_Serotonin.sid",4594,"MOS8580"],["Marcha_Imperial_Peronista.sid",3666,"MOS8580"],["Mechaboy.sid",4622,"MOS8580"],["Menina_Veneno.sid",3887,"MOS8580"],["Miracle_Room.sid",7039,"MOS8580"],["Mission_Prostol.sid",9103,"MOS8580"],["Mujer_Amante.sid",8003,"MOS8580"],["Nada_Punk.sid",3088,"MOS8580"],["Nothing_Is_Free.sid",6823,"MOS8580"],["O_Tempo_Nao_Para.sid",5513,"MOS8580"],["Paesaggio.sid",4731,"MOS8580"],["Pair_of_Lies.sid",3685,"MOS8580"],["Pop_Goes_the_World.sid",5187,"MOS8580"],["Por_una_cabeza.sid",2823,"MOS8580"],["Power_of_Two_2SID.sid",6103,"MOS8580"],["Profugos.sid",9076,"MOS8580"],["Pronta_Entrega.sid",4692,"MOS8580"],["Que_hago_en_Manila.sid",5011,"MOS8580"],["Que_tendra_el_petiso.sid",3553,"MOS8580"],["Radioactive_Tenderness.sid",6242,"MOS8580"],["Robots_Rumble.sid",3817,"MOS8580"],["Rue_de_l_abricot.sid",2909,"MOS8580"],["Ryuuju_no_Dengon.sid",4404,"MOS8580"],["Se_Voce_Jurar.sid",4881,"MOS8580"],["Seguir_Viviendo_Sin_Tu_Amor.sid",5052,"MOS8580"],["Seminare.sid",3499,"MOS8580"],["Sola_en_los_bares.sid",3197,"MOS8580"],["Souls_Lost_to_Poseidon_2SID.sid",4091,"MOS8580"],["Supergeek_to_the_Rescue.sid",5914,"MOS8580"],["Tocando_fondo.sid",2990,"MOS8580"],["Todos_Juntos_Remix.sid",3485,"MOS8580"],["Un_estate_italiana.sid",6522,"MOS8580"],["Whistleblower.sid",4982,"MOS8580"],["Yasashisa_ni_Tsutsumareta_nara.sid",5781,"MOS8580"],["Yo_te_amo.sid",3959,"MOS8580"],["Zombie_Calavera_Prologue.sid",4270,"MOS8580"]]);
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
  var approvedNext=null, initTask=null, requestSerial=0, activeUctumi=false, activeUctumiFile=null;
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
       (ref.pack===UCTUMI_PACK && UCTUMI_SIDS.has(ref.file)));
  }
  function syncModeLabel(){
    var title=document.getElementById('ricoLivePlaylistTitle');
    if(!title)return;
    var base=title.textContent.replace(/ · LFT MODE ON$/,'');
    title.textContent=base+((!activeUctumi&&active&&songReady&&player.isPlaying)?' · LFT MODE ON':'');
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
      if(engine&&typeof engine.setFilterEnabled==='function'){
        // TEST189: a few audited Uctumi tunes are dual-SID; apply the UI filter
        // toggle to both chips. Keep Linus's existing single-chip behavior.
        var chips=activeUctumi&&typeof engine.getInstalledSids==='function'
          ?Math.max(1,Math.min(3,engine.getInstalledSids()||1)):1;
        for(var chip=0;chip<chips;chip++)engine.setFilterEnabled(chip,!!value);
      }
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
    active=false;songReady=false;lastBytes=null;approvedNext=null;initTask=null;activeUctumi=false;activeUctumiFile=null;
    queue=[];frame=quiet;
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
    try{
      // Drain previous rendering before replacing the WASM engine's tune.
      if(fillTask)await fillTask.catch(function(){});
      if(!active||sequence!==trackEpoch||engine!==local)return;
      var meta=songMeta(bytes),song=Number.isInteger(subsong)?subsong:meta.actualSubsong;
      song=Math.max(0,Math.min(meta.maxSubsong,song));
      await local.loadSidBuffer(bytes,song);
      if(!active||sequence!==trackEpoch||engine!==local)return;
      // TEST189: native PAL-B (50Hz) timing and chip specified by each Uctumi SID.
      // The selected model is forced for this trusted file only, then the tune
      // is reloaded inside reSIDfp. No gain or filter curve is artificially altered.
      if(activeUctumi){
        var profile=UCTUMI_SIDS.get(activeUctumiFile);
        if(!profile)throw Error('Missing audited Uctumi chip metadata');
        await local.setEmulationConfig({
          c64Model:'PAL',forceC64Model:true,
          sidModel:profile[1],forceSidModel:true
        });
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
    var routeUctumi=ref.pack===UCTUMI_PACK && UCTUMI_SIDS.has(ref.file);
    var expectedSize=routeUctumi?UCTUMI_SIDS.get(ref.file)[0]:APPROVED.get(ref.file);
    if(!sidHeaderOK(bytes)||bytes.length!==expectedSize){
      if(active||initTask||engine)deactivate();
      return nativeLoad.apply(this,arguments);
    }
    // Restore the independent Linus engine configuration on leaving Uctumi.
    if(activeUctumi&&!routeUctumi)deactivate();
    var serial=++requestSerial,sidBytes=new Uint8Array(bytes);
    void (async function(){
      if(!await ensureEngine()||serial!==requestSerial)return;
      activeUctumi=routeUctumi;
      activeUctumiFile=routeUctumi?ref.file:null;
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
    active:function(){return active;},playingApproved:function(){return !activeUctumi&&active&&songReady&&player.isPlaying;},
    scopeRegisters:function(){return latestRegs?latestRegs.slice():null;},
    version:'TEST189-uctumi-pal-chips'};
})();
