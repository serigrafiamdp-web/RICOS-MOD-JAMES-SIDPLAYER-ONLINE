// TEST179: browser-real HVSC GROUPS A–Z and MY PLAYLIST builder regression.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const index=JSON.parse(await readFile(resolve(root,'library/groups/index.json')));
assert.equal(index.format,'ricos-hvsc-groups');
assert.ok(index.groups.count>0&&index.groups.totalGroups>0);
const browserErrors=[];
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const full=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(full!==root&&!full.startsWith(root+sep))return void res.writeHead(403).end();
    const bytes=await readFile(full);
    const ct={'.html':'text/html','.js':'text/javascript','.json':'application/json',
      '.css':'text/css','.zip':'application/zip','.wasm':'application/wasm'}[extname(full)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':ct,'Cache-Control':'no-cache'}).end(bytes);
  }catch(error){res.writeHead(404).end(String(error.message||error));}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  for(const pagePath of ['index.html','lft-test/index.html']){
    const page=await browser.newPage({viewport:{width:1450,height:1000}});
    page.on('pageerror',e=>browserErrors.push(pagePath+': '+e.message));
    await page.goto('http://127.0.0.1:'+port+'/'+pagePath,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('ricoLibraryTab')&&
      document.getElementById('ricoLibraryGroups'),null,{timeout:30000});
    // Use the same existing HVSC Library tab and buttons, not a test-only API.
    await page.locator('#ricoLibraryTab').click({timeout:30000});
    await page.waitForFunction(()=>document.querySelector('#ricoLibraryShelves .rico-library-shelf'),null,{timeout:30000});
    const before=await page.locator('#ricoLibraryIntro').innerText();
    assert.ok(before.includes('MUSICIANS'),'Existing musicians must remain the default');
    await page.locator('#ricoLibraryGroups').click();
    await page.waitForFunction(()=>document.querySelector('#ricoLibraryIntro')?.textContent.includes('GROUPS')&&
      document.querySelectorAll('#ricoLibraryShelves button').length>8,null,{timeout:30000});
    const intro=await page.locator('#ricoLibraryIntro').innerText();
    assert.ok(intro.includes(String(index.groups.totalGroups)+' groups')&&
      intro.includes(index.groups.count.toLocaleString('en-US')+' SID'),'Group manifest/count wrong: '+intro);
    assert.equal(await page.locator('#ricoLibraryAddAll').innerText(),'ADD ALL FROM GROUP');
    const letters=await page.locator('#ricoLibraryShelves button').allInnerTexts();
    assert.ok(letters.includes('F')&&letters.includes('U'),'Missing alphabet selector');
    await page.locator('#ricoLibraryShelves button').filter({hasText:/^F$/}).click();
    await page.waitForFunction(()=>document.querySelector('#ricoLibrarySections')?.textContent.includes('Fairlight'),null,{timeout:25000});
    const fair=page.locator('#ricoLibrarySections button').filter({hasText:'Fairlight (456)'});
    assert.equal(await fair.count(),1);
    await fair.click();
    await page.waitForFunction(()=>document.querySelector('#ricoLibrarySongs .rico-library-heading')?.textContent.includes('Fairlight'),null,{timeout:30000});
    const fairCount=await page.locator('#ricoLibrarySongs button.rico-library-track').count();
    assert.equal(fairCount,456);
    const search=page.locator('#ricoLibrarySearch');
    await search.fill('Jukebox');
    await page.waitForFunction(()=>document.querySelectorAll('#ricoLibrarySongs button.rico-library-track').length>0);
    const searched=await page.locator('#ricoLibrarySongs button.rico-library-track').count();
    assert.ok(searched<fairCount&&searched>0,'Group song search failed');
    await search.fill('');
    await page.locator('#ricoLibraryShelves button').filter({hasText:/^U$/}).click();
    await page.waitForFunction(()=>document.querySelector('#ricoLibrarySections')?.textContent.includes('Upfront (8)'),null,{timeout:30000});
    assert.equal(await page.locator('#ricoLibrarySongs button.rico-library-track').count(),8);
    await page.locator('#ricoLibraryAddAll').click();
    await page.waitForFunction(()=>document.getElementById('ricoDraftCount')?.textContent==='(8 SID)',null,{timeout:45000});
    const draft=await page.locator('#ricoDraftCount').innerText();
    assert.equal(draft,'(8 SID)');
    assert.equal(await page.locator('#ricoLibraryDraftItems .rico-library-draft-row').count(),8);
    await page.locator('#ricoLibraryMusicians').click();
    await page.waitForFunction(()=>document.querySelector('#ricoLibraryIntro')?.textContent.includes('MUSICIANS'),null,{timeout:15000});
    assert.equal(await page.locator('#ricoLibraryAddAll').innerText(),'ADD ALL FROM ARTIST');
    await page.locator('#ricoLibraryDemos').click();
    await page.waitForFunction(()=>document.querySelector('#ricoLibraryIntro')?.textContent.includes('DEMOS'),null,{timeout:15000});
    assert.equal(await page.locator('#ricoLibraryAddAll').innerText(),'ADD ALL FROM ARTIST');
    console.log('TEST179 BROWSER PASS '+JSON.stringify({pagePath,groups:index.groups.totalGroups,
      sidRefs:index.groups.count,letterF:fairCount,searchResults:searched,
      letterUAdded:8,originalTabsIntact:true,noAutoPlaylist:true}));
    await page.close();
  }
  assert.equal(browserErrors.length,0,browserErrors.join('\n'));
}finally{
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
}
