// TEST178: smaller waveform-register polling chunks must not alter reSIDfp audio.
import {readFile} from 'node:fs/promises';
import {inflateRawSync} from 'node:zlib';
import {SidAudioEngine} from '../lft-test/lft-wasm/index.js';
import assert from 'node:assert/strict';
const zip=await readFile(new URL('../library/packs/musicians/L/Lft.zip',import.meta.url));
function getSid(filename){
 let end=-1;
 for(let p=zip.length-22;p>=Math.max(0,zip.length-65558);p--)
   if(zip.readUInt32LE(p)===0x06054b50){end=p;break;}
 assert.ok(end>=0);
 let p=zip.readUInt32LE(end+16),remaining=zip.readUInt16LE(end+10);
 while(remaining--){
   assert.equal(zip.readUInt32LE(p),0x02014b50);
   const nameLen=zip.readUInt16LE(p+28),extra=zip.readUInt16LE(p+30),comment=zip.readUInt16LE(p+32);
   const name=zip.subarray(p+46,p+46+nameLen).toString();
   if(name===filename){
     const local=zip.readUInt32LE(p+42);
     const offset=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28);
     const size=zip.readUInt32LE(p+20),method=zip.readUInt16LE(p+10);
     const packed=zip.subarray(offset,offset+size);
     return new Uint8Array(method===8?inflateRawSync(packed):packed);
   }
   p+=46+nameLen+extra+comment;
 }
 throw Error('Not found '+filename);
}
// The audible PCM uses exactly the original 4096-frame render path.
// Reading SID register snapshots for the *visualizer* must not advance
// the emulator or alter the owned PCM Int16Array.
for(const title of ['Nine.sid','Rodents_in_the_Attic.sid',
  'A_Chipful_of_Love_for_You.sid','Cherry_Waffle.sid']){
  const engine=new SidAudioEngine({engine:'residfp',sampleRate:44100,
    stereo:false,cacheSecondsLimit:2});
  try{
    await engine.loadSidBuffer(getSid(title));
    let total=0,nonzero=0,visReads=0;
    for(let k=0;k<7;k++){
      const pcm=await engine.renderFrames(4096);
      assert.equal(pcm.length,4096);
      const saved=pcm.slice();
      const time=engine.context.getTimeMs();
      const regs=engine.getSidStatus(0);
      assert.ok(regs instanceof Uint8Array&&regs.length>=25);
      assert.equal(engine.context.getTimeMs(),time,
        'Reading voice registers advanced SID timing');
      assert.deepEqual(pcm,saved,'Register reading modified mixed PCM samples');
      total+=pcm.length;visReads++;
      for(const sample of pcm)if(sample)nonzero++;
    }
    assert.ok(nonzero>1000);
    console.log('TEST178 audio unchanged '+JSON.stringify({title,frames:total,
      sidRegisterPolls:visReads,nonzero,pcmFrameSize:4096}));
  }finally{engine.dispose();}
}
console.log('TEST178 PASS: original 4096-frame PCM, read-only SID status for waveform visualization.');
