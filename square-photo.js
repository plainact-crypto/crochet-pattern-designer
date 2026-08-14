// Photo Mode Beta: square/rectangle motif reconstruction.
// Square photos are built from the centre outward as closed 90-degree rounds,
// with local texture features mapped to plausible crochet stitch families.

const squareAnalyzeBase = pmAnalyze;
pmAnalyze = function(img){
  const r = squareAnalyzeBase(img);
  if(r.shape==='Square'){
    const scores=(r.cells||[]).map(c=>c.score).filter(Number.isFinite).sort((a,b)=>a-b);
    const q=p=>scores.length?scores[Math.min(scores.length-1,Math.max(0,Math.floor((scores.length-1)*p)))]:0;
    r.squareStats={q25:q(.25),q50:q(.50),q72:q(.72),q88:q(.88),q96:q(.96)};
    // Open, strongly segmented square fabrics are more plausibly worked as motif rounds
    // than as straight back-and-forth rows. Treat border + local contrast as evidence.
    const contrast=(q(.88)-q(.25))/Math.max(8,q(.50));
    r.squareMotif = r.border==='Detected' || contrast>.22;
    if(r.squareMotif){
      r.structure='Square rounds / motif';
      r.estimatedSquareRounds=Math.max(3,Math.min(6,Math.round((Math.min(r.rows||13,r.cols||13)-1)/3)));
      r.detectedFamilies=['chain','double','cluster','shell'];
      if(r.base.includes('Half')) r.detectedFamilies.unshift('half');
      else r.detectedFamilies.unshift('single');
      if((r.raised||[]).length>=3) r.detectedFamilies.push('puff');
      r.detectedFamilies=[...new Set(r.detectedFamilies)];
    }
  }
  return r;
};

const squareShowBase=pmShowResult;
pmShowResult=function(r){
  squareShowBase(r);
  if(r.shape==='Square'&&r.squareMotif){
    photoStructure.textContent='Square rounds / motif';
    const names={chain:'Chain / chain space',single:'Single Crochet',half:'Half Double Crochet',double:'Double Crochet',cluster:'Cluster',shell:'Shell / corner group',puff:'Puff / Bobble'};
    photoTexture.textContent=r.detectedFamilies.map(x=>names[x]||x).join(' · ');
    photoExplain.textContent=`Detected a square crochet motif built from the centre outward. Estimated ${r.estimatedSquareRounds} square rounds. Corners are reconstructed as 90° corner groups with chain spaces, while each side uses locally inferred stitch families. This remains an editable reconstruction when the photo does not uniquely identify the original stitches.`;
  }
};

function sqCellAt(r,nx,ny){
  const rows=r.rows||13,cols=r.cols||13;
  const rr=Math.max(0,Math.min(rows-1,Math.round(ny*(rows-1))));
  const cc=Math.max(0,Math.min(cols-1,Math.round(nx*(cols-1))));
  return (r.cells||[]).find(c=>c.row===rr&&c.col===cc)||{score:0,row:rr,col:cc};
}
function sqFamilyForCell(r,cell,isCorner=false){
  const s=cell?.score||0,st=r.squareStats||{q25:0,q50:1,q72:2,q88:3,q96:4};
  if(isCorner) return 'shell';
  // Very strong local relief => cluster/puff; medium-high => tall stitches;
  // dense/quiet areas => shorter foundation stitches.
  if(s>=st.q96 && (r.raised||[]).length>=3) return 'puff';
  if(s>=st.q88) return 'cluster';
  if(s>=st.q72) return 'double';
  if(s>=st.q50) return r.base.includes('Half')?'half':'double';
  return r.base==='Single Crochet'?'single':(r.base.includes('Half')?'half':'single');
}
function sqPush(out,bw,type,round,index,px,py,rotation,meta={}){
  out.push({id:makeId(),type,row:round-1,round,col:index,x:px/bw*100,y:py,rotation,direction:'e',photoDraft:true,estimated:true,photoShape:'Square',photoGeometry:'square',...meta});
}

pmBuildRowDraft=function(r){
  // Plain rectangular photos can still use a row reconstruction.
  if(r.shape!=='Square'||!r.squareMotif){
    const out=[];
    const rows=Math.max(4,Math.min(18,r.rows||10)),cols=Math.max(4,Math.min(24,r.cols||10));
    const baseType=r.draftBase||(r.base==='Single Crochet'?'single':(r.base.includes('Half')?'half':'double'));
    const bw=Math.max(board.clientWidth||2200,1200),spacing=58,width=(cols-1)*spacing,startPx=(bw-width)/2,startY=1100-((rows-1)*spacing)/2;
    for(let rr=0;rr<rows;rr++)for(let cc=0;cc<cols;cc++){
      const logical=rr%2?cols-1-cc:cc;
      out.push({id:makeId(),type:baseType,row:rr,col:cc,x:(startPx+logical*spacing)/bw*100,y:startY+rr*spacing,rotation:0,direction:rr%2?'w':'e',photoDraft:true,estimated:true,photoShape:r.shape||'Rectangle'});
    }
    return out;
  }

  const out=[];
  const bw=Math.max(board.clientWidth||2200,1200),cx=bw/2,cy=1100;
  const rounds=r.estimatedSquareRounds||4;
  const firstHalf=92,roundGap=92,slotGap=54;
  let globalIndex=0;

  // Small centre ring gives the motif a real construction origin.
  sqPush(out,bw,'ring',0,globalIndex++,cx,cy,0,{round:0});

  for(let rd=1;rd<=rounds;rd++){
    const half=firstHalf+(rd-1)*roundGap;
    // More side groups as the square expands; keep equal spacing and exact 90° corners.
    const sideInterior=Math.max(1,Math.round((half*2)/slotGap)-1);
    const points=[];
    // Start top-left and walk clockwise; corners are included once.
    points.push({px:cx-half,py:cy-half,corner:true,nx:0,ny:0,rot:0});
    for(let i=1;i<=sideInterior;i++){const t=i/(sideInterior+1);points.push({px:cx-half+2*half*t,py:cy-half,corner:false,nx:t,ny:0,rot:0});}
    points.push({px:cx+half,py:cy-half,corner:true,nx:1,ny:0,rot:90});
    for(let i=1;i<=sideInterior;i++){const t=i/(sideInterior+1);points.push({px:cx+half,py:cy-half+2*half*t,corner:false,nx:1,ny:t,rot:90});}
    points.push({px:cx+half,py:cy+half,corner:true,nx:1,ny:1,rot:180});
    for(let i=1;i<=sideInterior;i++){const t=i/(sideInterior+1);points.push({px:cx+half-2*half*t,py:cy+half,corner:false,nx:1-t,ny:1,rot:180});}
    points.push({px:cx-half,py:cy+half,corner:true,nx:0,ny:1,rot:270});
    for(let i=1;i<=sideInterior;i++){const t=i/(sideInterior+1);points.push({px:cx-half,py:cy+half-2*half*t,corner:false,nx:0,ny:1-t,rot:270});}

    points.forEach((p,idx)=>{
      if(p.corner){
        // A visible, closed corner construction: cluster/shell + chain-space + cluster/shell.
        const tangent=p.rot===0||p.rot===180?[1,0]:[0,1];
        const dx=tangent[0]*20,dy=tangent[1]*20;
        sqPush(out,bw,'shell',rd,globalIndex++,p.px-dx,p.py-dy,p.rot,{corner:true,cornerPart:'group-a'});
        sqPush(out,bw,'chain',rd,globalIndex++,p.px,p.py,p.rot+45,{corner:true,cornerPart:'chain-space'});
        sqPush(out,bw,'shell',rd,globalIndex++,p.px+dx,p.py+dy,p.rot,{corner:true,cornerPart:'group-b'});
      }else{
        const cell=sqCellAt(r,p.nx,p.ny);
        const type=sqFamilyForCell(r,cell,false);
        sqPush(out,bw,type,rd,globalIndex++,p.px,p.py,p.rot,{sourceCell:{row:cell.row,col:cell.col,score:cell.score}});
        // Strong gaps between groups are represented by an adjacent chain space rather than
        // forcing every photo region into a solid stitch symbol.
        if(type==='cluster'||type==='puff'){
          const gap=22;
          const vx=p.rot===0?1:p.rot===180?-1:0,vy=p.rot===90?1:p.rot===270?-1:0;
          sqPush(out,bw,'chain',rd,globalIndex++,p.px+vx*gap,p.py+vy*gap,p.rot,{chainSpace:true});
        }
      }
    });
  }
  return out;
};
