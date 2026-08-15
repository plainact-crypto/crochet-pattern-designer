// v7.4 — authoritative numeric stitch scale UI (50..200) + live/PDF sync.
(()=>{
  const VERSION='v7.4';
  const BASE_VISUAL_SCALE=1.22;
  const KEY='crochetCad.patternSizingV71';
  let pct=100;
  let raf=0;

  function clamp(v){return Math.max(50,Math.min(200,Math.round(Number(v)||100)));}
  function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');return clamp((Number(s.scale)||1)*100)}catch{return 100}}
  function save(){
    try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');s.scale=pct/100;localStorage.setItem(KEY,JSON.stringify(s));}catch{}
    window.__CROCHET_STITCH_SCALE=pct/100;
    window.__CROCHET_PDF_STITCH_SCALE=BASE_VISUAL_SCALE*(pct/100);
  }
  function stamp(){
    window.__CROCHET_CAD_VERSION=VERSION;
    document.title=`Crochet Pattern Designer · ${VERSION}`;
    const brand=document.querySelector('.brandcopy strong');if(brand)brand.textContent=`Crochet CAD  ${VERSION}`;
    const panelTitle=document.querySelector('#sizingToolsV71 > strong');if(panelTitle)panelTitle.textContent=`SIZE / GRID · ${VERSION}`;
    const h=document.querySelector('#photoModeModal .photo-card h2');if(h&&h.textContent.includes('5-PETAL'))h.textContent=`5-PETAL LAYERED LACE FLOWER · ${VERSION}`;
  }
  function apply(){
    raf=0;save();stamp();
    const effective=BASE_VISUAL_SCALE*(pct/100);
    document.querySelectorAll('#board .placed[data-renderer] svg').forEach(svg=>{
      svg.style.setProperty('transform',`scale(${effective})`,'important');
      svg.style.setProperty('transform-origin','50% 50%','important');
      svg.style.setProperty('transform-box','fill-box','important');
      svg.style.setProperty('overflow','visible','important');
    });
    const num=document.getElementById('scaleNumberV74');if(num&&document.activeElement!==num)num.value=String(pct);
    const slider=document.getElementById('scaleSliderV74');if(slider)slider.value=String(pct);
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(apply)}
  function set(v){pct=clamp(v);save();schedule()}

  function install(){
    const panel=document.getElementById('sizingToolsV71');if(!panel)return false;
    const old=panel.querySelector('.sizing-row');
    if(old&&!old.dataset.v74){
      const row=document.createElement('div');
      row.className='sizing-row';row.dataset.v74='1';
      row.style.gridTemplateColumns='1fr auto auto';
      row.innerHTML=`<span>Stitch scale</span><input id="scaleNumberV74" type="number" min="50" max="200" step="1" inputmode="numeric" value="${pct}" style="width:72px;text-align:right;font-weight:800"><span>%</span><input id="scaleSliderV74" type="range" min="50" max="200" step="1" value="${pct}" style="grid-column:1/-1;width:100%">`;
      old.replaceWith(row);
      const num=row.querySelector('#scaleNumberV74'),slider=row.querySelector('#scaleSliderV74');
      num.addEventListener('input',e=>{if(e.target.value==='')return;set(e.target.value)});
      num.addEventListener('change',e=>{e.target.value=String(clamp(e.target.value));set(e.target.value)});
      num.addEventListener('blur',e=>{e.target.value=String(clamp(e.target.value));set(e.target.value)});
      slider.addEventListener('input',e=>set(e.target.value));
    }
    stamp();schedule();return true;
  }
  function refresh(){if(!install())setTimeout(refresh,80)}

  pct=load();save();
  const wrap=document.getElementById('boardWrap');if(wrap)new MutationObserver(()=>setTimeout(install,0)).observe(wrap,{childList:true,subtree:true});
  const board=document.getElementById('board');if(board)new MutationObserver(schedule).observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-renderer']});
  document.addEventListener('click',e=>{if(['laceImport','laceGenerate','photoModeBtn','mobilePhotoModeBtn'].includes(e.target?.id))setTimeout(refresh,0)},true);
  window.addEventListener('load',()=>setTimeout(refresh,0),{once:true});
  setTimeout(refresh,0);
})();
