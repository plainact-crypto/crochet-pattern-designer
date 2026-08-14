// Publication-style PDF chart renderer. Loaded after export.js.
(function(){
  const NAMES={chain:'Chain / chain space',slip:'Slip Stitch',single:'Single Crochet',half:'Half Double Crochet',double:'Double Crochet',treble:'Treble Crochet',dtr:'Double Treble Crochet',picot:'Picot',puff:'Puff / Bobble',cluster:'Cluster',shell:'Shell / Fan',ring:'Magic Ring'};

  renderChartCanvas=function(){
    const b=chartBounds();if(!b)return null;
    const rawW=Math.max(1,b.maxX-b.minX),rawH=Math.max(1,b.maxY-b.minY),legendW=300,pad=44,head=92;
    const maxDiagram=1500,scale=Math.min(1.65,maxDiagram/Math.max(rawW,rawH));
    const diagramW=Math.max(520,Math.round(rawW*scale)),diagramH=Math.max(520,Math.round(rawH*scale));
    const canvas=document.createElement('canvas');canvas.width=diagramW+legendW+pad*3;canvas.height=Math.max(760,diagramH+head+pad*2);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fffdf9';ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle='#202938';ctx.font='700 28px Arial';ctx.fillText('CROCHET DIAGRAM',pad,42);ctx.font='14px Arial';ctx.fillStyle='#667085';ctx.fillText('Geometric stitch reconstruction · editable chart',pad,68);
    const ox=pad,oy=head;

    // Guides and round/row numbering.
    ctx.save();ctx.strokeStyle='#b8cde8';ctx.fillStyle='#2f6fae';ctx.lineWidth=1.5;ctx.setLineDash([7,6]);ctx.font='700 14px Arial';
    const squareRounds=[...new Set(items.filter(i=>i.photoGeometry==='square'&&i.round>0).map(i=>i.round))].sort((a,b)=>a-b);
    for(const rr of squareRounds){const g=items.filter(i=>i.photoGeometry==='square'&&i.round===rr);if(!g.length)continue;const ps=g.map(exportItemPx),minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x)),minY=Math.min(...ps.map(p=>p.y)),maxY=Math.max(...ps.map(p=>p.y));ctx.strokeRect(ox+(minX-b.minX)*scale,oy+(minY-b.minY)*scale,(maxX-minX)*scale,(maxY-minY)*scale);ctx.setLineDash([]);ctx.fillText(`R${rr}`,ox+(maxX-b.minX)*scale+9,oy+(minY-b.minY)*scale+18);ctx.setLineDash([7,6]);}

    const circleRounds=[...new Set(items.filter(i=>i.photoGeometry==='circle'&&i.round>0).map(i=>i.round))].sort((a,b)=>a-b),ring=items.find(i=>i.type==='ring');
    if(ring&&circleRounds.length){const cp=exportItemPx(ring);for(const rr of circleRounds){const g=items.filter(i=>i.photoGeometry==='circle'&&i.round===rr);if(!g.length)continue;const radius=g.reduce((a,it)=>{const p=exportItemPx(it);return a+Math.hypot(p.x-cp.x,p.y-cp.y)},0)/g.length;ctx.beginPath();ctx.arc(ox+(cp.x-b.minX)*scale,oy+(cp.y-b.minY)*scale,radius*scale,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillText(`R${rr}`,ox+(cp.x-b.minX+radius)*scale+8,oy+(cp.y-b.minY)*scale);ctx.setLineDash([7,6]);}}

    const rowGroups=[...new Set(items.filter(i=>(i.photoGeometry==='rows'||i.photoGeometry==='edging')&&Number.isFinite(i.row)).map(i=>i.row))].sort((a,b)=>a-b);
    for(const rr of rowGroups){const g=items.filter(i=>(i.photoGeometry==='rows'||i.photoGeometry==='edging')&&i.row===rr);if(!g.length)continue;const ps=g.map(exportItemPx),minX=Math.min(...ps.map(p=>p.x)),minY=Math.min(...ps.map(p=>p.y));ctx.setLineDash([]);ctx.fillText(`R${rr+1}`,ox+(minX-b.minX)*scale-34,oy+(minY-b.minY)*scale+5);ctx.setLineDash([7,6]);}
    ctx.restore();

    // Stitch symbols.
    for(const it of items){const p=exportItemPx(it);drawCrochetSymbol(ctx,it.type,ox+(p.x-b.minX)*scale,oy+(p.y-b.minY)*scale,(it.photoDraft?30:42)*scale,it.rotation||0);}

    // Legend panel.
    const lx=diagramW+pad*2,ly=head;ctx.fillStyle='#faf7f1';ctx.strokeStyle='#d6d0c6';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(lx,ly,legendW-30,Math.min(canvas.height-ly-pad,90+[...new Set(items.map(i=>i.type))].length*52),16);ctx.fill();ctx.stroke();
    ctx.fillStyle='#263238';ctx.font='700 20px Arial';ctx.fillText('LEGEND',lx+20,ly+34);
    const used=[...new Set(items.map(i=>i.type))];let yy=ly+70;for(const type of used){drawCrochetSymbol(ctx,type,lx+34,yy-5,28,0);ctx.fillStyle='#344054';ctx.font='14px Arial';ctx.fillText(NAMES[type]||type,lx+62,yy);yy+=50;}

    ctx.fillStyle='#667085';ctx.font='12px Arial';ctx.fillText('Estimated reconstruction from Photo Mode',pad,canvas.height-20);
    return canvas;
  };

  buildEnglishWrittenPattern=function(){
    if(!items.length)return 'No stitches on the board.';
    const photo=items.some(i=>i.photoDraft),square=items.some(i=>i.photoGeometry==='square'),circle=items.some(i=>i.photoGeometry==='circle'),edging=items.some(i=>i.photoGeometry==='edging');
    const lines=['CROCHET PATTERN',''];
    if(photo)lines.push('Construction type: Geometric stitch reconstruction from Photo Mode.','Stitch counts marked with ~ are estimated and should be checked before making the piece.','');
    if(square)lines.push('Geometry: Square motif worked from the centre outward.','Use each corner group as a 90° turning point with the shown chain space.','');
    else if(circle)lines.push('Geometry: Circular motif worked in rounds from the centre outward.','');
    else if(edging)lines.push('Geometry: Linear edging with repeated fan/arch units.','');
    const isRound=square||circle||items.some(i=>Number.isFinite(i.round)&&i.round>0);const groups=new Map();
    for(const it of items){if(it.type==='ring')continue;const key=isRound?(Number.isFinite(it.round)?it.round:(it.row||0)+1):(it.row||0)+1;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(it);}
    if(items.some(i=>i.type==='ring'))lines.push('Start: Magic Ring (MR).','');
    for(const [key,group] of [...groups.entries()].sort((a,b)=>a[0]-b[0])){const ordered=[...group].sort((a,b)=>(a.col||0)-(b.col||0)),label=square?'Square Round':(isRound?'Round':'Row'),mark=photo?'~':'';lines.push(`${label} ${key}: ${compressStitches(ordered.map(i=>i.type))}. (${mark}${ordered.length} sts/groups)`);}
    lines.push('','Legend:');for(const t of [...new Set(items.map(i=>i.type))])lines.push(`- ${stitchAbbr(t)} = ${NAMES[t]||t}`);
    lines.push('','Note: This diagram is a geometric reconstruction using suitable crochet stitch families. It is not claimed to be the exact original pattern unless imported from an exact written/chart source.');
    return lines.join('\n');
  };
  window.buildEnglishWrittenPattern=buildEnglishWrittenPattern;
})();
