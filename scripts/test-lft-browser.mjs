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
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!(window.RicoLftMode&&window.sidPlayer&&window.SID),{timeout:30000});
  const remoteId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const result=await page.evaluate(async({bytes,remoteId})=>{
    const p=window.sidPlayer, backend=window.SID, native=backend.computeAudioSamples;
    p.initWebAudio();
    p.sidList=[{name:'Nine',file:'Nine.sid'}];p.sidListIndex=0;
    p.autoAdvance=false;
    const list={format:'ricos-sid-playlist',version:2,name:'LFT',createdBy:'RICO',
      tracks:[{pack:'library/packs/musicians/L/Lft.zip',file:'Nine.sid'}]};
    const ready=await window.RicoLftMode.prepare(list,remoteId);
    if(!ready)return {ready:false,error:document.getElementById('ricoLiveStatus')?.textContent};
    p.loadSIDData(new Uint8Array(bytes));
    for(let i=0;i<100&&!p.isPlaying;i++)await new Promise(resolve=>setTimeout(resolve,25));
    let peak=0,pcmFrames=0;
    for(let i=0;i<12;i++){
      backend.computeAudioSamples();
      const buf=backend.getResampleBuffer();
      for(const sample of buf){peak=Math.max(peak,Math.abs(sample));pcmFrames++;}
      if(peak>.001)break;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    window.RicoLftMode.deactivate();
    return {ready,playing:p.isPlaying,peak,pcmFrames,
      restored:backend.computeAudioSamples===native,
      afterActive:window.RicoLftMode.active()};
  },{bytes:nineBytes(),remoteId});
  console.log('TEST173 Chromium LFT '+JSON.stringify(result));
  assert.equal(result.ready,true,'LFT local WASM did not initialize');
  assert.ok(result.peak>0.001,'No nonzero PCM from actual Chromium SID adapter');
  assert.equal(result.restored,true,'TinySID native callback not restored');
  assert.equal(result.afterActive,false,'LFT adapter did not deactivate');
  assert.ok(!errors.some(x=>/LFT|WASM|sidplayfp/i.test(x)),
    'LFT-specific browser page errors: '+errors.join('; '));
  console.log('TEST173 Chromium PASS: LFT-only reSIDfp PCM & native restoration');
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
