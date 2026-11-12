/* RICOS MOD - JAMES SIDPLAYER ONLINE / TEST04
 * Local custom SID playlist. No upload, no persistent storage, no SID engine changes.
 * Original default playlist and engine remain in sidPlayer.js.
 */
(function () {
  'use strict';
  if (!window.sidPlayer || !window.SID) return;

  var player = window.sidPlayer;
  // TEST133: nickname-first display only; original HVSC credit data stays unchanged.
  function formatArtistCredit(value){
    var v=String(value||'').trim(),m=v.match(/^([^()]+?)\s*\(([^()]+)\)$/);
    return m&&m[1].trim()&&m[2].trim()?m[2].trim()+' ('+m[1].trim()+')':v;
  }
  // TEST25: unlock Web Audio at the earliest user gesture, even before the
  // 30-second automatic playlist selection. Never synthesize a fake click.
  function unlockAudioFromGesture() {
    if (!player.audioContext) player.initWebAudio();
    if (player.audioContext && player.audioContext.state === 'suspended') {
      var result=player.audioContext.resume();
      if (result && result.catch) result.catch(function(error){
        console.warn('Browser deferred audio until user interaction:',error);
      });
    }
  }
  document.addEventListener('pointerdown',unlockAudioFromGesture,{capture:true});
  document.addEventListener('keydown',unlockAudioFromGesture,{capture:true});
  var originalList = player.sidList;
  // TEST96: two independent cursor states and soft Web Audio transitions.
  // Current playing SID is never replaced while the volume is fading.
  var selectedLiveIndex=null;
  var queuedLiveIndex=null;
  var followPlayingRowOnce=false;
  // TEST122: avoid rebuilding 1,376 track buttons on each song selection
  // while ScriptProcessor audio needs the main thread for steady playback.
  var largePlaylistStructureRevision=0;
  var largePlaylistPainted=null;
  var fadeGainNode=null;
  // TEST197: separate song-output gain for Loco un Poco. This lives before
  // the unchanged transition-fade node; no SID samples are modified.
  var trackGainNode=null;
  // TEST100: restore gain only when the FIRST newly rendered SID buffer plays.
  // Doing it inside playSong exposes previously queued ScriptProcessor audio.
  var pendingNewSidUnmute=false;
  // TEST202: if AudioProcessingEvent.playbackTime is unusable, preserve the
  // complete first buffer instead of silently losing its first ~93 ms.
  var openingBufferReplay=null;
  var audioOutputHookNode=null;
  // TEST101: detect genuine SID output silence before the fade GainNode.
  // Silence is never inferred from the deliberately reduced master volume.
  var silentSamples=0;
  var silenceAdvanceQueued=false;
  var SILENCE_MIN_PLAY_SECONDS=12;
  var SILENCE_HOLD_SECONDS=2;
  var SILENCE_RMS_THRESHOLD=0.0025;
  var SILENCE_PEAK_THRESHOLD=0.012;
  function resetSilenceDetector(){
    silentSamples=0;
    silenceAdvanceQueued=false;
  }
  function inspectSidOutput(event,wasPlaying){
    // TEST201: silence detection intentionally disabled. AUTO now uses TIMER only.
    // Keep the detector implementation dormant for a possible future opt-in.
    return;
    if(!wasPlaying||transitionBusy||!player.autoAdvance||player.autoLoading||
       player.sidListIndex===false||!player.sidList||player.sidList.length<2){
      silentSamples=0;return;
    }
    // A SID that has explicitly stopped producing samples needs no further fade.
    if(!player.isPlaying){
      scheduleSilenceAdvance('SID ended');
      return;
    }
    if(!player.sampleRate||player.autoElapsedSamples/player.sampleRate<SILENCE_MIN_PLAY_SECONDS){
      silentSamples=0;return;
    }
    var data=event&&event.outputBuffer&&event.outputBuffer.getChannelData(0);
    if(!data||!data.length)return;
    var sum=0,peak=0,n=0;
    for(var i=0;i<data.length;i+=8){
      var sample=data[i],abs=Math.abs(sample);
      if(!Number.isFinite(sample)){silentSamples=0;return;}
      sum+=sample*sample;
      if(abs>peak)peak=abs;
      n++;
    }
    var rms=Math.sqrt(sum/Math.max(1,n));
    if(rms<SILENCE_RMS_THRESHOLD&&peak<SILENCE_PEAK_THRESHOLD)
      silentSamples+=data.length;
    else silentSamples=0;
    if(silentSamples/player.sampleRate>=SILENCE_HOLD_SECONDS)
      scheduleSilenceAdvance('Audio silence detected');
  }
  function scheduleSilenceAdvance(reason){
    if(silenceAdvanceQueued||transitionBusy||!player.autoAdvance||
       player.sidListIndex===false||player.autoLoading)return;
    silenceAdvanceQueued=true;
    var currentTrack=player.sidList[player.sidListIndex];
    // Never change SID data inside the ScriptProcessor audio callback.
    Promise.resolve().then(function(){
      silenceAdvanceQueued=false;
      if(transitionBusy||!player.autoAdvance||player.autoLoading||
         player.sidListIndex===false||player.sidList[player.sidListIndex]!==currentTrack)return;
      silentSamples=0;
      $('#ricoLiveStatus').text(reason+' · AUTO NEXT');
      // TEST200: once real output silence has already been confirmed, skip
      // the otherwise inaudible five-second fade of the outgoing SID.
      // A genuine song end was already immediate; ordinary NEXT/AUTO keeps its fade.
      if(reason==='Audio silence detected'){
        var next=(player.sidListIndex+1)%player.sidList.length;
        requestSidSwitch(next,'silence');
      }else player.nextSid();
    });
  }
  var transitionTimer=null;
  var transitionRecovery=null;
  var transitionAwaitingStart=false;
  var transitionBusy=false;
  var transitionSource=null;
  var transitionGeneration=0;
  // TEST203: next SID file is fetched before the fade ends, never advanced.
  var preparedDefaultSid=null;
  // TEST99: equal-power style cosine fade-out, full-volume start for the next SID.
  // Keep the five-second duration to isolate the curve change; no fade-in or gap.
  var FADE_OUT_MS=5000,FADE_OUT_FLOOR=0.005;
  var nativeInitWebAudio=player.initWebAudio;
  player.initWebAudio=function(){
    var response=nativeInitWebAudio.apply(this,arguments);
    // Audio is already generated by the original ScriptProcessor. Attenuate
    // only the final output, leaving SID synthesis and all samples untouched.
    if(!fadeGainNode&&this.audioContext&&this.scriptNode&&
       typeof this.audioContext.createGain==='function'){
      try{
        var node=this.audioContext.createGain();
        node.gain.value=1;
        this.scriptNode.disconnect();
        this.scriptNode.connect(node);
        node.connect(this.audioContext.destination);
        fadeGainNode=node;
      }catch(error){
        console.warn('Soft SID transition unavailable; using direct audio:',error);
        try{this.scriptNode.disconnect();this.scriptNode.connect(this.audioContext.destination);}catch(inner){}
      }
    }
    // TEST197: add an independent fixed-gain stage between the ScriptProcessor
    // and the existing transition GainNode. Do not alter fade scheduling.
    if(fadeGainNode&&!trackGainNode&&this.audioContext&&this.scriptNode&&
       typeof this.audioContext.createGain==='function'){
      try{
        var outputGain=this.audioContext.createGain();
        outputGain.gain.value=1;
        this.scriptNode.disconnect();
        this.scriptNode.connect(outputGain);
        outputGain.connect(fadeGainNode);
        trackGainNode=outputGain;
      }catch(error){
        console.warn('Separate SID output gain unavailable:',error);
        try{
          this.scriptNode.disconnect();
          this.scriptNode.connect(fadeGainNode);
        }catch(inner){}
      }
    }
    // ScriptProcessor queues output ahead of the audible playhead. Hook its
    // existing renderer without changing any SID samples or synthesis logic.
    if(this.scriptNode&&this.scriptNode!==audioOutputHookNode){
      var priorRenderer=this.scriptNode.onaudioprocess;
      if(typeof priorRenderer==='function'){
        this.scriptNode.onaudioprocess=function(event){
          var wasPlaying=!!player.isPlaying;
          if(openingBufferReplay){
            // Replay the held 0:00 frame at the next safe output boundary.
            // Do not advance the SID renderer until this opening plays.
            var output=event&&event.outputBuffer&&event.outputBuffer.getChannelData(0);
            if(output&&output.length===openingBufferReplay.length){
              output.set(openingBufferReplay);
              openingBufferReplay=null;
            }else{
              openingBufferReplay=null;
              priorRenderer.call(this,event);
            }
          }else priorRenderer.call(this,event);
          inspectSidOutput(event,wasPlaying);
          if(!pendingNewSidUnmute)return;
          pendingNewSidUnmute=false;
          if(!fadeGainNode||!player.audioContext)return;
          // playbackTime is the start of THIS freshly rendered output buffer,
          // not the time when playSong initialized the new SID.
          var context=player.audioContext;
          var now=context.currentTime;
          var start=Number(event&&event.playbackTime);
          if(!Number.isFinite(start)||start<=now){
            // Keep TEST100's conservative one-buffer fallback to avoid
            // reviving old buffered audio at full level. Unlike TEST100,
            // preserve and replay the complete FIRST incoming buffer at 1x.
            var buffer=event&&event.outputBuffer&&event.outputBuffer.getChannelData(0);
            var bufferSize=event&&event.outputBuffer&&event.outputBuffer.length||4096;
            if(buffer&&buffer.length){
              openingBufferReplay=new Float32Array(buffer);
              buffer.fill(0);
            }
            start=now+bufferSize/(player.sampleRate||44100);
          }
          var gain=fadeGainNode.gain;
          gain.cancelScheduledValues(now);
          gain.setValueAtTime(FADE_OUT_FLOOR,now);
          gain.setValueAtTime(1,start);
        };
        audioOutputHookNode=this.scriptNode;
      }
    }
    return response;
  };
  // Only the narrowly approved SID bridge uses this; all other tracks run
  // at unity gain. This function never changes the transition-fade node.
  player.ricoSetTrackOutputGain=function(value){
    var gain=Number(value);
    if(!Number.isFinite(gain)||gain<0||!trackGainNode||!player.audioContext)return false;
    var param=trackGainNode.gain,now=player.audioContext.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(gain,now);
    return true;
  };
  function rampVolume(target,milliseconds){
    if(!fadeGainNode||!player.audioContext)return;
    var param=fadeGainNode.gain;
    var now=player.audioContext.currentTime;
    var current=Math.max(0,Math.min(1,Number(param.value)||0));
    if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);
    else param.cancelScheduledValues(now);
    // DJ-style equal-power fade: 0%, 25%, 50%, 75%, 100% of the fade
    // correspond approximately to 100%, 92%, 71%, 38%, 0.5% gain.
    // This stays perceptibly louder through the first half than a linear ramp.
    var points=129,curve=new Float32Array(points);
    for(var i=0;i<points;i++){
      var fraction=i/(points-1);
      curve[i]=target+(current-target)*Math.cos(fraction*Math.PI/2);
    }
    var duration=Math.max(0.005,milliseconds/1000);
    if(typeof param.setValueCurveAtTime==='function'){
      param.setValueCurveAtTime(curve,now+0.001,duration-0.001);
    }else{
      param.setValueAtTime(current,now);
      for(var j=1;j<points;j++)
        param.linearRampToValueAtTime(curve[j],now+duration*j/(points-1));
    }
  }
  function restoreFullVolume(){
    if(!fadeGainNode||!player.audioContext)return;
    var now=player.audioContext.currentTime;
    fadeGainNode.gain.cancelScheduledValues(now);
    fadeGainNode.gain.setValueAtTime(1,now);
  }
  function resetSoftTransition(resetSelection){
    resetSilenceDetector();
    transitionGeneration++;
    if(transitionTimer!==null){clearTimeout(transitionTimer);transitionTimer=null;}
    if(transitionRecovery!==null){clearTimeout(transitionRecovery);transitionRecovery=null;}
    if(transitionBusy&&!transitionAwaitingStart)player.autoLoading=false;
    transitionBusy=false;transitionAwaitingStart=false;
    pendingNewSidUnmute=false;
    openingBufferReplay=null;
    queuedLiveIndex=null;transitionSource=null;
    preparedDefaultSid=null;
    if(window.RicoLftMode&&typeof window.RicoLftMode.cancelStagedNext==='function')
      window.RicoLftMode.cancelStagedNext();
    if(resetSelection){
      selectedLiveIndex=null;followPlayingRowOnce=false;
      $('#ricoLivePlaylistItems').scrollTop(0);
    }
    restoreFullVolume();
  }
  var originalPlaySong=player.playSong;
  player.playSong=function(){
    // A new tune must never replay the previous tune's held opening.
    openingBufferReplay=null;
    resetSilenceDetector();
    var result=originalPlaySong.apply(this,arguments);
    // TEST199: the active SID/subtune chooses its initial TIMER value.
    selectTentativeSidTimer();
    if(transitionAwaitingStart){
      transitionAwaitingStart=false;transitionBusy=false;queuedLiveIndex=null;
      if(transitionRecovery!==null){clearTimeout(transitionRecovery);transitionRecovery=null;}
      // TEST100: hold the outgoing SID at its near-zero gain until the actual
      // incoming audio buffer reaches the speaker. No fade-in and no delay.
      if(fadeGainNode&&audioOutputHookNode===player.scriptNode)
        pendingNewSidUnmute=true;
      else restoreFullVolume();
      if(transitionSource==='next'||transitionSource==='silence')followPlayingRowOnce=true;
      transitionSource=null;
      renderLivePlaylist();
    }
    return result;
  };
  function performSidSwitch(index){
    if(customActive)loadCustomIndex(index);
    else{
      var item=originalList[index];
      if(!item)return;
      player.sidListIndex=index;
      // TEST203: the native SID still starts at its own first PCM sample.
      // Avoid a network request only AFTER the fade boundary.
      var prepared=preparedDefaultSid;
      preparedDefaultSid=null;
      if(prepared&&prepared.index===index&&prepared.bytes)
        player.loadSIDData(prepared.bytes);
      else player.loadSID('sids/'+item.file);
      player.setPath(item.id);
      player.initFileSelection();
      renderLivePlaylist();
    }
  }
  function prepareSidDuringFade(index,entry,generation){
    if(customActive&&entry&&entry._hvscRef){
      var bridge=window.RicoLftMode;
      preparedDefaultSid=null;
      // Only the approved LFT and Loco routes can be pre-rendered.
      if(!bridge||typeof bridge.stageNextReference!=='function')return;
      function stage(){
        if(generation!==transitionGeneration||!transitionBusy||
           queuedLiveIndex!==index||!customActive||!entry.localBytes)return;
        Promise.resolve(bridge.stageNextReference(entry._hvscRef,entry.localBytes))
          .catch(function(error){console.warn('TEST203 SID stage unavailable:',error);});
      }
      if(entry.localBytes){stage();return;}
      if(activeReferenceStream){
        var stream=activeReferenceStream;
        stream.loadSlot(entry).then(function(){
          if(activeReferenceStream===stream)stage();
        }).catch(function(error){
          if(generation===transitionGeneration)
            $('#ricoLiveStatus').text('Cannot prepare SID: '+error.message);
        });
      }
      return;
    }
    if(window.RicoLftMode&&typeof window.RicoLftMode.cancelStagedNext==='function')
      window.RicoLftMode.cancelStagedNext();
    preparedDefaultSid=null;
    if(customActive||!entry||!entry.file)return;
    var state={index:index,bytes:null};
    preparedDefaultSid=state;
    fetch('sids/'+entry.file).then(function(response){
      if(!response.ok)throw Error('SID fetch '+response.status);
      return response.arrayBuffer();
    }).then(function(buffer){
      if(preparedDefaultSid!==state||generation!==transitionGeneration)return;
      state.bytes=new Uint8Array(buffer);
    }).catch(function(error){
      if(preparedDefaultSid===state)
        console.warn('TEST203: native SID prefetch unavailable; using original loader:',error);
    });
  }
  function requestSidSwitch(index,source){
    var list=player.sidList||[];
    if(index<0||index>=list.length)return;
    var entry=list[index];
    // TEST122: on a progressive list, do NOT wait for an unprepared SID
    // before starting the fade. The upcoming SID can decode during the
    // existing five-second fade, with the outgoing audio still playing.
    // Starting the fade after decoding caused an audible hang/repeat on click.
    referenceSwitchSerial++;
    if(source==='manual')selectedLiveIndex=index;
    if(transitionBusy){
      if(transitionAwaitingStart){
        $('#ricoLiveStatus').text('Loading the next SID; select another song once it starts.');
        renderLivePlaylist();return;
      }
      // Another click changes NEXT without starting another fade or timer.
      if(index===player.sidListIndex){
        resetSoftTransition(false);
        $('#ricoLiveStatus').text('Transition cancelled; current SID continues.');
      }else{
        queuedLiveIndex=index;
        transitionSource=source;
        prepareSidDuringFade(index,entry,transitionGeneration);
        $('#ricoLiveStatus').text('NEXT: '+(list[index].name||list[index].file||'SID'));
      }
      renderLivePlaylist();
      return;
    }
    if(index===player.sidListIndex&&player.isPlaying){
      renderLivePlaylist();return;
    }
    player.initWebAudio();
    // If playback was paused or stopped, switch immediately and fade in.
    // TEST200: confirmed silence needs no additional fade; the incoming SID
    // still unmutes on its first rendered audio buffer (TEST100 protection).
    var playing=!!player.isPlaying&&!player.isPaused&&source!=='silence';
    resetSilenceDetector();
    transitionBusy=true;transitionSource=source;queuedLiveIndex=index;
    var generation=++transitionGeneration;
    if(fadeGainNode){
      if(playing)rampVolume(FADE_OUT_FLOOR,FADE_OUT_MS);
      else{fadeGainNode.gain.cancelScheduledValues(player.audioContext.currentTime);
        fadeGainNode.gain.setValueAtTime(0,player.audioContext.currentTime);}
    }
    player.autoLoading=true;
    $('#ricoLiveStatus').text('NEXT: '+(list[index].name||list[index].file||'SID')+
      (playing?' · fading out':' · starting'));
    renderLivePlaylist();
    // TEST203: asynchronously prepare *bytes and approved reSIDfp engine*
    // while the original SID fades. No playback or seeking of the new SID.
    prepareSidDuringFade(index,entry,generation);
    transitionTimer=setTimeout(function(){
      transitionTimer=null;
      if(generation!==transitionGeneration)return;
      var next=queuedLiveIndex;
      transitionAwaitingStart=true;
      player.autoLoading=false;
      // Recovery matters for asynchronously fetched default-game SID files.
      transitionRecovery=setTimeout(function(){
        transitionRecovery=null;
        if(generation!==transitionGeneration||!transitionAwaitingStart)return;
        transitionAwaitingStart=false;transitionBusy=false;queuedLiveIndex=null;
        pendingNewSidUnmute=false;
        player.autoLoading=false;
        restoreFullVolume();
        $('#ricoLiveStatus').text('SID loading took too long; volume restored.');
        renderLivePlaylist();
      },6000);
      function switchWhenReady(){
        if(generation!==transitionGeneration||!transitionAwaitingStart)return;
        try{performSidSwitch(next);}
        catch(error){
          resetSoftTransition(false);
          $('#ricoLiveStatus').text('Could not switch SID: '+error.message);
        }
      }
      var stream=customActive?activeReferenceStream:null;
      var nextEntry=(player.sidList||[])[next];
      if(stream&&nextEntry&&nextEntry._hvscRef&&!nextEntry.localBytes){
        // If decoding outlasts the fade, hold the outgoing gain at its floor
        // until the new SID is ready; don't restore stale/repeated audio.
        stream.loadSlot(nextEntry).then(function(){
          if(activeReferenceStream===stream&&customActive)switchWhenReady();
        }).catch(function(error){
          if(generation!==transitionGeneration)return;
          resetSoftTransition(false);
          $('#ricoLiveStatus').text('Could not load selected SID: '+error.message);
        });
      }else switchWhenReady();
    },playing&&fadeGainNode?FADE_OUT_MS:20);
  }
  // Stop/pause must never leave a pending timer that starts a different track.
  $('#stopButton').on('click',function(){resetSoftTransition(false);});
  $('#playButton').on('click',function(){
    if(transitionBusy&&!player.isPlaying)resetSoftTransition(false);
  });

  var defaultRenderList = player.initFileSelection;
  var defaultNextSid = player.nextSid;
  var defaultPopPath = player.popPath;
  var originalDisplayInfo = player.displaySongInfo;
  var custom = [];
  // TEST73: imported files remain separate from shared/community playback buffers.
  var importedSidEntries = [];
  function renderImportedSidList(){
    var holder=document.getElementById('ricoImportTrackList');
    if(!holder)return;
    var count=document.getElementById('ricoImportTrackCount');
    if(count)count.textContent=importedSidEntries.length+' SID';
    holder.textContent='';
    if(!importedSidEntries.length){
      holder.textContent='No imported SID yet. Use ADD SID FILES or ADD FOLDER.';
      return;
    }
    importedSidEntries.forEach(function(entry,index){
      var row=document.createElement('div');row.className='rico-import-track-row';
      var title=document.createElement('span');
      title.textContent=(index+1)+'. '+(entry.name||entry.file)+' — ' +formatArtistCredit(entry.author||'Unknown');
      row.appendChild(title);
      var del=document.createElement('button');del.type='button';del.textContent='×';
      del.title='Remove from local import draft';del.setAttribute('aria-label','Remove '+entry.name);
      del.addEventListener('click',function(){
        importedSidEntries.splice(index,1);
        renderImportedSidList();
        $('#ricoPlaylistStatus').text(importedSidEntries.length+' SID in local import draft. Save to keep.');
      });
      row.appendChild(del);holder.appendChild(row);
    });
  }
  var customActive = false;
  var importing = false;
  var liveVisible = true; // TEST21: PLAYLIST ON at startup
  var landingPlaylists = true; // TEST22: RICO'S PLAYLISTS, not GAMES, is the initial home view.
  var browserTab = 'community'; // TEST37: browsing tab is independent from active playback source.
  var cancelPendingCommunityStartup = function() {};
  // The title belongs to the playlist currently loaded, not the text being edited.
  var loadedPlaylistTitle = '';
  // TEST32: playlist curator is separate from the artist metadata of each SID.
  var loadedPlaylistCreator = '';
  // TEST63: the loaded public v2 playlist is editable locally until beta-authorized PUT.
  var activePublicPlaylist = null;
  // TEST94: loaded published contributed SID collection; reorder only its references.
  var activePublicCollection = null;
  // TEST170: NO HVSC-only visual subgroups; preserve original SID order.
  var NO_HVSC_COLLECTION_ID='00000000-0000-4000-8000-000000000001';
  // TEST170 FIX1: verified by the curator as one artist. The three
  // SID binaries were archived together on 2026-11-10. Preserve their
  // original header credits; this overrides artist GROUPING only.
  var NO_HVSC_ARTIST_OVERRIDES={
    '72036d4c4426f9284b9e8052c5db916b7a5fb8ea842e0e1b824addb326466899':'Uctumi',
    '0d1bab81f0371a13fab1fbff83adf56485f0a985914a313791f61a5041b982ae':'Uctumi',
    'a6d5e428666d2fab00ad408d02facc9b938c1bab5f148d79653d168f39519860':'Uctumi'
  };
  // TEST95: ranked TOP 100 sources retain their published order and entries.
  var loadedRankedPlaylist=false;
  // TEST132: render ranked releases in the standard floating playlist.
  var activeCsdbRankDisplay=null;
  function resetCsdbRankDisplay(){activeCsdbRankDisplay=null;$('#playButton,#nextSid,#prevSid').prop('disabled',false);}
  // TEST106: source identity for saving editable playlists and REMIX drafts.
  var activeRemixDraftId=null;
  var activeReferenceTracks=null;
  // TEST112: progressive load state for large HVSC reference playlists.
  var activeReferenceStream=null;
  var referenceSwitchSerial=0;
  var activeLocalSavedId=null;
  var activeLocalOrderDirty=false;
  // TEST110: legacy HVSC playlist can be adopted into editable Cloudflare D1.
  // This is a UI catalog identity, not a new SID binary collection.
  var activeCuratedCatalogId=null;
  function isOldSidCurated(){return activeCuratedCatalogId==='old-sid-collection-rico';}
  // TEST93: Resolve historical HVSC source filenames against the real HVSC #85
  // shelf index. Do not guess pack paths or use a filename match alone.
  var embeddedHvscPaths=[];
  var hvscResolveCache=new Map();
  const originalGamesHvscPaths={
    'Arkanoid.sid':'MUSICIANS/G/Galway_Martin/Arkanoid.sid',
    'Bionic_Commando.sid':'MUSICIANS/F/Follin_Tim/Bionic_Commando.sid',
    'Commando.sid':'MUSICIANS/H/Hubbard_Rob/Commando.sid',
    'Cybernoid_II.sid':'MUSICIANS/T/Tel_Jeroen/Cybernoid_II.sid',
    'Delta.sid':'MUSICIANS/H/Hubbard_Rob/Delta.sid',
    'Driller.sid':'MUSICIANS/G/Gray_Matt/Driller.sid',
    'Ghouls_n_Ghosts.sid':'MUSICIANS/F/Follin_Tim/Ghouls_n_Ghosts.sid',
    'IK_plus.sid':'MUSICIANS/H/Hubbard_Rob/IK_plus.sid',
    'Kentilla.sid':'MUSICIANS/H/Hubbard_Rob/Kentilla.sid',
    'Monty_on_the_Run.sid':'MUSICIANS/H/Hubbard_Rob/Monty_on_the_Run.sid',
    'Mutants.sid':'MUSICIANS/G/Gray_Fred/Mutants.sid',
    'Parallax.sid':'MUSICIANS/G/Galway_Martin/Parallax.sid',
    'R-Type.sid':'MUSICIANS/H/Huelsbeck_Chris/R-Type.sid',
    'RoboCop_3.sid':'MUSICIANS/T/Tel_Jeroen/RoboCop_3.sid',
    'Sanxion.sid':'MUSICIANS/H/Hubbard_Rob/Sanxion.sid',
    'Stormlord.sid':'MUSICIANS/B/Bjerregaard_Johannes/Stormlord.sid',
    'Tetris.sid':'MUSICIANS/B/Beben_Wally/Tetris.sid',
    'Last_Ninja.sid':'MUSICIANS/D/Daglish_Ben/Last_Ninja.sid',
    'Last_Ninja_2.sid':'MUSICIANS/G/Gray_Matt/Last_Ninja_2.sid',
    'Turbo_Outrun.sid':'MUSICIANS/T/Tel_Jeroen/Turbo_Outrun.sid',
    'Wizball.sid':'MUSICIANS/G/Galway_Martin/Wizball.sid',
    'Zoids.sid':'MUSICIANS/H/Hubbard_Rob/Zoids.sid'
  };
  async function resolveOriginalHvscPath(originalPath){
    if(typeof originalPath!=='string' || originalPath.length>350 ||
      !/^(?:MUSICIANS|DEMOS)\/[A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+\.sid$/.test(originalPath) ||
      originalPath.includes('..'))throw Error('No verified HVSC source path for this SID.');
    var parts=originalPath.split('/');
    var category=parts[0].toLowerCase(),shelf=parts[1];
    var sectionName=category==='musicians'?parts[2]:shelf;
    var innerFile=parts.slice(category==='musicians'?3:2).join('/');
    if(!innerFile)throw Error('HVSC source filename is missing.');
    var url='library/data/'+category+'-'+shelf.replace(/[^A-Za-z0-9_-]/g,'_')+'.json';
    var indexPromise=hvscResolveCache.get(url);
    if(!indexPromise){
      indexPromise=(async function(){
        var response=await fetch(url);
        if(!response.ok)throw Error('HVSC #85 shelf unavailable ('+response.status+').');
        var data=await response.json();
        if(!data||data.shelf!==shelf||!Array.isArray(data.sections)||
           String(data.category).toLowerCase()!==category)
          throw Error('Invalid HVSC shelf index.');
        return data;
      })();
      hvscResolveCache.set(url,indexPromise);
      if(hvscResolveCache.size>8)hvscResolveCache.delete(hvscResolveCache.keys().next().value);
    }
    var shelfIndex;
    try{shelfIndex=await indexPromise;}
    catch(error){hvscResolveCache.delete(url);throw error;}
    var section=shelfIndex.sections.find(function(x){
      return x.name===sectionName&&!x.virtualArtist&&Array.isArray(x.tracks);
    });
    var entry=section&&section.tracks.find(function(t){return t.file===innerFile;});
    if(!entry)throw Error('Original SID path not found in HVSC #85: '+originalPath);
    var pack=entry.pack||section.pack;
    if(typeof pack!=='string'||!/^library\/packs\/(?:musicians|demos)\/[A-Za-z0-9_./-]+\.zip$/.test(pack)||
       pack.includes('..'))throw Error('Invalid HVSC ZIP reference.');
    return {pack:pack,file:entry.file,title:entry.title||entry.file,
      artist:entry.author||''};
  }

  var communityWriteApi='https://ricos-sid-community.serigrafiamdp.workers.dev';
  var savingCommunityEdits=false;
  function promptBetaKey(){return window.prompt('BETA KEY required to publish permanent changes:');}
  async function ensureBetaServerReady(){
    var response=await fetch(communityWriteApi+'/capabilities',{cache:'no-store'});
    if(!response.ok)throw Error('TEST63 backend not deployed yet. No public changes were made.');
    var data=await response.json();
    if(!data||!data.betaKeyRequired||!['remove-only','metadata-and-delete'].includes(data.editMode)||!data.configured)
      throw Error('TEST63 beta protection is not configured in Cloudflare.');
  }



  function escapeFilename(name) {
    return (name || '').replace(/\.[sS][iI][dD]$/, '')
      .replace(/^\s*\d+[\s._-]+/, '').replace(/[_]+/g, ' ').trim();
  }
  function field(bytes, start) {
    var end = Math.min(start + 32, bytes.length), value = '';
    for (var i = start; i < end && bytes[i]; i++) {
      var code = bytes[i];
      value += (code >= 32 && code < 127) ? String.fromCharCode(code) : (code >= 160 ? String.fromCharCode(code) : ' ');
    }
    return value.replace(/\s+/g, ' ').trim();
  }
  function u16(b, n) { return (b[n] << 8) | b[n + 1]; }
  function parseSID(bytes, file) {
    if (bytes.length < 0x76) return null;
    var magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic !== 'PSID' && magic !== 'RSID') return null;
    var version = u16(bytes, 4), songs = u16(bytes, 0x0e), start = u16(bytes, 0x10);
    if (version < 1 || version > 4 || songs < 1 || songs > 256) return null;
    var title = field(bytes, 0x16) || escapeFilename(file.name) || file.name;
    var author = field(bytes, 0x36) || 'Unknown artist';
    var released = field(bytes, 0x56) || '';
    return {
      id: 'local-' + custom.length,
      name: title, author: author, released: released,
      file: file.name, size: file.size, image: '',
      numSubtunes: songs, startSubtune: Math.max(1, Math.min(songs, start || 1)),
      sidFormat: magic + ' v' + version,
      localBytes: bytes
    };
  }
  function customInfo() {
    if (!customActive) return;
    var entry = player.sidList[player.sidListIndex];
    if (!entry || !entry.localBytes) return;
    var info = $('<div>').css({padding:'5px', color:'#222', fontSize:'11px'});
    $('<strong>').text(entry.name).appendTo(info);
    $('<p>').text('Author: ' + formatArtistCredit(entry.author)).appendTo(info);
    $('<p>').text('Released: ' + (entry.released || 'Not provided')).appendTo(info);
    $('<p>').text('Format: ' + entry.sidFormat).appendTo(info);
    $('<p>').text('Subtunes: ' + entry.numSubtunes + ' / default: ' + entry.startSubtune).appendTo(info);
    $('<p>').text('Duration: not included in PSID/RSID metadata. AUTO uses the configured fallback.').appendTo(info);
    $('#sidInfoContent').empty().append(info);
  }
  player.displaySongInfo = function () {
    originalDisplayInfo.apply(this, arguments);
    customInfo();
    renderLivePlaylist();
  };

  // TEST33: create the credit strip from JS as well, so it remains available
  // when a browser serves an older cached HTML shell.
  function ensureLivePlaylistCredits() {
    var header = document.getElementById('ricoLivePlaylistHeader');
    if (!header) return null;
    var credits = document.getElementById('ricoLivePlaylistCredits');
    if (!credits) {
      credits = document.createElement('div');
      credits.id = 'ricoLivePlaylistCredits';
      credits.setAttribute('aria-label', 'Playlist curator and future ratings');
      header.insertAdjacentElement('afterend', credits);
    }
    if (!document.getElementById('ricoLivePlaylistCreator')) {
      var curator = document.createElement('span');
      curator.id = 'ricoLivePlaylistCreator';
      credits.appendChild(curator);
    }
    if (!document.getElementById('ricoLivePlaylistStars')) {
      var rating = document.createElement('span');
      rating.id = 'ricoLivePlaylistStars';
      rating.title = 'Ratings coming soon';
      rating.setAttribute('aria-label', 'Ratings coming soon');
      var stars = document.createElement('span');
      stars.setAttribute('aria-hidden', 'true');
      stars.textContent = '☆☆☆☆☆';
      var note = document.createElement('span');
      note.className = 'rico-rating-note';
      note.textContent = 'Ratings coming soon';
      rating.appendChild(stars);
      rating.appendChild(note);
      credits.appendChild(rating);
    }
    return credits;
  }

  // TEST105: single click moves one slot; double click moves ten slots, never twelve.
  // Wait for the browser's double-click window BEFORE modifying the DOM. Otherwise
  // the first click re-renders the button and a dblclick cannot reach it.
  var REORDER_CLICK_DELAY_MS=420;
  var reorderHint=null;
  function hideReorderHint(){
    if(reorderHint)reorderHint.style.display='none';
  }
  function showReorderHint(event,message){
    if(!reorderHint){
      reorderHint=document.createElement('div');
      reorderHint.id='ricoReorderHint';
      reorderHint.setAttribute('role','tooltip');
      document.body.appendChild(reorderHint);
    }
    reorderHint.textContent=message;
    reorderHint.style.display='block';
    var x=Math.min(event.clientX+12,window.innerWidth-reorderHint.offsetWidth-8);
    var y=Math.min(event.clientY+17,window.innerHeight-reorderHint.offsetHeight-8);
    reorderHint.style.left=Math.max(5,x)+'px';
    reorderHint.style.top=Math.max(5,y)+'px';
  }
  // TEST117: themed hints for playlist action buttons; never invoke the browser's white title tooltip.
  function bindThemedPlaylistHint(button,message){
    button.removeAttr('title');
    button.on('pointerenter pointermove',function(event){
      if(!button.prop('disabled'))showReorderHint(event,message);
    });
    button.on('pointerleave blur',hideReorderHint);
    return button;
  }
  function bindReorderArrows(button,direction,action){
    var word=direction<0?'up':'down';
    var instruction='Single click: move '+word+' 1 position. Double-click: move '+word+' 10 positions.';
    // TEST113: custom themed hint is shown by showReorderHint; avoid native browser title tooltip.
    button.removeAttr('title')
      .attr('aria-label',instruction);
    var pending=null;
    button.on('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      if(event.detail>=2){
        if(pending!==null){clearTimeout(pending);pending=null;}
        return;
      }
      if(pending!==null)clearTimeout(pending);
      pending=setTimeout(function(){
        pending=null;hideReorderHint();action(direction);
      },REORDER_CLICK_DELAY_MS);
    });
    button.on('dblclick',function(event){
      event.preventDefault();
      event.stopPropagation();
      if(pending!==null){clearTimeout(pending);pending=null;}
      hideReorderHint();action(direction*10);
    });
    button.on('pointerenter pointermove',function(event){
      if(!button.prop('disabled'))showReorderHint(event,instruction);
    });
    button.on('pointerleave blur',hideReorderHint);
    return button;
  }
  function insertAt(array,from,to){
    array.splice(to,0,array.splice(from,1)[0]);
  }
  function relocateCursor(cursor,from,to){
    if(typeof cursor!=='number')return cursor;
    if(cursor===from)return to;
    if(from<to&&cursor>from&&cursor<=to)return cursor-1;
    if(from>to&&cursor>=to&&cursor<from)return cursor+1;
    return cursor;
  }
  // TEST94/105: reorder without restarting SID or losing metadata/reference sync.
  function moveLiveSong(index,step){
    if(!customActive||loadedRankedPlaylist||savingCommunityEdits||index<0||index>=custom.length)return;
    var destination=Math.max(0,Math.min(custom.length-1,index+step));
    if(destination===index)return;
    insertAt(custom,index,destination);
    largePlaylistStructureRevision++;
    if(embeddedHvscPaths.length===custom.length)
      insertAt(embeddedHvscPaths,index,destination);
    if(activePublicPlaylist&&activePublicPlaylist.tracks.length===custom.length){
      insertAt(activePublicPlaylist.tracks,index,destination);
      activePublicPlaylist.dirtyOrder=true;
    }
    if(activePublicCollection&&activePublicCollection.tracks.length===custom.length){
      insertAt(activePublicCollection.tracks,index,destination);
      activePublicCollection.dirtyOrder=true;
    }
    if(activeReferenceTracks&&activeReferenceTracks.length===custom.length)
      insertAt(activeReferenceTracks,index,destination);
    if(!activePublicPlaylist&&!activePublicCollection)activeLocalOrderDirty=true;
    // TEST152: moving a song inside a linked published draft must update the
    // private draft order (not only a temporary local playback order).
    // Keep any new songs added to the draft since playback opened.
    if(activeRemixDraftId){
      var reorderedDraft=remixDrafts.find(function(d){return d.id===activeRemixDraftId;});
      if(reorderedDraft&&reorderedDraft.remoteEditId&&
         activeReferenceTracks&&activeReferenceTracks.length===custom.length){
        var trackByKey=new Map(reorderedDraft.tracks.map(function(t){
          return [remixRefKey(t),t];
        }));
        var used=new Set(),newOrder=[];
        activeReferenceTracks.forEach(function(ref){
          var key=remixRefKey(ref);
          if(trackByKey.has(key)&&!used.has(key)){
            newOrder.push(trackByKey.get(key));used.add(key);
          }
        });
        reorderedDraft.tracks.forEach(function(t){
          var key=remixRefKey(t);
          if(!used.has(key)){newOrder.push(t);used.add(key);}
        });
        reorderedDraft.tracks=newOrder;
        activeLocalOrderDirty=false;
        preserveRemixes();
        renderRemixes();
      }
    }
    player.sidListIndex=relocateCursor(player.sidListIndex,index,destination);
    selectedLiveIndex=relocateCursor(selectedLiveIndex,index,destination);
    queuedLiveIndex=relocateCursor(queuedLiveIndex,index,destination);
    renderLivePlaylist();
    var scroller=document.getElementById('ricoLivePlaylistItems');
    var movedRow=scroller&&(activePublicCollection&&activePublicCollection.id===NO_HVSC_COLLECTION_ID
      ?scroller.querySelector('.rico-live-edit-row[data-sid-index="'+destination+'"]')
      :scroller.children[destination]);
    if(movedRow){
      var moved=movedRow.getBoundingClientRect(),visible=scroller.getBoundingClientRect();
      if(moved.top<visible.top)scroller.scrollTop-=visible.top-moved.top+4;
      else if(moved.bottom>visible.bottom)scroller.scrollTop+=moved.bottom-visible.bottom+4;
    }
    $('#ricoLiveStatus').text((activeRemixDraftId&&remixDrafts.some(function(d){
      return d.id===activeRemixDraftId&&d.remoteEditId;
    }))||activePublicPlaylist
      ? 'Order changed. Press REPUBLISH to update the published playlist.'
      : activePublicCollection||isOldSidCurated()
        ? 'Order changed. Press SAVE and enter the beta key to keep it publicly.'
        : 'Order changed. Press SAVE to keep this order without publishing.');
  }
  function removeLiveSong(index){
    if(!customActive||loadedRankedPlaylist||savingCommunityEdits||activePublicCollection||index<0||index>=custom.length)return;
    var wasCurrent=player.sidListIndex===index;
    custom.splice(index,1);
    largePlaylistStructureRevision++;
    if(activePublicPlaylist&&Array.isArray(activePublicPlaylist.tracks))activePublicPlaylist.tracks.splice(index,1);
    if(embeddedHvscPaths.length===custom.length+1)embeddedHvscPaths.splice(index,1);
    if(activeReferenceTracks&&activeReferenceTracks.length===custom.length+1)activeReferenceTracks.splice(index,1);
    if(!activePublicPlaylist&&!activePublicCollection)activeLocalOrderDirty=true;
    if(!custom.length){
      player.isPlaying=false;player.isPaused=false;
      player.sidListIndex=false;
      player.initFileSelection();
      $('#ricoLiveStatus').text('Empty temporary playlist. Reload original to restore songs.');
    }else if(wasCurrent){
      loadCustomIndex(Math.min(index,custom.length-1));
    }else{
      if(typeof player.sidListIndex==='number' && index<player.sidListIndex)player.sidListIndex--;
      player.initFileSelection();
    }
    renderLivePlaylist();
    $('#ricoLiveStatus').text('Song removed temporarily. Reload to undo.'+
      (activePublicPlaylist&&activePublicPlaylist.remoteId?' Use SAVE CHANGES + beta key to update the public list.':''));
  }
  // TEST64: the public beta key is requested in a small, accessible overlay.
  // Never persist it in localStorage, DOM attributes or GitHub.
  function askBetaKeyDialog(action){
    return new Promise(function(resolve){
      var cover=document.createElement('div');
      cover.className='rico-beta-overlay';
      var dialog=document.createElement('form');
      dialog.className='rico-beta-dialog';
      dialog.setAttribute('role','dialog');
      dialog.setAttribute('aria-modal','true');
      dialog.setAttribute('aria-label','Beta key for saving playlist');
      var heading=document.createElement('strong');
      heading.textContent=action==='ARCHIVE'?'ARCHIVE NO HVSC':(action==='PUBLISH'?'PUBLISH PLAYLIST':'SAVE CHANGES');
      var message=document.createElement('p');
      message.textContent=action==='ARCHIVE'
        ?'Save these SID files publicly in NO HVSC for preservation and REMIX. Only archive music you have permission to share. Enter your beta key.'
        :(action==='PUBLISH'?'Enter the beta key to publish this playlist for everyone.':
          'Enter the beta key to publish changes to the original playlist for everyone (added, removed or reordered songs).');
      var input=document.createElement('input');
      input.type='password';input.placeholder='Beta key';input.autocomplete='off';
      input.setAttribute('aria-label','Beta key');
      input.required=true;
      var actions=document.createElement('div');actions.className='rico-beta-actions';
      var cancel=document.createElement('button');cancel.type='button';cancel.textContent='CANCEL';
      var save=document.createElement('button');save.type='submit';save.textContent=action==='ARCHIVE'?'ARCHIVE':(action==='PUBLISH'?'PUBLISH':'SAVE');
      actions.appendChild(cancel);actions.appendChild(save);
      dialog.appendChild(heading);dialog.appendChild(message);dialog.appendChild(input);dialog.appendChild(actions);
      cover.appendChild(dialog);document.body.appendChild(cover);
      var finished=false;
      function finish(value){
        if(finished)return;finished=true;
        document.removeEventListener('keydown',onKey,true);
        cover.remove();resolve(value);
      }
      function onKey(event){
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(null);}
        else if(event.target===input)event.stopPropagation();
      }
      // Protect the input from the original SID player keyboard and mouse listeners.
      ['mousedown','mouseup','pointerdown','pointerup','click','dblclick','keydown','keyup','keypress'].forEach(function(type){
        dialog.addEventListener(type,function(event){event.stopPropagation();});
      });
      dialog.addEventListener('submit',function(event){event.preventDefault();event.stopPropagation();finish(input.value||null);});
      cancel.addEventListener('click',function(){finish(null);});
      cover.addEventListener('click',function(event){if(event.target===cover)finish(null);});
      document.addEventListener('keydown',onKey,true);
      input.focus();
    });
  }

  // TEST165: NO HVSC is a permanent public SID archive. Import alone keeps
  // files local. The beta-key dialog explicitly authorizes archival.
  function toNoHvscBase64(bytes){
    var binary='';
    for(var at=0;at<bytes.length;at+=8192)
      binary+=String.fromCharCode.apply(null,bytes.subarray(at,at+8192));
    return btoa(binary);
  }
  async function binarySidHash(bytes){
    var digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.prototype.map.call(new Uint8Array(digest),function(v){
      return v.toString(16).padStart(2,'0');
    }).join('');
  }
  function noHvscFileName(item){
    var name=String(item.file||item.name||'sid').split(/[\/\\]/).pop()
      .replace(/[<>:*?|]/g,'_').slice(0,195);
    return /\.sid$/i.test(name)?name:name.replace(/\.[^.]*$/,'')+'.sid';
  }
  async function archiveImportedSidFiles(items,required){
    var entries=items.filter(function(item){
      return item&&item.localBytes instanceof Uint8Array&&
        !item._noHvscAssetId;
    });
    if(!entries.length)return 0;
    var capResponse=await fetch(communityWriteApi+'/capabilities',{cache:'no-store'});
    if(!capResponse.ok)throw Error('NO HVSC archive service unavailable.');
    var cap=await capResponse.json();
    if(!cap.noHvscArchive||!cap.sidUploadsEnabled){
      if(required)throw Error('NO HVSC archive needs the updated Cloudflare Worker and SID storage. Files remain local.');
      $('#ricoPlaylistStatus').text('Imported locally. NO HVSC archiving needs Cloudflare Worker TEST165.');
      return 0;
    }
    // A previously archived identical binary can be reused without uploading.
    var archived=await fetch(communityWriteApi+'/no-hvsc',{cache:'no-store'});
    if(!archived.ok)throw Error('Cannot verify the NO HVSC archive.');
    var catalog=await archived.json();
    if(!Array.isArray(catalog.tracks))throw Error('Invalid NO HVSC catalog.');
    var known=new Map(catalog.tracks.map(function(t){return [t.sidId,t];}));
    var pending=[];
    for(var entry of entries){
      var id=await binarySidHash(entry.localBytes);
      var stored=known.get(id);
      if(stored){
        entry._noHvscAssetId=id;
        entry._noHvscFile=stored.file;
      }else pending.push({entry:entry,id:id,file:noHvscFileName(entry)});
    }
    if(!pending.length)return 0;
    var key=await askBetaKeyDialog('ARCHIVE');
    if(!key){
      if(required)throw Error('NO HVSC archive cancelled; SID remains local.');
      return 0;
    }
    var maxBatch=Math.max(1,Number(cap.sidUploadLimit)||15),saved=0;
    // Reuse the existing GitHub/R2 upload batch size.
    for(var start=0;start<pending.length;start+=maxBatch){
      var batch=pending.slice(start,start+maxBatch);
      $('#ricoPlaylistStatus').text('Archiving '+(start+1)+'–'+Math.min(start+batch.length,pending.length)+' of '+pending.length+' SID in NO HVSC...');
      var result=await fetch(communityWriteApi+'/no-hvsc',{
        method:'POST',headers:{'Content-Type':'application/json','X-Beta-Key':key},
        body:JSON.stringify({format:'ricos-no-hvsc-upload',version:1,
          tracks:batch.map(function(row){return {file:row.file,
            sidBase64:toNoHvscBase64(row.entry.localBytes)};})})
      });
      var receipt=await result.json().catch(function(){return {};});
      if(!result.ok)throw Error(receipt.error||'NO HVSC archive failed (HTTP '+result.status+')');
      if(receipt.format!=='ricos-no-hvsc-receipt'||!Array.isArray(receipt.tracks)||
         receipt.tracks.length!==batch.length)
        throw Error('NO HVSC server did not confirm the SID archives.');
      // A confirmed D1 GET is required before a track can be used in Remix.
      var check=await fetch(communityWriteApi+'/no-hvsc?check='+Date.now(),{cache:'no-store'});
      if(!check.ok)throw Error('NO HVSC archive verification failed.');
      var reloaded=await check.json();
      var verified=new Map((reloaded.tracks||[]).map(function(t){return [t.sidId,t];}));
      for(var i=0;i<batch.length;i++){
        var row=batch[i],remote=receipt.tracks[i],confirmed=verified.get(row.id);
        if(remote.sidId!==row.id||!confirmed)
          throw Error('NO HVSC could not verify '+row.file+'. Keep the original file.');
        var checkAsset=await fetch(communityWriteApi+'/sid-assets/'+row.id,{cache:'no-store'});
        if(!checkAsset.ok)
          throw Error('NO HVSC binary cannot be downloaded: '+row.file+'. Keep the original file.');
        var storedBytes=new Uint8Array(await checkAsset.arrayBuffer());
        if((await binarySidHash(storedBytes))!==row.id)
          throw Error('NO HVSC binary integrity verification failed: '+row.file+'.');
        row.entry._noHvscAssetId=row.id;
        row.entry._noHvscFile=confirmed.file||row.file;
        saved++;
      }
    }
    $('#ricoPlaylistStatus').text(saved+' new SID archived in NO HVSC and available for REMIX.');
    return saved;
  }
  function startNoHvscArchive(entries,required){
    var running=archiveImportedSidFiles(entries,required);
    entries.forEach(function(entry){entry._noHvscPending=running;});
    var clean=function(){entries.forEach(function(entry){
      if(entry._noHvscPending===running)entry._noHvscPending=null;
    });};
    running.then(clean,clean);
    return running;
  }
  // TEST107: a 2xx response is not proof that the ordering was persisted.
  // Re-read the canonical Cloudflare record and compare every immutable SID ref.
  async function verifyRemoteOrder(url,expected,kind){
    var response=await fetch(url+'?verify='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw Error('Cannot verify saved order on server (HTTP '+response.status+').');
    var data=await response.json();
    if(!data||!Array.isArray(data.tracks)||data.tracks.length!==expected.length)
      throw Error('Server returned a different number of tracks after SAVE.');
    var same=data.tracks.every(function(row,index){
      var want=expected[index];
      return kind==='collection'
        ? row.sidId===want.sidId&&row.file===want.file
        : remixRefKey(row)===remixRefKey(want);
    });
    if(!same)throw Error('Server order differs from the playlist. SAVE was not confirmed; do not reload yet.');
    return data;
  }
  // TEST110: one-time adoption of OLD SID COLLECTION RICO from GitHub to D1.
  // Keep all 298 verified HVSC references, with no uploaded SID binaries.
  // On an uncertain previous POST, look up the existing D1 list instead of
  // publishing duplicates. The current playing list is never rebuilt here.
  async function adoptOldSidCollection(){
    if(savingCommunityEdits||!isOldSidCurated()||loadedRankedPlaylist||!customActive)return;
    if(!activeReferenceTracks||activeReferenceTracks.length!==custom.length||!custom.length)
      throw Error('SID references lost synchronization; reload the playlist before saving.');
    var desired=activeReferenceTracks.map(remixCanonicalRef);
    var identity=remixRefKey;
    if(new Set(desired.map(identity)).size!==desired.length)
      throw Error('Duplicate reference detected; no changes published.');
    var key=await askBetaKeyDialog('SAVE');
    if(!key)return;
    await ensureBetaServerReady();
    savingCommunityEdits=true;renderLivePlaylist();
    try{
      var listResponse=await fetch(communityWriteApi+'/playlists',{cache:'no-store'});
      if(!listResponse.ok)throw Error('Public playlist catalog unavailable; no upload was attempted.');
      var listing=await listResponse.json();
      if(!listing||!Array.isArray(listing.playlists))
        throw Error('Invalid public playlist catalog. No upload attempted.');
      var matches=listing.playlists.filter(function(t){
        return t&&t.title==='OLD SID COLLECTION RICO'&&t.createdBy==='RICO'&&
          typeof t.id==='string'&&/^[a-z0-9-]{12,48}$/i.test(t.id);
      });
      if(matches.length>1)throw Error('Multiple editable OLD SID COLLECTION RICO lists found. Resolve duplicates before saving.');
      var id=matches.length?matches[0].id:'';
      var url=id?communityWriteApi+'/playlists/'+encodeURIComponent(id):communityWriteApi+'/playlists';
      var payload={format:'ricos-sid-playlist',version:2,
        name:'OLD SID COLLECTION RICO',createdBy:'RICO',tracks:desired};
      if(id){
        var priorResponse=await fetch(url+'?compare='+Date.now(),{cache:'no-store'});
        if(!priorResponse.ok)throw Error('Existing editable playlist could not be read.');
        var prior=await priorResponse.json();
        var available=new Set((prior.tracks||[]).map(identity));
        if(prior.tracks.length!==desired.length||desired.some(function(t){return !available.has(identity(t));}))
          throw Error('An editable version exists but its song selection changed. Load that public version instead of overwriting its changes.');
      }
      var response=await fetch(url,{
        method:id?'PUT':'POST',
        headers:{'Content-Type':'application/json','X-Beta-Key':key},
        body:JSON.stringify(payload)
      });
      var raw=await response.text(),result;
      try{result=JSON.parse(raw);}catch(parseErr){result={error:raw.slice(0,200)};}
      if(!response.ok&&!(id&&response.status===400&&result.error==='No playlist changes to save'))
        throw Error(result.error||'Cloudflare SAVE failed (HTTP '+response.status+').');
      if(!id){
        if(!result.id)throw Error('Cloudflare did not return the new playlist ID. Do not repeat POST until checking the public catalog.');
        id=result.id;
      }
      var readUrl=communityWriteApi+'/playlists/'+encodeURIComponent(id);
      await verifyRemoteOrder(readUrl,desired,'playlist');
      activePublicPlaylist={remoteId:id,name:payload.name,createdBy:payload.createdBy,
        tracks:desired.slice(),originalCount:desired.length,dirtyOrder:false};
      activeCuratedCatalogId=null;
      activeLocalOrderDirty=false;
      renderLivePlaylist();
      $('#ricoLiveStatus').text('SAVE verified: OLD SID COLLECTION RICO is now public and editable ('+desired.length+' HVSC SID).');
      if(typeof window.ricoRefreshCommunityCatalog==='function'){
        try{await window.ricoRefreshCommunityCatalog();}
        catch(refreshError){console.warn('Cloudflare SAVE succeeded; catalog refresh pending',refreshError);}
      }
    }catch(error){
      console.warn('TEST110: OLD SID collection adoption unverified',error);
      $('#ricoLiveStatus').text('SAVE NOT VERIFIED: '+error.message+' Original order remains available. Retry only after checking the public catalog.');
    }finally{savingCommunityEdits=false;renderLivePlaylist();}
  }
  async function savePublicRemovals(){
    var collection=activePublicCollection,playlist=activePublicPlaylist;
    if(savingCommunityEdits||(!collection&&!playlist))return;
    var changed=collection ? collection.dirtyOrder :
      (playlist.dirtyOrder||playlist.tracks.length!==playlist.originalCount);
    if(!changed){$('#ricoLiveStatus').text('No pending changes to save.');return;}
    if(playlist&&!playlist.tracks.length){
      $('#ricoLiveStatus').text('Keep at least one song in a public playlist.');return;
    }
    var key=await askBetaKeyDialog('SAVE');
    if(!key)return;
    try{await ensureBetaServerReady();}
    catch(error){$('#ricoLiveStatus').text(error.message);return;}
    savingCommunityEdits=true;renderLivePlaylist();
    try{
      var capabilitiesResponse=await fetch(communityWriteApi+'/capabilities',{cache:'no-store'});
      if(!capabilitiesResponse.ok)throw Error('Cannot check publication capabilities.');
      var cap=await capabilitiesResponse.json();
      if(collection&&!cap.sidCollectionReorder)
        throw Error('Cloudflare Worker TEST94 is not deployed yet. Public order was not changed; your local preview is preserved.');
      if(playlist&&playlist.dirtyOrder&&!cap.playlistReorder)
        throw Error('Cloudflare Worker TEST94 is not deployed yet. Public order was not changed; your local preview is preserved.');
      var url,method='PUT',payload;
      if(collection){
        url=communityWriteApi+'/collections/'+encodeURIComponent(collection.id)+'/order';
        payload={format:'ricos-sid-order',version:1,
          expected:collection.originalTracks.map(function(t){return {sidId:t.sidId,file:t.file};}),
          order:collection.tracks.map(function(t){return t.originalIndex;})};
      }else{
        url=communityWriteApi+'/playlists/'+encodeURIComponent(playlist.remoteId);
        payload={format:'ricos-sid-playlist',version:2,
          name:playlist.name,createdBy:playlist.createdBy,
          tracks:playlist.tracks.map(remixCanonicalRef)};
      }
      var response=await fetch(url,{
        method:method,headers:{'Content-Type':'application/json','X-Beta-Key':key},
        body:JSON.stringify(payload)
      });
      var receipt=await response.json();
      // If a previous request succeeded but its verification failed, some
      // backends report "no changes" on retry. Re-reading is authoritative.
      if(!response.ok&&!(!collection&&response.status===400&&
         receipt.error==='No playlist changes to save'))
        throw Error(receipt.error||'Could not save public order.');
      var readUrl=collection
        ? communityWriteApi+'/collections/'+encodeURIComponent(collection.id)
        : communityWriteApi+'/playlists/'+encodeURIComponent(playlist.remoteId);
      var expectedRows=collection
        ? collection.tracks.map(function(t){return {sidId:t.sidId,file:t.file};})
        : playlist.tracks.map(remixCanonicalRef);
      await verifyRemoteOrder(readUrl,expectedRows,collection?'collection':'playlist');
      if(collection){
        collection.originalTracks=collection.tracks.map(function(t){return {sidId:t.sidId,file:t.file};});
        collection.tracks.forEach(function(t,i){t.originalIndex=i;});
        collection.dirtyOrder=false;
      }else{
        playlist.originalCount=playlist.tracks.length;
        playlist.dirtyOrder=false;
      }
      $('#ricoLiveStatus').text('SAVE verified: '+expectedRows.length+' SID in the correct order on the server.');
    }catch(error){
      // Never erase an unsaved order or claim persistence when verification fails.
      console.warn('TEST107: public order not confirmed',error);
      $('#ricoLiveStatus').text('SAVE NOT VERIFIED: '+error.message+' The current order is still here; retry SAVE before reloading.');
    }finally{savingCommunityEdits=false;renderLivePlaylist();}
  }
  // TEST66: multiple, independent in-progress remix destinations.
  // Drafts contain only HVSC references and editorial labels, never SID bytes or beta keys.
  var remixDrafts=[],remixTarget='',remixOpen=false,remixBusy=false;
  var remixCounter=0;
  // TEST118: Published lists can be selected as destinations while another
  // playlist is playing. Only D1 reference lists can be updated in place.
  var publishedRemixChoices=[];
  // TEST150: the ADD + TO choice belongs to the listener, not playback.
  // Keep it independent from the current editing draft.
  var preferredRemixDestination='';
  try{preferredRemixDestination=localStorage.getItem('rico-add-to-destination')||'';}catch(e){}
  function rememberRemixDestination(value){
    preferredRemixDestination=value;
    try{localStorage.setItem('rico-add-to-destination',value);}catch(e){}
  }
  // TEST165: immutable SID assets from NO HVSC and original HVSC ZIP references.
  function remixRefKey(ref){return (ref.sidId?'sid:'+ref.sidId:'pack:'+ref.pack)+'::'+ref.file;}
  function remixRefPair(ref){return [ref.sidId||ref.pack,ref.file];}
  function remixCanonicalRef(ref){
    return ref.sidId?{sidId:ref.sidId,file:ref.file}:{pack:ref.pack,file:ref.file};
  }
  function validRemixRef(ref){
    if(!ref||typeof ref.file!=='string'||ref.file.includes('..')||
       ref.file.includes('\\')||!/^[^<>:*?|]+\.sid$/i.test(ref.file))return false;
    if(ref.sidId)return /^[a-f0-9]{64}$/.test(ref.sidId)&&!ref.file.includes('/')&&!ref.pack;
    return typeof ref.pack==='string'&&
      /^library\/packs\/(?:musicians|demos)\/[A-Za-z0-9_./-]+\.zip$/.test(ref.pack)&&
      !ref.pack.includes('..');
  }
  function remixTrackKeys(tracks){
    return JSON.stringify(tracks.map(remixRefPair));
  }
  async function remixSnapshotHash(tracks){
    var bytes=new TextEncoder().encode(remixTrackKeys(tracks));
    var digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),function(v){return v.toString(16).padStart(2,'0');}).join('');
  }
  // TEST162 — prepare the missing Los Pat Moritas SID for the existing
  // 20-track D1 playlist. Prefer HVSC references; originals are only used
  // when absent from the indexed HVSC collection. This is a PRIVATE DRAFT:
  // it NEVER changes the published playlist without REPUBLISH + beta key.
  async function stagePatMoritasAdditions(draft){
    if(!draft||draft.remoteEditId!=='8cf5e857-19d3-48cf-a154-53f046ee65e2')
      return 0;
    var response=await fetch('community/migrations/los-pat-moritas-2026.json',{cache:'no-store'});
    if(!response.ok)throw Error('Los Pat Moritas additions are not available ('+response.status+').');
    var manifest=await response.json();
    if(!manifest||manifest.format!=='spotysid-lpm-migration'||manifest.version!==1||
      manifest.publishedPlaylistId!==draft.remoteEditId||!Array.isArray(manifest.additions)||
      manifest.additions.length!==14)throw Error('Invalid Los Pat Moritas migration data.');
    var current=new Set(draft.tracks.map(function(t){return remixRefKey(t);}));
    var added=0;
    manifest.additions.forEach(function(ref){
      if(!ref||typeof ref.pack!=='string'||typeof ref.file!=='string'||!ref.title||
        !/^library\/packs\/musicians\/L\/[A-Za-z0-9_.-]+\.zip$/.test(ref.pack)||
        !/^[A-Za-z0-9_.-]+\.sid$/.test(ref.file))
        throw Error('Invalid additional Los Pat Moritas SID reference.');
      var key=remixRefKey(ref);
      if(current.has(key))return;
      current.add(key);
      draft.tracks.push({pack:ref.pack,file:ref.file,title:ref.title,artist:'Los Pat Moritas'});
      added++;
    });
    return added;
  }
  // TEST186: stage new Codeblasters HVSC references in the EXISTING public
  // playlist's private EDIT draft. Never change D1 without REPUBLISH + beta key.
  async function stageCodeblastersAdditions(draft){
    if(!draft||!draft.remoteEditId||!/(?:^|\b)code[\s_-]*blasters(?:\b|$)/i.test(String(draft.name||'')))
      return 0;
    var response=await fetch('community/migrations/the-codeblasters-2026.json',{cache:'no-store'});
    if(!response.ok)throw Error('The Codeblasters additions unavailable ('+response.status+').');
    var manifest=await response.json();
    if(!manifest||manifest.format!=='spotysid-group-migration'||manifest.version!==1||
      manifest.group!=='The Codeblasters'||!Array.isArray(manifest.additions)||
      manifest.additions.length!==6)throw Error('Invalid The Codeblasters migration data.');
    var known=new Set(draft.tracks.map(remixRefKey)),added=0;
    manifest.additions.forEach(function(ref){
      if(!validRemixRef(ref)||typeof ref.title!=='string'||!ref.title.trim())
        throw Error('Invalid Codeblasters SID reference.');
      var key=remixRefKey(ref);
      if(known.has(key))return;
      known.add(key);
      draft.tracks.push({pack:ref.pack,file:ref.file,title:ref.title,artist:ref.artist||''});
      added++;
    });
    return added;
  }
  async function beginPublishedEdit(id){
    if(!/^[a-z0-9-]{12,48}$/i.test(id))throw Error('Invalid published playlist ID.');
    var existing=remixDrafts.find(function(d){return d.remoteEditId===id;});
    if(existing){
      var addedExisting=await stagePatMoritasAdditions(existing);
      var addedCodeblasters=await stageCodeblastersAdditions(existing);
      remixTarget=existing.id;remixOpen=true;rememberRemixDestination('published:'+id);
      preserveRemixes();renderRemixes();
      remixNotice(addedExisting?
        'LOS PAT MORITAS: '+addedExisting+' missing SID added to your private draft. Use REPUBLISH to save the same public list.':
        addedCodeblasters?'THE CODEBLASTERS: '+addedCodeblasters+' missing SID prepared in this draft. Use REPUBLISH to save this same public list.':
        'Continuing unpublished changes for '+existing.name+'. ADD + TO is ready.');
      return;
    }
    if(remixDrafts.length>=25)throw Error('Maximum 25 editable drafts. Finish an existing one first.');
    var response=await fetch(communityWriteApi+'/playlists/'+encodeURIComponent(id),{cache:'no-store'});
    if(!response.ok)throw Error('Published playlist unavailable ('+response.status+').');
    var source=await response.json();
    if(!source||source.format!=='ricos-sid-playlist'||source.version!==2||
       !Array.isArray(source.tracks)||!source.tracks.length||source.tracks.length>2000||
       !source.tracks.every(validRemixRef))
      throw Error('This published playlist has invalid SID references.');
    // Do not start playback; copy reference paths into a private draft only.
    var tracks=source.tracks.map(function(t){return Object.assign(remixCanonicalRef(t),{title:t.title||t.file,artist:t.artist||''});});
    remixCounter++;
    var draft={id:'remix-'+Date.now()+'-'+remixCounter,name:source.name,
      creator:source.createdBy,remoteEditId:id,
      baseTracks:tracks.map(remixCanonicalRef),
      tracks:tracks};
    var addedSids=await stagePatMoritasAdditions(draft);
    var addedCodeblasters=await stageCodeblastersAdditions(draft);
    remixDrafts.push(draft);remixTarget=draft.id;remixOpen=true;
    rememberRemixDestination('published:'+id);
    preserveRemixes();renderRemixes();
    remixNotice(addedSids?
      'LOS PAT MORITAS: '+addedSids+' missing SID prepared ('+draft.tracks.length+' total). Press REPUBLISH and enter the beta key to update the existing public list.':
      addedCodeblasters?'THE CODEBLASTERS: '+addedCodeblasters+' missing SID prepared ('+draft.tracks.length+' total). Use REPUBLISH + beta key to update this same public playlist.':
      'Editing '+draft.name+' privately. Play any other list and press + to add its songs. PUBLISH CHANGES keeps the same public ID.');
  }
  async function selectRemixDestination(value){
    rememberRemixDestination(value);
    if(value.indexOf('published:')!==0){
      remixTarget=value;
      preserveRemixes();renderRemixes();
      return;
    }
    var id=value.slice('published:'.length);
    renderRemixes();
    try{await beginPublishedEdit(id);}
    catch(error){remixNotice('Could not select published playlist: '+error.message);renderRemixes();}
  }
  function selectedRemix(){return remixDrafts.find(function(d){return d.id===remixTarget;})||null;}
  function preserveRemixes(){
    try{
      var snapshot=JSON.stringify({drafts:remixDrafts,target:remixTarget,counter:remixCounter});
      localStorage.setItem('rico-remix-test68-persistent',snapshot);
      sessionStorage.setItem('rico-remix-test66',snapshot);
    }catch(error){
      try{sessionStorage.setItem('rico-remix-test66',JSON.stringify({drafts:remixDrafts,target:remixTarget,counter:remixCounter}));}
      catch(inner){console.warn('Remix draft storage unavailable',inner);}
    }
  }
  function restoreRemixes(){
    try{
      // Prefer the persistent copy; import TEST66 session drafts on first upgrade.
      var persistent=localStorage.getItem('rico-remix-test68-persistent');
      var legacy=sessionStorage.getItem('rico-remix-test66');
      var data=JSON.parse(persistent||legacy||'null');
      if(!persistent&&legacy)localStorage.setItem('rico-remix-test68-persistent',legacy);
      if(data&&Array.isArray(data.drafts)){
        remixDrafts=data.drafts.filter(function(d){
          return d&&typeof d.id==='string'&&typeof d.name==='string'&&
            typeof d.creator==='string'&&Array.isArray(d.tracks)
            &&d.tracks.length<=2000&&d.tracks.every(validRemixRef)&&
            (!d.remoteEditId||(
              /^[a-z0-9-]{12,48}$/i.test(d.remoteEditId)&&Array.isArray(d.baseTracks)&&
              d.baseTracks.length<=2000&&d.baseTracks.every(validRemixRef)
            ));
        });
        remixCounter=Number(data.counter)||remixDrafts.length;
        remixTarget=remixDrafts.some(function(d){return d.id===data.target;})?data.target:'';
      }
    }catch(error){console.warn('Remix drafts were not restored',error);}
  }
  // TEST156: creation is a separate, empty form. Never preload another
  // playlist, create a placeholder title, or change ADD + TO until the user
  // explicitly chooses a destination from the floating playlist.
  var creatingNewRemix=false;
  function createRemix(){
    creatingNewRemix=true;
    remixOpen=true;
    renderRemixes();
    $('#ricoRemixName,#ricoRemixCreator').prop('disabled',false).val('');
    $('#ricoRemixFloatHeader strong').text('CREATE PLAYLIST');
    $('#ricoRemixClose').text('CREAR');
    var field=document.getElementById('ricoRemixName');
    if(field){field.focus();field.setSelectionRange(0,0);}
  }
  // TEST158: cancellation discards form text only; no draft is created
  // and the selected ADD + TO destination is untouched.
  function cancelNewRemix(){
    if(!creatingNewRemix)return;
    creatingNewRemix=false;
    remixOpen=false;
    $('#ricoRemixName,#ricoRemixCreator').val('');
    renderRemixes();
  }
  function finishNewRemix(){
    if(!creatingNewRemix)return;
    var name=$('#ricoRemixName').val().trim();
    var creator=$('#ricoRemixCreator').val().trim();
    if(!name){$('#ricoRemixName').trigger('focus');return;}
    if(!creator){$('#ricoRemixCreator').trigger('focus');return;}
    remixCounter++;
    var draft={id:'remix-'+Date.now()+'-'+remixCounter,
      name:name.slice(0,100),creator:creator.slice(0,60),tracks:[]};
    remixDrafts.push(draft);
    // The previous ADD + TO destination stays intact.
    // The new playlist appears in that destination selector for explicit use.
    remixTarget=draft.id;
    preserveRemixes();
    creatingNewRemix=false;
    remixOpen=false;
    renderRemixes();
  }
  function remixNotice(message){
    $('#ricoRemixStatus').text(message);
    $('#ricoLiveStatus').text(message);
  }
  function renderRemixes(){
    var target=document.getElementById('ricoRemixTarget');
    if(!target)return;
    var selected=selectedRemix();
    target.textContent='';
    var blank=document.createElement('option');blank.value='';blank.textContent='SELECT DESTINATION';
    target.appendChild(blank);
    remixDrafts.forEach(function(d){
      var option=document.createElement('option');
      option.value=d.id;
      option.textContent=d.name;
      target.appendChild(option);
    });
    if(publishedRemixChoices.length){
      var publishedGroup=document.createElement('optgroup');
      publishedGroup.label='PUBLISHED PLAYLISTS';
      publishedRemixChoices.forEach(function(item){
        var choice=document.createElement('option');
        choice.value='published:'+item.id;
        choice.textContent=item.title;
        publishedGroup.appendChild(choice);
      });
      target.appendChild(publishedGroup);
    }
    // Select the saved destination, even when the playing playlist changes.
    var preferredDraft=remixDrafts.find(function(d){
      return d.id===preferredRemixDestination||
        (d.remoteEditId&&preferredRemixDestination==='published:'+d.remoteEditId);
    });
    var optionValue=preferredDraft?preferredDraft.id:preferredRemixDestination;
    target.value=Array.prototype.some.call(target.options,function(o){return o.value===optionValue;})
      ?optionValue:'';
    if(typeof window.ricoRenderRemixCommunityRows==='function')window.ricoRenderRemixCommunityRows();
    $('#ricoRemixCount').text(selected?selected.tracks.length+' SID':'0 SID');
    $('#ricoRemixEditor').css('display',remixOpen?'flex':'none');
    $('#ricoRemixToggle').attr('aria-expanded',remixOpen?'true':'false');
    if(!creatingNewRemix){
      $('#ricoRemixName').val(selected?selected.name:'').prop('disabled',!!(selected&&selected.remoteEditId));
      $('#ricoRemixCreator').val(selected?selected.creator:'').prop('disabled',!!(selected&&selected.remoteEditId));
    }
    $('#ricoRemixFloatHeader strong').text(creatingNewRemix?'CREATE PLAYLIST':
      selected&&selected.remoteEditId?'EDIT PUBLISHED PLAYLIST':'REMIX PLAYLIST CREATOR');
    $('#ricoRemixClose').text(creatingNewRemix?'CREAR':'DONE');
    $('#ricoRemixPublish').text(selected&&selected.remoteEditId?'REPUBLISH':'PUBLISH REMIX')
      .prop('disabled',!selected||!selected.tracks.length||remixBusy);
    $('#ricoRemixPlay').text(selected&&selected.remoteEditId?'PREVIEW CHANGES':'PLAY REMIX')
      .prop('disabled',!selected||!selected.tracks.length||remixBusy);
    $('#ricoRemixDiscard').css('display',selected&&selected.remoteEditId?'inline-block':'none')
      .prop('disabled',remixBusy);
    var items=$('#ricoRemixEntries').empty();
    $('#ricoRemixHelp').text(selected
      ? (selected.remoteEditId
        ? 'PUBLISHED LIST EDIT: Public version stays live. Press DONE, play any other playlist and use + to add songs here. PUBLISH CHANGES updates the same ID with beta key.'
        : (selected.tracks.length
          ? 'REMIX creado: '+selected.tracks.length+' SID. Pulsá DONE para continuar agregando con +, o PLAY REMIX para escucharlo.'
          : 'REMIX creado y seleccionado. Pulsá DONE y después + en las canciones que quieras agregar.'))
      : 'Choose a REMIX or PUBLISHED PLAYLIST under ADD + TO, or press NEW REMIX.');
    if(!selected){items.empty();return;}
    if(!selected.tracks.length){items.empty();return;}
    selected.tracks.forEach(function(t,index){
      var line=$('<div>').addClass('rico-remix-entry');
      $('<span>').text((index+1)+'. '+(t.title||t.file)+' — '+(t.artist||'Unknown artist')).appendTo(line);
      function moveDraft(step){
        if(remixBusy)return;
        var destination=Math.max(0,Math.min(selected.tracks.length-1,index+step));
        if(destination===index)return;
        insertAt(selected.tracks,index,destination);
        preserveRemixes();renderRemixes();
        remixNotice('Order saved locally for '+selected.name+'.');
      }
      bindReorderArrows($('<button type="button">').addClass('rico-remix-move').text('↑')
        .prop('disabled',index===0||remixBusy),-1,moveDraft).appendTo(line);
      bindReorderArrows($('<button type="button">').addClass('rico-remix-move').text('↓')
        .prop('disabled',index===selected.tracks.length-1||remixBusy),1,moveDraft).appendTo(line);
      $('<button type="button">').text('×').attr('aria-label','Remove from remix')
        .on('click',function(event){
          event.stopPropagation();selected.tracks.splice(index,1);
          preserveRemixes();renderRemixes();remixNotice('Removed from '+selected.name+'.');
        }).appendTo(line);
      items.append(line);
    });
  }
  async function addRemixTrack(index){
    // Add original HVSC references, not copies of embedded ranking SID bytes.
    // Never interrupt the currently playing track or silently change the source.
    remixOpen=false;
    $('#ricoRemixEditor').css('display','none');
    $('#ricoRemixToggle').attr('aria-expanded','false');
    var target=remixDrafts.find(function(d){
      return d.id===preferredRemixDestination||
        (d.remoteEditId&&preferredRemixDestination==='published:'+d.remoteEditId);
    })||null;
    if(!target&&preferredRemixDestination.indexOf('published:')===0){
      try{
        await beginPublishedEdit(preferredRemixDestination.slice('published:'.length));
        target=selectedRemix();
      }catch(error){remixNotice('Cannot select destination: '+error.message);return;}
    }
    if(!target){remixNotice('Select a destination first using ADD + TO.');return;}
    var sidEntry=(player.sidList||[])[index];
    if(!sidEntry){remixNotice('SID selection no longer available.');return;}
    // TEST111: reference-only v2 playlists already validated and loaded every
    // SID from its real HVSC ZIP. Keep the source from activeReferenceTracks,
    // whether the list is a GitHub curated file, local REMIX, or Cloudflare D1.
    // The candidate indices are maintained by moveLiveSong/removeLiveSong.
    var candidate=null;
    if(customActive&&activeReferenceTracks&&
       activeReferenceTracks.length===(player.sidList||[]).length){
      candidate=activeReferenceTracks[index];
    }else if(customActive&&activePublicPlaylist&&
             activePublicPlaylist.tracks.length===(player.sidList||[]).length){
      candidate=activePublicPlaylist.tracks[index];
    }else if(customActive&&activePublicCollection&&
             activePublicCollection.tracks.length===(player.sidList||[]).length){
      candidate=activePublicCollection.tracks[index];
    }
    try{
      var reference=null;
      if(candidate&&candidate.sidId&&candidate.file){
        reference={sidId:candidate.sidId,file:candidate.file,
          title:sidEntry.name||candidate.file,artist:sidEntry.author||''};
      }else if(candidate&&candidate.pack&&candidate.file){
        reference={pack:candidate.pack,file:candidate.file,
          title:sidEntry.name||candidate.file,artist:sidEntry.author||''};
      }else{
        // Prefer a known, verifiable HVSC path over a contributed upload.
        // IMPORT SID with no HVSC match may be archived in NO HVSC.
        var originalPath=customActive?embeddedHvscPaths[index]:
          originalGamesHvscPaths[(originalList[index]||{}).file];
        if(originalPath){
          remixNotice('Checking original HVSC path for '+(sidEntry.name||sidEntry.file)+'...');
          reference=await resolveOriginalHvscPath(originalPath);
        }else if(customActive&&sidEntry.localBytes instanceof Uint8Array){
          if(sidEntry._noHvscPending)await sidEntry._noHvscPending;
          if(!sidEntry._noHvscAssetId)
            await startNoHvscArchive([sidEntry],true);
          if(!sidEntry._noHvscAssetId)
            throw Error('SID not archived. Local import is still available.');
          reference={sidId:sidEntry._noHvscAssetId,
            file:sidEntry._noHvscFile||noHvscFileName(sidEntry),
            title:sidEntry.name||sidEntry.file,artist:sidEntry.author||''};
        }else{
          throw Error('This SID has no stored NO HVSC asset or verified HVSC reference.');
        }
      }
      // Discard a late lookup when the user changes the active playlist or draft.
      if((player.sidList||[])[index]!==sidEntry||
        !remixDrafts.some(function(d){return d.id===target.id;})){
        remixNotice('Playlist changed while checking HVSC. Select the SID again.');return;
      }
      if(target.tracks.length>=2000)throw Error('Remix limit: 2000 SID.');
      if(target.tracks.some(function(t){return remixRefKey(t)===remixRefKey(reference);})){
        remixNotice('This SID is already in '+target.name+'.');return;
      }
      target.tracks.push(Object.assign(remixCanonicalRef(reference),{
        title:reference.title||sidEntry.name||reference.file,
        artist:reference.artist||sidEntry.author||''
      }));
      preserveRemixes();renderRemixes();
      remixNotice('Added '+(reference.title||sidEntry.name||reference.file)+
        ' to '+target.name+(reference.sidId?' from NO HVSC archive.':' from HVSC.')+
        ' Playback unchanged.');
    }catch(error){
      remixNotice('Cannot add SID: '+error.message);
    }
  }
  async function playRemixDraft(){
    var draft=selectedRemix();
    if(!draft||!draft.tracks.length){remixNotice('Select a REMIX with songs first.');return;}
    if(typeof window.ricoPlayRemixDraft!=='function'){
      remixNotice('Remix preview is not ready. Reload this page.');return;
    }
    try{
      remixNotice('Loading '+draft.name+' for preview...');
      var payload={format:'ricos-sid-playlist',version:2,
        name:draft.name.trim()||'MY REMIX',createdBy:draft.creator.trim()||'REMIX PREVIEW',
        tracks:draft.tracks.map(remixCanonicalRef)};
      await window.ricoPlayRemixDraft(payload);
      activeRemixDraftId=draft.id;
      activeLocalOrderDirty=false;
      renderLivePlaylist();
      remixNotice('Playing '+draft.name+' (unpublished draft). You can keep adding with +.');
    }catch(error){remixNotice('Could not preview remix: '+error.message);}
  }
  // TEST107: the floating player is a live, independently reordered preview.
  // PUBLISH must use *that* order, not the stale order in the creator window.
  function syncPlayingRemixOrder(draft){
    if(!draft||draft.id!==activeRemixDraftId||!activeLocalOrderDirty)return false;
    if(!activeReferenceTracks||activeReferenceTracks.length!==custom.length)
      throw Error('REMIX preview references do not match the playing list.');
    var byKey=new Map(draft.tracks.map(function(t){return [remixRefKey(t),t];}));
    var ordered=[],included=new Set();
    activeReferenceTracks.forEach(function(t){
      var k=remixRefKey(t);
      if(!byKey.has(k))throw Error('Song missing from the REMIX draft: '+t.file);
      if(included.has(k))throw Error('Duplicate song in REMIX preview.');
      ordered.push(byKey.get(k));included.add(k);
    });
    // Song additions made in the REMIX editor since PLAY are preserved.
    draft.tracks.forEach(function(t){
      var k=remixRefKey(t);
      if(!included.has(k)){ordered.push(t);included.add(k);}
    });
    draft.tracks=ordered;
    activeLocalOrderDirty=false;
    preserveRemixes();
    renderRemixes();
    renderLivePlaylist();
    return true;
  }
  // TEST118: Preserve the original D1 playlist ID when publishing a linked
  // editing draft. The public list remains unchanged until an authorized PUT
  // succeeds and its complete set of references is re-read and verified.
  async function publishPublishedChanges(draft){
    if(!draft.remoteEditId||!Array.isArray(draft.baseTracks))
      throw Error('This is not a linked published playlist draft.');
    if(remixTrackKeys(draft.tracks)===remixTrackKeys(draft.baseTracks)){
      remixNotice('No unpublished changes to '+draft.name+'.');
      return;
    }
    // All references remain within the original HVSC ZIP library, no SID data.
    var refs=draft.tracks.map(remixCanonicalRef);
    if(new Set(refs.map(function(t){return remixRefKey(t);})).size!==refs.length)
      throw Error('Duplicate SID references cannot be published.');
    await ensureBetaServerReady();
    var capabilitiesResponse=await fetch(communityWriteApi+'/capabilities',{cache:'no-store'});
    if(!capabilitiesResponse.ok)throw Error('Publication service unavailable.');
    var cap=await capabilitiesResponse.json();
    if(!cap.playlistTrackAdditions)
      throw Error('Cloudflare Worker TEST118 is not deployed yet. Your draft is saved locally; no public changes were made.');
    var endpoint=communityWriteApi+'/playlists/'+encodeURIComponent(draft.remoteEditId);
    var currentResponse=await fetch(endpoint,{cache:'no-store'});
    if(!currentResponse.ok)throw Error('Could not retrieve current published playlist.');
    var current=await currentResponse.json();
    if(!current||!Array.isArray(current.tracks)||current.name!==draft.name||
       current.createdBy!==draft.creator)
      throw Error('The published playlist metadata changed. Your draft was kept.');
    // TEST149: save the selected draft to its existing public ID.
    // Do not reject the user's edit based on an old full-track snapshot.
    // The Worker still checks the freshly read version atomically at PUT.
    if(remixTrackKeys(refs)===remixTrackKeys(current.tracks)){
      remixNotice('Already published: '+draft.name+'. Same public ID.');
      remixDrafts=remixDrafts.filter(function(item){return item!==draft;});
      if(preferredRemixDestination===draft.id)rememberRemixDestination('published:'+draft.remoteEditId);
      remixTarget='';
      preserveRemixes();renderRemixes();renderLivePlaylist();
      return;
    }
    var hash=await remixSnapshotHash(current.tracks);
    var key=await askBetaKeyDialog('SAVE');
    if(!key)return;
    remixBusy=true;renderRemixes();
    try{
      var response=await fetch(endpoint,{
        method:'PUT',
        headers:{'Content-Type':'application/json','X-Beta-Key':key},
        body:JSON.stringify({format:'ricos-sid-playlist',version:2,
          name:draft.name,createdBy:draft.creator,tracks:refs,
          contentUpdate:true,expectedBaseHash:hash})
      });
      var receipt=await response.json().catch(function(){return {};});
      if(!response.ok&&!(response.status===400&&receipt.error==='No playlist changes to save'))
        throw Error(receipt.error||'Could not publish playlist changes ('+response.status+').');
      await verifyRemoteOrder(endpoint,refs,'playlist');
      if(activeRemixDraftId===draft.id){
        activeRemixDraftId=null;
        activeLocalOrderDirty=false;
        // Only attach the public ID if the playing preview has matching tracks.
        var matches=activeReferenceTracks&&activeReferenceTracks.length===refs.length&&
          activeReferenceTracks.every(function(t,i){return remixRefKey(t)===remixRefKey(refs[i]);});
        activePublicPlaylist=matches?{remoteId:draft.remoteEditId,name:draft.name,
          createdBy:draft.creator,tracks:refs.slice(),originalCount:refs.length,dirtyOrder:false}:null;
      }
      remixNotice('PUBLISHED CHANGES VERIFIED: '+draft.name+' · '+refs.length+' SID. Same public ID.');
      remixDrafts=remixDrafts.filter(function(item){return item!==draft;});
      renderLivePlaylist();
      if(preferredRemixDestination===draft.id)rememberRemixDestination('published:'+draft.remoteEditId);
      remixTarget='';
      preserveRemixes();
      if(typeof window.ricoRefreshCommunityCatalog==='function'){
        try{await window.ricoRefreshCommunityCatalog();}
        catch(error){console.warn('Playlist updated; catalog refresh pending',error);}
      }
    }finally{remixBusy=false;renderRemixes();}
  }
  async function publishRemix(id){
    var draft=id ? remixDrafts.find(function(d){return d.id===id;}) : selectedRemix();
    if(remixBusy||!draft)return;
    if(!id){
      draft.name=$('#ricoRemixName').val().trim();
      draft.creator=$('#ricoRemixCreator').val().trim();
    }
    draft.name=draft.name.trim();draft.creator=draft.creator.trim();
    if(!draft.name||!draft.creator){remixNotice('Enter remix name and creator first.');return;}
    if(!draft.tracks.length){remixNotice('Add some SID using + before publishing.');return;}
    try{
      // Crucial: publish the order visible in the floating playlist,
      // even if the visitor did not press its local SAVE first.
      syncPlayingRemixOrder(draft);
    }catch(error){remixNotice('Cannot publish this order: '+error.message);return;}
    preserveRemixes();
    if(draft.remoteEditId){
      try{await publishPublishedChanges(draft);}
      catch(error){remixNotice('PUBLISH CHANGES failed: '+error.message);}
      return;
    }
    var key=await askBetaKeyDialog('PUBLISH');
    if(!key)return;
    remixBusy=true;renderRemixes();
    try{
      await ensureBetaServerReady();
      var expectedDraftRefs=draft.tracks.map(remixCanonicalRef);
      var remoteId=draft.pendingPublishedId||'';
      var remoteUrl='';
      if(!remoteId){
        var response=await fetch(communityWriteApi+'/playlists',{
          method:'POST',headers:{'Content-Type':'application/json','X-Beta-Key':key},
          body:JSON.stringify({format:'ricos-sid-playlist',version:2,name:draft.name,
            createdBy:draft.creator,tracks:expectedDraftRefs})
        });
        var result=await response.json();
        if(!response.ok)throw Error(result.error||'Remix publication failed.');
        if(!result.id)throw Error('Server accepted publication but did not return its ID.');
        remoteId=result.id;
        // Keep the ID in the draft until GET confirms the stored order.
        // A temporary failure must never trigger a second POST/duplicate list.
        draft.pendingPublishedId=remoteId;
        preserveRemixes();
      }
      remoteUrl=communityWriteApi+'/playlists/'+encodeURIComponent(remoteId);
      try{
        await verifyRemoteOrder(remoteUrl,expectedDraftRefs,'playlist');
      }catch(verifyError){
        // An existing ID may have the previous order (e.g. after an earlier
        // partial publish). Correct the same published playlist, never duplicate.
        var put=await fetch(remoteUrl,{
          method:'PUT',headers:{'Content-Type':'application/json','X-Beta-Key':key},
          body:JSON.stringify({format:'ricos-sid-playlist',version:2,
            name:draft.name,createdBy:draft.creator,tracks:expectedDraftRefs})
        });
        var changed=await put.json();
        if(!put.ok&&!(put.status===400&&changed.error==='No playlist changes to save'))
          throw Error('Published order could not be corrected: '+(changed.error||put.status));
        await verifyRemoteOrder(remoteUrl,expectedDraftRefs,'playlist');
      }
      if(activeRemixDraftId===draft.id){
        // Do not bind a partial playback preview to a longer published list.
        var samePlayingOrder=activeReferenceTracks &&
          activeReferenceTracks.length===expectedDraftRefs.length&&
          activeReferenceTracks.every(function(t,i){
            return remixRefKey(t)===remixRefKey(expectedDraftRefs[i]);
          });
        activePublicPlaylist=samePlayingOrder?{remoteId:remoteId,name:draft.name,
          createdBy:draft.creator,tracks:expectedDraftRefs.slice(),
          originalCount:expectedDraftRefs.length,dirtyOrder:false}:null;
        activeRemixDraftId=null;
        activeLocalOrderDirty=false;
        renderLivePlaylist();
      }
      remixNotice('PUBLISHED AND VERIFIED: '+draft.name+' · '+expectedDraftRefs.length+' SID in the correct order.');
      remixDrafts=remixDrafts.filter(function(d){return d!==draft;});
      if(preferredRemixDestination===draft.id)rememberRemixDestination('published:'+remoteId);
      remixTarget='';
      preserveRemixes();
      if(typeof window.ricoRefreshCommunityCatalog==='function'){
        try{await window.ricoRefreshCommunityCatalog();}
        catch(refreshError){console.warn('Published successfully, catalog refresh failed',refreshError);}
      }
    }catch(error){
      remixNotice(draft.pendingPublishedId
        ? 'Playlist created, but order NOT VERIFIED: '+error.message+' Retry PUBLISH to verify/update the SAME playlist.'
        : 'Remix not published: '+error.message);
    }
    finally{remixBusy=false;renderRemixes();}
  }
  restoreRemixes();
  (function initRemixControls(){
    var toggle=$('#ricoRemixToggle'),target=$('#ricoRemixTarget');
    if(!toggle.length)return;
    // TEST119: the bottom REMIX PLAYLIST button and the floating REMIX
    // PLAYLIST button open the same editor, without creating extra drafts.
    toggle.add($('#ricoRemixToolbar')).on('click',function(event){
      event.preventDefault();event.stopPropagation();createRemix();
    });
    $('#ricoRemixCancel').on('click',function(event){
      event.preventDefault();event.stopPropagation();
      cancelNewRemix();
    });
    // Capture Esc before the existing input keyboard handlers stop bubbling.
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&creatingNewRemix){
        event.preventDefault();event.stopPropagation();
        cancelNewRemix();
      }
    },true);
    $('#ricoRemixClose').on('click',function(event){
      event.preventDefault();event.stopPropagation();
      if(creatingNewRemix)finishNewRemix();
      else{remixOpen=false;preserveRemixes();renderRemixes();}
      if(!remixOpen&&typeof window.ricoOpenCommunityFromRemix==='function')
        window.ricoOpenCommunityFromRemix();
    });
    target.on('change',function(event){
      event.stopPropagation();selectRemixDestination(this.value);
    });
    $('#ricoRemixDiscard').on('click',function(event){
      event.stopPropagation();
      var draft=selectedRemix();
      if(!draft||!draft.remoteEditId)return;
      if(!window.confirm('Discard the unpublished edits to '+draft.name+'? Its public playlist will stay unchanged.'))return;
      remixDrafts=remixDrafts.filter(function(item){return item!==draft;});
      remixTarget='';preserveRemixes();renderRemixes();
      remixNotice('Unpublished changes discarded. Public playlist was not modified.');
    });
    $('#ricoRemixName,#ricoRemixCreator').on('pointerdown mousedown',function(event){
      event.stopPropagation();
    });
    $('#ricoRemixPublish').on('click',function(event){event.stopPropagation();publishRemix();});
    window.ricoPublishRemixDraft=publishRemix;
    window.ricoOpenRemixDraft=function(id){
      if(!remixDrafts.some(function(d){return d.id===id;}))return;
      remixTarget=id;remixOpen=true;preserveRemixes();renderRemixes();
    };
    window.ricoPlayRemixDraftFromCommunity=function(id){
      if(!remixDrafts.some(function(d){return d.id===id;}))return;
      remixTarget=id;preserveRemixes();renderRemixes();playRemixDraft();
    };
    $('#ricoRemixPlay').on('click',function(event){event.stopPropagation();playRemixDraft();});
    $('#ricoRemixName,#ricoRemixCreator').on('input',function(){
      if(creatingNewRemix)return;
      var current=selectedRemix();if(!current||current.remoteEditId)return;
      current.name=$('#ricoRemixName').val().slice(0,100);
      current.creator=$('#ricoRemixCreator').val().slice(0,60);
      preserveRemixes();
      if(typeof window.ricoRenderRemixCommunityRows==='function')window.ricoRenderRemixCommunityRows();
      var opt=target.find('option:selected');
      if(opt.length)opt.text(current.name||'UNTITLED');
    });
    $('#ricoRemixEditor').on('mousedown mouseup pointerdown pointerup keydown keyup keypress',function(event){
      if(event.target.tagName==='INPUT'||event.target.tagName==='SELECT')event.stopPropagation();
    });
    // TEST67 floating creator: independent drag by titlebar; inputs stay editable.
    (function(){
      var panel=document.getElementById('ricoRemixEditor');
      var bar=document.getElementById('ricoRemixFloatHeader');
      if(!panel||!bar)return;
      var drag=null;
      bar.addEventListener('pointerdown',function(e){
        if(e.button!==0||e.target.closest('button'))return;
        var rect=panel.getBoundingClientRect();
        drag={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};
        if(bar.setPointerCapture)bar.setPointerCapture(e.pointerId);
        e.preventDefault();e.stopPropagation();
      });
      bar.addEventListener('pointermove',function(e){
        if(!drag)return;
        var left=Math.max(0,Math.min(window.innerWidth-panel.offsetWidth,drag.left+e.clientX-drag.x));
        var top=Math.max(0,Math.min(window.innerHeight-45,drag.top+e.clientY-drag.y));
        panel.style.left=left+'px';panel.style.top=top+'px';
        panel.style.transform='none';e.stopPropagation();
      });
      bar.addEventListener('pointerup',function(e){drag=null;e.stopPropagation();});
      bar.addEventListener('pointercancel',function(){drag=null;});
    })();
    renderRemixes();
  })();

  // TEST122: cheap playback/selection paint for a thousand-plus SID list.
  // Rebuilding 1,376 interactive DOM rows right at the click interrupts the
  // browser's ScriptProcessor callback and can sound like a stuck SID note.
  function paintLargePlaylistMarkers(){
    var painted=largePlaylistPainted;
    var scroller=document.getElementById('ricoLivePlaylistItems');
    var list=player.sidList||[];
    if(!painted||!scroller||!activeReferenceStream||list.length<1000||
       painted.stream!==activeReferenceStream||painted.list!==list||
       painted.revision!==largePlaylistStructureRevision||
       painted.count!==list.length||
       (painted.rowsByIndex?painted.rowsByIndex.length!==list.length:
         scroller.children.length!==list.length))return false;
    var active=typeof player.sidListIndex==='number'?player.sidListIndex:-1;
    var selected=typeof selectedLiveIndex==='number'?selectedLiveIndex:-1;
    var queued=typeof queuedLiveIndex==='number'?queuedLiveIndex:-1;
    var changed=new Set([painted.active,painted.selected,painted.queued,active,selected,queued]);
    changed.forEach(function(index){
      if(index<0||index>=list.length)return;
      var wrapper=painted.rowsByIndex?painted.rowsByIndex[index]:scroller.children[index];
      var row=wrapper&&(wrapper.matches('.rico-live-row')?wrapper:wrapper.querySelector('.rico-live-row'));
      if(!row)return;
      var nowActive=index===active,nowSelected=index===selected,nowQueued=index===queued;
      row.classList.toggle('rico-live-active',nowActive);
      row.classList.toggle('rico-live-selected',nowSelected);
      row.classList.toggle('rico-live-queued',nowQueued);
      if(nowActive)row.setAttribute('aria-current','true');
      else row.removeAttribute('aria-current');
      var currentMark=row.querySelector('.rico-live-current');
      if(nowActive&&!currentMark){
        currentMark=document.createElement('span');currentMark.className='rico-live-current';
        currentMark.textContent='▶';row.appendChild(currentMark);
      }else if(!nowActive&&currentMark)currentMark.remove();
      var queuedMark=row.querySelector('.rico-live-next');
      if(nowQueued&&!queuedMark){
        queuedMark=document.createElement('span');queuedMark.className='rico-live-next';
        queuedMark.textContent='›';row.appendChild(queuedMark);
      }else if(!nowQueued&&queuedMark)queuedMark.remove();
      // The active SID's actual header may replace its temporary file label.
      if(nowActive){
        var item=list[index],title=row.querySelector('.rico-live-title');
        if(item&&title)title.textContent=(item.name||item.file||'SID')+
          ' — '+formatArtistCredit(item.author||'Unknown artist');
      }
    });
    painted.active=active;painted.selected=selected;painted.queued=queued;
    if(followPlayingRowOnce&&liveVisible&&active>=0){
      followPlayingRowOnce=false;
      var node=painted.rowsByIndex?painted.rowsByIndex[active]:scroller.children[active],
        view=node&&node.getBoundingClientRect(),
        box=scroller.getBoundingClientRect();
      if(view){
        if(view.top<box.top)scroller.scrollTop-=box.top-view.top+4;
        else if(view.bottom>box.bottom)scroller.scrollTop+=view.bottom-box.bottom+4;
      }
    }
    return true;
  }

  function noHvscArtistLabel(value){
    var label=formatArtistCredit(String(value||'').trim());
    if(!label||/^(?:unknown(?: artist)?|<\?>|\?+|n\/?a|unidentified|loading.*|unavailable.*)$/i.test(label))
      return 'Unknown';
    return label;
  }
  function buildNoHvscArtistGroups(list){
    if(!activePublicCollection||activePublicCollection.id!==NO_HVSC_COLLECTION_ID||
       !activeReferenceTracks||activeReferenceTracks.length!==list.length)return null;
    var groups=new Map(),authors=activePublicCollection.artistBySidId||{};
    list.forEach(function(item,index){
      var ref=activeReferenceTracks[index];
      var artist=ref&&ref.sidId?(NO_HVSC_ARTIST_OVERRIDES[ref.sidId]||authors[ref.sidId]):'';
      var label=noHvscArtistLabel(artist||(item&&item.author));
      var key=label.toLocaleLowerCase();
      if(!groups.has(key))groups.set(key,{label:label,indices:[]});
      groups.get(key).indices.push(index);
    });
    return Array.from(groups.values()).sort(function(a,b){
      if(a.label==='Unknown')return 1;
      if(b.label==='Unknown')return -1;
      return a.label.localeCompare(b.label,undefined,{sensitivity:'base'});
    });
  }
  function renderLivePlaylist() {
    // Ordinary short lists retain the original complete render behavior.
    if(!activeCsdbRankDisplay&&paintLargePlaylistMarkers())return;
    var scrollNode=document.getElementById('ricoLivePlaylistItems');
    var previousScroll=scrollNode?scrollNode.scrollTop:0;
    var holder = $('#ricoLivePlaylistItems').empty();
    largePlaylistPainted=null;
    ensureLivePlaylistCredits();
    var list = player.sidList || [];
    if(selectedLiveIndex!==null && selectedLiveIndex>=list.length)selectedLiveIndex=null;
    $('#ricoRemixBar').css('display',(!landingPlaylists&&list.length)?'flex':'none');
    $('#ricoLiveCount').text('(' + (activeCsdbRankDisplay?activeCsdbRankDisplay.items.length:list.length) + ')');
    // TEST106: SAVE is visible for any editable loaded list, never TOP 100.
    var canSave=!!(customActive&&!landingPlaylists&&!loadedRankedPlaylist&&list.length);
    var pendingDraft=remixDrafts.find(function(d){
      return d.remoteEditId&&Array.isArray(d.baseTracks)&&
        ((activeRemixDraftId&&d.id===activeRemixDraftId)||
          (activePublicPlaylist&&d.remoteEditId===activePublicPlaylist.remoteId)||
          (customActive&&loadedPlaylistTitle===d.name&&loadedPlaylistCreator===d.creator))&&
        remixTrackKeys(d.tracks)!==remixTrackKeys(d.baseTracks);
    });
    var hasChanges=canSave&&(!!pendingDraft||(activePublicCollection?activePublicCollection.dirtyOrder:
      activePublicPlaylist?(activePublicPlaylist.dirtyOrder||
        activePublicPlaylist.tracks.length!==activePublicPlaylist.originalCount):
        (activeLocalOrderDirty||isOldSidCurated())));
    $('#ricoLiveSave').text(pendingDraft||activePublicPlaylist?'REPUBLISH':'SAVE')
      .css('display',canSave?'inline-block':'none')
      .prop('disabled',savingCommunityEdits||remixBusy||!hasChanges)
      .attr('title',activePublicPlaylist||activePublicCollection
        ? 'Save updated public order (beta key required)'
        : isOldSidCurated()
          ? 'Register this HVSC reference playlist as editable in Cloudflare (beta key required)'
          : 'Save current song order locally; publication requires beta key');
    // TEST177: show active LFT MODE on any playlist while an approved
    // LFT track actually plays; never label an entire mixed playlist as LFT.
    var lftModeTitle=!landingPlaylists&&customActive&&
      window.RicoLftMode&&window.RicoLftMode.playingApproved();
    $('#ricoLivePlaylistTitle').text((landingPlaylists ? "COMMUNITY PLAYLISTS" :
      (customActive ? (loadedPlaylistTitle || 'CUSTOM PLAYLIST') : 'GAMES'))+
      (lftModeTitle?' · LFT MODE ON':''));
    // TEST34: keep the creator/ratings strip visible while a playlist is loaded.
    // Never confuse the playlist creator with each SID's composer.
    var hasLoadedPlaylist = !!loadedPlaylistTitle && customActive;
    var creatorText = hasLoadedPlaylist
      ? 'Playlist by ' + (loadedPlaylistCreator || 'Unknown curator')
      : (landingPlaylists ? 'Select a playlist' : 'Playlist by ' + (customActive ? 'You' : 'Original collection'));
    $('#ricoLivePlaylistCreator').text(creatorText);
    $('#ricoLivePlaylistCredits').attr('data-loaded', hasLoadedPlaylist ? 'true' : 'false');
    $('#ricoLivePlaylistCredits').css('display','flex');
    $('#ricoLivePlaylistStars').css('display', hasLoadedPlaylist ? 'inline-flex' : 'none');
    if (landingPlaylists) {
      $('<div>').addClass('rico-live-empty').text("Choose a playlist from COMMUNITY PLAYLISTS to start listening.").appendTo(holder);
      return;
    }
    // TEST134: restore the previous presentation for the two DEMO rankings.
    // TOP GROUPS remains on the TEST133 flat layout.
    function isDemoRankDisplay(){
      return !!activeCsdbRankDisplay&&
        (activeCsdbRankDisplay.kind==='demos'||activeCsdbRankDisplay.kind==='onefile');
    }
    function appendCsdbHeading(position){
      var display=activeCsdbRankDisplay,entry=display.items[position],count=display.trackCounts[position]||0;
      var header=$('<div>').addClass('rico-csdb-live-heading');
      $('<strong>').text('#'+(position+1)+'  '+entry.title).appendTo(header);
      if(entry.group)$('<span>').addClass('rico-csdb-live-group').text(entry.group).appendTo(header);
      $('<span>').addClass('rico-csdb-live-status').text(count?count+' SID':'SID PENDING').appendTo(header);
      header.appendTo(holder);
    }
    function appendPendingCsdbRow(position){
      var item=activeCsdbRankDisplay.items[position];
      var row=$('<div>').addClass('rico-live-row rico-csdb-pending-row')
        .attr('role','listitem').attr('aria-label',(position+1)+'. '+item.title+' — SID pending');
      $('<span>').addClass('rico-live-number').text(position+1).appendTo(row);
      $('<span>').addClass('rico-csdb-release').text(item.title).appendTo(row);
      $('<span>').addClass('rico-csdb-song').text('SID PENDING').appendTo(row);
      $('<span>').addClass('rico-csdb-artist').text('—').appendTo(row);
      row.appendTo(holder);
    }
    if (!list.length) {
      if(activeCsdbRankDisplay){
        activeCsdbRankDisplay.items.forEach(function(entry,i){
          if(isDemoRankDisplay())appendCsdbHeading(i);
          else appendPendingCsdbRow(i);
        });
      }else{
        $('<div>').addClass('rico-live-empty').text('No SID loaded. Use Choose A SID to add music.').appendTo(holder);
      }
      return;
    }
    // TEST170: reuse TEST134 DEMOS headings only for NO HVSC.
    // Grouping is a view; underlying track and playback indices do not move.
    var artistGroups=buildNoHvscArtistGroups(list);
    var artistPositions=artistGroups?new Array(list.length):null;
    var visualRows=artistGroups?[]:list.map(function(item,index){
      return {item:item,index:index};
    });
    var groupedRowsByIndex=artistGroups?new Array(list.length):null;
    if(artistGroups)artistGroups.forEach(function(group,position){
      visualRows.push({heading:group,groupPosition:position});
      group.indices.forEach(function(index,ordinal){
        artistPositions[index]={indices:group.indices,position:ordinal};
        visualRows.push({item:list[index],index:index});
      });
    });
    var nextCsdbRank=0;
    visualRows.forEach(function (entry) {
      if(entry.heading){
        var heading=$('<div>').addClass('rico-csdb-live-heading');
        $('<strong>').text('#'+(entry.groupPosition+1)+' '+entry.heading.label).appendTo(heading);
        $('<span>').addClass('rico-csdb-live-status')
          .text(entry.heading.indices.length+' SID').appendTo(heading);
        heading.appendTo(holder);
        return;
      }
      var item=entry.item,index=entry.index;

      if(activeCsdbRankDisplay){
        var rank=activeCsdbRankDisplay.trackRanks[index];
        while(nextCsdbRank<=rank&&nextCsdbRank<activeCsdbRankDisplay.items.length){
          if(isDemoRankDisplay())appendCsdbHeading(nextCsdbRank);
          else if(!activeCsdbRankDisplay.trackCounts[nextCsdbRank])appendPendingCsdbRow(nextCsdbRank);
          nextCsdbRank++;
        }
      }
      var row = $('<button type="button">').addClass('rico-live-row');
      if(artistGroups)row.attr('data-sid-index',index);
      var active = index === player.sidListIndex;
      if (active) row.addClass('rico-live-active').attr('aria-current', 'true');
      if(index===selectedLiveIndex)row.addClass('rico-live-selected');
      if(index===queuedLiveIndex)row.addClass('rico-live-queued');
      var rankIndex=activeCsdbRankDisplay?activeCsdbRankDisplay.trackRanks[index]:null;
      var csdbEntry=rankIndex!==null?activeCsdbRankDisplay.items[rankIndex]:null;
      $('<span>').addClass('rico-live-number').text(csdbEntry?rankIndex+1:index+1).appendTo(row);
      var songTitle = item.name || item.file || 'SID ' + (index + 1);
      var songArtist = formatArtistCredit(item.author || 'Unknown artist');
      if(csdbEntry&&!isDemoRankDisplay()){
        row.addClass('rico-live-csdb-row');
        $('<span>').addClass('rico-csdb-release').text(csdbEntry.title).appendTo(row);
        $('<span>').addClass('rico-csdb-song').text(songTitle).appendTo(row);
        $('<span>').addClass('rico-csdb-artist').text(songArtist).appendTo(row);
        row.attr('aria-label',(rankIndex+1)+'. '+csdbEntry.title+' — '+songTitle+' — '+songArtist);
      }else if(item.sceneGroup){
        row.addClass('rico-live-group-row');
        // Always preserve the whole credit, nickname first when available.
        var sceneArtist=songArtist;
        if(/^(?:<\?>|unknown(?: artist)?)$/i.test(sceneArtist))sceneArtist='';
        $('<span>').addClass('rico-live-group').text(item.sceneGroup).appendTo(row);
        if(sceneArtist)$('<span>').addClass('rico-live-composer').text(sceneArtist).appendTo(row);
        $('<span>').addClass('rico-live-song').text(songTitle).appendTo(row);
        row.attr('aria-label',(index+1)+'. '+item.sceneGroup+(sceneArtist?' — '+sceneArtist:'')+' — '+songTitle);
      } else {
        $('<span>').addClass('rico-live-title').text(songTitle + ' — ' + songArtist).appendTo(row);
        row.attr('aria-label',songTitle+' — '+songArtist);
      }
      if (active) $('<span>').addClass('rico-live-current').text('▶').appendTo(row);
      if(index===queuedLiveIndex) $('<span>').addClass('rico-live-next').text('›').appendTo(row);
      row.on('click', function () {
        requestSidSwitch(index,'manual');
      });
      if(!landingPlaylists){
        var wrap=$('<div>').addClass('rico-live-edit-row');
        if(artistGroups){wrap.attr('data-sid-index',index);groupedRowsByIndex[index]=wrap[0];}
        row.appendTo(wrap);
        bindThemedPlaylistHint($('<button type="button">').addClass('rico-live-add').text('+')
          .attr('aria-label','Add '+songTitle+' to selected remix'),
          'Add to selected REMIX PLAYLIST without changing playback')
          .on('click',function(event){event.stopPropagation();hideReorderHint();addRemixTrack(index);})
          .appendTo(wrap);
        if(customActive){
        var artistPosition=artistPositions&&artistPositions[index];
        var canMoveUp=artistPosition?artistPosition.position>0:index>0;
        var canMoveDown=artistPosition
          ?artistPosition.position<artistPosition.indices.length-1:index<list.length-1;
        function moveWithinVisibleGroup(step){
          if(!artistPosition){moveLiveSong(index,step);return;}
          var next=Math.max(0,Math.min(artistPosition.indices.length-1,
            artistPosition.position+step));
          var destination=artistPosition.indices[next];
          if(destination!==index)moveLiveSong(index,destination-index);
        }
        bindReorderArrows($('<button type="button">').addClass('rico-live-move')
          .toggleClass('rico-ranked-disabled',loadedRankedPlaylist).text('↑')
          .prop('disabled',loadedRankedPlaylist||savingCommunityEdits||!canMoveUp),-1,moveWithinVisibleGroup)
          .appendTo(wrap);
        bindReorderArrows($('<button type="button">').addClass('rico-live-move')
          .toggleClass('rico-ranked-disabled',loadedRankedPlaylist).text('↓')
          .prop('disabled',loadedRankedPlaylist||savingCommunityEdits||!canMoveDown),1,moveWithinVisibleGroup)
          .appendTo(wrap);
        if(!activePublicCollection){
        bindThemedPlaylistHint($('<button type="button">').addClass('rico-live-remove')
          .toggleClass('rico-ranked-disabled',loadedRankedPlaylist).text('×')
          .attr('aria-label','Remove '+songTitle+' temporarily')
          .prop('disabled',loadedRankedPlaylist),
          loadedRankedPlaylist?'Fixed original ranking entry':'Remove song temporarily')
          .on('click',function(event){event.stopPropagation();hideReorderHint();removeLiveSong(index);})
          .appendTo(wrap);
        }
        }
        wrap.appendTo(holder);
      }else{
        if(artistGroups)groupedRowsByIndex[index]=row[0];
        row.appendTo(holder);
      }
    });
    if(activeCsdbRankDisplay){
      while(nextCsdbRank<activeCsdbRankDisplay.items.length){
        if(isDemoRankDisplay())appendCsdbHeading(nextCsdbRank);
        else if(!activeCsdbRankDisplay.trackCounts[nextCsdbRank])appendPendingCsdbRow(nextCsdbRank);
        nextCsdbRank++;
      }
    }
    // Save remains fixed in the header, not in the scrolling track list.
    // TEST96: never force scrolling on a manual selection or a render refresh.
    // Follow the newly playing row only on NEXT/AUTO, within this list's scrollbox.
    if(!followPlayingRowOnce && scrollNode)scrollNode.scrollTop=previousScroll;
    if(followPlayingRowOnce && liveVisible){
      followPlayingRowOnce=false;
      var activeRow=holder.find('.rico-live-active')[0],scroller=holder[0];
      if(activeRow&&scroller){
        var activeRect=activeRow.getBoundingClientRect(),boxRect=scroller.getBoundingClientRect();
        if(activeRect.top<boxRect.top)scroller.scrollTop-=boxRect.top-activeRect.top+4;
        else if(activeRect.bottom>boxRect.bottom)scroller.scrollTop+=activeRect.bottom-boxRect.bottom+4;
      }
    }
    if(activeReferenceStream&&list.length>=1000){
      largePlaylistPainted={stream:activeReferenceStream,list:list,
        revision:largePlaylistStructureRevision,count:list.length,
        rowsByIndex:groupedRowsByIndex,
        active:typeof player.sidListIndex==='number'?player.sidListIndex:-1,
        selected:typeof selectedLiveIndex==='number'?selectedLiveIndex:-1,
        queued:typeof queuedLiveIndex==='number'?queuedLiveIndex:-1};
    }
  }

  $('#ricoLiveSave').on('click',async function(event){
    event.stopPropagation();
    if(loadedRankedPlaylist||!customActive)return;
    var pendingDraft=remixDrafts.find(function(d){
      return d.remoteEditId&&Array.isArray(d.baseTracks)&&
        ((activeRemixDraftId&&d.id===activeRemixDraftId)||
          (activePublicPlaylist&&d.remoteEditId===activePublicPlaylist.remoteId)||
          (customActive&&loadedPlaylistTitle===d.name&&loadedPlaylistCreator===d.creator))&&
        remixTrackKeys(d.tracks)!==remixTrackKeys(d.baseTracks);
    });
    if(pendingDraft){await publishRemix(pendingDraft.id);return;}
    if(activeRemixDraftId){
      var linkedDraft=remixDrafts.find(function(d){
        return d.id===activeRemixDraftId&&d.remoteEditId;
      });
      if(linkedDraft&&activeLocalOrderDirty){
        try{syncPlayingRemixOrder(linkedDraft);}
        catch(error){$('#ricoLiveStatus').text('REPUBLISH failed: '+error.message);return;}
        await publishRemix(linkedDraft.id);
        return;
      }
    }
    if(activePublicPlaylist||activePublicCollection){await savePublicRemovals();return;}
    if(isOldSidCurated()){
      try{await adoptOldSidCollection();}
      catch(error){$('#ricoLiveStatus').text('SAVE failed: '+error.message);}
      return;
    }
    if(!activeLocalOrderDirty)return;
    try{
      if(activeRemixDraftId){
        var draft=remixDrafts.find(function(d){return d.id===activeRemixDraftId;});
        if(!draft)throw Error('REMIX draft no longer exists. Reload before saving.');
        syncPlayingRemixOrder(draft);
        $('#ricoLiveStatus').text('REMIX order saved in this browser. PUBLISH requests the beta key.');
      }else{
        if(typeof window.ricoSaveCurrentPlaylistLocal!=='function')
          throw Error('Local playlist storage unavailable.');
        await window.ricoSaveCurrentPlaylistLocal();
      }
    }catch(error){$('#ricoLiveStatus').text('SAVE failed: '+error.message);}
  });

  function showLivePlaylist(visible) {
    liveVisible = !!visible;
    // A flex column keeps the playlist scrolling inside a shorter panel.
    $('#ricoLivePlaylist').css('display', liveVisible ? 'flex' : 'none');
    $('#ricoPlaylistToggle').attr('aria-pressed', liveVisible ? 'true' : 'false')
      .toggleClass('rico-playlist-on', liveVisible);
    if (liveVisible) renderLivePlaylist();
  }

  // TEST08: Drag by the title bar; resize vertically by the bottom handle.
  // Only the playlist panel is touched; audio and SID routines are unchanged.
  (function initMovablePlaylist() {
    var panel = document.getElementById('ricoLivePlaylist');
    var header = document.getElementById('ricoLivePlaylistHeader');
    var grip = document.getElementById('ricoLiveResizeGrip');
    var widthGrip = document.getElementById('ricoLiveWidthGrip');
    if (!panel || !header || !grip || !widthGrip) return;
    var movement = null;
    // TEST51: open the floating playlist centered, leaving the oscilloscope visible.
    // The position remains fully user-adjustable by dragging the header.
    function centerFloatingPlaylistOnStartup() {
      var rect=panel.getBoundingClientRect();
      if(!rect.width || !rect.height)return;
      // Center inside the available workspace above the bottom playback controls.
      var controls=document.getElementById('sidControls');
      var controlsHeight=controls?controls.getBoundingClientRect().height:35;
      var availableHeight=Math.max(120,window.innerHeight-controlsHeight);
      panel.style.left=Math.max(0,Math.round((window.innerWidth-rect.width)/2))+'px';
      panel.style.top=Math.max(8,Math.round((availableHeight-rect.height)/2))+'px';
      panel.style.right='auto';
      panel.style.bottom='auto';
    }
    centerFloatingPlaylistOnStartup();
    // Correct layout once the initial page geometry is finalized; never re-center
    // after the user has moved or resized the panel.
    if(window.requestAnimationFrame)window.requestAnimationFrame(centerFloatingPlaylistOnStartup);
    function clamp(value, minimum, maximum) {
      return Math.max(minimum, Math.min(maximum, value));
    }
    function start(event, mode) {
      if (event.button !== 0 || (event.target && event.target.closest && event.target.closest('button'))) return;
      event.preventDefault();
      event.stopPropagation();
      var rect = panel.getBoundingClientRect();
      movement = { id:event.pointerId, mode:mode, x:event.clientX, y:event.clientY,
        left:rect.left, top:rect.top, width:rect.width, height:rect.height };
      // Resolve right/bottom anchoring to explicit positions for free dragging.
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.width = rect.width + 'px';
      panel.style.height = rect.height + 'px';
    }
    header.addEventListener('pointerdown', function(event) { start(event, 'move'); });
    grip.addEventListener('pointerdown', function(event) { start(event, 'resize'); });
    widthGrip.addEventListener('pointerdown', function(event) { start(event, 'width'); });
    window.addEventListener('pointermove', function(event) {
      if (!movement || event.pointerId !== movement.id) return;
      event.preventDefault();
      var maxTop = Math.max(0, window.innerHeight - 110 - 30);
      if (movement.mode === 'move') {
        var x = clamp(movement.left + event.clientX - movement.x, 0,
          Math.max(0, window.innerWidth - movement.width));
        var y = clamp(movement.top + event.clientY - movement.y, 0, maxTop);
        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        // Keep the panel fully visible if dragged near the bottom edge.
        panel.style.height = Math.min(movement.height, Math.max(110, window.innerHeight - y - 30)) + 'px';
      } else if(movement.mode === 'width') {
        // Extend to the right; keep the panel within the viewport.
        var maxWidth=Math.max(230,window.innerWidth-movement.left-8);
        var w=clamp(movement.width+event.clientX-movement.x,
          Math.min(230,maxWidth),maxWidth);
        panel.style.width=w+'px';
      } else {
        var h = clamp(movement.height + event.clientY - movement.y, 110,
          Math.max(110, window.innerHeight - movement.top - 30));
        panel.style.height = h + 'px';
      }
    }, {passive:false});
    function finish(event) {
      if (movement && event.pointerId === movement.id) movement = null;
    }
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    widthGrip.addEventListener('keydown',function(event){
      if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
      event.preventDefault();
      var rect=panel.getBoundingClientRect();
      var limit=Math.max(230,window.innerWidth-rect.left-8);
      panel.style.width=clamp(rect.width+(event.key==='ArrowRight'?30:-30),
        Math.min(230,limit),limit)+'px';
    });
    // Avoid passing drag events into the existing oscilloscope mouse handlers.
    $('#ricoLivePlaylist').on('mousedown', function(event) { event.stopPropagation(); });
  })();
  $('#ricoPlaylistToggle').on('click', function () {
    showLivePlaylist(!liveVisible);
  });
  // TEST52: the large library browser stays hidden behind the primary playlist.
  // Closing the floating playlist reveals Choose A SID only on a real user click.
  $('#ricoLiveClose').on('click', function () {
    showLivePlaylist(false);
    cancelPendingCommunityStartup();
    // TEST74: closing a playing list must never reveal the retired USER LOCAL view.
    // Reuse the single community-opening path without modifying playback.
    if(typeof window.ricoOpenCommunityFromRemix==='function'){
      window.ricoOpenCommunityFromRemix();
    }else{
      var manager=player.dialogManager;
      if(manager&&!manager.dialogShown)manager.showDialog('chooseSidDialog');
    }
  });


  // TEST21: user-facing MM:SS; engine keeps its seconds-based fallback timer.
  function formatAutoTime(seconds) {
    var total = Math.max(5, Math.min(3600, Math.round(seconds)));
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' +
      String(total % 60).padStart(2, '0');
  }
  function parseAutoTime(value) {
    var match = /^\s*(\d{1,2}):(\d{1,2})\s*$/.exec(String(value));
    if (!match) return null;
    var minutes = Number(match[1]), seconds = Number(match[2]);
    if (seconds >= 60) return null;
    var total = minutes * 60 + seconds;
    return total >= 5 && total <= 3600 ? total : null;
  }
  function updateAutoTime(seconds) {
    player.autoFallbackSeconds = Math.max(5, Math.min(3600, Math.round(seconds)));
    var shown=formatAutoTime(player.autoFallbackSeconds);
    $('#ricoFallback').val(shown);
    $('#ricoLiveTimer').val(shown);
  }
  // TEST199: known HVSC Songlengths as initial TIMER per playing SID/subtune.
  // Lazy alphabetical shards; unknown tunes retain the original 03:00.
  // Manual changes override the selected tune for the current session only.
  var songlengthShards=new Map(),manualSongTimers=new Map();
  var songlengthTicket=0,playingTimerKey=null,localTimerIds=new WeakMap();
  var nextLocalTimerId=0;
  function songTimerSource(){
    var index=player.sidListIndex,list=player.sidList||[];
    var entry=typeof index==='number'&&index>=0?list[index]:null;
    var sub=Math.max(0,Number(player.currentSubsong)||0);
    if(!entry)return null;
    var ref=customActive?(entry._hvscRef||
      (activeReferenceTracks&&activeReferenceTracks[index])):null;
    if(ref&&!ref.sidId&&typeof ref.file==='string'&&typeof ref.pack==='string'){
      var musician=/^library\/packs\/musicians\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\.zip$/.exec(ref.pack);
      var demo=/^library\/packs\/demos\/([A-Za-z0-9_-]+)\.zip$/.exec(ref.pack);
      if((musician||demo)&&/^[^/\\]+\.sid$/i.test(ref.file)){
        var relative=musician?musician[2]+'/'+ref.file:ref.file;
        return {key:ref.pack+'|'+ref.file+'|'+sub,
          shard:'library/songlengths/'+(musician?'musicians-'+musician[1]:'demos-'+demo[1])+'.json',
          relative:relative,sub:sub};
      }
    }
    if(!localTimerIds.has(entry))localTimerIds.set(entry,++nextLocalTimerId);
    return {key:'local:'+localTimerIds.get(entry)+'|'+sub,shard:null,sub:sub};
  }
  function loadSonglengthShard(path){
    if(!songlengthShards.has(path)){
      songlengthShards.set(path,fetch(path).then(function(response){
        if(!response.ok)throw Error('Songlength section unavailable ('+response.status+')');
        return response.json();
      }).then(function(data){
        return data&&data.format==='spotysid-songlengths'&&data.version===1&&
          data.durations&&typeof data.durations==='object'?data.durations:null;
      }).catch(function(error){
        console.warn('HVSC songlength information not available:',error);
        return null;
      }));
    }
    return songlengthShards.get(path);
  }
  function selectTentativeSidTimer(){
    var ticket=++songlengthTicket,source=songTimerSource();
    playingTimerKey=source?source.key:null;
    var override=source?manualSongTimers.get(source.key):null;
    updateAutoTime(override===undefined||override===null?180:override);
    if(!source||!source.shard||(override!==undefined&&override!==null))return;
    loadSonglengthShard(source.shard).then(function(durations){
      if(ticket!==songlengthTicket||playingTimerKey!==source.key||
         manualSongTimers.has(source.key)||!durations)return;
      var options=durations[source.relative];
      var seconds=Array.isArray(options)?options[source.sub]:null;
      if(!Number.isInteger(seconds)||seconds<5||seconds>3600)return;
      if(document.activeElement===document.getElementById('ricoLiveTimer')||
         document.activeElement===document.getElementById('ricoFallback'))return;
      updateAutoTime(seconds);
    });
  }
  function rememberManualSongTimer(){
    if(playingTimerKey)manualSongTimers.set(playingTimerKey,player.autoFallbackSeconds);
  }
  // A Playlist's AUTO TIMER is a maximum track duration, not only the fallback
  // for files without song-length metadata. Begin a five-second fade before
  // the limit, so the *next* SID starts near the displayed timer value.
  player.getAutoDurationSeconds=function(){
    return Math.max(0.1,player.autoFallbackSeconds-FADE_OUT_MS/1000);
  };
  $('#ricoLiveTimer').on('change blur',function(){
    var parsed=parseAutoTime(this.value);
    updateAutoTime(parsed===null?player.autoFallbackSeconds:parsed);
    if(parsed!==null)rememberManualSongTimer();
  }).on('keydown keyup keypress mousedown mouseup click dblclick',function(e){
    e.stopPropagation();
    if(e.type==='keydown'&&e.key==='Enter'){e.preventDefault();this.blur();}
  });

  function refreshTabs() {
    $('#ricoCommunityTab').toggleClass('rico-selected-tab',browserTab==='community');
    $('#ricoDefaultTab').toggleClass('rico-selected-tab',browserTab==='games');
    $('#ricoCustomTab').toggleClass('rico-selected-tab',browserTab==='local');
    $('#ricoHvscTab').toggleClass('rico-selected-tab',browserTab==='hvsc');
    $('#ricoDemosTab').toggleClass('rico-selected-tab',browserTab==='demos');
    $('#ricoOnefileTab').toggleClass('rico-selected-tab',browserTab==='onefile');
    $('#ricoGroupsTab').toggleClass('rico-selected-tab',browserTab==='groups');
    $('#ricoMusiciansTab').toggleClass('rico-selected-tab',browserTab==='musicians');
    $('#ricoLibraryTab').toggleClass('rico-selected-tab',browserTab==='library');
    $('#ricoOurCollectionTab').toggleClass('rico-selected-tab',browserTab==='ours');
    $('#ricoCustomCount').text(custom.length + ' SID');
    $('#ricoFallback').val(formatAutoTime(player.autoFallbackSeconds));
    if(document.activeElement!==document.getElementById('ricoLiveTimer'))
      $('#ricoLiveTimer').val(formatAutoTime(player.autoFallbackSeconds));
    $('#ricoPlaylistStatus').text(customActive
      ? (custom.length ? custom.length + ' local SID files ready (session only).' : 'Select SID files or a folder to create your custom list.')
      : 'Original 22 SID playlist. Your local files remain available in CUSTOM.');
  }
  function activate(mode) {
    // TEST173: leaving custom playback restores native TinySID immediately.
    if(mode!=='custom'&&window.RicoLftMode)window.RicoLftMode.deactivate();
    resetCsdbRankDisplay();
    resetSoftTransition(true);
    var wantCustom = mode === 'custom';
    if(!wantCustom&&activeReferenceStream){
      activeReferenceStream.cancel();activeReferenceStream=null;
      referenceSwitchSerial++;
    }
    if (wantCustom === customActive) {
      refreshTabs();
      return;
    }
    player.isPlaying = false;
    player.isPaused = false;
    player.autoElapsedSamples = 0;
    $('#playButton').text('Play');
    customActive = wantCustom;
    if (!wantCustom) { loadedPlaylistTitle = ''; loadedPlaylistCreator = ''; }
    player.sidList = wantCustom ? custom : originalList;
    player.sidListIndex = false;
    player.songInfo = {};
    player.setPath('');
    player.showSIDInfo(false);
    player.initFileSelection();
    renderLivePlaylist();
    refreshTabs();
  }
  function loadCustomIndex(index) {
    if (!customActive) activate('custom');
    if (index < 0 || index >= custom.length) return;
    var item = custom[index];
    if(item._hvscRef&&!item.localBytes&&activeReferenceStream){
      // Also protect direct selections outside the floating fade controller.
      var stream=activeReferenceStream,serial=++referenceSwitchSerial;
      $('#ricoLiveStatus').text('Loading SID from HVSC: '+item.name);
      stream.loadSlot(item).then(function(){
        if(activeReferenceStream!==stream||serial!==referenceSwitchSerial||!customActive)return;
        var target=custom.indexOf(item);
        if(target>=0)loadCustomIndex(target);
      }).catch(function(error){
        if(activeReferenceStream===stream&&serial===referenceSwitchSerial)
          $('#ricoLiveStatus').text('SID could not be loaded: '+error.message);
      });
      return;
    }
    player.initWebAudio();
    player.sidListIndex = index;
    player.setPath('');
    player.autoLoading = true;
    try {
      // Only the verified LFT.zip progressive slot may enter the experimental WASM.
      // TEST177: every song, in any v2/REMIX playlist, carries its own
      // approved HVSC reference. Switch engines by track, never by list title.
      if(window.RicoLftMode)
        window.RicoLftMode.approveTrustedReference(item._hvscRef||
          (activeReferenceTracks&&activeReferenceTracks[index])||null);
      var loaded = player.loadSIDData(item.localBytes);
      if (loaded === false) {
        player.initFileSelection();
        renderLivePlaylist();
        $('#ricoPlaylistStatus').text('Unsupported by SID engine: ' + item.file + ' (' + item.sidFormat + '). Select another SID.');
        $('#ricoLiveStatus').text('Cannot play: ' + item.file + ' — unsupported by current SID engine.');
        return;
      }
      $('#ricoLiveStatus').text('');
      // Engine determines actual initial subtune from the SID header.
      player.initFileSelection();
      renderLivePlaylist();
    } catch (error) {
      player.autoLoading = false;
      player.isPlaying = false;
      console.error('Local SID load failed', item.file, error);
      $('#ricoPlaylistStatus').text('Could not play ' + item.file);
      $('#ricoLiveStatus').text('Could not play ' + item.file);
    }
  }
  player.nextSid = function () {
    var list=player.sidList||[];
    if(!list.length)return;
    var current=transitionBusy&&queuedLiveIndex!==null?queuedLiveIndex:player.sidListIndex;
    var next=current===false?0:(current+1)%list.length;
    requestSidSwitch(next,'next');
  };
  player.popPath = function () {
    if (!customActive) defaultPopPath.apply(player, arguments);
  };
  player.initFileSelection = function () {
    if (browserTab === 'games' || (browserTab === 'community' && !customActive)) {
      // TEST37: GAMES is a compact metadata-only list, no artwork.
      var gamesHolder = $('#sidList').empty();
      originalList.forEach(function(item,index){
        var gameRow = $('<button type="button">').addClass('rico-game-row');
        if (!customActive && index === player.sidListIndex) gameRow.addClass('rico-active-row');
        $('<span>').addClass('rico-game-number').text(index+1).appendTo(gameRow);
        $('<span>').addClass('rico-game-title').text(item.name || item.file || ('SID '+(index+1))).appendTo(gameRow);
        $('<span>').addClass('rico-game-author').text(formatArtistCredit(item.author || 'Unknown artist')).appendTo(gameRow);
        $('<span>').addClass('rico-game-year').text(item.released || '').appendTo(gameRow);
        gameRow.on('click',function(){
          // Selecting a game explicitly replaces the current playback source.
          landingPlaylists=false;
          if(customActive) activate('default');
          player.sidListIndex=index;
          player.loadSID('sids/'+item.file);
          player.setPath(item.id);
          player.initFileSelection();
        });
        gameRow.appendTo(gamesHolder);
      });
      renderLivePlaylist();
      refreshTabs();
      return;
    }
    var holder = $('#sidList').empty();
    if (!custom.length) {
      $('<div>').addClass('rico-empty').text('No local SID files loaded. Use ADD SID FILES, ADD FOLDER or drop them here.').appendTo(holder);
    }
    custom.forEach(function (item, index) {
      var row = $('<div>').addClass('rico-local-row').attr('title', item.file);
      if (customActive && index === player.sidListIndex) row.addClass('rico-active-row');
      $('<span>').addClass('rico-row-index').text(('0' + (index + 1)).slice(-2)).appendTo(row);
      $('<span>').addClass('rico-row-title').text(item.name).appendTo(row);
      $('<span>').addClass('rico-row-author').text(formatArtistCredit(item.author)).appendTo(row);
      $('<span>').addClass('rico-row-subs').text(item.numSubtunes + (item.numSubtunes === 1 ? ' sub' : ' subs')).appendTo(row);
      row.on('click', function () { loadCustomIndex(index); });
      row.appendTo(holder);
    });
    renderLivePlaylist();
    refreshTabs();
  };

  // Browser file handles are kept in memory. Upload is never sent to GitHub.
  async function importFiles(inputFiles) {
    if (importing) return;
    // A new manual import is never the published LFT list.
    if(window.RicoLftMode)window.RicoLftMode.deactivate();
    var files = Array.from(inputFiles || []).filter(function (file) {
      return file && file.size >= 118; // Validate actual PSID/RSID header, not extension.
    });
    if (!files.length) {
      $('#ricoPlaylistStatus').text('No SID files found.');
      return;
    }
    importing = true;
    $('#ricoPlaylistStatus').text('Reading ' + files.length + ' files...');
    var accepted = 0, rejected = 0, newlyImported=[];
    for (var i = 0; i < files.length; i++) {
      try {
        var buf = new Uint8Array(await files[i].arrayBuffer());
        var parsed = parseSID(buf, files[i]);
        if (!parsed) { rejected++; console.warn('Not a supported PSID/RSID header:', files[i].name); continue; }
        parsed.id = 'local-' + (importedSidEntries.length + accepted);
        importedSidEntries.push(parsed);
        custom.push(parsed);
        newlyImported.push(parsed);
        accepted++;
      } catch (error) {
        rejected++;
        console.warn('SID import failed', files[i].name, error);
      }
    }
    importing = false;
    renderImportedSidList();
    if (accepted) {
      loadedPlaylistTitle = '';
      loadedPlaylistCreator = '';
      if (!customActive) activate('custom');
      else player.initFileSelection();
      if (player.sidListIndex === false) loadCustomIndex(0);
      renderLivePlaylist();
      showLivePlaylist(true);
    }
    $('#ricoPlaylistStatus').text(accepted + ' SID imported' + (rejected ? ' · ' + rejected + ' skipped' : '') + '. Use SAVE LIST for persistent local storage.');
    // Import is always usable locally. Public archiving is optional and
    // explicitly authorized via the existing beta-key dialog, not automatic.
    if(newlyImported.length)startNoHvscArchive(newlyImported,false).catch(function(error){
      $('#ricoPlaylistStatus').text('Import succeeded locally; NO HVSC not archived: '+error.message);
      console.warn('NO HVSC upload was not confirmed; local SID data is intact',error);
    });
  }

  function getEntryFiles(entry) {
    return new Promise(function (resolve) {
      if (!entry) return resolve([]);
      if (entry.isFile) {
        entry.file(function (file) { resolve([file]); }, function () { resolve([]); });
      } else if (entry.isDirectory) {
        var reader = entry.createReader(), all = [];
        function step() {
          reader.readEntries(function (batch) {
            if (!batch.length) {
              Promise.all(all.map(getEntryFiles)).then(function (nested) {
                resolve([].concat.apply([], nested));
              });
              return;
            }
            all.push.apply(all, batch);
            step();
          }, function () { resolve([]); });
        }
        step();
      } else resolve([]);
    });
  }
  async function droppedFiles(dataTransfer) {
    var items = Array.from(dataTransfer.items || []);
    var entries = items.map(function (it) {
      return it.webkitGetAsEntry ? it.webkitGetAsEntry() : null;
    }).filter(Boolean);
    if (entries.length) {
      var nested = await Promise.all(entries.map(getEntryFiles));
      return [].concat.apply([], nested);
    }
    return Array.from(dataTransfer.files || []);
  }

  $('#sidfile').attr('multiple', 'multiple').off('change').on('change', function () {
    importFiles(this.files);
    this.value = '';
  });
  $('#ricoFolderPicker').on('change', function () {
    importFiles(this.files);
    this.value = '';
  });
  $('#sidFileOpen').off('click').on('click', function () {
    document.getElementById('sidfile').click();
  });
  $('#ricoAddFiles').on('click', function () { document.getElementById('sidfile').click(); });
  $('#ricoAddFolder').on('click', function () { document.getElementById('ricoFolderPicker').click(); });
  // TEST43: tab clicks are browse-only. Playback changes only via LOAD/track selection.
  $('#ricoClearList').on('click', function () {
    importedSidEntries.length=0;renderImportedSidList();
    custom.length = 0;
    loadedPlaylistTitle = '';
    if (customActive) {
      player.isPlaying = false;
      player.sidListIndex = false;
      $('#playButton').text('Play');
      player.initFileSelection();
      renderLivePlaylist();
    }
    refreshTabs();
  });
  $('#ricoFallback').on('change blur', function () {
    var entered = parseAutoTime(this.value);
    updateAutoTime(entered === null ? player.autoFallbackSeconds : entered);
    if(entered!==null)rememberManualSongTimer();
  });
  $('#ricoFallback').on('keydown', function (event) {
    if (event.key === 'Enter') { this.blur(); event.preventDefault(); event.stopPropagation(); }
  });
  $('#ricoFallbackMinus').on('click', function () {
    var entered = parseAutoTime($('#ricoFallback').val());
    updateAutoTime((entered === null ? player.autoFallbackSeconds : entered) - 10);
    rememberManualSongTimer();
  });
  $('#ricoFallbackPlus').on('click', function () {
    var entered = parseAutoTime($('#ricoFallback').val());
    updateAutoTime((entered === null ? player.autoFallbackSeconds : entered) + 10);
    rememberManualSongTimer();
  });
  $('#ricoDropZone').off('drop').on('drop.ricoPlaylist', async function (event) {
    event.preventDefault();
    event.stopPropagation();
    var transfer = event.originalEvent && event.originalEvent.dataTransfer;
    if (transfer) await importFiles(await droppedFiles(transfer));
    $('#ricoDropZone').removeClass('rico-dragging');
  });
  $('#ricoDropZone').on('dragenter dragover', function (event) {
    event.preventDefault();
    $(this).addClass('rico-dragging');
  }).on('dragleave', function () { $(this).removeClass('rico-dragging'); });


  // TEST73: truly separate IMPORT SID window; Community catalog never shows these controls.
  (function initImportSidWindow(){
    var panel=document.getElementById('ricoImportSidWindow');
    var opener=document.getElementById('ricoImportSidButton');
    var closer=document.getElementById('ricoImportSidClose');
    var header=document.getElementById('ricoImportSidHeader');
    if(!panel||!opener||!closer)return;
    opener.addEventListener('click',function(event){
      event.stopPropagation();panel.style.display='flex';
      renderImportedSidList();
      opener.setAttribute('aria-expanded','true');
    });
    closer.addEventListener('click',function(event){
      event.stopPropagation();panel.style.display='none';
      opener.setAttribute('aria-expanded','false');
    });
    ['mousedown','mouseup','pointerdown','pointerup','click','dblclick','keydown','keyup','keypress'].forEach(function(type){
      panel.addEventListener(type,function(event){
        if(event.target.closest('input,select,button'))event.stopPropagation();
      });
    });
    var drag=null;
    if(header) {
      header.addEventListener('pointerdown',function(e){
        if(e.button!==0||e.target.closest('button'))return;
        var rect=panel.getBoundingClientRect();
        drag={x:e.clientX,y:e.clientY,l:rect.left,t:rect.top};
        if(header.setPointerCapture)header.setPointerCapture(e.pointerId);
        e.preventDefault();e.stopPropagation();
      });
      header.addEventListener('pointermove',function(e){
        if(!drag)return;
        panel.style.left=Math.max(0,Math.min(window.innerWidth-panel.offsetWidth,drag.l+e.clientX-drag.x))+'px';
        panel.style.top=Math.max(0,Math.min(window.innerHeight-40,drag.t+e.clientY-drag.y))+'px';
        panel.style.transform='none';
        e.stopPropagation();
      });
      header.addEventListener('pointerup',function(){drag=null;});
      header.addEventListener('pointercancel',function(){drag=null;});
    }
  })();

  // TEST09: self-contained JSON playlists, local IndexedDB storage.
  // No server upload, changes to the SID emulation engine, or automatic disclosure.
  (function playlistPersistence() {
    var MAX_BYTES = 64 * 1024 * 1024;
    var nameEl = document.getElementById('ricoSavedName');
    var listEl = document.getElementById('ricoSavedSelect');
    var fileEl = document.getElementById('ricoJsonImport');
    var stateEl = document.getElementById('ricoSavedStatus');
    var currentId = '';
    if (!nameEl || !listEl || !fileEl || !stateEl) return;
    // Original player calls preventDefault on window mousedown, blocking text-field focus.
    // Isolate this editable field from that legacy mouse handler without changing SID playback.
    ['mousedown','mouseup','pointerdown','pointerup','click','dblclick'].forEach(function(type) {
      nameEl.addEventListener(type,function(event){event.stopPropagation();});
    });
    ['keyup','keydown','keypress'].forEach(function(type) {
      nameEl.addEventListener(type,function(event){event.stopPropagation();});
    });
    var libraryEl = document.getElementById('ricoSavedLibrary');

    function say(text) { stateEl.textContent = text; }
    function openDatabase() {
      return new Promise(function(resolve, reject) {
        if (!window.indexedDB) return reject(Error('Local database unavailable'));
        var request = indexedDB.open('ricos-sid-playlists', 1);
        request.onupgradeneeded = function() {
          if (!request.result.objectStoreNames.contains('playlists'))
            request.result.createObjectStore('playlists', {keyPath:'id'});
        };
        request.onsuccess = function(){resolve(request.result);};
        request.onerror = function(){reject(request.error || Error('Database error'));};
      });
    }
    async function dbCall(mode, operation) {
      var db = await openDatabase();
      return new Promise(function(resolve, reject) {
        var tx = db.transaction('playlists', mode);
        var request = operation(tx.objectStore('playlists'));
        var result;
        request.onsuccess = function(){result = request.result;};
        request.onerror = function(){reject(request.error || Error('Database request failed'));};
        tx.oncomplete = function(){db.close();resolve(result);};
        tx.onabort = function(){db.close();reject(tx.error || Error('Database transaction failed'));};
      });
    }
    function encode(bytes) {
      var chunks=[];
      for (var i=0; i<bytes.length; i+=8192)
        chunks.push(String.fromCharCode.apply(null,bytes.subarray(i,i+8192)));
      return btoa(chunks.join(''));
    }
    function decode(encoded) {
      if (typeof encoded !== 'string' || encoded.length > MAX_BYTES*2 ||
          !encoded.length || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
        throw Error('Invalid SID data.');
      var binary = atob(encoded), out = new Uint8Array(binary.length);
      for (var i=0; i<binary.length; i++) out[i]=binary.charCodeAt(i);
      return out;
    }
    // TEST106: persist active playlist order, not the import draft used by SAVE LIST.
    window.ricoSaveCurrentPlaylistLocal=async function(){
      if(!customActive||loadedRankedPlaylist||!custom.length)
        throw Error('No editable playlist is loaded.');
      var title=(loadedPlaylistTitle||nameEl.value||'MY PLAYLIST').trim().slice(0,100);
      var creator=(loadedPlaylistCreator||'RICO').trim().slice(0,60);
      if(!title||!creator)throw Error('Playlist title or creator missing.');
      var version,tracks;
      if(activeReferenceTracks&&activeReferenceTracks.length===custom.length){
        version=2;
        tracks=activeReferenceTracks.map(remixCanonicalRef);
      }else{
        if(!custom.every(function(t){return t.localBytes instanceof Uint8Array;}))
          throw Error('Original SID data unavailable; cannot save locally.');
        version=1;
        tracks=custom.map(function(t){return {file:t.file||'track.sid',sidBase64:encode(t.localBytes)};});
      }
      var old=activeLocalSavedId?await dbCall('readonly',function(store){return store.get(activeLocalSavedId);}):null;
      var record={format:'ricos-sid-playlist',version:version,
        id:old?old.id:'list-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),
        name:title,createdBy:creator,createdAt:(old&&old.createdAt)||new Date().toISOString(),
        updatedAt:new Date().toISOString(),tracks:tracks};
      await dbCall('readwrite',function(store){return store.put(record);});
      activeLocalSavedId=record.id;activeLocalOrderDirty=false;
      await refreshSaved();renderLivePlaylist();
      $('#ricoLiveStatus').text('Order saved locally: '+title+'. Public playlists unchanged.');
    };
    function makePlaylist() {
      var name = nameEl.value.trim();
      if (!name) throw Error('Enter a playlist name.');
      if (!importedSidEntries.length) throw Error('IMPORT SID has no files. Add SID files or select a saved local playlist.');
      return {
        format:'ricos-sid-playlist', version:1, name:name,
        createdBy: loadedPlaylistCreator || undefined,
        createdAt:new Date().toISOString(), tracks:importedSidEntries.map(function(item) {
          return {file:item.file || 'track.sid', sidBase64:encode(item.localBytes)};
        })
      };
    }
    function validatedEntries(data) {
      if (!data || data.format !== 'ricos-sid-playlist' || data.version !== 1 ||
          typeof data.name !== 'string' || !data.name.trim() ||
          !Array.isArray(data.tracks) || !data.tracks.length || data.tracks.length > 2000)
        throw Error('Unsupported playlist JSON.');
      var entries=[], total=0;
      data.tracks.forEach(function(track, index){
        if (!track || typeof track.file !== 'string' || !track.file ||
            track.file.length > 255) throw Error('Invalid track filename.');
        var bytes=decode(track.sidBase64);
        total+=bytes.length;
        if (total>MAX_BYTES) throw Error('Playlist exceeds 64 MB.');
        var entry=parseSID(bytes,{name:track.file,size:bytes.length});
        if (!entry) throw Error('Invalid SID in track ' + (index+1));
        entry.id='local-'+index;
        entries.push(entry);
      });
      return entries;
    }
    function loadPlaylist(data,startIndex,localImport,ranked) {
      // Legacy/local source: preserve unchanged TinySID behavior.
      if(window.RicoLftMode)window.RicoLftMode.deactivate();
      resetCsdbRankDisplay();
      resetSoftTransition(true);
      if(activeReferenceStream){activeReferenceStream.cancel();activeReferenceStream=null;}
      referenceSwitchSerial++;
      // Validate everything before changing the currently loaded playlist.
      var entries=validatedEntries(data);
      loadedRankedPlaylist=ranked===true;
      if(localImport){importedSidEntries=entries.slice();renderImportedSidList();}
      // TEST47: preserve playlist-level scene group credits in the floating playlist.
      if(Array.isArray(data.tracks)) entries.forEach(function(entry,index){
        var track=data.tracks[index];
        if(track&&typeof track.group==='string'&&track.group.trim())
          entry.sceneGroup=track.group.trim();
      });
      activePublicPlaylist=null;activePublicCollection=null;
      activeRemixDraftId=null;activeReferenceTracks=null;activeLocalSavedId=null;
      activeLocalOrderDirty=false;activeCuratedCatalogId=null;
      embeddedHvscPaths=data.tracks.map(function(t){
        return t&&typeof t.file==='string'&&/^(?:MUSICIANS|DEMOS)\//.test(t.file)?t.file:'';
      });
      cancelPendingCommunityStartup();
      landingPlaylists = false;
      player.isPlaying=false;
      player.isPaused=false;
      custom.length=0;
      Array.prototype.push.apply(custom,entries);
      nameEl.value=data.name.slice(0,100);
      loadedPlaylistTitle=data.name.trim().slice(0,100);
      loadedPlaylistCreator=typeof data.createdBy==='string' && data.createdBy.trim()
        ? data.createdBy.trim().slice(0,100) : (typeof data.author==='string' && data.author.trim()
          ? data.author.trim().slice(0,100) : '');
      if (!customActive) activate('custom');
      else player.initFileSelection();
      loadCustomIndex(Number.isInteger(startIndex) ? startIndex : 0);
      showLivePlaylist(true);
    }

    // TEST112: first-play fast path for the large historical HVSC playlist.
    // The browser still gets bytes from the existing HVSC ZIP packs; no SID
    // files are published, duplicated, or permanently stored as new tracks.
    function createProgressiveReferenceStream(refs,unknownAuthors){
      var controller=new AbortController(),archives=new Map(),cancelled=false;
      var slots=refs.map(function(ref,i){
        return {id:'hvsc-slot-'+i,
          name:ref.title||ref.file.split('/').pop().replace(/\.sid$/i,'').replace(/_/g,' '),
          author:ref.author||(unknownAuthors?'<?>':'Loading from HVSC…'),released:'',file:ref.file,size:0,
          numSubtunes:1,startSubtune:1,sidFormat:'PSID',localBytes:null,
          _hvscRef:remixCanonicalRef(ref),_hvscPromise:null};
      });
      function archiveFor(pack){
        if(!archives.has(pack)){
          var job=(async function(){
            var response=await fetch(pack,{signal:controller.signal});
            if(!response.ok)throw Error('HVSC ZIP unavailable ('+response.status+'): '+pack);
            return JSZip.loadAsync(await response.arrayBuffer());
          })().catch(function(error){archives.delete(pack);throw error;});
          archives.set(pack,job);
        }
        return archives.get(pack);
      }
      function loadSlot(slot){
        if(slot.localBytes)return Promise.resolve(slot);
        if(slot._hvscPromise)return slot._hvscPromise;
        slot._hvscPromise=(async function(){
          if(cancelled)throw Error('Playlist loading cancelled');
          var bytes;
          if(slot._hvscRef.sidId){
            var asset=await fetch(communityWriteApi+'/sid-assets/'+slot._hvscRef.sidId,
              {signal:controller.signal,cache:'no-store'});
            if(!asset.ok)throw Error('NO HVSC SID unavailable: '+slot._hvscRef.file+' ('+asset.status+')');
            bytes=new Uint8Array(await asset.arrayBuffer());
          }else{
            var archive=await archiveFor(slot._hvscRef.pack);
            var sid=archive.file(slot._hvscRef.file);
            if(!sid)throw Error('SID not found in HVSC ZIP: '+slot._hvscRef.file);
            bytes=await sid.async('uint8array');
          }
          if(cancelled)throw Error('Playlist loading cancelled');
          var parsed=parseSID(bytes,{name:slot._hvscRef.file,size:bytes.length});
          if(!parsed)throw Error('Invalid PSID/RSID: '+slot._hvscRef.file);
          // Preserve slot identity: arrows may move entries while fetching.
          Object.assign(slot,parsed,{id:slot.id});
          return slot;
        })().catch(function(error){slot._hvscPromise=null;throw error;});
        return slot._hvscPromise;
      }
      function prefetch(){
        // TEST122: 1,376 UNKNOWN tracks are intentionally on-demand.
        // Decompressing every tiny SID continuously in the browser and
        // re-rendering their rows can starve ScriptProcessor audio on click.
        // Only warm the nearest few tracks; clicks fetch any other song.
        if(slots.length>=1000||stream.onDemandOnly){
          (async function(){
            var failures=0;
            for(var i=1;i<Math.min(slots.length,10)&&!cancelled;i++){
              await new Promise(function(resolve){setTimeout(resolve,55);});
              if(cancelled)return;
              try{await loadSlot(slots[i]);}
              catch(error){if(!cancelled){failures++;console.warn('HVSC prefetch failed',error);}}
            }
            if(!cancelled&&activeReferenceStream===stream&&customActive)
              $('#ricoPlaylistStatus').text('HVSC ready to browse: '+slots.length+
                ' SID · additional tracks load when selected'+
                (failures?' ('+failures+' unavailable nearby)':'')+'.');
          })();
          return;
        }
        var next=1,finished=1,failures=0,ended=0;
        async function worker(){
          while(!cancelled&&next<slots.length){
            var slot=slots[next++];
            try{await loadSlot(slot);}
            catch(error){
              if(cancelled)return;
              slot.author='Unavailable — click to retry';
              failures++;
              console.warn('Background HVSC SID not yet available',slot.file,error);
            }
            finished++;
            if(activeReferenceStream===stream&&customActive&&finished%40===0)
              player.initFileSelection();
          }
          ended++;
          if(ended===2&&!cancelled&&activeReferenceStream===stream){
            $('#ricoPlaylistStatus').text('HVSC prepared '+finished+'/'+slots.length+
              ' SID'+(failures?' ('+failures+' unavailable)':'')+'.');
            player.initFileSelection();
          }
        }
        // Two concurrent fetch/decode workers instead of 77 sequential
        // network waits, while keeping the first SID ready for PLAY.
        worker();worker();
      }
      var stream={slots:slots,loadSlot:loadSlot,prefetch:prefetch,
        cancel:function(){cancelled=true;controller.abort();archives.clear();}};
      return stream;
    }
    async function loadProgressiveReferencePlaylist(data,localImport){
      resetCsdbRankDisplay();
      var stream=createProgressiveReferenceStream(data.tracks,data.name==='UNKNOWN CSDB');
      // TOP 100 DEMOS: song metadata is already in the source manifest.
      // Load song bytes on demand without decoding the entire list at launch.
      stream.onDemandOnly=data.name==='TOP 100 DEMOS'||/^TOP 100 CSDb (?:ONEFILE )?DEMOS/.test(data.name);
      activeReferenceStream=stream;
      try{
        await stream.loadSlot(stream.slots[0]);
        if(activeReferenceStream!==stream)throw Error('Playlist selection changed');
      }catch(error){
        if(activeReferenceStream===stream){stream.cancel();activeReferenceStream=null;}
        throw error;
      }
      activePublicPlaylist=null;activePublicCollection=null;
      activeRemixDraftId=null;
      activeReferenceTracks=data.tracks.map(remixCanonicalRef);
      activeLocalSavedId=localImport&&typeof data.id==='string'?data.id:null;
      activeLocalOrderDirty=false;activeCuratedCatalogId=null;
      loadedRankedPlaylist=false;embeddedHvscPaths=[];
      cancelPendingCommunityStartup();
      landingPlaylists=false;
      player.isPlaying=false;player.isPaused=false;
      custom.length=0;Array.prototype.push.apply(custom,stream.slots);
      nameEl.value=data.name.slice(0,100);
      loadedPlaylistTitle=data.name.trim().slice(0,100);
      loadedPlaylistCreator=(data.createdBy||'You').slice(0,100);
      if(!customActive)activate('custom');else player.initFileSelection();
      loadCustomIndex(0);showLivePlaylist(true);
      $('#ricoLiveStatus').text('First SID ready; the rest of HVSC loads progressively.');
      setTimeout(function(){if(activeReferenceStream===stream)stream.prefetch();},0);
    }
    // TEST61: reference-only playlists resolve SID files from one immutable HVSC base.
    // Existing v1 playlists with embedded SID remain fully supported.
    async function loadStoredPlaylist(data,localImport,sourceRemoteId) {
      // TEST177: do not activate an engine by list name, owner or publication.
      // The selected track's verified HVSC reference decides its engine.
      resetCsdbRankDisplay();
      resetSoftTransition(true);
      if(activeReferenceStream){activeReferenceStream.cancel();activeReferenceStream=null;}
      referenceSwitchSerial++;
      if (!data || data.format!=='ricos-sid-playlist') throw Error('Unsupported playlist.');
      if (data.version===1) {
        loadPlaylist(data,undefined,!!localImport);
        activeLocalSavedId=localImport&&typeof data.id==='string'?data.id:null;
        return;
      }
      if (data.version!==2 || !Array.isArray(data.tracks) ||
          !data.tracks.length || data.tracks.length>2000) throw Error('Invalid reference playlist.');
      if(typeof JSZip==='undefined') throw Error('SID ZIP decoder not available.');
      // TEST121: both OLD SID COLLECTION RICO and the 1376-track UNKNOWN CSDB
      // reference list must start after the first SID is ready, not after all
      // SIDs decode. Keep every other playlist on its existing stable loader.
      if((data.tracks.some(function(t){return !!t.sidId;})&&data.tracks.length>=120)||
         ((data.name==='OLD SID COLLECTION RICO'||data.name==='UNKNOWN CSDB')&&
         data.tracks.length>=200)||
         (data.name==="RICO'S BEST OF MUS"&&data.tracks.length>=80)||
         ((data.name==='TOP 100 DEMOS'||/^TOP 100 CSDb (?:ONEFILE )?DEMOS/.test(data.name))&&data.tracks.length>=1)){
        for(var k=0;k<data.tracks.length;k++){
          var ref=data.tracks[k];
          if(!validRemixRef(ref))throw Error('Invalid catalog SID reference.');
        }
        await loadProgressiveReferencePlaylist(data,localImport);
        return;
      }
      var packages=new Map(), output=[], bytesTotal=0;
      for(var i=0;i<data.tracks.length;i++){
        var track=data.tracks[i];
        if(!validRemixRef(track))throw Error('Invalid catalog SID reference.');
        var bytes;
        if(track.sidId){
          var assetResponse=await fetch(communityWriteApi+'/sid-assets/'+track.sidId,{cache:'no-store'});
          if(!assetResponse.ok)throw Error('NO HVSC SID unavailable ('+assetResponse.status+'): '+track.file);
          bytes=new Uint8Array(await assetResponse.arrayBuffer());
        }else{
          var archive=packages.get(track.pack);
          if(!archive){
            var response=await fetch(track.pack);
            if(!response.ok)throw Error('SID pack missing ('+response.status+'): '+track.pack);
            archive=await JSZip.loadAsync(await response.arrayBuffer());
            packages.set(track.pack,archive);
          }
          var file=archive.file(track.file);
          if(!file)throw Error('SID not found in catalog: '+track.file);
          bytes=await file.async('uint8array');
        }
        bytesTotal+=bytes.length;
        if(bytesTotal>64*1024*1024) throw Error('Playlist exceeds 64 MB.');
        var entry=parseSID(bytes,{name:track.file,size:bytes.length});
        if(!entry)throw Error('Invalid SID: '+track.file);
        output.push(entry);
      }
      // Do not change playback until every reference has been resolved and validated.
      activePublicPlaylist=null;activePublicCollection=null;
      activeRemixDraftId=null;
      activeReferenceTracks=data.tracks.map(remixCanonicalRef);
      activeLocalSavedId=localImport&&typeof data.id==='string'?data.id:null;
      activeLocalOrderDirty=false;activeCuratedCatalogId=null;
      loadedRankedPlaylist=false;
      embeddedHvscPaths=[];
      cancelPendingCommunityStartup();
      landingPlaylists=false;
      player.isPlaying=false;player.isPaused=false;
      custom.length=0;Array.prototype.push.apply(custom,output);
      nameEl.value=data.name.slice(0,100);
      loadedPlaylistTitle=data.name.trim().slice(0,100);
      loadedPlaylistCreator=(data.createdBy||'You').slice(0,100);
      if(!customActive)activate('custom');else player.initFileSelection();
      loadCustomIndex(0);showLivePlaylist(true);
    }
    window.ricoPlayRemixDraft=async function(data){
      await loadStoredPlaylist(data);
    };
    async function refreshSaved() {
      var rows=await dbCall('readonly',function(store){return store.getAll();});
      rows.sort(function(a,b){return (b.updatedAt||'').localeCompare(a.updatedAt||'');});
      listEl.textContent='';
      var blank=document.createElement('option');
      blank.value='';blank.textContent='Saved playlists ('+rows.length+')';
      listEl.appendChild(blank);
      rows.forEach(function(item){
        var option=document.createElement('option');
        option.value=item.id;
        option.textContent=item.name+' ('+item.tracks.length+' SID)';
        listEl.appendChild(option);
      });
      listEl.value=rows.some(function(row){return row.id===currentId;}) ? currentId : '';
      if (libraryEl) {
        libraryEl.textContent='';
        if (!rows.length) {
          var empty=document.createElement('div');
          empty.textContent='No saved playlists yet. Load SID files and click SAVE LIST.';
          empty.style.padding='6px'; libraryEl.appendChild(empty);
        }
        rows.forEach(function(item){
          var btn=document.createElement('button');
          btn.type='button';
          btn.style.cssText='display:flex;flex:1;min-width:0;align-items:center;justify-content:space-between;text-align:left;background:#f2f5f6;color:#222;border:1px solid #bdc7cd;margin:0;padding:5px 7px;cursor:pointer;font-size:11px;';
          var title=document.createElement('span');
          title.textContent=item.name;
          var tracks=document.createElement('span');
          tracks.textContent=item.tracks.length+' SID  ·  PLAY';
          tracks.style.cssText='font-size:10px;color:#285d45;margin-left:8px;white-space:nowrap;';
          btn.appendChild(title);btn.appendChild(tracks);
          btn.addEventListener('click',async function(){
            try {
              currentId=item.id;
              listEl.value=item.id;
              var stored=await dbCall('readonly',function(store){return store.get(item.id);});
              if (!stored) throw Error('Playlist not found.');
              await loadStoredPlaylist(stored,true);
              say('Loaded: '+stored.name+' ('+stored.tracks.length+' SID).');
            } catch(error){say(error.message || 'Failed to load playlist.');}
          });
          var row=document.createElement('div');
          row.style.cssText='display:flex;align-items:stretch;gap:5px;margin:3px 0;';
          var del=document.createElement('button');
          del.type='button';
          del.textContent='DELETE';
          del.title='Delete saved playlist: '+item.name;
          del.setAttribute('aria-label','Delete saved playlist '+item.name);
          del.style.cssText='flex:none;margin:0;padding:4px 8px;background:#702828;color:white;border:1px solid #b56a6a;cursor:pointer;font-size:10px;';
          del.addEventListener('click',async function(event){
            event.stopPropagation();
            if (!window.confirm('Delete saved playlist "'+item.name+'"? This cannot be undone.')) return;
            try {
              await dbCall('readwrite',function(store){return store.delete(item.id);});
              if (currentId===item.id) currentId='';
              await refreshSaved();
              say('Deleted saved playlist: '+item.name+'. Current playback was not changed.');
            } catch(error) {
              say(error.message || 'Could not delete playlist.');
              console.error('Playlist deletion failed',error);
            }
          });
          row.appendChild(btn);
          row.appendChild(del);
          libraryEl.appendChild(row);
        });
      }
      // Sync IMPORT SID saved playlists into the single Community list.
      if(typeof window.ricoRenderLocalImportedRows==='function')
        await window.ricoRenderLocalImportedRows();
      // Same COMMUNITY PLAYLISTS tab: locally saved lists are private to this browser.
      // Public catalog remains separate and unchanged.
      var localCommunity=document.getElementById('ricoLocalCommunityItems');
      if(localCommunity){
        localCommunity.textContent='';
        rows.forEach(function(item){
          var line=document.createElement('div');
          line.className='rico-community-row';
          var label=document.createElement('span');
          label.className='rico-community-label';
          var caption=document.createElement('span');
          caption.className='rico-community-description';
          caption.textContent=item.name+' — Playlist by '+(item.createdBy||'Unknown')+' · '+item.tracks.length+' SID';
          label.appendChild(caption);
          var stars=document.createElement('span');
          stars.className='rico-community-stars';
          stars.textContent='☆☆☆☆☆';
          stars.setAttribute('aria-label','Ratings coming soon');
          stars.title='Ratings coming soon — no votes yet';
          label.appendChild(stars);
          var load=document.createElement('button');
          load.type='button';load.textContent='PLAY';
          load.addEventListener('click',async function(event){
            event.stopPropagation();
            load.disabled=true;
            try{
              var stored=await dbCall('readonly',function(store){return store.get(item.id);});
              if(!stored)throw Error('Playlist not found.');
              currentId=item.id;
              await loadStoredPlaylist(stored,true);
              say('Loaded '+stored.name+' · Playlist by '+(stored.createdBy||'Unknown')+'.');
            }catch(error){say(error.message||'Could not load playlist.');}
            finally{load.disabled=false;}
          });
          line.appendChild(label);line.appendChild(load);
          localCommunity.appendChild(line);
        });
      }
    }
    function run(id,action) {
      document.getElementById(id).addEventListener('click',function(){
        Promise.resolve().then(action).catch(function(error){
          say(error.message || 'Playlist operation failed');
          console.error('Playlist operation failed',error);
        });
      });
    }
    listEl.addEventListener('change',function(){currentId=this.value;});
    run('ricoSaveList',async function(){
      var data=makePlaylist();
      var prior=await dbCall('readonly',function(store){return store.getAll();});
      var match=prior.find(function(item){return item.name===data.name;});
      data.id=match ? match.id : 'list-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
      data.updatedAt=new Date().toISOString();
      await dbCall('readwrite',function(store){return store.put(data);});
      currentId=data.id;
      loadedPlaylistTitle=data.name;
      renderLivePlaylist();
      await refreshSaved();
      say('Saved locally: '+data.name+' ('+data.tracks.length+' SID).');
    });
    run('ricoLoadList',async function(){
      if (!listEl.value) throw Error('Select a saved playlist.');
      var data=await dbCall('readonly',function(store){return store.get(listEl.value);});
      if (!data) throw Error('Playlist not found.');
      await loadStoredPlaylist(data,true);
      say('Loaded: '+data.name+'.');
    });
    run('ricoDownloadList',function(){
      var data=makePlaylist();
      var filename=data.name.toLowerCase().replace(/[^a-z0-9_-]+/g,'-').slice(0,70) || 'playlist';
      var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;a.download=filename+'.json';
      document.body.appendChild(a);
      a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(url);},1000);
      say('JSON downloaded: '+data.name+'.');
    });
    run('ricoImportList',function(){fileEl.click();});
    fileEl.addEventListener('change',async function(){
      var file=this.files && this.files[0];
      this.value='';
      if (!file) return;
      try {
        if (file.size > MAX_BYTES*2) throw Error('JSON file is too large.');
        var data=JSON.parse(await file.text());
        loadPlaylist(data,undefined,true);
        say('Imported '+data.name+' ('+data.tracks.length+' SID). Use SAVE LIST to keep it locally.');
      } catch(error) {
        say(error.message || 'Invalid JSON playlist.');
        console.error('JSON import failed',error);
      }
    });
    // Closed beta community catalog: read-only and hosted on the same Pages origin.
    var communityTab=document.getElementById('ricoCommunityTab');
    var communityPanel=document.getElementById('ricoCommunityPanel');
    var communityItems=document.getElementById('ricoCommunityItems');
    var communityOrderSave=document.getElementById('ricoCommunityOrderSave');
    var communityOrderStatus=document.getElementById('ricoCommunityOrderStatus');
    var COMMUNITY_ORDER_STORAGE_KEY='rico-community-catalog-order-v1';
    var communityDraftOrder=null;
    var communityServerOrder=null;
    var communityServerRevision=null;
    var communityPublicOrderDirty=false;
    // TEST159: the shared catalog order lives in D1, not just this browser.
    async function readCommunityServerOrder(){
      try{
        var response=await fetch(communityWriteApi+'/catalog-order',{cache:'no-store'});
        if(!response.ok)throw Error('Catalog order endpoint unavailable ('+response.status+').');
        var data=await response.json();
        if(!data||data.format!=='ricos-community-catalog-order'||data.version!==1||
           !Array.isArray(data.order)||!Number.isSafeInteger(data.revision))
          throw Error('Unexpected catalog order response.');
        communityServerOrder=data.order;
        communityServerRevision=data.revision;
      }catch(error){
        communityServerOrder=null;
        communityServerRevision=null;
        console.warn('Shared community playlist order not available yet',error);
      }
    }
    function communityItemOrderKey(item){
      return item.remoteId?'remote:'+item.remoteId:'static:'+item.file;
    }
    function readSavedCommunityOrder(){
      try{
        var stored=JSON.parse(localStorage.getItem(COMMUNITY_ORDER_STORAGE_KEY)||'[]');
        return Array.isArray(stored)?stored.filter(function(key){return typeof key==='string'&&key.length<180;}).slice(0,1000):[];
      }catch(error){return [];}
    }
    function sortCommunityPlaylists(playlists){
      var ids=communityDraftOrder!==null?communityDraftOrder:
        (communityServerOrder&&communityServerOrder.length?communityServerOrder:readSavedCommunityOrder());
      if(!ids.length)return playlists;
      var positions=Object.create(null);
      ids.forEach(function(key,index){if(positions[key]===undefined)positions[key]=index;});
      return playlists.map(function(item,index){return {item:item,index:index};}).sort(function(a,b){
        var aPos=positions[communityItemOrderKey(a.item)],bPos=positions[communityItemOrderKey(b.item)];
        if(aPos!==undefined&&bPos!==undefined)return aPos-bPos;
        if(aPos!==undefined)return -1;
        if(bPos!==undefined)return 1;
        return a.index-b.index;
      }).map(function(entry){return entry.item;});
    }
    function catalogOrderRows(){
      return Array.prototype.slice.call(communityItems.querySelectorAll('.rico-community-catalog-row'));
    }
    // TEST160: Include local imported and unpublished draft rows in visible order.
    // Only published/static catalog rows may be sent to the D1 public ordering API.
    function allCommunityOrderRows(){
      return Array.prototype.slice.call(
        communityItems.querySelectorAll('.rico-community-row[data-community-order-key]')
      );
    }
    function isPublicCommunityKey(key){
      return typeof key==='string'&&
        (key.indexOf('remote:')===0||key.indexOf('static:')===0);
    }
    function updateCatalogArrows(){
      var rows=allCommunityOrderRows();
      rows.forEach(function(row,index){
        var up=row.querySelector('.rico-community-up');
        var down=row.querySelector('.rico-community-down');
        if(up)up.disabled=index===0;
        if(down)down.disabled=index===rows.length-1;
      });
    }
    function addPrivateCommunityArrows(row,key){
      row.dataset.communityOrderKey=key;
      var controls=document.createElement('span');
      controls.className='rico-community-order-controls';
      var up=document.createElement('button');
      up.type='button';up.className='rico-community-up';up.textContent='↑';
      var down=document.createElement('button');
      down.type='button';down.className='rico-community-down';down.textContent='↓';
      bindReorderArrows($(up),-1,function(step){moveCommunityRow(row,step);});
      bindReorderArrows($(down),1,function(step){moveCommunityRow(row,step);});
      controls.appendChild(up);controls.appendChild(down);
      // Use the exact same layout as published Community playlists.
      row.insertBefore(controls,row.querySelector('button'));
    }
    function restorePrivateCommunityPositions(){
      var stored=communityDraftOrder===null?readSavedCommunityOrder():communityDraftOrder;
      if(!stored||!stored.some(function(k){return !isPublicCommunityKey(k);}))return;
      var rows=allCommunityOrderRows();
      if(!rows.length)return;
      var publicQueue=rows.filter(function(row){
        return isPublicCommunityKey(row.dataset.communityOrderKey);
      });
      var privateRows=rows.filter(function(row){
        return !isPublicCommunityKey(row.dataset.communityOrderKey);
      });
      var privateByKey=new Map(privateRows.map(function(row){
        return [row.dataset.communityOrderKey,row];
      }));
      var ordered=[],used=new Set(),nextPublic=0;
      stored.forEach(function(key){
        var row=null;
        if(isPublicCommunityKey(key)){
          row=publicQueue[nextPublic++]||null;
        }else{
          row=privateByKey.get(key)||null;
        }
        if(row&&!used.has(row)){ordered.push(row);used.add(row);}
      });
      rows.forEach(function(row){if(!used.has(row))ordered.push(row);});
      ordered.forEach(function(row){communityItems.appendChild(row);});
      updateCatalogArrows();
    }
    function moveCommunityRow(row,step){
      var rows=allCommunityOrderRows(),from=rows.indexOf(row);
      if(from<0)return;
      var to=Math.max(0,Math.min(rows.length-1,from+step));
      if(to===from)return;
      var previousPublic=catalogOrderRows().map(function(entry){
        return entry.dataset.communityOrderKey;
      }).join('\n');
      cancelStartupPlaylist();
      var target=rows[to];
      communityItems.insertBefore(row,to>from?target.nextSibling:target);
      communityDraftOrder=allCommunityOrderRows().map(function(entry){
        return entry.dataset.communityOrderKey;
      });
      if(previousPublic!==catalogOrderRows().map(function(entry){
        return entry.dataset.communityOrderKey;
      }).join('\n'))communityPublicOrderDirty=true;
      updateCatalogArrows();
      if(communityOrderStatus)communityOrderStatus.textContent='Unsaved';
    }
    if(communityOrderSave)communityOrderSave.addEventListener('click',async function(event){
      event.preventDefault();event.stopPropagation();
      var rows=allCommunityOrderRows();
      if(!rows.length){say('No community playlists to reorder.');return;}
      var allIds=rows.map(function(row){return row.dataset.communityOrderKey;});
      var ids=catalogOrderRows().map(function(row){return row.dataset.communityOrderKey;});
      // Local copies and unpublished drafts stay private. They can be reordered
      // and remembered without the public publishing key.
      if(!communityPublicOrderDirty){
        try{
          localStorage.setItem(COMMUNITY_ORDER_STORAGE_KEY,JSON.stringify(allIds));
          communityDraftOrder=null;
          if(communityOrderStatus)communityOrderStatus.textContent='Saved here';
          say('Local Community playlist positions saved in this browser.');
        }catch(error){
          if(communityOrderStatus)communityOrderStatus.textContent='Not saved';
          say('Community order SAVE: '+error.message);
        }
        return;
      }
      if(communityServerRevision===null){
        // Offline/old Worker: retain the browser-only fallback explicitly.
        try{
          localStorage.setItem(COMMUNITY_ORDER_STORAGE_KEY,JSON.stringify(allIds));
          communityDraftOrder=null;
          communityPublicOrderDirty=false;
          if(communityOrderStatus)communityOrderStatus.textContent='Saved here only';
          say('Order saved in this browser only. Public SAVE requires the Community Worker.');
        }catch(error){
          if(communityOrderStatus)communityOrderStatus.textContent='Not saved';
          say('Local order save failed: '+error.message);
        }
        return;
      }
      var key=await askBetaKeyDialog('SAVE');
      if(!key)return;
      communityOrderSave.disabled=true;
      if(communityOrderStatus)communityOrderStatus.textContent='Saving...';
      try{
        var write=await fetch(communityWriteApi+'/catalog-order',{
          method:'PUT',headers:{'Content-Type':'application/json','X-Beta-Key':key},
          body:JSON.stringify({order:ids,expectedRevision:communityServerRevision})
        });
        var receipt=await write.json().catch(function(){return {};});
        if(!write.ok)throw Error(receipt.error||('Public SAVE rejected ('+write.status+').'));
        if(!receipt.saved||!Number.isSafeInteger(receipt.revision))
          throw Error('Server did not confirm the published order.');
        var verification=await fetch(communityWriteApi+'/catalog-order?check='+Date.now(),{cache:'no-store'});
        if(!verification.ok)throw Error('Could not verify the saved order. Reload before retrying.');
        var latest=await verification.json();
        if(!Array.isArray(latest.order)||latest.order.length!==ids.length||
           !ids.every(function(id,i){return latest.order[i]===id;}))
          throw Error('Published order differs from the requested order. Reload before retrying.');
        communityServerOrder=ids.slice();
        communityServerRevision=latest.revision;
        communityPublicOrderDirty=false;
        communityDraftOrder=null;
        try{
          if(allIds.some(function(id){return !isPublicCommunityKey(id);}))
            localStorage.setItem(COMMUNITY_ORDER_STORAGE_KEY,JSON.stringify(allIds));
          else localStorage.removeItem(COMMUNITY_ORDER_STORAGE_KEY);
        }catch(ignore){}
        if(communityOrderStatus)communityOrderStatus.textContent='Saved for everyone';
        say('Published Community order verified. Local draft positions remain private.');
      }catch(error){
        if(communityOrderStatus)communityOrderStatus.textContent='Not saved';
        say('Community order SAVE: '+error.message);
        // Leave moved rows visible; do not publish a partial or stale order.
      }finally{communityOrderSave.disabled=false;}
    });
    var localPanel=document.getElementById('sidListHolder');
    var hvscPanel=document.getElementById('ricoHvscPanel');
    var libraryPanel=document.getElementById('ricoLibraryPanel');
    var hvscItems=document.getElementById('ricoHvscItems');
    var hvscStatus=document.getElementById('ricoHvscStatus');
    var hvscLoad=document.getElementById('ricoHvscLoad');
    var hvscData=null;
    var hvscEntries=null;
    var hvscPending=null;
    var ricoRankCache={};
    var ricoRankEntries={};
    var ricoRankWaiting={};
    var ricoCurrentRank="hvsc";
    var ricoRankConfig={
      hvsc:{file:"community/playlists/hvsc-top-100-2000.json",title:"TOP 100 HVSC GAMES",description:"Historical HVSC community ranking (2000)."},
      demos:{file:"community/curation/csdb-demo-ranking-2026-11.json",sidFile:"community/playlists/csdb-top-100-demos.json",title:"TOP 100 CSDb DEMOS",description:"100 C64 demos from the CSDb rating list.",sourceUrl:"https://csdb.dk/toplist.php?type=release&subtype=%281%29"},
      onefile:{file:"community/curation/csdb-onefile-ranking-2026-11.json",sidFile:"community/playlists/csdb-top-100-onefile.json",title:"TOP 100 CSDb ONEFILE DEMOS",description:"100 one-file demos ranked separately by CSDb.",sourceUrl:"https://csdb.dk/toplist.php?type=release&subtype=%282%29"},
      groups:{file:"community/curation/csdb-groups-ranking-2026-11.json",sidFile:"community/playlists/csdb-top-100-groups.json",title:"TOP 100 CSDb GROUPS",description:"CSDb rating of groups, not a musicians ranking.",sourceUrl:"https://csdb.dk/toplist.php?type=group"},
      musicians:{file:"community/playlists/csdb-top-100-musicians.json",title:"TOP MUSICIANS",description:"100 selected SID musicians from the CSDb scene."}
    };
    var communityActive=false;
    var startupPlaylistPending=false; // TEST161: never start a playlist on page load.
    var startupPlaylistTimer=null;
    var selectedCommunityId='';
    var communityRequestNumber=0;
    // TEST161: preserve manually selected playlist order; no startup autoplay.
    var COMMUNITY_STARTUP_LAST_KEY='rico-community-startup-last-v1';
    function cancelStartupPlaylist() {
      startupPlaylistPending=false;
      if(startupPlaylistTimer!==null) {
        clearTimeout(startupPlaylistTimer);
        startupPlaylistTimer=null;
      }
    }
    cancelPendingCommunityStartup=cancelStartupPlaylist;
    function showCommunity(visible,tabName) {
      // TEST72: legacy USER LOCAL browser is retired; keep SID bytes only as
      // internal playback buffers. Never expose its duplicated playlist.
      if(!visible&&tabName==='local')visible=true;
      communityActive=visible;
      browserTab=visible?'community':(tabName==='local'?'local':'games');
      var dialog=document.getElementById('chooseSidDialog');
      if(dialog){
        dialog.classList.remove('rico-view-community','rico-view-games','rico-view-local','rico-view-hvsc','rico-view-library','rico-view-ours');
        dialog.classList.add('rico-view-'+browserTab);
      }
      if (communityPanel) communityPanel.style.display=visible?'block':'none';
      if (hvscPanel) hvscPanel.style.display='none';
      if (libraryPanel) libraryPanel.style.display='none';
      var ourPanel=document.getElementById('ricoOurCollectionPanel');
      if(ourPanel)ourPanel.style.display='none';
      if (localPanel) localPanel.style.display=visible?'none':'block';
      if(!visible) player.initFileSelection(); // Refresh the browser list only.
      refreshTabs();
      if (visible){
        // Sync drafts written in a separate tab before displaying COMMUNITY PLAYLISTS.
        restoreRemixes();
        renderRemixes();
        loadCommunityCatalog();
      }
    }
    // TEST71: closing Remix Creator leads directly to the unified COMMUNITY PLAYLISTS.
    window.ricoOpenCommunityFromRemix=function(){
      cancelStartupPlaylist();
      var manager=player.dialogManager;
      if(manager && manager.dialogShown!=='chooseSidDialog'){
        if(manager.dialogShown&&typeof manager.hideDialog==='function')
          manager.hideDialog(manager.dialogShown);
        manager.showDialog('chooseSidDialog');
      }
      // The original dialog manager restores its own LOCAL panel when opening.
      // Set the COMMUNITY view after showDialog so it cannot be overwritten.
      showCommunity(true);
    };
    // TEST74: any route opening Choose A SID starts from COMMUNITY PLAYLISTS,
    // rather than accidentally exposing the old LOCAL view through sidPlayer.
    (function secureChooseSidBrowser(){
      var manager=player.dialogManager;
      if(!manager||typeof manager.showDialog!=='function'||manager.ricoCommunityGuard)return;
      var original=manager.showDialog;
      manager.showDialog=function(id){
        var result=original.apply(this,arguments);
        if(id==='chooseSidDialog')showCommunity(true);
        return result;
      };
      manager.ricoCommunityGuard=true;
    })();
    // TEST131: CSDb ranks releases and groups; SID tunes are optional associations.
    // The three CSDb catalogs are independent of each other and of COMMUNITY PLAYLISTS.
    var ricoRankSongs={};
    // Preserve tab visibility when the user resizes the Choose A SID window.
    function layoutChooseSidTabs(){
      var info=document.getElementById('chooseSidInfo');
      var tabs=document.getElementById('ricoListTabs');
      var dialog=document.getElementById('chooseSidDialog');
      if(!info||!tabs||!dialog||!dialog.offsetWidth)return;
      var required=Math.max(94,Math.ceil(tabs.getBoundingClientRect().bottom-
        info.getBoundingClientRect().top+10));
      info.style.setProperty('height',required+'px','important');
      var top=Math.ceil(info.offsetTop+required+13)+'px';
      ['ricoHvscPanel','ricoCommunityPanel','sidListHolder','ricoLibraryPanel','ricoOurCollectionPanel']
        .forEach(function(id){
          var element=document.getElementById(id);
          if(element)element.style.setProperty('top',top,'important');
        });
    }
    if(typeof ResizeObserver!=='undefined'){
      var tabSizer=new ResizeObserver(layoutChooseSidTabs);
      var tabArea=document.getElementById('ricoListTabs');
      if(tabArea)tabSizer.observe(tabArea);
    }
    window.addEventListener('resize',layoutChooseSidTabs);
    function isCsdbCategory(kind){return kind==='demos'||kind==='onefile'||kind==='groups';}
    function normalizeRankTitle(value){
      return String(value||'').normalize('NFKD').toLowerCase()
        .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    }
    async function getRankData(kind){
      if(ricoRankCache[kind])return ricoRankCache[kind];
      if(ricoRankWaiting[kind])return ricoRankWaiting[kind];
      ricoRankWaiting[kind]=(async function(){
        var cfg=ricoRankConfig[kind];
        var response=await fetch(cfg.file+'?v=test131',{cache:'no-store'});
        if(!response.ok)throw Error('Ranking unavailable ('+response.status+').');
        var data=await response.json();
        if(isCsdbCategory(kind)){
          if(data.format!=='ricos-csdb-ranking'||!Array.isArray(data.items)||data.items.length!==100)
            throw Error('CSDb ranking incomplete.');
          ricoRankCache[kind]=data;
          ricoRankEntries[kind]=data.items;
          ricoRankSongs[kind]=[];
          if(cfg.sidFile){
            try {
              var tracksResponse=await fetch(cfg.sidFile+'?v=test131',{cache:'no-store'});
              if(tracksResponse.ok){
                var linked=await tracksResponse.json();
                if(linked&&linked.format==='ricos-sid-playlist'&&Array.isArray(linked.tracks)){
                  ricoRankSongs[kind]=linked.tracks;
                }
              }
            }catch(err){console.warn('CSDb SID associations unavailable',err);}
          }
        } else {
          if(data.format!=='ricos-sid-playlist'||!Array.isArray(data.tracks)||data.tracks.length!==100)
            throw Error('Top 100 incomplete.');
          var entries=validatedEntries(data);
          ricoRankCache[kind]=data;
          ricoRankEntries[kind]=entries;
        }
        return data;
      })();
      try{return await ricoRankWaiting[kind];}
      finally{delete ricoRankWaiting[kind];}
    }
    function rankSongsFor(kind,item){
      var key=normalizeRankTitle(item.title);
      return (ricoRankSongs[kind]||[]).filter(function(track){
        return normalizeRankTitle(kind==='groups'?track.group:track.demoTitle)===key;
      });
    }
    function displayRankIntro(kind){
      var intro=document.getElementById('ricoHvscIntro'),cfg=ricoRankConfig[kind];
      intro.textContent=cfg.description;
      if(isCsdbCategory(kind)){
        var link=document.createElement('a');
        link.href=cfg.sourceUrl;
        link.target='_blank';
        link.rel='noopener noreferrer';
        link.textContent='VER RANKING ACTUAL EN CSDb';
        link.className='rico-csdb-source';
        intro.appendChild(link);
      }
    }
    // TEST132: select a TOP to start the existing floating playlist immediately.
    async function showRank(kind){
      cancelStartupPlaylist();
      var cfg=ricoRankConfig[kind],buttonId={
        hvsc:'ricoHvscTab',demos:'ricoDemosTab',onefile:'ricoOnefileTab',
        groups:'ricoGroupsTab',musicians:'ricoMusiciansTab'
      }[kind],button=document.getElementById(buttonId);
      if(!cfg||!button)return;
      button.disabled=true;
      ricoCurrentRank=kind;
      // Prime browser audio during the real click, before any asynchronous fetch.
      {
        try{
          player.initWebAudio();
          if(player.audioContext&&player.audioContext.state==='suspended'){
            var resume=player.audioContext.resume();
            if(resume&&resume.catch)resume.catch(function(){});
          }
        }catch(err){console.warn('Browser audio requires PLAY',err);}
      }
      $('#ricoLiveStatus').text('Loading '+cfg.title+'...');
      try{
        var data=await getRankData(kind);
        if(isCsdbCategory(kind)){
          var items=data.items,tracks=[],trackRanks=[],trackCounts=[];
          items.forEach(function(item,rank){
            var linked=rankSongsFor(kind,item);
            trackCounts.push(linked.length);
            linked.forEach(function(song){tracks.push(song);trackRanks.push(rank);});
          });
          if(tracks.length){
            var ok=await playRankSongs(kind,tracks,cfg.title);
            if(!ok)return;
          }else{
            // If no linked SIDs exist, show every rank as a flat pending row.
            if(activeReferenceStream){activeReferenceStream.cancel();activeReferenceStream=null;}
            referenceSwitchSerial++;
            resetSoftTransition(true);
            player.isPlaying=false;player.isPaused=false;
            $('#playButton').text('Play');
            custom.length=0;
            if(!customActive)activate('custom');
            player.sidList=custom;player.sidListIndex=false;
            player.initFileSelection();
            loadedPlaylistTitle=cfg.title;loadedPlaylistCreator='CSDb ranking';
            nameEl.value=cfg.title;landingPlaylists=false;
          }
          activeCsdbRankDisplay={kind:kind,items:items,trackRanks:trackRanks,trackCounts:trackCounts};
          loadedRankedPlaylist=true;
          if(!tracks.length)$('#playButton,#nextSid,#prevSid').prop('disabled',true);
          showLivePlaylist(true);
          $('#ricoLiveStatus').text(tracks.length
            ? '100 '+(kind==='groups'?'groups':'demos')+' · '+tracks.length+' playable SID · '+
              trackCounts.filter(function(n){return n===0;}).length+' pending.'
            : '100 CSDb entries · SID associations pending. Playback unavailable.');
        }else{
          loadPlaylist(data,0,false,true);
          showLivePlaylist(true);
          $('#ricoLiveStatus').text(cfg.title+' · 100 SID loaded.');
        }
        browserTab=kind;refreshTabs();
        if(player.dialogManager&&player.dialogManager.dialogShown==='chooseSidDialog')
          player.dialogManager.hideDialog('chooseSidDialog');
      }catch(err){
        console.error('Could not start TOP ranking',kind,err);
        $('#ricoLiveStatus').text('Cannot load '+cfg.title+': '+err.message);
      }finally{button.disabled=false;}
    }
    function sceneAlias(value){
      var v=(value||'').trim();
      if(!v||v==='<?> ' .trim()||/^unknown(?: artist)?$/i.test(v))return '';
      var matches=[...v.matchAll(/\(([^()]+)\)/g)];
      if(matches.length)return matches[matches.length-1][1].trim();
      var parts=v.split(/\s*\/\s*/);
      if(parts.length>1&&/^[^\s,&/]+$/.test(parts[0]))return parts[0];
      if(/^[^\s,&]+$/.test(v))return v;
      return '';
    }
    async function playRankSongs(kind,tracks,title){
      if(!Array.isArray(tracks)||!tracks.length)return;
      var cfg=ricoRankConfig[kind],version=tracks[0].sidBase64?1:2;
      var selection={format:'ricos-sid-playlist',version:version,
        name:title||cfg.title,createdBy:'CSDb / HVSC',tracks:tracks};
      hvscStatus.textContent='Loading SID audio...';
      try{
        if(version===1)loadPlaylist(selection,0,false,true);
        else await loadStoredPlaylist(selection,false);
        hvscStatus.textContent='SID playback ready.';
        return true;
      }catch(err){
        hvscStatus.textContent='SID unavailable: '+err.message;
        $('#ricoLiveStatus').text('SID unavailable: '+err.message);
        return false;
      }
    }
    function renderCsdbRankRows(kind){
      var data=ricoRankCache[kind],items=data.items;
      var found=0,mapped=0;
      hvscItems.textContent='';
      var fragment=document.createDocumentFragment();
      items.forEach(function(item,index){
        var tracks=rankSongsFor(kind,item);
        if(tracks.length){found++;mapped+=tracks.length;}
        var wrapper=document.createElement('div');wrapper.className='rico-csdb-entry';
        var button=document.createElement('button');button.type='button';
        button.className='rico-csdb-rank-head';
        var rank=document.createElement('span');rank.textContent='#'+(index+1);
        var name=document.createElement('span');name.className='rico-csdb-name';
        name.textContent=item.title;
        var group=document.createElement('span');group.className='rico-csdb-credit';
        group.textContent=kind==='groups'?'CSDb group':(item.group||'');
        var count=document.createElement('span');count.className='rico-csdb-count';
        count.textContent=tracks.length?(tracks.length+' SID'):'SID PENDING';
        button.appendChild(rank);button.appendChild(name);button.appendChild(group);
        button.appendChild(count);
        button.setAttribute('aria-expanded','false');
        var details=document.createElement('div');details.className='rico-csdb-detail';
        details.hidden=true;
        button.addEventListener('click',function(){
          details.hidden=!details.hidden;
          button.setAttribute('aria-expanded',String(!details.hidden));
        });
        if(tracks.length){
          tracks.forEach(function(track){
            var row=document.createElement('div');row.className='rico-csdb-track';
            var label=document.createElement('span');
            label.textContent=track.title||String(track.file||'SID').split('/').pop().replace(/_/g,' ');
            var play=document.createElement('button');play.type='button';play.textContent='PLAY SID';
            play.addEventListener('click',function(){playRankSongs(kind,[track],item.title+' — SID');});
            row.appendChild(label);row.appendChild(play);details.appendChild(row);
          });
        } else {
          details.textContent='SID association pending in HVSC FIX. The CSDb ranking entry is preserved.';
        }
        wrapper.appendChild(button);wrapper.appendChild(details);fragment.appendChild(wrapper);
      });
      hvscItems.appendChild(fragment);
      hvscStatus.textContent='100 '+(kind==='groups'?'groups':'demos')+
        ' · '+found+' entries with SID · '+mapped+' SID linked · '+
        (100-found)+' pending. Rankings are a stored snapshot; check CSDb for live order.';
      hvscLoad.disabled=!mapped;
    }
    function renderRankRows(kind){
      if(isCsdbCategory(kind)){renderCsdbRankRows(kind);return;}
      var data=ricoRankCache[kind],entries=ricoRankEntries[kind];
      if(!data||!entries)return;
      hvscItems.textContent='';hvscStatus.textContent='100 SID · Click a song or press LOAD.';
      entries.forEach(function(item,index){
        var track=data.tracks[index]||{};
        var alias=formatArtistCredit(item.author||'Unknown artist');
        var name=item.name||item.file;
        var row=document.createElement('button');row.type='button';
        row.className='rico-hvsc-row';
        var nr=document.createElement('span');nr.className='rico-hvsc-rank';nr.textContent=index+1;
        var title=document.createElement('span');title.className='rico-hvsc-title';title.textContent=name;
        var who=document.createElement('span');who.className='rico-hvsc-artist';who.textContent=alias;
        row.appendChild(nr);row.appendChild(title);row.appendChild(who);
        row.addEventListener('click',function(){loadPlaylist(data,index,false,true);});
        hvscItems.appendChild(row);
      });
    }
    if(hvscLoad)hvscLoad.addEventListener('click',async function(){
      var kind=ricoCurrentRank;
      if(isCsdbCategory(kind)){
        var tracks=[];
        ricoRankCache[kind].items.forEach(function(item){
          rankSongsFor(kind,item).forEach(function(t){tracks.push(t);});
        });
        await playRankSongs(kind,tracks,ricoRankConfig[kind].title+' — IDENTIFIED SID');
        return;
      }
      hvscLoad.disabled=true;
      try{loadPlaylist(await getRankData(kind),0,false,true);}
      catch(e){hvscStatus.textContent='Could not load playlist: '+e.message;}
      finally{hvscLoad.disabled=false;}
    });
    [['ricoHvscTab','hvsc'],['ricoDemosTab','demos'],['ricoOnefileTab','onefile'],
     ['ricoGroupsTab','groups'],['ricoMusiciansTab','musicians']].forEach(function(pair){
      var button=document.getElementById(pair[0]);
      if(button)button.addEventListener('click',function(){showRank(pair[1]);});
    });

    // TEST62: public playlist metadata on D1; static curated entries stay first.
    var communityApiBase='https://ricos-sid-community.serigrafiamdp.workers.dev';
    // TEST120: retain one compact EDIT button per published playlist.
    // Route metadata and song edits through a theme-colored choice dialog.
    function chooseCommunityEditMode(item){
      return new Promise(function(resolve){
        var cover=document.createElement('div');cover.className='rico-beta-overlay';
        var dialog=document.createElement('div');dialog.className='rico-beta-dialog';
        dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
        dialog.setAttribute('aria-label','Edit playlist '+item.title);
        var heading=document.createElement('strong');heading.textContent='EDIT PLAYLIST';
        var info=document.createElement('p');info.textContent='Choose what you want to edit in '+item.title+'.';
        var actions=document.createElement('div');actions.className='rico-beta-actions';
        function action(label,value){
          var button=document.createElement('button');
          button.type='button';button.textContent=label;
          button.addEventListener('click',function(event){
            event.preventDefault();event.stopPropagation();finish(value);
          });
          actions.appendChild(button);return button;
        }
        var songs=action('SONGS','songs');
        action('NAME / CREATOR','metadata');action('CANCEL',null);
        dialog.appendChild(heading);dialog.appendChild(info);dialog.appendChild(actions);
        cover.appendChild(dialog);document.body.appendChild(cover);
        var done=false;
        function finish(value){
          if(done)return;done=true;
          document.removeEventListener('keydown',onKey,true);
          cover.remove();resolve(value);
        }
        function onKey(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(null);}}
        ['mousedown','mouseup','pointerdown','pointerup','click','dblclick','keydown','keyup','keypress'].forEach(function(type){
          dialog.addEventListener(type,function(event){event.stopPropagation();});
        });
        cover.addEventListener('click',function(event){if(event.target===cover)finish(null);});
        document.addEventListener('keydown',onKey,true);
        songs.focus();
      });
    }
    // TEST65: metadata update and delete never act on static curated JSON.
    function communityAuthorizeDialog(action,item){
      return new Promise(function(resolve){
        var cover=document.createElement('div');cover.className='rico-beta-overlay';
        var form=document.createElement('form');form.className='rico-beta-dialog';
        form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');
        form.setAttribute('aria-label',action==='delete'?'Authorize playlist deletion':'Authorize playlist edit');
        var title=document.createElement('strong');title.textContent=action==='delete'?'DELETE PLAYLIST':'EDIT PLAYLIST';
        var msg=document.createElement('p');
        msg.textContent=action==='delete'?
          'Deleting this playlist is permanent and affects everyone. Enter the beta key to authorize.':
          'Change playlist name and creator, then enter the beta key to authorize.';
        form.appendChild(title);form.appendChild(msg);
        var nameInput=null,creatorInput=null;
        function field(value,max,label){
          var input=document.createElement('input');input.type='text';input.value=value;
          input.maxLength=max;input.setAttribute('aria-label',label);input.placeholder=label;
          input.style.marginBottom='8px';form.appendChild(input);return input;
        }
        if(action==='edit'){
          nameInput=field(item.title,100,'Playlist name');
          creatorInput=field(item.createdBy||'',60,'Playlist by');
        }
        var key=document.createElement('input');key.type='password';key.autocomplete='off';
        key.placeholder='BETA KEY';key.setAttribute('aria-label','Beta key');key.required=true;
        form.appendChild(key);
        var controls=document.createElement('div');controls.className='rico-beta-actions';
        var cancel=document.createElement('button');cancel.type='button';cancel.textContent='CANCEL';
        var submit=document.createElement('button');submit.type='submit';submit.textContent='AUTHORIZE';
        controls.appendChild(cancel);controls.appendChild(submit);form.appendChild(controls);
        cover.appendChild(form);document.body.appendChild(cover);
        var done=false;
        function finish(value){if(done)return;done=true;document.removeEventListener('keydown',onKey,true);cover.remove();resolve(value);}
        function onKey(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(null);}}
        ['mousedown','mouseup','pointerdown','pointerup','click','dblclick','keydown','keyup','keypress'].forEach(function(type){
          form.addEventListener(type,function(event){event.stopPropagation();});
        });
        form.addEventListener('submit',function(event){
          event.preventDefault();event.stopPropagation();
          if(action==='edit'&&(!nameInput.value.trim()||!creatorInput.value.trim()))return;
          finish({key:key.value,name:nameInput?nameInput.value.trim():null,creator:creatorInput?creatorInput.value.trim():null});
        });
        cancel.addEventListener('click',function(){finish(null);});
        cover.addEventListener('click',function(event){if(event.target===cover)finish(null);});
        document.addEventListener('keydown',onKey,true);(nameInput||key).focus();
      });
    }
    window.ricoRefreshCommunityCatalog=loadCommunityCatalog;
    // TEST73: local imported V1 playlists join the same Community list.
    // They are private IndexedDB records, never sent to D1 or HVSC.
    async function renderLocalImportedCommunityRows(){
      if(!communityItems)return;
      var rows=await dbCall('readonly',function(store){return store.getAll();});
      Array.prototype.forEach.call(
        communityItems.querySelectorAll('.rico-community-import-row'),
        function(node){node.remove();}
      );
      var fragment=document.createDocumentFragment();
      rows.filter(function(d){return d&&d.format==='ricos-sid-playlist'&&d.version===1&&
        Array.isArray(d.tracks);}).sort(function(a,b){
          return String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''));
        }).forEach(function(item){
        var row=document.createElement('div');
        row.className='rico-community-row rico-community-import-row';
        var label=document.createElement('span');label.className='rico-community-label';
        label.textContent=item.name+' — Playlist by '+(item.createdBy||'Unknown')+
          ' · '+item.tracks.length+' SID';
        row.appendChild(label);
        addPrivateCommunityArrows(row,'local:'+item.id);
        function action(name,callback,disabled){
          var button=document.createElement('button');button.type='button';
          button.textContent=name;button.disabled=!!disabled;
          button.addEventListener('click',function(event){
            event.stopPropagation();if(!button.disabled)callback();
          });
          row.appendChild(button);
          return button;
        }
        action('PLAY',async function(){
          try{
            var stored=await dbCall('readonly',function(store){return store.get(item.id);});
            if(!stored)throw Error('Local playlist no longer available.');
            currentId=item.id;
            await loadStoredPlaylist(stored,true);
            say('Loaded locally: '+stored.name);
            if(player.dialogManager&&player.dialogManager.dialogShown==='chooseSidDialog')
              player.dialogManager.hideDialog('chooseSidDialog');
          }catch(error){say(error.message||'Could not load local playlist.');}
        },false);
        var editLocal=action('EDIT',async function(){
          if(editLocal.disabled)return;
          editLocal.disabled=true;
          try{await editLocalCommunityItem(item);}
          catch(error){say('EDIT: '+error.message);}
          finally{editLocal.disabled=false;}
        },false);
        editLocal.title='Edit name and creator of this saved local list.';
        action('DELETE',async function(){
          if(!window.confirm('Delete local playlist '+item.name+' from this browser?'))return;
          try{
            await dbCall('readwrite',function(store){return store.delete(item.id);});
            if(currentId===item.id)currentId='';
            await refreshSaved();
            say('Local playlist deleted: '+item.name);
          }catch(error){say(error.message||'Could not delete local playlist.');}
        },false);
        // TEST83: publish only after a capabilities check confirms R2 is ready.
        var publish=action('PUBLISH',async function(){
          if(publish.disabled)return;
          publish.disabled=true;
          try{
            var capResponse=await fetch(communityWriteApi+'/capabilities',{cache:'no-store'});
            if(!capResponse.ok)throw Error('Publishing service unavailable.');
            var cap=await capResponse.json();
            if(!cap.sidUploadsEnabled)
              throw Error('SID file publishing is not active on Cloudflare yet. Local copy is safe.');
            var stored=await dbCall('readonly',function(store){return store.get(item.id);});
            if(!stored||!Array.isArray(stored.tracks)||!stored.tracks.length)
              throw Error('Local collection missing.');
            var maxSid=Number(cap.sidUploadLimit)||15;
            if(stored.tracks.length>maxSid)throw Error('Max '+maxSid+' SID per publication with the current storage provider.');
            var creator=String(stored.createdBy||'').trim();
            if(!creator||creator==='Unknown'){
              creator=window.prompt('Collection creator / uploader:', '')||'';
              if(!creator.trim())return;
            }
            if(!window.confirm('Publish '+stored.name+' ('+stored.tracks.length+
              ' SID) to OUR COLLECTION for all users? Only publish files you have permission to share.'))return;
            var key=await askBetaKeyDialog('PUBLISH');
            if(!key)return;
            var response=await fetch(communityWriteApi+'/collections',{
              method:'POST',headers:{'Content-Type':'application/json','X-Beta-Key':key},
              body:JSON.stringify({format:'ricos-sid-upload',version:1,
                name:stored.name,createdBy:creator.trim(),tracks:stored.tracks.map(function(t){
                  return {file:t.file,sidBase64:t.sidBase64};
                })})
            });
            var outcome=await response.json();
            if(!response.ok)throw Error(outcome.error||'Collection upload failed');
            say('Published '+stored.name+' · '+outcome.tracks+' SID to OUR COLLECTION.');
            window.alert('Published '+stored.name+' to OUR COLLECTION. Your local copy is preserved.');
          }catch(error){say('PUBLISH: '+error.message);window.alert(error.message);}
          finally{publish.disabled=false;}
        },false);
        publish.title='Publish imported SID collection with beta key once Cloudflare SID storage is enabled.';
        fragment.appendChild(row);
      });
      // Newly saved local imports are shown above published catalogs.
      communityItems.insertBefore(fragment,communityItems.firstChild);
      restorePrivateCommunityPositions();
      updateCatalogArrows();
    }

    // TEST89: consistent EDIT controls. Static GitHub catalogs must never be
    // mutated through the D1 API; opening EDIT creates a private editable copy.
    async function editLocalCommunityItem(item){
      var original=await dbCall('readonly',function(store){return store.get(item.id);});
      if(!original)throw Error('Local playlist no longer available.');
      var name=window.prompt('EDIT LOCAL PLAYLIST — Name:',original.name);
      if(name===null)return;
      name=name.trim().slice(0,100);
      if(!name)throw Error('Playlist name cannot be empty.');
      var creator=window.prompt('EDIT LOCAL PLAYLIST — Playlist by:',original.createdBy||'Unknown');
      if(creator===null)return;
      creator=creator.trim().slice(0,60);
      if(!creator)throw Error('Playlist creator cannot be empty.');
      original.name=name;original.createdBy=creator;
      original.updatedAt=new Date().toISOString();
      await dbCall('readwrite',function(store){return store.put(original);});
      await refreshSaved();
      await renderLocalImportedCommunityRows();
      say('Edited local playlist: '+name+'. Public catalogs unchanged.');
    }
    async function editStaticCommunityItem(item){
      var response=await fetch(item.file,{cache:'no-store'});
      if(!response.ok)throw Error('Could not open curated playlist.');
      var source=await response.json();
      if(!source||source.format!=='ricos-sid-playlist'||!Array.isArray(source.tracks))
        throw Error('Unsupported curated playlist.');
      if(source.version===2 && source.tracks.every(function(t){return t&&t.pack&&t.file;})){
        if(remixDrafts.length>=25)throw Error('Maximum 25 Remix drafts.');
        remixCounter++;
        var draft={id:'remix-'+Date.now()+'-'+remixCounter,
          name:('REMIX '+(source.name||item.title)).slice(0,100),creator:'',
          tracks:source.tracks.map(function(t){return {pack:t.pack,file:t.file,title:t.title||t.file,artist:t.artist||''};})};
        remixDrafts.push(draft);remixTarget=draft.id;remixOpen=true;
        preserveRemixes();renderRemixes();
        remixNotice('Editable REMIX copy created. The original community playlist stays unchanged.');
        return;
      }
      if(source.version!==1)throw Error('This playlist format cannot be edited here.');
      validatedEntries(source); // Validate every SID before saving a local copy.
      var copyName=window.prompt('EDIT — Create a local copy (original remains unchanged):',
        (source.name||item.title)+' - MY EDIT');
      if(copyName===null)return;
      copyName=copyName.trim().slice(0,100);
      if(!copyName)throw Error('Enter a name for the editable copy.');
      var author=window.prompt('Playlist by:',source.createdBy||'RICO');
      if(author===null)return;
      author=author.trim().slice(0,60);
      if(!author)throw Error('Enter a playlist creator.');
      var saved={format:'ricos-sid-playlist',version:1,
        id:'list-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),
        name:copyName,createdBy:author,createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),tracks:source.tracks.map(function(t){
          return {file:t.file,sidBase64:t.sidBase64};
        })};
      await dbCall('readwrite',function(store){return store.put(saved);});
      await refreshSaved();
      say('Editable local copy saved: '+copyName+'. Original community list unchanged.');
    }
    window.ricoRenderLocalImportedRows=renderLocalImportedCommunityRows;
    // In-progress remix rows visually share the public community list.
    // They exist only within this visitor's browser session until PUBLISH succeeds.
    function renderRemixCommunityRows(){
      if(!communityItems)return;
      // TEST144: re-use EDIT as REPUBLISH on the published row only when +
      // has left changes pending; do not add another button or duplicate a list.
      Array.prototype.forEach.call(communityItems.querySelectorAll('.rico-community-catalog-row'),function(row){
        var edit=row.querySelector('.rico-community-edit');
        if(!edit)return;
        var key=row.dataset.communityOrderKey||'';
        var id=key.indexOf('remote:')===0?key.slice(7):'';
        var pending=id&&remixDrafts.find(function(d){
          return d.remoteEditId===id&&Array.isArray(d.baseTracks)&&
            remixTrackKeys(d.tracks)!==remixTrackKeys(d.baseTracks);
        });
        edit.textContent=pending?'REPUBLISH':'EDIT';
        var description=row.querySelector('.rico-community-description');
        if(description){
          var original=row.dataset.communityBaseDescription||description.textContent;
          description.textContent=pending
            ? original.replace(/ · \d+ SID$/, ' · '+pending.tracks.length+' SID')
            : original;
        }
      });
      Array.prototype.forEach.call(communityItems.querySelectorAll('.rico-community-remix-row'),function(el){el.remove();});
      if(!remixDrafts.length)return;
      var fragment=document.createDocumentFragment();
      remixDrafts.slice().reverse().filter(function(d){return !d.remoteEditId;}).forEach(function(d){
        var row=document.createElement('div');row.className='rico-community-row rico-community-remix-row';
        var label=document.createElement('span');label.className='rico-community-label';
        label.textContent=d.name+' — Playlist by '+(d.creator||'Unknown')+' · '+d.tracks.length+' SID';
        row.appendChild(label);
        addPrivateCommunityArrows(row,'remix:'+d.id);
        function action(name,callback,disabled){
          var button=document.createElement('button');button.type='button';button.textContent=name;
          button.disabled=!!disabled;button.addEventListener('click',function(e){e.stopPropagation();callback();});
          row.appendChild(button);
        }
        action('PLAY',function(){window.ricoPlayRemixDraftFromCommunity(d.id);},!d.tracks.length);
        action('EDIT',function(){window.ricoOpenRemixDraft(d.id);},false);
        action('DELETE',function(){
          if(!window.confirm('Delete unpublished REMIX '+d.name+' from this browser? Public playlists remain unchanged.'))return;
          remixDrafts=remixDrafts.filter(function(x){return x.id!==d.id;});
          if(remixTarget===d.id)remixTarget=remixDrafts.length?remixDrafts[0].id:'';
          preserveRemixes();renderRemixes();
          say('Deleted local REMIX draft: '+d.name+'.');
        },false);
        action('PUBLISH',function(){window.ricoPublishRemixDraft(d.id);},!d.tracks.length||remixBusy);
        fragment.appendChild(row);
      });
      communityItems.appendChild(fragment);
      restorePrivateCommunityPositions();
      updateCatalogArrows();
    }
    window.ricoRenderRemixCommunityRows=renderRemixCommunityRows;
    async function loadCommunityCatalog() {
      if (!communityItems) return;
      var requestNumber=++communityRequestNumber;
      communityItems.textContent='Loading community playlists...';
      try {
        var response=await fetch('community/playlists.json',{cache:'no-store'});
        if(!response.ok) throw Error('Catalog unavailable ('+response.status+').');
        var catalog=await response.json();
        if (!catalog || catalog.format!=='ricos-community-catalog' || catalog.version!==1 ||
            !Array.isArray(catalog.playlists)) throw Error('Unsupported community catalog.');
        // Append public user playlists after manually curated playlists.
        try{
          var remoteResponse=await fetch(communityApiBase+'/playlists',{cache:'no-store'});
          if(!remoteResponse.ok)throw Error('Public service returned '+remoteResponse.status);
          var remoteCatalog=await remoteResponse.json();
          if(remoteCatalog&&Array.isArray(remoteCatalog.playlists)){
            // D1 /playlists currently returns created_at ASC (oldest first).
            // Display newest first without needing to redeploy the Worker.
            var newestPublished=remoteCatalog.playlists.slice().reverse()
              .filter(function(entry){
                return entry&&typeof entry.title==='string'&&
                  typeof entry.id==='string'&&/^[a-z0-9-]{12,48}$/i.test(entry.id);
              }).map(function(entry){
                return {
                  id:entry.id,title:entry.title,createdBy:entry.createdBy||'Unknown',
                  tracks:Number(entry.tracks)||0,remoteId:entry.id
                };
              });
            // TEST110: Once a matching D1 playlist exists, show the editable
            // copy instead of an identically named stale GitHub static row.
            var adopted=newestPublished.some(function(t){
              return t.title==='OLD SID COLLECTION RICO'&&t.createdBy==='RICO';
            });
            if(adopted)catalog.playlists=catalog.playlists.filter(function(t){
              return t.id!=='old-sid-collection-rico';
            });
            // TEST162: once the 20-track public Los Pat Moritas list has been
            // successfully expanded to 34, remove the obsolete embedded/static
            // copy from the visible Community catalog. Never hide it before then.
            var lpmComplete=newestPublished.some(function(t){
              return t.remoteId==='8cf5e857-19d3-48cf-a154-53f046ee65e2'&&
                Number(t.tracks)>=34;
            });
            if(lpmComplete)catalog.playlists=catalog.playlists.filter(function(t){
              return t.id!=='los-pat-moritas';
            });
            // Keep remaining historical GitHub playlists after published user playlists.
            publishedRemixChoices=newestPublished.map(function(item){
              return {id:item.remoteId,title:item.title,tracks:item.tracks};
            });
            catalog.playlists=newestPublished.concat(catalog.playlists);
          }
        }catch(remoteError){
          console.warn('Public user playlists unavailable, showing curated list only',remoteError);
        }
        if(requestNumber!==communityRequestNumber) return;
        await readCommunityServerOrder();
        if(requestNumber!==communityRequestNumber) return;
        catalog.playlists=sortCommunityPlaylists(catalog.playlists);
        communityItems.textContent='';
        renderRemixCommunityRows();
        if(!catalog.playlists.length && !remixDrafts.length) {
          await renderLocalImportedCommunityRows();
          if(communityItems.children.length)return;
          cancelStartupPlaylist();
          communityItems.textContent='No additional published playlists available.';
          return;
        }
        var startupPlayable=[];
        catalog.playlists.forEach(function(item){
          if(!item || typeof item.title!=='string' ||
             !(item.remoteId ? /^[a-z0-9-]{12,48}$/i.test(item.remoteId) :
               typeof item.file==='string' &&
               /^community\/playlists\/[a-zA-Z0-9_-]+\.json$/.test(item.file))) return;
          var row=document.createElement('div');
          row.className='rico-community-row rico-community-catalog-row';
          row.dataset.communityOrderKey=communityItemOrderKey(item);
          row.tabIndex=0;
          row.setAttribute('role','button');
          row.setAttribute('aria-label','Load playlist '+item.title);
          // TEST36: keep stars inside the label block, preventing flex clipping.
          // Curator credit comes from createdBy; individual SID artists stay unchanged.
          var label=document.createElement('span');
          label.className='rico-community-label';
          var description=document.createElement('span');
          description.className='rico-community-description';
          description.textContent=item.title+' — Playlist by '+(item.createdBy||'Unknown')+' · '+(Number(item.tracks)||0)+' SID';
          row.dataset.communityBaseDescription=description.textContent;
          var stars=document.createElement('span');
          stars.className='rico-community-stars';
          stars.textContent='☆☆☆';
          stars.setAttribute('aria-label','Three sample stars; voting is not yet available');
          label.appendChild(description);
          label.appendChild(stars);
          var orderButtons=document.createElement('span');
          orderButtons.className='rico-community-order-controls';
          var moveUp=document.createElement('button');
          moveUp.type='button';moveUp.className='rico-community-up';moveUp.textContent='↑';
          var moveDown=document.createElement('button');
          moveDown.type='button';moveDown.className='rico-community-down';moveDown.textContent='↓';
          bindReorderArrows($(moveUp),-1,function(step){moveCommunityRow(row,step);});
          bindReorderArrows($(moveDown),1,function(step){moveCommunityRow(row,step);});
          orderButtons.appendChild(moveUp);orderButtons.appendChild(moveDown);
          label.appendChild(description);
          label.appendChild(stars);
          var button=document.createElement('button');
          button.type='button';button.textContent='PLAY';
          row.appendChild(label);row.appendChild(orderButtons);row.appendChild(button);
          if(item.remoteId){
            var editButton=document.createElement('button');
            editButton.type='button';editButton.textContent='EDIT';
            editButton.className='rico-community-edit';
            var deleteButton=document.createElement('button');
            deleteButton.type='button';deleteButton.textContent='DELETE';
            editButton.addEventListener('click',async function(event){
              event.stopPropagation();
              if(editButton.disabled)return;
              editButton.disabled=true;
              try{
                var pending=remixDrafts.find(function(d){
                  return d.remoteEditId===item.remoteId&&Array.isArray(d.baseTracks)&&
                    remixTrackKeys(d.tracks)!==remixTrackKeys(d.baseTracks);
                });
                if(pending){
                  await publishRemix(pending.id);
                  if(communityOrderStatus)communityOrderStatus.textContent=
                    remixDrafts.some(function(d){return d.id===pending.id;})
                      ? $('#ricoRemixStatus').text() : 'REPUBLISH OK';
                  return;
                }
                var mode=await chooseCommunityEditMode(item);
                if(mode==='songs'){
                  // TEST163: editing a published playlist prepares a private
                  // draft, not a playback session. Keep COMMUNITY PLAYLISTS
                  // visible so its updated SID count and REPUBLISH are usable.
                  await beginPublishedEdit(item.remoteId);
                  return;
                }
                if(mode!=='metadata')return;
                var auth=await communityAuthorizeDialog('edit',item);
                if(!auth)return;
                await ensureBetaServerReady();
                var capabilitiesResponse=await fetch(communityApiBase+'/capabilities',{cache:'no-store'});
                var capabilities=await capabilitiesResponse.json();
                if(capabilities.editMode!=='metadata-and-delete')throw Error('New Cloudflare Worker not deployed. No changes made.');
                var resp=await fetch(communityApiBase+'/playlists/'+encodeURIComponent(item.remoteId),{
                  method:'PATCH',headers:{'Content-Type':'application/json','X-Beta-Key':auth.key},
                  body:JSON.stringify({name:auth.name,createdBy:auth.creator})
                });
                var result=await resp.json();
                if(!resp.ok)throw Error(result.error||'Could not edit playlist.');
                if(activePublicPlaylist&&activePublicPlaylist.remoteId===item.remoteId){
                  activePublicPlaylist.name=result.title;activePublicPlaylist.createdBy=result.createdBy;
                  loadedPlaylistTitle=result.title;loadedPlaylistCreator=result.createdBy;renderLivePlaylist();
                }
                await loadCommunityCatalog();say('Playlist metadata updated: '+result.title);
              }catch(error){
                say('EDIT: '+error.message);
                if(communityOrderStatus)communityOrderStatus.textContent=error.message;
              }
              finally{editButton.disabled=false;}
            });
            deleteButton.addEventListener('click',async function(event){
              event.stopPropagation();
              var auth=await communityAuthorizeDialog('delete',item);
              if(!auth)return;
              if(!window.confirm('DELETE '+item.title+' permanently for everyone? This cannot be undone.'))return;
              deleteButton.disabled=true;
              try{
                await ensureBetaServerReady();
                var capabilitiesResponse=await fetch(communityApiBase+'/capabilities',{cache:'no-store'});
                var capabilities=await capabilitiesResponse.json();
                if(capabilities.editMode!=='metadata-and-delete')throw Error('New Cloudflare Worker not deployed. No changes made.');
                var resp=await fetch(communityApiBase+'/playlists/'+encodeURIComponent(item.remoteId),{
                  method:'DELETE',headers:{'X-Beta-Key':auth.key}
                });
                var result=await resp.json();
                if(!resp.ok)throw Error(result.error||'Could not delete playlist.');
                if(activePublicPlaylist&&activePublicPlaylist.remoteId===item.remoteId){
                  activePublicPlaylist=null;renderLivePlaylist();
                }
                if(selectedCommunityId===item.remoteId)selectedCommunityId='';
                await loadCommunityCatalog();say('Public playlist deleted: '+item.title);
              }catch(error){say('Delete failed: '+error.message);}
              finally{deleteButton.disabled=false;}
            });
            row.appendChild(editButton);row.appendChild(deleteButton);
          }else{
            var editCurated=document.createElement('button');
            editCurated.type='button';editCurated.textContent='EDIT';
            editCurated.title='Create an editable personal copy. Original curated playlist remains unchanged.';
            editCurated.addEventListener('click',async function(event){
              event.stopPropagation();
              editCurated.disabled=true;
              try{await editStaticCommunityItem(item);}
              catch(error){say('EDIT: '+error.message);}
              finally{editCurated.disabled=false;}
            });
            row.appendChild(editCurated);
          }
          communityItems.appendChild(row);
          if(item.id && item.id===selectedCommunityId) row.classList.add('rico-community-selected');
          async function openPlaylist(isStartup) {
            if(!isStartup) cancelStartupPlaylist();
            button.disabled=true;
            row.setAttribute('aria-busy','true');
            try {
              var result=await fetch(item.remoteId ? communityApiBase+'/playlists/'+encodeURIComponent(item.remoteId) : item.file,{cache:'no-store'});
              if(!result.ok) throw Error('Playlist unavailable.');
              var body=await result.text();
              if(body.length>90*1024*1024) throw Error('Playlist too large.');
              var data=JSON.parse(body);
              // A user's explicit PLAY opens the locally edited version of the
              // same published playlist, so + additions are visible before REPUBLISH.
              var pending=!isStartup&&item.remoteId?remixDrafts.find(function(d){
                return d.remoteEditId===item.remoteId&&Array.isArray(d.baseTracks)&&
                  remixTrackKeys(d.tracks)!==remixTrackKeys(d.baseTracks);
              }):null;
              var chosen=pending?{
                format:'ricos-sid-playlist',version:2,
                name:pending.name,createdBy:pending.creator,
                tracks:pending.tracks.map(remixCanonicalRef)
              }:data;
              // Ignore a late auto-load if the visitor picked a different source.
              if(isStartup && !startupPlaylistPending) return;
              if(isStartup) cancelStartupPlaylist();
              await loadStoredPlaylist(chosen,false,item.remoteId||null); // Only published LFT may use TEST173.
              activeCuratedCatalogId=!item.remoteId&&item.id==='old-sid-collection-rico'
                ? item.id:null;
              activeRemixDraftId=pending?pending.id:null;
              activePublicPlaylist=!pending&&item.remoteId&&data.version===2?{
                remoteId:item.remoteId,name:data.name,createdBy:data.createdBy,
                tracks:data.tracks.map(remixCanonicalRef),
                originalCount:data.tracks.length,dirtyOrder:false
              }:null;
              renderLivePlaylist();
              selectedCommunityId=item.id||item.file;
              if(isStartup){
                // Save only successful automatic selections, so a failed load
                // never consumes a rotation slot.
                try{localStorage.setItem(COMMUNITY_STARTUP_LAST_KEY,communityItemOrderKey(item));}
                catch(storageError){console.warn('Community startup rotation cannot be saved',storageError);}
              }
              Array.prototype.forEach.call(communityItems.querySelectorAll('.rico-community-row'),function(other){
                other.classList.toggle('rico-community-selected',other===row);
              });
              if(isStartup) {
                // TEST51: AUTO loads music silently, without opening Choose A SID.
                // Keep RICO'S PLAYLISTS selected for the next explicit browser opening.
                showCommunity(true);
                if(player.dialogManager && player.dialogManager.dialogShown==='chooseSidDialog')
                  player.dialogManager.hideDialog('chooseSidDialog');
                // TEST25: actively attempt to start Web Audio at the 30-second mark.
                // Modern browsers can still require a real user gesture.
                if(!player.audioContext) player.initWebAudio();
                if(player.audioContext && player.audioContext.state === 'suspended') {
                  var resumed=player.audioContext.resume();
                  if(resumed && resumed.then) resumed.then(function() {
                    say('Playing first SID: '+data.name);
                  }).catch(function(error) {
                    console.warn('Automatic audio blocked by browser:',error);
                    say('First SID loaded. Click PLAY to enable audio in this browser.');
                  });
                } else {
                  say('Playing first SID: '+data.name);
                }
                if(player.audioContext && player.audioContext.state === 'suspended') {
                  // resume() may remain pending until the user clicks; make the fallback visible.
                  say('First SID loaded. If there is no sound, click PLAY once to enable audio.');
                }
              } else {
                showCommunity(false,'local');
                say('Community playlist loaded: '+data.name);
              }
            } catch(error) {
              communityItems.setAttribute('data-error',error.message);
              say(error.message);
              if(isStartup) cancelStartupPlaylist();
            } finally {
              button.disabled=false;
              row.removeAttribute('aria-busy');
            }
          }
          row.addEventListener('click',function(){openPlaylist(false);});
          row.addEventListener('keydown',function(event){
            if(event.target!==row)return; // TEST116: keyboard actions on arrow buttons must not start playback.
            if(event.key==='Enter'||event.key===' ') {
              event.preventDefault();
              openPlaylist(false);
            }
          });
          button.addEventListener('click',function(event){
            event.stopPropagation();
            openPlaylist(false);
          });
          // Only published COMMUNITY playlists with playable SID tracks participate.
          // Nothing is shuffled or moved in the visible playlist or its track list.
          if(Number(item.tracks)>0)
            startupPlayable.push({key:communityItemOrderKey(item),row:row,play:function(){openPlaylist(true);}});
        });
        updateCatalogArrows();
        await renderLocalImportedCommunityRows();
        // Refresh ADD + TO options after the remote catalog arrives. Never
        // change playback or the currently selected editing draft.
        renderRemixes();
        // TEST161: No automatic playlist selection or playback after loading
        // COMMUNITY PLAYLISTS. Tracks start only after the visitor selects PLAY.
      } catch(error){
        if(requestNumber===communityRequestNumber)
          communityItems.textContent='Could not load COMMUNITY PLAYLISTS: '+error.message;
        cancelStartupPlaylist();
      }
    }
    // TEST30: every Choose A SID opening returns to the RICO'S PLAYLISTS tab.
    // Only switch the visible catalog; do not change the loaded SID or playback.
    var chooseSidButton=document.getElementById('chooseSid');
    if(chooseSidButton) chooseSidButton.addEventListener('click',function(){
      showCommunity(true);
    });
    if(communityTab) communityTab.addEventListener('click',function(){showCommunity(true);});
    [['ricoDefaultTab','games']].forEach(function(choice) {
      var tab=document.getElementById(choice[0]);
      if(tab) tab.addEventListener('click',function(){
        cancelStartupPlaylist();
        showCommunity(false,choice[1]);
      });
    });

    // TEST78 — OUR COLLECTION: navigate collections first, then SID tracks.
    // Keep each saved local playlist intact (including repeated tracks).
    // Browser-only imports remain private; do not present them as published SIDs.
    (function initOurCollection(){
      var tab=document.getElementById('ricoOurCollectionTab');
      var panel=document.getElementById('ricoOurCollectionPanel');
      var items=document.getElementById('ricoOurItems');
      var search=document.getElementById('ricoOurSearch');
      var count=document.getElementById('ricoOurCount');
      var status=document.getElementById('ricoOurStatus');
      var reload=document.getElementById('ricoOurRefresh');
      if(!tab||!panel||!items||!search)return;
      var collections=[],request=0;
      ['mousedown','mouseup','pointerdown','pointerup','click','dblclick','keydown','keyup','keypress'].forEach(function(type){
        search.addEventListener(type,function(event){event.stopPropagation();});
      });
      function addAction(row,text,handler){
        var button=document.createElement('button');
        button.type='button';button.textContent=text;
        button.addEventListener('click',function(event){event.stopPropagation();handler();});
        row.appendChild(button);return button;
      }
      // TEST79: collection rows use the exact Community LOAD workflow.
      // No nested tracks or individual PLAY buttons in this browser.
      function render(){
        items.textContent='';
        var query=search.value.toLocaleLowerCase().trim();
        var found=collections.filter(function(c){
          return !query||(c.name+' '+c.creator+' '+c.tracks.map(function(t){
            return t.title+' '+t.author+' '+t.file;
          }).join(' ')).toLocaleLowerCase().includes(query);
        });
        count.textContent=found.length+' COLLECTIONS';
        var fragment=document.createDocumentFragment();
        found.forEach(function(c){
          var row=document.createElement('div');
          row.className='rico-our-row rico-our-collection-row';
          row.setAttribute('role','listitem');
          var label=document.createElement('span');label.className='rico-our-label';
          var title=document.createElement('strong');title.textContent=c.name;
          var detail=document.createElement('small');
          detail.textContent='Collection by '+c.creator+' · '+
            (c.remote?c.trackCount:c.tracks.length)+' SID'+
            (c.local?' · LOCAL ONLY':' · PUBLISHED');
          label.appendChild(title);label.appendChild(detail);row.appendChild(label);
          var load=addAction(row,'PLAY',async function(){
            load.disabled=true;
            try{
              var songs=c.tracks;
              if(c.remote){
                var response=await fetch(communityWriteApi+'/collections/'+encodeURIComponent(c.id));
                if(!response.ok)throw Error('Published collection unavailable.');
                var manifest=await response.json();
                if(!Array.isArray(manifest.tracks)||!manifest.tracks.length||
                   manifest.tracks.length>(c.id===NO_HVSC_COLLECTION_ID?2000:40))
                  throw Error('Invalid published collection.');
                if(c.id===NO_HVSC_COLLECTION_ID){
                  // TEST165: NO HVSC is a persistent asset archive, not a
                  // temporary v1 memory playlist. The v2 reference player
                  // also allows each archived SID to be sent to REMIX via +.
                  // Read persisted SID header credit before progressive playback.
                  // Metadata never changes the immutable asset or D1 ordering.
                  var artistBySidId=Object.create(null),metaBySidId=new Map();
                  try{
                    var metaResponse=await fetch(communityWriteApi+'/no-hvsc',{cache:'no-store'});
                    if(metaResponse.ok){
                      var metaCatalog=await metaResponse.json();
                      if(Array.isArray(metaCatalog.tracks))metaCatalog.tracks.forEach(function(t){
                        if(t&&/^[a-f0-9]{64}$/.test(t.sidId))metaBySidId.set(t.sidId,t);
                      });
                    }
                  }catch(metaError){console.warn('NO HVSC artist metadata unavailable',metaError);}
                  var refs=manifest.tracks.map(function(t){
                    if(!/^[0-9a-f]{64}$/.test(t.sidId)||!t.file)
                      throw Error('Invalid NO HVSC asset reference.');
                    var metadata=metaBySidId.get(t.sidId);
                    if(metadata&&metadata.author)artistBySidId[t.sidId]=metadata.author;
                    return {sidId:t.sidId,file:t.file,
                      title:(metadata&&metadata.title)||t.file,
                      author:(metadata&&metadata.author)||'Unknown'};
                  });
                  await loadStoredPlaylist({format:'ricos-sid-playlist',version:2,
                    name:c.name,createdBy:c.creator,tracks:refs},false);
                  activePublicCollection={id:c.id,name:c.name,creator:c.creator,
                    artistBySidId:artistBySidId,
                    originalTracks:refs.map(remixCanonicalRef),
                    tracks:refs.map(function(t,i){
                      return {sidId:t.sidId,file:t.file,originalIndex:i};
                    }),dirtyOrder:false};
                  renderLivePlaylist();
                  status.textContent='Loaded NO HVSC · '+refs.length+' SID.';
                  if(player.dialogManager&&player.dialogManager.dialogShown==='chooseSidDialog')
                    player.dialogManager.hideDialog('chooseSidDialog');
                  return;
                }
                songs=[];
                for(var track of manifest.tracks){
                  if(!/^[0-9a-f]{64}$/.test(track.sidId))throw Error('Invalid SID reference');
                  var fileResponse=await fetch(communityWriteApi+'/sid-assets/'+track.sidId);
                  if(!fileResponse.ok)throw Error('Missing SID asset: '+track.file);
                  var bytes=new Uint8Array(await fileResponse.arrayBuffer());
                  if(!parseSID(bytes,{name:track.file,size:bytes.length}))
                    throw Error('Invalid SID asset: '+track.file);
                  songs.push({file:track.file,sidBase64:encode(bytes)});
                }
              }
              loadPlaylist({format:'ricos-sid-playlist',version:1,
                name:c.name,createdBy:c.creator,
                tracks:songs.map(function(t){return {file:t.file,sidBase64:t.sidBase64};})},0,false);
              // Reloaded remote collection is editable by order only: original SID bytes stay immutable.
              if(c.remote){
                activePublicCollection={id:c.id,name:c.name,creator:c.creator,
                  originalTracks:manifest.tracks.map(function(t){return {sidId:t.sidId,file:t.file};}),
                  tracks:manifest.tracks.map(function(t,i){
                    return {sidId:t.sidId,file:t.file,originalIndex:i};
                  }),dirtyOrder:false};
                renderLivePlaylist();
              }
              status.textContent='Loaded '+c.name+' · '+songs.length+' SID.';
              if(player.dialogManager&&player.dialogManager.dialogShown==='chooseSidDialog')
                player.dialogManager.hideDialog('chooseSidDialog');
            }catch(error){status.textContent='Unable to load collection: '+error.message;}
            finally{load.disabled=false;}
          });
          if(c.local&&c.id.startsWith('local-')){
            var remove=addAction(row,'DELETE',async function(){
              if(!window.confirm('Delete local collection "'+c.name+'" ('+c.tracks.length+
                ' SID) from this browser? This will not delete public collections or other playlists.'))return;
              remove.disabled=true;
              try{
                var storedId=c.id.slice('local-'.length);
                if(!storedId)throw Error('Invalid local collection ID.');
                // Delete only this saved local playlist record. Shared playback
                // buffers and all other collections remain untouched.
                await dbCall('readwrite',function(store){return store.delete(storedId);});
                if(currentId===storedId)currentId='';
                collections=collections.filter(function(other){return other.id!==c.id;});
                await refreshSaved();
                status.textContent='Deleted local collection: '+c.name+'.';
                render();
              }catch(error){
                status.textContent='Unable to delete collection: '+error.message;
              }finally{remove.disabled=false;}
            });
          }
          fragment.appendChild(row);
        });
        if(!found.length){
          var empty=document.createElement('div');empty.className='rico-our-row';
          empty.textContent='No collections match this search.';fragment.appendChild(empty);
        }
        items.appendChild(fragment);
      }
      function inspectPlaylist(id,name,creator,tracks,local,updatedAt){
        if(!Array.isArray(tracks)||!tracks.length)return null;
        var valid=[];
        tracks.forEach(function(t){
          if(!t||typeof t.sidBase64!=='string')return;
          try{
            var bytes=decode(t.sidBase64);
            var parsed=parseSID(bytes,{name:t.file||'track.sid',size:bytes.length});
            if(!parsed)return;
            valid.push({file:t.file||'track.sid',sidBase64:t.sidBase64,
              title:parsed.name||t.file||'Untitled SID',author:parsed.author||'Unknown'});
          }catch(e){console.warn('Skipped invalid SID in collection '+name,e);}
        });
        return valid.length?{id:id,name:name,creator:creator||'Unknown',
          tracks:valid,local:local,updatedAt:updatedAt||''}:null;
      }
      async function loadCatalog(){
        var serial=++request;status.textContent='Loading collections...';
        try{
          var result=[];
          // TEST81: show only collections explicitly saved through IMPORT SID.
          // RICO remains available as a historical Community Playlist, not
          // auto-inserted into OUR COLLECTION.
          // Public contributed collections are independent of HVSC and the
          // original immutable RICO curated playlist.
          try{
            var remoteResponse=await fetch(communityWriteApi+'/collections',{cache:'no-store'});
            if(remoteResponse.ok){
              var published=await remoteResponse.json();
              if(Array.isArray(published.collections)){
                published.collections.forEach(function(c){
                  if(c&&typeof c.id==='string'&&typeof c.name==='string')
                    result.push({id:c.id,name:c.name,creator:c.createdBy||'Unknown',
                      tracks:[],trackCount:Number(c.tracks)||0,local:false,remote:true,updatedAt:''});
                });
              }
            }
          }catch(error){console.warn('Published SID collections unavailable',error);}
          var saved=await dbCall('readonly',function(store){return store.getAll();});
          saved.forEach(function(list){
            if(list&&list.version===1&&Array.isArray(list.tracks)){
              var entry=inspectPlaylist('local-'+list.id,list.name||'IMPORT SID',
                list.createdBy||'Unknown',list.tracks,true,list.updatedAt||list.createdAt);
              if(entry)result.push(entry);
            }
          });
          result.sort(function(a,b){
            if(a.local!==b.local)return a.local?-1:1;
            return String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
          });
          if(serial!==request)return;
          collections=result;
          status.textContent=result.length+' collections available. Local imports stay private until PUBLISH succeeds.';
          render();
        }catch(error){
          if(serial===request)status.textContent='Collection unavailable: '+error.message;
        }
      }
      function openOurCollection(){
        cancelStartupPlaylist();
        browserTab='ours';communityActive=false;
        var dialog=document.getElementById('chooseSidDialog');
        if(dialog){
          dialog.classList.remove('rico-view-community','rico-view-games','rico-view-local','rico-view-hvsc','rico-view-library','rico-view-ours');
          dialog.classList.add('rico-view-ours');
        }
        if(communityPanel)communityPanel.style.display='none';
        if(localPanel)localPanel.style.display='none';
        if(hvscPanel)hvscPanel.style.display='none';
        if(libraryPanel)libraryPanel.style.display='none';
        panel.style.display='block';refreshTabs();loadCatalog();
      }
      Array.prototype.forEach.call(document.querySelectorAll('#ricoListTabs button:not(#ricoOurCollectionTab)'),function(other){
        other.addEventListener('click',function(){panel.style.display='none';},{capture:true});
      });
      tab.addEventListener('click',openOurCollection);
      reload.addEventListener('click',loadCatalog);
      search.addEventListener('input',render);
    })();

    // TEST56: browse the immutable HVSC library, loading one pack on demand.
    // The browser never changes source rankings or saved personal playlists.
    (function initHVSCBrowser(){
      var tab=document.getElementById('ricoLibraryTab');
      var panel=libraryPanel;
      if(!tab||!panel)return;
      var shelvesEl=document.getElementById('ricoLibraryShelves');
      var sectionsEl=document.getElementById('ricoLibrarySections');
      var songsEl=document.getElementById('ricoLibrarySongs');
      var searchEl=document.getElementById('ricoLibrarySearch');
      // TEST58: legacy sidPlayer intercepts window mousedown and space keyup.
      // Keep the keyboard search editable and prevent typing from triggering playback.
      ['mousedown','mouseup','pointerdown','pointerup','click','dblclick'].forEach(function(type){
        searchEl.addEventListener(type,function(event){event.stopPropagation();});
      });
      ['keydown','keyup','keypress'].forEach(function(type){
        searchEl.addEventListener(type,function(event){event.stopPropagation();});
      });

      var draftItemsEl=document.getElementById('ricoLibraryDraftItems');
      var draftCountEl=document.getElementById('ricoDraftCount');
      var draftNameEl=document.getElementById('ricoLibraryListName');
      var draftCreatorEl=document.getElementById('ricoLibraryCreator');
      var addAllButton=document.getElementById('ricoLibraryAddAll');
      var saveDraftButton=document.getElementById('ricoLibrarySaveList');
      var newDraftButton=document.getElementById('ricoLibraryNewList');
      var draft=[],draftId='',draftBusy=false,draftBytes=0;
      // Original SID player suppresses mousedown and handles the space bar.
      ['mousedown','mouseup','pointerdown','pointerup','click','dblclick','keydown','keyup','keypress'].forEach(function(type){
        draftNameEl.addEventListener(type,function(event){event.stopPropagation();});
        draftCreatorEl.addEventListener(type,function(event){event.stopPropagation();});
      });
      var statusEl=document.getElementById('ricoLibraryStatus');
      var manifest=null, category='musicians', shelf='', shelfData=null, selected=null, token=0;
      var shelfCache={},packCache=new Map();
      function status(message){statusEl.textContent=message;}
      async function getManifest(){
        if(manifest)return manifest;
        var res=await fetch('library/index.json',{cache:'no-store'});
        if(!res.ok)throw Error('Library not published yet. GitHub build pending ('+res.status+').');
        var json=await res.json();
        if(json.format!=='ricos-hvsc-library'||!json.categories)throw Error('Invalid library index.');
        manifest=json;return json;
      }
      // TEST179: independent read-only GROUPS index. Load only after
      // the user chooses GROUPS; don't change the original HVSC manifest.
      async function getGroupManifest(){
        var lib=await getManifest();
        if(lib.categories.groups)return lib;
        var response=await fetch('library/groups/index.json',{cache:'no-store'});
        if(!response.ok)throw Error('GROUPS index unavailable ('+response.status+').');
        var data=await response.json();
        if(data.format!=='ricos-hvsc-groups'||!data.groups||
           !Array.isArray(data.groups.shelves))throw Error('Invalid GROUPS index.');
        lib.categories.groups=data.groups;
        return lib;
      }
      function makeButton(label,onClick,cls){
        var b=document.createElement('button');b.type='button';b.textContent=label;
        if(cls)b.className=cls;
        b.addEventListener('click',onClick);return b;
      }
      function renderShelves(){
        shelvesEl.textContent='';
        var info=manifest.categories[category];
        document.getElementById('ricoLibraryIntro').textContent=category==='groups'
          ?'GROUPS · '+info.totalGroups.toLocaleString()+' groups · '+info.count.toLocaleString()+' SID · HVSC + CSDb'
          :category.toUpperCase()+' · '+info.count.toLocaleString()+' SID · HVSC '+(manifest.source||'');
        document.getElementById('ricoLibraryMusicians').classList.toggle('rico-selected-tab',category==='musicians');
        document.getElementById('ricoLibraryDemos').classList.toggle('rico-selected-tab',category==='demos');
        document.getElementById('ricoLibraryGroups').classList.toggle('rico-selected-tab',category==='groups');
        addAllButton.textContent=category==='groups'?'ADD ALL FROM GROUP':'ADD ALL FROM ARTIST';
        info.shelves.forEach(function(item){
          var b=makeButton(item.name,()=>openShelf(item),'rico-library-shelf');
          if(shelf===item.name)b.classList.add('rico-selected-tab');
          shelvesEl.appendChild(b);
        });
      }
      async function openShelf(item, preserveSearch){
        var request=++token;
        shelf=item.name;selected=null;shelfData=null;
        sectionsEl.textContent='';songsEl.textContent='';
        renderShelves();status('Loading '+category.toUpperCase()+' / '+shelf+'...');
        try{
          var data=shelfCache[item.file];
          if(!data){
            var res=await fetch(item.file, category==='groups'?{cache:'no-store'}:undefined);
            if(!res.ok)throw Error('Shelf unavailable ('+res.status+').');
            data=await res.json();shelfCache[item.file]=data;
          }
          if(request!==token)return;
          shelfData=data;if(!preserveSearch)searchEl.value='';
          renderSections();
        }catch(e){if(request===token)status(e.message);}
      }
      // TEST57: show every artist and SID in a selected HVSC shelf, with independent scrolling.
      function renderSections(){
        if(!shelfData)return;
        var q=searchEl.value.trim().toLocaleLowerCase();
        var matches=shelfData.sections.filter(function(g){
          return category==='groups' ? (!q||g.name.toLocaleLowerCase().startsWith(q)) : (!q||g.name.toLocaleLowerCase().includes(q)||g.tracks.some(x=>(x.title+' '+x.author+' '+x.file).toLocaleLowerCase().includes(q)));
        });
        var previousScroll=sectionsEl.scrollTop;
        sectionsEl.textContent='';
        if(!matches.length){selected=null;songsEl.textContent='No matches.';status(category==='groups'?'No matching groups.':'No matching musicians or tracks.');return;}
        if(!selected||!matches.includes(selected)){selected=matches[0];}
        matches.forEach(function(section){
          var b=makeButton(section.name+' ('+section.tracks.length+')',function(){
            selected=section;renderSections();
          },'rico-library-section');
          if(selected===section)b.classList.add('rico-selected-tab');
          sectionsEl.appendChild(b);
        });
        sectionsEl.scrollTop=previousScroll;
        renderSongs();
        status(matches.length+(category==='groups'?' groups':' sections')+' available · '+selected.tracks.length+' SID in '+selected.name+'.');
      }
      function filteredTracks(){
        if(!selected)return [];
        var q=searchEl.value.trim().toLocaleLowerCase();
        return selected.tracks.filter(function(track){
          return !q||selected.name.toLocaleLowerCase().includes(q)||
            (track.title+' '+track.author+' '+track.file).toLocaleLowerCase().includes(q);
        });
      }
      function trackKey(section,track){return (track.pack||section.pack)+'::'+track.file;}
      function renderDraft(){
        draftCountEl.textContent='('+draft.length+' SID)';
        draftItemsEl.textContent='';
        draft.forEach(function(item,index){
          var row=document.createElement('div');
          row.className='rico-library-draft-row';
          var label=document.createElement('span');
          label.textContent=item.entry.name+' — '+formatArtistCredit(item.entry.author);
          var remove=makeButton('×',function(){
            if(draftBusy)return;
            var at=draft.indexOf(item);
            if(at<0)return;
            draft.splice(at,1);draftBytes-=item.entry.localBytes.length;
            renderDraft();status('Removed from MY PLAYLIST · '+draft.length+' SID.');
          },'rico-library-draft-remove');
          remove.setAttribute('aria-label','Remove '+item.entry.name);
          row.appendChild(label);row.appendChild(remove);draftItemsEl.appendChild(row);
        });
        saveDraftButton.disabled=draftBusy||!draft.length;
        addAllButton.disabled=draftBusy||!selected;
        newDraftButton.disabled=draftBusy;
      }
      async function getZip(sourcePack){
        if(typeof JSZip==='undefined')throw Error('ZIP decoder unavailable; reload page.');
        var promise=packCache.get(sourcePack);
        if(!promise){
          promise=(async function(){
            var response=await fetch(sourcePack);
            if(!response.ok)throw Error('SID pack unavailable ('+response.status+').');
            return JSZip.loadAsync(await response.arrayBuffer());
          })();
          packCache.set(sourcePack,promise);
          if(packCache.size>3)packCache.delete(packCache.keys().next().value);
        }
        try{return await promise;}
        catch(error){packCache.delete(sourcePack);throw error;}
      }
      async function addTrack(section,track){
        var key=trackKey(section,track);
        if(draft.some(function(item){return item.key===key;}))return false;
        if(draft.length>=2000)throw Error('Playlist limit: 2000 SID.');
        if(draftBytes+track.bytes>64*1024*1024)throw Error('Playlist limit: 64 MB.');
        var zip=await getZip(track.pack||section.pack);
        var file=zip.file(track.file);
        if(!file)throw Error('SID missing from pack: '+track.file);
        var bytes=await file.async('uint8array');
        if(draftBytes+bytes.length>64*1024*1024)throw Error('Playlist limit: 64 MB.');
        var entry=parseSID(bytes,{name:track.file,size:bytes.length});
        if(!entry)throw Error('Invalid SID: '+track.file);
        draft.push({key:key,entry:entry,pack:track.pack||section.pack,file:track.file});
        draftBytes+=bytes.length;
        return true;
      }
      async function addSelection(section,tracks){
        if(draftBusy)return;
        draftBusy=true;renderDraft();
        var added=0,duplicates=0,failed=0;
        try{
          for(var n=0;n<tracks.length;n++){
            if(n%20===0)status('Adding to MY PLAYLIST: '+n+' / '+tracks.length+'...');
            try{
              if(await addTrack(section,tracks[n]))added++;
              else duplicates++;
            }catch(error){
              failed++;
              console.warn('Could not add SID',tracks[n].file,error);
              if(/limit/i.test(error.message))throw error;
            }
          }
          status('MY PLAYLIST: '+added+' added, '+duplicates+' already present'+(failed?', '+failed+' unavailable':'')+'. Playback unchanged.');
        }catch(error){status(error.message+' · '+added+' SID added before stopping.');}
        finally{draftBusy=false;renderSongs();}
      }
      function renderSongs(){
        songsEl.textContent='';
        if(!selected){renderDraft();return;}
        var heading=document.createElement('div');heading.className='rico-library-heading';
        heading.textContent=selected.name+' · '+selected.tracks.length+' SID';songsEl.appendChild(heading);
        filteredTracks().forEach(function(track){
          var key=trackKey(selected,track);
          var row=makeButton(track.title+(track.author?' — '+formatArtistCredit(track.author):''),function(){
            addSelection(selected,[track]);
          },'rico-library-track');
          row.title='Add to MY PLAYLIST · '+(track.origin||selected.name)+' / '+track.file;
          if(draft.some(function(item){return item.key===key;}))row.classList.add('rico-draft-added');
          songsEl.appendChild(row);
        });
        renderDraft();
      }
      addAllButton.addEventListener('click',function(){
        if(!selected)return;
        addSelection(selected,filteredTracks());
      });
      newDraftButton.addEventListener('click',function(){
        if(draftBusy)return;
        if(draft.length&&!window.confirm('Start a new empty MY PLAYLIST? Unsaved selections will be cleared.'))return;
        draft=[];draftBytes=0;draftId='';draftNameEl.value='My SID Playlist';
        renderDraft();status('New empty MY PLAYLIST. Playback unchanged.');
      });
      saveDraftButton.addEventListener('click',async function(){
        if(draftBusy||!draft.length)return;
        var title=draftNameEl.value.trim();
        if(!title){status('Enter a playlist name first.');draftNameEl.focus();return;}
        var creator=draftCreatorEl.value.trim();
        if(!creator){status('Enter your nickname in Playlist by before saving.');draftCreatorEl.focus();return;}
        try{await ensureBetaServerReady();}
        catch(error){status(error.message);return;}
        var betaKey=promptBetaKey();
        if(betaKey===null||!betaKey){status('Publication cancelled. Your playlist remains in MY PLAYLIST.');return;}
        draftBusy=true;renderDraft();
        try{
          var data={format:'ricos-sid-playlist',version:2,name:title,createdBy:creator.slice(0,60),
            createdAt:new Date().toISOString(),
            tracks:draft.map(function(item){
              return {pack:item.pack,file:item.file};
            })};
          var publishResponse=await fetch(communityApiBase+'/playlists',{
            method:'POST',
            headers:{'Content-Type':'application/json','X-Beta-Key':betaKey},
            body:JSON.stringify(data)
          });
          var receipt=await publishResponse.json();
          if(!publishResponse.ok)throw Error(receipt.error||'Publication failed.');
          draftId=receipt.id;
          status('PUBLISHED for everyone: '+title+' — Playlist by '+creator+' · '+data.tracks.length+' SID.');
          say('Published: '+title+' — Playlist by '+creator+'.');
          await loadCommunityCatalog();
        }catch(error){status('Could not save: '+error.message);}
        finally{draftBusy=false;renderDraft();}
      });
      renderDraft();
      async function openLibrary(){
        cancelStartupPlaylist();
        browserTab='library';communityActive=false;
        var dialog=document.getElementById('chooseSidDialog');
        if(dialog){dialog.classList.remove('rico-view-community','rico-view-games','rico-view-local','rico-view-hvsc','rico-view-library','rico-view-ours');dialog.classList.add('rico-view-library');}
        if(communityPanel)communityPanel.style.display='none';
        if(localPanel)localPanel.style.display='none';
        if(hvscPanel)hvscPanel.style.display='none';
        panel.style.display='block';refreshTabs();
        try {
          if(category==='groups')await getGroupManifest();
          else await getManifest();
          renderShelves();
          var list=manifest.categories[category].shelves;
          var next=list.find(x=>x.name===shelf)||list[0];
          if(next)await openShelf(next);
        }catch(e){status(e.message);}
      }
      document.getElementById('ricoLibraryMusicians').addEventListener('click',function(){category='musicians';shelf='';openLibrary();});
      document.getElementById('ricoLibraryDemos').addEventListener('click',function(){category='demos';shelf='';openLibrary();});
      document.getElementById('ricoLibraryGroups').addEventListener('click',function(){category='groups';shelf='';openLibrary();});
      // TEST180: navigate the GROUPS alphabet directly while typing.
      searchEl.addEventListener('input',function(){
        if(category!=='groups'){renderSections();return;}
        var q=searchEl.value.trim().toLocaleLowerCase();
        if(!q){renderSections();return;}
        var first=q.charAt(0).toUpperCase();
        var letter=/[A-Z]/.test(first)?first:'0-9';
        var item=manifest&&manifest.categories.groups&&manifest.categories.groups.shelves.find(function(s){return s.name===letter;});
        if(item&&item.name!==shelf){openShelf(item,true);return;}
        renderSections();
      });
      tab.addEventListener('click',openLibrary);
    })();

    refreshSaved().catch(function(error){say('Local saving unavailable: '+error.message);});
    showCommunity(true); // TEST22: startup shows RICO'S PLAYLISTS, not the game list.
  })();

  refreshTabs();
  player.initFileSelection();
  showLivePlaylist(true); // TEST21: initial playlist visible and button marked ON.
})();
