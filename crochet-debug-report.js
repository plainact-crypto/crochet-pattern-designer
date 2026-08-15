// Crochet generator compact diagnostic summary — renderer snapshot is authoritative.
(()=>{
  function build(){
    const snap=window.__LACE_LAYOUT_SNAPSHOT||null,v=snap?.validation||{},d=snap?.debug||window.__LACE_DEBUG_SUMMARY||{};
    const report={
      renderer:d.renderer||snap?.renderer||'unknown',
      bodyCollisions:Number.isFinite(v.bodyCollisions)?v.bodyCollisions:null,
      sectorBboxSizes:d.sectorBboxSizes||v.sectorBboxes?.map(b=>b?`${b.width.toFixed(1)}x${b.height.toFixed(1)}`:'—')||[],
      symmetryError:Number.isFinite(v.symmetryError)?Math.round(v.symmetryError*100)/100:null,
      clippedSymbols:Number.isFinite(v.clippedSymbols)?v.clippedSymbols:null,
      validation:v.ok===true?'PASS':v.ok===false?'FAIL':'UNKNOWN',
      errors:Array.isArray(v.errors)?v.errors:[]
    };
    window.lastCrochetDebugReport=report;return report;
  }
  function text(){const r=build();return [`Renderer version: ${r.renderer}`,`Body collisions: ${r.bodyCollisions??'—'}`,`Sector bbox sizes: ${r.sectorBboxSizes.join(' / ')||'—'}`,`Symmetry error: ${r.symmetryError??'—'}`,`Clipped symbols: ${r.clippedSymbols??'—'}`,`Validation: ${r.validation}`,...(r.errors.length?[`Errors: ${r.errors.join(' · ')}`]:[])].join('\n');}
  function install(){const card=document.querySelector('#photoModeModal .photo-card');if(!card||document.getElementById('crochetDebugBtn'))return;const btn=document.createElement('button');btn.id='crochetDebugBtn';btn.type='button';btn.className='modal-primary';btn.style.cssText='margin-top:10px;background:#39424c';btn.textContent='SHOW DEBUG SUMMARY';const pre=document.createElement('pre');pre.id='crochetDebugOutput';pre.style.cssText='display:none;margin-top:10px;white-space:pre-wrap;background:#0b1015;color:#dce8f5;border:1px solid #46515d;border-radius:10px;padding:12px;font:11px/1.55 ui-monospace,Consolas,monospace';btn.onclick=()=>{pre.textContent=text();pre.style.display='block';btn.textContent='REFRESH DEBUG SUMMARY'};card.appendChild(btn);card.appendChild(pre)}
  document.addEventListener('click',e=>{if(e.target?.id==='laceImport'||e.target?.id==='photoModeBtn'||e.target?.id==='mobilePhotoModeBtn')setTimeout(install,0)},true);setTimeout(install,0);window.buildCrochetDebugReport=build;window.getCrochetDebugReportText=text;
})();