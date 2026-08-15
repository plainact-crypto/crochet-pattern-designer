// v7.0 Grid Tools — visual stitch scaling from insertion points + physical ruler/gauge.
(()=>{
  const VERSION='v7.0';
  const CELL=24;
  const SCALE_KEY='crochetCad.stitchVisualScale';
  const GAUGE_KEY='crochetCad.cmPerGridCell';
  let stitchScale=Math.max(.5,Math.min(2.5,Number(localStorage.getItem(SCALE_KEY))||1));
  let cmPerCell=Math.max(.05,Math.min(10,Number(localStorage.getItem(GAUGE_KEY))||0.5));

  function stampVersion(){
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

  function css(){
    if(document.getElementById('gridToolsV70Style')) return;
    const s=document.createElement('style');
    s.id='gridToolsV70Style';
    s.textContent=`
      .grid-tools-v70{position:absolute;z-index:35;right:14px;top:14px;width:272px;padding:12px 13px;border:1px solid #3a4650;border-radius:10px;background:rgba(20,26,31,.94);color:#f5f7f9;font:12px/1.35 system-ui;box-shadow:0 6px 22px rgba(0,0,0,.24);backdrop-filter:blur(5px)}
      .grid-tools-v70 strong{font-size:12px;letter-spacing:.03em}.grid-tools-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:9px}.grid-tools-v70 input[type=range]{width:100%;grid-column:1/-1}.grid-tools-v70 input[type=number]{width:72px;background:#0e1317;color:#fff;border:1px solid #46535e;border-radius:6px;padding:5px 6px}.grid-tools-value{font-weight:800;color:#8fe7ff}.grid-tools-size{margin-top:10px;padding-top:9px;border-top:1px solid #34414a;font-weight:700}.grid-tools-note{margin-top:5px;color:#aeb8c0;font-size:10px}
      #board .grid-ruler-top-v70,#board .grid-ruler-left-v70{position:absolute;z-index:18;pointer-events:none;color:#42515b;font:9px/1 system-ui;background:rgba(255,255,255,.9)}
      #board .grid-ruler-top-v70{left:0;top:0;height:24px;width:100%;border-bottom:1px solid #aab5bd;background-image:repeating-linear-gradient(90deg,#8b979f 0 1px,transparent 1px 24px)}
      #board .grid-ruler-left-v70{left:0;top:0;width:32px;height:100%;border-right:1px solid #aab5bd;background-image:repeating-linear-gradient(180deg,#8b979f 0 1px,transparent 1px 24px)}
      .grid-ruler-label-v70{position:absolute;white-space:nowrap;color:#25323a;font-weight:700;text-shadow:0 1px #fff}.grid-ruler-top-v70 .grid-ruler-label-v70{top:7px;transform:translateX(3px)}.grid-ruler-left-v70 .grid-ruler-label-v70{left:4px;transform:translateY(3px) rotate(-90deg);transform-origin:left top}
    `;
    document.head.appendChild(s);
  }

  function baseTransformFor(it){return `translate(-50%,-50%) rotate(${Number(it?.rotation)||0}deg) scale(${stitchScale})`;}
  function applyStitchScale(){
    if(!window.board||!Array.isArray(window.items)) return;
    const els=[...board.querySelectorAll('.placed')];
    items.forEach((it,k)=>{
      if(!it?.generatedPattern||it.patternKind!=='lace-flower'||it.visualJoin) return;
      const el=els[k]; if(!el) return;
      el.style.transformOrigin='50% 50%';
      el.style.transform=baseTransformFor(it);
      el.dataset.stitchScale=String(stitchScale);
    });
    localStorage.setItem(SCALE_KEY,String(stitchScale));
    const out=document.getElementById('stitchScaleValueV70'); if(out) out.textContent=`${Math.round(stitchScale*100)}%`;
  }

  function patternBBox(){
    const b=window.__LACE_LAYOUT_SNAPSHOT?.validation?.wholeBBox;
    if(b&&Number.isFinite(b.width)&&Number.isFinite(b.height)) return b;
    if(!Array.isArray(window.items)) return null;
    const pts=items.filter(i=>Number.isInteger(i.gridCol)&&Number.isInteger(i.gridRow)&&!i.visualJoin);
    if(!pts.length) return null;
    const xs=pts.map(i=>i.gridCol),ys=pts.map(i=>i.gridRow);
    return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
  }

  function updateSize(){
    const b=patternBBox(),el=document.getElementById('patternSizeV70');
    if(!el) return;
    if(!b){el.textContent='Pattern size: —';return;}
    const wCells=b.width,hCells=b.height,wCm=wCells*cmPerCell,hCm=hCells*cmPerCell;
    el.textContent=`Pattern: ${wCells.toFixed(1)} × ${hCells.toFixed(1)} grid cells  ·  ${wCm.toFixed(1)} × ${hCm.toFixed(1)} cm`;
  }

  function buildRulers(){
    if(!window.board) return;
    board.querySelectorAll('.grid-ruler-top-v70,.grid-ruler-left-v70').forEach(n=>n.remove());
    const top=document.createElement('div'),left=document.createElement('div');
    top.className='grid-ruler-top-v70';left.className='grid-ruler-left-v70';
    const cols=Math.ceil((board.scrollWidth||parseFloat(board.style.width)||3600)/CELL),rows=Math.ceil((board.scrollHeight||parseFloat(board.style.height)||3600)/CELL);
    const step=5;
    for(let c=0;c<=cols;c+=step){const l=document.createElement('span');l.className='grid-ruler-label-v70';l.style.left=`${c*CELL}px`;l.textContent=`${(c*cmPerCell).toFixed(cmPerCell<1?1:0)} cm`;top.appendChild(l);}
    for(let r=0;r<=rows;r+=step){const l=document.createElement('span');l.className='grid-ruler-label-v70';l.style.top=`${r*CELL}px`;l.textContent=`${(r*cmPerCell).toFixed(cmPerCell<1?1:0)} cm`;left.appendChild(l);}
    board.append(top,left);
  }

  function panel(){
    if(!window.boardWrap||document.getElementById('gridToolsV70')) return;
    if(getComputedStyle(boardWrap).position==='static') boardWrap.style.position='relative';
    const p=document.createElement('div');p.id='gridToolsV70';p.className='grid-tools-v70';
    p.innerHTML=`<strong>GRID / SCALE · ${VERSION}</strong>
      <div class="grid-tools-row"><span>Stitch scale</span><span class="grid-tools-value" id="stitchScaleValueV70">${Math.round(stitchScale*100)}%</span><input id="stitchScaleV70" type="range" min="50" max="250" step="5" value="${Math.round(stitchScale*100)}"></div>
      <div class="grid-tools-row"><label for="gaugeV70">1 grid cell</label><span><input id="gaugeV70" type="number" min="0.05" max="10" step="0.05" value="${cmPerCell}"> cm</span></div>
      <div class="grid-tools-size" id="patternSizeV70">Pattern size: —</div>
      <div class="grid-tools-note">Scale changes symbol size from each insertion point only. Grid coordinates stay fixed. Set cm/cell from your yarn + hook gauge for real dimensions.</div>`;
    boardWrap.appendChild(p);
    p.querySelector('#stitchScaleV70').addEventListener('input',e=>{stitchScale=Number(e.target.value)/100;applyStitchScale();});
    p.querySelector('#gaugeV70').addEventListener('input',e=>{const v=Number(e.target.value);if(Number.isFinite(v)&&v>0){cmPerCell=v;localStorage.setItem(GAUGE_KEY,String(cmPerCell));buildRulers();updateSize();}});
  }

  function refresh(){stampVersion();css();panel();applyStitchScale();buildRulers();updateSize();}
  const oldRender=window.render;
  if(typeof oldRender==='function') window.render=function(...args){const out=oldRender.apply(this,args);setTimeout(refresh,0);return out;};
  window.addEventListener('resize',()=>setTimeout(()=>{buildRulers();updateSize();},80));
  window.addEventListener('load',()=>setTimeout(refresh,0),{once:true});
  setTimeout(refresh,0);
})();