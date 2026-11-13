/* TEST225 — Compact artist contributions in the existing SHOW sidebar.
   STIL remains read-only. Contributions are local drafts, not publications. */
(function(){
  'use strict';
  var player=window.sidPlayer;
  if(!player)return;
  var stilCache=new Map(),serial=0;
  var DRAFT_PREFIX='spotysid:artist-drafts:v1:';

  function element(tag,className,text){
    var node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined&&text!==null)node.textContent=String(text);
    return node;
  }
  function getPath(entry){
    if(!entry)return null;
    var ref=entry._hvscRef||entry;
    if(!ref||ref.sidId||typeof ref.pack!=='string'||typeof ref.file!=='string')return null;
    var match=ref.pack.match(/^library\/packs\/(musicians|demos)\/([^/]+)\/(.+)\.zip$/i);
    if(!match||ref.file.includes('..')||ref.file.startsWith('/'))return null;
    // Musician packs retain the canonical HVSC folder. Demo shelves are
    // aggregates, so their filenames cannot safely be used as STIL paths.
    if(match[1].toLowerCase()!=='musicians')return null;
    return '/MUSICIANS/'+match[2]+'/'+match[3]+'/'+ref.file;
  }
  function artistKey(entry,path){
    if(path){
      var folder=path.slice(0,path.lastIndexOf('/'));
      return 'hvsc:'+folder;
    }
    var artist=String(entry&&entry.author||player.songInfo&&player.songInfo.songAuthor||'').trim().toLowerCase();
    return artist&&artist!=='unknown artist'?'artist:'+artist:null;
  }
  function emptyDrafts(){return {links:[],csdb:[],artwork:[]};}
  function readDrafts(key){
    if(!key)return emptyDrafts();
    try{
      var stored=JSON.parse(localStorage.getItem(DRAFT_PREFIX+key)||'null');
      var result=emptyDrafts();
      Object.keys(result).forEach(function(k){
        if(stored&&Array.isArray(stored[k])){
          result[k]=stored[k].filter(function(v){
            return v&&typeof v.url==='string'&&typeof v.label==='string';
          });
        }
      });
      return result;
    }catch(err){return emptyDrafts();}
  }
  function saveDrafts(key,drafts){
    if(!key)return false;
    try{localStorage.setItem(DRAFT_PREFIX+key,JSON.stringify(drafts));return true;}
    catch(err){return false;}
  }
  function validURL(value,kind){
    try{
      var url=new URL(String(value||'').trim());
      if(url.protocol!=='https:'&&url.protocol!=='http:')return null;
      if(url.username||url.password)return null;
      if(kind==='csdb'&&!/^(?:www\.)?csdb\.dk$/i.test(url.hostname))return null;
      return url.href;
    }catch(err){return null;}
  }
  function stilShard(path){
    var p=path.split('/');
    return p[1]==='MUSICIANS'?'musicians-'+p[2].toUpperCase():'demos-all';
  }
  function loadStil(name){
    if(!stilCache.has(name)){
      stilCache.set(name,fetch('library/stil/'+name+'.json')
        .then(function(r){if(!r.ok)throw Error('STIL data unavailable');return r.json();})
        .catch(function(err){stilCache.delete(name);throw err;}));
    }
    return stilCache.get(name);
  }

  function heading(name){
    return element('div','rico-show-heading',name);
  }
  function buildStil(hub,path,token){
    var section=element('section','rico-show-section rico-show-stil');
    section.appendChild(heading('STIL'));
    var body=element('div','rico-show-stil-copy',path?'LOADING':'NO HVSC REFERENCE');
    section.appendChild(body);
    hub.appendChild(section);
    if(!path)return;
    loadStil(stilShard(path)).then(function(entries){
      if(token!==serial||!player.sidInfoVisible)return;
      var parent=path.slice(0,path.lastIndexOf('/')+1);
      var parts=[];
      if(entries[path])parts.push(entries[path]);
      if(entries[parent])parts.push('ARTIST NOTES\n'+entries[parent]);
      var full=parts.join('\n\n').trim();
      if(!full){body.textContent='NO STIL ENTRY';return;}
      // TEST227: full STIL text; the existing sidebar scrollbar handles overflow.
      body.textContent=full;
    }).catch(function(err){
      if(token!==serial)return;
      body.textContent='STIL UNAVAILABLE';
      console.warn('STIL lookup failed:',err);
    });
  }

  function addForm(section,kind,key,onSave){
    var names={links:'ADD NEW LINK',csdb:'ADD CSDb',artwork:'ADD ARTWORK'};
    var button=element('button','rico-show-add',names[kind]);
    button.type='button';
    button.setAttribute('aria-expanded','false');
    var form=element('form','rico-show-form');
    form.hidden=true;
    var label=null;
    if(kind!=='csdb'){
      label=element('input','rico-show-input');
      label.type='text';
      label.placeholder=kind==='artwork'?'Artwork title':'Link title';
      label.setAttribute('aria-label',label.placeholder);
      label.required=true;
      form.appendChild(label);
    }
    var input=element('input','rico-show-input');
    input.type='url';
    input.placeholder=kind==='artwork'?'Image URL':'https://';
    input.setAttribute('aria-label',kind==='artwork'?'Artwork image URL':kind==='csdb'?'CSDb URL':'Link URL');
    input.required=true;
    form.appendChild(input);
    var controls=element('div','rico-show-form-actions');
    var save=element('button','rico-show-save','SAVE LOCAL');
    save.type='submit';
    var cancel=element('button','rico-show-cancel','CANCEL');
    cancel.type='button';
    controls.appendChild(save);
    controls.appendChild(cancel);
    form.appendChild(controls);
    var message=element('div','rico-show-message');
    message.setAttribute('aria-live','polite');
    form.appendChild(message);
    button.addEventListener('click',function(){
      form.hidden=!form.hidden;
      button.setAttribute('aria-expanded',String(!form.hidden));
      if(!form.hidden)(label||input).focus();
    });
    cancel.addEventListener('click',function(){
      form.hidden=true;
      button.setAttribute('aria-expanded','false');
      message.textContent='';
    });
    form.addEventListener('submit',function(event){
      event.preventDefault();
      var url=validURL(input.value,kind);
      if(!url){message.textContent=kind==='csdb'?'ENTER A VALID CSDb URL':'ENTER A VALID URL';return;}
      if(!key){message.textContent='ARTIST NOT IDENTIFIED';return;}
      var name=label?label.value.trim():'CSDb';
      if(!name){message.textContent='ENTER A TITLE';return;}
      var drafts=readDrafts(key);
      if(drafts[kind].some(function(item){return item.url===url;})){
        message.textContent='ALREADY ADDED';return;
      }
      drafts[kind].push({label:name,url:url});
      if(!saveDrafts(key,drafts)){
        message.textContent='COULD NOT SAVE LOCAL DRAFT';return;
      }
      onSave();
    });
    section.appendChild(button);
    section.appendChild(form);
  }
  function buildCategory(hub,name,kind,key,onSave){
    var section=element('section','rico-show-section rico-show-'+kind);
    section.appendChild(heading(name));
    var drafts=readDrafts(key)[kind];
    var entries=element('div','rico-show-entries');
    drafts.forEach(function(item){
      var url=validURL(item.url,kind);
      if(!url)return;
      if(kind==='artwork'){
        var art=element('div','rico-show-art');
        var thumbnail=element('img','rico-show-art-thumb');
        thumbnail.src=url;
        thumbnail.alt=item.label;
        thumbnail.loading='lazy';
        thumbnail.referrerPolicy='no-referrer';
        art.appendChild(thumbnail);
        art.appendChild(element('span','',item.label));
        entries.appendChild(art);
      }else{
        var a=element('a','rico-show-link',item.label);
        a.href=url;
        a.target='_blank';
        a.rel='noopener noreferrer';
        entries.appendChild(a);
      }
    });
    section.appendChild(entries);
    addForm(section,kind,key,onSave);
    hub.appendChild(section);
  }

  function update(){
    var token=++serial;
    if(!player.sidInfoVisible)return;
    var content=document.getElementById('sidInfoContent');
    if(!content)return;
    var entry=player.sidList&&typeof player.sidListIndex==='number'
      ?player.sidList[player.sidListIndex]:null;
    var path=getPath(entry);
    var key=artistKey(entry,path);
    var scroll=content.scrollTop;
    var hub=element('div','rico-show-hub');
    function refresh(){var currentScroll=content.scrollTop;update();content.scrollTop=currentScroll;}
    buildCategory(hub,'LINKS','links',key,refresh);
    buildCategory(hub,'CSDb','csdb',key,refresh);
    buildCategory(hub,'ARTWORK','artwork',key,refresh);
    var note=element('div','rico-show-draft-note','LOCAL DRAFTS · NOT PUBLISHED');
    hub.appendChild(note);
    buildStil(hub,path,token);
    content.replaceChildren(hub);
    content.scrollTop=scroll;
  }
  var originalDisplay=player.displaySongInfo;
  player.displaySongInfo=function(){
    var value=originalDisplay.apply(this,arguments);
    if(this.sidInfoVisible)update();
    return value;
  };
  var originalShow=player.showSIDInfo;
  player.showSIDInfo=function(visible){
    var value=originalShow.apply(this,arguments);
    if(visible)update();
    else serial++;
    return value;
  };
})();
