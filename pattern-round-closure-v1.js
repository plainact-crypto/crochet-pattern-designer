// Pattern Round Closure v1.1 — validates explicit joined vs continuous crochet rounds from Pattern IR.
// Domain rule: a joined round has one explicit closing slip stitch; continuous/spiral rounds do not.
(()=>{
'use strict';
const ROOT=typeof globalThis!=='undefined'?globalThis:window;
function validateRoundClosure(input,options={}){
 const g=input&&typeof input==='object'?input:{};
 const nodes=Array.isArray(g.nodes)?g.nodes:[];
 const errors=[],warnings=[];
 const byId=new Map(nodes.filter(n=>n?.id).map(n=>[n.id,n]));
 const rounds=[...new Set(nodes.filter(n=>Number.isInteger(n?.round)&&n.round>0).map(n=>n.round))].sort((a,b)=>a-b);
 const policy=g.roundPolicy||g.meta?.roundPolicy||{};
 const requirePolicy=options.requirePolicy===true;
 let declared=0;
 for(const round of rounds){
  const rn=nodes.filter(n=>n.round===round);
  const mode=policy[round]||policy[String(round)]||null;
  // Only generator-owned closesRound is semantic evidence. Role names such as edge-join/petal-join
  // may describe local attachment and must never be mistaken for closing the whole round.
  const joins=rn.filter(n=>n.type==='slip'&&n.closesRound===true);
  if(mode==='joined'){
   declared++;
   if(joins.length!==1){errors.push({code:'ROUND_JOIN_COUNT',round,message:`Joined round ${round} requires exactly one explicit closing slip-stitch join; found ${joins.length}.`});continue}
   const j=joins[0];
   if(!j.anchor||!byId.has(j.anchor))errors.push({code:'ROUND_JOIN_ANCHOR',round,nodeId:j.id,message:`Round ${round} closing join requires a valid anchor.`});
   if(!j.workedInto||!byId.has(j.workedInto))errors.push({code:'ROUND_JOIN_TARGET',round,nodeId:j.id,message:`Round ${round} closing join requires a valid workedInto target.`});
   const a=byId.get(j.anchor),t=byId.get(j.workedInto);
   if(a&&a.round!==round)errors.push({code:'ROUND_JOIN_ANCHOR_STEP',round,nodeId:j.id,message:`Round ${round} closing join anchor must belong to the same round.`});
   if(t&&t.round!==round)errors.push({code:'ROUND_JOIN_TARGET_STEP',round,nodeId:j.id,message:`Round ${round} closing join target must belong to the same round.`});
  }else if(mode==='continuous'||mode==='spiral'){
   declared++;
   if(joins.length)errors.push({code:'CONTINUOUS_ROUND_HAS_JOIN',round,message:`Continuous/spiral round ${round} must not contain an explicit closing slip-stitch join.`});
  }else{
   const issue={code:'ROUND_POLICY_MISSING',round,message:`Round ${round} does not declare joined or continuous/spiral construction.`};
   if(requirePolicy)errors.push(issue);else warnings.push(issue);
  }
 }
 return{ok:errors.length===0,errors,warnings,roundsChecked:rounds.length,roundsDeclared:declared,policyComplete:declared===rounds.length};
}
ROOT.CrochetRoundClosure={version:'1.1.0',validateRoundClosure};
if(typeof module!=='undefined'&&module.exports)module.exports=ROOT.CrochetRoundClosure;
})();
