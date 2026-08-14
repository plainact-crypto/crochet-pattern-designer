// Photo Mode Beta post-processing overrides.
// Tightens texture classification and builds regular crochet-like circular charts.

const pmAnalyzeBase = pmAnalyze;
pmAnalyze = function(img){
  const r = pmAnalyzeBase(img);
  const scores = (r.cells || []).map(c=>c.score).filter(Number.isFinite).sort((a,b)=>a-b);
  if(scores.length){
    const q = p => scores[Math.min(scores.length-1,Math.max(0,Math.floor((scores.length-1)*p)))];
    const median=q(.5),p90=q(.9),p98=q(.98);
    const textureContrast=(p90-median)/Math.max(8,median);
    const extremeContrast=(p98-median)/Math.max(8,median);
    r.textureContrast=textureContrast;
    const clearTexture=r.raised.length>=4&&textureContrast>.30&&extremeContrast>.48;
    if(!clearTexture){r.texture='Textured stitch not clear';r.raised=[];}
  }
  if(r.shape==='Circle / Round'){
    r.structure='Rounds / radial';
    if(r.base==='Single Crochet / Half Double')r.draftBase='single';
    else if(r.base.startsWith('Half Double'))r.draftBase='half';
    else if(r.base.startsWith('Double'))r.draftBase='double';
    else r.draftBase='single';
  }
  return r;
};

pmShowResult=function(r){
  photoShape.textContent=r.shape;photoStructure.textContent=r.structure;photoBase.textContent=r.base;photoTexture.textContent=r.texture;photoBorder.textContent=r.border;photoConfidence.textContent=Math.round(r.confidence*100)+'%';photoResults.hidden=false;
  if(r.shape==='Circle / Round'){
    const textureText=r.texture==='Textured stitch not clear'?'No distinct raised stitch family detected.':`Possible ${r.texture.toLowerCase()} areas detected.`;
    photoExplain.textContent=`Detected a circular piece worked in rounds. Estimated ${r.estimatedRounds||7} working rounds. ${textureText} The imported chart uses regular crochet-style increases and equal angular spacing as an editable starting draft.`;
  }else{
    const raised=r.raised?.length||0;
    photoExplain.textContent=`Detected a ${r.shape.toLowerCase()} piece with ${r.structure.toLowerCase()}. ${raised?`Found ${raised} stronger repeating texture areas.`:'No distinct raised stitch family detected.'} The imported chart is a suggested editable reconstruction.`;
  }
};

function pmRoundGrowth(baseType){
  if(baseType==='double')return 12;
  if(baseType==='half')return 8;
  return 6;
}

pmBuildRoundDraft=function(r){
  const out=[];
  const baseType=r.draftBase||(r.base==='Single Crochet'?'single':(r.base.includes('Half')?'half':'double'));
  const rounds=Math.max(5,Math.min(10,r.estimatedRounds||7));
  const boardWidth=Math.max(board.clientWidth||2200,1200);
  const centerPx=boardWidth/2;
  const centerX=centerPx/boardWidth*100;
  const centerY=1100;
  const growth=pmRoundGrowth(baseType);
  // Symbol-to-symbol spacing on each circumference. Radius is derived from count,
  // so every round remains visually even instead of being distorted by square-grid snapping.
  const targetArc=54;

  out.push({id:makeId(),type:'ring',row:0,col:0,x:centerX,y:centerY,rotation:0,direction:'e',photoDraft:true,round:0});

  for(let rr=1;rr<=rounds;rr++){
    const count=growth*rr;
    const radius=Math.max(48,(count*targetArc)/(Math.PI*2));
    // Offset alternating rounds by half a stitch so increases do not form fake radial spokes.
    const offset=(rr%2 ? Math.PI/count : 0);
    for(let i=0;i<count;i++){
      const a=-Math.PI/2+offset+(i/count)*Math.PI*2;
      const px=centerPx+Math.cos(a)*radius;
      const py=centerY+Math.sin(a)*radius;
      const x=px/boardWidth*100;
      const rotation=baseType==='single'?0:Math.round((((a*180/Math.PI)+90+360)%360)/45)*45;
      out.push({
        id:makeId(),type:baseType,row:rr,col:i,x,y:py,rotation,
        direction:'e',photoDraft:true,round:rr
      });
    }
  }
  return out;
};
