// v7.8 — deterministic crochet constructability audit for the fixed lace flower.
// Audits actual graph references and round-to-round reachability; no visual guessing.
(()=>{
  const VERSION='v7.8';
  const role=(g,r,s)=>g.nodes.filter(n=>n.role===r&&(s==null||n.sector===s));
  const one=(g,r,s)=>role(g,r,s)[0]||null;
  const byId=(g,id)=>g.nodes.find(n=>n.id===id)||null;
  const uid=()=>{try{return crypto.randomUUID()}catch{return 'r4-transition-'+Date.now().toString(36)}};

  function stamp(){
    window.__CROCHET_CAD_VERSION=VERSION;
    document.title=`Crochet Pattern Designer · ${VERSION}`;
    const b=document.querySelector('.brandcopy strong');if(b)b.textContent=`Crochet CAD ${VERSION}`;
    const p=document.querySelector('#sizingToolsV71 > strong');if(p)p.textContent=`SIZE / GRID · ${VERSION}`;
  }

  function ensureR4Transition(){
    const g=window.activeCrochetGraph;
    if(!g||g.kind!=='lace-flower')return false;
    if(one(g,'r4-transition-join'))return true;
    const r3End=one(g,'inner-petal-stitch-join',5);
    const r4Start=g.nodes.find(n=>n.role==='center-sc'&&n.centerIndex===1);
    if(!r3End||!r4Start)return false;
    const n={id:uid(),type:'slip',round:4,role:'r4-transition-join',group:'r4-transition',sector:1,order:-1,anchor:r3End.id,workedInto:r4Start.id,topologyOnly:true,visualJoin:true};
    g.nodes.push(n);
    try{
      if(typeof items!=='undefined'&&Array.isArray(items)&&!items.some(i=>i.id===n.id)){
        const target=items.find(i=>i.id===r4Start.id);
        if(target){
          items.push({id:n.id,type:'slip',row:4,col:-1,x:target.x,y:target.y,gridCol:target.gridCol,gridRow:target.gridRow,gridX:target.gridCol,gridY:target.gridRow,rotation:target.rotation||0,direction:'e',generatedPattern:true,patternKind:'lace-flower',sourceRegion:'r4-transition',role:n.role,round:4,sector:1,orderInPath:-1,workedInto:r4Start.id,anchor:r3End.id,confidence:1,estimated:false,visualJoin:true,topologyOnly:true,visualWidth:8,visualHeight:8,footprint:{widthPx:0,heightPx:0,rotationDeg:0,body:false}});
          if(typeof render==='function')render();
        }
      }
    }catch(e){console.warn('Could not mirror R4 transition to board items',e)}
    return true;
  }

  function traverseSpaces(spaces,startId){
    const used=[],seen=new Set();let current=startId;
    for(let k=0;k<spaces.length;k++){
      const sp=spaces.find(x=>x.startAnchor===current&&!seen.has(x.id));
      if(!sp)return{ok:false,used,current,reason:`no space starts at anchor ${current}`};
      seen.add(sp.id);used.push(sp);current=sp.endAnchor;
    }
    return{ok:used.length===spaces.length&&current===startId,used,current,reason:current===startId?'':`cycle ends at ${current} instead of ${startId}`};
  }

  function audit(){
    stamp();
    const g=window.activeCrochetGraph,errors=[],checks=[];
    const pass=(name,ok,detail='')=>{checks.push({name,ok,detail});if(!ok)errors.push(`${name}${detail?': '+detail:''}`)};
    if(!g||g.kind!=='lace-flower'){
      const out={ok:false,errors:['No active lace-flower graph'],checks:[],version:VERSION};window.__LACE_CONSTRUCTABILITY_AUDIT=out;renderStatus(out);return out;
    }
    ensureR4Transition();
    const ids=new Set(g.nodes.map(n=>n.id)),spids=new Set((g.spaces||[]).map(s=>s.id));
    const badRefs=[];
    for(const n of g.nodes){
      if(n.workedInto&&!ids.has(n.workedInto)&&!spids.has(n.workedInto))badRefs.push(`${n.role||n.type}.workedInto`);
      if(n.anchor&&!ids.has(n.anchor))badRefs.push(`${n.role||n.type}.anchor`);
    }
    pass('All node references resolve',badRefs.length===0,badRefs.slice(0,4).join(', '));

    const r1=g.nodes.filter(n=>n.role==='center-sc').sort((a,b)=>(a.centerIndex??0)-(b.centerIndex??0));
    pass('R1 has 10 sc',r1.length===10,`found ${r1.length}`);
    const r3End=one(g,'inner-petal-stitch-join',5),transition=one(g,'r4-transition-join'),r4Start=r1[1];
    pass('R3→R4 transition is explicit',!!transition&&transition.type==='slip'&&transition.anchor===r3End?.id&&transition.workedInto===r4Start?.id,'sl st must connect fifth R3 join to next unused R1 sc');

    const r4=(g.spaces||[]).filter(s=>s.round===4);
    const r4walk=r4Start?traverseSpaces(r4,r4Start.id):{ok:false,reason:'missing R4 start'};
    pass('R4 five ch-7 spaces form a closed reachable cycle',r4.length===5&&r4.every(s=>s.chainIds?.length===7)&&r4walk.ok,r4walk.reason||`found ${r4.length} spaces`);

    let r5ok=r4.length===5;
    for(const sp of r4){
      const body=g.nodes.filter(n=>n.role==='mid-petal-stitch'&&n.workedInto===sp.id);
      const join=g.nodes.find(n=>n.role==='mid-petal-stitch-join'&&n.sector===sp.sector);
      if(body.length!==11||join?.workedInto!==sp.endAnchor)r5ok=false;
    }
    pass('R5 each ch-7 space has executable 11-stitch petal + ending join',r5ok);

    const r5End=one(g,'mid-petal-stitch-join',5),r6=(g.spaces||[]).filter(s=>s.round===6);
    const r6walk=r5End?traverseSpaces(r6,r5End.id):{ok:false,reason:'missing fifth R5 join'};
    pass('R6 starts at fifth R5 join and closes after five ch-11 spaces',r6.length===5&&r6.every(s=>s.chainIds?.length===11)&&r6walk.ok,r6walk.reason||`found ${r6.length} spaces`);

    let r7ok=r6.length===5;
    for(const sp of r6){
      const body=g.nodes.filter(n=>n.role==='outer-petal-stitch'&&n.workedInto===sp.id);
      const join=g.nodes.find(n=>n.role==='outer-petal-stitch-join'&&n.sector===sp.sector);
      if(body.length!==17||join?.workedInto!==sp.endAnchor)r7ok=false;
    }
    pass('R7 each ch-11 space has executable 17-stitch petal + ending join',r7ok);

    const outer=g.nodes.filter(n=>n.role==='outer-petal-stitch'),edge=g.nodes.filter(n=>n.role==='edge-sc');
    let edgeOk=edge.length===95&&outer.length===85;
    for(const base of outer){
      const n=edge.filter(e=>e.workedInto===base.id).length;
      const expected=base.order===8?3:1;
      if(n!==expected){edgeOk=false;break;}
    }
    pass('R8 maps exactly to R7 stitches and totals 95 sc',edgeOk,`R7=${outer.length}, R8=${edge.length}`);

    const layout=window.__LACE_LAYOUT_SNAPSHOT?.validation;
    pass('Geometry/layout validator passes',layout?.ok===true,(layout?.errors||[]).join(' · '));

    const out={ok:errors.length===0,errors,checks,version:VERSION,checkedAt:new Date().toISOString()};
    window.__LACE_CONSTRUCTABILITY_AUDIT=out;
    if(g)g.constructability=out;
    renderStatus(out);
    return out;
  }

  function renderStatus(a){
    const panel=document.getElementById('sizingToolsV71');
    if(panel){
      let e=document.getElementById('constructabilityStatusV78');
      if(!e){e=document.createElement('div');e.id='constructabilityStatusV78';e.style.cssText='margin-top:10px;padding:8px 9px;border-radius:7px;font:800 11px/1.35 system-ui';panel.appendChild(e)}
      e.style.background=a.ok?'rgba(28,120,68,.2)':'rgba(180,45,45,.2)';e.style.border=`1px solid ${a.ok?'#2aa45f':'#d55454'}`;e.style.color=a.ok?'#8ff0b8':'#ffabab';e.textContent=`CONSTRUCTABILITY: ${a.ok?'PASS':'FAIL'}${a.ok?' · anchors + counts + round transitions verified':` · ${a.errors[0]||'audit failed'}`}`;
    }
    const summary=document.getElementById('laceSummary');
    if(summary&&summary.style.display!=='none')summary.innerHTML+=`<br><strong style="color:${a.ok?'#82e6a9':'#ff9c9c'}">CONSTRUCTABILITY ${a.ok?'PASS':'FAIL'}</strong>${a.ok?' · executable anchors and counts verified':` · ${(a.errors||[]).join(' · ')}`}`;
  }

  function schedule(){let tries=0;const t=setInterval(()=>{tries++;if(window.activeCrochetGraph?.kind==='lace-flower'){clearInterval(t);ensureR4Transition();audit();}else if(tries>30)clearInterval(t)},70)}

  window.runLaceConstructabilityAudit=audit;
  document.addEventListener('click',e=>{
    if(e.target?.id==='laceImport')schedule();
    if(['exportPdfBtn','mobileExportPdfBtn','quickExportPdfBtn'].includes(e.target?.id)&&window.activeCrochetGraph?.kind==='lace-flower'){
      ensureR4Transition();const a=audit();if(!a.ok){e.preventDefault();e.stopImmediatePropagation();alert('CONSTRUCTABILITY FAIL\n'+a.errors.join('\n'));}
    }
  },true);
  setTimeout(()=>{stamp();if(window.activeCrochetGraph?.kind==='lace-flower'){ensureR4Transition();audit();}},180);
})();
