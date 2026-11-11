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
for(const title of ['Nine.sid','Rodents_in_the_Attic.sid','A_Chipful_of_Love_for_You.sid','Cherry_Waffle.sid']){
  const orig=new SidAudioEngine({engine:'residfp',sampleRate:44100,stereo:false,cacheSecondsLimit:2});
  const scope=new SidAudioEngine({engine:'residfp',sampleRate:44100,stereo:false,cacheSecondsLimit:2});
  try{
    const bytes=getSid(title);
    await orig.loadSidBuffer(bytes);await scope.loadSidBuffer(bytes);
    let firstMismatch=-1,totalSamples=0,scopeReads=0;
    for(let k=0;k<7;k++){
      const reference=await orig.renderFrames(4096);
      const pieces=[];
      for(let p=0;p<4;p++){
        const chunk=await scope.renderFrames(1024);
        assert.equal(chunk.length,1024);
        pieces.push(chunk);
        const status=scope.getSidStatus(0);
        assert.ok(status instanceof Uint8Array&&status.length>=25);
        scopeReads++;
      }
      const actual=new Int16Array(4096);
      for(let p=0;p<4;p++)actual.set(pieces[p],p*1024);
      assert.equal(reference.length,actual.length);
      for(let n=0;n<reference.length;n++)
        if(firstMismatch<0&&reference[n]!==actual[n])firstMismatch=k*4096+n;
      totalSamples+=reference.length;
    }
    console.log('TEST178 PCM '+JSON.stringify({title,samples:totalSamples,
      registerSnapshots:scopeReads,firstMismatch,unchanged:firstMismatch<0}));
    assert.equal(firstMismatch,-1,'Waveform polling changed mixed PCM for '+title);
  }finally{orig.dispose();scope.dispose();}
}
console.log('TEST178 bit-exact mixed PCM PASS for 4096 vs 4×1024 rendering.');
