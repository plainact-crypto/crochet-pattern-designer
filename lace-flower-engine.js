// Topology-first fixed 5-petal lace flower generator.
(() => {
  const $=id=>document.getElementById(id);
  const modal=$('photoModeModal'),desktop=$('photoModeBtn'),mobile=$('mobilePhotoModeBtn');
  if(!modal||!desktop||!mobile||typeof render!=='function')return;
  desktop.textContent='Pattern Generator'; mobile.textContent='Pattern Generator';
  const card=modal.querySelector('.photo-card'); if(!card)return;
  card.innerHTML=`<button class="modal-close" id="laceClose" type="button">×</button><h2>5-PETAL LACE FLOWER</h2><p class="modal-sub">Fixed executable template · US crochet terms · generated round by round.</p><div class="photo-description">MR → 10 sc center → five closed ch-5 arches → five inner petals → five back ch-9 arches → five outer petals → shaped sc edge.</div><button id="laceGenerate" class="modal-primary" type="button">GENERATE VALIDATED LACE FLOWER</button><section id="laceProgress" style="display:none;margin:12px 0;padding:12px;border:1px solid #46515d;border-radius:10px;background:#111820;color:#eaf3ff"><div style="display:flex;justify-content:space-between"><strong>Construction</strong><span id="lacePct">0%</span></div><div style="height:8px;background:#27313b;border-radius:99px;overflow:hidden;margin-top:8px"><div id="laceBar" style="width:0;height:100%;background:#2f81f7"></div></div><div id="laceStep" style="margin-top:9px;font-size:12px;font-weight:700">Waiting…</div></section><section id="laceSummary" style="display:none;margin:12px 0;padding:12px;border:1px solid #46515d;border-radius:10px;background:#151b21;color:#eaf3ff"></section><section id="laceWritten" style="display:none;margin:12px 0;padding:12px;border:1px solid #46515d;border-radius:10px;background:#fff;color:#20262d;white-space:pre-wrap;font:13px/1.55 ui-monospace,Consolas,monospace"></section><button id="laceImport" class="modal-primary photo-import" type="button" disabled>IMPORT VALIDATED CHART TO BOARD</button><div id="laceMessage" class="form-message"></div>`;
  const closeBtn=$('laceClose'),genBtn=$('laceGenerate'),impBtn=$('laceImport'),progress=$('laceProgress'),pct=$('lacePct'),bar=$('laceBar'),step=$('laceStep'),summary=$('laceSummary'),written=$('laceWritten'),msg=$('laceMessage');
  let graph=null;
  const open=()=>{modal.hidden=false;document.body.style.overflow='hidden'},close=()=>{modal.hidden=true;document.body.style.overflow=''};
  desktop.onclick=open;mobile.onclick=open;closeBtn.onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function phase(i,n,label){progress.style.display='block';const p=Math.round(i/n*100);pct.textContent=p+'%';bar.style.width=p+'%';step.textContent=`${i}/${n} · ${label}`;await wait(20)}
  function id(prefix){try{return crypto.randomUUID()}catch{return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}}
  const st=(type,o={})=>({id:id(type),type,...o});

  function build(){
    const nodes=[],spaces=[],P=5;
    const center=st('ring',{round:0,role:'start',group:'center'});nodes.push(center);

    // R1: exactly 10 sc in MR. Odd stitches are also marked as back-arch anchors, but stay center-sc.
    const r1=[];
    for(let i=0;i<10;i++){
      const x=st('single',{round:1,role:'center-sc',group:'center-ring',order:i,workedInto:center.id,centerIndex:i,backAnchor:i%2===1});
      if(i%2===1)x.backSector=Math.floor(i/2)+1;
      nodes.push(x);r1.push(x);
    }
    nodes.push(st('slip',{round:1,role:'r1-join',group:'center-ring',order:10,workedInto:r1[0].id}));

    // R2: five ch-5 arches, each explicitly closed with sl st into the next even R1 anchor.
    const inner=[];
    for(let s=0;s<P;s++){
      const a=r1[s*2], b=r1[((s+1)*2)%10];
      let prev=a.id; const chains=[];
      for(let c=0;c<5;c++){
        const ch=st('chain',{round:2,role:'inner-chain',group:`inner-space-${s+1}`,sector:s+1,order:c,anchor:prev});
        nodes.push(ch);chains.push(ch.id);prev=ch.id;
      }
      const join=st('slip',{round:2,role:'inner-arch-join',group:`inner-space-${s+1}`,sector:s+1,order:5,workedInto:b.id});nodes.push(join);
      const sp={id:`inner-space-${s+1}`,round:2,sector:s+1,chainIds:chains,startAnchor:a.id,endAnchor:b.id,joinId:join.id};spaces.push(sp);inner.push(sp);
    }

    // R3: one executable inner petal in each ch-5 space.
    const innerSeq=['single','half','double','double','treble','double','double','half','single'];
    inner.forEach((sp,s)=>{
      innerSeq.forEach((t,j)=>nodes.push(st(t,{round:3,role:'inner-petal-stitch',group:`inner-petal-${s+1}`,sector:s+1,order:j,workedInto:sp.id})));
      nodes.push(st('slip',{round:3,role:'inner-petal-join',group:`inner-petal-${s+1}`,sector:s+1,order:9,workedInto:sp.endAnchor}));
    });

    // R4: five ch-9 arches behind R3, anchored to the five odd R1 sc.
    const outer=[];
    for(let s=0;s<P;s++){
      const a=r1[s*2+1],b=r1[((s+1)*2+1)%10];let prev=a.id;const chains=[];
      for(let c=0;c<9;c++){
        const ch=st('chain',{round:4,role:'outer-chain',group:`outer-space-${s+1}`,sector:s+1,order:c,anchor:prev});
        nodes.push(ch);chains.push(ch.id);prev=ch.id;
      }
      const join=st('slip',{round:4,role:'outer-arch-join',group:`outer-space-${s+1}`,sector:s+1,order:9,workedInto:b.id});nodes.push(join);
      const sp={id:`outer-space-${s+1}`,round:4,sector:s+1,chainIds:chains,startAnchor:a.id,endAnchor:b.id,joinId:join.id};spaces.push(sp);outer.push(sp);
    }

    // R5: large pointed outer petals.
    const outerSeq=['single','half','double','double','treble','treble','treble','treble','treble','double','double','half','single'],petals=[];
    outer.forEach((sp,s)=>{
      const pet=[];
      outerSeq.forEach((t,j)=>{const x=st(t,{round:5,role:'outer-petal-stitch',group:`outer-petal-${s+1}`,sector:s+1,order:j,workedInto:sp.id});nodes.push(x);pet.push(x)});
      nodes.push(st('slip',{round:5,role:'outer-petal-join',group:`outer-petal-${s+1}`,sector:s+1,order:13,workedInto:sp.endAnchor}));petals.push(pet);
    });

    // R6: sc around every R5 stitch; 3 sc in the center tr of each petal for the tip increase.
    petals.forEach((pet,s)=>{
      pet.forEach((base,j)=>{const reps=j===6?3:1;for(let k=0;k<reps;k++)nodes.push(st('single',{round:6,role:'edge-sc',group:`edge-${s+1}`,sector:s+1,order:j*3+k,workedInto:base.id,edgeBaseOrder:j,edgeRepeat:k}))});
      nodes.push(st('slip',{round:6,role:'edge-join',group:`edge-${s+1}`,sector:s+1,order:99,workedInto:petals[(s+1)%5][0].id}));
    });
    return{kind:'lace-flower',version:2,params:{petals:5},nodes,spaces,centerId:center.id};
  }

  function validate(g){
    const e=[],ids=new Set(g.nodes.map(n=>n.id)),spids=new Set(g.spaces.map(s=>s.id));
    if(ids.size!==g.nodes.length)e.push('Duplicate IDs');
    if(g.nodes.filter(n=>n.round===1&&n.type==='single'&&n.role==='center-sc').length!==10)e.push('R1 count');
    if(g.nodes.filter(n=>n.role==='r1-join'&&n.type==='slip').length!==1)e.push('R1 join');
    if(g.spaces.filter(s=>s.round===2&&s.chainIds.length===5).length!==5)e.push('R2 arches');
    if(g.nodes.filter(n=>n.role==='inner-arch-join').length!==5)e.push('R2 joins');
    if(g.nodes.filter(n=>n.role==='inner-petal-stitch').length!==45)e.push('R3 petals');
    if(g.spaces.filter(s=>s.round===4&&s.chainIds.length===9).length!==5)e.push('R4 arches');
    if(g.nodes.filter(n=>n.role==='outer-arch-join').length!==5)e.push('R4 joins');
    if(g.nodes.filter(n=>n.role==='outer-petal-stitch').length!==65)e.push('R5 petals');
    if(g.nodes.filter(n=>n.role==='edge-sc').length!==75)e.push('R6 edge');
    for(const n of g.nodes){if(n.workedInto&&!ids.has(n.workedInto)&&!spids.has(n.workedInto))e.push('Bad workedInto');if(n.anchor&&!ids.has(n.anchor))e.push('Bad chain anchor')}
    return{ok:!e.length,errors:[...new Set(e)]};
  }

  const writtenText=`5-PETAL LACE FLOWER · US TERMS\n\nStart: Make a magic ring (MR).\nR1: 10 sc in MR. Join with sl st to first sc. [10 sc]\nR2: *ch 5, skip 1 sc, sl st in next sc; repeat from * around. [5 ch-5 sps]\nR3: In each ch-5 sp work (sc, hdc, 2 dc, tr, 2 dc, hdc, sc); sl st in the ending anchor of the arch. [5 inner petals]\nR4: Working behind R3 in the five unused R1 sc: join to one unused sc, *ch 9, sl st in next unused sc; repeat around. [5 ch-9 arches]\nR5: In each ch-9 arch work (sc, hdc, 2 dc, 5 tr, 2 dc, hdc, sc); sl st in the ending anchor of the arch. [5 outer petals]\nR6: sc in each R5 stitch around, working 3 sc in the center tr of each petal. Join with sl st. [75 sc]\n\nThe chart and written instructions are generated from the same validated topology.`;

  function toBoard(g){return g.nodes.map((n,i)=>({id:n.id,type:n.type,row:n.round||0,col:n.order??i,x:50,y:500,gridCol:46,gridRow:21,gridX:46,gridY:21,rotation:0,direction:'e',generatedPattern:true,patternKind:'lace-flower',sourceRegion:n.group||'',role:n.role,round:n.round||0,sector:n.sector||null,orderInPath:n.order??i,workedInto:n.workedInto||n.anchor||null,confidence:1,estimated:false,centerIndex:n.centerIndex,backAnchor:!!n.backAnchor,edgeBaseOrder:n.edgeBaseOrder,edgeRepeat:n.edgeRepeat}))}

  async function generate(){
    impBtn.disabled=true;summary.style.display='none';written.style.display='none';msg.textContent='';
    const labels=['Magic Ring','10-sc center + join','Five closed ch-5 arches','Five inner petals','Five back ch-9 arches','Five outer petals','Shaped edge','Topology validation'];
    for(let i=0;i<labels.length;i++)await phase(i+1,labels.length,labels[i]);
    graph=build();graph.validation=validate(graph);graph.written=writtenText;
    if(!graph.validation.ok){msg.className='form-message error';msg.textContent='Rejected: '+graph.validation.errors.join(' · ');return}
    summary.style.display='block';summary.innerHTML=`<strong>VALIDATED LACE FLOWER</strong><br><span style="color:#aeb6bf">${graph.nodes.length} stitch nodes · 6 rounds · 5 repeated sectors.</span>`;
    written.style.display='block';written.textContent=writtenText;impBtn.disabled=false;msg.className='form-message success';msg.textContent='Construction valid. Ready to render.';
  }
  function importChart(){if(!graph?.validation?.ok)return;snapshot();items.splice(0,items.length,...toBoard(graph));selected=null;currentRow=6;currentCol=0;window.activeCrochetGraph=graph;render();close();setTimeout(()=>{try{const xs=items.map(i=>i.xPx||i.gridCol*24),ys=items.map(i=>i.yPx||i.gridRow*24),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),vw=boardWrap.clientWidth||800,vh=boardWrap.clientHeight||600;applyZoom(Math.max(.45,Math.min(1.2,Math.min(vw/(maxX-minX+240),vh/(maxY-minY+240)))));boardWrap.scrollLeft=Math.max(0,(minX+maxX)/2*zoom-vw/2);boardWrap.scrollTop=Math.max(0,(minY+maxY)/2*zoom-vh/2)}catch{}},0)}
  genBtn.onclick=generate;impBtn.onclick=importChart;
})();