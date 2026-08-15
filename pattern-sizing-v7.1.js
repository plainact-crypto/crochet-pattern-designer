// Legacy v7.1 sizing compatibility — materials, target size and ruler ONLY.
// IMPORTANT: this module must never stamp the app version, recreate stitch-style controls,
// or apply per-stitch scaling. v7.6+ owns stitch size / line weight / PDF styling.
(()=>{
  const CELL=24;
  const KEY='crochetCad.patternSizingV71';
  const saved=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}})();
  const state={
    yarn:saved.yarn||'DK / Light 3',
    hook:Number(saved.hook)||3.5,
    targetW:Number(saved.targetW)||20,
    targetH:Number(saved.targetH)||20
  };

  function persist(){
    try{
      const prev=JSON.parse(localStorage.getItem(KEY)||'{}');
      localStorage.setItem(KEY,JSON.stringify({...prev,...state}));
    }catch{}
    window.__CROCHET_MATERIAL_SETTINGS={...state,mode:'target-size-estimate'};
  }

  function bbox(){
    const b=window.__LACE_LAYOUT_SNAPSHOT?.validation?.wholeBBox;
    if(b&&Number.isFinite(b.width)&&Number.isFinite(b.height))return b;
    return null;
  }

  function physical(){
    const b=bbox();if(!b)return null;
    const cmPerCell=Math.min(state.targetW/b.width,state.targetH/b.height);
    return{b,cmPerCell,w:b.width*cmPerCell,h:b.height*cmPerCell};
  }

  function css(){
    if(document.getElementById('sizingV71Style'))return;
    const s=document.createElement('style');s.id='sizingV71Style';s.textContent=`
      #gridToolsV70,.grid-ruler-top-v70,.grid-ruler-left-v70{display:none!important}
      .sizing-v71{position:absolute;right:14px;top:14px;z-index:45;width:288px;padding:12px;border:1px solid #3d4a53;border-radius:10px;background:rgba(18,24,29,.95);color:#f5f7f9;font:12px/1.35 system-ui;box-shadow:0 7px 24px rgba(0,0,0,.26)}
      .sizing-v71 strong{letter-spacing:.03em}.sizing-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:8px}.sizing-v71 input,.sizing-v71 select{background:#0d1317;color:#fff;border:1px solid #46535e;border-radius:6px;padding:5px 6px}.sizing-v71 input[type=number]{width:65px}.sizing-size{margin-top:9px;padding-top:8px;border-top:1px solid #33414a;font-weight:800;color:#8fe7ff}.sizing-note{margin-top:5px;font-size:10px;color:#aeb8c0}
      #board .ruler-v71{position:absolute;z-index:20;pointer-events:none;color:#26343c;font:9px/1 system-ui}.ruler-v71.top{height:22px;border-bottom:1px solid #768690}.ruler-v71.left{width:28px;border-right:1px solid #768690}.ruler-v71 .tick{position:absolute;background:#768690}.ruler-v71.top .tick{bottom:0;width:1px;height:6px}.ruler-v71.left .tick{right:0;height:1px;width:6px}.ruler-v71 .lbl{position:absolute;white-space:nowrap;font-weight:700;background:rgba(255,255,255,.85);padding:1px 2px;border-radius:2px}.ruler-v71.top .lbl{top:2px;transform:translateX(-50%)}.ruler-v71.left .lbl{left:2px;transform:translateY(-50%)}
      .generator-size-v71{margin:10px 0 12px;padding:10px;border:1px solid #36444e;border-radius:8px;background:#11181d;display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;font:12px/1.3 system-ui}.generator-size-v71 label{display:grid;gap:4px;color:#cbd5db}.generator-size-v71 input,.generator-size-v71 select{background:#0b1014;color:#fff;border:1px solid #46535e;border-radius:6px;padding:6px}.generator-size-v71 .wide{grid-column:1/-1}.generator-size-v71 small{grid-column:1/-1;color:#99a7b0}
    `;document.head.appendChild(s);
  }

  function drawRuler(){
    const board=document.getElementById('board');if(!board)return;
    board.querySelectorAll('.ruler-v71').forEach(n=>n.remove());
    const p=physical();if(!p)return;
    const {b,cmPerCell,w,h}=p;
    const top=document.createElement('div'),left=document.createElement('div');
    top.className='ruler-v71 top';left.className='ruler-v71 left';
    top.style.left=`${b.minX*CELL}px`;top.style.top=`${Math.max(0,b.minY*CELL-24)}px`;top.style.width=`${b.width*CELL}px`;
    left.style.left=`${Math.max(0,b.minX*CELL-30)}px`;left.style.top=`${b.minY*CELL}px`;left.style.height=`${b.height*CELL}px`;
    const step=w<=25?5:10;
    for(let cm=0;cm<=w+.01;cm+=step){const x=(cm/cmPerCell)*CELL,t=document.createElement('i'),l=document.createElement('span');t.className='tick';t.style.left=x+'px';l.className='lbl';l.style.left=x+'px';l.textContent=`${cm} cm`;top.append(t,l);}
    const stepY=h<=25?5:10;
    for(let cm=0;cm<=h+.01;cm+=stepY){const y=(cm/cmPerCell)*CELL,t=document.createElement('i'),l=document.createElement('span');t.className='tick';t.style.top=y+'px';l.className='lbl';l.style.top=y+'px';l.textContent=`${cm}`;left.append(t,l);}
    board.append(top,left);
  }

  function updateText(){
    const p=physical(),el=document.getElementById('patternSizeV71');if(!el)return;
    el.textContent=p?`Estimated finished size: ${p.w.toFixed(1)} × ${p.h.toFixed(1)} cm`:`Target: ${state.targetW} × ${state.targetH} cm · generate pattern to measure`;
  }

  function panel(){
    const wrap=document.getElementById('boardWrap');if(!wrap)return;
    let p=document.getElementById('sizingToolsV71');
    if(!p){
      p=document.createElement('div');p.id='sizingToolsV71';p.className='sizing-v71';
      p.innerHTML=`<strong>SIZE / GRID</strong><div id="styleControlsMount"></div><div class="sizing-row" data-material-row="width"><label>Target width</label><span><input id="targetWV71" type="number" min="1" step="1" value="${state.targetW}"> cm</span></div><div class="sizing-row" data-material-row="height"><label>Target height</label><span><input id="targetHV71" type="number" min="1" step="1" value="${state.targetH}"> cm</span></div><div class="sizing-size" id="patternSizeV71"></div><div class="sizing-note">The ruler measures the pattern bounding box, not the whole whiteboard. Target size is an estimate until real crochet gauge is measured.</div>`;
      wrap.appendChild(p);
    }
    const w=p.querySelector('#targetWV71'),h=p.querySelector('#targetHV71');
    if(w&&!w.dataset.bound){w.dataset.bound='1';w.oninput=e=>{const v=Number(e.target.value);if(v>0){state.targetW=v;persist();drawRuler();updateText();syncGenerator();}};}
    if(h&&!h.dataset.bound){h.dataset.bound='1';h.oninput=e=>{const v=Number(e.target.value);if(v>0){state.targetH=v;persist();drawRuler();updateText();syncGenerator();}};}
    if(w&&document.activeElement!==w)w.value=state.targetW;
    if(h&&document.activeElement!==h)h.value=state.targetH;
    updateText();
  }

  function generator(){
    const card=document.querySelector('#photoModeModal .photo-card');if(!card)return;
    let box=document.getElementById('generatorSizeV71');
    if(!box){box=document.createElement('div');box.id='generatorSizeV71';box.className='generator-size-v71';const btn=document.getElementById('laceGenerate');if(btn)btn.before(box);else card.appendChild(box);}
    box.innerHTML=`<label class="wide">Yarn<select id="yarnV71"><option>Fingering / Super Fine 1</option><option>Sport / Fine 2</option><option>DK / Light 3</option><option>Worsted / Medium 4</option><option>Bulky 5</option></select></label><label>Hook<input id="hookV71" type="number" min="1" max="12" step="0.25" value="${state.hook}"></label><label>Target size<input id="genTargetV71" type="number" min="1" step="1" value="${state.targetW}"></label><small>Default target: 20 × 20 cm. Yarn and hook are saved with the pattern; finished size remains an estimate until real gauge is measured.</small>`;
    box.querySelector('#yarnV71').value=state.yarn;
    box.querySelector('#yarnV71').onchange=e=>{state.yarn=e.target.value;persist()};
    box.querySelector('#hookV71').oninput=e=>{state.hook=Number(e.target.value)||3.5;persist()};
    box.querySelector('#genTargetV71').oninput=e=>{const v=Number(e.target.value);if(v>0){state.targetW=state.targetH=v;persist();panel();drawRuler();updateText();}};
  }

  function syncGenerator(){const g=document.getElementById('genTargetV71');if(g&&state.targetW===state.targetH&&document.activeElement!==g)g.value=state.targetW;}
  function refresh(){css();generator();panel();drawRuler();updateText();persist();}

  // Do not wrap render. A render must not recreate controls or apply scale.
  document.addEventListener('click',e=>{if(['photoModeBtn','mobilePhotoModeBtn','laceGenerate'].includes(e.target?.id))setTimeout(()=>{generator();panel();},0)},true);
  window.addEventListener('resize',()=>setTimeout(drawRuler,80));
  setTimeout(refresh,0);
})();