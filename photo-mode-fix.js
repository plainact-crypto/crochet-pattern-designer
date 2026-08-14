// Photo Mode Beta post-processing overrides.
// Keeps the base analyzer, then tightens texture classification and builds cleaner round charts.

const pmAnalyzeBase = pmAnalyze;
pmAnalyze = function(img){
  const r = pmAnalyzeBase(img);
  const scores = (r.cells || []).map(c=>c.score).filter(Number.isFinite).sort((a,b)=>a-b);
  if(scores.length){
    const q = p => scores[Math.min(scores.length-1,Math.max(0,Math.floor((scores.length-1)*p)))];
    const median = q(.5), p90 = q(.9), p98 = q(.98);
    const textureContrast = (p90-median)/Math.max(8,median);
    const extremeContrast = (p98-median)/Math.max(8,median);
    r.textureContrast = textureContrast;
    // Uniform yarn creates many local-variance peaks. Only call them textured stitches
    // when the strongest areas are materially different from the body fabric.
    const clearTexture = r.raised.length>=4 && textureContrast>.30 && extremeContrast>.48;
    if(!clearTexture){
      r.texture='Textured stitch not clear';
      r.raised=[];
    }
  }
  if(r.shape==='Circle / Round'){
    r.structure='Rounds / radial';
    // For a dense, uniform round piece, prefer the simplest plausible base in the editable draft.
    if(r.base==='Single Crochet / Half Double') r.draftBase='single';
    else if(r.base.startsWith('Half Double')) r.draftBase='half';
    else if(r.base.startsWith('Double')) r.draftBase='double';
    else r.draftBase='single';
  }
  return r;
};

pmShowResult = function(r){
  photoShape.textContent=r.shape;
  photoStructure.textContent=r.structure;
  photoBase.textContent=r.base;
  photoTexture.textContent=r.texture;
  photoBorder.textContent=r.border;
  photoConfidence.textContent=Math.round(r.confidence*100)+'%';
  photoResults.hidden=false;
  if(r.shape==='Circle / Round'){
    const textureText=r.texture==='Textured stitch not clear'?'No distinct raised stitch family detected.':`Possible ${r.texture.toLowerCase()} areas detected.`;
    photoExplain.textContent=`Detected a circular piece worked in rounds. Estimated ${r.estimatedRounds||7} working rounds. ${textureText} The imported chart is a suggested editable reconstruction.`;
  }else{
    const raised=r.raised?.length||0;
    photoExplain.textContent=`Detected a ${r.shape.toLowerCase()} piece with ${r.structure.toLowerCase()}. ${raised?`Found ${raised} stronger repeating texture areas.`:'No distinct raised stitch family detected.'} The imported chart is a suggested editable reconstruction.`;
  }
};

pmBuildRoundDraft = function(r){
  const out=[];
  const baseType=r.draftBase || (r.base==='Single Crochet'?'single':(r.base.includes('Half')?'half':'double'));
  const rounds=Math.max(5,Math.min(10,r.estimatedRounds||7));
  const boardWidth=Math.max(board.clientWidth||360,320);
  const centerX=50;
  const centerY=330;
  const minRadius=30;
  const maxRadius=Math.min(220,boardWidth*.38);
  out.push({id:makeId(),type:'ring',row:0,col:0,x:centerX,y:centerY,rotation:0,direction:'e',photoDraft:true,round:0});

  for(let rr=1;rr<=rounds;rr++){
    const radius=minRadius+(rr-1)*(maxRadius-minRadius)/Math.max(1,rounds-1);
    // Progressive stitch count, capped for mobile readability.
    const count=Math.min(60,Math.max(8,Math.round(7.2*rr)));
    const radiusXPct=(radius/boardWidth)*100;
    // Half-step + small round-dependent offset prevents fake radial spokes.
    const offset=((rr%2)*0.5 + rr*0.137)/count*Math.PI*2;
    for(let i=0;i<count;i++){
      const a=-Math.PI/2 + offset + (i/count)*Math.PI*2;
      const x=centerX+Math.cos(a)*radiusXPct;
      const y=centerY+Math.sin(a)*radius;
      // X-like single crochet does not need radial rotation; taller symbols do.
      const rotation=baseType==='single'?0:((a*180/Math.PI)+90+360)%360;
      out.push({
        id:makeId(),type:baseType,row:rr,col:i,x,y,rotation,
        direction:'e',photoDraft:true,round:rr
      });
    }
  }
  return out;
};
