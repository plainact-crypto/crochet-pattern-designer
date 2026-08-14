const photoModeBtn=document.getElementById('photoModeBtn');
const mobilePhotoModeBtn=document.getElementById('mobilePhotoModeBtn');
const photoModeModal=document.getElementById('photoModeModal');
const photoModeFile=document.getElementById('photoModeFile');
const photoAnalyzeBtn=document.getElementById('photoAnalyzeBtn');
const photoPreview=document.getElementById('photoPreview');
const photoEmpty=document.getElementById('photoEmpty');
const photoResults=document.getElementById('photoResults');
const photoShape=document.getElementById('photoShape');
const photoStructure=document.getElementById('photoStructure');
const photoBase=document.getElementById('photoBase');
const photoTexture=document.getElementById('photoTexture');
const photoBorder=document.getElementById('photoBorder');
const photoConfidence=document.getElementById('photoConfidence');
const photoExplain=document.getElementById('photoExplain');
const photoImportDraftBtn=document.getElementById('photoImportDraftBtn');
const photoMessage=document.getElementById('photoMessage');
const photoClose=document.querySelector('[data-photo-close]');
let photoImage=null;
let photoAnalysis=null;

function openPhotoMode(){photoModeModal.hidden=false;document.body.style.overflow='hidden';photoMessage.textContent=''}
function closePhotoMode(){photoModeModal.hidden=true;document.body.style.overflow=''}
photoModeBtn?.addEventListener('click',openPhotoMode);
mobilePhotoModeBtn?.addEventListener('click',openPhotoMode);
photoClose?.addEventListener('click',closePhotoMode);
photoModeModal?.addEventListener('click',e=>{if(e.target===photoModeModal)closePhotoMode()});

photoModeFile?.addEventListener('change',async()=>{
  const file=photoModeFile.files?.[0];if(!file)return;
  photoMessage.textContent='Loading photo...';photoImportDraftBtn.disabled=true;photoResults.hidden=true;
  try{photoImage=await pmLoadImage(file);pmDrawPreview(photoImage);photoAnalyzeBtn.disabled=false;photoMessage.textContent='Ready to analyze.'}catch(err){photoMessage.textContent=err.message||'Could not load photo.';photoAnalyzeBtn.disabled=true}
});

photoAnalyzeBtn?.addEventListener('click',()=>{
  if(!photoImage)return;
  photoAnalyzeBtn.disabled=true;photoMessage.textContent='Analyzing texture and repeat structure...';
  setTimeout(()=>{try{photoAnalysis=pmAnalyze(photoImage);pmShowResult(photoAnalysis);photoImportDraftBtn.disabled=false;photoMessage.textContent='Draft suggestion ready.'}catch(err){photoMessage.textContent=err.message||'Analysis failed.'}finally{photoAnalyzeBtn.disabled=false}},30);
});

photoImportDraftBtn?.addEventListener('click',()=>{
  if(!photoAnalysis)return;
  if(items.length&&!confirm('Replace the current board with this Photo Mode draft?'))return;
  snapshot();
  items=pmBuildDraft(photoAnalysis);
  currentRow=0;currentCol=items.length;selected=items.at(-1)?.id||null;placementRotation=0;applyZoom(.8);render();
  selectedStatus.textContent='Photo Mode Beta draft imported';
  closePhotoMode();
});

function pmLoadImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Invalid image file.'))};img.src=url})}
function pmDrawPreview(img){const maxW=700,maxH=430,s=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight,1);photoPreview.width=Math.round(img.naturalWidth*s);photoPreview.height=Math.round(img.naturalHeight*s);photoPreview.getContext('2d').drawImage(img,0,0,photoPreview.width,photoPreview.height);photoPreview.style.display='block';photoEmpty.style.display='none'}

function pmAnalyze(img){
  const max=560,s=Math.min(max/img.naturalWidth,max/img.naturalHeight,1),w=Math.max(80,Math.round(img.naturalWidth*s)),h=Math.max(80,Math.round(img.naturalHeight*s));
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);const id=ctx.getImageData(0,0,w,h),d=id.data;
  const bg=pmCornerColor(d,w,h);const mask=new Uint8Array(w*h);let fg=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,dist=Math.hypot(d[i]-bg[0],d[i+1]-bg[1],d[i+2]-bg[2]);if(dist>30){mask[y*w+x]=1;fg++}}
  let box=pmLargestComponent(mask,w,h);if(!box||box.area<fg*.12)box={x:0,y:0,w,h,area:fg};
  const pad=3;box={x:Math.max(0,box.x-pad),y:Math.max(0,box.y-pad),w:Math.min(w-box.x+pad,box.w+pad*2),h:Math.min(h-box.y+pad,box.h+pad*2),area:box.area};
  const ratio=box.w/Math.max(1,box.h),cornerFill=pmCornerFill(mask,w,h,box),roundness=pmRadialRoundness(mask,w,h,box);
  let shape='Rounded / Organic';
  if(ratio>1.35||ratio<.74)shape='Rectangle';
  else if(ratio>.82&&ratio<1.22){
    if(cornerFill<.34&&roundness>.56)shape='Circle / Round';
    else shape='Square';
  }

  let gx=0,gy=0,variance=0,mean=0,n=0;const gray=new Float32Array(w*h);
  for(let y=box.y;y<Math.min(h,box.y+box.h);y++)for(let x=box.x;x<Math.min(w,box.x+box.w);x++){const p=y*w+x,i=p*4;if(!mask[p])continue;const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];gray[p]=g;mean+=g;n++}
  mean/=Math.max(1,n);
  for(let y=Math.max(1,box.y+1);y<Math.min(h-1,box.y+box.h-1);y++)for(let x=Math.max(1,box.x+1);x<Math.min(w-1,box.x+box.w-1);x++){const p=y*w+x;if(!mask[p])continue;const sx=(gray[p+1]-gray[p-1]),sy=(gray[p+w]-gray[p-w]);gx+=Math.abs(sx);gy+=Math.abs(sy);variance+=(gray[p]-mean)*(gray[p]-mean)}
  variance=Math.sqrt(variance/Math.max(1,n));const anis=(gx+gy)?Math.abs(gx-gy)/(gx+gy):0;
  const structure=shape==='Circle / Round'?'Rounds / radial':((shape==='Rounded / Organic'&&anis<.08)?'Rounds / radial likely':'Rows likely');

  const compact=Math.max(0,Math.min(1,(mean-45)/150));const openness=Math.max(0,Math.min(1,variance/75));
  let base='Single Crochet / Half Double';if(compact>.68&&openness>.55)base='Half Double / Double Crochet';if(compact<.42)base='Single Crochet';

  const detailRows=13,detailCols=Math.max(11,Math.round(detailRows*ratio));
  const cells=pmTextureGrid(gray,mask,w,h,box,detailRows,detailCols);
  const avg=cells.reduce((a,b)=>a+b.score,0)/Math.max(1,cells.length);
  const sd=Math.sqrt(cells.reduce((a,b)=>a+(b.score-avg)**2,0)/Math.max(1,cells.length));
  const raised=pmPickTexturePeaks(cells,detailRows,detailCols,avg+sd*.62,20);
  const texture=raised.length>=3?'Puff / Bobble / Cluster':'Textured stitch not clear';
  const borderScore=pmBorderScore(gray,mask,w,h,box);const border=borderScore>.13?'Detected':'Possible / weak';
  const estimatedRounds=shape==='Circle / Round'?pmEstimateRounds(gray,mask,w,h,box):0;
  const confidence=Math.max(.38,Math.min(.9,.44+(Math.min(1,box.area/(w*h*.45))*.16)+(shape==='Circle / Round'?Math.min(.15,roundness*.15):anis*.13)+(raised.length?Math.min(.12,raised.length*.008):0)+(borderScore>.13?.08:0)));
  return{shape,structure,base,texture,border,confidence,box:{...box,wCanvas:w,hCanvas:h},raised,cells,rows:detailRows,cols:detailCols,cornerFill,roundness,estimatedRounds};
}

function pmCornerColor(d,w,h){const pts=[[2,2],[w-3,2],[2,h-3],[w-3,h-3]],sum=[0,0,0];for(const [x,y] of pts){const i=(y*w+x)*4;sum[0]+=d[i];sum[1]+=d[i+1];sum[2]+=d[i+2]}return sum.map(v=>v/pts.length)}
function pmLargestComponent(mask,w,h){const seen=new Uint8Array(mask.length),stack=[],out=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const idx=y*w+x;if(!mask[idx]||seen[idx])continue;stack.push(idx);seen[idx]=1;let minx=x,maxx=x,miny=y,maxy=y,area=0;while(stack.length){const p=stack.pop(),px=p%w,py=(p/w)|0;area++;minx=Math.min(minx,px);maxx=Math.max(maxx,px);miny=Math.min(miny,py);maxy=Math.max(maxy,py);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const ni=ny*w+nx;if(mask[ni]&&!seen[ni]){seen[ni]=1;stack.push(ni)}}}out.push({x:minx,y:miny,w:maxx-minx+1,h:maxy-miny+1,area})}return out.sort((a,b)=>b.area-a.area)[0]||null}
function pmCornerFill(mask,w,h,b){const pw=Math.max(4,Math.round(b.w*.18)),ph=Math.max(4,Math.round(b.h*.18));const pts=[[b.x,b.y],[b.x+b.w-pw,b.y],[b.x,b.y+b.h-ph],[b.x+b.w-pw,b.y+b.h-ph]];let on=0,total=0;for(const [sx,sy] of pts){for(let y=Math.max(0,sy);y<Math.min(h,sy+ph);y+=2)for(let x=Math.max(0,sx);x<Math.min(w,sx+pw);x+=2){total++;if(mask[y*w+x])on++}}return total?on/total:1}
function pmRadialRoundness(mask,w,h,b){const cx=b.x+b.w/2,cy=b.y+b.h/2,rx=b.w/2,ry=b.h/2;let agree=0,total=0;for(let y=b.y;y<b.y+b.h;y+=3)for(let x=b.x;x<b.x+b.w;x+=3){const nx=(x-cx)/Math.max(1,rx),ny=(y-cy)/Math.max(1,ry),inside=(nx*nx+ny*ny)<=1,p=mask[y*w+x]===1;if((inside&&p)||(!inside&&!p))agree++;total++}return total?agree/total:0}
function pmEstimateRounds(gray,mask,w,h,b){const cx=b.x+b.w/2,cy=b.y+b.h/2,maxR=Math.min(b.w,b.h)*.48,bins=48,sum=new Float32Array(bins),cnt=new Uint32Array(bins);for(let y=b.y;y<b.y+b.h;y+=2)for(let x=b.x;x<b.x+b.w;x+=2){const p=y*w+x;if(!mask[p])continue;const r=Math.hypot(x-cx,y-cy);if(r>maxR)continue;const bi=Math.min(bins-1,Math.floor(r/maxR*bins));sum[bi]+=255-gray[p];cnt[bi]++}const prof=[];for(let i=0;i<bins;i++)prof.push(cnt[i]?sum[i]/cnt[i]:0);let peaks=0;for(let i=2;i<bins-2;i++){const v=prof[i],neigh=(prof[i-2]+prof[i-1]+prof[i+1]+prof[i+2])/4;if(v>neigh+3)peaks++}return Math.max(5,Math.min(10,peaks||7))}
function pmTextureGrid(gray,mask,w,h,b,rows,cols){const cells=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x1=Math.round(b.x+c*b.w/cols),x2=Math.round(b.x+(c+1)*b.w/cols),y1=Math.round(b.y+r*b.h/rows),y2=Math.round(b.y+(r+1)*b.h/rows);let sum=0,sum2=0,n=0;for(let y=y1;y<y2;y+=2)for(let x=x1;x<x2;x+=2){const p=y*w+x;if(!mask[p])continue;const g=gray[p];sum+=g;sum2+=g*g;n++}const m=n?sum/n:0,v=n?Math.sqrt(Math.max(0,sum2/n-m*m)):0;cells.push({row:r,col:c,score:v+(255-m)*.12})}return cells}
function pmPickTexturePeaks(cells,rows,cols,threshold,limit){const by=new Map(cells.map(v=>[`${v.row}:${v.col}`,v]));const peaks=[];for(const cell of cells){if(cell.score<threshold)continue;let local=true;for(let dr=-1;dr<=1&&local;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const n=by.get(`${cell.row+dr}:${cell.col+dc}`);if(n&&n.score>cell.score){local=false;break}}if(local)peaks.push(cell)}return peaks.sort((a,b)=>b.score-a.score).slice(0,limit).sort((a,b)=>a.row-b.row||a.col-b.col)}
function pmBorderScore(gray,mask,w,h,b){const band=Math.max(2,Math.round(Math.min(b.w,b.h)*.07));let edge=0,inner=0,ne=0,ni=0;for(let y=b.y;y<b.y+b.h;y+=2)for(let x=b.x;x<b.x+b.w;x+=2){const p=y*w+x;if(!mask[p])continue;const dist=Math.min(x-b.x,b.x+b.w-1-x,y-b.y,b.y+b.h-1-y);const val=255-gray[p];if(dist<band){edge+=val;ne++}else if(dist>band*2){inner+=val;ni++}}if(!ne||!ni)return 0;return Math.max(0,Math.min(1,Math.abs(edge/ne-inner/ni)/90))}

function pmShowResult(r){photoShape.textContent=r.shape;photoStructure.textContent=r.structure;photoBase.textContent=r.base;photoTexture.textContent=r.texture;photoBorder.textContent=r.border;photoConfidence.textContent=Math.round(r.confidence*100)+'%';photoResults.hidden=false;const raised=r.raised.length;const extra=r.shape==='Circle / Round'?` Estimated ${r.estimatedRounds} working rounds.`:` ${raised?`Found ${raised} distinct repeating texture peaks.`:'No strong repeating raised areas were found.'}`;photoExplain.textContent=`Detected a ${r.shape.toLowerCase()} piece with ${r.structure.toLowerCase()}.${extra} The draft is an editable reconstruction, not an exact original pattern.`}

function pmBuildDraft(r){
  if(r.structure.startsWith('Rounds'))return pmBuildRoundDraft(r);
  return pmBuildRowDraft(r);
}

function pmBuildRoundDraft(r){
  const out=[],baseType=r.base==='Single Crochet'?'single':(r.base.includes('Half')?'half':'double');
  const rounds=Math.max(5,Math.min(9,r.estimatedRounds||7));
  const centerX=50,centerY=355,minRadius=34,maxRadius=255;
  out.push({id:makeId(),type:'ring',row:0,col:0,x:centerX,y:centerY,rotation:0,direction:'e',photoDraft:true});
  for(let rr=1;rr<=rounds;rr++){
    const radius=minRadius+(rr-1)*(maxRadius-minRadius)/Math.max(1,rounds-1);
    const count=Math.min(54,Math.max(6,6*rr));
    const xRadiusPct=(radius/Math.max(board.clientWidth,360))*100;
    for(let i=0;i<count;i++){
      const a=-Math.PI/2+(i/count)*Math.PI*2;
      const x=centerX+Math.cos(a)*xRadiusPct;
      const y=centerY+Math.sin(a)*radius;
      const rotation=((a*180/Math.PI)+90+360)%360;
      out.push({id:makeId(),type:baseType,row:rr,col:i,x:Math.max(4,Math.min(96,x)),y:Math.max(55,y),rotation,direction:'e',photoDraft:true,round:rr});
    }
  }
  return out;
}

function pmBuildRowDraft(r){
  const out=[],rows=r.rows,cols=r.cols;
  const baseType=r.base==='Single Crochet'?'single':(r.base.includes('Half')?'half':'double');
  const textureType=r.texture.startsWith('Puff')?'puff':'cluster';
  const left=10,right=90,top=90,rowGap=48;
  const raisedSet=new Set(r.raised.map(v=>`${v.row}:${v.col}`));
  for(let rr=0;rr<rows;rr++){
    const reverse=rr%2===1;
    for(let cc=0;cc<cols;cc++){
      const logical=reverse?cols-1-cc:cc;
      const x=cols===1?50:left+(logical*(right-left)/(cols-1));
      const y=top+rr*rowGap;
      const type=raisedSet.has(`${rr}:${logical}`)?textureType:baseType;
      out.push({id:makeId(),type,row:rr,col:cc,x,y,rotation:0,direction:reverse?'w':'e',photoDraft:true});
    }
  }
  if(r.border==='Detected'){
    const bxL=6,bxR=94,byT=top-42,byB=top+(rows-1)*rowGap+42;
    const edgeCount=Math.max(cols,rows)+2;
    for(let i=0;i<edgeCount;i++){
      const t=edgeCount===1?0:i/(edgeCount-1),x=bxL+t*(bxR-bxL),y=byT+t*(byB-byT);
      out.push({id:makeId(),type:'single',row:rows,col:i,x,y:byT,rotation:90,direction:'e',photoDraft:true});
      out.push({id:makeId(),type:'single',row:rows+1,col:i,x,y:byB,rotation:90,direction:'w',photoDraft:true});
      if(i>0&&i<edgeCount-1){
        out.push({id:makeId(),type:'single',row:rows+2,col:i,x:bxL,y,rotation:0,direction:'s',photoDraft:true});
        out.push({id:makeId(),type:'single',row:rows+3,col:i,x:bxR,y,rotation:0,direction:'n',photoDraft:true});
      }
    }
  }
  return out;
}
