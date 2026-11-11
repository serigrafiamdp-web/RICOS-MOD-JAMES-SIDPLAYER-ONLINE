// TEST179 — extra group release-credit index for SpotySid HVSC #85.
// Only exact group names independently present in the CSDb TOP 100 GROUPS
// ranking are eligible. Do not invent group memberships from musicians.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const project=process.cwd();
const read=async p=>JSON.parse(await readFile(path.join(project,p),'utf8'));
const manifest=await read('library/index.json');
assert.equal(manifest.format,'ricos-hvsc-library');
const ranking=await read('community/curation/csdb-groups-ranking-2026-11.json');
assert.equal(ranking.items.length,100);
const norm=name=>String(name||'').normalize('NFKC').trim()
  .replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const groups=new Map();
for(const item of ranking.items){
  const name=String(item.title||'').trim();
  const key=norm(name);
  assert.ok(name&&key);
  assert.ok(!groups.has(key),'Duplicate ranked group '+name);
  groups.set(key,{name,tracks:new Map()});
}
const shelves=[...manifest.categories.musicians.shelves,
  ...manifest.categories.demos.shelves];
let inspected=0,matched=0,skipped=0;
for(const shelf of shelves){
  const data=await read(shelf.file);
  assert.ok(Array.isArray(data.sections));
  for(const section of data.sections){
    if(!Array.isArray(section.tracks)||!section.tracks.length)continue;
    for(const tune of section.tracks){
      inspected++;
      // PSID/RSID "released" is a credit, not a CSDb release ID.
      // A group is associated *only* when the credit exactly matches
      // a group already known and named in CSDb's ranking.
      const credit=String(tune.released||'')
        .replace(/^\s*\d{2}[\d?]{2}(?:-\d{2,4})?\s+/,'').trim();
      const group=groups.get(norm(credit));
      if(!group)continue;
      const pack=tune.pack||section.pack;
      if(!pack||!tune.file){skipped++;continue;}
      const key=pack+'::'+tune.file;
      if(group.tracks.has(key))continue;
      group.tracks.set(key,{
        pack:pack,file:tune.file,title:tune.title||tune.file,
        author:tune.author||'',released:tune.released||'',bytes:tune.bytes||0
      });
      matched++;
    }
  }
}
const buckets=new Map();
let attributedGroups=0;
for(const g of groups.values()){
  if(!g.tracks.size)continue;
  attributedGroups++;
  const letter=/^[A-Z]/i.test(g.name)?g.name[0].toUpperCase():'0-9';
  if(!buckets.has(letter))buckets.set(letter,[]);
  const tracks=[...g.tracks.values()].sort((a,b)=>
    a.title.localeCompare(b.title,'en',{sensitivity:'base'})||
    a.file.localeCompare(b.file));
  buckets.get(letter).push({name:g.name,tracks});
}
const order=['0-9',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const dir=path.join(project,'library','groups');
await mkdir(dir,{recursive:true});
const shelfIndex=[];
for(const letter of order){
  const sections=buckets.get(letter);
  if(!sections||!sections.length)continue;
  sections.sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
  const name=letter==='0-9'?'0-9':letter;
  const relative='library/groups/groups-'+name+'.json';
  const count=sections.reduce((n,s)=>n+s.tracks.length,0);
  const data={category:'groups',shelf:name,sections};
  await writeFile(path.join(project,relative),JSON.stringify(data)+'\n');
  shelfIndex.push({name,file:relative,count,groups:sections.length});
}
const index={format:'ricos-hvsc-groups',version:1,
 source:'HVSC #85 (explicit PSID release credit) + CSDb TOP 100 GROUPS',
 scope:'Only exact release-credit matches to known CSDb group names. Not a complete CSDb or HVSC group affiliation catalog.',
 groups:{count:matched,totalGroups:attributedGroups,rankedGroups:100,
   shelves:shelfIndex}};
await writeFile(path.join(dir,'index.json'),JSON.stringify(index,null,2)+'\n');
assert.ok(matched>0,'No CSDb/HVSC group matches found');
console.log(JSON.stringify({status:'TEST179 generated',inspected,matched,skipped,
 groups:attributedGroups,buckets:shelfIndex.length,
 examples:[...groups.values()].filter(x=>x.tracks.size)
  .sort((a,b)=>b.tracks.size-a.tracks.size)
  .slice(0,18).map(g=>({group:g.name,count:g.tracks.size}))},null,2));
