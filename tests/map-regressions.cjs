// Run with Playwright installed: node tests/map-regressions.cjs
// Optional: CHROME_EXECUTABLE=/path/to/chrome for an existing Chromium install.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');

(async()=>{
  const browser=await chromium.launch({
    ...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
    args:['--single-process','--no-sandbox','--disable-gpu']
  });
  try{
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    // These interaction tests use real local app code; external tiles are unnecessary.
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname!=='art.test')return route.abort();
      return route.fulfill({path:path.join(__dirname,'../dist',url.pathname==='/'?'index.html':url.pathname)});
    });
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:960});
      await page.goto('http://art.test/?date=2026-11-07&before=2026-11-08');
      const result=await page.evaluate(()=>{
        const expected=ART_DATA.items.filter(x=>x.end<'2026-11-08'&&x.ranges.some(([s,e])=>s<='2026-11-07'&&e>='2026-11-07')).map(x=>x.id).sort((a,b)=>a-b);
        const actual=ART_APP.filters().map(x=>x.id).sort((a,b)=>a-b);
        const listed=[...document.querySelectorAll('#results [data-id]')].map(x=>Number(x.dataset.id)).sort((a,b)=>a-b);
        const popupIds=[];
        ART_APP.map.eachLayer(layer=>{
          const content=layer.getPopup?.()?.getContent();
          if(typeof content==='string')for(const m of content.matchAll(/data-open="(\d+)"/g))popupIds.push(Number(m[1]));
        });
        return {expected,actual,listed,popupIds};
      });
      assert.deepEqual(result.actual,result.expected,'cutoff must apply to every activity type');
      assert.deepEqual(result.listed,result.expected,'list must use the same cutoff');
      assert(!result.actual.includes(94),'glass workshop ending November 15 must be excluded');
      assert(result.popupIds.every(id=>result.expected.includes(id)),'popup must contain only filtered activities');
      // Verify the cutoff includes its boundary day, with all dates/types enabled.
      await page.goto('http://art.test/?before=2026-11-08');
      await page.evaluate(()=>{document.querySelector('#day').value='';ART_APP.render()});
      assert(await page.evaluate(()=>ART_APP.filters().every(x=>x.end<'2026-11-08')));
      await page.goto('http://art.test/?date=2026-11-07');
      const first=page.locator('.event-marker').filter({has:page.locator('.multi')}).first();
      const title=await first.getAttribute('title');
      const marker=page.getByTitle(title,{exact:true});
      const popup=page.locator('.activity-cluster-popup');
      const zoom=await page.evaluate(()=>ART_APP.map.getZoom());
      for(let i=0;i<4;i++){
        await marker.click();
        await popup.waitFor({state:'visible'});
        // Wait past Leaflet's close fade: the original bug briefly opens then closes.
        await page.waitForTimeout(350);
        assert(await popup.isVisible(),'popup must stay open on repeat click');
        if(i===2){
          await popup.locator('[data-open]').first().click();
          await page.locator('#detail').waitFor({state:'visible'});
          await page.locator('#close-detail').click();
        }else{await page.locator('.leaflet-popup-close-button').click()}

        await popup.waitFor({state:'hidden'});
      }
      assert.equal(await page.evaluate(()=>ART_APP.map.getZoom()),zoom,'reopening must not require zoom');
      console.log(`${width}px: cutoff, popup contents and repeated reopening passed`);
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
