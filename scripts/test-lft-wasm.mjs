// TEST173: Node 22 real WebAssembly smoke test for HVSC LFT tracks.
// No network, no C64 ROMs, no changes to the public SpotySid site.
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { SidAudioEngine } from '../js/lft-wasm/index.js';

const pack = await readFile(new URL('../library/packs/musicians/L/Lft.zip', import.meta.url));
function trackBytes(filename) {
  let eocd = -1;
  for (let p=pack.length-22;p>=Math.max(0,pack.length-65558);p--) {
    if(pack.readUInt32LE(p)===0x06054b50){eocd=p;break;}
  }
  assert.ok(eocd>=0,'ZIP central directory');
  let ptr=pack.readUInt32LE(eocd+16), count=pack.readUInt16LE(eocd+10);
  for(let i=0;i<count;i++){
    assert.equal(pack.readUInt32LE(ptr),0x02014b50);
    const namelen=pack.readUInt16LE(ptr+28),extra=pack.readUInt16LE(ptr+30),comment=pack.readUInt16LE(ptr+32);
    const name=pack.subarray(ptr+46,ptr+46+namelen).toString('utf8');
    if(name===filename){
      const off=pack.readUInt32LE(ptr+42),method=pack.readUInt16LE(ptr+10),
        compressed=pack.readUInt32LE(ptr+20),originalSize=pack.readUInt32LE(ptr+24);
      assert.equal(pack.readUInt32LE(off),0x04034b50);
      let at=off+30+pack.readUInt16LE(off+26)+pack.readUInt16LE(off+28);
      const encoded=pack.subarray(at,at+compressed);
      const decoded=method===8?inflateRawSync(encoded):encoded;
      assert.equal(decoded.length,originalSize);
      const header=decoded.subarray(0,4).toString('ascii');
      assert.ok(header==='PSID'||header==='RSID');
      const dataOffset=decoded.readUInt16BE(6);
      assert.ok(dataOffset>=118&&dataOffset+2<=decoded.length,'safe SID data offset');
      return new Uint8Array(decoded);
    }
    ptr+=46+namelen+extra+comment;
  }
  throw new Error('SID not found '+filename);
}
function allLftNames(){
  let p=-1;
  for(let i=pack.length-22;i>=Math.max(0,pack.length-65558);i--){
    if(pack.readUInt32LE(i)===0x06054b50){p=pack.readUInt32LE(i+16);break;}
  }
  assert.ok(p>=0,'ZIP directory');
  const count=pack.readUInt16LE(pack.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]))+10);
  const names=[];
  for(let i=0;i<count;i++){
    assert.equal(pack.readUInt32LE(p),0x02014b50);
    const len=pack.readUInt16LE(p+28),ext=pack.readUInt16LE(p+30),comment=pack.readUInt16LE(p+32);
    const name=pack.subarray(p+46,p+46+len).toString('utf8');
    if(name.toLowerCase().endsWith('.sid'))names.push(name);
    p+=46+len+ext+comment;
  }
  return names;
}

const engine=new SidAudioEngine({engine:'residfp',sampleRate:44100,stereo:false,cacheSecondsLimit:2});
try{
  const name=await engine.getEngineName();
  assert.equal(name,'WasmReSIDfp');
  const required=['Nine.sid','Rodents_in_the_Attic.sid'];
  const additional=['Computational_Soup_2KB.sid','Quondam_Tunneling.sid'];
  const all=allLftNames();
  assert.equal(all.length,66,'The original HVSC Lft.zip has 66 SIDs');
  const ordered=[...required,...additional,...all.filter(x=>!required.includes(x)&&!additional.includes(x))];
  const results=[];
  for(const title of ordered){
    try{
      const bytes=trackBytes(title);
      await engine.loadSidBuffer(bytes);
      let squared=0,peak=0,nonzero=0,total=0;
      for(let i=0;i<35;i++){
        const samples=await engine.renderFrames(4096);
        assert.ok(samples instanceof Int16Array,'PCM Int16 expected');
        for(const sample of samples){
          const value=sample/32768;
          squared+=value*value;total++;
          peak=Math.max(peak,Math.abs(value));
          if(sample!==0)nonzero++;
        }
      }
      const rms=Math.sqrt(squared/total);
      const audible=nonzero>1000&&rms>0.0001;
      console.log(JSON.stringify({title,pcmFrames:total,nonzero,peak,rms,audible,engine:name}));
      results.push({title,audible,status:'rendered'});
      if(required.includes(title)){
        assert.ok(total>100000,'Insufficient PCM for '+title);
        assert.ok(audible,'Required LFT tune rendered silent: '+title);
      }
    }catch(error){
      if(required.includes(title))throw error;
      results.push({title,audible:false,status:'error',reason:String(error.message||error)});
      console.warn('LFT OPTIONAL TUNE ERROR: '+title+': '+String(error.message||error));
    }
  }
  console.log('LFT FULL SWEEP SUMMARY '+JSON.stringify({tested:results.length,
    audible:results.filter(x=>x.audible).length,
    silent:results.filter(x=>!x.audible&&x.status==='rendered').map(x=>x.title),
    errors:results.filter(x=>x.status==='error')}));
  assert.equal(results.length,66);
  console.log('TEST173: required Nine/Rodents audio PASS; full HVSC LFT corpus classified.');
}finally{
  engine.dispose();
}
