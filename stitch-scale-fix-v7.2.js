// v7.2 — authoritative live stitch scaling + readability fix (DOM-only, no window.items dependency).
(()=>{
  const VERSION='v7.2';
  const BASE_VISUAL_SCALE=1.22;
  let raf=0;

  function stamp(){
    window.__CROCHET_CAD_VERSION=VERSION;
    document.title=`Crochet Pattern Designer · ${VERSION}`;
    const brand=document.querySelector('.brandcopy strong');
    if(brand) brand.textContent=`Crochet CAD  ${VERSION}`;
    const h=document.querySelector('#photoModeModal .photo-card h2');
    if(h&&h.textContent.includes('5-PETAL')) h.textContent=`5-PETAL LAYERED LACE FLOWER · ${VERSION}`;
    if(window.__LACE_DEBUG_SUMMARY) window.__LACE_DEBUG_SUMMARY.renderer=`lace-flower-renderer-${VERSION}`;
    if(window.__LACE_LAYOUT_SNAPSHOT){
      window.__LACE_LAYOUT_SNAPSHOT.renderer=`lace-flower-renderer-${VERSION}`;
      if(window.__LACE_LAYOUT_SNAPSHOT.debug) window.__LACE_LAYOUT_SNAPSHOT.debug.renderer=`lace-flower-renderer-${VERSION}`;
    }
  }

  function currentUserScale(){
    const slider=document.getElementById('scaleV71');
    if(slider){
      const v=Number(slider.value)/100;
      if(Number.isFinite(v)&&v>0) return v;
    }
    try{
      const saved=JSON.parse(localStorage.getItem('crochetCad.patternSizingV71')||'{}');
      const v=Number(saved.scale);
      if(Number.isFinite(v)&&v>0) return v;
    }catch{}
    return 1;
  }

  function laceElements(){
    if(!document.getElementById('board')) return [];
    // v6.7 renderer stamps every rendered lace symbol with data-renderer.
    return [...document.querySelectorAll('#board .placed[data-renderer]')].filter(el=>el.style.display!=='none');
  }

  function apply(){
    raf=0;
    stamp();
    const user=currentUserScale();
    const effective=BASE_VISUAL_SCALE*user;
    const label=document.getElementById('scaleValV71');
    if(label) label.textContent=`${Math.round(user*100)}%`;

    for(const el of laceElements()){
      // Parent transform remains authoritative for insertion point + rotation.
      // Scale only the SVG child so the stitch grows from its own anchor without moving gridCol/gridRow.
      const svg=el.querySelector('svg');
      if(!svg) continue;
      svg.style.setProperty('transform',`scale(${effective})`,'important');
      svg.style.setProperty('transform-origin','50% 50%','important');
      svg.style.setProperty('transform-box','fill-box','important');
      svg.style.setProperty('overflow','visible','important');
      svg.style.setProperty('opacity','1','important');
      svg.style.setProperty('filter','contrast(2.35) brightness(.58)','important');
      el.dataset.stitchScaleV72=String(user);
      svg.querySelectorAll('path,line,polyline,ellipse,circle').forEach(node=>{
        if(node.getAttribute('stroke')!=='none'){
          node.style.setProperty('stroke','#050505','important');
          node.style.setProperty('vector-effect','non-scaling-stroke','important');
        }
      });
    }
  }

  function schedule(){
    if(raf) return;
    raf=requestAnimationFrame(apply);
  }

  // The v7.1 range updates its saved state; this listener makes the visual response authoritative and immediate.
  document.addEventListener('input',e=>{
    if(e.target?.id==='scaleV71') schedule();
  });

  // Re-apply after any renderer rebuild or modal/panel refresh.
  const board=document.getElementById('board');
  if(board){
    const mo=new MutationObserver(schedule);
    mo.observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-renderer']});
  }
  const wrap=document.getElementById('boardWrap');
  if(wrap){
    const mo2=new MutationObserver(schedule);
    mo2.observe(wrap,{childList:true,subtree:true});
  }

  document.addEventListener('click',e=>{
    if(['laceImport','laceGenerate','photoModeBtn','mobilePhotoModeBtn'].includes(e.target?.id)) setTimeout(schedule,0);
  },true);

  window.addEventListener('load',()=>setTimeout(schedule,0),{once:true});
  setTimeout(schedule,0);
})();
