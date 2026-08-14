// Presentation for square/rectangle Photo Mode drafts.
const squarePhotoBaseRender=render;
render=function(){
  squarePhotoBaseRender();
  board.querySelectorAll('.photo-row-label').forEach(n=>n.remove());
  const photoItems=items.filter(i=>i.photoDraft && !Number.isFinite(i.round));
  if(!photoItems.length)return;
  const rows=[...new Set(photoItems.map(i=>i.row))].sort((a,b)=>a-b);
  const bw=board.clientWidth||2200;
  for(const rr of rows){
    const group=photoItems.filter(i=>i.row===rr);
    if(!group.length)continue;
    const minPx=Math.min(...group.map(i=>(i.x/100)*bw));
    const y=group.reduce((s,i)=>s+i.y,0)/group.length;
    const label=document.createElement('div');
    label.className='photo-row-label';
    label.style.left=(minPx-76)+'px';
    label.style.top=(y-10)+'px';
    label.textContent=`R${rr+1} · ~${group.length} sts`;
    board.appendChild(label);
  }
  rowStatus.textContent=`Photo Draft · ${rows.length} rows · ~${photoItems.length} estimated sts`;
  const sel=items.find(i=>i.id===selected);
  if(sel?.photoDraft&&!Number.isFinite(sel.round)) selectedStatus.textContent=`Row ${sel.row+1} · ${defs.find(d=>d.id===sel.type)?.name||sel.type}`;
};
render();
