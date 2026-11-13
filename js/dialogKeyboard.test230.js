/* TEST230 — Nonmodal Choose A SID, Esc priority: browser then playlist.
   Keyboard changes only visibility. Never loads/unloads SIDs or changes audio. */
(function(){
  'use strict';
  var chooser=document.getElementById('chooseSidDialog');
  var playlist=document.getElementById('ricoLivePlaylist');
  var controls=document.getElementById('sidControls');
  if(!chooser||!playlist||!controls)return;

  function isVisible(node){
    return !!(node&&node.getClientRects().length&&
      window.getComputedStyle(node).visibility!=='hidden');
  }
  function sync(){
    document.body.classList.toggle('rico-choose-open',isVisible(chooser));
    document.body.style.setProperty('--rico-controls-height',
      Math.ceil(controls.getBoundingClientRect().height||36)+'px');
  }
  var observer=new MutationObserver(sync);
  observer.observe(chooser,{attributes:true,attributeFilter:['style','class']});
  if(typeof ResizeObserver!=='undefined'){
    var barObserver=new ResizeObserver(sync);
    barObserver.observe(controls);
  }
  window.addEventListener('resize',sync);
  sync();

  function hasOtherForegroundWindow(){
    var dialogs=document.querySelectorAll('.dialog');
    for(var i=0;i<dialogs.length;i++){
      if(dialogs[i]!==chooser&&isVisible(dialogs[i]))return true;
    }
    var ids=['ricoRemixEditor','ricoImportSidWindow','ricoDonateDialog'];
    for(var j=0;j<ids.length;j++){
      if(isVisible(document.getElementById(ids[j])))return true;
    }
    return false;
  }

  // Handle only Esc. Preserve existing modal-editor and beta-key Esc handling.
  document.addEventListener('keydown',function(event){
    if((event.key!=='Escape'&&event.key!=='Esc')||
       event.defaultPrevented||event.repeat)return;
    if(hasOtherForegroundWindow())return;
    if(isVisible(chooser)){
      var manager=window.sidPlayer&&window.sidPlayer.dialogManager;
      if(!manager||manager.dialogShown!=='chooseSidDialog')return;
      manager.hideDialog('chooseSidDialog');
      sync();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if(isVisible(playlist)){
      // The X button opens the library again. The existing PLAYLIST toggle,
      // instead, simply hides the playlist, keeping the oscilloscope/audio.
      var toggle=document.getElementById('ricoPlaylistToggle');
      if(!toggle)return;
      toggle.click();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
})();
