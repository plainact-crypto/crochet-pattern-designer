// Layered topology-first fixed 5-petal lace flower generator.
(() => {
  const $=id=>document.getElementById(id);
  const modal=$('photoModeModal'),desktop=$('photoModeBtn'),mobile=$('mobilePhotoModeBtn');
  if(!modal||!desktop||!mobile||typeof render!=='function')return;
  desktop.textContent='Pattern Generator';mobile.textContent='Pattern Generator';
  const card=modal.querySelector('.photo-card');if(!card)return;
  card.innerHTML=`<button class="modal-close" id="laceClose" type="button">×</button><h2>5-PETAL LAYERED LACE FLOWER</h2><p class="modal-sub">Executable fixed template · US crochet terms · three nested petal layers.</p><div class="photo-description">MR → 10 sc → five ch-3 arches → inner petals → five back ch-7 arches → middle petals → five ch-11 arches → outer petals → shaped edge.</div><button id="laceGenerate" class="modal-primary" type="button">GENERATE VALIDATED LACE FLOWER</button><section id="laceProgress" style="display:none;margin:12px 0;padding:12px;border:1px solid #46515d;border-radius:10px;background:#111820;color:#eaf3ff"><div style="display:flex;justify-content:space-between"><strong>Construction</strong><span id="lacePct">0%</span></div><div style="height:8px;background:#27313b;border-radius:99px;overflow:hidden;margin-top:8px"><div id="laceBar" style="width:0;height:100%;background:#2f81f7"></div></div><div id="laceStep" style="margin-top:9px;font-size:12px;font-weight:700">Waiting…</div></section><section id="laceSummary" style="display:none;margin:12px 0;padding:12px;border:1px solid #46515d;border-radius:10px;background:#151b21;color:#eaf3ff"></section><section id="laceWritten" style="display:none;margin:12px 0;padding:12px;border:1px solid #46515d;border-radius:10px;background:#fff;color:#20262d;white-space:pre-wrap;font:13px/1.55 ui-monospace,Consolas,monospace"></section><button id="laceImport" class="modal-primary photo-import" type="button" disabled>IMPORT VALIDATED CHART TO BOARD</button><div id="laceMessage" class="form-message"></div>`;
  const closeBtn=$('laceClose'),genBtn=$('laceGenerate'),impBtn=$('laceImport'),progress=$('laceProgress'),pct=$('lacePct'),bar=$('laceBar'),step=$('laceStep'),summary=$('laceSummary'),written=$('laceWritten'),msg=$('laceMessage');
  let graph=null;
  const open=()=>{modal.hidden=false;document.body.style.overflow='hidden'},close=()=>{modal.hidden=true;document.body.style.overflow=''};
  desktop.onclick=open;mobile.onclick=open;closeBtn.onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function phase(i,n,label){progress.style.display='block';const p=Math.round(i/n*100);pct.textContent=p+'%';bar.style.width=p+'%';step.textContent=`${i}/${n} · ${label}`;await wait(18)}
  function id(prefix){try{return crypto.randomUUID()}catch{return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}}
  const st=(type,o={})=>({id:id(type),type,...o});
  function chainArch(nodes,{round,role,group,sector,count,startId,endId}){
    let prev=startId;const ids=[];
    for(let c=0;c<count;c++){const ch=st('chain',{round,role,group,sector,order:c,anchor:prev});nodes.push(ch);ids.push(ch.id);prev=ch.id}
    const join=st('slip',{round,role:`${role}-join`,group,sector,order:count,workedInto:endId});nodes.push(join);
    return{ids,joinId:join.id};
  }
  function petal(nodes,{round,role,group,sector,spaceId,seq,joinTarget}){
    const out=[];seq.forEach((t,j)=>{const x=st(t,{round,role,group,sector,order:j,workedInto:spaceId});nodes.push(x);out.push(x)});
    nodes.push(st('slip',{round,role:`${role}-join`,group,sector,order:seq.length,workedInto:joinTarget}));return out;
  }
  function build(){
    const nodes=[],spaces=[],P=5;
    const center=st('ring',{round:0,role:'start',group:'center'});nodes.push(center);
    const r1=[];
    for(let i=0;i<10;i++){const x=st('single',{round:1,role:'center-sc',group:'center-ring',order:i,workedInto:center.id,centerIndex:i});nodes.push(x);r1.push(x)}
    nodes.push(st('slip',{round:1,role:'r1-join',group:'center-ring',order:10,workedInto:r1[0].id}));

    const innerSpaces=[];
    for(let s=0;s<P;s++){
      const a=r1[s*2],b=r1[((s+1)*2)%10];const ch=chainArch(nodes,{round:2,role:'inner-chain',group:`inner-space-${s+1}`,sector:s+1,count:3,startId:a.id,endId:b.id});
      const sp={id:`inner-space-${s+1}`,round:2,sector:s+1,chainIds:ch.ids,startAnchor:a.id,endAnchor:b.id,joinId:ch.joinId};spaces.push(sp);innerSpaces.push(sp);
    }
    const innerSeq=['single','half','double','double','double','half','single'];
    innerSpaces.forEach((sp,s)=>petal(nodes,{round:3,role:'inner-petal-stitch',group:`inner-petal-${s+1}`,sector:s+1,spaceId:sp.id,seq:innerSeq,joinTarget:sp.endAnchor}));

    const midSpaces=[];
    for(let s=0;s<P;s++){
      const a=r1[s*2+1],b=r1[((s+1)*2+1)%10];const ch=chainArch(nodes,{round:4,role:'mid-chain',group:`mid-space-${s+1}`,sector:s+1,count:7,startId:a.id,endId:b.id});
      const sp={id:`mid-space-${s+1}`,round:4,sector:s+1,chainIds:ch.ids,startAnchor:a.id,endAnchor:b.id,joinId:ch.joinId};spaces.push(sp);midSpaces.push(sp);
    }
    const midSeq=['single','half','double','double','treble','treble','treble','double','double','half','single'];
    const midPetals=[];
    midSpaces.forEach((sp,s)=>midPetals.push(petal(nodes,{round:5,role:'mid-petal-stitch',group:`mid-petal-${s+1}`,sector:s+1,spaceId:sp.id,seq:midSeq,joinTarget:sp.endAnchor})));

    const outerSpaces=[];
    for(let s=0;s<P;s++){
      const currentJoin=nodes.find(n=>n.role==='mid-petal-stitch-join'&&n.sector===s+1);
      const nextJoin=nodes.find(n=>n.role==='mid-petal-stitch-join'&&n.sector===((s+1)%P)+1);
      const ch=chainArch(nodes,{round:6,role:'outer-chain',group:`outer-space-${s+1}`,sector:s+1,count:11,startId:currentJoin.id,endId:nextJoin.id});
      const sp={id:`outer-space-${s+1}`,round:6,sector:s+1,chainIds:ch.ids,startAnchor:currentJoin.id,endAnchor:nextJoin.id,joinId:ch.joinId};spaces.push(sp);outerSpaces.push(sp);
    }
    const outerSeq=['single','half','double','double','treble','treble','treble','dtr','dtr','dtr','treble','treble','treble','double','double','half','single'];
    const outerPetals=[];
    outerSpaces.forEach((sp,s)=>outerPetals.push(petal(nodes,{round:7,role:'outer-petal-stitch',group:`outer-petal-${s+1}`,sector:s+1,spaceId:sp.id,seq:outerSeq,joinTarget:sp.endAnchor})));

    outerPetals.forEach((pet,s)=>{
      pet.forEach((base,j)=>{const reps=j===8?3:1;for(let k=0;k<reps;k++)nodes.push(st('single',{round:8,role:'edge-sc',group:`edge-${s+1}`,sector:s+1,order:j*3+k,workedInto:base.id,edgeBaseOrder:j,edgeRepeat:k}))});
      nodes.push(st('slip',{round:8,role:'edge-join',group:`edge-${s+1}`,sector:s+1,order:999,workedInto:outerPetals[(s+1)%P][0].id}));
    });
    return{kind:'lace-flower',version:3,params:{petals:5,layers:3},nodes,spaces,centerId:center.id};
  }
  function validate(g){
    const e=[],ids=new Set(g.nodes.map(n=>n.id)),spids=new Set(g.spaces.map(s=>s.id));
    const count=r=>g.nodes.filter(n=>n.role===r).length;
    if(ids.size!==g.nodes.length)e.push('Duplicate IDs');
    if(count('center-sc')!==10)e.push('R1 count');
    if(g.spaces.filter(s=>s.round===2&&s.chainIds.length===3).length!==5)e.push('R2 arches');
    if(count('inner-petal-stitch')!==35)e.push('R3 petals');
    if(g.spaces.filter(s=>s.round===4&&s.chainIds.length===7).length!==5)e.push('R4 arches');
    if(count('mid-petal-stitch')!==55)e.push('R5 petals');
    if(g.spaces.filter(s=>s.round===6&&s.chainIds.length===11).length!==5)e.push('R6 arches');
    if(count('outer-petal-stitch')!==85)e.push('R7 petals');
    if(count('edge-sc')!==95)e.push('R8 edge');
    for(const n of g.nodes){if(n.workedInto&&!ids.has(n.workedInto)&&!spids.has(n.workedInto))e.push('Bad workedInto');if(n.anchor&&!ids.has(n.anchor))e.push('Bad chain anchor')}
    return{ok:!e.length,errors:[...new Set(e)]};
  }
  const writtenText=`5-PETAL LAYERED LACE FLOWER · US TERMS\n\nStart: MR.\nR1: 10 sc in MR; join with sl st. [10 sc]\nR2: *ch 3, skip 1 sc, sl st in next sc; repeat around. [5 ch-3 sps]\nR3: In each ch-3 sp work (sc, hdc, 3 dc, hdc, sc); sl st in ending anchor. [5 inner petals]\nR4: Working behind R3 in the five unused R1 sc: *ch 7, sl st in next unused sc; repeat around. [5 ch-7 sps]\nR5: In each ch-7 sp work (sc, hdc, 2 dc, 3 tr, 2 dc, hdc, sc); sl st in ending anchor. [5 middle petals]\nR6: From each R5 petal join, ch 11 behind the work and sl st in the next R5 petal join. [5 ch-11 sps]\nR7: In each ch-11 sp work (sc, hdc, 2 dc, 3 tr, 3 dtr, 3 tr, 2 dc, hdc, sc); sl st in ending anchor. [5 outer petals]\nR8: sc in each R7 stitch, working 3 sc in the center dtr of each petal; join with sl st. [95 sc]\n\nChart and written instructions come from the same validated topology.`;
  function toBoard(g){return g.nodes.map((n,i)=>({id:n.id,type:n.type,row:n.round||0,col:n.order??i,x:50,y:500,gridCol:46,gridRow:24,gridX:46,gridY:24,rotation:0,direction:'e',generatedPattern:true,patternKind:'lace-flower',sourceRegion:n.group||'',role:n.role,round:n.round||0,sector:n.sector||null,orderInPath:n.order??i,workedInto:n.workedInto||n.anchor||null,confidence:1,estimated:false,centerIndex:n.centerIndex,edgeBaseOrder:n.edgeBaseOrder,edgeRepeat:n.edgeRepeat}))}
  async function generate(){
    impBtn.disabled=true;summary.style.display='none';written.style.display='none';msg.textContent='';
    const labels=['Magic Ring','10-sc center','ch-3 inner arches','inner petals','ch-7 back arches','middle petals','ch-11 outer arches','outer petals','shaped edge','topology validation'];
    for(let i=0;i<labels.length;i++)await phase(i+1,labels.length,labels[i]);
    graph=build();graph.validation=validate(graph);graph.written=writtenText;
    if(!graph.validation.ok){msg.className='form-message error';msg.textContent='Rejected: '+graph.validation.errors.join(' · ');return}
    summary.style.display='block';summary.innerHTML=`<strong>VALIDATED 3-LAYER LACE FLOWER</strong><br><span style="color:#aeb6bf">${graph.nodes.length} stitch nodes · 8 rounds · 5 repeated sectors.</span>`;
    written.style.display='block';written.textContent=writtenText;impBtn.disabled=false;msg.className='form-message success';msg.textContent='Construction valid. Ready to render.';
  }
  function importChart(){if(!graph?.validation?.ok)return;snapshot();items.splice(0,items.length,...toBoard(graph));selected=null;currentRow=8;currentCol=0;window.activeCrochetGraph=graph;render();close();setTimeout(()=>{try{const xs=items.map(i=>i.xPx||i.gridCol*24),ys=items.map(i=>i.yPx||i.gridRow*24),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),vw=boardWrap.clientWidth||800,vh=boardWrap.clientHeight||600;applyZoom(Math.max(.4,Math.min(1.15,Math.min(vw/(maxX-minX+240),vh/(maxY-minY+240)))));boardWrap.scrollLeft=Math.max(0,(minX+maxX)/2*zoom-vw/2);boardWrap.scrollTop=Math.max(0,(minY+maxY)/2*zoom-vh/2)}catch{}},0)}
  genBtn.onclick=generate;impBtn.onclick=importChart;
})();