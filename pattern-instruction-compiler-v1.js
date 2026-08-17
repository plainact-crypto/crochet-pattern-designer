// Pattern Instruction Compiler v1 — written output must come from validated Pattern IR, never hand-authored copy.
(()=>{
  const TYPE={single:'sc',half:'hdc',double:'dc',treble:'tr',dtr:'dtr',slip:'sl st',chain:'ch',ring:'MR'};
  const counted=(n,s)=>`${n} ${s}`;
  function groupedTypes(nodes){
    const out=[];
    for(const n of nodes){const t=TYPE[n.type]||n.type;const last=out[out.length-1];if(last&&last.t===t)last.n++;else out.push({t,n:1});}
    return out.map(x=>x.n===1?x.t:`${x.n} ${x.t}`).join(', ');
  }
  function assertValidated(graph){
    if(!graph||graph.validation?.ok!==true)throw new Error('INSTRUCTION_COMPILER_REQUIRES_VALIDATED_PATTERN_IR');
    if(!Array.isArray(graph.nodes)||!graph.nodes.length)throw new Error('INSTRUCTION_COMPILER_EMPTY_PATTERN_IR');
  }
  function assertProven(graph){
    assertValidated(graph);
    if(graph.coreValidation?.ok!==true)throw new Error('INSTRUCTION_COMPILER_REQUIRES_PATTERN_CORE_PROOF');
    if(graph.spaceCoreValidation?.ok!==true)throw new Error('INSTRUCTION_COMPILER_REQUIRES_SPACE_REPEAT_PROOF');
    if(graph.constructability?.ok!==true)throw new Error('INSTRUCTION_COMPILER_REQUIRES_CONSTRUCTABILITY_PROOF');
    if(graph.layoutValidation?.ok!==true)throw new Error('INSTRUCTION_COMPILER_REQUIRES_LAYOUT_PROOF');
  }
  function lace(graph){
    const p=graph.params||{},nodes=graph.nodes,spaces=graph.spaces||[],P=p.petals||5;
    const role=r=>nodes.filter(n=>n.role===r).sort((a,b)=>(a.sector||0)-(b.sector||0)||(a.order||0)-(b.order||0));
    const firstSector=r=>role(r).filter(n=>(n.sector||1)===1);
    const r1=role('center-sc').length;
    const r2=spaces.filter(s=>s.round===2),r4=spaces.filter(s=>s.round===4),r6=spaces.filter(s=>s.round===6);
    const inner=firstSector('inner-petal-stitch'),mid=firstSector('mid-petal-stitch'),outer=firstSector('outer-petal-stitch');
    const edge=role('edge-sc'),edgeByBase=new Map();edge.forEach(n=>edgeByBase.set(n.workedInto,(edgeByBase.get(n.workedInto)||0)+1));
    const increases=[...edgeByBase.values()].filter(n=>n>1),maxInc=increases.length?Math.max(...increases):1;
    const lines=[
      `${P}-PETAL LAYERED LACE FLOWER · US TERMS`,'','Start: MR.',
      `R1: ${r1} sc in MR; join with sl st in first sc. [${counted(r1,'sc')}]`,
      `R2: *ch ${r2[0]?.chainIds?.length||0}, skip 1 sc, sl st in next sc; repeat around. [${P} ch-${r2[0]?.chainIds?.length||0} sps]`,
      `R3: In each ch-${r2[0]?.chainIds?.length||0} sp work (${groupedTypes(inner)}); sl st in ending anchor. [${P} inner petals]`,
      `R4: After the fifth inner petal, sl st to the next unused R1 sc behind the petal. *ch ${r4[0]?.chainIds?.length||0}, sl st in next unused R1 sc; repeat around. [${P} ch-${r4[0]?.chainIds?.length||0} sps]`,
      `R5: In each ch-${r4[0]?.chainIds?.length||0} sp work (${groupedTypes(mid)}); sl st in ending anchor. [${P} middle petals]`,
      `R6: From the fifth R5 petal join, *ch ${r6[0]?.chainIds?.length||0} behind work, sl st in next R5 petal join; repeat around. [${P} ch-${r6[0]?.chainIds?.length||0} sps]`,
      `R7: In each ch-${r6[0]?.chainIds?.length||0} sp work (${groupedTypes(outer)}); sl st in ending anchor. [${P} outer petals]`,
      `R8: sc in each R7 stitch${maxInc>1?`, working ${maxInc} sc in each marked increase stitch`:''}; join with sl st. [${counted(edge.length,'sc')}]`,'',
      `Parameters proven by Pattern IR: Inner DC ${p.innerDc} · Middle chain ${p.middleChain} · Outer chain ${p.outerChain}.`
    ];
    return {version:1,terminology:'US',kind:graph.kind,lines,text:lines.join('\n'),facts:{petals:P,r1Count:r1,r8Count:edge.length,maxEdgeMultiplicity:maxInc}};
  }
  function compile(graph){assertValidated(graph);if(graph.kind==='lace-flower')return lace(graph);throw new Error(`INSTRUCTION_COMPILER_UNSUPPORTED_KIND:${graph.kind||'unknown'}`)}
  function compileSellable(graph){assertProven(graph);return compile(graph)}
  const api={compile,compileSellable,assertValidated,assertProven};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.CrochetInstructionCompiler=api;
})();
