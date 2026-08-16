// Pattern Core v1.1 — domain-first structural + stitch-math validation for crochet pattern graphs.
// Renderer-agnostic by design: charts and PDFs are views of a validated pattern graph.
(() => {
  'use strict';

  const ROOT = typeof globalThis !== 'undefined' ? globalThis : window;
  const VERSION = '1.1.0';

  const US_STITCHES = new Set([
    'ring','chain','slip','single','half','double','treble','dtr',
    'picot','puff','bobble','cluster','shell'
  ]);
  const NON_COUNTED_DEFAULT = new Set(['ring','chain','slip']);

  const TERMINOLOGY = Object.freeze({
    US: Object.freeze({ single:'sc', half:'hdc', double:'dc', treble:'tr', dtr:'dtr', slip:'sl st', chain:'ch' }),
    UK: Object.freeze({ single:'dc', half:'htr', double:'tr', treble:'dtr', dtr:'trtr', slip:'ss', chain:'ch' })
  });

  function issue(code, message, nodeId = null, severity = 'error') {
    return { code, message, nodeId, severity };
  }

  function normalizePatternGraph(input) {
    const graph = input && typeof input === 'object' ? input : {};
    const nodes = Array.isArray(graph.nodes) ? graph.nodes.map(n => ({ ...n })) : [];
    const spaces = Array.isArray(graph.spaces) ? graph.spaces.map(s => ({ ...s })) : [];
    const meta = {
      terminology: graph.meta?.terminology || graph.terminology || 'US',
      construction: graph.meta?.construction || graph.construction || null,
      gauge: graph.meta?.gauge || graph.gauge || null,
      yarn: graph.meta?.yarn || graph.yarn || null,
      hook: graph.meta?.hook || graph.hook || null,
      finishedSize: graph.meta?.finishedSize || graph.finishedSize || null,
      supportStatus: graph.meta?.supportStatus || graph.supportStatus || 'BETA'
    };
    return { ...graph, nodes, spaces, meta };
  }

  function isCountedOutput(node) {
    if (typeof node?.countsAsStitch === 'boolean') return node.countsAsStitch;
    return !!node?.type && !NON_COUNTED_DEFAULT.has(node.type);
  }

  function outputUnits(node) {
    if (!isCountedOutput(node)) return 0;
    if (node.produces == null) return 1;
    return Number.isInteger(node.produces) && node.produces >= 0 ? node.produces : NaN;
  }

  function consumedTargets(node) {
    if (Array.isArray(node?.consumes)) {
      return node.consumes.filter(id => typeof id === 'string' && id.trim());
    }
    return typeof node?.workedInto === 'string' && node.workedInto ? [node.workedInto] : [];
  }

  function filterTypes(nodes, include, exclude) {
    let found = nodes;
    if (Array.isArray(include) && include.length) found = found.filter(n => include.includes(n.type));
    if (Array.isArray(exclude) && exclude.length) found = found.filter(n => !exclude.includes(n.type));
    return found;
  }

  function validateStructuredGauge(gauge, add, sellable) {
    if (!gauge || typeof gauge !== 'object' || Array.isArray(gauge)) return;
    for (const field of ['stitches','width']) {
      if (!(Number.isFinite(gauge[field]) && gauge[field] > 0)) {
        add(issue('GAUGE_INVALID', `Structured gauge requires positive numeric ${field}.`, null, sellable ? 'error' : 'warning'));
      }
    }
    if (gauge.rows != null && !(Number.isFinite(gauge.rows) && gauge.rows > 0)) {
      add(issue('GAUGE_INVALID', 'Gauge rows must be a positive number when supplied.', null, sellable ? 'error' : 'warning'));
    }
    if (gauge.height != null && !(Number.isFinite(gauge.height) && gauge.height > 0)) {
      add(issue('GAUGE_INVALID', 'Gauge height must be a positive number when supplied.', null, sellable ? 'error' : 'warning'));
    }
    if (gauge.unit != null && !['cm','in'].includes(gauge.unit)) {
      add(issue('GAUGE_UNIT_INVALID', 'Gauge unit must be cm or in.', null, sellable ? 'error' : 'warning'));
    }
  }

  function validatePatternGraph(input, options = {}) {
    const graph = normalizePatternGraph(input);
    const errors = [];
    const warnings = [];
    const add = x => (x.severity === 'warning' ? warnings : errors).push(x);
    const nodeIds = new Set();
    const spaceIds = new Set();
    const nodeById = new Map();

    if (!graph.nodes.length) add(issue('PATTERN_EMPTY', 'Pattern has no crochet operations/stitches.'));
    if (!['US','UK'].includes(graph.meta.terminology)) add(issue('TERMINOLOGY_UNKNOWN', 'Pattern terminology must explicitly be US or UK.'));

    for (const n of graph.nodes) {
      if (!n || typeof n !== 'object') { add(issue('NODE_INVALID', 'Pattern contains an invalid node.')); continue; }
      if (!n.id || typeof n.id !== 'string') { add(issue('NODE_ID_MISSING', 'Every crochet operation must have a stable string id.')); continue; }
      if (nodeIds.has(n.id)) add(issue('NODE_ID_DUPLICATE', `Duplicate node id: ${n.id}`, n.id));
      nodeIds.add(n.id); nodeById.set(n.id, n);
      if (!n.type || typeof n.type !== 'string') add(issue('STITCH_TYPE_MISSING', 'Node has no stitch/operation type.', n.id));
      else if (!US_STITCHES.has(n.type) && !n.customStitch) add(issue('STITCH_TYPE_UNKNOWN', `Unknown stitch type "${n.type}" requires an explicit customStitch definition.`, n.id));
      if (n.round != null && (!Number.isInteger(n.round) || n.round < 0)) add(issue('ROUND_INVALID', 'round must be a non-negative integer when supplied.', n.id));
      if (n.row != null && (!Number.isInteger(n.row) || n.row < 0)) add(issue('ROW_INVALID', 'row must be a non-negative integer when supplied.', n.id));
      if (n.round != null && n.row != null) add(issue('ROW_ROUND_AMBIGUOUS', 'A node cannot simultaneously belong to both a row and a round.', n.id));
      if (n.produces != null && (!Number.isInteger(n.produces) || n.produces < 0)) add(issue('PRODUCES_INVALID', 'produces must be a non-negative integer when supplied.', n.id));
      if (n.consumes != null && !Array.isArray(n.consumes)) add(issue('CONSUMES_INVALID', 'consumes must be an array of target ids when supplied.', n.id));
    }

    for (const s of graph.spaces) {
      if (!s?.id || typeof s.id !== 'string') { add(issue('SPACE_ID_MISSING', 'Every chain-space/topological space needs a stable id.')); continue; }
      if (spaceIds.has(s.id) || nodeIds.has(s.id)) add(issue('SPACE_ID_DUPLICATE', `Duplicate/colliding space id: ${s.id}`));
      spaceIds.add(s.id);
    }

    const targetExists = id => nodeIds.has(id) || spaceIds.has(id);
    for (const n of graph.nodes) {
      if (!n?.id) continue;
      const targets = consumedTargets(n);
      if (n.workedInto && !targetExists(n.workedInto)) add(issue('WORKED_INTO_MISSING', `workedInto target does not exist: ${n.workedInto}`, n.id));
      if (n.anchor && !nodeIds.has(n.anchor)) add(issue('ANCHOR_MISSING', `anchor node does not exist: ${n.anchor}`, n.id));
      if (n.workedInto === n.id || targets.includes(n.id)) add(issue('WORKED_INTO_SELF', 'A stitch cannot be worked into itself.', n.id));
      if (n.anchor === n.id) add(issue('ANCHOR_SELF', 'A stitch cannot anchor itself.', n.id));
      for (const targetId of targets) {
        if (!targetExists(targetId)) { add(issue('CONSUMED_TARGET_MISSING', `Consumed target does not exist: ${targetId}`, n.id)); continue; }
        if (!nodeById.has(targetId)) continue;
        const base = nodeById.get(targetId);
        const nStep = Number.isInteger(n.round) ? n.round : (Number.isInteger(n.row) ? n.row : null);
        const bStep = Number.isInteger(base.round) ? base.round : (Number.isInteger(base.row) ? base.row : null);
        if (nStep != null && bStep != null && bStep > nStep) add(issue('FORWARD_REFERENCE', 'A stitch cannot consume/work into a future row/round.', n.id));
      }
    }

    for (const s of graph.spaces) {
      if (!s?.id) continue;
      if (!Array.isArray(s.chainIds) || !s.chainIds.length) { add(issue('SPACE_CHAIN_EMPTY', `Space ${s.id} does not declare its chain stitches.`)); continue; }
      if (!nodeIds.has(s.startAnchor)) add(issue('SPACE_START_MISSING', `Space ${s.id} startAnchor is missing.`));
      if (!nodeIds.has(s.endAnchor)) add(issue('SPACE_END_MISSING', `Space ${s.id} endAnchor is missing.`));
      let previous = s.startAnchor;
      for (const chainId of s.chainIds) {
        const ch = nodeById.get(chainId);
        if (!ch) { add(issue('SPACE_CHAIN_NODE_MISSING', `Space ${s.id} references missing chain ${chainId}.`)); continue; }
        if (ch.type !== 'chain') add(issue('SPACE_NON_CHAIN_NODE', `Space ${s.id} contains a non-chain operation ${chainId}.`, chainId));
        if (ch.anchor !== previous) add(issue('SPACE_CHAIN_DISCONNECTED', `Space ${s.id} chain is not contiguous at ${chainId}.`, chainId));
        previous = chainId;
      }
      const join = nodeById.get(s.joinId);
      if (!join) add(issue('SPACE_JOIN_MISSING', `Space ${s.id} is missing its closing join operation.`));
      else {
        if (join.type !== 'slip') add(issue('SPACE_JOIN_NOT_SLIP', `Space ${s.id} must close with an explicit slip stitch.`, join.id));
        if (join.anchor !== previous) add(issue('SPACE_JOIN_DISCONNECTED', `Space ${s.id} join is not anchored to the final chain.`, join.id));
        if (join.workedInto !== s.endAnchor) add(issue('SPACE_JOIN_TARGET', `Space ${s.id} join does not target endAnchor.`, join.id));
      }
    }

    if (Array.isArray(graph.countContracts)) {
      for (const c of graph.countContracts) {
        const key = c.stepType === 'row' ? 'row' : 'round';
        let found = graph.nodes.filter(n => n[key] === c.step);
        found = filterTypes(found, c.include, c.exclude);
        if (!Number.isInteger(c.count) || c.count < 0) add(issue('COUNT_CONTRACT_INVALID', `Invalid count contract for ${key} ${c.step}.`));
        else if (found.length !== c.count) add(issue('COUNT_CONTRACT_FAIL', `${key} ${c.step} expected ${c.count} operations but found ${found.length}.`));
      }
    }

    // Explicit stitch-math proof: design intent must declare expected row/round relationships.
    if (Array.isArray(graph.coverageContracts)) {
      for (const c of graph.coverageContracts) {
        const key = c.stepType === 'row' ? 'row' : 'round';
        if (!Number.isInteger(c.step) || c.step < 0) { add(issue('COVERAGE_CONTRACT_INVALID', 'coverageContracts require a non-negative integer step.')); continue; }
        const baseStep = Number.isInteger(c.baseStep) ? c.baseStep : c.step - 1;
        if (baseStep < 0) { add(issue('COVERAGE_BASE_INVALID', `${key} ${c.step} has no valid base step.`)); continue; }

        let outputNodes = graph.nodes.filter(n => n[key] === c.step && isCountedOutput(n));
        let baseNodes = graph.nodes.filter(n => n[key] === baseStep && isCountedOutput(n));
        outputNodes = filterTypes(outputNodes, c.outputInclude, c.outputExclude);
        baseNodes = filterTypes(baseNodes, c.baseInclude, c.baseExclude);

        let produced = 0;
        for (const n of outputNodes) {
          const units = outputUnits(n);
          if (!Number.isFinite(units)) add(issue('PRODUCES_INVALID', `Invalid produced-stitch count in ${n.id}.`, n.id));
          else produced += units;
        }

        const baseIds = new Set(baseNodes.map(n => n.id));
        const multiplicity = new Map(baseNodes.map(n => [n.id, 0]));
        const outsideBase = [];
        for (const n of outputNodes) {
          for (const targetId of consumedTargets(n)) {
            if (baseIds.has(targetId)) multiplicity.set(targetId, (multiplicity.get(targetId) || 0) + 1);
            else if (nodeById.has(targetId)) outsideBase.push({ nodeId:n.id, targetId });
          }
        }

        const baseCount = baseNodes.length;
        const delta = produced - baseCount;
        if (Number.isInteger(c.expectedBaseCount) && baseCount !== c.expectedBaseCount) add(issue('COVERAGE_BASE_COUNT_FAIL', `${key} ${c.step} expected base count ${c.expectedBaseCount} but found ${baseCount}.`));
        if (Number.isInteger(c.expectedOutputCount) && produced !== c.expectedOutputCount) add(issue('COVERAGE_OUTPUT_COUNT_FAIL', `${key} ${c.step} expected ${c.expectedOutputCount} produced stitches but found ${produced}.`));
        if (Number.isInteger(c.expectedDelta) && delta !== c.expectedDelta) add(issue('COVERAGE_DELTA_FAIL', `${key} ${c.step} expected stitch-count delta ${c.expectedDelta} but found ${delta}.`));

        const allowedSkipped = new Set(Array.isArray(c.allowedSkippedTargets) ? c.allowedSkippedTargets : []);
        if (c.requireFullBaseCoverage !== false) {
          for (const [targetId, times] of multiplicity.entries()) {
            if (times === 0 && !allowedSkipped.has(targetId)) add(issue('BASE_STITCH_UNCOVERED', `${key} ${c.step} does not work into base stitch ${targetId}.`));
          }
        }
        if (Number.isInteger(c.expectedTargetMultiplicity) && c.expectedTargetMultiplicity >= 0) {
          for (const [targetId, times] of multiplicity.entries()) {
            if (allowedSkipped.has(targetId)) continue;
            if (times !== c.expectedTargetMultiplicity) add(issue('TARGET_MULTIPLICITY_FAIL', `${key} ${c.step} works into ${targetId} ${times} time(s); expected ${c.expectedTargetMultiplicity}.`));
          }
        }
        if (Number.isInteger(c.maxTargetMultiplicity) && c.maxTargetMultiplicity >= 0) {
          for (const [targetId, times] of multiplicity.entries()) {
            if (times > c.maxTargetMultiplicity) add(issue('TARGET_MULTIPLICITY_MAX', `${key} ${c.step} works into ${targetId} ${times} times; maximum is ${c.maxTargetMultiplicity}.`));
          }
        }
        if (c.forbidOutsideBaseTargets && outsideBase.length) {
          for (const ref of outsideBase) add(issue('OUTSIDE_BASE_TARGET', `${ref.nodeId} consumes ${ref.targetId}, which is not in ${key} ${baseStep}.`, ref.nodeId));
        }
      }
    }

    const sellable = options.level === 'sellable' || graph.meta.supportStatus === 'VERIFIED';
    for (const [field, code, message] of [
      ['gauge','GAUGE_MISSING','Gauge/tension is not declared.'],
      ['yarn','YARN_MISSING','Yarn specification/weight is not declared.'],
      ['hook','HOOK_MISSING','Hook size is not declared.']
    ]) {
      if (!graph.meta[field]) add(issue(code, message, null, sellable ? 'error' : 'warning'));
    }
    validateStructuredGauge(graph.meta.gauge, add, sellable);

    if (graph.meta.yarn && typeof graph.meta.yarn === 'object' && graph.meta.yarn.weightCategory != null) {
      const w = graph.meta.yarn.weightCategory;
      if (!(Number.isInteger(w) && w >= 0 && w <= 7)) add(issue('YARN_WEIGHT_INVALID', 'Yarn weightCategory must be an integer from 0 through 7 when supplied.', null, sellable ? 'error' : 'warning'));
    }
    if (graph.meta.hook && typeof graph.meta.hook === 'object' && graph.meta.hook.mm != null && !(Number.isFinite(graph.meta.hook.mm) && graph.meta.hook.mm > 0)) {
      add(issue('HOOK_SIZE_INVALID', 'Hook mm size must be a positive number.', null, sellable ? 'error' : 'warning'));
    }
    if (sellable && typeof graph.meta.gauge === 'string') add(issue('GAUGE_NOT_STRUCTURED', 'Sellable patterns require structured gauge data so dimensions can be validated.'));
    if (sellable && !graph.written?.trim()) add(issue('WRITTEN_PATTERN_MISSING', 'A VERIFIED/sellable pattern must include written instructions.'));
    if (sellable && !graph.meta.finishedSize) add(issue('FINISHED_SIZE_MISSING', 'A VERIFIED/sellable pattern must state finished size or explicitly state that size is user-defined.'));

    return {
      ok: errors.length === 0,
      sellable: sellable && errors.length === 0,
      version: VERSION,
      errors,
      warnings,
      stats: {
        nodes: graph.nodes.length,
        spaces: graph.spaces.length,
        terminology: graph.meta.terminology,
        coverageContracts: Array.isArray(graph.coverageContracts) ? graph.coverageContracts.length : 0
      },
      checkedAt: new Date().toISOString()
    };
  }

  const API = { VERSION, TERMINOLOGY, normalizePatternGraph, validatePatternGraph, isCountedOutput, consumedTargets };
  ROOT.CROCHET_PATTERN_CORE_VERSION = VERSION;
  ROOT.CROCHET_TERMINOLOGY = TERMINOLOGY;
  ROOT.normalizeCrochetPatternGraph = normalizePatternGraph;
  ROOT.validateCrochetPatternGraph = validatePatternGraph;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
