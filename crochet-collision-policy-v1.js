// Crochet-aware chart collision semantics shared by renderers and executable tests.
// A chart may visually converge at an insertion point when multiple stitches are worked into the same target.
// That construction-semantic contact is distinct from unrelated glyph-body overlap.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.CROCHET_COLLISION_POLICY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function sameConstructionGroup(a,b){
    return !!a&&!!b&&a.role===b.role&&a.sector===b.sector&&a.sourceRegion===b.sourceRegion;
  }
  function intentionalSharedTarget(a,b){
    return !!a?.workedInto&&a.workedInto===b?.workedInto&&sameConstructionGroup(a,b);
  }
  function classifyPair(a,b,overlaps){
    if(!overlaps) return {kind:'separate',invalid:false};
    if(intentionalSharedTarget(a,b)) return {kind:'shared-target-contact',invalid:false};
    return {kind:'invalid-body-overlap',invalid:true};
  }
  function diagnostic(a,b,kind){
    const pick=n=>({id:n?.id||null,type:n?.type||null,role:n?.role||null,sector:n?.sector??null,sourceRegion:n?.sourceRegion||null,workedInto:n?.workedInto||null,gridCol:n?.gridCol??null,gridRow:n?.gridRow??null,rotation:n?.rotation??0});
    return {kind,a:pick(a),b:pick(b)};
  }
  return {version:1,sameConstructionGroup,intentionalSharedTarget,classifyPair,diagnostic};
});
