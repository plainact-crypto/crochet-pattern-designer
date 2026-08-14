// Presentation layer for Photo Mode drafts: circular rounds and square motif rounds.
const photoChartBaseRender = render;
render = function(){
  photoChartBaseRender();
  board.querySelectorAll('.photo-round-guide,.photo-round-label,.photo-square-guide,.photo-square-label').forEach(n=>n.remove());
  const photoItems=items.filter(i=>i.photoDraft);
  if(!photoItems.length)return;
  const placedEls=[...board.querySelectorAll('.placed')];
  items.forEach((it,index)=>{
    if(!it.photoDraft)return;
    const el=placedEls[index];if(!el)return;
    const size=it.type==='ring'?34:(it.corner?31:28);
    el.innerHTML=svgFor(it.type,size);el.classList.add('photo-draft-stitch');
  });
  const bw=board.clientWidth||2200;
  const squareItems=photoItems.filter(i=>i.photoGeometry==='square'&&Number.isFinite(i.round));
  if(squareItems.some(i=>i.round>0)){
    board.querySelectorAll('.path-guide').forEach(n=>n.remove());
    const rounds=[...new Set(squareItems.map(i=>i.round).filter(r=>r>0))].sort((a,b)=>a-b);
    for(const rr of rounds){
      const group=squareItems.filter(i=>i.round===rr);if(!group.length)continue;
      const xs=group.map(i=>(i.x/100)*bw),ys=group.map(i=>i.y);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=18;
      const g=document.createElement('div');g.className='photo-square-guide';g.style.left=(minX-pad)+'px';g.style.top=(minY-pad)+'px';g.style.width=(maxX-minX+pad*2)+'px';g.style.height=(maxY-minY+pad*2)+'px';board.insertBefore(g,board.firstChild);
      const label=document.createElement('div');label.className='photo-square-label';label.textContent=`R${rr} · square round · ~${group.filter(i=>!i.chainSpace).length} groups`;label.style.left=(maxX+34)+'px';label.style.top=(minY+20+rr*30)+'px';board.appendChild(label);
    }
    rowStatus.textContent=`Photo Draft · square motif · ${rounds.length} rounds · estimated reconstruction`;
    const sel=items.find(i=>i.id===selected);if(sel?.photoGeometry==='square')selectedStatus.textContent=sel.round===0?'Motif centre':`R${sel.round} · ${defs.find(d=>d.id===sel.type)?.name||sel.type}${sel.corner?' · corner':''}`;else if(!sel)selectedStatus.textContent='Square motif chart · estimated';
    return;
  }
  const roundItems=photoItems.filter(i=>Number.isFinite(i.round));
  if(roundItems.some(i=>i.round>0)){
    board.querySelectorAll('.path-guide').forEach(n=>n.remove());
    const ring=roundItems.find(i=>i.round===0),cx=ring?(ring.x/100)*bw:bw/2,cy=ring?.y||1100;
    const rounds=[...new Set(roundItems.map(i=>i.round).filter(r=>r>0))].sort((a,b)=>a-b),labelAngle=-Math.PI*.22;
    for(const rr of rounds){
      const group=roundItems.filter(i=>i.round===rr);if(!group.length)continue;
      const radius=group.reduce((sum,it)=>{const px=(it.x/100)*bw;return sum+Math.hypot(px-cx,(it.y||0)-cy)},0)/group.length;
      const g=document.createElement('div');g.className='photo-round-guide';g.style.width=(radius*2)+'px';g.style.height=(radius*2)+'px';g.style.left=(cx-radius)+'px';g.style.top=(cy-radius)+'px';board.insertBefore(g,board.firstChild);
      const label=document.createElement('div');label.className='photo-round-label';label.textContent=`R${rr} · ~${group.length}`;label.style.left=(cx+Math.cos(labelAngle)*radius+10)+'px';label.style.top=(cy+Math.sin(labelAngle)*radius)+'px';board.appendChild(label);
    }
    const total=roundItems.filter(i=>i.round>0).length;rowStatus.textContent=`Photo Draft · ${rounds.length} rounds · ~${total} estimated sts`;
    const sel=items.find(i=>i.id===selected);if(sel?.photoDraft&&Number.isFinite(sel.round))selectedStatus.textContent=sel.round===0?'Magic Ring selected':`R${sel.round} · ${defs.find(d=>d.id===sel.type)?.name||sel.type} · estimated`;else if(!sel)selectedStatus.textContent='Round chart · estimated draft';
  }
};
render();
