'use strict';
// Paper-booklet numbers are stable identities, independent of event IDs and filters.
const STAMPS=window.STAMP_DATA.items;
const STAMP_KEY='art-week-stamps-2026';
let stamped=new Set();
try{const stored=JSON.parse(localStorage.getItem(STAMP_KEY)||'[]');if(Array.isArray(stored))stamped=new Set(stored.filter(n=>Number.isInteger(n)&&n>=1&&n<=80))}catch{}
let stampState={q:'',area:'',status:''};
const isStampMode=()=>state.tab==='explore'&&state.mode==='stamps';
const stampNumber=n=>String(n).padStart(2,'0');
function stampFilters(){
  const q=stampState.q.trim().toLowerCase();
  return STAMPS.filter(x=>{
    if(q&&!`${x.number} ${stampNumber(x.number)} ${x.name} ${x.aliases} ${x.address}`.toLowerCase().includes(q))return false;
    if(stampState.area&&x.area!==stampState.area)return false;
    if(stampState.status==='todo'&&stamped.has(x.number)||stampState.status==='done'&&!stamped.has(x.number)||stampState.status==='unmapped'&&x.coord)return false;
    if($('#in-view').checked&&(!x.coord||!map.getBounds().contains(x.coord)))return false;
    return true;
  });
}
function stampCard(x){return `<article class="stamp-card ${stamped.has(x.number)?'is-stamped':''}"><button class="stamp-card-open" data-open-stamp="${x.number}" aria-label="查看集章点 ${stampNumber(x.number)} ${esc(x.name)}"><span class="stamp-number">${stampNumber(x.number)}</span><span class="stamp-card-copy"><small>${esc(x.area)}${x.coord?'':' · 按地址查找'}</small><strong>${esc(x.name)}</strong><span>${esc(x.address)}</span></span></button><label class="stamp-check"><input type="checkbox" data-stamp-check="${x.number}" ${stamped.has(x.number)?'checked':''} aria-label="${esc(x.name)}已盖章"><span>${stamped.has(x.number)?'已盖章':'未盖章'}</span></label></article>`}
function renderStampList(){
  $('#stamp-progress').textContent=`已盖 ${stamped.size} / ${STAMPS.length}`;
  $('#stamp-progress-bar').value=stamped.size;
  $('#stamp-mode-progress').textContent=`${stamped.size} / ${STAMPS.length}`;
  const xs=stampFilters();
  $('#stamp-results').innerHTML=xs.length?xs.map(stampCard).join(''):'<div class="empty">这组条件下没有集章点。<br><button data-reset-stamps>清除筛选</button></div>';
}
function stampClusterContent(xs){return `<div class="cluster-heading"><b>附近的集章点</b><small>编号与纸册一致</small></div><div class="cluster-list">${xs.map(x=>`<button class="cluster-event stamp-popup-row" data-open-stamp="${x.number}"><strong><span class="stamp-inline-number">${stampNumber(x.number)}</span>${esc(x.name)}</strong><small>${stamped.has(x.number)?'✓ 已盖章':'未盖章'} · ${esc(x.address)}</small></button>`).join('')}</div>`}
function renderStampPoints(){
  points.clearLayers();
  groupNearby(stampFilters().filter(x=>x.coord)).forEach(xs=>{
    const coord=[xs.reduce((s,x)=>s+x.coord[0],0)/xs.length,xs.reduce((s,x)=>s+x.coord[1],0)/xs.length];
    const allDone=xs.every(x=>stamped.has(x.number));
    const label=xs.length===1?stampNumber(xs[0].number):'集章';
    const marker=L.marker(coord,{icon:L.divIcon({className:'art-pin stamp-marker',html:`<div class="stamp-pin ${allDone?'is-stamped':''}"><span>${label}</span>${xs.length>1?`<b>${xs.length}</b>`:allDone?'<b>✓</b>':''}</div>`,iconSize:[36,36],iconAnchor:[18,36]}),title:xs.map(x=>`${stampNumber(x.number)} ${x.name}`).join('、')}).addTo(points);
    if(xs.length===1)marker.on('click',()=>openStamp(xs[0].number));
    else marker.bindPopup(stampClusterContent(xs),{className:'activity-cluster-popup stamp-cluster-popup',maxWidth:340,minWidth:280,autoPanPaddingTopLeft:[16,state.bus?116:64],autoPanPaddingBottomRight:[16,40]});
  });
}
function updateExploreMode(){
  const active=isStampMode();
  document.body.classList.toggle('stamp-mode',active);
  $('#explore-mode').hidden=state.tab!=='explore';
  $('#activity-explore').hidden=active;
  $('#stamp-panel').hidden=!active;
  // Mobile filters are physically moved into the same sheet, but remain independent.
  filterControls.hidden=active;
  $('#stamp-filters').hidden=!active;
  $('#filter-title').textContent=active?'筛选集章点':'筛选活动';
  $$('[data-explore-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.exploreMode===state.mode)));
  $('#stamp-key').hidden=!active;
  $$('.map-key > span:not(#stamp-key)').forEach(s=>s.hidden=active);
}
function setExploreMode(mode){
  state.mode=mode==='stamps'?'stamps':'events';
  map.closePopup();selected.clearLayers();
  render();
  if(mobileScreen.matches)setMobileView(mobileView);
  else{map.invalidateSize({pan:false});renderPoints()}
}
function resetStamps(){
  stampState={q:'',area:'',status:''};
  $('#stamp-search').value='';$('#stamp-area').value='';$('#stamp-status').value='';$('#in-view').checked=false;
  render();
}
function setStamped(n,done){
  if(!STAMPS.some(x=>x.number===n))return;
  done?stamped.add(n):stamped.delete(n);
  try{localStorage.setItem(STAMP_KEY,JSON.stringify([...stamped].sort((a,b)=>a-b)))}catch{toast('当前浏览器无法保存，盖章记录仅在本次浏览有效')}
  renderStampList();if(isStampMode())renderStampPoints();
  const button=$(`[data-stamp-toggle="${n}"]`);
  if(button){button.textContent=done?'✓ 已盖章 · 点击撤销':'标记为已盖章';button.setAttribute('aria-pressed',String(done))}
}
function openStamp(number){
  const x=STAMPS.find(x=>x.number===Number(number));if(!x)return;
  map.closePopup();selected.clearLayers();
  if(x.coord){L.circleMarker(x.coord,{radius:22,color:'#9a446b',fillOpacity:.12,weight:2,interactive:false}).addTo(selected);map.panTo(x.coord)}
  const related=x.institution?D.items.filter(item=>item.institution===x.institution):[];
  showDialog(`<div class="detail-kicker">纸册 ${stampNumber(x.number)} / ${esc(x.area)}</div><h2 class="detail-title">${esc(x.name)}</h2><div class="detail-actions"><button class="primary" data-stamp-toggle="${x.number}" aria-pressed="${stamped.has(x.number)}">${stamped.has(x.number)?'✓ 已盖章 · 点击撤销':'标记为已盖章'}</button><a href="${esc(directions(x))}" target="_blank" rel="noopener">按地址导航 ↗</a></div><dl><div><dt>纸册地址</dt><dd>${esc(x.address)}</dd></div>${x.hours?`<div><dt>开放参考</dt><dd>${esc(x.hours)}<br>盖章时段请向场馆现场确认。</dd></div>`:''}</dl>${x.note?`<p class="callout">${esc(x.note)}</p>`:''}<p class="mini-note">这是你在当前浏览器里的盖章备忘，不能代替纸册上的实体印章。地点与编号按艺术周纸册整理。</p>${related.length?`<h3>这里还有什么活动</h3><div class="stamp-related">${related.map(item=>`<button class="cluster-event" data-open="${item.id}"><strong>${esc(item.t)}</strong><small>${esc(item.kind)} · ${esc(item.d)}</small></button>`).join('')}</div>`:'<p class="mini-note">暂未收录这里的活动节目；仍可记录盖章。</p>'}`);
}
function initStamps(){
  $('#stamp-area').innerHTML+=[...new Set(STAMPS.map(x=>x.area))].map(a=>`<option>${esc(a)}</option>`).join('');
  $('#stamp-search').oninput=e=>{stampState.q=e.target.value;render()};
  $('#stamp-area').onchange=e=>{stampState.area=e.target.value;render()};
  $('#stamp-status').onchange=e=>{stampState.status=e.target.value;render()};
  document.addEventListener('click',e=>{
    let el;
    if(el=e.target.closest('[data-explore-mode]'))setExploreMode(el.dataset.exploreMode);
    else if(el=e.target.closest('[data-open-stamp]'))openStamp(el.dataset.openStamp);
    else if(el=e.target.closest('[data-stamp-toggle]')){const n=Number(el.dataset.stampToggle);setStamped(n,!stamped.has(n))}
    else if(e.target.closest('[data-reset-stamps]'))resetStamps();
    else if(e.target.closest('[data-stamp-unmapped]')){stampState.status='unmapped';$('#stamp-status').value='unmapped';stampState.q='';$('#stamp-search').value='';stampState.area='';$('#stamp-area').value='';$('#in-view').checked=false;render();if(mobileScreen.matches)setMobileView('list')}
    else if(e.target.closest('[data-go-stamps]')){tab('explore');setExploreMode('stamps');$('#detail').close()}
    else if(e.target.closest('[data-stamp-help]'))showDialog(`<div class="detail-kicker">集章小贴士</div><h2 class="detail-title">带上纸册，慢慢集。</h2><p class="detail-description">按纸册的80个地点找场馆，盖好实体印章后，在这里勾选“已盖章”。\n\n这里按场馆显示，不受活动日期、长期活动排除或活动屏蔽影响。是否开放、具体盖章位置及兑换要求，请以场馆和主办方现场说明为准。\n\n进度只保存在当前浏览器，清理浏览器数据会丢失，换设备不会自动同步。</p>`);
  });
  document.addEventListener('change',e=>{if(e.target.matches('[data-stamp-check]')){const n=Number(e.target.dataset.stampCheck);setStamped(n,e.target.checked);($(`[data-stamp-check="${n}"]`)||$('#stamp-status')).focus()}});
  const params=new URLSearchParams(location.search);
  if(params.get('mode')==='stamps')state.mode='stamps';
  stampState.q=params.get('sq')||'';stampState.area=params.get('zone')||'';
  stampState.status=['todo','done','unmapped'].includes(params.get('stamped'))?params.get('stamped'):'';
  $('#stamp-search').value=stampState.q;$('#stamp-area').value=stampState.area;$('#stamp-status').value=stampState.status;
  renderStampList();
}
