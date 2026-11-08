const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),args:['--single-process','--no-sandbox','--disable-gpu']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='art.test'?route.fulfill({path:path.join(__dirname,'../dist',u.pathname==='/'?'index.html':u.pathname)}):route.abort()});
  async function filterSheet(){if(await page.locator('#mobile-filters').isVisible())await page.locator('#mobile-filters').click()}
  async function closeSheet(){if(await page.locator('#filter-sheet').isVisible())await page.locator('#apply-filters').click()}
  async function list(){if(await page.locator('#mobile-list').isVisible())await page.locator('#mobile-list').click()}
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:844});await page.goto('http://art.test/');
   await page.evaluate(()=>{localStorage.clear();localStorage.setItem('art-week-hidden','[94]')});
   await page.goto('http://art.test/?date=2026-11-07&before=2026-11-08');
   const events=await page.locator('#results [data-id]').evaluateAll(es=>es.map(e=>e.dataset.id));
   await page.locator('[data-explore-mode="stamps"]').click();await list();
   assert.equal(await page.locator('.stamp-card').count(),80,'all booklet venues, irrespective of event cutoff or hidden activities');
   assert.equal(await page.locator('nav [data-tab]').count(),4,'no additional main tab');
   assert.equal(await page.locator('#stamp-progress').textContent(),'已盖 0 / 80');
   assert(await page.locator('[data-open-stamp="16"]').isVisible()||await page.locator('[data-open-stamp="16"]').count()===1);
   await page.locator('[data-stamp-check="1"]').check();
   assert.equal(await page.locator('#stamp-progress').textContent(),'已盖 1 / 80');
   await page.reload();await list();
   assert(await page.locator('[data-stamp-check="1"]').isChecked(),'stamp persists through reload');
   await filterSheet();
   assert(!(await page.locator('#deadline').isVisible()),'event filters must not leak into stamp sheet');
   await page.locator('#stamp-status').selectOption('todo');await closeSheet();
   assert.equal(await page.locator('.stamp-card').count(),79);
   assert.equal(await page.locator('[data-open-stamp="1"]').count(),0);
   await filterSheet();await page.locator('#stamp-status').selectOption('done');await closeSheet();
   assert.equal(await page.locator('.stamp-card').count(),1);
   await page.locator('[data-open-stamp="1"]').click();
   await page.locator('[data-stamp-toggle="1"]').click();
   assert.equal(await page.locator('[data-stamp-toggle="1"]').getAttribute('aria-pressed'),'false');
   await page.locator('#close-detail').click();
   assert.equal(await page.locator('.stamp-card').count(),0);
   await filterSheet();await page.locator('#stamp-status').selectOption('');
   await page.locator('#stamp-area').selectOption('天目里');await closeSheet();
   assert.equal(await page.locator('.stamp-card').count(),11);
   await filterSheet();await page.locator('#stamp-area').selectOption('');await page.locator('#stamp-search').fill('洞厅');await closeSheet();
   assert.equal(await page.locator('.stamp-card').count(),1);
   await page.locator('[data-open-stamp="19"]').click();
   assert((await page.locator('#detail-body').textContent()).includes('暂未收录这里的活动节目'));
   await page.locator('[data-stamp-toggle="19"]').click();await page.locator('#close-detail').click();
   await page.locator('[data-stamp-unmapped]').click();
   assert.equal(await page.locator('.stamp-card').count(),2);
   await page.locator('[data-open-stamp="69"]').click();
   assert((await page.locator('#detail a').first().getAttribute('href')).includes(encodeURIComponent('萧杭路666号')));
   await page.locator('#close-detail').click();
   await filterSheet();
   if(width<=700)await page.locator('#clear-filters').click();
   else{await page.locator('#stamp-status').selectOption('');await page.locator('#stamp-search').fill('')}
   await closeSheet();
   assert.equal(await page.locator('.stamp-card').count(),80);
   assert.equal(await page.locator('#stamp-progress').textContent(),'已盖 1 / 80','reset filters must not clear stamp records');
   if(width<=700)await page.locator('#mobile-map').click();
   await page.locator('#fit-map').click();
   // Select an on-screen cluster and reopen after the close animation completes.
   const clusters=page.locator('.stamp-marker').filter({has:page.locator('b')});
   const title=await clusters.first().getAttribute('title');
   for(let i=0;i<3;i++){
    await page.getByTitle(title,{exact:true}).click();
    await page.locator('.stamp-cluster-popup').waitFor({state:'visible'});
    await page.waitForTimeout(350);
    assert(await page.locator('.stamp-cluster-popup').isVisible());
    await page.locator('.leaflet-popup-close-button').click();
    await page.locator('.stamp-cluster-popup').waitFor({state:'hidden'});
   }
   await page.locator('[data-explore-mode="events"]').click();
   assert.deepEqual(await page.locator('#results [data-id]').evaluateAll(es=>es.map(e=>e.dataset.id)),events,'returning preserves the event filters');
   await page.locator('[data-tab="bus"]').click();assert(!(await page.locator('#explore-mode').isVisible()));
   await page.locator('[data-tab="explore"]').click();assert(await page.locator('#explore-mode').isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   console.log(`${width}px: 80 venues, persistence, undo, filters, navigation and popup reopening passed`);
  }
  await page.evaluate(()=>localStorage.setItem('art-week-stamps-2026','{"invalid":true}'));
  await page.goto('http://art.test/?mode=stamps');
  assert.equal(await page.locator('#stamp-progress').textContent(),'已盖 0 / 80','malformed saved data must not break the page');
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
