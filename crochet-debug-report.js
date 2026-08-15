// Crochet generator diagnostic report — read-only instrumentation.
(()=>{
  const CELL=24;
  function round2(v){return Number.isFinite(v)?Math.round(v*100)/100:null}
  function countBy(list,key){const out={};for(const x of list){const k=String(x?.[key]??'none');out[k]=(out[k]||0)+1}return out}
  function bbox(list){if(!list.length)return null;const xs=list.map(i=>i.gridCol),ys=list.map(i=>i.gridRow);return{minCol:Math.min(...xs),maxCol:Math.max(...xs),minRow:Math.min(...ys),maxRow:Math.max(...ys),width:Math.max(...xs)-Math.min(...xs)+1,height:Math.max(...ys)-Math.min(...ys)+1}}
  function radialStats(list,cx,cy){if(!list.length)return null;const ds=list.map(i=>Math.hypot(i.gridCol-cx,i.gridRow-cy));return{count:list.length,min:round2(Math.min(...ds)),max:round2(Math.max(...ds)),avg:round2(ds.reduce((a,b)=>a+b,0)/ds.length)}}
  function build(){
    const graph=window.activeCrochetGraph||window.lastGeneratedCrochetGraph||null;
    const gen=Array.isArray(window.items)?window.items.filter(i=>i?.generatedPattern&&i.patternKind==='lace-flower'):(typeof items!=='undefined'&&Array.isArray(items)?items.filter(i=>i?.generatedPattern&&i.patternKind==='lace-flower'):[]);
    const center=gen.find(i=>i.role==='start');const cx=center?.gridCol??null,cy=center?.gridRow??null;
    const collisions=[];const occ=new Map();
    for(const i of gen){const k=`${i.gridCol},${i.gridRow}`;const a=occ.get(k)||[];a.push(i);occ.set(k,a)}
    for(const [k,a] of occ)if(a.length>1)collisions.push({grid:k,count:a.length,roles:a.map(i=>i.role),types:a.map(i=>i.type)});
    const orphan=[];const ids=new Set(graph?.nodes?.map(n=>n.id)||[]),spaces=new Set(graph?.spaces?.map(s=>s.id)||[]);
    for(const n of graph?.nodes||[]){if(n.workedInto&&!ids.has(n.workedInto)&&!spaces.has(n.workedInto))orphan.push({id:n.id,role:n.role,problem:'workedInto',target:n.workedInto});if(n.anchor&&!ids.has(n.anchor))orphan.push({id:n.id,role:n.role,problem:'anchor',target:n.anchor})}
    const sectors={};const roles=['inner-chain','inner-petal-stitch','mid-chain','mid-petal-stitch','outer-chain','outer-petal-stitch','edge-sc'];
    for(let s=1;s<=5;s++){
      const all=gen.filter(i=>i.sector===s);const layers={};
      for(const role of roles){const arr=all.filter(i=>i.role===role);layers[role]={count:arr.length,bbox:bbox(arr),radial:(cx!=null?radialStats(arr,cx,cy):null),types:countBy(arr,'type')};}
      sectors[s]={bbox:bbox(all),layers};
    }
    const metrics={};for(const t of ['ring','chain','slip','single','half','double','treble','dtr']){const m=window.CROCHET_STITCH_METRICS?.[t];if(m)metrics[t]={visualWidthPx:m.visualWidthPx??m.visualSizePx,visualHeightPx:m.visualHeightPx??m.visualSizePx,cellWidth:m.cellWidth,cellHeight:m.cellHeight,anchorOffsetY:m.anchorOffsetY};}
    const warnings=[];
    if(collisions.length)warnings.push(`GRID COLLISIONS: ${collisions.length}`);
    if(orphan.length)warnings.push(`BROKEN TOPOLOGY REFERENCES: ${orphan.length}`);
    if(cx!=null){for(let s=1;s<=5;s++){const L=sectors[s].layers;const a=L['inner-petal-stitch'].radial?.avg,b=L['mid-petal-stitch'].radial?.avg,c=L['outer-petal-stitch'].radial?.avg;if(a!=null&&b!=null&&b-a>5)warnings.push(`Sector ${s}: inner→middle radial gap ${round2(b-a)} cells`);if(b!=null&&c!=null&&c-b>6)warnings.push(`Sector ${s}: middle→outer radial gap ${round2(c-b)} cells`);}}
    const report={
      generatedAt:new Date().toISOString(),engine:{kind:graph?.kind||null,version:graph?.version||null,params:graph?.params||null,validation:graph?.validation||null},renderer:{name:'lace-flower-renderer-v4',gridCellPx:CELL,boardDataset:{laceFlowerV4Valid:document.getElementById('board')?.dataset?.laceFlowerV4Valid||null,generatedGridValid:document.getElementById('board')?.dataset?.generatedGridValid||null}},
      totals:{boardNodes:gen.length,graphNodes:graph?.nodes?.length||0,spaces:graph?.spaces?.length||0,byRound:countBy(gen,'round'),byRole:countBy(gen,'role'),byType:countBy(gen,'type')},
      center:{gridCol:cx,gridRow:cy},symbolMetrics:metrics,sectors,collisions,brokenReferences:orphan,warnings
    };
    window.lastCrochetDebugReport=report;return report;
  }
  function text(){return JSON.stringify(build(),null,2)}
  function install(){
    const card=document.querySelector('#photoModeModal .photo-card');if(!card||document.getElementById('crochetDebugBtn'))return;
    const btn=document.createElement('button');btn.id='crochetDebugBtn';btn.type='button';btn.className='modal-primary';btn.style.cssText='margin-top:10px;background:#39424c';btn.textContent='SHOW ENGINE DEBUG REPORT';
    const pre=document.createElement('pre');pre.id='crochetDebugOutput';pre.style.cssText='display:none;margin-top:10px;max-height:320px;overflow:auto;white-space:pre-wrap;background:#0b1015;color:#dce8f5;border:1px solid #46515d;border-radius:10px;padding:12px;font:11px/1.45 ui-monospace,Consolas,monospace';
    btn.onclick=()=>{const v=text();pre.textContent=v;pre.style.display='block';btn.textContent='REFRESH ENGINE DEBUG REPORT'};
    card.appendChild(btn);card.appendChild(pre);
  }
  document.addEventListener('click',e=>{if(e.target?.id==='laceImport')setTimeout(()=>{build();install()},80);if(e.target?.id==='photoModeBtn'||e.target?.id==='mobilePhotoModeBtn')setTimeout(install,0)},true);
  setTimeout(install,0);
  window.buildCrochetDebugReport=build;window.getCrochetDebugReportText=text;
})();