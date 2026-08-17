// Sellable Pattern Compiler v1 — one fail-closed gate from Pattern IR to publishable written output.
(()=>{
  'use strict';
  const ROOT=typeof globalThis!=='undefined'?globalThis:window;
  const VERSION='1.0.0';
  const fail=(code,message)=>({code,message});
  function empiricalSizeEvidence(graph){
    const e=graph?.meta?.measurementEvidence||graph?.measurementEvidence;
    if(!e||e.empirical!==true)return {ok:false,error:fail('EMPIRICAL_SIZE_EVIDENCE_MISSING','Sellable output requires a physically measured crochet sample; rendered/grid dimensions are not gauge evidence.')};
    if(!(Number.isFinite(e.finishedWidth)&&e.finishedWidth>0))return {ok:false,error:fail('EMPIRICAL_FINISHED_WIDTH_MISSING','Measured finished width must be a positive number.')};
    if(!['cm','in'].includes(e.unit))return {ok:false,error:fail('EMPIRICAL_SIZE_UNIT_INVALID','Measured finished-size unit must be cm or in.')};
    if(!e.yarn||!e.hook||!e.blocking)return {ok:false,error:fail('EMPIRICAL_SAMPLE_CONTEXT_MISSING','Measurement evidence must record yarn, hook and blocking state.')};
    return {ok:true,evidence:{...e}};
  }
  function compile(graph){
    const errors=[];
    if(!graph||typeof graph!=='object')return {ok:false,version:VERSION,errors:[fail('PATTERN_IR_MISSING','No Pattern IR supplied.')]};
    const core=typeof ROOT.validateCrochetPatternGraph==='function'?ROOT.validateCrochetPatternGraph(graph,{level:'sellable'}):{ok:false,errors:[fail('PATTERN_CORE_UNAVAILABLE','Pattern Core validator unavailable.')]};
    graph.coreValidation=core;if(!core.ok)errors.push(...(core.errors||[]));
    const space=typeof ROOT.validateCrochetSpaceCoverageContracts==='function'?ROOT.validateCrochetSpaceCoverageContracts(graph):{ok:false,errors:[fail('SPACE_CORE_UNAVAILABLE','Space/repeat validator unavailable.')]};
    graph.spaceCoreValidation=space;if(!space.ok)errors.push(...(space.errors||[]));
    if(graph.constructability?.ok!==true)errors.push(fail('CONSTRUCTABILITY_PROOF_MISSING','Constructability proof has not passed.'));
    if(graph.layoutValidation?.ok!==true)errors.push(fail('LAYOUT_PROOF_MISSING','Layout proof has not passed.'));
    const measured=empiricalSizeEvidence(graph);if(!measured.ok)errors.push(measured.error);
    let written=null;
    if(!errors.length){
      try{
        if(!ROOT.CrochetInstructionCompiler?.compileSellable)throw new Error('instruction compiler unavailable');
        written=ROOT.CrochetInstructionCompiler.compileSellable(graph);
      }catch(e){errors.push(fail('WRITTEN_COMPILATION_FAILED',String(e?.message||e)));}
    }
    const out={ok:errors.length===0,version:VERSION,errors,coreValidation:core,spaceCoreValidation:space,constructability:graph.constructability||null,layoutValidation:graph.layoutValidation||null,measurementEvidence:measured.ok?measured.evidence:null,written};
    graph.sellableCompilation=out;return out;
  }
  const API={VERSION,compile,empiricalSizeEvidence};
  ROOT.CROCHET_SELLABLE_COMPILER_VERSION=VERSION;ROOT.compileSellableCrochetPattern=compile;
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
})();
