/* TEST223 — STIL in the existing SHOW panel. Metadata only. */
(function(){
  'use strict';
  var player=window.sidPlayer;
  if(!player)return;
  var cache=new Map(),serial=0;
  function getPath(entry){
    if(!entry)return null;
    var ref=entry._hvscRef || entry;
    if(!ref||ref.sidId||typeof ref.pack!=='string'||typeof ref.file!=='string')return null;
    var match=ref.pack.match(/^library\/packs\/(musicians|demos)\/([^/]+)\/(.+)\.zip$/i);
    if(!match||ref.file.includes('..')||ref.file.startsWith('/'))return null;
    var cat=match[1].toUpperCase(),section=match[3],file=ref.file;
    if(cat==='MUSICIANS')return '/MUSICIANS/'+match[2]+'/'+section+'/'+file;
    return '/DEMOS/'+match[2]+'/'+section+'/'+file;
  }
  function loadShard(name){
    if(!cache.has(name)){
      cache.set(name,fetch('library/stil/'+name+'.json')
        .then(function(r){if(!r.ok)throw Error('STIL data not available');return r.json();})
        .catch(function(e){cache.delete(name);throw e;}));
    }
    return cache.get(name);
  }
  function section(title,value){
    var container=document.createElement('div');
    container.className='sidInfoSection rico-stil-section';
    var heading=document.createElement('div');
    heading.className='sidInfoSectionHeading';
    heading.textContent=title;
    var body=document.createElement('div');
    body.className='rico-stil-text';
    body.textContent=value;
    container.appendChild(heading);
    container.appendChild(body);
    return container;
  }
  async function update(){
    var id=++serial;
    if(!player.sidInfoVisible)return;
    var content=document.getElementById('sidInfoContent');
    if(!content)return;
    var previous=content.querySelector('.rico-stil-wrap');
    if(previous)previous.remove();
    var entry=player.sidList && typeof player.sidListIndex==='number'
      ? player.sidList[player.sidListIndex]:null;
    var path=getPath(entry);
    if(!path)return;
    var wrap=document.createElement('div');
    wrap.className='rico-stil-wrap';
    wrap.appendChild(section('STIL','LOADING'));
    content.appendChild(wrap);
    try{
      var parts=path.split('/');
      var shard=(parts[1]==='MUSICIANS'?'musicians-'+parts[2].toUpperCase():'demos-all');
      var entries=await loadShard(shard);
      if(id!==serial||!player.sidInfoVisible)return;
      wrap.replaceChildren();
      var parent=path.slice(0,path.lastIndexOf('/')+1);
      if(entries[parent])wrap.appendChild(section('STIL / ARTIST',entries[parent]));
      if(entries[path])wrap.appendChild(section('STIL / TRACK',entries[path]));
      if(!wrap.childNodes.length)wrap.appendChild(section('STIL','NO ENTRY'));
    }catch(error){
      if(id!==serial)return;
      wrap.replaceChildren(section('STIL','DATABASE UNAVAILABLE'));
      console.warn('STIL metadata unavailable:',error);
    }
  }
  var display=player.displaySongInfo;
  player.displaySongInfo=function(){
    var result=display.apply(this,arguments);
    if(this.sidInfoVisible)update();
    return result;
  };
  var show=player.showSIDInfo;
  player.showSIDInfo=function(visible){
    var result=show.apply(this,arguments);
    if(visible)update();
    else serial++;
    return result;
  };
})();
