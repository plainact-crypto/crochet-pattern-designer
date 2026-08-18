(()=>{
function validate(g,w){
 const e=[],n=g?.nodes||[],spaces=g?.spaces||[],byId=new Map(n.map(x=>[x.id,x]));
 if(!g?.validation?.ok)e.push('Pattern IR not validated');
 if(!w?.facts)e.push('Missing written facts');
 if(g?.kind==='lace-flower'&&w?.facts){
  const p=g.params?.petals||5,r1=n.filter(x=>x.role==='center-sc').length,r8=n.filter(x=>x.role==='edge-sc').length;
  if(w.facts.petals!==p)e.push('petal count mismatch');if(w.facts.r1Count!==r1)e.push('R1 count mismatch');if(w.facts.r8Count!==r8)e.push('R8 count mismatch');
  for(const r of [1,2,3,4,5,6,7,8])if(!n.some(x=>x.round===r))e.push(`missing round ${r}`);
  const ids=new Set(n.map(x=>x.id)),spids=new Set(spaces.map(x=>x.id));
  for(const x of n)if(x.workedInto&&!ids.has(x.workedInto)&&!spids.has(x.workedInto))e.push(`${x.id}: invalid workedInto`);
  for(const sp of spaces){
   const chains=(sp.chainIds||[]).map(id=>byId.get(id));
   if(!chains.length||chains.some(x=>!x||x.type!=='chain'))e.push(`${sp.id}: invalid chain-space ownership`);
   else {let prev=sp.startAnchor;for(const ch of chains){if(ch.anchor!==prev)e.push(`${sp.id}: disconnected chain ownership`);prev=ch.id}const join=byId.get(sp.joinId);if(!join||join.type!=='slip'||join.anchor!==prev||join.workedInto!==sp.endAnchor)e.push(`${sp.id}: invalid closing join`)}
   const consumers=n.filter(x=>(x.workedInto===sp.id)||(Array.isArray(x.consumes)&&x.consumes.includes(sp.id)));
   if(!consumers.length)e.push(`${sp.id}: unconsumed chain space`);
  }
  for(const x of n.filter(x=>/join$/.test(x.role||''))){if(x.type!=='slip')e.push(`${x.id}: join is not slip stitch`);if(!x.anchor)e.push(`${x.id}: join missing anchor`);if(!x.workedInto)e.push(`${x.id}: join missing target`)}
  const irModes=Object.fromEntries(Object.entries(g.roundPolicy||{}).map(([k,v])=>[Number(k),v]));
  const writtenModes=w.facts.roundModes||{};
  for(const r of [1,2,3,4,5,6,7,8]){if(!irModes[r])e.push(`round ${r}: missing Pattern IR round mode`);if(writtenModes[r]!==irModes[r])e.push(`round ${r}: written round mode mismatch`)}
  const irClosures=n.filter(x=>x.closesRound===true).map(x=>({round:x.round,nodeId:x.id,type:x.type,workedInto:x.workedInto||null,anchor:x.anchor||null})).sort((a,b)=>a.round-b.round);
  const writtenClosures=(w.facts.roundClosures||[]).map(x=>({round:x.round,nodeId:x.nodeId,type:x.type,workedInto:x.workedInto||null,anchor:x.anchor||null})).sort((a,b)=>a.round-b.round);
  if(irClosures.length!==writtenClosures.length)e.push('written round closure count mismatch');
  for(let i=0;i<Math.max(irClosures.length,writtenClosures.length);i++){const a=irClosures[i],b=writtenClosures[i];if(!a||!b)continue;if(a.round!==b.round||a.nodeId!==b.nodeId||a.type!==b.type||a.workedInto!==b.workedInto||a.anchor!==b.anchor)e.push(`round ${a.round||b.round}: written closing join mismatch`)}
  for(const [r,mode] of Object.entries(irModes)){const count=irClosures.filter(x=>x.round===Number(r)).length;if(mode==='joined'&&count!==1)e.push(`round ${r}: expected one explicit closure`);if((mode==='continuous'||mode==='spiral')&&count!==0)e.push(`round ${r}: continuous round must not close`)}
  if(typeof window!=='undefined'&&Array.isArray(window.__LACE_LAYOUT_SNAPSHOT?.nodes)){const m=new Map(window.__LACE_LAYOUT_SNAPSHOT.nodes.map(x=>[x.id,x]));for(const x of n){const r=m.get(x.id);if(!r)e.push(`${x.id}: missing rendered node`);else if(r.type!==x.type||(r.workedInto||null)!==(x.workedInto||null))e.push(`${x.id}: rendered semantic mismatch`)}}
 }
 return{ok:!e.length,errors:[...new Set(e)],version:3}
}
const api={validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(typeof window!=='undefined')window.CrochetChartAgreement=api
})();