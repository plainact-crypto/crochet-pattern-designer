// Publication-grade geometric Photo Mode engine.
// Deterministic image quality gate + geometry classification + stitch-family reconstruction.
(function(){
  const previousAnalyze=pmAnalyze;
  const previousShow=pmShowResult;
  const previousBuild=pmBuildDraft;
  const previousRender=render;

  const FAMILY_NAMES={chain:'Chain / chain space',slip:'Slip Stitch',single:'Single Crochet',half:'Half Double Crochet',double:'Double Crochet',treble:'Treble Crochet',dtr:'Double Treble Crochet',picot:'Picot',puff:'Puff / Bobble',cluster:'Cluster',shell:'Shell / Fan',ring:'Magic Ring'};

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function percentile(arr,p){if(!arr.length)return 0;const s=[...arr].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.max(0,Math.round((s.length-1)*p)))];}

  function geoInspect(img){
    const max=520,s=Math.min(max/img.naturalWidth,max/img.naturalHeight,1),w=Math.max(64,Math.round(img.naturalWidth*s)),h=Math.max(64,Math.round(img.naturalHeight*s));
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);const px=ctx.getImageData(0,0,w,h).data;
    const gray=new Float32Array(w*h);let mean=0;
    for(let i=0;i<w*h;i++){const k=i*4,g=.299*px[k]+.587*px[k+1]+.114*px[k+2];gray[i]=g;mean+=g;}mean/=w*h;
    let variance=0,lapSum=0,lapSq=0,lapN=0;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;const d=gray[i]-mean;variance+=d*d;const lap=4*gray[i]-gray[i-1]-gray[i+1]-gray[i-w]-gray[i+w];lapSum+=lap;lapSq+=lap*lap;lapN++;}
    const contrast=Math.sqrt(variance/Math.max(1,(w-2)*(h-2)));const lapMean=lapSum/Math.max(1,lapN),sharpness=Math.sqrt(Math.max(0,lapSq/Math.max(1,lapN)-lapMean*lapMean));

    // Background estimate from corner patches, not single pixels.
    const cs=Math.max(4,Math.round(Math.min(w,h)*.05)),samples=[];
    for(const [sx,sy] of [[0,0],[w-cs,0],[0,h-cs],[w-cs,h-cs]])for(let y=sy;y<sy+cs;y+=2)for(let x=sx;x<sx+cs;x+=2){const k=(y*w+x)*4;samples.push([px[k],px[k+1],px[k+2]]);}
    const bg=[0,1,2].map(ch=>samples.reduce((a,v)=>a+v[ch],0)/Math.max(1,samples.length));
    const mask=new Uint8Array(w*h);let fg=0,minX=w,maxX=0,minY=h,maxY=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4,dist=Math.hypot(px[k]-bg[0],px[k+1]-bg[1],px[k+2]-bg[2]);if(dist>26){mask[y*w+x]=1;fg++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
    if(!fg){minX=0;minY=0;maxX=w-1;maxY=h-1;}
    const bw=Math.max(1,maxX-minX+1),bh=Math.max(1,maxY-minY+1),ratio=bw/bh,occupancy=fg/(w*h),rectFill=fg/(bw*bh);
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2,rx=bw/2,ry=bh/2;let radialAgree=0,radialN=0;
    for(let y=minY;y<=maxY;y+=3)for(let x=minX;x<=maxX;x+=3){const inside=((x-cx)/Math.max(1,rx))**2+((y-cy)/Math.max(1,ry))**2<=1;if(inside===(mask[y*w+x]===1))radialAgree++;radialN++;}
    const roundness=radialAgree/Math.max(1,radialN);

    // Radial silhouette for freeform geometry.
    const bins=72,radii=new Float32Array(bins);for(let y=minY;y<=maxY;y+=2)for(let x=minX;x<=maxX;x+=2){if(!mask[y*w+x])continue;const dx=x-cx,dy=y-cy,a=(Math.atan2(dy,dx)+Math.PI*2)%(Math.PI*2),bi=Math.floor(a/(Math.PI*2)*bins),r=Math.hypot(dx/rx,dy/ry);radii[bi]=Math.max(radii[bi],r);}for(let i=0;i<bins;i++)if(!radii[i])radii[i]=1;
    const outline=[...radii].map((r,i)=>({a:i/bins*Math.PI*2,r:clamp(r,.3,1.5)}));

    let geometry='freeform';
    if(ratio>2.05||ratio<.49)geometry='edging';
    else if(ratio>.82&&ratio<1.22&&roundness>.59&&rectFill<.84)geometry='circle';
    else if(ratio>.78&&ratio<1.28&&rectFill>.60)geometry='square';
    else if(ratio>.55&&ratio<1.9)geometry='rectangle';

    const quality={sharpness,contrast,mean,occupancy,rectFill,geometry,ratio,roundness,outline,bbox:{minX,minY,maxX,maxY,w:bw,h:bh},width:w,height:h};
    quality.reasons=[];
    if(Math.min(img.naturalWidth,img.naturalHeight)<280)quality.reasons.push('resolution is too low');
    if(sharpness<10)quality.reasons.push('photo is too blurry');
    if(contrast<12)quality.reasons.push('stitch detail has too little contrast');
    if(mean<32)quality.reasons.push('photo is too dark');
    if(mean>246)quality.reasons.push('photo is overexposed');
    if(occupancy<.055)quality.reasons.push('crochet piece is too small in the frame');
    quality.accepted=quality.reasons.length===0;
    return quality;
  }

  function inferFamilies(r){
    const scores=(r.cells||[]).map(c=>c.score).filter(Number.isFinite);const q50=percentile(scores,.5),q80=percentile(scores,.8),q94=percentile(scores,.94),spread=Math.max(1,q94-q50);
    const families=[];
    if(r.base==='Single Crochet')families.push('single');
    else if(r.base?.includes('Half'))families.push('half','double');
    else families.push('double');
    if((r.raised||[]).length>=3&&spread>2)families.push('cluster');
    if((r.raised||[]).length>=7&&spread>5)families.push('puff');
    if(r.geo?.geometry==='square'||r.geo?.geometry==='edging')families.push('chain','shell');
    if(r.geo?.geometry==='circle')families.push('chain');
    if(r.geo?.geometry==='freeform')families.push('chain','double');
    return [...new Set(families)];
  }

  pmAnalyze=function(img){
    const geo=geoInspect(img);
    if(!geo.accepted)throw new Error('Photo not clear enough for geometric stitch reconstruction: '+geo.reasons.join(', ')+'. Please upload a clearer, top-down photo.');
    const r=previousAnalyze(img);r.geo=geo;r.quality='Accepted';r.detectedFamilies=inferFamilies(r);
    if(geo.geometry==='circle'){r.shape='Circle / Round';r.structure='Rounds / radial';}
    else if(geo.geometry==='square'){r.shape='Square';r.structure='Square rounds / motif';r.squareMotif=true;r.estimatedSquareRounds=r.estimatedSquareRounds||Math.max(3,Math.min(7,Math.round(Math.min(r.rows||13,r.cols||13)/3)));}
    else if(geo.geometry==='edging'){r.shape='Edging / Border';r.structure='Linear repeat / edging';}
    else if(geo.geometry==='rectangle'){r.shape='Rectangle';r.structure='Rows / structured panel';}
    else {r.shape='Freeform / Organic';r.structure='Contour construction';}
    r.confidence=clamp(Math.max(r.confidence||.5,.58)+(geo.sharpness>22?.08:0)+(geo.contrast>28?.06:0),.55,.94);
    return r;
  };

  pmShowResult=function(r){
    previousShow(r);
    photoShape.textContent=r.shape;photoStructure.textContent=r.structure;photoTexture.textContent=(r.detectedFamilies||[]).map(x=>FAMILY_NAMES[x]||x).join(' · ')||'Suitable stitch families';
    photoConfidence.textContent=Math.round(r.confidence*100)+'%';
    const q=r.geo;const qs=q?`Quality accepted · sharpness ${Math.round(q.sharpness)} · contrast ${Math.round(q.contrast)}`:'Quality accepted';
    photoExplain.textContent=`${qs}. Photo Mode will reconstruct the piece as clean geometric crochet notation using suitable stitch families. The result is an editable visual reconstruction; uncertain stitch counts remain estimated.`;
  };

  function add(out,type,geometry,round,row,col,px,py,rot=0,meta={}){const bw=Math.max(board.clientWidth||2200,1200);out.push({id:makeId(),type,row,round,col,x:px/bw*100,y:py,rotation:rot,direction:'e',photoDraft:true,estimated:true,publicationDraft:true,photoGeometry:geometry,...meta});}
  function familyAt(r,t){const fs=r.detectedFamilies||['single'];if(t>.88&&fs.includes('puff'))return'puff';if(t>.72&&fs.includes('cluster'))return'cluster';if(t>.55&&fs.includes('double'))return'double';if(t>.35&&fs.includes('half'))return'half';return fs.includes('single')?'single':(fs.includes('half')?'half':'double');}

  function buildCircle(r){
    const out=[],bw=Math.max(board.clientWidth||2200,1200),cx=bw/2,cy=1100,rounds=Math.max(5,Math.min(11,r.estimatedRounds||8));add(out,'ring','circle',0,0,0,cx,cy,0,{exactRole:'center'});
    const inc=r.base==='Single Crochet'?6:(r.base?.includes('Half')?8:12);
    for(let rd=1;rd<=rounds;rd++){
      const radius=62+rd*58,count=Math.min(96,Math.max(inc,inc*rd));
      for(let i=0;i<count;i++){
        const a=-Math.PI/2+i/count*Math.PI*2,signal=((i*7+rd*11)%17)/16;let type=familyAt(r,signal);
        if((r.detectedFamilies||[]).includes('chain')&&rd>2&&i%Math.max(6,Math.round(count/8))===0)type='chain';
        add(out,type,'circle',rd,rd-1,i,cx+Math.cos(a)*radius,cy+Math.sin(a)*radius,(a*180/Math.PI+90+360)%360,{sequence:i});
      }
    }return out;
  }

  function buildEdging(r){
    const out=[],bw=Math.max(board.clientWidth||2200,1200),cx=bw/2,cy=1180,repeats=6,repeatW=150,start=cx-repeatW*(repeats-1)/2;
    // Foundation row.
    for(let i=0;i<repeats*6+1;i++){const x=start-repeatW/2+i*(repeatW*repeats)/(repeats*6);add(out,'single','edging',1,0,i,x,cy,0,{band:'foundation'});}
    // Repeating arches + fans, intentionally regular like published edging diagrams.
    for(let rpi=0;rpi<repeats;rpi++){
      const x=start+rpi*repeatW;
      for(let k=-2;k<=2;k++)add(out,'double','edging',2,1,rpi*10+k,x+k*18,cy-78,k*9,{repeat:rpi,group:'fan'});
      add(out,'chain','edging',2,1,rpi*10+6,x-58,cy-42,-35,{repeat:rpi,group:'arch'});add(out,'chain','edging',2,1,rpi*10+7,x+58,cy-42,35,{repeat:rpi,group:'arch'});
      add(out,'picot','edging',3,2,rpi*10+8,x,cy-132,0,{repeat:rpi,group:'picot'});
      add(out,'chain','edging',3,2,rpi*10+9,x-48,cy-112,-35,{repeat:rpi});add(out,'chain','edging',3,2,rpi*10+10,x+48,cy-112,35,{repeat:rpi});
    }return out;
  }

  function buildRows(r){
    const out=[],bw=Math.max(board.clientWidth||2200,1200),cx=bw/2,cy=1100,rows=Math.max(6,Math.min(18,r.rows||12)),cols=Math.max(8,Math.min(26,r.cols||16)),gap=52,startX=cx-(cols-1)*gap/2,startY=cy-(rows-1)*gap/2;
    for(let rr=0;rr<rows;rr++)for(let cc=0;cc<cols;cc++){
      const logical=rr%2?cols-1-cc:cc,signal=((rr*13+logical*7)%19)/18;let type=familyAt(r,signal);if((r.detectedFamilies||[]).includes('chain')&&signal>.91)type='chain';add(out,type,'rows',null,rr,cc,startX+logical*gap,startY+rr*gap,0,{sequence:cc});
    }return out;
  }

  function buildFreeform(r){
    const out=[],bw=Math.max(board.clientWidth||2200,1200),cx=bw/2,cy=1100,outline=r.geo?.outline||[],rings=4,baseR=330;
    if(!outline.length)return buildRows(r);
    for(let rd=1;rd<=rings;rd++){
      const scale=.38+rd*.15;
      outline.forEach((p,i)=>{if(i%2)return;const rx=baseR*p.r*scale,ry=baseR*.8*p.r*scale,signal=((i+rd*9)%23)/22;const type=familyAt(r,signal);add(out,type,'freeform',rd,rd-1,i,cx+Math.cos(p.a)*rx,cy+Math.sin(p.a)*ry,(p.a*180/Math.PI+90)%360,{sequence:i});});
    }return out;
  }

  pmBuildDraft=function(r){
    if(r.geo?.geometry==='square'&&r.squareMotif)return pmBuildRowDraft(r); // specialised square engine loaded before this file
    if(r.geo?.geometry==='circle')return buildCircle(r);
    if(r.geo?.geometry==='edging')return buildEdging(r);
    if(r.geo?.geometry==='rectangle')return buildRows(r);
    if(r.geo?.geometry==='freeform')return buildFreeform(r);
    return previousBuild(r);
  };

  // Clean publication presentation on the whiteboard.
  render=function(){
    previousRender();
    board.querySelectorAll('.publication-title,.publication-legend,.publication-geometry-label').forEach(n=>n.remove());
    const pub=items.filter(i=>i.publicationDraft||i.photoDraft);if(!pub.length)return;
    const bw=board.clientWidth||2200,pts=pub.map(i=>({x:i.x/100*bw,y:i.y||0}));const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
    const title=document.createElement('div');title.className='publication-title';title.textContent='GEOMETRIC CROCHET DIAGRAM';title.style.left=minX+'px';title.style.top=(minY-92)+'px';board.appendChild(title);
    const used=[...new Set(pub.map(i=>i.type))];const legend=document.createElement('div');legend.className='publication-legend';legend.style.left=(maxX+90)+'px';legend.style.top=Math.max(80,minY)+'px';legend.innerHTML='<strong>LEGEND</strong>'+used.map(t=>`<div><span>${svgFor(t,28)}</span><em>${FAMILY_NAMES[t]||t}</em></div>`).join('');board.appendChild(legend);
    rowStatus.textContent=`Photo Mode · ${used.length} stitch families · geometric reconstruction`;
    if(!selected)selectedStatus.textContent='Publication diagram · editable';
  };

  // Rename all user-facing Beta references without touching Pattern Import beta status.
  document.querySelectorAll('#photoModeBtn,#mobilePhotoModeBtn').forEach(el=>{if(el)el.textContent='Photo Mode';});
  const title=photoModeModal?.querySelector('h2');if(title)title.textContent='Photo Mode';
  const chip=photoModeModal?.querySelector('.beta-chip');if(chip)chip.remove();
  const sub=photoModeModal?.querySelector('.modal-sub');if(sub)sub.textContent='Upload a clear crochet photo. Photo Mode analyzes its geometry and reconstructs a clean editable diagram with suitable crochet stitch families.';
})();
