// Photo Mode v2 — geometry-first crochet reconstruction.
// Source image -> quality -> isolation -> structural geometry -> validation -> crochet graph -> board.
(() => {
  const $ = id => document.getElementById(id);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const GRID_PX = 24;
  const CYC = {
    chain:{name:'Chain',abbr:'ch'}, slip:{name:'Slip Stitch',abbr:'sl st'}, single:{name:'Single Crochet',abbr:'sc'},
    half:{name:'Half Double Crochet',abbr:'hdc'}, double:{name:'Double Crochet',abbr:'dc'}, treble:{name:'Treble Crochet',abbr:'tr'},
    dtr:{name:'Double Treble Crochet',abbr:'dtr'}, picot:{name:'Picot',abbr:'picot'}, puff:{name:'Puff Stitch',abbr:'puff'},
    cluster:{name:'Cluster',abbr:'cl'}, shell:{name:'Shell',abbr:'sh'}, ring:{name:'Magic Ring',abbr:'MR'}
  };
  const ui = {
    btn:$('photoModeBtn'), mobile:$('mobilePhotoModeBtn'), modal:$('photoModeModal'), file:$('photoModeFile'), analyze:$('photoAnalyzeBtn'),
    preview:$('photoPreview'), empty:$('photoEmpty'), results:$('photoResults'), quality:$('photoBorder'), shape:$('photoShape'),
    sym:$('photoBase'), method:$('photoStructure'), families:$('photoTexture'), complexity:$('photoComplexity'), confidence:$('photoConfidence'),
    explain:$('photoExplain'), importBtn:$('photoImportDraftBtn'), message:$('photoMessage'), close:document.querySelector('[data-photo-close]')
  };
  if(!ui.file || !ui.analyze || !ui.importBtn) return;

  // Own Photo Mode controls exclusively so legacy listeners cannot execute.
  for(const key of ['file','analyze','importBtn']) {
    const replacement = ui[key].cloneNode(true);
    ui[key].replaceWith(replacement);
    ui[key] = replacement;
  }

  let sourceImage = null;
  let finalState = null;
  let cancelled = false;

  const wrap = ui.preview?.parentElement;
  const progressPanel = document.createElement('section');
  progressPanel.id = 'photoPipelineProgress';
  progressPanel.style.cssText = 'display:none;margin:12px 0;padding:14px;border:1px solid #46515d;border-radius:12px;background:#111820;color:#eaf3ff';
  progressPanel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
      <strong id="photoProgressTitle">Geometry analysis</strong><span id="photoProgressPct" style="font-variant-numeric:tabular-nums">0%</span>
    </div>
    <div style="height:9px;border-radius:999px;background:#27313b;overflow:hidden"><div id="photoProgressBar" style="height:100%;width:0;background:#2f81f7;transition:width .18s ease"></div></div>
    <div id="photoProgressCurrent" style="margin-top:10px;font-size:12px;font-weight:700">Waiting…</div>
    <div id="photoProgressSteps" style="margin-top:10px;display:grid;gap:5px;font-size:11px;color:#aeb6bf;max-height:170px;overflow:auto"></div>
    <button id="photoCancelAnalysis" type="button" style="margin-top:10px;height:32px;border:1px solid #4a535d;border-radius:7px;background:#202730;color:#eaf3ff;padding:0 12px">Cancel</button>`;
  wrap?.before(progressPanel);

  const geometryBox = document.createElement('section');
  geometryBox.id = 'photoGeometryPreviewBox';
  geometryBox.style.cssText = 'display:none;margin:12px 0;border:1px solid #46515d;border-radius:12px;background:#fff;padding:10px';
  geometryBox.innerHTML = '<div style="color:#26313d;font-size:11px;font-weight:800;letter-spacing:.08em;margin:2px 4px 8px">GEOMETRY PREVIEW · NO STITCHES</div>';
  const geometryCanvas = document.createElement('canvas');
  geometryCanvas.style.cssText = 'display:block;width:100%;height:auto;max-height:430px';
  geometryBox.appendChild(geometryCanvas);
  ui.results?.before(geometryBox);

  const crochetBox = document.createElement('section');
  crochetBox.id = 'photoCrochetPreviewBox';
  crochetBox.style.cssText = 'display:none;margin:12px 0;border:1px solid #46515d;border-radius:12px;background:#fff;padding:10px';
  crochetBox.innerHTML = '<div style="color:#26313d;font-size:11px;font-weight:800;letter-spacing:.08em;margin:2px 4px 8px">CROCHET PREVIEW · BOARD GRID</div>';
  const crochetCanvas = document.createElement('canvas');
  crochetCanvas.style.cssText = 'display:block;width:100%;height:auto;max-height:430px';
  crochetBox.appendChild(crochetCanvas);
  ui.results?.before(crochetBox);

  const steps = [
    'Reading image','Quality check','Background separation','Orientation and bounds','Outer geometry extraction','Hole / opening detection',
    'Symmetry and center detection','Structural component detection','Geometry simplification','Primitive / freeform fitting','Geometry validation',
    'Geometry preview','Board grid mapping','Crochet strategy selection','Stitch placement','Crochet chart validation','Written-pattern metadata','Finalizing output'
  ];
  const stepHost = progressPanel.querySelector('#photoProgressSteps');
  const pctEl = progressPanel.querySelector('#photoProgressPct');
  const barEl = progressPanel.querySelector('#photoProgressBar');
  const currentEl = progressPanel.querySelector('#photoProgressCurrent');
  const titleEl = progressPanel.querySelector('#photoProgressTitle');
  const cancelBtn = progressPanel.querySelector('#photoCancelAnalysis');
  cancelBtn.addEventListener('click',()=>{cancelled=true;currentEl.textContent='Cancelling…';});

  const resetSteps = () => {
    stepHost.innerHTML = '';
    for(let i=0;i<steps.length;i++) {
      const d=document.createElement('div'); d.dataset.step=i; d.textContent=`○ ${i+1}. ${steps[i]}`; stepHost.appendChild(d);
    }
  };
  resetSteps();
  async function step(i,detail='') {
    if(cancelled) throw new Error('Analysis cancelled.');
    progressPanel.style.display='block';
    const pct=Math.round((i+1)/steps.length*100);
    pctEl.textContent=pct+'%'; barEl.style.width=pct+'%'; currentEl.textContent=`${i+1}/${steps.length} · ${steps[i]}${detail?' · '+detail:''}`;
    [...stepHost.children].forEach((n,j)=>{n.textContent=`${j<i?'✓':j===i?'●':'○'} ${j+1}. ${steps[j]}`;n.style.color=j<i?'#7ce3a1':j===i?'#eaf3ff':'#aeb6bf';});
    await new Promise(r=>setTimeout(r,24));
  }

  function open(){ui.modal.hidden=false;document.body.style.overflow='hidden';}
  function close(){ui.modal.hidden=true;document.body.style.overflow='';}
  ui.btn?.addEventListener('click',open); ui.mobile?.addEventListener('click',open); ui.close?.addEventListener('click',close);
  ui.modal?.addEventListener('click',ev=>{if(ev.target===ui.modal)close();});

  const loadImage = file => new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{URL.revokeObjectURL(url);resolve(im)}; im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Invalid image file.'))}; im.src=url;
  });
  function drawSource(im){
    const scale=Math.min(720/im.naturalWidth,430/im.naturalHeight,1); ui.preview.width=Math.max(1,Math.round(im.naturalWidth*scale)); ui.preview.height=Math.max(1,Math.round(im.naturalHeight*scale));
    const c=ui.preview.getContext('2d'); c.clearRect(0,0,ui.preview.width,ui.preview.height); c.drawImage(im,0,0,ui.preview.width,ui.preview.height); ui.preview.style.display='block'; if(ui.empty)ui.empty.style.display='none';
  }
  ui.file.addEventListener('change',async()=>{
    finalState=null; cancelled=false; resetSteps(); progressPanel.style.display='none'; geometryBox.style.display='none'; crochetBox.style.display='none'; ui.results.hidden=true; ui.importBtn.disabled=true;
    const f=ui.file.files?.[0]; if(!f){ui.analyze.disabled=true;return;}
    try{sourceImage=await loadImage(f);drawSource(sourceImage);ui.analyze.disabled=false;ui.message.textContent='Ready for geometry-first analysis.';}catch(err){ui.analyze.disabled=true;ui.message.textContent=err.message;}
  });

  function raster(im){
    const max=288,s=Math.min(max/im.naturalWidth,max/im.naturalHeight,1),w=Math.max(80,Math.round(im.naturalWidth*s)),h=Math.max(80,Math.round(im.naturalHeight*s));
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,w,h);return{w,h,data:ctx.getImageData(0,0,w,h).data};
  }
  function quality(r,im){
    const {w,h,data}=r;let sum=0,sum2=0,lap=0,ln=0;const g=new Uint8Array(w*h);
    for(let i=0;i<g.length;i++){const k=i*4,v=Math.round(.299*data[k]+.587*data[k+1]+.114*data[k+2]);g[i]=v;sum+=v;sum2+=v*v;}
    for(let y=2;y<h-2;y+=3)for(let x=2;x<w-2;x+=3){const p=y*w+x,L=4*g[p]-g[p-1]-g[p+1]-g[p-w]-g[p+w];lap+=L*L;ln++;}
    const mean=sum/g.length,sd=Math.sqrt(Math.max(0,sum2/g.length-mean*mean)),sharp=lap/Math.max(1,ln),reasons=[];
    if(Math.min(im.naturalWidth,im.naturalHeight)<180)reasons.push('Image resolution too low');
    if(sharp<22)reasons.push('Image too blurry'); if(sd<10)reasons.push('Background separation too weak'); if(mean<25)reasons.push('Image too dark'); if(mean>248)reasons.push('Image overexposed');
    return{mean,sd,sharp,reasons,accepted:!reasons.length};
  }
  function estimateBackground(r){
    const {w,h,data}=r,band=Math.max(4,Math.round(Math.min(w,h)*.055));let rr=0,gg=0,bb=0,n=0;
    const add=(x,y)=>{const k=(y*w+x)*4;rr+=data[k];gg+=data[k+1];bb+=data[k+2];n++;};
    for(let x=0;x<w;x+=2)for(let y=0;y<band;y+=2){add(x,y);add(x,h-1-y);} for(let y=band;y<h-band;y+=2)for(let x=0;x<band;x+=2){add(x,y);add(w-1-x,y);} return[rr/n,gg/n,bb/n];
  }
  function foregroundMask(r,bg){
    const {w,h,data}=r,N=w*h,dist=new Float32Array(N);let edge=0,en=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,k=p*4,d=Math.hypot(data[k]-bg[0],data[k+1]-bg[1],data[k+2]-bg[2]);dist[p]=d;if(x<5||y<5||x>=w-5||y>=h-5){edge+=d;en++;}}
    const threshold=clamp(edge/Math.max(1,en)+20,20,76),raw=new Uint8Array(N);for(let i=0;i<N;i++)raw[i]=dist[i]>threshold?1:0;
    // Two majority passes suppress yarn texture while preserving component placement.
    let cur=raw;
    for(let pass=0;pass<2;pass++){const out=new Uint8Array(N);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let c=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)c+=cur[(y+dy)*w+x+dx];out[y*w+x]=c>=4?1:0;}cur=out;}
    return cur;
  }
  function components(mask,w,h,minArea=8){
    const N=w*h,seen=new Uint8Array(N),stack=new Int32Array(N),out=[];
    for(let s=0;s<N;s++){if(!mask[s]||seen[s])continue;let top=0;stack[top++]=s;seen[s]=1;let area=0,minX=w,maxX=0,minY=h,maxY=0,sx=0,sy=0,touch=false;const pix=[];
      while(top){const p=stack[--top],x=p%w,y=(p/w)|0;area++;pix.push(p);sx+=x;sy+=y;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(x===0||y===0||x===w-1||y===h-1)touch=true;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const q=ny*w+nx;if(mask[q]&&!seen[q]){seen[q]=1;stack[top++]=q;}}
      }
      if(area>=minArea)out.push({area,pix,minX,maxX,minY,maxY,w:maxX-minX+1,h:maxY-minY+1,cx:sx/area,cy:sy/area,touch});
    }
    return out.sort((a,b)=>b.area-a.area);
  }
  function chooseObjectMask(mask,w,h){
    const comps=components(mask,w,h,Math.max(8,Math.round(w*h*.00025))); if(!comps.length)return null;
    const largest=comps[0], union=new Uint8Array(w*h), margin=Math.max(4,Math.round(Math.max(largest.w,largest.h)*.04));
    for(const c of comps){const inside=c.cx>=largest.minX-margin&&c.cx<=largest.maxX+margin&&c.cy>=largest.minY-margin&&c.cy<=largest.maxY+margin; if(c===largest||inside)for(const p of c.pix)union[p]=1;}
    const b=bounds(union,w,h); return b?{mask:union,bounds:b,components:components(union,w,h,Math.max(5,Math.round(b.area*.0012)))}:null;
  }
  function bounds(mask,w,h){let minX=w,maxX=-1,minY=h,maxY=-1,area=0,sx=0,sy=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){area++;sx+=x;sy+=y;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}return area?{minX,maxX,minY,maxY,w:maxX-minX+1,h:maxY-minY+1,area,cx:sx/area,cy:sy/area}:null;}

  function logicalGrid(obj,w,h){
    const b=obj.bounds,long=Math.max(b.w,b.h),cell=Math.max(3,long/26),cols=Math.max(6,Math.round(b.w/cell)),rows=Math.max(6,Math.round(b.h/cell)),cells=[];
    for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
      const x0=Math.floor(b.minX+gx*b.w/cols),x1=Math.ceil(b.minX+(gx+1)*b.w/cols),y0=Math.floor(b.minY+gy*b.h/rows),y1=Math.ceil(b.minY+(gy+1)*b.h/rows);let fg=0,n=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){n++;if(obj.mask[y*w+x])fg++;} const cov=fg/Math.max(1,n); if(cov>=.20)cells.push({gx,gy,cov});
    }
    // Remove isolated grid noise only.
    const set=new Set(cells.map(c=>`${c.gx},${c.gy}`)),clean=[];for(const c of cells){let nb=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&set.has(`${c.gx+dx},${c.gy+dy}`))nb++;if(nb>=1||c.cov>.70)clean.push(c);}return{cols,rows,cells:clean};
  }
  function gridComponents(grid){
    const by=new Map(grid.cells.map(c=>[`${c.gx},${c.gy}`,c])),seen=new Set(),out=[];
    for(const c of grid.cells){const k=`${c.gx},${c.gy}`;if(seen.has(k))continue;const stack=[c],arr=[];seen.add(k);while(stack.length){const q=stack.pop();arr.push(q);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const kk=`${q.gx+dx},${q.gy+dy}`,z=by.get(kk);if(z&&!seen.has(kk)){seen.add(kk);stack.push(z);}}}out.push(componentStats(arr));}
    return out.sort((a,b)=>b.cells.length-a.cells.length);
  }
  function componentStats(cells){const xs=cells.map(c=>c.gx),ys=cells.map(c=>c.gy),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),w=maxX-minX+1,h=maxY-minY+1,cx=cells.reduce((s,c)=>s+c.gx,0)/cells.length,cy=cells.reduce((s,c)=>s+c.gy,0)/cells.length;return{cells,minX,maxX,minY,maxY,w,h,cx,cy,fill:cells.length/(w*h)};}
  function holes(grid){
    const occ=new Set(grid.cells.map(c=>`${c.gx},${c.gy}`)),seen=new Set(),out=[];
    for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.cols;x++){const k=`${x},${y}`;if(occ.has(k)||seen.has(k))continue;const st=[[x,y]],arr=[];let touch=false;seen.add(k);while(st.length){const [cx,cy]=st.pop();arr.push({gx:cx,gy:cy});if(cx===0||cy===0||cx===grid.cols-1||cy===grid.rows-1)touch=true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,kk=`${nx},${ny}`;if(nx>=0&&ny>=0&&nx<grid.cols&&ny<grid.rows&&!occ.has(kk)&&!seen.has(kk)){seen.add(kk);st.push([nx,ny]);}}}if(!touch&&arr.length>=1)out.push(componentStats(arr));}
    return out.sort((a,b)=>b.cells.length-a.cells.length);
  }
  function exposedLoops(component){
    const occ=new Set(component.cells.map(c=>`${c.gx},${c.gy}`)),edges=[];
    const add=(ax,ay,bx,by)=>edges.push({a:`${ax},${ay}`,b:`${bx},${by}`,ax,ay,bx,by});
    for(const c of component.cells){const x=c.gx,y=c.gy;if(!occ.has(`${x},${y-1}`))add(x,y,x+1,y);if(!occ.has(`${x+1},${y}`))add(x+1,y,x+1,y+1);if(!occ.has(`${x},${y+1}`))add(x+1,y+1,x,y+1);if(!occ.has(`${x-1},${y}`))add(x,y+1,x,y);}
    const from=new Map();for(const e of edges){if(!from.has(e.a))from.set(e.a,[]);from.get(e.a).push(e);}const used=new Set(),loops=[];
    for(const first of edges){const id=`${first.a}>${first.b}`;if(used.has(id))continue;let cur=first,loop=[];for(let guard=0;guard<edges.length+8;guard++){const cid=`${cur.a}>${cur.b}`;if(used.has(cid))break;used.add(cid);loop.push({x:cur.ax,y:cur.ay});if(cur.b===first.a){loops.push(simplifyLoop(loop));break;}const next=(from.get(cur.b)||[]).find(e=>!used.has(`${e.a}>${e.b}`));if(!next)break;cur=next;}}
    return loops.filter(l=>l.length>=4).sort((a,b)=>polygonArea(b)-polygonArea(a));
  }
  function simplifyLoop(loop){if(loop.length<4)return loop;const out=[];for(let i=0;i<loop.length;i++){const a=loop[(i-1+loop.length)%loop.length],b=loop[i],c=loop[(i+1)%loop.length],dx1=b.x-a.x,dy1=b.y-a.y,dx2=c.x-b.x,dy2=c.y-b.y;if(dx1*dy2-dy1*dx2!==0)out.push(b);}return out.length>=3?out:loop;}
  function polygonArea(loop){let a=0;for(let i=0;i<loop.length;i++){const p=loop[i],q=loop[(i+1)%loop.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a)/2;}
  function fitType(comp,loops){
    const ratio=comp.w/comp.h,main=loops[0]||[],vertices=main.length;
    if(comp.cells.length<=3)return'compact';
    if(comp.fill>.78&&vertices<=8)return Math.abs(ratio-1)<.18?'square':'rectangle';
    // Circle/oval only when occupancy agrees with ellipse well.
    let ellipseErr=0;for(const c of comp.cells){const nx=(c.gx-comp.cx)/Math.max(1,comp.w/2),ny=(c.gy-comp.cy)/Math.max(1,comp.h/2);ellipseErr+=Math.abs(nx*nx+ny*ny-.55);}ellipseErr/=comp.cells.length;
    if(ellipseErr<.30&&comp.fill>.48)return Math.abs(ratio-1)<.22?'circle':'oval';
    if(vertices===3)return'triangle'; return'freeform';
  }
  function symmetry(grid){const set=new Set(grid.cells.map(c=>`${c.gx},${c.gy}`));let v=0,h=0,r=0;for(const c of grid.cells){if(set.has(`${grid.cols-1-c.gx},${c.gy}`))v++;if(set.has(`${c.gx},${grid.rows-1-c.gy}`))h++;if(set.has(`${grid.cols-1-c.gx},${grid.rows-1-c.gy}`))r++;}const n=Math.max(1,grid.cells.length),sv=v/n,sh=h/n,sr=r/n;if(sv>.86&&sh>.86)return'4-way / bilateral symmetry';if(sr>.88)return'2-way rotational symmetry';if(sv>.86)return'Vertical mirror symmetry';if(sh>.86)return'Horizontal mirror symmetry';return'Asymmetric / freeform';}

  function buildGeometry(grid){
    const comps=gridComponents(grid),hs=holes(grid),structures=[];
    for(let i=0;i<comps.length;i++){const comp=comps[i],loops=exposedLoops(comp),type=fitType(comp,loops);structures.push({id:`R${i+1}`,role:i===0?'Primary structure':'Secondary region',type,component:comp,loops,center:{x:comp.cx,y:comp.cy}});}
    return{grid,structures,holes:hs,symmetry:symmetry(grid),center:{x:(grid.cols-1)/2,y:(grid.rows-1)/2}};
  }
  function validateGeometry(model){
    const total=model.grid.cells.length;if(total<6)return{ok:false,confidence:.2,reason:'Geometry too ambiguous'};
    const covered=model.structures.reduce((s,r)=>s+r.component.cells.length,0),coverage=covered/total,largest=model.structures[0]?.component.cells.length||0,fragmentation=model.structures.length/Math.max(1,total),confidence=clamp(.58+coverage*.22+(largest/total)*.12-fragmentation*.35,.35,.94);
    if(coverage<.92)return{ok:false,confidence,reason:'Could not preserve enough source geometry'}; if(model.structures.length>45)return{ok:false,confidence,reason:'Geometry is too fragmented'}; return{ok:true,confidence};
  }

  function drawGeometry(model){
    geometryBox.style.display='block';const W=720,H=500,pad=42;geometryCanvas.width=W;geometryCanvas.height=H;const ctx=geometryCanvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
    const scale=Math.min((W-pad*2)/model.grid.cols,(H-pad*2)/model.grid.rows),ox=(W-model.grid.cols*scale)/2,oy=(H-model.grid.rows*scale)/2;
    ctx.strokeStyle='rgba(30,45,60,.08)';ctx.lineWidth=1;for(let x=0;x<=model.grid.cols;x++){ctx.beginPath();ctx.moveTo(ox+x*scale,oy);ctx.lineTo(ox+x*scale,oy+model.grid.rows*scale);ctx.stroke();}for(let y=0;y<=model.grid.rows;y++){ctx.beginPath();ctx.moveTo(ox,oy+y*scale);ctx.lineTo(ox+model.grid.cols*scale,oy+y*scale);ctx.stroke();}
    ctx.lineWidth=3;ctx.strokeStyle='#111';ctx.fillStyle='rgba(47,129,247,.07)';
    for(const s of model.structures){for(const loop of s.loops){if(!loop.length)continue;ctx.beginPath();ctx.moveTo(ox+loop[0].x*scale,oy+loop[0].y*scale);for(let i=1;i<loop.length;i++)ctx.lineTo(ox+loop[i].x*scale,oy+loop[i].y*scale);ctx.closePath();ctx.fill();ctx.stroke();}}
    ctx.setLineDash([6,5]);ctx.strokeStyle='#2f81f7';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ox+model.center.x*scale,oy);ctx.lineTo(ox+model.center.x*scale,oy+model.grid.rows*scale);ctx.moveTo(ox,oy+model.center.y*scale);ctx.lineTo(ox+model.grid.cols*scale,oy+model.center.y*scale);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#344054';ctx.font='12px Arial';for(const s of model.structures.slice(0,16))ctx.fillText(`${s.id} · ${s.type}`,ox+s.center.x*scale+4,oy+s.center.y*scale-4);
  }

  function stitchStrategy(s,model){
    const c=s.component,centerDist=Math.hypot(c.cx-model.center.x,c.cy-model.center.y),small=c.cells.length<=5;
    if(s.type==='compact')return{mode:'compact motif',family:centerDist<2?'ring':'cluster'};
    if(s.type==='circle'||s.type==='oval')return{mode:'contour',family:small?'puff':'hdc'};
    if(s.type==='square'||s.type==='rectangle')return{mode:'outline',family:'sc'};
    if(s.type==='triangle')return{mode:'outline',family:'sc'};
    return{mode:c.fill>.62?'contour + fill bands':'contour',family:c.fill>.62?'hdc':'sc'};
  }
  function familyId(name){return({sc:'single',hdc:'half',dc:'double',tr:'treble',cluster:'cluster',puff:'puff',ring:'ring',chain:'chain','sl st':'slip'})[name]||'single';}
  function sampleLoop(loop,spacing=1){
    const pts=[];for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length],dx=b.x-a.x,dy=b.y-a.y,n=Math.max(1,Math.round(Math.hypot(dx,dy)/spacing));for(let j=0;j<n;j++)pts.push({x:a.x+dx*j/n,y:a.y+dy*j/n,tx:dx,ty:dy});}return pts;
  }
  function distanceLayers(comp){
    const set=new Set(comp.cells.map(c=>`${c.gx},${c.gy}`)),remaining=new Set(set),layers=[];for(let layer=0;layer<6&&remaining.size;layer++){const boundary=[];for(const key of remaining){const [x,y]=key.split(',').map(Number);if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!remaining.has(`${x+dx},${y+dy}`)))boundary.push({x,y});}if(!boundary.length)break;layers.push(boundary);for(const p of boundary)remaining.delete(`${p.x},${p.y}`);}return layers;
  }
  function mapToBoard(gx,gy,grid){
    const boardW=Math.max(board?.clientWidth||2200,1200),target=Math.min(840,boardW*.72),scaleCells=Math.max(1,Math.floor(target/Math.max(grid.cols,grid.rows)/GRID_PX)),stepPx=GRID_PX*scaleCells,w=grid.cols*stepPx,h=grid.rows*stepPx,ox=Math.round((boardW-w)/2/GRID_PX)*GRID_PX,oy=Math.round((950-h/2)/GRID_PX)*GRID_PX;
    const px=Math.round((ox+gx*stepPx)/GRID_PX)*GRID_PX,py=Math.round((oy+gy*stepPx)/GRID_PX)*GRID_PX;return{x:px/boardW*100,y:py,gridX:Math.round(px/GRID_PX),gridY:Math.round(py/GRID_PX)};
  }
  function buildCrochet(model,confidence){
    const out=[];let path=0;
    const add=(type,s,p,order,rotation,role)=>{const b=mapToBoard(p.x,p.y,model.grid);out.push({id:makeId(),type,row:path,col:order,x:b.x,y:b.y,rotation,direction:'e',photoDraft:true,geometryDraft:true,publicationDraft:true,sourceRegion:s.id,pathId:`P${path+1}`,geometryType:s.type,confidence,stitchFamily:type,orderInPath:order,gridX:b.gridX,gridY:b.gridY,constructionRole:role,estimated:true});};
    for(const s of model.structures){const strategy=stitchStrategy(s,model),base=familyId(strategy.family);if(strategy.mode==='compact motif'){add(base,s,{x:s.center.x,y:s.center.y},0,0,'center motif');path++;continue;}
      const main=s.loops[0]||[],samples=sampleLoop(main,1.15);samples.forEach((p,i)=>{const rot=Math.round((Math.atan2(p.ty,p.tx)*180/Math.PI+90)/15)*15;let type=base;if(i%9===0&&s.type==='freeform'&&samples.length>18)type='single';add(type,s,p,i,rot,'outer contour');});path++;
      if(strategy.mode.includes('fill')){const layers=distanceLayers(s.component).slice(1,4);for(const layer of layers){layer.sort((a,b)=>Math.atan2(a.y-s.center.y,a.x-s.center.x)-Math.atan2(b.y-s.center.y,b.x-s.center.x));layer.forEach((p,i)=>{const ang=Math.atan2(p.y-s.center.y,p.x-s.center.x)*180/Math.PI;add('half',s,p,i,Math.round((ang+90)/15)*15,'fill band');});path++;}}
    }
    // Significant holes become chain-space paths around their boundary box rather than filled stitches.
    for(let hi=0;hi<model.holes.length;hi++){const h=model.holes[hi];if(h.cells.length<2)continue;const fake={id:`H${hi+1}`,type:'hole'};const pts=[];for(let x=h.minX;x<=h.maxX;x++){pts.push({x,y:h.minY},{x,y:h.maxY});}for(let y=h.minY+1;y<h.maxY;y++){pts.push({x:h.minX,y},{x:h.maxX,y});}const seen=new Set();let o=0;for(const p of pts){const k=`${p.x},${p.y}`;if(seen.has(k))continue;seen.add(k);const b=mapToBoard(p.x,p.y,model.grid);out.push({id:makeId(),type:'chain',row:path,col:o++,x:b.x,y:b.y,rotation:0,direction:'e',photoDraft:true,geometryDraft:true,publicationDraft:true,sourceRegion:fake.id,pathId:`P${path+1}`,geometryType:'hole',confidence,stitchFamily:'chain',orderInPath:o-1,gridX:b.gridX,gridY:b.gridY,constructionRole:'chain space',estimated:true});}path++;}
    return out.slice(0,520);
  }
  function validateCrochet(itemsOut,model){
    if(itemsOut.length<4)return{ok:false,reason:'Too few stable stitch positions'};const seen=new Set();let dup=0;for(const it of itemsOut){const k=`${it.gridX},${it.gridY},${it.type}`;if(seen.has(k))dup++;seen.add(k);}if(dup/itemsOut.length>.08)return{ok:false,reason:'Too many duplicate stitch positions'};return{ok:true};
  }
  function drawCrochet(itemsOut){
    crochetBox.style.display='block';const W=720,H=500,pad=42;crochetCanvas.width=W;crochetCanvas.height=H;const ctx=crochetCanvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);if(!itemsOut.length)return;
    const boardW=Math.max(board?.clientWidth||2200,1200),pts=itemsOut.map(i=>({x:i.x/100*boardW,y:i.y})),minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y)),scale=Math.min((W-pad*2)/Math.max(1,maxX-minX),(H-pad*2)/Math.max(1,maxY-minY));
    ctx.strokeStyle='rgba(30,45,60,.07)';ctx.lineWidth=1;for(let x=pad;x<W-pad;x+=GRID_PX*scale){ctx.beginPath();ctx.moveTo(x,pad);ctx.lineTo(x,H-pad);ctx.stroke();}for(let y=pad;y<H-pad;y+=GRID_PX*scale){ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();}
    itemsOut.forEach((it,i)=>{const p=pts[i],x=pad+(p.x-minX)*scale,y=pad+(p.y-minY)*scale,size=16;ctx.save();ctx.translate(x,y);ctx.rotate((it.rotation||0)*Math.PI/180);ctx.strokeStyle='#111';ctx.fillStyle='#111';ctx.lineWidth=1.8;
      if(it.type==='chain'){ctx.beginPath();ctx.ellipse(0,0,6,2.5,0,0,Math.PI*2);ctx.stroke();}
      else if(it.type==='slip'){ctx.beginPath();ctx.arc(0,0,2.2,0,Math.PI*2);ctx.fill();}
      else if(it.type==='single'){ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(5,5);ctx.moveTo(5,-5);ctx.lineTo(-5,5);ctx.stroke();}
      else if(it.type==='cluster'||it.type==='puff'){for(const dx of [-5,0,5]){ctx.beginPath();ctx.moveTo(0,7);ctx.quadraticCurveTo(dx,-2,0,-8);ctx.stroke();}}
      else if(it.type==='ring'){ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.stroke();}
      else {ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(0,8);ctx.moveTo(-5,-3);ctx.lineTo(5,-3);ctx.stroke();}
      ctx.restore();});
  }

  function summaryFamilies(itemsOut){return[...new Set(itemsOut.map(i=>CYC[i.type]?.name||i.type))].join(' · ');}
  function topologyLabel(model){const types=[...new Set(model.structures.map(s=>s.type))];if(model.structures.length===1)return types[0]==='freeform'?'Single freeform shape':`Single ${types[0]} geometry`;return`Multi-region geometry · ${model.structures.length} structural regions`;}

  ui.analyze.addEventListener('click',async()=>{
    if(!sourceImage)return;cancelled=false;finalState=null;ui.analyze.disabled=true;ui.importBtn.disabled=true;ui.results.hidden=true;geometryBox.style.display='none';crochetBox.style.display='none';resetSteps();titleEl.textContent='Geometry-first reconstruction';
    try{
      await step(0);const r=raster(sourceImage);
      await step(1);const q=quality(r,sourceImage);if(!q.accepted)throw new Error(`Photo not clear enough for geometric stitch reconstruction. ${q.reasons.join('. ')}. Please upload a clearer image with the full shape visible.`);
      await step(2);const bg=estimateBackground(r),mask=foregroundMask(r,bg),obj=chooseObjectMask(mask,r.w,r.h);if(!obj||obj.bounds.area<r.w*r.h*.02)throw new Error('Background separation too weak or geometry too ambiguous.');
      await step(3,`${obj.bounds.w}×${obj.bounds.h} normalized bounds`);
      await step(4);const grid=logicalGrid(obj,r.w,r.h);if(grid.cells.length<6)throw new Error('Could not extract a stable outer geometry.');
      await step(5);const hs=holes(grid);
      await step(6);const sym=symmetry(grid);
      await step(7);const comps=gridComponents(grid);
      await step(8);const model=buildGeometry(grid);model.holes=hs;model.symmetry=sym;
      await step(9,`${model.structures.length} structural region${model.structures.length===1?'':'s'}`);
      await step(10);const gv=validateGeometry(model);if(!gv.ok)throw new Error(`Could not reconstruct a stable geometric model from this image. ${gv.reason}.`);
      await step(11);drawGeometry(model);
      await step(12,'24px board grid');
      await step(13);const strategies=model.structures.map(s=>stitchStrategy(s,model));
      await step(14);const crochet=buildCrochet(model,gv.confidence);
      await step(15);const cv=validateCrochet(crochet,model);if(!cv.ok)throw new Error(`Could not convert the geometry into a stable crochet chart. ${cv.reason}.`);
      await step(16,'US crochet terminology');
      await step(17);drawCrochet(crochet);
      finalState={model,crochet,confidence:gv.confidence,quality:q,strategies};
      ui.results.hidden=false;ui.quality.textContent='Accepted';ui.shape.textContent=topologyLabel(model);ui.sym.textContent=model.symmetry;ui.method.textContent=[...new Set(strategies.map(s=>s.mode))].join(' · ');ui.families.textContent=summaryFamilies(crochet);ui.complexity.textContent=crochet.length>220?'Complex':crochet.length>100?'Intermediate':'Easy';ui.confidence.textContent=Math.round(gv.confidence*100)+'%';
      ui.explain.textContent='Geometry was reconstructed and validated before any crochet stitches were assigned. Crochet notation uses standard US terms; uncertain counts remain estimated (~). This is a geometric crochet reconstruction, not a claim of the exact original pattern.';
      ui.importBtn.disabled=false;ui.importBtn.textContent='IMPORT TO BOARD';ui.message.textContent='Done · geometry validated · crochet chart ready.';pctEl.textContent='100%';barEl.style.width='100%';currentEl.textContent='Done · geometry validated · crochet chart ready.';
    } catch(err){ui.results.hidden=false;ui.quality.textContent='Rejected';ui.shape.textContent='Not accepted';ui.sym.textContent='—';ui.method.textContent='—';ui.families.textContent='—';ui.complexity.textContent='—';ui.confidence.textContent='—';ui.explain.textContent=err.message;ui.message.textContent=err.message;currentEl.textContent='Stopped · '+err.message;}
    finally{ui.analyze.disabled=!ui.file.files?.[0];}
  });

  ui.importBtn.addEventListener('click',()=>{
    if(!finalState?.crochet?.length)return;snapshot();items=finalState.crochet.map(i=>({...i}));currentRow=Math.max(0,...items.map(i=>i.row||0));currentCol=items.filter(i=>i.row===currentRow).length;selected=null;render();close();
    const used=items.map(i=>i.y||0),minY=Math.min(...used);applyZoom(Math.max(.2,Math.min(1,window.innerWidth<600?.45:.7)));boardWrap.scrollTop=Math.max(0,minY*zoom-150);boardWrap.scrollLeft=Math.max(0,(board.scrollWidth*zoom-boardWrap.clientWidth)/2);rowStatus.textContent=`Photo Mode · ${finalState.model.structures.length} geometric region${finalState.model.structures.length===1?'':'s'}`;selectedStatus.textContent='Photo Mode · validated geometric crochet diagram';
  });
})();
