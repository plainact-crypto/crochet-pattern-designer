// Pattern Generator — topology-first crochet flower charts on the real 24px board grid.
(() => {
  const $=id=>document.getElementById(id), GRID=24;
  const modal=$('photoModeModal'), desktopBtn=$('photoModeBtn'), mobileBtn=$('mobilePhotoModeBtn');
  if(!modal||!desktopBtn||!mobileBtn||typeof render!=='function')return;
  desktopBtn.textContent='Pattern Generator'; mobileBtn.textContent='Pattern Generator';
  const card=modal.querySelector('.photo-card'); if(!card)return;
  card.innerHTML=`
    <button class="modal-close" id="generatorClose" type="button">×</button>
    <h2>PATTERN GENERATOR</h2>
    <p class="modal-sub">Generate an executable crochet construction, validate it, then draw the chart on the 24px board grid.</p>
    <div class="photo-description">Flower Generator · US crochet terms · every stitch keeps its worked-into relationship.</div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0">
      <label>Petals<select id="genPetals"><option>4</option><option>5</option><option selected>6</option><option>7</option><option>8</option><option>10</option><option>12</option></select></label>
      <label>Petal size<select id="genSize"><option value="small">Small</option><option value="medium" selected>Medium</option><option value="tall">Tall</option></select></label>
      <label>Style<select id="genStyle"><option value="solid" selected>Solid</option></select></label>
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

  const closeBtn=$('generatorClose'),generateBtn=$('generateFlowerBtn'),importBtn=$('generatorImportBtn'),progress=$('generatorProgress'),pct=$('generatorPct'),bar=$('generatorBar'),stepEl=$('generatorStep'),summary=$('generatorSummary'),written=$('generatorWritten'),message=$('generatorMessage');
  let graph=null;
  const open=()=>{modal.hidden=false;document.body.style.overflow='hidden'},close=()=>{modal.hidden=true;document.body.style.overflow=''};
  desktopBtn.onclick=open;mobileBtn.onclick=open;closeBtn.onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function progressStep(i,total,text){progress.style.display='block';const p=Math.round(i/total*100);pct.textContent=p+'%';bar.style.width=p+'%';stepEl.textContent=`${i}/${total} · ${text}`;await wait(18)}
  function uuid(prefix='st'){try{return crypto.randomUUID()}catch(e){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}}
  const stitch=(type,opts={})=>({id:uuid(type),type,...opts});
  function petalSequence(size){if(size==='small')return['single','half','double','half','single'];if(size==='tall')return['single','half','double','treble','treble','double','half','single'];return['single','half','double','double','half','single']}

  function buildGraph(params){
    const P=params.petals,nodes=[],spaces=[];
    const center=stitch('ring',{round:0,group:'center',order:0,role:'start',relation:'start'});nodes.push(center);
    for(let p=0;p<P;p++){
      const sc=stitch('single',{round:1,group:`anchor-${p+1}`,order:p*4,role:'petal-anchor',workedInto:center.id,relation:'into-MR',petal:p+1});nodes.push(sc);
      let prev=sc.id;const chainIds=[];
      for(let c=0;c<3;c++){const ch=stitch('chain',{round:1,group:`space-${p+1}`,order:p*4+c+1,role:'chain-space',anchor:prev,relation:'chain-from',petal:p+1});nodes.push(ch);chainIds.push(ch.id);prev=ch.id}
      spaces.push({id:`space-${p+1}`,petal:p+1,chainIds,anchorStitch:sc.id});
    }
    const firstSc=nodes.find(n=>n.role==='petal-anchor');nodes.push(stitch('slip',{round:1,group:'round-1-join',order:P*4,role:'join',workedInto:firstSc.id,relation:'join-round'}));
    const seq=petalSequence(params.size);
    for(let p=0;p<P;p++){
      const sp=spaces[p];seq.forEach((type,j)=>nodes.push(stitch(type,{round:2,group:`petal-${p+1}`,order:j,role:'petal-stitch',workedInto:sp.id,relation:'into-chain-space',petal:p+1})));
      nodes.push(stitch('slip',{round:2,group:`petal-${p+1}`,order:seq.length,role:p===P-1?'finish':'petal-separator',workedInto:spaces[(p+1)%P].anchorStitch,relation:p===P-1?'join-finish':'between-petals',petal:p+1}));
    }
    return{kind:'flower',version:2,params,nodes,spaces};
  }

  function validateGraph(g){
    const errors=[],ids=new Set(g.nodes.map(n=>n.id)),spaceIds=new Set(g.spaces.map(s=>s.id)),P=g.params.petals;
    if(g.nodes.length!==ids.size)errors.push('Duplicate stitch IDs.');
    const center=g.nodes.filter(n=>n.role==='start'&&n.type==='ring');if(center.length!==1)errors.push('Flower must have exactly one Magic Ring.');
    const anchors=g.nodes.filter(n=>n.role==='petal-anchor');if(anchors.length!==P)errors.push(`Expected ${P} sc anchors, found ${anchors.length}.`);
    if(anchors.some(n=>n.workedInto!==center[0]?.id))errors.push('Every Round 1 sc must be worked into the Magic Ring.');
    if(g.spaces.length!==P)errors.push(`Expected ${P} ch-3 spaces.`);
    for(const s of g.spaces){if(s.chainIds.length!==3)errors.push(`${s.id} must contain exactly 3 chains.`);let prev=s.anchorStitch;for(const cid of s.chainIds){const ch=g.nodes.find(n=>n.id===cid);if(!ch||ch.type!=='chain'||ch.anchor!==prev)errors.push(`${s.id} has a broken chain sequence.`);prev=cid}}
    for(const n of g.nodes){if(n.workedInto&&!ids.has(n.workedInto)&&!spaceIds.has(n.workedInto))errors.push(`${n.id} has invalid workedInto.`);if(n.anchor&&!ids.has(n.anchor))errors.push(`${n.id} has invalid chain anchor.`)}
    const expectedSeq=petalSequence(g.params.size);
    for(let p=1;p<=P;p++){const petal=g.nodes.filter(n=>n.group===`petal-${p}`&&n.role==='petal-stitch');if(petal.length!==expectedSeq.length)errors.push(`Petal ${p} stitch count is invalid.`);if(petal.some(n=>n.workedInto!==`space-${p}`))errors.push(`Every stitch of petal ${p} must be worked into space-${p}.`);if(petal.some((n,i)=>n.type!==expectedSeq[i]))errors.push(`Petal ${p} stitch order is invalid.`)}
    const r1Join=g.nodes.filter(n=>n.round===1&&n.role==='join'&&n.type==='slip');if(r1Join.length!==1)errors.push('Round 1 must close with one sl st.');
    const finish=g.nodes.filter(n=>n.round===2&&n.role==='finish'&&n.type==='slip');if(finish.length!==1)errors.push('Flower must finish with one sl st join.');
    const r1=g.nodes.filter(n=>n.round===1),r2=g.nodes.filter(n=>n.round===2);return{ok:!errors.length,errors,counts:{round1:r1.length,round2:r2.length,total:g.nodes.length}};
  }

  function abbr(t){return window.CROCHET_US_STANDARD?.[t]?.abbr||({ring:'MR',single:'sc',chain:'ch',slip:'sl st',half:'hdc',double:'dc',treble:'tr'})[t]||t}
  function writtenPattern(g){const P=g.params.petals,seq=petalSequence(g.params.size).map(abbr).join(', '),centerLine=g.params.center==='open'?'Start with an adjustable magic ring (MR), leaving the center slightly open.':'Start with a magic ring (MR) and draw it closed after Round 1.';return['FLOWER PATTERN · US TERMS','',centerLine,`R1: *sc in MR, ch 3; repeat from * ${P} times. Join with sl st to first sc. [${P} sc, ${P} ch-3 sps]`,`R2: In each ch-3 sp work (${seq}), then sl st in the next sc anchor; repeat around. [${P} petals]`,'',`Construction: ${P} equal petals · solid · ${g.params.size}.`,'Chart and written instructions are generated from the same validated crochet graph.'].join('\n')}

  const snap=v=>Math.round(v/GRID)*GRID;
  function graphToBoard(g){
    const out=[],P=g.params.petals,cx=snap(Math.max(420,(board.clientWidth||1200)/2)),cy=snap(504);
    const radial=(r,a)=>({x:snap(cx+Math.cos(a)*r),y:snap(cy+Math.sin(a)*r)});
    const add=(n,pos,rotation,pathId,order,visualAnchor=null)=>out.push({id:n.id,type:n.type,row:n.round||0,col:order,x:(pos.x/Math.max(board.clientWidth||1200,900))*100,y:pos.y,gridX:pos.x,gridY:pos.y,rotation,direction:'e',generatedPattern:true,patternKind:'flower',pathId,orderInPath:order,sourceRegion:n.group,stitchFamily:n.type,workedInto:n.workedInto||n.anchor||null,visualAnchor,relation:n.relation,role:n.role,round:n.round,petal:n.petal||null,confidence:1,estimated:false});
    const center=g.nodes.find(n=>n.role==='start');add(center,{x:cx,y:cy},0,'CENTER',0,null);
    const anchorPositions=[],spaceVisual={};
    for(let p=0;p<P;p++){
      const a=-Math.PI/2+p*2*Math.PI/P,nextA=-Math.PI/2+((p+1)%P)*2*Math.PI/P;
      const sc=g.nodes.find(n=>n.group===`anchor-${p+1}`&&n.role==='petal-anchor'),base=radial(72,a);anchorPositions[p]=base;add(sc,base,a*180/Math.PI+90,'R1',p*4,center.id);
      const chains=g.nodes.filter(n=>n.group===`space-${p+1}`&&n.type==='chain');let delta=nextA-a;if(delta>Math.PI)delta-=2*Math.PI;if(delta<-Math.PI)delta+=2*Math.PI;
      chains.forEach((n,c)=>{const t=(c+1)/4,midA=a+delta*t,q=radial(108,midA);add(n,q,midA*180/Math.PI+90,'R1',p*4+c+1,c===0?sc.id:chains[c-1].id);if(c===1)spaceVisual[`space-${p+1}`]=n.id});
    }
    const r1Join=g.nodes.find(n=>n.round===1&&n.role==='join');if(r1Join)add(r1Join,anchorPositions[0],0,'R1',P*4,g.nodes.find(n=>n.group==='anchor-1'&&n.role==='petal-anchor')?.id);
    const heights={single:132,half:156,double:180,treble:216};
    for(let p=0;p<P;p++){
      const a=-Math.PI/2+p*2*Math.PI/P,petal=g.nodes.filter(n=>n.group===`petal-${p+1}`&&n.role==='petal-stitch'),span=Math.min(.42,Math.max(.25,1.65/P));
      petal.forEach((n,j)=>{const t=petal.length===1?0:(j/(petal.length-1)-.5)*2,aa=a+t*span,q=radial(heights[n.type]||156,aa);add(n,q,aa*180/Math.PI+90,`P${p+1}`,j,spaceVisual[`space-${p+1}`])});
      const sep=g.nodes.find(n=>n.group===`petal-${p+1}`&&(n.role==='petal-separator'||n.role==='finish')),target=(p+1)%P,nextAnchor=g.nodes.find(n=>n.group===`anchor-${target+1}`&&n.role==='petal-anchor');if(sep)add(sep,anchorPositions[target],0,`P${p+1}`,petal.length,nextAnchor?.id);
    }
    if(out.some(i=>i.gridX%GRID!==0||i.gridY%GRID!==0))throw new Error('Grid validation failed.');
    return out;
  }

  function drawTopologyOverlay(){
    board.querySelectorAll('.crochet-topology-overlay').forEach(n=>n.remove());const gen=items.filter(i=>i.generatedPattern);if(!gen.length)return;const byId=new Map(gen.map(i=>[i.id,i])),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('class','crochet-topology-overlay');svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:0';
    for(const it of gen){if(!it.visualAnchor)continue;const a=byId.get(it.visualAnchor);if(!a)continue;const line=document.createElementNS(ns,'line');line.setAttribute('x1',a.gridX);line.setAttribute('y1',a.gridY);line.setAttribute('x2',it.gridX);line.setAttribute('y2',it.gridY);line.setAttribute('stroke','#9aa4af');line.setAttribute('stroke-width','1.2');line.setAttribute('stroke-linecap','round');line.setAttribute('opacity',it.role==='petal-stitch'?'0.42':'0.6');svg.appendChild(line)}board.insertBefore(svg,board.firstChild);
  }
  function applyGeneratedGridLayout(){const placed=[...board.querySelectorAll('.placed')];if(!items.some(i=>i.generatedPattern))return;placed.forEach((el,i)=>{const it=items[i];if(!it?.generatedPattern)return;el.style.left=it.gridX+'px';el.style.top=it.gridY+'px';el.style.zIndex='2'});board.querySelectorAll('.path-guide').forEach(n=>n.remove());drawTopologyOverlay()}
  const baseRender=render;render=function(){baseRender();applyGeneratedGridLayout()};

  async function generate(){importBtn.disabled=true;summary.style.display='none';written.style.display='none';message.textContent='';graph=null;const params={petals:Number($('genPetals').value),size:$('genSize').value,style:'solid',center:$('genCenter').value},total=9;await progressStep(1,total,'Reading generator settings');await progressStep(2,total,'Creating Magic Ring');await progressStep(3,total,'Building sc anchors into MR');await progressStep(4,total,'Building each ch-3 sequence');graph=buildGraph(params);await progressStep(5,total,'Building petal fans into chain spaces');const check=validateGraph(graph);await progressStep(6,total,'Validating crochet topology');if(!check.ok){message.textContent='Pattern validation failed: '+check.errors.join(' ');graph=null;return}graph.validation=check;await progressStep(7,total,'Mapping every symbol to the 24px grid');const preview=graphToBoard(graph);graph.boardPreview=preview;await progressStep(8,total,'Generating written pattern from the same graph');graph.written=writtenPattern(graph);await progressStep(9,total,'Pattern validated');summary.style.display='block';summary.innerHTML=`<strong>VALIDATED FLOWER</strong><div style="margin-top:8px">${params.petals} petals · solid · ${params.size}</div><div style="margin-top:5px">${check.counts.total} chart symbols · 24px grid locked</div><div style="margin-top:5px;color:#7ce3a1">✓ MR anchors · ✓ ch-3 sequences · ✓ petal fans · ✓ sl st joins · ✓ workedInto · ✓ grid snap</div>`;written.style.display='block';written.textContent=graph.written;importBtn.disabled=false;window.activeCrochetGraph=graph}
  generateBtn.addEventListener('click',()=>generate().catch(e=>{console.error(e);message.textContent='Generator error: '+e.message}));
  importBtn.addEventListener('click',()=>{if(!graph?.validation?.ok||!graph.boardPreview)return;snapshot();items=graph.boardPreview;selected=null;currentRow=0;currentCol=items.length;placementRotation=0;window.activeCrochetGraph=graph;render();rowStatus.textContent=`Flower · ${graph.params.petals} petals · grid validated`;selectedStatus.textContent='Validated crochet topology';close()});
})();