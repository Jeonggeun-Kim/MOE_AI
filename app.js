const presets = {
  preset_1: ['AI전문성', 'AI융합성'],
  preset_2: ['전국', '지역분산'],
  preset_3: ['소수정예', '대규모확산'],
  preset_4: ['연구중심', '실무/취업중심'],
  preset_5: ['대학중심', '산학연연계']
};
const colorFields = ['주관부처','대상','분야','AX 세부분야','지역','사업 운영방식','선정 규모','핵심역량'];
const filterFields = ['대상','분야','AX 세부분야','주관부처','핵심역량','지역','선정 규모','사업관리','사업 운영방식'];
const tagColors = {'주관부처':'#2563eb','대상':'#7c3aed','분야':'#0891b2','AX 세부분야':'#059669','지역':'#d97706','사업 운영방식':'#be123c','선정 규모':'#4338ca','핵심역량':'#0f766e','사업관리':'#475569'};

const AX_CATEGORIES = ['전분야','AI반도체','AI국방','AI바이오','AI자동차','AI가상현실','AI콘텐츠','해당없음','AI제조','AI로봇','AI항공우주','AI헬스케어','AI보안','AI미디어','AI에너지'];
function normalizeAXOne(v){
  const x = stripParen(v).replace(/\s+/g,'').trim();
  if(!x) return '';
  if(AX_CATEGORIES.includes(x)) return x;
  if(/해당없음|순수AI|AI전문|AI전영역|AI일반|인공지능$|^AI$|AI컴퓨팅|AI기초|AI모델|AI원천|디지털기본교육/.test(x)) return '해당없음';
  if(/전분야|다분야|다학제|AX융합|첨단산업|이공계전분야|12대전략분야|6대디지털혁신분야|데이터사이언스|ICT|SW|클라우드|지식재산|PBL|실전문제해결/.test(x)) return '전분야';
  if(/반도체|시스템반도체|패키징|온디바이스AI|AI반도체|AI칩|AI반도체인력/.test(x)) return 'AI반도체';
  if(/국방|방산/.test(x)) return 'AI국방';
  if(/바이오|첨단바이오|제약|신약/.test(x)) return 'AI바이오';
  if(/헬스케어|디지털헬스케어|의료|의료인공지능|병원|임상/.test(x)) return 'AI헬스케어';
  if(/자동차|모빌리티|교통|자율주행/.test(x)) return 'AI자동차';
  if(/가상현실|메타버스|VR|AR|XR|공간컴퓨팅/.test(x)) return 'AI가상현실';
  if(/콘텐츠|저작권|문화|에듀테크|교육|공교육|SW교육/.test(x)) return 'AI콘텐츠';
  if(/제조|스마트제조|공정|팩토리/.test(x)) return 'AI제조';
  if(/로봇|무인로봇|무인이동체|드론/.test(x)) return 'AI로봇';
  if(/항공우주|우주|우주항공/.test(x)) return 'AI항공우주';
  if(/보안|사이버보안|정보보호/.test(x)) return 'AI보안';
  if(/미디어|방송|영상/.test(x)) return 'AI미디어';
  if(/에너지|전력|그리드|VPP|기후|환경|이차전지|배터리|재생에너지/.test(x)) return 'AI에너지';
  return x;
}
function normalizeAXTags(vals){
  const out=[];
  normVals(vals).forEach(v => {
    const c = normalizeAXOne(v);
    if(c && !out.includes(c)) out.push(c);
  });
  return out;
}

const palette = ['#2563eb','#dc2626','#059669','#d97706','#7c3aed','#0891b2','#be123c','#4f46e5','#16a34a','#ea580c','#0f766e','#9333ea','#64748b','#0284c7','#b45309','#0369a1','#e11d48','#14b8a6','#8b5cf6','#f59e0b'];
const state = { x:'preset_1', y:'preset_2', colorBy:'주관부처', colorMode:'primary', filters:{}, hidden:new Set(), xMin:-1, xMax:1, yMin:-1, yMax:1, dragging:null, suppressClick:false, radarFocus:{preset_1:'high', preset_2:'high', preset_3:'high', preset_4:'high', preset_5:'high'} };
const $ = id => document.getElementById(id);
let plot = {left:24,right:876,top:24,bottom:596,w:852,h:572,cx:450,cy:310,rx:426,ry:286};

function deepClone(x){ return JSON.parse(JSON.stringify(x)); }
let PROJECTS = [];
let DEFAULT_PROJECTS = [];
function bootData(){
  PROJECTS = normalizeDataset(window.PROJECT_DATA || []);
  DEFAULT_PROJECTS = PROJECTS.map(r => deepClone(r));
}

function normVals(v){ return Array.isArray(v) ? v.filter(Boolean).map(String) : (v ? [String(v)] : []); }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtNum(x, unit=''){ return x === null || x === undefined || x === '' || Number.isNaN(Number(x)) ? '미확인' : Number(x).toLocaleString() + unit; }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function cloneDefaultData(){ return DEFAULT_PROJECTS.map(r => deepClone(r)); }

function stripParen(s){ return String(s ?? '').replace(/\([^)]*\)/g,'').replace(/（[^）]*）/g,'').trim(); }
function compactKey(k){ return String(k ?? '').replace(/\s+/g,'').trim(); }
function rowGet(row, names){
  for(const name of names){
    if(Object.prototype.hasOwnProperty.call(row, name) && row[name] !== '') return row[name];
  }
  const map = row.__keymap || {};
  for(const name of names){
    const real = map[compactKey(name)];
    if(real && row[real] !== '') return row[real];
  }
  return '';
}
function canonicalizeRows(rows){
  return (rows || []).map(r => {
    const out = {...r, __keymap:{}};
    Object.keys(r || {}).forEach(k => { out.__keymap[compactKey(k)] = k; });
    return out;
  });
}
function parseNum(v){
  if(v === null || v === undefined || v === '') return null;
  if(typeof v === 'number') return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/,/g,'').replace(/천원|원|개|명|억/g,'').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
function parseTags(v){
  if(Array.isArray(v)) return v.map(stripParen).filter(Boolean);
  const raw = stripParen(v);
  if(!raw) return [];
  return raw.split(/[,;\n]+|\s+[·ㆍ]\s+/).map(stripParen).map(x=>x.trim()).filter(Boolean);
}
function normalizeRecord(row, idx){
  const out = {...row};
  out.id = Number(rowGet(row, ['id','ID','연번'])) || idx + 1;
  out['사업명'] = String(rowGet(row, ['사업명','과제명','사업명칭']) || '').trim();
  out['단위사업명'] = String(rowGet(row, ['단위사업명']) || '').trim();
  out['세부사업명'] = String(rowGet(row, ['세부사업명']) || '').trim();
  out['비고'] = String(rowGet(row, ['비고','설명','사업개요','사업 개요']) || '').trim();
  out['링크'] = String(rowGet(row, ['링크','URL','url']) || '').trim();
  filterFields.forEach(f => { out[f] = parseTags(rowGet(row, [f])); });
  out['AX 세부분야'] = normalizeAXTags(out['AX 세부분야']);
  out['선정 규모'] = parseTags(rowGet(row, ['선정 규모','선정  규모','선정규모']));
  out['사업비'] = parseNum(rowGet(row, ['사업비','연간 사업비(천원)','2026년 사업비','총 사업비(억원)','총사업비']));
  out['사업단 수'] = parseNum(rowGet(row, ['사업단 수','연간 선정사업단 수','총 사업단수','총사업단수']));
  out['1년 예산(천원)/사업단'] = parseNum(rowGet(row, ['1년 예산(천원)/사업단','1년예산(천원)/사업단','연간 예산/사업단']));
  Object.keys(presets).forEach(k => { out[k] = clamp(parseNum(rowGet(row, [k])) ?? 0, -1, 1); });
  return out;
}
function normalizeDataset(rows){
  return canonicalizeRows(rows).map((r,i)=>normalizeRecord(r,i)).filter(r => r.사업명);
}
function refreshDynamicOptions(){
  if(!window.CATEGORY_OPTIONS) window.CATEGORY_OPTIONS = {};
  window.CATEGORY_OPTIONS['AX 세부분야'] = AX_CATEGORIES.slice();
  filterFields.forEach(f => {
    const vals = [...new Set(PROJECTS.flatMap(r => normVals(r[f])))].filter(Boolean);
    if(f === 'AX 세부분야'){
      const extras = vals.filter(v => !AX_CATEGORIES.includes(v));
      window.CATEGORY_OPTIONS[f] = [...AX_CATEGORIES, ...extras];
    } else {
      const base = window.CATEGORY_OPTIONS[f] || [];
      window.CATEGORY_OPTIONS[f] = [...new Set([...base, ...vals])];
    }
  });
}
function setDataset(rows, label){
  const normalized = normalizeDataset(rows);
  if(!normalized.length){
    $('dataStatus').textContent = '로드 실패: 사업명 컬럼이 있는 유효 row를 찾지 못했습니다.';
    alert('엑셀에서 사업명 컬럼이 있는 유효 row를 찾지 못했습니다. 첫 시트의 헤더를 확인하십시오.');
    return;
  }
  PROJECTS = normalized;
  refreshDynamicOptions();
  Object.keys(state.filters).forEach(k => state.filters[k] = new Set());
  state.hidden.clear();
  resetView();
  buildFilters();
  $('totalCount').textContent = PROJECTS.length;
  $('dataStatus').textContent = label || `XLSX 데이터 ${PROJECTS.length}개 사업 로드됨`;
  renderAll();
}
function rowsFromWorksheet(ws){
  const matrix = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false});
  let headerIdx = 0;
  for(let i=0; i<Math.min(matrix.length, 20); i++){
    const keys = matrix[i].map(compactKey);
    if(keys.includes('사업명') && (keys.includes('preset_1') || keys.includes('대상') || keys.includes('주관부처'))){ headerIdx = i; break; }
  }
  const headers = matrix[headerIdx].map(h => String(h ?? '').trim());
  const rows = [];
  for(let r=headerIdx+1; r<matrix.length; r++){
    const arr = matrix[r];
    const obj = {};
    let nonEmpty = false;
    headers.forEach((h,i) => {
      if(!h) return;
      obj[h] = arr[i] ?? '';
      if(obj[h] !== '') nonEmpty = true;
    });
    if(nonEmpty) rows.push(obj);
  }
  return {rows, headerIdx, headers};
}
async function loadXlsxFile(file){
  const status = $('dataStatus');
  status.textContent = `${file.name} 읽는 중...`;
  if(!window.XLSX){
    status.textContent = 'XLSX 파서 로드 실패: 인터넷 연결 또는 로컬 xlsx.full.min.js가 필요합니다.';
    alert('XLSX 파서가 로드되지 않았습니다. 인터넷 연결이 필요하거나, xlsx.full.min.js를 로컬 파일로 추가해야 합니다.');
    return;
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, {type:'array'});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const parsed = rowsFromWorksheet(ws);
  setDataset(parsed.rows, `${file.name} · 첫 시트 ${wb.SheetNames[0]} · ${PROJECTS.length}개 사업 로드됨`);
}
function wireXlsxLoader(){
  const input = $('xlsxInput');
  if(!input) return;
  input.onchange = async e => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    try{ await loadXlsxFile(file); }
    catch(err){
      console.error(err);
      $('dataStatus').textContent = 'XLSX 로드 실패: 브라우저 콘솔 또는 컬럼명을 확인하십시오.';
      alert('XLSX 로드 실패: 컬럼명 또는 파일 형식을 확인하십시오.');
    }
    finally { input.value = ''; }
  };
  const restore = $('restoreData');
  if(restore) restore.onclick = () => setDataset(cloneDefaultData(), window.DEFAULT_DATA_SOURCE_LABEL || '기본 내장 데이터 사용 중');
}

function wireTabs(){
  const meta = {
    similarity: ['사업별 정성 유사도', '주요 요소 축을 기준으로 사업간 분포 현황과 비교를 수행합니다.'],
    temp: ['사업간 심층 비교 분석', '선택한 사업들의 핵심 지표와 포지셔닝 특성을 보고서 형식으로 비교합니다.'],
    portfolio: ['부처별 포트폴리오 분석', '부처별 사업 포트폴리오의 중복 영역과 편중 영역을 매트릭스로 확인합니다.'],
    duplication: ['중복성/유사사업 탐지', '사업 간 좌표 거리와 지표 중첩도를 결합해 유사사업 후보를 탐색합니다.'],
    relation: ['과제 연관성 네트워크', '유사도 기반 네트워크와 덴드로그램으로 과제군의 연결 구조를 확인합니다.']
  };
  document.querySelectorAll('.tabBtn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tabBtn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tabPane').forEach(pane => pane.classList.toggle('active', pane.id === `tab-${btn.dataset.tab}`));
      const title = $('pageTitle'), sub = $('pageSubtitle');
      const m = meta[btn.dataset.tab] || meta.similarity;
      if(title) title.textContent = m[0];
      if(sub) sub.textContent = m[1];
      requestAnimationFrame(() => { renderAll(); if(btn.dataset.tab === 'relation') setTimeout(renderRelationAnalysis, 60); });
    };
  });
}


function wireRadarAxisToggles(){
  const host = $('radarAxisToggles');
  if(!host) return;
  const axes = radarAxisDefinitions();
  host.innerHTML = axes.map(ax => `
    <div class="axisToggle" data-key="${esc(ax.key)}">
      <span>${esc(ax.short)}</span>
      <div class="axisToggleBtns">
        <button type="button" class="axisSide ${state.radarFocus[ax.key] === 'low' ? 'on' : ''}" data-key="${esc(ax.key)}" data-side="low">${esc(ax.low)}</button>
        <button type="button" class="axisSide ${state.radarFocus[ax.key] !== 'low' ? 'on' : ''}" data-key="${esc(ax.key)}" data-side="high">${esc(ax.high)}</button>
      </div>
    </div>`).join('');
  host.querySelectorAll('.axisSide').forEach(btn => {
    btn.onclick = () => {
      state.radarFocus[btn.dataset.key] = btn.dataset.side;
      wireRadarAxisToggles();
      renderAll();
    };
  });
}

function init(){
  bootData();
  fillSelect('xPreset', Object.keys(presets), k => `${k.replace('preset_','프리셋 ')}: ${presets[k][0]} ↔ ${presets[k][1]}`, state.x);
  fillSelect('yPreset', Object.keys(presets), k => `${k.replace('preset_','프리셋 ')}: ${presets[k][0]} ↔ ${presets[k][1]}`, state.y);
  fillSelect('colorBy', colorFields, k => k, state.colorBy);
  refreshDynamicOptions();
  buildFilters();
  wireXlsxLoader();
  wireTabs();
  wireRadarAxisToggles();
  $('totalCount').textContent = PROJECTS.length;
  $('xPreset').onchange = e => { state.x = e.target.value; resetView(); renderAll(); };
  $('yPreset').onchange = e => { state.y = e.target.value; resetView(); renderAll(); };
  $('colorBy').onchange = e => { state.colorBy = e.target.value; renderAll(); };
  $('colorMode').onchange = e => { state.colorMode = e.target.value; renderAll(); };
  $('resetZoom').onclick = () => { resetView(); renderAll(); };
  $('showAllRadar').onclick = () => { filtered().forEach(r => state.hidden.delete(r.id)); renderAll(); };
  $('hideAllRadar').onclick = () => { filtered().forEach(r => state.hidden.add(r.id)); renderAll(); };
  $('clearSelection').onclick = () => { state.hidden.clear(); renderAll(); };
  const printBtn = $('printReport');
  if(printBtn) printBtn.onclick = () => { renderDeepComparison(); window.print(); };
  const pa = $('portfolioAxis');
  if(pa) pa.onchange = () => renderPortfolioAnalysis();
  const st = $('similarityThreshold');
  if(st) st.onchange = () => renderDuplicationAnalysis();
  const rt = $('relationThreshold');
  if(rt) rt.onchange = () => renderRelationAnalysis();
  const rn = $('relationMaxNodes');
  if(rn) rn.onchange = () => renderRelationAnalysis();
  wireMap();
  window.addEventListener('resize', () => renderAll());
  renderAll();
}
function fillSelect(id, vals, label, selected){ $(id).innerHTML = vals.map(v => `<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(label(v))}</option>`).join(''); }
function buildFilters(){
  const host = $('filters');
  host.innerHTML = filterFields.map(f => {
    const dataVals = [...new Set(PROJECTS.flatMap(r => normVals(r[f])) )].filter(Boolean);
    const optionVals = (window.CATEGORY_OPTIONS && window.CATEGORY_OPTIONS[f]) ? window.CATEGORY_OPTIONS[f] : [];
    const vals = [...new Set([...optionVals.filter(v => dataVals.includes(v) || f === 'AX 세부분야'), ...dataVals])];
    state.filters[f] = new Set();
    return `<details class="filterGroup"><summary><span>${esc(f)}</span><em>${vals.length}</em></summary><div class="chipGrid">${vals.map(v => `<button type="button" class="filterChip" data-field="${esc(f)}" data-value="${esc(v)}">${esc(v)}</button>`).join('')}</div></details>`;
  }).join('');
  host.querySelectorAll('.filterChip').forEach(btn => {
    btn.onclick = () => {
      const set = state.filters[btn.dataset.field];
      const v = btn.dataset.value;
      set.has(v) ? set.delete(v) : set.add(v);
      btn.classList.toggle('on', set.has(v));
      state.hidden.clear();
      resetView();
      renderAll();
    };
  });
}
function filtered(){
  return PROJECTS.filter(r => Object.entries(state.filters).every(([f,set]) => {
    if(!set || set.size === 0) return true;
    const vals = normVals(r[f]);
    return vals.some(v => set.has(v));
  }));
}

function updatePlotGeometry(){
  const svg = $('scatter');
  const rect = svg.getBoundingClientRect();
  const w = Math.max(500, Math.round(rect.width || 900));
  const h = Math.max(420, Math.round(rect.height || 620));
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const m = {left:24, right:24, top:24, bottom:24};
  plot.left = m.left; plot.right = w - m.right; plot.top = m.top; plot.bottom = h - m.bottom;
  plot.w = plot.right - plot.left; plot.h = plot.bottom - plot.top;
  plot.cx = plot.left + plot.w/2; plot.cy = plot.top + plot.h/2;
  plot.rx = plot.w/2; plot.ry = plot.h/2;
}
function resetView(){ state.xMin = -1; state.xMax = 1; state.yMin = -1; state.yMax = 1; }
function spanX(){ return state.xMax - state.xMin; }
function spanY(){ return state.yMax - state.yMin; }
function sx(v){
  const x = clamp(Number(v)||0, -1, 1);
  return plot.left + (x - state.xMin) / spanX() * plot.w;
}
function sy(v){
  const y = clamp(Number(v)||0, -1, 1);
  return plot.bottom - (y - state.yMin) / spanY() * plot.h;
}
function dataFromScreen(x,y){
  return {
    x: state.xMin + (x - plot.left) / plot.w * spanX(),
    y: state.yMin + (plot.bottom - y) / plot.h * spanY()
  };
}

function niceStep(span){
  const raw = span / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * pow;
}
function ticks(min,max){
  const step = niceStep(max-min);
  const start = Math.ceil(min/step)*step;
  const out=[];
  for(let v=start; v<=max+step*0.5; v+=step){
    if(v>=min-step*0.1 && v<=max+step*0.1) out.push(Math.abs(v)<1e-10?0:v);
    if(out.length>20) break;
  }
  return out;
}
function fmtTick(v){
  const n = Math.abs(v) < 1e-6 ? 0 : v;
  return n.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
}
function zoomAt(screenX, screenY, factor){
  const d = dataFromScreen(screenX, screenY);
  const nx0 = d.x - (d.x - state.xMin) / factor;
  const nx1 = d.x + (state.xMax - d.x) / factor;
  const ny0 = d.y - (d.y - state.yMin) / factor;
  const ny1 = d.y + (state.yMax - d.y) / factor;
  const minSpan = 0.08, maxSpan = 4.0;
  if(nx1 - nx0 >= minSpan && nx1 - nx0 <= maxSpan){ state.xMin = nx0; state.xMax = nx1; }
  if(ny1 - ny0 >= minSpan && ny1 - ny0 <= maxSpan){ state.yMin = ny0; state.yMax = ny1; }
}
function panBy(dxPx, dyPx){
  const dx = -dxPx / plot.w * spanX();
  const dy = dyPx / plot.h * spanY();
  state.xMin += dx; state.xMax += dx; state.yMin += dy; state.yMax += dy;
}
function svgPoint(e){
  const svg = $('scatter'), rect = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  return { x:(e.clientX-rect.left)*vb.width/rect.width + vb.x, y:(e.clientY-rect.top)*vb.height/rect.height + vb.y };
}
function line(x1,y1,x2,y2,cls){ const l=document.createElementNS('http://www.w3.org/2000/svg','line'); Object.entries({x1,y1,x2,y2}).forEach(([k,v])=>l.setAttribute(k,v)); l.setAttribute('class',cls); return l; }
function addText(svg,x,y,t,cls){ const e=document.createElementNS('http://www.w3.org/2000/svg','text'); e.setAttribute('x',x); e.setAttribute('y',y); e.setAttribute('class',cls); e.textContent=t; svg.appendChild(e); }
function addDefs(svg){ const defs=document.createElementNS('http://www.w3.org/2000/svg','defs'); defs.innerHTML='<filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'; svg.appendChild(defs); }
function drawFrame(svg){
  const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
  rect.setAttribute('x',plot.left); rect.setAttribute('y',plot.top); rect.setAttribute('width',plot.w); rect.setAttribute('height',plot.h); rect.setAttribute('class','plotFrame'); svg.appendChild(rect);

  // Normal 2D coordinate viewport: ticks/grid/zero axes belong to the data coordinates and move during pan/zoom.
  ticks(state.xMin,state.xMax).forEach(v => {
    const x=sx(v);
    if(Math.abs(v) > 1e-9) svg.appendChild(line(x,plot.top,x,plot.bottom,'gridline'));
    addText(svg,x+4,plot.bottom-8,fmtTick(v),'tickLabel');
  });
  ticks(state.yMin,state.yMax).forEach(v => {
    const y=sy(v);
    if(Math.abs(v) > 1e-9) svg.appendChild(line(plot.left,y,plot.right,y,'gridline'));
    addText(svg,plot.left+6,y-6,fmtTick(v),'tickLabel');
  });

  if(state.xMin <= 0 && state.xMax >= 0){ const x0=sx(0); svg.appendChild(line(x0,plot.top,x0,plot.bottom,'axis')); }
  if(state.yMin <= 0 && state.yMax >= 0){ const y0=sy(0); svg.appendChild(line(plot.left,y0,plot.right,y0,'axis')); }

  // Only semantic direction captions are fixed on the screen. No artificial fixed cross/grid line.
  addText(svg, plot.left+28, plot.top + plot.h*0.49, presets[state.x][0], 'label axisCap start');
  addText(svg, plot.right-28, plot.top + plot.h*0.49, presets[state.x][1], 'label axisCap end');
  addText(svg, plot.left + plot.w*0.51, plot.top+30, presets[state.y][1], 'label axisCap ytop');
  addText(svg, plot.left + plot.w*0.51, plot.bottom-20, presets[state.y][0], 'label axisCap ybottom');
}
function colorKey(r){
  const vals = normVals(r[state.colorBy]);
  if(!vals.length) return '미분류';
  if(state.colorMode === 'multiBucket' && vals.length > 1) return '복수 지정';
  if(state.colorMode === 'combo' && vals.length > 1) return vals.join(' + ');
  return vals[0];
}
function colorMap(rows){ const keys=[...new Set(rows.map(colorKey))]; const out={}; keys.forEach((k,i)=>out[k]=palette[i%palette.length]); return out; }
function renderLegend(cm){ $('legend').innerHTML = Object.entries(cm).map(([k,c])=>`<span style="background:${c}">${esc(k)}</span>`).join(''); }
function showTip(e,r){
  const t=$('tooltip');
  const p=svgPoint(e);
  const overview = String(r['비고'] || '').trim();
  t.style.display='block';
  t.style.left=(p.x+18)+'px';
  t.style.top=(p.y+18)+'px';
  t.innerHTML=`
    <div class="tipTitle">${esc(r.사업명)}</div>
    <div class="tipMeta"><span>주관부처</span>${esc(normVals(r['주관부처']).join(', ')||'미분류')}</div>
    <div class="tipMeta"><span>분야</span>${esc(normVals(r['분야']).join(', ')||'미분류')}</div>
    <div class="tipMeta"><span>대상</span>${esc(normVals(r['대상']).join(', ')||'미분류')}</div>
    ${overview ? `<div class="tipOverview"><span>사업 개요</span><p>${esc(overview)}</p></div>` : ''}
  `;
}
function hideTip(){ $('tooltip').style.display='none'; }
function renderScatter(rows){
  updatePlotGeometry();
  const svg=$('scatter'); svg.innerHTML=''; addDefs(svg); drawFrame(svg);
  const cm=colorMap(rows);
  $('axisLabel').textContent = `X: ${presets[state.x][0]} ↔ ${presets[state.x][1]} / Y: ${presets[state.y][0]} ↔ ${presets[state.y][1]}`;
  rows.forEach(r => {
    const x=sx(r[state.x]), y=sy(r[state.y]);
    if(x < plot.left-60 || x > plot.right+60 || y < plot.top-60 || y > plot.bottom+60) return;
    const active = !state.hidden.has(r.id);
    const col = cm[colorKey(r)];
    if(active){ const halo=document.createElementNS('http://www.w3.org/2000/svg','circle'); halo.setAttribute('cx',x); halo.setAttribute('cy',y); halo.setAttribute('r',11); halo.setAttribute('fill',col); halo.setAttribute('class','dotHalo'); svg.appendChild(halo); }
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',x); c.setAttribute('cy',y); c.setAttribute('r', active ? 5.8 : 4.4); c.setAttribute('fill',col); c.setAttribute('class',`dot ${active?'active':'inactive'}`);
    c.addEventListener('mousemove', e => showTip(e,r)); c.addEventListener('mouseleave', hideTip);
    c.addEventListener('click', e => { e.stopPropagation(); state.hidden.has(r.id) ? state.hidden.delete(r.id) : state.hidden.add(r.id); renderAll(); });
    svg.appendChild(c);
  });
  renderLegend(cm);
}

function ensureBrushRect(svg){
  let r = svg.querySelector('#brushRect');
  if(!r){
    r = document.createElementNS('http://www.w3.org/2000/svg','rect');
    r.setAttribute('id','brushRect');
    r.setAttribute('class','brushRect');
    svg.appendChild(r);
  }
  return r;
}
function updateBrushRect(){
  const svg=$('scatter');
  if(!state.brush) return;
  const r = ensureBrushRect(svg);
  const x = Math.min(state.brush.x0, state.brush.x1);
  const y = Math.min(state.brush.y0, state.brush.y1);
  const w = Math.abs(state.brush.x1 - state.brush.x0);
  const h = Math.abs(state.brush.y1 - state.brush.y0);
  r.setAttribute('x',x); r.setAttribute('y',y); r.setAttribute('width',w); r.setAttribute('height',h);
}
function clearBrushRect(){
  const r = $('scatter').querySelector('#brushRect');
  if(r) r.remove();
}
function finishBrushSelection(){
  if(!state.brush) return;
  updatePlotGeometry();
  const x0 = Math.min(state.brush.x0, state.brush.x1);
  const x1 = Math.max(state.brush.x0, state.brush.x1);
  const y0 = Math.min(state.brush.y0, state.brush.y1);
  const y1 = Math.max(state.brush.y0, state.brush.y1);
  const area = (x1-x0) * (y1-y0);
  const candidates = filtered().filter(r => {
    const x = sx(r[state.x]), y = sy(r[state.y]);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  });
  if(area > 25 && candidates.length){
    candidates.forEach(r => state.hidden.has(r.id) ? state.hidden.delete(r.id) : state.hidden.add(r.id));
  }
  state.brush = null;
  clearBrushRect();
  renderAll();
}
function wireMap(){
  const svg=$('scatter');
  svg.addEventListener('contextmenu', e => e.preventDefault());
  svg.addEventListener('wheel', e => {
    e.preventDefault(); updatePlotGeometry(); const p=svgPoint(e);
    zoomAt(p.x, p.y, e.deltaY < 0 ? 1.22 : 1/1.22);
    renderAll();
  }, {passive:false});
  svg.addEventListener('pointerdown', e => {
    if(e.target.classList && e.target.classList.contains('dot')) return;
    updatePlotGeometry();
    const p = svgPoint(e);
    // Right-button drag = rectangular toggle selection. Left-button drag = pan.
    if(e.button === 2){
      e.preventDefault();
      state.brush = {x0:p.x, y0:p.y, x1:p.x, y1:p.y};
      state.dragging = null;
      hideTip();
      ensureBrushRect(svg);
      updateBrushRect();
      svg.setPointerCapture(e.pointerId);
      return;
    }
    if(e.button !== 0) return;
    state.dragging={clientX:e.clientX,clientY:e.clientY,xMin:state.xMin,xMax:state.xMax,yMin:state.yMin,yMax:state.yMax};
    state.suppressClick=false; svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', e => {
    if(state.brush){
      e.preventDefault();
      const p = svgPoint(e);
      state.brush.x1 = p.x; state.brush.y1 = p.y;
      updateBrushRect();
      return;
    }
    if(!state.dragging) return;
    state.xMin=state.dragging.xMin; state.xMax=state.dragging.xMax; state.yMin=state.dragging.yMin; state.yMax=state.dragging.yMax;
    const rect=svg.getBoundingClientRect(), vb=svg.viewBox.baseVal;
    const dx=(e.clientX-state.dragging.clientX)*vb.width/rect.width, dy=(e.clientY-state.dragging.clientY)*vb.height/rect.height;
    if(Math.abs(dx)+Math.abs(dy)>2) state.suppressClick=true;
    panBy(dx,dy); renderAll();
  });
  svg.addEventListener('pointerup', e => {
    if(state.brush){ finishBrushSelection(); return; }
    state.dragging=null;
  });
  svg.addEventListener('pointercancel', () => { state.dragging=null; state.brush=null; clearBrushRect(); });
  svg.addEventListener('mouseleave', hideTip);
}

function visibleRows(rows){ return rows.filter(r => !state.hidden.has(r.id)); }
function drawRadar(rows){
  const cv=$('radar'), ctx=cv.getContext('2d');
  const rect = cv.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(760, Math.round(rect.width || 1000));
  const h = Math.max(660, Math.round(rect.height || 700));
  if(cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)){
    cv.width = Math.round(w*dpr);
    cv.height = Math.round(h*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  const axes = radarAxes();
  const n=axes.length;
  const shown=visibleRows(rows);

  // Layout: canvas is now dedicated to the radar plot only.
  // Legend is rendered as an HTML scrollable chip grid below the canvas.
  const topPad = 58;
  const bottomPad = 70;
  const availableH = Math.max(500, h - topPad - bottomPad);
  const cx = w * 0.50;
  const cy = topPad + availableH * 0.52;
  const R = Math.min(w * 0.34, availableH * 0.47);

  ctx.save();
  ctx.lineCap='round';
  ctx.lineJoin='round';

  // Radar grid.
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  for(let ring=1; ring<=5; ring++){
    ctx.beginPath();
    axes.forEach((ax,i)=>{
      const a=-Math.PI/2+i*2*Math.PI/n, rr=R*ring/5;
      const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    });
    ctx.closePath();
    ctx.strokeStyle= ring === 5 ? '#d3deeb' : '#e6eef7';
    ctx.lineWidth= ring === 5 ? 1.8 : 1.25;
    ctx.stroke();
  }

  axes.forEach((ax,i)=>{
    const a=-Math.PI/2+i*2*Math.PI/n;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(a)*R, cy+Math.sin(a)*R);
    ctx.strokeStyle='#d2ddea';
    ctx.lineWidth=1.3;
    ctx.stroke();

    const lx=cx+Math.cos(a)*(R+50), ly=cy+Math.sin(a)*(R+50);
    ctx.fillStyle='#243247';
    ctx.font='900 17px Pretendard, Apple SD Gothic Neo, Malgun Gothic, Arial, sans-serif';
    ctx.textAlign = Math.cos(a) > 0.25 ? 'left' : (Math.cos(a) < -0.25 ? 'right' : 'center');
    ctx.textBaseline='middle';
    ctx.fillText(ax.label, lx, ly);
  });

  ctx.fillStyle='#94a3b8';
  ctx.font='800 14px Pretendard, Apple SD Gothic Neo, Malgun Gothic, Arial, sans-serif';
  ctx.textAlign='center';
  ctx.fillText('0', cx, cy+20);
  ctx.fillText('1.0', cx, cy-R-26);

  const legendHost = $('radarLegend');
  const countLabel = $('radarCountLabel');
  if(countLabel) countLabel.textContent = shown.length ? `표시 사업 ${shown.length}개` : '표시 사업 없음';
  if(legendHost) legendHost.innerHTML = '';

  if(!shown.length){
    ctx.fillStyle='#64748b';
    ctx.font='800 17px Pretendard, Apple SD Gothic Neo, Malgun Gothic, Arial, sans-serif';
    ctx.textAlign='center';
    ctx.fillText('스파이더 표시 대상이 없습니다.',cx,cy);
    ctx.restore();
    return;
  }

  shown.forEach((r,idx)=>{
    ctx.beginPath();
    axes.forEach((ax,i)=>{
      const val=radarAxisValue(r, ax), a=-Math.PI/2+i*2*Math.PI/n, rr=R*val;
      const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    });
    ctx.closePath();
    const color = palette[idx%palette.length];
    ctx.strokeStyle=color;
    ctx.globalAlpha = shown.length > 40 ? 0.62 : (shown.length > 20 ? 0.78 : 1);
    ctx.lineWidth= shown.length > 40 ? 1.55 : (shown.length > 20 ? 2.0 : 3.0);
    ctx.stroke();
    ctx.globalAlpha = shown.length > 24 ? 0.055 : 1;
    ctx.fillStyle=color+'14';
    ctx.fill();

    axes.forEach((ax,i)=>{
      const val=radarAxisValue(r, ax);
      if(val <= 0.02) return;
      const a=-Math.PI/2+i*2*Math.PI/n, rr=R*val;
      ctx.beginPath();
      ctx.arc(cx+Math.cos(a)*rr, cy+Math.sin(a)*rr, 3.6, 0, Math.PI*2);
      ctx.globalAlpha = shown.length > 40 ? 0.75 : 1;
      ctx.fillStyle=palette[idx%palette.length];
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.globalAlpha = 1;
  });

  // HTML legend: no hard cap. It scrolls independently if many projects are shown.
  if(legendHost){
    legendHost.innerHTML = shown.map((r,idx)=>`<span class="radarLegendItem" title="${esc(r.사업명 || '이름 없음')}"><i style="background:${palette[idx%palette.length]}"></i><b>${esc(r.사업명 || '이름 없음')}</b></span>`).join('');
  }

  ctx.restore();
}
function tag(f,r){ return normVals(r[f]).slice(0,4).map(v=>`<span class="tag" style="background:${tagColors[f]||'#64748b'}">${esc(v)}</span>`).join(''); }
function renderCards(rows){
  $('cardMode').textContent = `필터 결과 ${rows.length}개 · 스파이더 표시 ${visibleRows(rows).length}개`;
  $('cards').innerHTML = rows.map(r => `<article class="bizCard ${state.hidden.has(r.id)?'off':''}"><div class="bizTop"><div><div class="bizTitle">${esc(r.사업명)}</div><div class="tagRow">${tag('주관부처',r)}${tag('대상',r)}${tag('분야',r)}${tag('AX 세부분야',r)}${tag('지역',r)}${tag('사업 운영방식',r)}${tag('선정 규모',r)}${tag('핵심역량',r)}</div></div><div class="cardActions">${r.링크?`<a href="${esc(r.링크)}" target="_blank">링크</a>`:''}<button class="toggleRadar" data-id="${r.id}">${state.hidden.has(r.id)?'스파이더 숨김':'스파이더 표시 중'}</button></div></div><p class="desc">${esc(r.비고 || '비고 없음')}</p><div class="metrics"><span class="metric">사업비: ${fmtNum(r.사업비)}</span><span class="metric">사업단 수: ${fmtNum(r['사업단 수'])}</span><span class="metric">1년 예산/사업단: ${fmtNum(r['1년 예산(천원)/사업단'],'천원')}</span><span class="metric">P1 ${Number(r.preset_1).toFixed(2)}</span><span class="metric">P2 ${Number(r.preset_2).toFixed(2)}</span><span class="metric">P3 ${Number(r.preset_3).toFixed(2)}</span><span class="metric">P4 ${Number(r.preset_4).toFixed(2)}</span><span class="metric">P5 ${Number(r.preset_5).toFixed(2)}</span></div></article>`).join('');
  document.querySelectorAll('.toggleRadar').forEach(b => b.onclick = () => { const id=Number(b.dataset.id); state.hidden.has(id) ? state.hidden.delete(id) : state.hidden.add(id); renderAll(); });
}

function reportMetricRow(label, rows, getter, suffix=''){
  return `<tr><th>${esc(label)}</th>${rows.map(r=>`<td>${esc(getter(r) ?? '미확인')}${suffix}</td>`).join('')}</tr>`;
}
function briefTags(r){
  return ['주관부처','분야','대상','AX 세부분야','지역','핵심역량'].map(f => {
    const vals = normVals(r[f]).slice(0,3).join(', ');
    return vals ? `<span class="reportTag">${esc(f)}: ${esc(vals)}</span>` : '';
  }).join('');
}
function strongestAxes(r){
  return radarAxes().map(ax => {
    const raw = clamp(Number(r[ax.key]) || 0, -1, 1);
    const val = radarAxisValue(r, ax);
    return {label: ax.label, value: val};
  }).sort((a,b)=>b.value-a.value).slice(0,3).map(x=>`${x.label} ${x.value.toFixed(2)}`).join(' · ');
}

function radarAxisDefinitions(){
  return [
    {key:'preset_1', short:'AI/AX', low:'AI전문', high:'AI융합'},
    {key:'preset_2', short:'지역', low:'전국', high:'지역분산'},
    {key:'preset_3', short:'수혜범위', low:'소수정예', high:'대규모확산'},
    {key:'preset_4', short:'교육성향', low:'연구중심', high:'실무/취업중심'},
    {key:'preset_5', short:'주관/연계', low:'대학중심', high:'산학연연계'}
  ];
}
function radarAxes(){
  return radarAxisDefinitions().map(ax => {
    const side = state.radarFocus[ax.key] || 'high';
    return {...ax, side, label: side === 'low' ? ax.low : ax.high, opposite: side === 'low' ? ax.high : ax.low};
  });
}
function radarAxisValue(r, ax){
  const raw = clamp(Number(r[ax.key]) || 0, -1, 1);
  return ax.side === 'low' ? (1 - raw) / 2 : (raw + 1) / 2;
}
function radarAxisDirection(r, ax){
  return ax.label;
}
function tendencyRows(rows){
  const axes = radarAxes();
  return axes.map((ax, ai)=>`<tr><th><b>${esc(ax.label)}</b><small>반대 성향: ${esc(ax.opposite)}</small></th>${rows.map((r,ri)=>{
    const v = radarAxisValue(r, ax);
    const raw = clamp(Number(r[ax.key]) || 0, -1, 1);
    const pct = Math.round(v * 100);
    const color = palette[ai % palette.length];
    return `<td><div class="tendencyCell"><div class="tendencyTrack"><span style="width:${pct}%;background:${color}"></span></div><b>${v.toFixed(2)}</b><em>${pct}% · ${esc(ax.label)} 기준</em></div></td>`;
  }).join('')}</tr>`).join('');
}
function drawReportRadar(rows){
  const cv = $('reportRadar');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const rect = cv.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(720, Math.round(rect.width || 920));
  const h = Math.max(520, Math.round(rect.height || 560));
  if(cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)){
    cv.width = Math.round(w*dpr);
    cv.height = Math.round(h*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const axes = radarAxes();
  const n = axes.length;
  const cx = w * 0.50;
  const cy = h * 0.52;
  const R = Math.min(w * 0.31, h * 0.36);
  ctx.save();
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  for(let ring=1; ring<=5; ring++){
    ctx.beginPath();
    axes.forEach((ax,i)=>{
      const a=-Math.PI/2+i*2*Math.PI/n, rr=R*ring/5;
      const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    });
    ctx.closePath();
    ctx.strokeStyle= ring === 5 ? '#d4deeb' : '#e8eff7';
    ctx.lineWidth= ring === 5 ? 1.7 : 1.1;
    ctx.stroke();
  }
  axes.forEach((ax,i)=>{
    const a=-Math.PI/2+i*2*Math.PI/n;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(a)*R, cy+Math.sin(a)*R);
    ctx.strokeStyle='#d8e2ee';
    ctx.lineWidth=1.15;
    ctx.stroke();
    const lx=cx+Math.cos(a)*(R+44), ly=cy+Math.sin(a)*(R+44);
    ctx.fillStyle='#243247';
    ctx.font='900 14px Pretendard, Apple SD Gothic Neo, Malgun Gothic, Arial, sans-serif';
    ctx.textAlign = Math.cos(a) > 0.25 ? 'left' : (Math.cos(a) < -0.25 ? 'right' : 'center');
    ctx.fillText(ax.label, lx, ly);
  });
  ctx.fillStyle='#94a3b8';
  ctx.font='800 12px Pretendard, Apple SD Gothic Neo, Malgun Gothic, Arial, sans-serif';
  ctx.textAlign='center';
  ctx.fillText('1.0', cx, cy-R-22);
  rows.forEach((r,idx)=>{
    const color = palette[idx%palette.length];
    ctx.beginPath();
    axes.forEach((ax,i)=>{
      const val=radarAxisValue(r, ax), a=-Math.PI/2+i*2*Math.PI/n, rr=R*val;
      const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    });
    ctx.closePath();
    ctx.strokeStyle=color;
    ctx.globalAlpha = rows.length > 40 ? 0.56 : (rows.length > 20 ? 0.72 : 0.95);
    ctx.lineWidth= rows.length > 40 ? 1.25 : (rows.length > 20 ? 1.7 : 2.4);
    ctx.stroke();
    ctx.globalAlpha = rows.length > 16 ? 0.035 : 0.08;
    ctx.fillStyle=color;
    ctx.fill();
    ctx.globalAlpha=1;
  });
  ctx.restore();
}
function renderDeepComparison(){
  const host = $('reportBody');
  if(!host) return;
  const rows = visibleRows(filtered());
  const shown = rows.slice(0, 12);
  if(!rows.length){
    host.innerHTML = `<div class="reportEmpty"><h3>선택된 사업이 없습니다.</h3><p>사업별 정성 유사도 탭에서 비교할 사업을 스파이더 표시 상태로 전환하면 이곳에 보고서가 구성됩니다.</p></div>`;
    return;
  }
  const cards = shown.map((r,i)=>`<article class="reportBizCard"><div class="reportBizHead"><span class="reportNum">사업 ${i+1}</span><b>${esc(r.사업명)}</b></div><div class="reportTags">${briefTags(r)}</div><p>${esc(r.비고 || '사업 개요 정보 없음')}</p><div class="reportStrong">주요 성향: ${esc(strongestAxes(r))}</div></article>`).join('');
  const reportLegend = rows.map((r,i)=>`<span class="reportLegendItem" title="${esc(r.사업명)}"><i style="background:${palette[i%palette.length]}"></i><b>${esc(r.사업명)}</b></span>`).join('');
  const metrics = `<table class="reportTable"><thead><tr><th>지표</th>${shown.map((r,i)=>`<th>${esc(r.사업명)}</th>`).join('')}</tr></thead><tbody>
    ${reportMetricRow('주관부처', shown, r=>normVals(r['주관부처']).join(', '))}
    ${reportMetricRow('분야', shown, r=>normVals(r['분야']).join(', '))}
    ${reportMetricRow('대상', shown, r=>normVals(r['대상']).join(', '))}
    ${reportMetricRow('AX 세부분야', shown, r=>normVals(r['AX 세부분야']).join(', '))}
    ${reportMetricRow('사업비', shown, r=>fmtNum(r['사업비']))}
    ${reportMetricRow('사업단 수', shown, r=>fmtNum(r['사업단 수']))}
  </tbody></table>`;
  const tendencyTable = `<div class="reportTableWrap"><table class="reportTable tendencyTable"><thead><tr><th>성향 지표</th>${shown.map(r=>`<th>${esc(r.사업명)}</th>`).join('')}</tr></thead><tbody>${tendencyRows(shown)}</tbody></table></div>`;
  const deptCounts = {};
  rows.forEach(r=>normVals(r['주관부처']).forEach(v=>deptCounts[v]=(deptCounts[v]||0)+1));
  const deptText = Object.entries(deptCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}개`).join(', ') || '없음';
  const areas = [...new Set(rows.flatMap(r=>normVals(r['AX 세부분야'])))].slice(0,18).join(', ') || '없음';
  host.innerHTML = `<div class="reportSummary"><div><b>${rows.length}</b><span>비교 대상 사업</span></div><div><b>${Object.keys(deptCounts).length}</b><span>관련 부처</span></div><div><b>${[...new Set(rows.flatMap(r=>normVals(r['AX 세부분야'])))].length}</b><span>AX 세부분야</span></div></div>
  <section class="reportHero"><div class="reportHeroHead"><div><h3>선택 사업 특성 비교</h3><p>사업별 정성 유사도 탭에서 표시 중인 사업들의 선택 기준별 성향 축을 비교합니다.</p></div><span>${rows.length}개 사업</span></div><canvas id="reportRadar"></canvas><div class="reportRadarLegend">${reportLegend}</div></section>
  <section class="reportSection"><h3>선택 사업 개요</h3><div class="reportBizGrid">${cards}</div>${rows.length>12?`<p class="reportNote">화면 보고서는 가독성을 위해 상위 12개 사업 카드와 표 컬럼만 표시합니다. 요약과 스파이더는 현재 선택 사업 전체 기준입니다.</p>`:''}</section>
  <section class="reportSection twoCol"><div><h3>분석 인사이트</h3><div class="insightBox blue"><b>부처 구성</b><p>${esc(deptText)}</p></div><div class="insightBox green"><b>AX 분야 범위</b><p>${esc(areas)}</p></div></div><div><h3>보고서 활용</h3><div class="insightBox amber"><b>해석 기준</b><p>프리셋 좌표는 사업 간 비교를 위한 상대적 특성값입니다. 절대 평가 점수가 아니라, 정책 포트폴리오의 분포와 중복 가능성을 파악하는 용도입니다.</p></div></div></section>
  <section class="reportSection"><h3>핵심 지표 비교</h3>${metrics}</section>
  <section class="reportSection"><h3>성향별 정량 비중 비교</h3><p class="reportNote">각 셀의 막대는 현재 선택한 성향 기준으로 환산한 값입니다. 100%에 가까울수록 해당 기준 성향이 강합니다.</p>${tendencyTable}</section>`;
  requestAnimationFrame(()=>drawReportRadar(rows));
}


function sumBudget(rows){
  return rows.reduce((s,r)=>s+(Number(r['사업비'])||0),0);
}
function topEntries(obj, n=6){ return Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n); }
function cellColorRatio(v, max){
  const t = max > 0 ? Math.min(1, v / max) : 0;
  const alpha = 0.10 + t * 0.78;
  return `rgba(37,99,235,${alpha})`;
}
function renderPortfolioAnalysis(){
  const host = $('portfolioBody');
  if(!host) return;
  const rows = filtered();
  const axis = $('portfolioAxis') ? $('portfolioAxis').value : 'AX 세부분야';
  const depts = [...new Set(rows.flatMap(r=>normVals(r['주관부처'])))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'ko'));
  const rawCats = [...new Set(rows.flatMap(r=>normVals(r[axis])))].filter(Boolean);
  const catCounts = {};
  rawCats.forEach(c => catCounts[c] = rows.filter(r=>normVals(r[axis]).includes(c)).length);
  const cats = Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,18).map(x=>x[0]);
  if(!rows.length || !depts.length || !cats.length){
    host.innerHTML = `<div class="reportEmpty"><h3>분석할 데이터가 부족합니다.</h3><p>현재 필터 조건에서 부처 또는 ${esc(axis)} 값이 있는 사업을 찾지 못했습니다.</p></div>`;
    return;
  }
  const matrix = depts.map(d => cats.map(c => rows.filter(r=>normVals(r['주관부처']).includes(d) && normVals(r[axis]).includes(c))));
  const maxCount = Math.max(1, ...matrix.flat().map(a=>a.length));
  const maxBudget = Math.max(1, ...matrix.flat().map(a=>sumBudget(a)));
  const heatRows = depts.map((d,di)=>`<tr><th>${esc(d)}</th>${cats.map((c,ci)=>{
    const cell = matrix[di][ci], cnt = cell.length, budget = sumBudget(cell);
    const intensity = cnt ? cellColorRatio(cnt, maxCount) : 'rgba(248,250,252,.9)';
    const title = `${d} × ${c}: ${cnt}개 / 사업비 ${fmtNum(budget)}`;
    return `<td title="${esc(title)}" style="background:${intensity}"><b>${cnt || ''}</b>${budget?`<em>${fmtNum(budget)}</em>`:''}</td>`;
  }).join('')}</tr>`).join('');
  const deptBudget = {};
  rows.forEach(r=>normVals(r['주관부처']).forEach(d=>deptBudget[d]=(deptBudget[d]||0)+(Number(r['사업비'])||0)));
  const catBudget = {};
  rows.forEach(r=>normVals(r[axis]).forEach(c=>catBudget[c]=(catBudget[c]||0)+(Number(r['사업비'])||0)));
  const overlap = [];
  cats.forEach(c=>{
    const ds = depts.filter(d=>rows.some(r=>normVals(r['주관부처']).includes(d) && normVals(r[axis]).includes(c)));
    if(ds.length >= 2) overlap.push([c, ds.length, ds.join(', ')]);
  });
  host.innerHTML = `<div class="analysisSummary"><div><b>${rows.length}</b><span>분석 사업</span></div><div><b>${depts.length}</b><span>관련 부처</span></div><div><b>${cats.length}</b><span>표시 ${esc(axis)}</span></div></div>
  <section class="analysisCard"><div class="analysisCardHead"><div><h3>부처 × ${esc(axis)} 사업 수 히트맵</h3><p>셀 숫자는 사업 수, 작은 보조 숫자는 사업비 합계입니다. 상위 ${cats.length}개 ${esc(axis)}만 표시합니다.</p></div></div><div class="heatmapWrap"><table class="heatmapTable"><thead><tr><th>부처</th>${cats.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${heatRows}</tbody></table></div></section>
  <section class="analysisGrid2"><div class="analysisCard"><h3>사업비 상위 부처</h3>${topEntries(deptBudget,8).map(([k,v])=>`<div class="rankBar"><span>${esc(k)}</span><div><i style="width:${Math.min(100, v/Math.max(...Object.values(deptBudget))*100)}%"></i></div><b>${fmtNum(v)}</b></div>`).join('') || '<p class="muted">사업비 데이터가 부족합니다.</p>'}</div>
  <div class="analysisCard"><h3>${esc(axis)} 중복/공유 후보</h3>${overlap.sort((a,b)=>b[1]-a[1]).slice(0,10).map(([c,n,ds])=>`<div class="overlapItem"><b>${esc(c)}</b><span>${n}개 부처: ${esc(ds)}</span></div>`).join('') || '<p class="muted">복수 부처가 공유하는 항목이 많지 않습니다.</p>'}</div></section>`;
}
function jaccard(a,b){
  const A = new Set(normVals(a)); const B = new Set(normVals(b));
  if(!A.size && !B.size) return 0;
  let inter=0; A.forEach(x=>{ if(B.has(x)) inter++; });
  return inter / new Set([...A,...B]).size;
}
function presetSimilarity(a,b){
  const dist = Math.sqrt(Object.keys(presets).reduce((s,k)=>s+Math.pow((Number(a[k])||0)-(Number(b[k])||0),2),0));
  return Math.max(0, 1 - dist / Math.sqrt(20));
}
function similarityScore(a,b){
  const p = presetSimilarity(a,b);
  const target = jaccard(a['대상'], b['대상']);
  const field = jaccard(a['분야'], b['분야']);
  const ax = jaccard(a['AX 세부분야'], b['AX 세부분야']);
  const cap = jaccard(a['핵심역량'], b['핵심역량']);
  const region = jaccard(a['지역'], b['지역']);
  const deptSame = jaccard(a['주관부처'], b['주관부처']);
  return {score: p*0.34 + target*0.13 + field*0.15 + ax*0.18 + cap*0.12 + region*0.04 + deptSame*0.04, p,target,field,ax,cap,region,deptSame};
}
function renderDuplicationAnalysis(){
  const host = $('duplicationBody');
  if(!host) return;
  const rows = filtered();
  const threshold = Number($('similarityThreshold')?.value || 0.70);
  if(rows.length < 2){
    host.innerHTML = `<div class="reportEmpty"><h3>비교할 사업이 부족합니다.</h3><p>현재 필터 조건에서 2개 이상의 사업이 필요합니다.</p></div>`;
    return;
  }
  const pairs = [];
  for(let i=0;i<rows.length;i++) for(let j=i+1;j<rows.length;j++){
    const s = similarityScore(rows[i], rows[j]);
    if(s.score >= threshold) pairs.push({a:rows[i], b:rows[j], ...s});
  }
  pairs.sort((x,y)=>y.score-x.score);
  const topPairs = pairs.slice(0,80);
  const topNames = [...new Set(topPairs.slice(0,25).flatMap(p=>[p.a.사업명,p.b.사업명]))].slice(0,16);
  const simGridCols = `210px repeat(${topNames.length}, 96px)`;
  const hmHead = `<div class="simGridCell simGridCorner">사업</div>${topNames.map(n=>`<div class="simGridCell simGridHead" title="${esc(n)}">${esc(n)}</div>`).join('')}`;
  const hmRows = topNames.map(a=>`<div class="simGridCell simGridRowHead" title="${esc(a)}">${esc(a)}</div>${topNames.map(b=>{
    if(a===b) return `<div class="simGridCell simGridVal simGridDiag">1.00</div>`;
    const ra = rows.find(r=>r.사업명===a), rb = rows.find(r=>r.사업명===b);
    const sc = ra&&rb ? similarityScore(ra,rb).score : 0;
    return `<div class="simGridCell simGridVal" style="background:${cellColorRatio(sc,1)}">${sc?sc.toFixed(2):''}</div>`;
  }).join('')}`).join('');
  const pairRows = topPairs.slice(0,40).map(p=>{
    const crossDept = normVals(p.a['주관부처']).join(', ') !== normVals(p.b['주관부처']).join(', ');
    return `<tr><td><b>${esc(p.a.사업명)}</b><em>${esc(normVals(p.a['주관부처']).join(', ')||'-')}</em></td><td><b>${esc(p.b.사업명)}</b><em>${esc(normVals(p.b['주관부처']).join(', ')||'-')}</em></td><td><span class="scorePill">${p.score.toFixed(2)}</span>${crossDept?'<span class="crossPill">부처간</span>':''}</td><td>좌표 ${p.p.toFixed(2)} · 대상 ${p.target.toFixed(2)} · 분야 ${p.field.toFixed(2)} · AX ${p.ax.toFixed(2)} · 역량 ${p.cap.toFixed(2)}</td></tr>`;
  }).join('');
  const network = topPairs.slice(0,18).map((p,i)=>`<div class="edgeCard"><div><b>${esc(p.a.사업명)}</b><span>${esc(normVals(p.a['주관부처']).join(', ')||'-')}</span></div><strong>${p.score.toFixed(2)}</strong><div><b>${esc(p.b.사업명)}</b><span>${esc(normVals(p.b['주관부처']).join(', ')||'-')}</span></div></div>`).join('');
  host.innerHTML = `<div class="analysisSummary"><div><b>${rows.length}</b><span>분석 사업</span></div><div><b>${pairs.length}</b><span>기준 이상 유사쌍</span></div><div><b>${topPairs.filter(p=>normVals(p.a['주관부처']).join(', ')!==normVals(p.b['주관부처']).join(', ')).length}</b><span>부처간 후보</span></div></div>
  <section class="analysisGrid2"><div class="analysisCard"><h3>상위 유사사업 네트워크 후보</h3><p class="muted">러프 버전에서는 상위 유사쌍을 edge card 형태로 표시합니다.</p><div class="edgeList">${network || '<p class="muted">현재 기준 이상의 유사쌍이 없습니다.</p>'}</div></div>
  <div class="analysisCard"><h3>유사도 히트맵</h3><p class="muted">상위 유사쌍에 포함된 사업 중 최대 16개를 표시합니다.</p><div class="simGridWrap"><div class="simGrid" style="grid-template-columns:${simGridCols}">${hmHead}${hmRows}</div></div></div></section>
  <section class="analysisCard"><h3>유사사업 후보 목록</h3><div class="reportTableWrap"><table class="reportTable"><thead><tr><th>사업 A</th><th>사업 B</th><th>유사도</th><th>세부 근거</th></tr></thead><tbody>${pairRows || '<tr><td colspan="4">현재 기준 이상의 유사사업 후보가 없습니다. 기준을 낮춰보십시오.</td></tr>'}</tbody></table></div></section>`;
}


function truncateName(s, n=18){ const t=String(s||''); return t.length>n ? t.slice(0,n-1)+'…' : t; }
function deptKey(r){ return normVals(r['주관부처'])[0] || '미분류'; }
function relationPairs(rows, threshold){
  const pairs=[];
  for(let i=0;i<rows.length;i++) for(let j=i+1;j<rows.length;j++){
    const s=similarityScore(rows[i],rows[j]);
    if(s.score>=threshold) pairs.push({a:rows[i],b:rows[j],score:s.score,detail:s});
  }
  pairs.sort((x,y)=>y.score-x.score);
  return pairs;
}
function pickRelationNodes(rows, pairs, maxNodes){
  const weight={};
  pairs.forEach(p=>{ weight[p.a.id]=(weight[p.a.id]||0)+p.score; weight[p.b.id]=(weight[p.b.id]||0)+p.score; });
  const ranked=rows.slice().sort((a,b)=>(weight[b.id]||0)-(weight[a.id]||0));
  return ranked.slice(0, Math.min(maxNodes, ranked.length));
}
function renderNetworkSvg(nodes, edges){
  const w=980,h=620,cx=w/2,cy=h/2;
  const cm={}; [...new Set(nodes.map(deptKey))].forEach((d,i)=>cm[d]=palette[i%palette.length]);
  const pos={};
  nodes.forEach((n,i)=>{ const a=2*Math.PI*i/Math.max(1,nodes.length); pos[n.id]={x:cx+Math.cos(a)*w*.31,y:cy+Math.sin(a)*h*.33}; });
  // deterministic force relaxation
  for(let it=0; it<160; it++){
    const disp={}; nodes.forEach(n=>disp[n.id]={x:0,y:0});
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
      const A=pos[nodes[i].id], B=pos[nodes[j].id]; let dx=A.x-B.x, dy=A.y-B.y; let d=Math.sqrt(dx*dx+dy*dy)||1;
      const rep=9200/(d*d); dx/=d; dy/=d; disp[nodes[i].id].x+=dx*rep; disp[nodes[i].id].y+=dy*rep; disp[nodes[j].id].x-=dx*rep; disp[nodes[j].id].y-=dy*rep;
    }
    edges.forEach(e=>{
      const A=pos[e.a.id], B=pos[e.b.id]; let dx=B.x-A.x, dy=B.y-A.y; let d=Math.sqrt(dx*dx+dy*dy)||1;
      const target=88+(1-e.score)*190; const f=(d-target)*0.020*e.score; dx/=d; dy/=d;
      disp[e.a.id].x+=dx*f; disp[e.a.id].y+=dy*f; disp[e.b.id].x-=dx*f; disp[e.b.id].y-=dy*f;
    });
    nodes.forEach(n=>{ const p=pos[n.id], d=disp[n.id]; p.x=clamp(p.x+d.x,82,w-82); p.y=clamp(p.y+d.y,58,h-62); });
  }
  const edgeSvg=edges.map((e,idx)=>{ const A=pos[e.a.id], B=pos[e.b.id]; const sw=1.2+5.2*Math.max(0,e.score-.6); return `<line class="netEdge" data-a="${e.a.id}" data-b="${e.b.id}" data-score="${e.score.toFixed(3)}" x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="#2563eb" stroke-opacity="${Math.min(.76, .14+e.score*.55).toFixed(2)}" stroke-width="${Math.max(1,sw).toFixed(1)}"><title>${esc(e.a.사업명)} ↔ ${esc(e.b.사업명)} ${e.score.toFixed(2)}</title></line>`; }).join('');
  const nodeSvg=nodes.map(n=>{ const p=pos[n.id], degree=edges.filter(e=>e.a.id===n.id||e.b.id===n.id).length; const r=8+Math.min(13,degree*1.35); const c=cm[deptKey(n)]; return `<g class="netNode" data-id="${n.id}" data-name="${esc(n.사업명)}" data-dept="${esc(deptKey(n))}" data-degree="${degree}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><circle r="${r}" fill="${c}" stroke="#fff" stroke-width="2.5"></circle><text x="${r+7}" y="4">${esc(truncateName(n.사업명,17))}</text><title>${esc(n.사업명)}\n${esc(deptKey(n))}\n연결 ${degree}개</title></g>`; }).join('');
  const legend=Object.entries(cm).map(([d,c])=>`<span><i style="background:${c}"></i>${esc(d)}</span>`).join('');
  return `<div class="networkLegend">${legend}</div><div class="networkHelp">노드를 드래그해 위치를 조정할 수 있습니다. 노드에 마우스를 올리면 직접 연결 edge가 강조됩니다.</div><svg id="networkSvg" class="networkSvg" viewBox="0 0 ${w} ${h}" role="img"><g class="netEdges">${edgeSvg}</g><g class="netNodes">${nodeSvg}</g></svg>`;
}

function attachNetworkInteractions(){
  const svg = document.getElementById('networkSvg');
  if(!svg) return;
  let drag = null;
  function pt(evt){
    const p = svg.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function setNodePos(node, x, y){
    node.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    const id = node.dataset.id;
    svg.querySelectorAll(`.netEdge[data-a="${id}"], .netEdge[data-b="${id}"]`).forEach(edge=>{
      if(edge.dataset.a === id){ edge.setAttribute('x1', x.toFixed(1)); edge.setAttribute('y1', y.toFixed(1)); }
      if(edge.dataset.b === id){ edge.setAttribute('x2', x.toFixed(1)); edge.setAttribute('y2', y.toFixed(1)); }
    });
  }
  svg.querySelectorAll('.netNode').forEach(node=>{
    node.addEventListener('pointerdown', e=>{
      if(e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      const m = /translate\(([-0-9.]+),([-0-9.]+)\)/.exec(node.getAttribute('transform'));
      const cur = pt(e);
      drag = {node, ox: cur.x - Number(m?.[1]||0), oy: cur.y - Number(m?.[2]||0)};
      node.classList.add('dragging');
      svg.setPointerCapture(e.pointerId);
    });
    node.addEventListener('mouseenter', ()=>{
      const id=node.dataset.id;
      svg.classList.add('netHovering');
      node.classList.add('focusNode');
      svg.querySelectorAll(`.netEdge[data-a="${id}"], .netEdge[data-b="${id}"]`).forEach(e=>e.classList.add('focusEdge'));
    });
    node.addEventListener('mouseleave', ()=>{
      svg.classList.remove('netHovering');
      svg.querySelectorAll('.focusNode,.focusEdge').forEach(el=>el.classList.remove('focusNode','focusEdge'));
    });
  });
  svg.addEventListener('pointermove', e=>{
    if(!drag) return;
    const cur=pt(e);
    const x=clamp(cur.x-drag.ox, 40, 940), y=clamp(cur.y-drag.oy, 40, 580);
    setNodePos(drag.node, x, y);
  });
  svg.addEventListener('pointerup', e=>{
    if(drag){ drag.node.classList.remove('dragging'); drag=null; }
    try{ svg.releasePointerCapture(e.pointerId); }catch(_){ }
  });
}

function avgDistance(c1,c2,dist){
  let s=0,n=0; c1.items.forEach(a=>c2.items.forEach(b=>{ s+=dist[a+'|'+b] ?? dist[b+'|'+a] ?? 1; n++; }));
  return n?s/n:1;
}
function buildDendrogram(nodes){
  const leaves=nodes.map((n,i)=>({id:'L'+i, name:n.사업명, items:[i], height:0, left:null, right:null}));
  if(leaves.length<2) return {root:leaves[0], order:leaves};
  const dist={};
  for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) dist[i+'|'+j]=1-similarityScore(nodes[i],nodes[j]).score;
  let clusters=leaves.slice(), idx=0;
  while(clusters.length>1){
    let best=[0,1,Infinity];
    for(let i=0;i<clusters.length;i++) for(let j=i+1;j<clusters.length;j++){ const d=avgDistance(clusters[i],clusters[j],dist); if(d<best[2]) best=[i,j,d]; }
    const [i,j,d]=best; const a=clusters[i], b=clusters[j];
    const merged={id:'C'+(idx++), name:'', items:[...a.items,...b.items], height:d, left:a, right:b};
    clusters=clusters.filter((_,k)=>k!==i&&k!==j); clusters.push(merged);
  }
  const order=[]; (function walk(c){ if(!c.left&&!c.right) order.push(c); else {walk(c.left); walk(c.right);} })(clusters[0]);
  return {root:clusters[0], order};
}
function renderDendrogramSvg(nodes){
  const dend=buildDendrogram(nodes);
  if(!dend.root) return '<p class="muted">덴드로그램을 그릴 노드가 부족합니다.</p>';
  const rowH=28, labelW=260, w=980, h=Math.max(220, dend.order.length*rowH+40), maxH=Math.max(.001,dend.root.height||1);
  const yPos={}; dend.order.forEach((l,i)=>yPos[l.id]=28+i*rowH);
  function nodeY(c){ if(yPos[c.id]!==undefined) return yPos[c.id]; return (nodeY(c.left)+nodeY(c.right))/2; }
  function nodeX(c){ return labelW + (1-(c.height/maxH))*(w-labelW-40); }
  const lines=[];
  (function draw(c){
    if(!c.left||!c.right) return;
    const x=nodeX(c), y1=nodeY(c.left), y2=nodeY(c.right), xl=nodeX(c.left), xr=nodeX(c.right);
    lines.push(`<path d="M ${x} ${y1} L ${x} ${y2} M ${x} ${y1} L ${xl} ${y1} M ${x} ${y2} L ${xr} ${y2}" class="dendLine"><title>거리 ${c.height.toFixed(2)} / 유사도 ${(1-c.height).toFixed(2)}</title></path>`);
    draw(c.left); draw(c.right);
  })(dend.root);
  const labels=dend.order.map((l,i)=>`<text x="14" y="${yPos[l.id]+4}" class="dendLabel"><title>${esc(nodes[l.items[0]].사업명)}</title>${esc(truncateName(nodes[l.items[0]].사업명,34))}</text>`).join('');
  return `<svg class="dendSvg" viewBox="0 0 ${w} ${h}" role="img"><line x1="${labelW}" y1="18" x2="${w-34}" y2="18" stroke="#e2e8f0"/><text x="${labelW}" y="14" class="dendAxis">유사도 높음</text><text x="${w-105}" y="14" class="dendAxis">유사도 낮음</text>${lines.join('')}${labels}</svg>`;
}
function renderRelationAnalysis(){
  const host=$('relationBody'); if(!host) return;
  const baseRows=filtered(); const rows=visibleRows(baseRows); const threshold=Number($('relationThreshold')?.value||0.65); const maxNodes=Number($('relationMaxNodes')?.value||24);
  if(rows.length<2){ host.innerHTML=`<div class="reportEmpty"><h3>연관성을 분석할 선택 사업이 부족합니다.</h3><p>첫 번째 탭에서 스파이더 표시 중인 사업이 2개 이상 필요합니다.</p></div>`; return; }
  const pairs=relationPairs(rows,threshold);
  const nodes=pickRelationNodes(rows,pairs,maxNodes);
  const nodeIds=new Set(nodes.map(n=>n.id));
  const edges=pairs.filter(p=>nodeIds.has(p.a.id)&&nodeIds.has(p.b.id)).slice(0,Math.max(30,maxNodes*4));
  const deptCount=new Set(nodes.map(deptKey)).size;
  const avg=edges.length?edges.reduce((s,e)=>s+e.score,0)/edges.length:0;
  host.innerHTML=`<div class="analysisSummary"><div><b>${nodes.length}</b><span>표시 과제</span></div><div><b>${edges.length}</b><span>연관 edge</span></div><div><b>${avg.toFixed(2)}</b><span>평균 유사도</span></div></div>
  <section class="analysisCard"><div class="analysisCardHead"><div><h3>과제 연관성 네트워크</h3><p>첫 번째 탭에서 스파이더 표시 중인 사업만 대상으로 합니다. 노드는 과제, 선은 기준 이상 유사도를 뜻합니다.</p></div><span class="miniBadge">${deptCount}개 부처</span></div>${edges.length?renderNetworkSvg(nodes,edges):'<p class="muted">현재 기준 이상의 연결이 부족합니다. 연관성 기준을 낮춰보십시오.</p>'}</section>
  <section class="analysisCard"><div class="analysisCardHead"><div><h3>과제군 덴드로그램</h3><p>첫 번째 탭에서 스파이더 표시 중인 사업만 대상으로 한 평균연결 군집화입니다. 가까이 묶일수록 성격이 유사합니다.</p></div><span class="miniBadge">상위 ${nodes.length}개</span></div><div class="dendWrap">${renderDendrogramSvg(nodes.slice(0,Math.min(nodes.length,32)))}</div></section>`;
  attachNetworkInteractions();
}

function renderAll(){ const rows=filtered(); $('filteredCount').textContent=rows.length; $('selectedCount').textContent=visibleRows(rows).length; renderScatter(rows); drawRadar(rows); renderCards(rows); renderDeepComparison(); renderPortfolioAnalysis(); renderDuplicationAnalysis(); renderRelationAnalysis(); }

document.addEventListener('DOMContentLoaded', init);
