// v7.3 — 50..200 numeric stitch scale + PDF sync. Geometry/grid coordinates are untouched.
(()=>{
  const VERSION='v7.3';
  const BASE_VISUAL_SCALE=1.22;
  const STORAGE_KEY='crochetCad.patternSizingV71';
  let userScale=1;
  let raf=0;

  function clampPct(v){return Math.max(50,Math.min(200,Math.round(Number(v)||100)));}
  function readSaved(){
    try{
      const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      return clampPct((Number(s.scale)||1)*100);
    }catch{return 100;}
  }
  function persist(){
    try{
      const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      s.scale=userScale;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
    }catch{}
    window.__CROCHET_STITCH_SCALE=userScale;
    // Export must match the visible stitch symbol, including the readability base scale.
    window.__CROCHET_PDF_STITCH_SCALE=BASE_VISUAL_SCALE*userScale;
  }
  function stamp(){
    window.__CROCHET_CAD_VERSION=VERSION;
    document.title=`Crochet Pattern Designer · ${VERSION}`;
    const b=document.querySelector('.brandcopy strong');if(b)b.textContent=`Crochet CAD  ${VERSION}`;
    const h=document.querySelector('#photoModeModal .photo-card h2');if(h&&h.textContent.includes('5-PETAL'))h.textContent=`5-PETAL LAYERED LACE FLOWER · ${VERSION}`;
    if(window.__LACE_DEBUG_SUMMARY)window.__LACE_DEBUG_SUMMARY.renderer=`lace-flower-renderer-${VERSION}`;
    if(window.__LACE_LAYOUT_SNAPSHOT){window.__LACE_LAYOUT_SNAPSHOT.renderer=`lace-flower-renderer-${VERSION}`;if(window.__LACE_LAYOUT_SNAPSHOT.debug)window.__LACE_LAYOUT_SNAPSHOT.debug.renderer=`lace-flower-renderer-${VERSION}`;}
  }
  function laceElements(){return [...document.querySelectorAll('#board .placed[data-renderer]')].filter(el=>el.style.display!=='none');}
  function applyVisual(){
    raf=0;stamp();persist();
    const effective=BASE_VISUAL_SCALE*userScale;
    for(const el of laceElements()){
      const svg=el.querySelector('svg');if(!svg)continue;
      svg.style.setProperty('transform',`scale(${effective})`,'important');
      svg.style.setProperty('transform-origin','50% 50%','important');
      svg.style.setProperty('transform-box','fill-box','important');
      svg.style.setProperty('overflow','visible','important');
      el.dataset.stitchScaleV73=String(userScale);
    }
    const slider=document.getElementById('scaleV71');if(slider)slider.value=String(Math.round(userScale*100));
    const label=document.getElementById('scaleValV71');if(label)label.textContent=`${Math.round(userScale*100)}%`;
    const number=document.getElementById('scaleNumberV73');if(number&&document.activeElement!==number)number.value=String(Math.round(userScale*100));
  }
  function schedule(){if(raf)return;raf=requestAnimationFrame(applyVisual);}
  function setPct(v){const pct=clampPct(v);userScale=pct/100;persist();schedule();}

  function installControl(){
    const slider=document.getElementById('scaleV71');if(!slider)return false;
    slider.min='50';slider.max='200';slider.step='1';
    slider.value=String(Math.round(userScale*100));
    if(slider.dataset.v73!=='1'){
      slider.dataset.v73='1';
      slider.addEventListener('input',e=>setPct(e.target.value));
    }
    let num=document.getElementById('scaleNumberV73');
    if(!num){
      num=document.createElement('input');num.id='scaleNumberV73';num.type='number';num.min='50';num.max='200';num.step='1';num.value=String(Math.round(userScale*100));num.setAttribute('aria-label','Stitch scale percent');
      num.style.cssText='width:64px;background:#0d1317;color:#fff;border:1px solid #46535e;border-radius:6px;padding:4px 6px;text-align:right;font-weight:800';
      const label=document.getElementById('scaleValV71');
      if(label){label.textContent='';label.append(num,document.createTextNode(' %'));}
      num.addEventListener('input',e=>{if(e.target.value==='')return;setPct(e.target.value)});
      num.addEventListener('change',e=>{const p=clampPct(e.target.value);e.target.value=String(p);setPct(p)});
      num.addEventListener('blur',e=>{const p=clampPct(e.target.value);e.target.value=String(p);setPct(p)});
    }
    return true;
  }
  function refresh(){stamp();installControl();schedule();}

  userScale=readSaved()/100;persist();
  const wrap=document.getElementById('boardWrap');if(wrap)new MutationObserver(()=>setTimeout(refresh,0)).observe(wrap,{childList:true,subtree:true});
  const board=document.getElementById('board');if(board)new MutationObserver(schedule).observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-renderer']});
  document.addEventListener('click',e=>{if(['laceImport','laceGenerate','photoModeBtn','mobilePhotoModeBtn'].includes(e.target?.id))setTimeout(refresh,0)},true);
  window.addEventListener('load',()=>setTimeout(refresh,0),{once:true});
  setTimeout(refresh,0);
})();