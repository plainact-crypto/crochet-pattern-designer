const exportPdfBtn=document.getElementById('exportPdfBtn');
const mobileExportPdfBtn=document.getElementById('mobileExportPdfBtn');
const quickExportPdfBtn=document.getElementById('quickExportPdfBtn');

function stitchAbbr(type){return ({chain:'ch',slip:'sl st',single:'sc',half:'hdc',double:'dc',treble:'tr',dtr:'dtr',picot:'picot',puff:'puff',cluster:'cl',shell:'shell',ring:'MR'})[type]||type;}
function compressStitches(list){
  if(!list.length)return '';
  const out=[];let last=list[0],count=1;
  const flush=()=>{out.push((count>1?count+' ':'')+stitchAbbr(last));};
  for(let i=1;i<list.length;i++){
    if(list[i]===last)count++;
    else{flush();last=list[i];count=1;}
  }
  flush();return out.join(', ');
}
function buildEnglishWrittenPattern(){
  if(!items.length)return 'No stitches on the board.';
  const squareMotif=items.some(i=>i.photoDraft&&i.photoGeometry==='square'&&Number.isFinite(i.round));
  const photoRound=items.some(i=>i.photoDraft&&Number.isFinite(i.round)&&i.round>0);
  const writtenRound=items.some(i=>i.writtenDraft&&Number.isFinite(i.round)&&i.round>0);
  const isRound=photoRound||writtenRound;
  const groups=new Map();
  for(const it of items){
    if(it.type==='ring')continue;
    const key=isRound?(Number.isFinite(it.round)?it.round:it.row+1):(it.row+1);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(it);
  }
  const lines=[];
  lines.push(squareMotif?'Crochet Pattern - Square Motif Construction':(isRound?'Crochet Pattern - Round Construction':'Crochet Pattern - Row Construction'),'');
  if(items.some(i=>i.type==='ring'))lines.push('Start with a Magic Ring (MR).','');
  for(const [key,group] of [...groups.entries()].sort((a,b)=>a[0]-b[0])){
    const ordered=[...group].sort((a,b)=>a.col-b.col);
    const label=squareMotif?'Square Round':(isRound?'Round':'Row');
    lines.push(`${label} ${key}: ${compressStitches(ordered.map(i=>i.type))}. (${ordered.length} sts/groups)`);
  }
  lines.push('','Notes:','- This is an editable reconstructed pattern generated from the current chart.','- Estimated stitch counts and stitch families should be reviewed before crocheting.');
  return lines.join('\n');
}

function exportItemPx(it){
  const bw=board.clientWidth||2200;
  return{x:(it.x/100)*bw,y:it.y||0};
}
function chartBounds(){
  const pts=items.map(exportItemPx);if(!pts.length)return null;
  const pad=70;
  return{minX:Math.min(...pts.map(p=>p.x))-pad,maxX:Math.max(...pts.map(p=>p.x))+pad,minY:Math.min(...pts.map(p=>p.y))-pad,maxY:Math.max(...pts.map(p=>p.y))+pad};
}
function drawLine(ctx,x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function drawCrochetSymbol(ctx,type,x,y,size,rotation=0){
  ctx.save();ctx.translate(x,y);ctx.rotate((rotation||0)*Math.PI/180);ctx.strokeStyle='#161616';ctx.fillStyle='#161616';ctx.lineWidth=Math.max(1.5,size/16);ctx.lineCap='round';ctx.lineJoin='round';
  const s=size,h=s/2;
  if(type==='chain'){ctx.beginPath();ctx.ellipse(0,0,s*.34,s*.14,0,0,Math.PI*2);ctx.stroke();}
  else if(type==='slip'){ctx.beginPath();ctx.arc(0,0,s*.1,0,Math.PI*2);ctx.fill();}
  else if(type==='single'){drawLine(ctx,-s*.25,-s*.25,s*.25,s*.25);drawLine(ctx,s*.25,-s*.25,-s*.25,s*.25);}
  else if(type==='half'){drawLine(ctx,0,-s*.4,0,s*.4);drawLine(ctx,-s*.23,-s*.15,s*.23,-s*.15);}
  else if(type==='double'){drawLine(ctx,0,-s*.42,0,s*.42);drawLine(ctx,-s*.23,-s*.2,s*.23,-s*.2);drawLine(ctx,-s*.2,s*.05,s*.2,-s*.1);}
  else if(type==='treble'||type==='dtr'){drawLine(ctx,0,-s*.44,0,s*.44);drawLine(ctx,-s*.23,-s*.23,s*.23,-s*.23);const n=type==='dtr'?3:2;for(let k=0;k<n;k++){const yy=-s*.02+k*s*.15;drawLine(ctx,-s*.2,yy+s*.08,s*.2,yy-s*.08);}}
  else if(type==='ring'){ctx.beginPath();ctx.arc(0,0,s*.3,0,Math.PI*2);ctx.stroke();}
  else if(type==='picot'){ctx.beginPath();ctx.arc(0,-s*.2,s*.12,0,Math.PI*2);ctx.stroke();drawLine(ctx,0,-s*.08,0,s*.38);}
  else if(type==='puff'||type==='cluster'||type==='shell'){
    const count=type==='shell'?5:(type==='puff'?5:3);
    for(let k=0;k<count;k++){const spread=(k-(count-1)/2)*s*.12;ctx.beginPath();ctx.moveTo(0,s*.35);ctx.quadraticCurveTo(spread,-s*.05,spread,-s*.34);ctx.stroke();}
    if(type==='cluster'){ctx.beginPath();ctx.arc(0,-s*.34,s*.05,0,Math.PI*2);ctx.fill();}
  }else{drawLine(ctx,-h*.35,0,h*.35,0);}
  ctx.restore();
}
function renderChartCanvas(){
  const b=chartBounds();if(!b)return null;
  const rawW=Math.max(1,b.maxX-b.minX),rawH=Math.max(1,b.maxY-b.minY);
  const maxDim=1800,scale=Math.min(1.8,maxDim/Math.max(rawW,rawH));
  const canvas=document.createElement('canvas');canvas.width=Math.max(400,Math.round(rawW*scale));canvas.height=Math.max(400,Math.round(rawH*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  // subtle grid
  ctx.strokeStyle='#eef1f4';ctx.lineWidth=1;const grid=24*scale;for(let x=0;x<canvas.width;x+=grid)drawLine(ctx,x,0,x,canvas.height);for(let y=0;y<canvas.height;y+=grid)drawLine(ctx,0,y,canvas.width,y);
  // square/round guide geometry when available
  const squareRounds=[...new Set(items.filter(i=>i.photoGeometry==='square'&&i.round>0).map(i=>i.round))];
  ctx.strokeStyle='#b9d5fb';ctx.setLineDash([7,6]);
  for(const rr of squareRounds){const g=items.filter(i=>i.photoGeometry==='square'&&i.round===rr);if(!g.length)continue;const ps=g.map(exportItemPx);const minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x)),minY=Math.min(...ps.map(p=>p.y)),maxY=Math.max(...ps.map(p=>p.y));ctx.strokeRect((minX-b.minX)*scale,(minY-b.minY)*scale,(maxX-minX)*scale,(maxY-minY)*scale);}
  const circleRounds=[...new Set(items.filter(i=>i.photoDraft&&i.photoGeometry!=='square'&&i.round>0).map(i=>i.round))];
  const ring=items.find(i=>i.type==='ring');if(ring&&circleRounds.length){const cp=exportItemPx(ring);for(const rr of circleRounds){const g=items.filter(i=>i.round===rr&&i.photoGeometry!=='square');if(!g.length)continue;const r=g.reduce((a,it)=>{const p=exportItemPx(it);return a+Math.hypot(p.x-cp.x,p.y-cp.y)},0)/g.length;ctx.beginPath();ctx.arc((cp.x-b.minX)*scale,(cp.y-b.minY)*scale,r*scale,0,Math.PI*2);ctx.stroke();}}
  ctx.setLineDash([]);
  for(const it of items){const p=exportItemPx(it);drawCrochetSymbol(ctx,it.type,(p.x-b.minX)*scale,(p.y-b.minY)*scale,(it.photoDraft?28:40)*scale,it.rotation||0);}
  return canvas;
}

async function exportPatternPdf(){
  if(!items.length){alert('There is no pattern to export yet.');return;}
  try{
    const {jsPDF}=await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm');
    const doc=new jsPDF({unit:'pt',format:'a4'});
    const margin=44,pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
    doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('Crochet Pattern Report',margin,52);
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text('Generated by Crochet CAD',margin,70);

    const chart=renderChartCanvas();
    if(chart){
      const maxW=pageW-margin*2,maxH=pageH-150;
      const fit=Math.min(maxW/chart.width,maxH/chart.height);
      const w=chart.width*fit,h=chart.height*fit,x=(pageW-w)/2,y=92;
      doc.addImage(chart.toDataURL('image/png'),'PNG',x,y,w,h,undefined,'FAST');
      doc.setFontSize(9);doc.text('Editable chart reconstruction',margin,pageH-34);
    }

    doc.addPage();
    doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('Written Pattern',margin,52);
    doc.setFont('helvetica','normal');doc.setFontSize(10.5);
    const lines=doc.splitTextToSize(buildEnglishWrittenPattern(),pageW-margin*2);
    let y=78;
    for(const line of lines){if(y>pageH-48){doc.addPage();y=50;}doc.text(line,margin,y);y+=14;}
    doc.save('crochet-pattern-report.pdf');
  }catch(err){console.error(err);alert('Could not create PDF. Please check your connection and try again.');}
}
exportPdfBtn?.addEventListener('click',exportPatternPdf);
mobileExportPdfBtn?.addEventListener('click',exportPatternPdf);
quickExportPdfBtn?.addEventListener('click',exportPatternPdf);
window.buildEnglishWrittenPattern=buildEnglishWrittenPattern;
window.exportPatternPdf=exportPatternPdf;
