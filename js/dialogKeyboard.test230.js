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

  // TEST231: screenshot-matched initial geometry (782 x 726 at desktop).
  // Remember later user resizing/moving; do not let showDialog's content-height
  // calculation silently reset the chosen dimensions on each open.
  var geometryKey='spotysid:choose-window:v1';
  function readGeometry(){
    try{
      var value=JSON.parse(localStorage.getItem(geometryKey)||'null');
      return value&&Number.isFinite(value.width)&&Number.isFinite(value.height)&&
        value.width>=280&&value.width<4000&&value.height>=260&&value.height<4000
        ?value:null;
    }catch(error){return null;}
  }
  function applyGeometry(){
    var saved=readGeometry();
    var barHeight=Math.ceil(controls.getBoundingClientRect().height||36);
    var top=Math.max(8,Math.min(saved&&Number.isFinite(saved.top)?saved.top:12,
      Math.max(8,window.innerHeight-barHeight-280)));
    var width=Math.max(280,Math.min(saved?saved.width:782,window.innerWidth-24));
    var height=Math.max(260,Math.min(saved?saved.height:726,
      window.innerHeight-top-barHeight-12));
    var centered=Math.round((window.innerWidth-width)/2);
    var left=Math.max(0,Math.min(saved&&Number.isFinite(saved.left)?saved.left:centered,
      window.innerWidth-width));
    chooser.style.width=Math.round(width)+'px';
    chooser.style.height=Math.round(height)+'px';
    chooser.style.left=Math.round(left)+'px';
    chooser.style.top=Math.round(top)+'px';
  }
  function saveGeometry(){
    try{
      var rect=chooser.getBoundingClientRect();
      if(rect.width<280||rect.height<260)return;
      localStorage.setItem(geometryKey,JSON.stringify({
        width:Math.round(rect.width),height:Math.round(rect.height),
        left:Math.round(rect.left),top:Math.round(rect.top)
      }));
    }catch(error){}
  }
  var manager=window.sidPlayer&&window.sidPlayer.dialogManager;
  if(manager&&typeof manager.showDialog==='function'){
    var originalShowDialog=manager.showDialog;
    manager.showDialog=function(id){
      var result=originalShowDialog.apply(this,arguments);
      if(id==='chooseSidDialog')applyGeometry();
      return result;
    };
  }
  // The original player opens Choose before this module loads.
  applyGeometry();
  var userDraggingChooser=false;
  chooser.addEventListener('mousedown',function(event){
    if(event.button!==0||event.target.closest('button'))return;
    if(event.target.closest('.title,.dialogResize'))userDraggingChooser=true;
  },true);
  window.addEventListener('mouseup',function(){
    if(!userDraggingChooser)return;
    userDraggingChooser=false;
    saveGeometry();
  });
  window.addEventListener('resize',function(){
    if(isVisible(chooser))applyGeometry();
  });

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
