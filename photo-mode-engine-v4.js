// Pattern Generator — crochet-topology-first flower construction. No image analysis.
(() => {
  const $ = id => document.getElementById(id);
  const modal = $('photoModeModal');
  const desktopBtn = $('photoModeBtn');
  const mobileBtn = $('mobilePhotoModeBtn');
  if (!modal || !desktopBtn || !mobileBtn) return;

  desktopBtn.textContent = 'Pattern Generator';
  mobileBtn.textContent = 'Pattern Generator';

  const card = modal.querySelector('.photo-card');
  if (!card) return;
  card.innerHTML = `
    <button class="modal-close" id="generatorClose" type="button">×</button>
    <h2>PATTERN GENERATOR</h2>
    <p class="modal-sub">Generate a real crochet construction first, then draw its chart on the board.</p>
    <div class="photo-description">Flower Generator · US crochet terminology · chart and written pattern come from the same validated crochet graph.</div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0">
      <label>Petals<select id="genPetals"><option>4</option><option>5</option><option selected>6</option><option>7</option><option>8</option><option>10</option><option>12</option></select></label>
      <label>Petal size<select id="genSize"><option value="small">Small</option><option value="medium" selected>Medium</option><option value="tall">Tall</option></select></label>
      <label>Style<select id="genStyle"><option value="solid" selected>Solid</option><option value="lacy">Lacy</option></select></label>
      <label>Center<select id="genCenter"><option value="compact" selected>Compact</option><option value="open">Open center</option></select></label>
    </div>
    <button id="generateFlowerBtn" class="modal-primary" type="button">GENERATE FLOWER PATTERN</button>
    <section id="generatorProgress" style="display:none;margin:12px 0;padding:12px;border:1px solid #46515d;border-radius:10px;background:#111820;color:#eaf3ff">
      <div style="display:flex;justify-content:space-between;gap:10px"><strong>Pattern validation</strong><span id="generatorPct">0%</span></div>
      <div style="height:8px;background:#27313b;border-radius:99px;overflow:hidden;margin-top:8px"><div id="generatorBar" style="width:0;height:100%;background:#2f81f7"></div></div>
      <div id="generatorStep" style="margin-top:9px;font-size:12px;font-weight:700">Waiting…</div>
    </section>
    <section id="generatorSummary" style="display:none;margin:12px 0;padding:12px;border:1px solid #46515d;border-radius:10px;background:#151b21;color:#eaf3ff"></section>
    <section id="generatorWritten" style="display:none;margin:12px 0;padding:12px;border:1px solid #46515d;border-radius:10px;background:#fff;color:#20262d;white-space:pre-wrap;font:13px/1.55 ui-monospace,Consolas,monospace"></section>
    <button id="generatorImportBtn" class="modal-primary photo-import" type="button" disabled>IMPORT VALIDATED CHART TO BOARD</button>
    <div id="generatorMessage" class="form-message"></div>`;

  const closeBtn = $('generatorClose');
  const generateBtn = $('generateFlowerBtn');
  const importBtn = $('generatorImportBtn');
  const progress = $('generatorProgress');
  const pct = $('generatorPct');
  const bar = $('generatorBar');
  const stepEl = $('generatorStep');
  const summary = $('generatorSummary');
  const written = $('generatorWritten');
  const message = $('generatorMessage');
  let graph = null;

  function open(){ modal.hidden=false; document.body.style.overflow='hidden'; }
  function close(){ modal.hidden=true; document.body.style.overflow=''; }
  desktopBtn.onclick=open; mobileBtn.onclick=open; closeBtn.onclick=close;
  modal.addEventListener('click',e=>{ if(e.target===modal) close(); });

  const waits = ms => new Promise(r=>setTimeout(r,ms));
  async function progressStep(i,total,text){
    progress.style.display='block';
    const p=Math.round(i/total*100); pct.textContent=p+'%'; bar.style.width=p+'%'; stepEl.textContent=`${i}/${total} · ${text}`;
    await waits(25);
  }
  function uuid(prefix='st'){ try{return crypto.randomUUID()}catch(e){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)} }
  function stitch(type,opts={}){ return {id:uuid(type),type,...opts}; }

  function petalSequence(size,style){
    if(style==='lacy'){
      if(size==='small') return ['single','chain','double','chain','single'];
      if(size==='tall') return ['single','chain','double','chain','treble','chain','double','chain','single'];
      return ['single','chain','double','chain','double','chain','single'];
    }
    if(size==='small') return ['single','half','double','half','single'];
    if(size==='tall') return ['single','half','double','treble','treble','double','half','single'];
    return ['single','half','double','double','half','single'];
  }

  function buildGraph(params){
    const P=params.petals;
    const nodes=[]; const spaces=[];
    const center=stitch('ring',{round:0,group:'center',order:0,role:'start',anchor:null,relation:'start'}); nodes.push(center);
    for(let p=0;p<P;p++){
      const sc=stitch('single',{round:1,group:`anchor-${p+1}`,order:p*4,role:'petal-anchor',workedInto:center.id,relation:'into-MR'}); nodes.push(sc);
      let chainPrev=sc.id; const chainIds=[];
      for(let c=0;c<3;c++){
        const ch=stitch('chain',{round:1,group:`space-${p+1}`,order:p*4+c+1,role:'chain-space',anchor:chainPrev,relation:'chain-from'}); nodes.push(ch); chainIds.push(ch.id); chainPrev=ch.id;
      }
      spaces.push({id:`space-${p+1}`,petal:p+1,chainIds,anchorStitch:sc.id});
    }
    const firstSc=nodes.find(n=>n.round===1&&n.type==='single');
    nodes.push(stitch('slip',{round:1,group:'round-1-join',order:P*4,role:'join',workedInto:firstSc?.id,relation:'join-round'}));

    const seq=petalSequence(params.size,params.style);
    for(let p=0;p<P;p++){
      const space=spaces[p];
      seq.forEach((type,j)=>nodes.push(stitch(type,{round:2,group:`petal-${p+1}`,order:j,role:'petal-stitch',workedInto:space.id,relation:'into-chain-space',petal:p+1})));
      if(p<P-1) nodes.push(stitch('slip',{round:2,group:`petal-${p+1}`,order:seq.length,role:'petal-separator',workedInto:spaces[(p+1)%P].anchorStitch,relation:'between-petals',petal:p+1}));
    }
    nodes.push(stitch('slip',{round:2,group:'final-join',order:999,role:'finish',workedInto:spaces[0].anchorStitch,relation:'join-finish'}));
    return {kind:'flower',version:1,params,nodes,spaces};
  }

  function validateGraph(g){
    const errors=[]; const ids=new Set(g.nodes.map(n=>n.id)); const spaces=new Set(g.spaces.map(s=>s.id));
    if(g.nodes.length!==ids.size) errors.push('Duplicate stitch IDs.');
    const anchors=g.nodes.filter(n=>n.round===1&&n.role==='petal-anchor');
    if(anchors.length!==g.params.petals) errors.push(`Expected ${g.params.petals} petal anchors, found ${anchors.length}.`);
    if(g.spaces.length!==g.params.petals) errors.push(`Expected ${g.params.petals} chain spaces, found ${g.spaces.length}.`);
    for(const s of g.spaces) if(s.chainIds.length!==3) errors.push(`${s.id} must contain exactly 3 chains.`);
    for(const n of g.nodes){
      if(n.workedInto && !ids.has(n.workedInto) && !spaces.has(n.workedInto)) errors.push(`${n.id} has an invalid worked-into anchor.`);
      if(n.anchor && !ids.has(n.anchor)) errors.push(`${n.id} has an invalid chain anchor.`);
    }
    for(let p=1;p<=g.params.petals;p++){
      const petal=g.nodes.filter(n=>n.group===`petal-${p}`&&n.role==='petal-stitch');
      if(!petal.length) errors.push(`Petal ${p} has no stitches.`);
      const target=`space-${p}`; if(petal.some(n=>n.workedInto!==target)) errors.push(`Petal ${p} is not consistently worked into ${target}.`);
      const expected=petalSequence(g.params.size,g.params.style).length;
      if(petal.length!==expected) errors.push(`Petal ${p} has ${petal.length} stitches; expected ${expected}.`);
    }
    const r1=g.nodes.filter(n=>n.round===1); const r2=g.nodes.filter(n=>n.round===2);
    if(!r1.some(n=>n.role==='join')) errors.push('Round 1 has no closing slip stitch.');
    if(!r2.some(n=>n.role==='finish')) errors.push('Flower has no final join.');
    return {ok:!errors.length,errors,counts:{round1:r1.length,round2:r2.length,total:g.nodes.length}};
  }

  function abbr(t){return (window.CROCHET_US_STANDARD?.[t]?.abbr)||({ring:'MR',single:'sc',chain:'ch',slip:'sl st',half:'hdc',double:'dc',treble:'tr'})[t]||t;}
  function writtenPattern(g){
    const P=g.params.petals,seq=petalSequence(g.params.size,g.params.style).map(abbr).join(', ');
    const centerLine=g.params.center==='open'?'Start with an adjustable magic ring (MR), leaving the center slightly open.':'Start with a magic ring (MR) and draw it closed after Round 1.';
    return [
      'FLOWER PATTERN · US TERMS','',centerLine,
      `R1: *sc in MR, ch 3; repeat from * ${P} times total. Join with sl st to first sc. [${P} sc, ${P} ch-3 sps]`,
      `R2: In each ch-3 sp work (${seq}). Work a sl st between petals as shown; join with sl st at the first anchor. [${P} petals]`,
      '',`Construction: ${P} equal petals · ${g.params.style} · ${g.params.size} petal profile.`,
      'Chart and written instructions are generated from the same validated stitch graph.'
    ].join('\n');
  }

  function graphToBoard(g){
    const bw=Math.max(board.clientWidth||1200,900),cxPct=50,cy=520;
    const point=(radiusPx,a)=>({x:cxPct+(Math.cos(a)*radiusPx/bw*100),y:cy+Math.sin(a)*radiusPx});
    const out=[]; let row=0;
    const add=(n,xPct,y,rotation,pathId,order)=>out.push({
      id:n.id,type:n.type,row,col:order,x:xPct,y,rotation,direction:'e',
      generatedPattern:true,patternKind:'flower',pathId,orderInPath:order,sourceRegion:n.group,
      stitchFamily:n.type,workedInto:n.workedInto||n.anchor||null,relation:n.relation,role:n.role,
      round:n.round,petal:n.petal||null,confidence:1,estimated:false
    });
    const center=g.nodes.find(n=>n.type==='ring'); add(center,cxPct,cy,0,'CENTER',0); row++;
    const P=g.params.petals;
    for(let p=0;p<P;p++){
      const a=-Math.PI/2+p*2*Math.PI/P;
      const sc=g.nodes.find(n=>n.group===`anchor-${p+1}`&&n.type==='single');
      const base=point(90,a); add(sc,base.x,base.y,(a*180/Math.PI)+90,'R1',p*4);
      const chainNodes=g.nodes.filter(n=>n.group===`space-${p+1}`&&n.type==='chain');
      chainNodes.forEach((n,c)=>{const q=point(100+c*13,a+(c-1)*0.055);add(n,q.x,q.y,(a*180/Math.PI)+90,'R1',p*4+c+1)});
    }
    const join=g.nodes.find(n=>n.role==='join'); if(join){const q=point(88,-Math.PI/2);add(join,q.x,q.y,0,'R1',P*4)}
    row++;
    const height={single:125,chain:145,half:150,double:175,treble:205,slip:115};
    for(let p=0;p<P;p++){
      const a=-Math.PI/2+p*2*Math.PI/P;
      const petal=g.nodes.filter(n=>n.group===`petal-${p+1}`&&n.role==='petal-stitch');
      const span=Math.min(.48,Math.max(.22,1.8/P));
      petal.forEach((n,j)=>{
        const t=petal.length===1?0:(j/(petal.length-1)-.5)*2;
        const aa=a+t*span; const r=height[n.type]||155; const q=point(r,aa);
        add(n,q.x,q.y,(aa*180/Math.PI)+90,`P${p+1}`,j);
      });
      const sep=g.nodes.find(n=>n.group===`petal-${p+1}`&&n.role==='petal-separator');
      if(sep){const q=point(112,a+Math.PI/P);add(sep,q.x,q.y,0,`P${p+1}`,petal.length)}
      row++;
    }
    const finish=g.nodes.find(n=>n.role==='finish'); if(finish){const q=point(112,-Math.PI/2);add(finish,q.x,q.y,0,'FINISH',0)}
    return out;
  }

  async function generate(){
    importBtn.disabled=true; summary.style.display='none'; written.style.display='none'; message.textContent=''; graph=null;
    const params={petals:Number($('genPetals').value),size:$('genSize').value,style:$('genStyle').value,center:$('genCenter').value};
    const total=8;
    await progressStep(1,total,'Reading generator settings');
    await progressStep(2,total,'Creating Magic Ring start');
    await progressStep(3,total,'Building petal anchor round');
    await progressStep(4,total,'Creating chain-space anchors');
    graph=buildGraph(params);
    await progressStep(5,total,'Building executable petal stitch sequences');
    const check=validateGraph(graph);
    await progressStep(6,total,'Validating worked-into relationships and joins');
    if(!check.ok){message.textContent='Pattern validation failed: '+check.errors.join(' '); graph=null; return;}
    graph.validation=check;
    await progressStep(7,total,'Generating written pattern from stitch graph');
    const text=writtenPattern(graph); graph.written=text;
    await progressStep(8,total,'Validated pattern ready');
    summary.style.display='block';
    summary.innerHTML=`<strong>VALIDATED FLOWER</strong><div style="margin-top:8px">${params.petals} petals · ${params.style} · ${params.size}</div><div style="margin-top:5px">Round 1: ${check.counts.round1} chart symbols · Round 2: ${check.counts.round2} chart symbols · Total: ${check.counts.total}</div><div style="margin-top:5px;color:#7ce3a1">✓ anchors valid · ✓ chain spaces valid · ✓ joins valid · ✓ petal count valid</div>`;
    written.style.display='block'; written.textContent=text; importBtn.disabled=false;
    window.activeCrochetGraph=graph;
  }

  generateBtn.addEventListener('click',()=>generate().catch(e=>{console.error(e);message.textContent='Generator error: '+e.message}));
  importBtn.addEventListener('click',()=>{
    if(!graph?.validation?.ok) return;
    snapshot();
    items=graphToBoard(graph);
    selected=null; currentRow=0; currentCol=items.length; placementRotation=0;
    window.activeCrochetGraph=graph;
    render();
    rowStatus.textContent=`Flower · ${graph.params.petals} petals · validated`;
    selectedStatus.textContent='Validated crochet pattern';
    close();
  });
})();
