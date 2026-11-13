/* TEST228 — SpotySid artist information in the existing STIL sidebar.
   Official HVSC STIL is immutable. SpotySid-only edits are local drafts
   until an authorized, revision-checked Worker publication is verified. */
(function(){
  'use strict';
  var player=window.sidPlayer;
  if(!player)return;
  var stilCache=new Map(),profiles=new Map(),messages=new Map(),serial=0;
  var DRAFT_PREFIX='spotysid:artist-drafts:v1:';
  var PROFILE_API='https://ricos-sid-community.serigrafiamdp.workers.dev/artist-profiles';
  var API_ROOT='https://ricos-sid-community.serigrafiamdp.workers.dev';

  function el(tag,className,text){
    var node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined&&text!==null)node.textContent=String(text);
    return node;
  }
  function getPath(entry){
    if(!entry)return null;
    var ref=entry._hvscRef||entry;
    if(!ref||ref.sidId||typeof ref.pack!=='string'||typeof ref.file!=='string')return null;
    var match=ref.pack.match(/^library\/packs\/musicians\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+)\.zip$/i);
    if(!match||ref.file.includes('..')||ref.file.includes('/')||ref.file.startsWith('/'))return null;
    return '/MUSICIANS/'+match[1]+'/'+match[2]+'/'+ref.file;
  }
  function artistKey(entry,path){
    if(path)return 'hvsc:'+path.slice(0,path.lastIndexOf('/'));
    var artist=String(entry&&entry.author||player.songInfo&&player.songInfo.songAuthor||'')
      .trim().toLowerCase();
    if(!artist||artist==='unknown artist'||artist.length>110||/[<>]/.test(artist))return null;
    return 'artist:'+artist;
  }
  function currentEntry(){
    return player.sidList&&typeof player.sidListIndex==='number'
      ?player.sidList[player.sidListIndex]:null;
  }
  function currentArtistKey(){
    var entry=currentEntry();return artistKey(entry,getPath(entry));
  }
  function emptyDrafts(){return {links:[],csdb:[],artwork:[],stilOverrides:{}};}
  function cloneDraft(data){
    var result=emptyDrafts();
    if(!data||typeof data!=='object')return result;
    ['links','csdb','artwork'].forEach(function(kind){
      if(Array.isArray(data[kind]))result[kind]=data[kind].filter(function(v){
        return v&&typeof v.label==='string'&&typeof v.url==='string';
      }).map(function(v){return {label:v.label,url:v.url};});
    });
    if(data.stilOverrides&&typeof data.stilOverrides==='object'&&
       !Array.isArray(data.stilOverrides)){
      Object.keys(data.stilOverrides).forEach(function(path){
        if(typeof data.stilOverrides[path]==='string')
          result.stilOverrides[path]=data.stilOverrides[path];
      });
    }
    return result;
  }
  function readDrafts(key){
    var published=profiles.get(key);
    var base=cloneDraft(published&&published.profile);
    if(!key)return base;
    try{
      var local=JSON.parse(localStorage.getItem(DRAFT_PREFIX+key)||'null');
      if(!local||typeof local!=='object')return base;
      var newer=cloneDraft(local);
      if(local._profileSnapshot===1)return newer;
      // Merge TEST225 local-only additions with any newer published profile.
      ['links','csdb','artwork'].forEach(function(kind){
        var known=new Set(base[kind].map(function(v){return v.url;}));
        newer[kind].forEach(function(v){
          if(!known.has(v.url)){base[kind].push(v);known.add(v.url);}
        });
      });
      Object.assign(base.stilOverrides,newer.stilOverrides);
      return base;
    }catch(error){return base;}
  }
  function saveDrafts(key,drafts){
    if(!key)return false;
    try{
      localStorage.setItem(DRAFT_PREFIX+key,
        JSON.stringify(Object.assign({_profileSnapshot:1},cloneDraft(drafts))));
      return true;
    }catch(err){return false;}
  }
  function validURL(value,kind){
    try{
      var url=new URL(String(value||'').trim());
      if(url.protocol!=='https:'&&url.protocol!=='http:')return null;
      if(url.username||url.password)return null;
      if(kind==='csdb'&&!/^(?:www\.)?csdb\.dk$/i.test(url.hostname))return null;
      return url.href;
    }catch(error){return null;}
  }
  function sectionHeading(name){return el('div','rico-show-heading',name);}
  function isEditing(){
    var panel=document.getElementById('sidInfoContent');
    var focused=document.activeElement;
    return !!(panel&&focused&&panel.contains(focused)&&
      /^(INPUT|TEXTAREA)$/.test(focused.tagName));
  }
  function fetchProfile(key){
    if(!key||profiles.has(key))return;
    profiles.set(key,{loading:true,revision:0,profile:null});
    fetch(PROFILE_API+'?key='+encodeURIComponent(key),{cache:'no-store'})
      .then(function(response){
        if(!response.ok)throw Error('Profile API unavailable ('+response.status+')');
        return response.json();
      }).then(function(data){
        if(!data||data.format!=='ricos-artist-profile'||
           !Number.isSafeInteger(data.revision))throw Error('Invalid profile response');
        profiles.set(key,{loading:false,revision:data.revision,profile:data.profile});
      }).catch(function(error){
        profiles.set(key,{loading:false,revision:0,profile:null,unavailable:true});
        console.info('SpotySid public artist profiles are not deployed yet:',error.message);
      }).then(function(){
        if(player.sidInfoVisible&&currentArtistKey()===key&&!isEditing())update();
      });
  }
  function stilShard(path){
    var p=path.split('/');
    return 'musicians-'+p[2].toUpperCase();
  }
  function loadStil(shard){
    if(!stilCache.has(shard)){
      stilCache.set(shard,fetch('library/stil/'+shard+'.json')
        .then(function(response){
          if(!response.ok)throw Error('STIL data unavailable');
          return response.json();
        }).catch(function(error){stilCache.delete(shard);throw error;}));
    }
    return stilCache.get(shard);
  }
  function buildStil(hub,path,key,token,onSave){
    var section=el('section','rico-show-section rico-show-stil');
    section.appendChild(sectionHeading('STIL'));
    var notice=el('div','rico-show-stil-label');
    notice.hidden=true;
    section.appendChild(notice);
    var body=el('div','rico-show-stil-copy',path?'LOADING':'NO HVSC REFERENCE');
    section.appendChild(body);
    hub.appendChild(section);
    if(!path)return;
    function showText(official){
      var overrides=readDrafts(key).stilOverrides;
      var edited=Object.prototype.hasOwnProperty.call(overrides,path);
      body.textContent=edited?overrides[path]:official||'NO STIL ENTRY';
      notice.hidden=!edited;
      notice.textContent='SPOTYSID EDIT · HVSC ORIGINAL PRESERVED';
    }
    var form=el('form','rico-show-form rico-show-stil-form');
    form.hidden=true;
    var input=el('textarea','rico-show-input rico-show-textarea');
    input.rows=7;
    input.maxLength=16000;
    input.setAttribute('aria-label','Edit SpotySid STIL notes');
    form.appendChild(input);
    var actions=el('div','rico-show-form-actions');
    var save=el('button','rico-show-save','SAVE LOCAL');
    save.type='submit';
    var cancel=el('button','rico-show-cancel','CANCEL');
    cancel.type='button';
    actions.appendChild(save);actions.appendChild(cancel);form.appendChild(actions);
    var message=el('div','rico-show-message');
    message.setAttribute('aria-live','polite');
    form.appendChild(message);
    var edit=el('button','rico-show-add','EDIT STIL');
    edit.type='button';
    edit.disabled=true;
    edit.setAttribute('aria-expanded','false');
    section.appendChild(edit);
    section.appendChild(form);
    var original='';
    edit.addEventListener('click',function(){
      form.hidden=!form.hidden;
      edit.setAttribute('aria-expanded',String(!form.hidden));
      if(!form.hidden){
        var drafts=readDrafts(key);
        input.value=Object.prototype.hasOwnProperty.call(drafts.stilOverrides,path)
          ?drafts.stilOverrides[path]:original;
        input.focus();
      }
    });
    cancel.addEventListener('click',function(){
      form.hidden=true;edit.setAttribute('aria-expanded','false');
      message.textContent='';
    });
    form.addEventListener('submit',function(event){
      event.preventDefault();
      if(!key){message.textContent='ARTIST NOT IDENTIFIED';return;}
      var drafts=readDrafts(key),value=input.value;
      if(value===original)delete drafts.stilOverrides[path];
      else drafts.stilOverrides[path]=value;
      if(!saveDrafts(key,drafts)){message.textContent='SAVE LOCAL FAILED';return;}
      onSave();
    });
    loadStil(stilShard(path)).then(function(entries){
      if(token!==serial||!player.sidInfoVisible)return;
      var parent=path.slice(0,path.lastIndexOf('/')+1);
      var parts=[];
      if(entries[path])parts.push(entries[path]);
      if(entries[parent])parts.push('ARTIST NOTES\n'+entries[parent]);
      original=parts.join('\n\n').trim();
      edit.disabled=false;
      showText(original);
    }).catch(function(error){
      if(token!==serial)return;
      original='';
      edit.disabled=false;
      showText('');
      if(!Object.prototype.hasOwnProperty.call(readDrafts(key).stilOverrides,path))
        body.textContent='STIL UNAVAILABLE';
      console.warn('STIL lookup failed:',error);
    });
  }
  function addForm(section,kind,key,onSave){
    var labels={links:'ADD NEW LINK',csdb:'ADD CSDb',artwork:'ADD ARTWORK'};
    var open=el('button','rico-show-add',labels[kind]);
    open.type='button';open.setAttribute('aria-expanded','false');
    var form=el('form','rico-show-form');
    form.hidden=true;
    var title=null;
    if(kind!=='csdb'){
      title=el('input','rico-show-input');
      title.type='text';title.maxLength=100;title.required=true;
      title.placeholder=kind==='artwork'?'Artwork title':'Link title';
      title.setAttribute('aria-label',title.placeholder);
      form.appendChild(title);
    }
    var url=el('input','rico-show-input');
    url.type='url';url.required=true;url.maxLength=1200;
    url.placeholder=kind==='artwork'?'Image URL':'https://';
    url.setAttribute('aria-label',kind==='artwork'?'Artwork image URL':
      kind==='csdb'?'CSDb URL':'Link URL');
    form.appendChild(url);
    var buttons=el('div','rico-show-form-actions');
    var save=el('button','rico-show-save','SAVE LOCAL');save.type='submit';
    var cancel=el('button','rico-show-cancel','CANCEL');cancel.type='button';
    buttons.appendChild(save);buttons.appendChild(cancel);
    form.appendChild(buttons);
    var message=el('div','rico-show-message');
    message.setAttribute('aria-live','polite');
    form.appendChild(message);
    open.addEventListener('click',function(){
      form.hidden=!form.hidden;
      open.setAttribute('aria-expanded',String(!form.hidden));
      if(!form.hidden)(title||url).focus();
    });
    cancel.addEventListener('click',function(){
      form.hidden=true;open.setAttribute('aria-expanded','false');
      message.textContent='';
    });
    form.addEventListener('submit',function(event){
      event.preventDefault();
      var href=validURL(url.value,kind);
      if(!href){message.textContent=kind==='csdb'?'ENTER A VALID CSDb URL':'ENTER A VALID URL';return;}
      if(!key){message.textContent='ARTIST NOT IDENTIFIED';return;}
      var name=title?title.value.trim():'CSDb';
      if(!name){message.textContent='ENTER A TITLE';return;}
      var drafts=readDrafts(key);
      if(drafts[kind].some(function(v){return v.url===href;})){
        message.textContent='ALREADY ADDED';return;
      }
      drafts[kind].push({label:name,url:href});
      if(!saveDrafts(key,drafts)){message.textContent='SAVE LOCAL FAILED';return;}
      onSave();
    });
    section.appendChild(open);section.appendChild(form);
  }
  function buildCategory(hub,name,kind,key,onSave){
    var section=el('section','rico-show-section rico-show-'+kind);
    section.appendChild(sectionHeading(name));
    var list=el('div','rico-show-entries');
    readDrafts(key)[kind].forEach(function(item,index){
      var href=validURL(item.url,kind);
      if(!href)return;
      var row=el('div','rico-show-entry-row');
      if(kind==='artwork'){
        var art=el('div','rico-show-art');
        var image=el('img','rico-show-art-thumb');
        image.src=href;image.alt=item.label;image.loading='lazy';
        image.referrerPolicy='no-referrer';
        art.appendChild(image);art.appendChild(el('span','',item.label));
        row.appendChild(art);
      }else{
        var link=el('a','rico-show-link',item.label);
        link.href=href;link.target='_blank';link.rel='noopener noreferrer';
        row.appendChild(link);
      }
      var remove=el('button','rico-show-remove','×');
      remove.type='button';
      remove.title='Remove from local draft';
      remove.setAttribute('aria-label','Remove '+item.label);
      remove.addEventListener('click',function(){
        var drafts=readDrafts(key);
        drafts[kind].splice(index,1);
        if(saveDrafts(key,drafts))onSave();
      });
      row.appendChild(remove);list.appendChild(row);
    });
    section.appendChild(list);
    addForm(section,kind,key,onSave);
    hub.appendChild(section);
  }
  function artistLabel(entry){
    return String(entry&&entry.author||player.songInfo&&player.songInfo.songAuthor||
      'Unknown artist').trim().slice(0,120);
  }
  async function publish(key,label){
    var state=profiles.get(key);
    if(!key||!state||state.loading){
      messages.set(key,'CHECKING PROFILE');update();return;
    }
    if(state.unavailable){
      messages.set(key,'SERVER UPDATE REQUIRED · DRAFTS REMAIN LOCAL');
      update();return;
    }
    var profile=Object.assign({artistName:state.profile&&state.profile.artistName||label},readDrafts(key));
    if(!profile.links.length&&!profile.csdb.length&&!profile.artwork.length&&
       !Object.keys(profile.stilOverrides).length){
      messages.set(key,'ADD INFORMATION BEFORE PUBLISHING');update();return;
    }
    if(state.revision>0&&JSON.stringify(profile)===JSON.stringify(state.profile)){
      messages.set(key,'NO CHANGES TO REPUBLISH');update();return;
    }
    // Public writes are never attempted with a missing or unconfigured Worker.
    try{
      var capabilitiesResponse=await fetch(API_ROOT+'/capabilities',{cache:'no-store'});
      if(!capabilitiesResponse.ok)throw Error('SERVER UNAVAILABLE');
      var capabilities=await capabilitiesResponse.json();
      if(!capabilities.artistProfiles)throw Error('SERVER UPDATE REQUIRED');
    }catch(error){
      messages.set(key,error.message||'SERVER UPDATE REQUIRED');update();return;
    }
    var beta=window.prompt('BETA KEY required to '+(state.revision?'REPUBLISH':'PUBLISH')+' artist information:');
    if(beta===null)return;
    if(!beta){messages.set(key,'BETA KEY REQUIRED');update();return;}
    messages.set(key,'PUBLISHING');update();
    try{
      var response=await fetch(PROFILE_API,{
        method:state.revision?'PUT':'POST',
        headers:{'Content-Type':'application/json','X-Beta-Key':beta},
        body:JSON.stringify({format:'ricos-artist-profile',version:1,
          key:key,expectedRevision:state.revision,profile:profile})
      });
      if(!response.ok){
        var err=await response.json().catch(function(){return {};});
        throw Error(err.error||'PUBLISH FAILED ('+response.status+')');
      }
      var receipt=await response.json();
      if(receipt.format!=='ricos-artist-profile-receipt')throw Error('SAVE NOT VERIFIED');
      var check=await fetch(PROFILE_API+'?key='+encodeURIComponent(key),{cache:'no-store'});
      if(!check.ok)throw Error('SAVE NOT VERIFIED');
      var confirmed=await check.json();
      if(confirmed.revision!==receipt.revision||
         JSON.stringify(confirmed.profile)!==JSON.stringify(profile))
        throw Error('SAVE NOT VERIFIED; KEEP YOUR LOCAL DRAFT');
      profiles.set(key,{loading:false,revision:confirmed.revision,profile:confirmed.profile});
      try{localStorage.removeItem(DRAFT_PREFIX+key);}catch(error){}
      messages.set(key,state.revision?'REPUBLISHED · VERIFIED':'PUBLISHED · VERIFIED');
      if(player.sidInfoVisible&&currentArtistKey()===key)update();
    }catch(error){
      messages.set(key,error.message||'PUBLISH FAILED · LOCAL DRAFT PRESERVED');
      if(player.sidInfoVisible&&currentArtistKey()===key)update();
    }
  }
  function buildPublish(hub,key,label){
    var section=el('section','rico-show-publish-section');
    var state=profiles.get(key);
    var button=el('button','rico-show-publish-button',
      state&&state.revision>0?'REPUBLISH':'PUBLISH');
    button.type='button';
    button.disabled=!key||!!(state&&state.loading);
    button.addEventListener('click',function(){publish(key,label);});
    section.appendChild(button);
    var status=el('div','rico-show-publish-status',
      messages.get(key)||(!state||state.loading?'CHECKING PROFILE':
      state.revision>0?'PUBLIC PROFILE · LOCAL EDITS UNTIL REPUBLISH':
      'LOCAL DRAFTS · NOT PUBLISHED'));
    status.setAttribute('aria-live','polite');
    section.appendChild(status);
    hub.appendChild(section);
  }
  function update(){
    var token=++serial;
    if(!player.sidInfoVisible)return;
    var content=document.getElementById('sidInfoContent');
    if(!content)return;
    var entry=currentEntry(),path=getPath(entry),key=artistKey(entry,path);
    var scroll=content.scrollTop;
    var hub=el('div','rico-show-hub');
    function refresh(){
      var currentScroll=content.scrollTop;
      update();content.scrollTop=currentScroll;
    }
    buildCategory(hub,'LINKS','links',key,refresh);
    buildCategory(hub,'CSDb','csdb',key,refresh);
    buildCategory(hub,'ARTWORK','artwork',key,refresh);
    buildPublish(hub,key,artistLabel(entry));
    buildStil(hub,path,key,token,refresh);
    content.replaceChildren(hub);
    content.scrollTop=scroll;
    fetchProfile(key);
  }
  var originalDisplay=player.displaySongInfo;
  player.displaySongInfo=function(){
    var value=originalDisplay.apply(this,arguments);
    if(this.sidInfoVisible)update();
    return value;
  };
  var originalShow=player.showSIDInfo;
  player.showSIDInfo=function(visible){
    var result=originalShow.apply(this,arguments);
    if(visible)update();
    else serial++;
    return result;
  };
})();
