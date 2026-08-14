// Presentation layer for Photo Mode round drafts.
const photoChartBaseRender = render;
render = function(){
  photoChartBaseRender();
  board.querySelectorAll('.photo-round-guide,.photo-round-label').forEach(n=>n.remove());
  const photoItems = items.filter(i=>i.photoDraft);
  if(!photoItems.length) return;

  const roundItems = photoItems.filter(i=>Number.isFinite(i.round));
  const isRoundDraft = roundItems.some(i=>i.round>0);
  const placedEls = [...board.querySelectorAll('.placed')];

  items.forEach((it,index)=>{
    if(!it.photoDraft) return;
    const el = placedEls[index];
    if(!el) return;
    const size = it.type==='ring' ? 34 : 28;
    el.innerHTML = svgFor(it.type,size);
    el.classList.add('photo-draft-stitch');
  });

  if(isRoundDraft){
    board.querySelectorAll('.path-guide').forEach(n=>n.remove());
    const ring = roundItems.find(i=>i.round===0);
    const bw = board.clientWidth || 2200;
    const cx = ring ? (ring.x/100)*bw : bw/2;
    const cy = ring ? ring.y : 1100;
    const rounds = [...new Set(roundItems.map(i=>i.round).filter(r=>r>0))].sort((a,b)=>a-b);
    const labelAngle=-Math.PI*.22;

    for(const rr of rounds){
      const group = roundItems.filter(i=>i.round===rr);
      if(!group.length) continue;
      const radius = group.reduce((sum,it)=>{
        const px=(it.x/100)*bw;
        return sum + Math.hypot(px-cx,(it.y||0)-cy);
      },0)/group.length;

      const g=document.createElement('div');
      g.className='photo-round-guide';
      g.style.width=(radius*2)+'px';
      g.style.height=(radius*2)+'px';
      g.style.left=(cx-radius)+'px';
      g.style.top=(cy-radius)+'px';
      board.insertBefore(g,board.firstChild);

      const label=document.createElement('div');
      label.className='photo-round-label';
      label.textContent=`R${rr} · ~${group.length}`;
      label.style.left=(cx+Math.cos(labelAngle)*radius+10)+'px';
      label.style.top=(cy+Math.sin(labelAngle)*radius)+'px';
      board.appendChild(label);
    }

    const totalStitches = roundItems.filter(i=>i.round>0).length;
    rowStatus.textContent=`Photo Draft · ${rounds.length} rounds · ~${totalStitches} estimated sts`;
    const sel=items.find(i=>i.id===selected);
    if(sel?.photoDraft && Number.isFinite(sel.round)){
      selectedStatus.textContent=sel.round===0?'Magic Ring selected':`R${sel.round} · ${defs.find(d=>d.id===sel.type)?.name||sel.type} · estimated`;
    }else if(!sel){selectedStatus.textContent='Round chart · estimated draft';}
  }
};
render();
