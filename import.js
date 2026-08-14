const importImageBtn=document.getElementById('importImageBtn');
const mobileImportImageBtn=document.getElementById('mobileImportImageBtn');
const importModal=document.getElementById('importModal');
const importFile=document.getElementById('importFile');
const analyzeImportBtn=document.getElementById('analyzeImportBtn');
const importPreview=document.getElementById('importPreview');
const importEmpty=document.getElementById('importEmpty');
const importStats=document.getElementById('importStats');
const importMessage=document.getElementById('importMessage');
const importClose=document.querySelector('[data-import-close]');
let importImage=null;
let detectedCrop=null;
let templateCache=null;

function openImport(){importModal.hidden=false;document.body.style.overflow='hidden';importMessage.textContent=''}
function closeImport(){importModal.hidden=true;document.body.style.overflow=''}
importImageBtn?.addEventListener('click',openImport);
mobileImportImageBtn?.addEventListener('click',openImport);
importClose?.addEventListener('click',closeImport);
importModal?.addEventListener('click',e=>{if(e.target===importModal)closeImport()});

importFile?.addEventListener('change',async()=>{
  const file=importFile.files?.[0];if(!file)return;
  importMessage.textContent='Loading image...';
  try{
    importImage=await loadImageFile(file);
    drawPreview(importImage);
    detectedCrop=detectWhiteboard(importImage);
    drawPreview(importImage,detectedCrop);
    analyzeImportBtn.disabled=false;
    importStats.textContent=`Image ${importImage.naturalWidth}×${importImage.naturalHeight}. Whiteboard candidate detected at ${Math.round(detectedCrop.x)}, ${Math.round(detectedCrop.y)} · ${Math.round(detectedCrop.w)}×${Math.round(detectedCrop.h)}.`;
    importMessage.textContent='Ready to analyze.';
  }catch(err){importMessage.textContent=err.message||'Could not load image.';analyzeImportBtn.disabled=true}
});

analyzeImportBtn?.addEventListener('click',async()=>{
  if(!importImage||!detectedCrop)return;
  analyzeImportBtn.disabled=true;importMessage.textContent='Detecting crochet symbols...';
  try{
    templateCache=templateCache||await buildTemplates();
    const result=await analyzeCrop(importImage,detectedCrop,templateCache);
    if(!result.items.length)throw new Error('No crochet symbols were detected. Try a clearer Crochet CAD screenshot with the whiteboard visible.');
    if(items.length&&!confirm(`Replace the current board with ${result.items.length} detected symbols?`)){analyzeImportBtn.disabled=false;return}
    snapshot();
    items=result.items;selected=items.at(-1)?.id||null;currentRow=0;currentCol=items.length;placementRotation=0;applyZoom(1);render();
    importStats.textContent=`Detected ${result.items.length} symbols · average confidence ${Math.round(result.avgConfidence*100)}% · ${result.uncertain} need review.`;
    importMessage.textContent='Imported. Tap any symbol on the board to review, rotate or delete it.';
    setTimeout(closeImport,850);
  }catch(err){importMessage.textContent=err.message||'Import failed.'}finally{analyzeImportBtn.disabled=false}
});

function loadImageFile(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Invalid image file.'))};img.src=url})}

function drawPreview(img,crop){
  const maxW=700,maxH=430,scale=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight,1);importPreview.width=Math.round(img.naturalWidth*scale);importPreview.height=Math.round(img.naturalHeight*scale);const ctx=importPreview.getContext('2d');ctx.drawImage(img,0,0,importPreview.width,importPreview.height);if(crop){ctx.strokeStyle='#2f81f7';ctx.lineWidth=2;ctx.strokeRect(crop.x*scale,crop.y*scale,crop.w*scale,crop.h*scale)}importPreview.style.display='block';importEmpty.style.display='none'
}

function detectWhiteboard(img){
  const max=520,scale=Math.min(max/img.naturalWidth,max/img.naturalHeight,1),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data;const bright=new Uint8Array(w*h);for(let i=0;i<w*h;i++){const r=data[i*4],g=data[i*4+1],b=data[i*4+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);if((r+g+b)/3>218&&mx-mn<38)bright[i]=1}
  const seen=new Uint8Array(w*h);let best=null;const qx=new Int32Array(w*h),qy=new Int32Array(w*h);for(let sy=0;sy<h;sy+=2){for(let sx=0;sx<w;sx+=2){const si=sy*w+sx;if(!bright[si]||seen[si])continue;let head=0,tail=0;qx[tail]=sx;qy[tail++]=sy;seen[si]=1;let minx=sx,maxx=sx,miny=sy,maxy=sy,count=0;while(head<tail){const x=qx[head],y=qy[head++];count++;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const ni=ny*w+nx;if(bright[ni]&&!seen[ni]){seen[ni]=1;qx[tail]=nx;qy[tail++]=ny}}}const bw=maxx-minx+1,bh=maxy-miny+1,score=count*(bw>80&&bh>80?1:0);if(!best||score>best.score)best={minx,maxx,miny,maxy,score,count}}
  }
  if(!best||best.count<w*h*.08)return{x:0,y:0,w:img.naturalWidth,h:img.naturalHeight};const pad=2/scale;return{x:Math.max(0,best.minx/scale-pad),y:Math.max(0,best.miny/scale-pad),w:Math.min(img.naturalWidth,(best.maxx-best.minx+1)/scale+pad*2),h:Math.min(img.naturalHeight,(best.maxy-best.miny+1)/scale+pad*2)}
}

async function buildTemplates(){
  const out=[];for(const d of defs){for(let rot=0;rot<360;rot+=45){const mask=await renderTemplateMask(d.id,rot);out.push({type:d.id,rotation:rot,mask})}}return out
}
function renderTemplateMask(type,rotation){return new Promise(resolve=>{const size=72,svg=svgFor(type,46,'#000'),blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=size;c.height=size;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.translate(size/2,size/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(img,-23,-23,46,46);URL.revokeObjectURL(url);resolve(binaryMask(ctx.getImageData(0,0,size,size),150))};img.src=url})}
function binaryMask(imageData,threshold){const d=imageData.data,m=new Uint8Array(imageData.width*imageData.height);for(let i=0;i<m.length;i++){if((d[i*4]+d[i*4+1]+d[i*4+2])/3<threshold)m[i]=1}return dilate(m,imageData.width,imageData.height,1)}
function dilate(src,w,h,r){const out=new Uint8Array(src.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!src[y*w+x])continue;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<w&&ny<h)out[ny*w+nx]=1}}return out}

async function analyzeCrop(img,crop,templates){
  const maxW=1200,scale=Math.min(maxW/crop.w,1),w=Math.max(1,Math.round(crop.w*scale)),h=Math.max(1,Math.round(crop.h*scale)),c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,crop.x,crop.y,crop.w,crop.h,0,0,w,h);const id=ctx.getImageData(0,0,w,h),d=id.data,mask=new Uint8Array(w*h);for(let i=0;i<mask.length;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2],lum=(r+g+b)/3;if(lum<135&&Math.max(r,g,b)-Math.min(r,g,b)<110)mask[i]=1}
  let comps=findComponents(mask,w,h).filter(b=>b.area>=8&&b.w>=3&&b.h>=3&&b.w<=130&&b.h<=130);comps=mergeNearby(comps,8,130);
  const targetH=Math.max(480,(h/w)*Math.max(board.clientWidth,360));const found=[];let sum=0,uncertain=0;for(const comp of comps){const candidate=normalizeComponent(mask,w,h,comp,72);let best={score:0,type:null,rotation:0};for(const t of templates){const score=dice(candidate,t.mask);if(score>best.score)best={score,type:t.type,rotation:t.rotation}}if(best.score<.18)continue;const cx=comp.x+comp.w/2,cy=comp.y+comp.h/2,x=Math.max(3,Math.min(97,cx/w*100)),y=60+(cy/h)*(targetH-120);found.push({id:makeId(),type:best.type,row:0,col:found.length,x,y,rotation:best.rotation,direction:'e',importConfidence:+best.score.toFixed(3)});sum+=best.score;if(best.score<.34)uncertain++}
  found.sort((a,b)=>a.y-b.y||a.x-b.x);found.forEach((it,i)=>it.col=i);return{items:found,avgConfidence:found.length?sum/found.length:0,uncertain}
}

function findComponents(mask,w,h){const seen=new Uint8Array(mask.length),out=[];const stack=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const idx=y*w+x;if(!mask[idx]||seen[idx])continue;stack.push(idx);seen[idx]=1;let minx=x,maxx=x,miny=y,maxy=y,area=0;while(stack.length){const p=stack.pop(),px=p%w,py=(p/w)|0;area++;if(px<minx)minx=px;if(px>maxx)maxx=px;if(py<miny)miny=py;if(py>maxy)maxy=py;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const ni=ny*w+nx;if(mask[ni]&&!seen[ni]){seen[ni]=1;stack.push(ni)}}}out.push({x:minx,y:miny,w:maxx-minx+1,h:maxy-miny+1,area})}return out}
function mergeNearby(comps,gap,maxSize){let changed=true;while(changed){changed=false;outer:for(let i=0;i<comps.length;i++)for(let j=i+1;j<comps.length;j++){const a=comps[i],b=comps[j],x1=Math.min(a.x,b.x),y1=Math.min(a.y,b.y),x2=Math.max(a.x+a.w,b.x+b.w),y2=Math.max(a.y+a.h,b.y+b.h),bw=x2-x1,bh=y2-y1,dx=Math.max(0,Math.max(a.x,b.x)-Math.min(a.x+a.w,b.x+b.w)),dy=Math.max(0,Math.max(a.y,b.y)-Math.min(a.y+a.h,b.y+b.h));if(dx<=gap&&dy<=gap&&bw<=maxSize&&bh<=maxSize){comps.splice(j,1);comps[i]={x:x1,y:y1,w:bw,h:bh,area:a.area+b.area};changed=true;break outer}}}return comps}
function normalizeComponent(mask,w,h,b,size){const src=document.createElement('canvas');src.width=b.w;src.height=b.h;const sctx=src.getContext('2d'),img=sctx.createImageData(b.w,b.h);for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const on=mask[(b.y+y)*w+b.x+x],i=(y*b.w+x)*4,imgd=img.data;imgd[i]=imgd[i+1]=imgd[i+2]=on?0:255;imgd[i+3]=255}sctx.putImageData(img,0,0);const out=document.createElement('canvas');out.width=size;out.height=size;const o=out.getContext('2d',{willReadFrequently:true});o.fillStyle='#fff';o.fillRect(0,0,size,size);const pad=8,sc=Math.min((size-pad*2)/b.w,(size-pad*2)/b.h),dw=b.w*sc,dh=b.h*sc;o.drawImage(src,(size-dw)/2,(size-dh)/2,dw,dh);return dilate(binaryMask(o.getImageData(0,0,size,size),150),size,size,1)}
function dice(a,b){let aa=0,bb=0,inter=0;for(let i=0;i<a.length;i++){if(a[i])aa++;if(b[i])bb++;if(a[i]&&b[i])inter++}return aa+bb?(2*inter)/(aa+bb):0}
