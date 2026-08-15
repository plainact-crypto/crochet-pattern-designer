// Visible progress UX for the lace geometry/layout import pipeline.
(()=>{
  function loadSizingV71(){
    if(document.querySelector('script[data-pattern-sizing-v71]'))return;
    const s=document.createElement('script');
    s.src='pattern-sizing-v7.1.js?v=20260815-1622v71';
    s.dataset.patternSizingV71='1';
    document.head.appendChild(s);
  }
  function loadGridTools(){
    if(document.querySelector('script[data-grid-tools-v70]')){loadSizingV71();return;}
    const tools=document.createElement('script');
    tools.src='grid-tools-v7.0.js?v=20260815-1615v70';
    tools.dataset.gridToolsV70='1';
    tools.onload=loadSizingV71;
    tools.onerror=loadSizingV71;
    document.head.appendChild(tools);
  }
  if(!document.querySelector('script[data-lace-visual-v69]')){
    const visual=document.createElement('script');
    visual.src='lace-visual-v6.9.js?v=20260815-1604v69';
    visual.dataset.laceVisualV69='1';
    visual.onload=loadGridTools;
    visual.onerror=loadGridTools;
    document.head.appendChild(visual);
  }else loadGridTools();

  const $=id=>document.getElementById(id);
  function nextPaint(){return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
  function install(){
    const btn=$('laceImport');
    if(!btn||btn.dataset.progressWrapped==='1'||typeof btn.onclick!=='function')return;
    btn.dataset.progressWrapped='1';
    const original=btn.onclick;
    const progress=$('laceProgress'),pct=$('lacePct'),bar=$('laceBar'),step=$('laceStep'),msg=$('laceMessage');
    let busy=false;
    async function show(percent,label){
      if(progress)progress.style.display='block';
      if(pct)pct.textContent=percent+'%';
      if(bar){bar.style.width=percent+'%';bar.style.transition='width .22s ease';}
      if(step)step.textContent=label;
      if(msg){msg.className='form-message';msg.textContent=label;}
      await nextPaint();
    }
    btn.onclick=async function(e){
      if(busy)return;
      busy=true;btn.disabled=true;btn.textContent='VALIDATING LAYOUT…';
      try{
        await show(12,'1/6 · Preparing board geometry');
        await new Promise(r=>setTimeout(r,40));
        await show(28,'2/6 · Building constrained sector candidates');
        await new Promise(r=>setTimeout(r,40));
        await show(46,'3/6 · Preparing 5-sector symmetry solve');
        await new Promise(r=>setTimeout(r,40));
        await show(68,'4/6 · Solving constrained 24px grid…');
        await nextPaint();
        original.call(btn,e);
        const v=window.__LACE_LAYOUT_SNAPSHOT?.validation;
        await show(86,'5/6 · Checking collisions, clipping & sector bboxes');
        await new Promise(r=>setTimeout(r,60));
        await show(96,'6/6 · Checking symmetry & final board fit');
        await new Promise(r=>setTimeout(r,60));
        if(v?.ok){await show(100,'6/6 · Layout validated — rendering complete');}
        else {await show(100,'6/6 · Layout rejected — see validation reason below');}
      }catch(err){
        console.error('Lace import progress wrapper failed',err);
        if(msg){msg.className='form-message error';msg.textContent='LAYOUT REJECTED: '+(err?.message||String(err));}
      }finally{
        busy=false;
        if(!document.getElementById('photoModeModal')?.hidden){btn.disabled=false;btn.textContent='IMPORT & VALIDATE CHART TO BOARD';}
      }
    };
  }
  setTimeout(install,0);
  document.addEventListener('click',e=>{
    if(e.target?.id==='photoModeBtn'||e.target?.id==='mobilePhotoModeBtn'||e.target?.id==='laceGenerate')setTimeout(install,0);
  },true);
})();
