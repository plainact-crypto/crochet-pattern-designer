// Crochet generator diagnostic report — authoritative renderer-snapshot instrumentation.
(()=>{
  const CELL=24;
  function round2(v){return Number.isFinite(v)?Math.round(v*100)/100:null}
  function countBy(list,key){const out={};for(const x of list){const k=String(x?.[key]??'none');out[k]=(out[k]||0)+1}return out}
  function bbox(list){if(!list.length)return null;const xs=list.map(i=>i.gridCol),ys=list.map(i=>i.gridRow);return{minCol:Math.min(...xs),maxCol:Math.max(...xs),minRow:Math.min(...ys),maxRow:Math.max(...ys),width:Math.max(...xs)-Math.min(...xs)+1,height:Math.max(...ys)-Math.min(...ys)+1}}
  function radialStats(list,cx,cy){if(!list.length)return null;const ds=list.map(i=>Math.hypot(i.gridCol-cx,i.gridRow-cy));return{count:list.length,min:round2(Math.min(...ds)),max:round2(Math.max(...ds)),avg:round2(ds.reduce((a,b)=>a+b,0)/ds.length)}}
  function build(){
    const snap=window.__LACE_LAYOUT_SNAPSHOT||null;
    const gen=Array.isArray(snap?.nodes)?snap.nodes:[];
    const cx=snap?.center?.gridCol??null,cy=snap?.center?.gridRow??null;
    const collisions=[];const occ=new Map();
    for(const i of gen){const k=`${i.gridCol},${i.gridRow}`;const a=occ.get(k)||[];a.push(i);occ.set(k,a)}
    for(const [k,a] of occ)if(a.length>1)collisions.push({grid:k,count:a.length,roles:a.map(i=>i.role),types:a.map(i=>i.type),ids:a.map(i=>i.id)});
    const sectors={};const roles=['inner-chain','inner-petal-stitch','mid-chain','mid-petal-stitch','outer-chain','outer-petal-stitch','edge-sc'];
    for(let s=1;s<=5;s++){
      const allSector=gen.filter(i=>i.sector===s);const layers={};
      for(const role of roles){const arr=allSector.filter(i=>i.role===role);layers[role]={count:arr.length,bbox:bbox(arr),radial:(cx!=null?radialStats(arr,cx,cy):null),types:countBy(arr,'type'),sample:arr.slice(0,6).map(i=>({type:i.type,grid:[i.gridCol,i.gridRow],rotation:round2(i.rotation),workedInto:i.workedInto||null}))};}
      sectors[s]={bbox:bbox(allSector),layers};
    }
    const metrics={};for(const t of ['ring','chain','slip','single','half','double','treble','dtr']){const m=window.CROCHET_STITCH_METRICS?.[t];if(m)metrics[t]={visualWidthPx:m.visualWidthPx??m.visualSizePx,visualHeightPx:m.visualHeightPx??m.visualSizePx,cellWidth:m.cellWidth,cellHeight:m.cellHeight,anchorOffsetY:m.anchorOffsetY};}
    const warnings=[];
    if(!snap)warnings.push('NO RENDERER SNAPSHOT FOUND');
    if(collisions.length)warnings.push(`GRID COLLISIONS: ${collisions.length}`);
    if(cx!=null){for(let s=1;s<=5;s++){const L=sectors[s].layers;const a=L['inner-petal-stitch'].radial?.avg,b=L['mid-petal-stitch'].radial?.avg,c=L['outer-petal-stitch'].radial?.avg;if(a!=null&&b!=null&&b-a>5)warnings.push(`Sector ${s}: inner→middle radial gap ${round2(b-a)} cells`);if(b!=null&&c!=null&&c-b>6)warnings.push(`Sector ${s}: middle→outer radial gap ${round2(c-b)} cells`);}}
    const domPlaced=[...document.querySelectorAll('#board .placed')];
    const report={generatedAt:new Date().toISOString(),source:'renderer-snapshot',renderer:{name:snap?.renderer||'lace-flower-renderer-v4',createdAt:snap?.createdAt||null,gridCellPx:snap?.cellPx||CELL,validation:snap?.validation||null,domPlacedCount:domPlaced.length},totals:{boardNodes:gen.length,byRound:countBy(gen,'round'),byRole:countBy(gen,'role'),byType:countBy(gen,'type')},center:{gridCol:cx,gridRow:cy},symbolMetrics:metrics,sectors,collisions,warnings};
    window.lastCrochetDebugReport=report;return report;
  }
  function text(){return JSON.stringify(build(),null,2)}
  function install(){const card=document.querySelector('#photoModeModal .photo-card');if(!card||document.getElementById('crochetDebugBtn'))return;const btn=document.createElement('button');btn.id='crochetDebugBtn';btn.type='button';btn.className='modal-primary';btn.style.cssText='margin-top:10px;background:#39424c';btn.textContent='SHOW ENGINE DEBUG REPORT';const pre=document.createElement('pre');pre.id='crochetDebugOutput';pre.style.cssText='display:none;margin-top:10px;max-height:420px;overflow:auto;white-space:pre-wrap;background:#0b1015;color:#dce8f5;border:1px solid #46515d;border-radius:10px;padding:12px;font:11px/1.45 ui-monospace,Consolas,monospace';btn.onclick=()=>{pre.textContent=text();pre.style.display='block';btn.textContent='REFRESH ENGINE DEBUG REPORT'};card.appendChild(btn);card.appendChild(pre)}
  document.addEventListener('click',e=>{if(e.target?.id==='laceImport')setTimeout(install,80);if(e.target?.id==='photoModeBtn'||e.target?.id==='mobilePhotoModeBtn')setTimeout(install,0)},true);setTimeout(install,0);window.buildCrochetDebugReport=build;window.getCrochetDebugReportText=text;
})();