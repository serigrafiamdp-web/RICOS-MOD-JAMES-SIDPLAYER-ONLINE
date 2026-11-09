/* TEST109 — HELP beside ABOUT; bilingual, read-only user guide.
   Reuses the original dialog manager. Never changes playback or playlist state. */
(function(){
  'use strict';
  function dialogManager(){
    return (typeof sidPlayer!=='undefined'&&sidPlayer&&sidPlayer.dialogManager)
      ? sidPlayer.dialogManager:null;
  }
  var trigger=document.getElementById('ricoHelpButton');
  var dialog=document.getElementById('ricoHelpDialog');
  var close=document.getElementById('ricoHelpClose');
  var en=document.getElementById('ricoHelpEnglish');
  var es=document.getElementById('ricoHelpSpanish');
  var enButton=document.getElementById('ricoHelpEnglishButton');
  var esButton=document.getElementById('ricoHelpSpanishButton');
  if(!trigger||!dialog||!close||!en||!es||!enButton||!esButton)return;

  function setLanguage(lang){
    var spanish=lang==='es';
    en.hidden=spanish;
    es.hidden=!spanish;
    enButton.setAttribute('aria-pressed',String(!spanish));
    esButton.setAttribute('aria-pressed',String(spanish));
    dialog.setAttribute('lang',lang);
  }
  function openHelp(event){
    if(event){event.stopPropagation();}
    var manager=dialogManager();
    if(!manager)return;
    if(manager.dialogShown && manager.dialogShown!=='ricoHelpDialog')
      manager.hideDialog(manager.dialogShown);
    setLanguage('en');
    manager.showDialog('ricoHelpDialog');
    dialog.querySelector('.content').scrollTop=0;
    enButton.focus();
  }
  function closeHelp(event){
    if(event){event.preventDefault();event.stopPropagation();}
    var manager=dialogManager();
    if(manager&&manager.dialogShown==='ricoHelpDialog')manager.hideDialog('ricoHelpDialog');
    trigger.focus();
  }
  trigger.addEventListener('click',openHelp);
  close.addEventListener('click',closeHelp);
  enButton.addEventListener('click',function(event){
    event.stopPropagation();setLanguage('en');dialog.querySelector('.content').scrollTop=0;
  });
  esButton.addEventListener('click',function(event){
    event.stopPropagation();setLanguage('es');dialog.querySelector('.content').scrollTop=0;
  });
  dialog.addEventListener('keydown',function(event){
    if(event.key==='Escape'){closeHelp(event);}
  });
})();