// TEST173 real Chromium smoke: SpotySid LFT adapter and local WASM together.
// This runs only on the isolated branch, never against the public live player.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const pack=await readFile(resolve(root,'library/packs/musicians/L/Lft.zip'));
function nineBytes(){
  let end=-1;
  for(let i=pack.length-22;i>=Math.max(0,pack.length-65558);i--)
    if(pack.readUInt32LE(i)===0x06054b50){end=i;break;}
  assert.ok(end>=0);
  let p=pack.readUInt32LE(end+16),n=pack.readUInt16LE(end+10);
  while(n--){
    const len=pack.readUInt16LE(p+28),extra=pack.readUInt16LE(p+30),comment=pack.readUInt16LE(p+32);
    const name=pack.subarray(p+46,p+46+len).toString();
    if(name==='Nine.sid'){
      const at=pack.readUInt32LE(p+42);
      const start=at+30+pack.readUInt16LE(at+26)+pack.readUInt16LE(at+28);
      return [...inflateRawSync(pack.subarray(start,start+pack.readUInt32LE(p+20)))];
    }
    p+=46+len+extra+comment;
  }
  throw new Error('Nine not found');
}
const server=createServer(async(req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://local').pathname);
    const filepath=resolve(root,'.'+(name==='/'?'/index.html':name));
    if(filepath!==root&&!filepath.startsWith(root+sep)){res.writeHead(403).end();return;}
    const body=await readFile(filepath),extension=extname(filepath);
    const mime={'.html':'text/html','.js':'text/javascript','.wasm':'application/wasm',
      '.json':'application/json','.css':'text/css','.zip':'application/zip'}[extension]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache'}).end(body);
  }catch(error){res.writeHead(404).end(String(error.message||error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  const remote='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const mixed='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const target='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const packIndex=JSON.parse(await readFile(resolve(root,'library/data/musicians-L.json'),'utf8'));
  const lft=packIndex.sections.find(s=>s.name==='Lft');
  const normal=packIndex.sections.find(s=>s.name==='LDX40');
  assert.equal(lft.tracks.length,66);
  const makeRef=(pack,track)=>({pack,file:track.file,title:track.title,artist:track.author});
  const lftRefs=lft.tracks.map(t=>makeRef(lft.pack,t));
  const nine=lftRefs.find(x=>x.file==='Nine.sid');
  const rodents=lftRefs.find(x=>x.file==='Rodents_in_the_Attic.sid');
  assert.ok(nine&&rodents);
  const ordinary=makeRef(normal.pack,normal.tracks[0]);
  const data={
    [remote]:{format:'ricos-sid-playlist',version:2,name:'LFT',createdBy:'RICO',tracks:lftRefs},
    [mixed]:{format:'ricos-sid-playlist',version:2,name:'MIXED TEST',createdBy:'RICO',
      tracks:[nine,ordinary,rodents]},
    [target]:{format:'ricos-sid-playlist',version:2,name:'MY TEST LIST',createdBy:'RICO',
      tracks:[ordinary]}
  };
  const base='https://ricos-sid-community.serigrafiamdp.workers.dev';
  const cors={'access-control-allow-origin':'*','cache-control':'no-store'};
  await page.route(base+'/playlists',route=>route.fulfill({status:200,headers:cors,
    contentType:'application/json',body:JSON.stringify({
      format:'ricos-community-catalog',version:1,
      playlists:Object.entries(data).map(([id,x])=>({id,title:x.name,createdBy:x.createdBy,tracks:x.tracks.length}))
    })}));
  for(const [id,obj] of Object.entries(data)){
    await page.route(base+'/playlists/'+id,route=>route.fulfill({status:200,headers:cors,
      contentType:'application/json',body:JSON.stringify(obj)}));
  }
  await page.goto('http://127.0.0.1:'+port+'/lft-test/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.RicoLftMode&&!!window.sidPlayer&&!!window.SID,{timeout:30000});
  await page.waitForTimeout(450);
  const auto=await page.evaluate(()=>({
    playing:window.sidPlayer.isPlaying,active:window.RicoLftMode.active(),
    autoLFT:!!window.__ricoLftTestOpened,
    title:document.getElementById('ricoLivePlaylistTitle')?.textContent
  }));
  assert.equal(auto.active,false,'LFT activated at startup unexpectedly');
  assert.equal(auto.autoLFT,false,'LFT playlist automatically opened');
  const nativeSaved=await page.evaluate(()=>{
    window.__test177NativeCompute=window.SID.computeAudioSamples;
    return typeof window.__test177NativeCompute==='function';
  });
  assert.ok(nativeSaved);
  const mixRow=page.locator('.rico-community-catalog-row').filter({hasText:'MIXED TEST — Playlist by RICO'});
  await mixRow.getByRole('button',{name:'PLAY',exact:true}).click({timeout:30000});
  await page.waitForFunction(()=>window.sidPlayer?.sidList?.length===3&&
    window.RicoLftMode?.playingApproved(),null,{timeout:45000});
  const first=await page.evaluate(()=>({
    index:window.sidPlayer.sidListIndex,title:document.getElementById('ricoLivePlaylistTitle')?.textContent,
    active:window.RicoLftMode.active(),playing:window.sidPlayer.isPlaying
  }));
  assert.equal(first.index,0);
  assert.ok(first.title.includes('LFT MODE ON'),'No LFT MODE ON marker for mixed list');
  // TEST178: the old bridge returned the *mixed* PCM as voice 1 and
  // hardcoded silence for 2 and 3. All three should now expose their
  // own non-identical and comfortably bounded SID-register-driven traces.
  const sampleScope=async()=>{
    return page.evaluate(()=>{
      const sid=window.SID,win=window.sidPlayer;
      const traces=[1,2,3].map(channel=>{
        const buffer=sid.getChannelBuffer(channel),values=[];
        for(let i=0;i<1764;i+=4)values.push(sid.readFloatSample(buffer,i));
        const peak=Math.max(...values.map(Math.abs));
        const nonzero=values.filter(v=>Math.abs(v)>0.0001).length;
        return {buffer,peak,nonzero,values};
      });
      let mixPeak=0;
      const pcm=sid.getResampleBuffer();
      for(const value of pcm)mixPeak=Math.max(mixPeak,Math.abs(value));
      return {traces,pcmPeak:mixPeak,visual4:
        sid.readFloatSample(sid.getChannelBuffer(4),128),
        mode:win.oscilloscopeMode};
    });
  };
  let scopeSamples=[];
  for(let n=0;n<30;n++){
    const snap=await sampleScope();scopeSamples.push(snap);
    if(snap.traces.every(t=>t.nonzero>20))break;
    await page.waitForTimeout(120);
  }
  const visual=scopeSamples.at(-1);
  const visualSummary={
    ...visual,traces:visual.traces.map(({buffer,peak,nonzero})=>({buffer,peak,nonzero}))
  };
  console.log('TEST178 three LFT SID waveforms '+JSON.stringify(visualSummary));
  assert.deepEqual(visual.traces.map(t=>t.buffer),[-101,-102,-103],
    'All three visual channels must have distinct buffer handles');
  assert.ok(visual.traces.every(t=>t.nonzero>20&&t.peak>0.0001&&t.peak<0.035),
    'SID voice trace is missing, too small or overdrawn');
  assert.ok(visual.traces.some((t,i)=>i>0&&t.values.some((v,j)=>
    Math.abs(v-visual.traces[0].values[j])>0.001)),
    'All SID voices seem to be copies of the same mixed output');
  assert.equal(visual.visual4,0,'Do not activate a fake fourth digi channel');
  assert.ok(visual.pcmPeak>0.001,'Unaltered reSIDfp mixed PCM must remain audible');
  // A currently playing LFT track can be added to a different published list.
  // The CHOOSE A SID dialog overlays the floating playlist until dismissed.
  if(await page.locator('#chooseSidDialog').isVisible())
    await page.locator('#chooseSidClose').click();
  await page.locator('#ricoRemixTarget').selectOption('published:'+target);
  await page.waitForFunction(()=>document.getElementById('ricoLiveStatus')?.textContent.includes('MY TEST LIST'),null,{timeout:30000});
  await page.locator('.rico-live-edit-row .rico-live-add').first().click();
  await page.waitForFunction(()=>document.getElementById('ricoLiveStatus')?.textContent.includes('Added'),null,{timeout:30000});
  const addStatus=await page.locator('#ricoLiveStatus').innerText();
  assert.ok(/Added/.test(addStatus)&&/MY TEST LIST/.test(addStatus));
  // Native SID follows after the existing five-second transition.
  await page.evaluate(()=>window.sidPlayer.nextSid());
  await page.waitForFunction(()=>window.sidPlayer?.sidListIndex===1&&
    !window.RicoLftMode.active()&&window.sidPlayer.isPlaying,null,{timeout:25000});
  const normalState=await page.evaluate(()=>({
    index:window.sidPlayer.sidListIndex,active:window.RicoLftMode.active(),
    nativeRestored:window.SID.computeAudioSamples===window.__test177NativeCompute,
    title:document.getElementById('ricoLivePlaylistTitle')?.textContent
  }));
  assert.equal(normalState.nativeRestored,true,'Original TinySID not restored on normal song');
  assert.ok(!normalState.title.includes('LFT MODE ON'),'LFT title persists for normal song');
  await page.evaluate(()=>window.sidPlayer.nextSid());
  await page.waitForFunction(()=>window.sidPlayer?.sidListIndex===2&&
    window.RicoLftMode.playingApproved(),null,{timeout:25000});
  const last=await page.evaluate(()=>({
    index:window.sidPlayer.sidListIndex,active:window.RicoLftMode.active(),
    title:document.getElementById('ricoLivePlaylistTitle')?.textContent
  }));
  assert.ok(last.title.includes('LFT MODE ON'));
  console.log('TEST177 '+JSON.stringify({startup:auto,first,addStatus,normalState,last,errors}));
  assert.equal(errors.filter(x=>/lft|wasm|reSID|TypeError/i.test(x)).length,0,
    'Browser errors: '+errors.join('; '));
  console.log('TEST177 PASS: no auto-open; + copies LFT HVSC ref; mixed list switches LFT/TinySID/LFT');
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
