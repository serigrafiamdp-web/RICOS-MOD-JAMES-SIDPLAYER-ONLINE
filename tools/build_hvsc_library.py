#!/usr/bin/env python3
"""Build static on-demand HVSC library from official full collection (HVSC #85).
Does not alter curated/ranked playlists or the original player engine.
"""
import json, os, pathlib, re, shutil, sys, zipfile
from collections import defaultdict

ROOT=pathlib.Path(sys.argv[1])
OUT=pathlib.Path(sys.argv[2])
DATA=OUT/'data'
PACKS=OUT/'packs'
if OUT.exists(): shutil.rmtree(OUT)
DATA.mkdir(parents=True)
PACKS.mkdir(parents=True)
groups=defaultdict(lambda: defaultdict(list))
for filename in ROOT.rglob('*'):
    if not filename.is_file() or filename.suffix.lower()!='.sid': continue
    parts=filename.relative_to(ROOT).parts
    if len(parts)<3 or parts[0].upper() not in ('MUSICIANS','DEMOS'): continue
    category=parts[0].upper()
    shelf=parts[1]
    section=parts[2] if category=='MUSICIANS' else shelf
    groups[category][(shelf,section)].append(filename)

overview={'format':'ricos-hvsc-library','version':1,'source':'HVSC #85','categories':{}}
for category in ('MUSICIANS','DEMOS'):
    letter_shelves=defaultdict(list)
    for (shelf,section),files in sorted(groups[category].items()):
        relslug=re.sub(r'[^A-Za-z0-9._-]','_',section)
        slug=f'{shelf}/{relslug}' if category=='MUSICIANS' else section
        zip_path=PACKS/category.lower()/(slug+'.zip')
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        entries=[]
        with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as pack:
            for f in sorted(files,key=lambda p:str(p).casefold()):
                arc='/'.join(f.relative_to(ROOT/ category).parts[2:]) if category=='MUSICIANS' else f.name
                pack.write(f, arc)
                with f.open('rb') as fh: head=fh.read(0x7c)
                def label(offset):
                    return head[offset:offset+32].split(b'\\0')[0].decode('latin1','replace').strip()
                entries.append({'file':arc,'title':label(0x16) or f.stem.replace('_',' '),
                    'author':label(0x36),'released':label(0x56),'bytes':f.stat().st_size})
        letter_shelves[shelf].append({'name':section,'pack':'library/packs/'+category.lower()+'/'+slug+'.zip','tracks':entries})
    overview['categories'][category.lower()]={'count':sum(len(x['tracks']) for v in letter_shelves.values() for x in v),'shelves':[]}
    for shelf,items in sorted(letter_shelves.items()):
        path=DATA/(category.lower()+'-'+re.sub(r'[^A-Za-z0-9_-]','_',shelf)+'.json')
        path.write_text(json.dumps({'category':category,'shelf':shelf,'sections':items},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        overview['categories'][category.lower()]['shelves'].append({'name':shelf,'file':'library/data/'+path.name,'count':sum(len(x['tracks']) for x in items)})
(OUT/'index.json').write_text(json.dumps(overview,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('HVSC Library:',{c:d['count'] for c,d in overview['categories'].items()})
