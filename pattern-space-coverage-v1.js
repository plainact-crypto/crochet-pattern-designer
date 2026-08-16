// Generic chain-space/repeat coverage proof for Crochet Pattern IR.
// Renderer- and design-family-agnostic: generators declare spaceCoverageContracts;
// this module proves that counted outputs consume exactly the intended base spaces.
(() => {
  'use strict';
  const ROOT = typeof globalThis !== 'undefined' ? globalThis : window;
  const VERSION = '1.0.0';

  function consumedTargets(node) {
    if (Array.isArray(node?.consumes)) return node.consumes.filter(id => typeof id === 'string' && id.trim());
    return typeof node?.workedInto === 'string' && node.workedInto ? [node.workedInto] : [];
  }

  function isCounted(node) {
    if (typeof node?.countsAsStitch === 'boolean') return node.countsAsStitch;
    return !!node?.type && !['ring','chain','slip'].includes(node.type);
  }

  function validateSpaceCoverageContracts(input) {
    const graph = input && typeof input === 'object' ? input : {};
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const spaces = Array.isArray(graph.spaces) ? graph.spaces : [];
    const contracts = Array.isArray(graph.spaceCoverageContracts) ? graph.spaceCoverageContracts : [];
    const errors = [];
    const proofs = [];
    const allSpaceIds = new Set(spaces.map(s => s?.id).filter(Boolean));

    for (const c of contracts) {
      const key = c?.stepType === 'row' ? 'row' : 'round';
      if (!Number.isInteger(c?.step) || c.step < 0 || !Number.isInteger(c?.baseStep) || c.baseStep < 0) {
        errors.push({ code:'SPACE_COVERAGE_CONTRACT_INVALID', message:'spaceCoverageContracts require non-negative integer step and baseStep.' });
        continue;
      }
      const baseSpaces = spaces.filter(s => s?.[key] === c.baseStep);
      const baseIds = new Set(baseSpaces.map(s => s.id));
      let outputs = nodes.filter(n => n?.[key] === c.step && isCounted(n));
      if (Array.isArray(c.outputInclude) && c.outputInclude.length) outputs = outputs.filter(n => c.outputInclude.includes(n.type));
      if (Array.isArray(c.outputExclude) && c.outputExclude.length) outputs = outputs.filter(n => !c.outputExclude.includes(n.type));

      const bySpace = new Map(baseSpaces.map(s => [s.id, []]));
      const outsideBase = [];
      for (const n of outputs) {
        for (const targetId of consumedTargets(n)) {
          if (baseIds.has(targetId)) bySpace.get(targetId).push(n);
          else if (allSpaceIds.has(targetId)) outsideBase.push({ nodeId:n.id, targetId });
        }
      }
      const consumedSpaces = [...bySpace.values()].filter(list => list.length > 0).length;
      const produced = outputs.reduce((sum,n) => sum + (Number.isInteger(n.produces) ? n.produces : 1), 0);

      if (Number.isInteger(c.expectedSpaceCount) && baseSpaces.length !== c.expectedSpaceCount)
        errors.push({ code:'SPACE_BASE_COUNT_FAIL', message:`${key} ${c.step} expected ${c.expectedSpaceCount} base spaces but found ${baseSpaces.length}.` });
      if (Number.isInteger(c.expectedOutputCount) && produced !== c.expectedOutputCount)
        errors.push({ code:'SPACE_OUTPUT_COUNT_FAIL', message:`${key} ${c.step} expected ${c.expectedOutputCount} produced stitches but found ${produced}.` });
      if (c.requireEverySpaceConsumed && consumedSpaces !== baseSpaces.length)
        errors.push({ code:'SPACE_UNCOVERED', message:`${key} ${c.step} consumes ${consumedSpaces}/${baseSpaces.length} base spaces.` });
      if (Number.isInteger(c.expectedRepeatCount) && consumedSpaces !== c.expectedRepeatCount)
        errors.push({ code:'SPACE_REPEAT_COUNT_FAIL', message:`${key} ${c.step} expected ${c.expectedRepeatCount} repeats but found ${consumedSpaces}.` });
      if (Number.isInteger(c.expectedBodyPerSpace)) {
        for (const [id,list] of bySpace) if (list.length !== c.expectedBodyPerSpace)
          errors.push({ code:'SPACE_BODY_COUNT_FAIL', message:`${key} ${c.step} space ${id} receives ${list.length} counted stitches; expected ${c.expectedBodyPerSpace}.`, spaceId:id });
      }
      if (c.forbidOutsideBaseSpaces && outsideBase.length) for (const ref of outsideBase)
        errors.push({ code:'OUTSIDE_BASE_SPACE', message:`${ref.nodeId} consumes ${ref.targetId}, outside ${key} ${c.baseStep}.`, nodeId:ref.nodeId, spaceId:ref.targetId });

      proofs.push({ stepType:key, step:c.step, baseStep:c.baseStep, baseSpaces:baseSpaces.length, consumedSpaces, produced, outsideBase:outsideBase.length });
    }
    return { ok:errors.length===0, version:VERSION, contracts:contracts.length, errors, proofs };
  }

  const API = { VERSION, validateSpaceCoverageContracts };
  ROOT.CROCHET_SPACE_COVERAGE_VERSION = VERSION;
  ROOT.validateCrochetSpaceCoverageContracts = validateSpaceCoverageContracts;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
