/* SpotySid TEST135 — DONATE modal.
 * Only user-supplied PayPal links may enable payment. No payment data is collected.
 * Names in supporters are curated by the maintainer with explicit permission.
 */
(function(){
  'use strict';

  function safePayPalUrl(value){
    if(typeof value!=='string'||!value.trim())return null;
    try{
      var u=new URL(value.trim());
      if(u.protocol!=='https:'||u.username||u.password)return null;
      var domain=u.hostname.toLowerCase();
      if(domain==='paypal.me'||domain==='www.paypal.me'){
        return u.pathname!=='/'?u.href:null;
      }
      if(domain==='paypal.com'||domain==='www.paypal.com'){
        // Restrict destinations to PayPal's hosted donation and PayPal.Me flows.
        if(/^\/donate(?:\/|$)/i.test(u.pathname)&&
           (u.searchParams.has('hosted_button_id')||u.pathname!=='/donate'))return u.href;
        if(/^\/paypalme\/[^/]+/i.test(u.pathname))return u.href;
      }
    }catch(err){console.warn('PayPal URL is not configured correctly.',err);}
    return null;
  }

  function init(){
    var trigger=document.getElementById('ricoDonateButton');
    var close=document.getElementById('ricoDonateClose');
    var dialog=document.getElementById('ricoDonateDialog');
    var payLink=document.getElementById('ricoDonatePayPal');
    var status=document.getElementById('ricoDonateStatus');
    var supporters=document.getElementById('ricoDonateSupporters');
    if(!trigger||!close||!dialog||!payLink||!status||!supporters)return;

    function setPayPal(url){
      var safe=safePayPalUrl(url);
      if(safe){
        payLink.href=safe;
        payLink.removeAttribute('tabindex');
        payLink.setAttribute('aria-disabled','false');
        status.textContent='Payments are processed securely on PayPal.';
      }else{
        payLink.removeAttribute('href');
        payLink.setAttribute('tabindex','-1');
        payLink.setAttribute('aria-disabled','true');
        status.textContent='PAYPAL LINK NOT CONNECTED YET';
      }
    }

    function setSupporters(items){
      supporters.textContent='';
      if(!Array.isArray(items)||!items.length){
        var pending=document.createElement('li');
        pending.className='rico-donate-empty';
        pending.textContent='Supporter credits will appear here once approved.';
        supporters.appendChild(pending);
        return;
      }
      var seen=new Set();
      items.slice(0,200).forEach(function(item){
        var name=typeof item==='string'?item:item&&item.name;
        if(typeof name!=='string')return;
        name=name.trim().slice(0,90);
        if(!name||seen.has(name.toLowerCase()))return;
        seen.add(name.toLowerCase());
        var li=document.createElement('li');
        li.textContent=name;
        supporters.appendChild(li);
      });
      if(!supporters.children.length)setSupporters([]);
    }

    setPayPal(null);
    setSupporters([]);
    // A simple public data file can be edited when the project's real
    // PayPal address and approved credit names are available.
    fetch('community/donate.json?v=135',{cache:'no-store'})
      .then(function(response){if(!response.ok)throw Error('Donate configuration not found');return response.json();})
      .then(function(config){
        if(config&&config.format==='spotysid-donate-config'){
          setPayPal(config.paypalUrl);
          setSupporters(config.supporters);
        }
      })
      .catch(function(error){
        console.warn('SpotySid DONATE data unavailable; payment link remains inactive.',error);
      });

    trigger.addEventListener('click',function(){
      var manager=window.sidPlayer&&window.sidPlayer.dialogManager;
      if(manager&&manager.dialogShown&&manager.dialogShown!=='ricoDonateDialog')
        manager.hideDialog(manager.dialogShown);
      if(manager&&typeof manager.showDialog==='function')manager.showDialog('ricoDonateDialog');
      else dialog.style.display='block';
    });
    close.addEventListener('click',function(){
      var manager=window.sidPlayer&&window.sidPlayer.dialogManager;
      if(manager&&manager.dialogShown==='ricoDonateDialog')manager.hideDialog('ricoDonateDialog');
      else dialog.style.display='none';
    });
    payLink.addEventListener('click',function(event){
      if(payLink.getAttribute('aria-disabled')==='true')event.preventDefault();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
