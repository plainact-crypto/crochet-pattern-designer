// Pattern Core v1 — domain-first structural validation for crochet pattern graphs.
// This module is intentionally renderer-agnostic. Charts/PDFs are views of a validated pattern graph.
(() => {
  'use strict';

  const VERSION = '1.0.0';
  const US_STITCHES = new Set([
    'ring','chain','slip','single','half','double','treble','dtr',
    'picot','puff','bobble','cluster','shell'
  ]);

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

  function validatePatternGraph(input, options = {}) {
    const graph = normalizePatternGraph(input);
    const errors = [];
    const warnings = [];
    const add = x => (x.severity === 'warning' ? warnings : errors).push(x);
    const nodeIds = new Set();
    const spaceIds = new Set();
    const nodeById = new Map();
    const spaceById = new Map();

    if (!graph.nodes.length) add(issue('PATTERN_EMPTY', 'Pattern has no crochet operations/stitches.'));
    if (!['US','UK'].includes(graph.meta.terminology)) {
      add(issue('TERMINOLOGY_UNKNOWN', 'Pattern terminology must explicitly be US or UK.'));
    }

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
    }

    for (const s of graph.spaces) {
      if (!s?.id || typeof s.id !== 'string') { add(issue('SPACE_ID_MISSING', 'Every chain-space/topological space needs a stable id.')); continue; }
      if (spaceIds.has(s.id) || nodeIds.has(s.id)) add(issue('SPACE_ID_DUPLICATE', `Duplicate/colliding space id: ${s.id}`));
      spaceIds.add(s.id); spaceById.set(s.id, s);
    }

    const targetExists = id => nodeIds.has(id) || spaceIds.has(id);
    for (const n of graph.nodes) {
      if (!n?.id) continue;
      if (n.workedInto && !targetExists(n.workedInto)) add(issue('WORKED_INTO_MISSING', `workedInto target does not exist: ${n.workedInto}`, n.id));
      if (n.anchor && !nodeIds.has(n.anchor)) add(issue('ANCHOR_MISSING', `anchor node does not exist: ${n.anchor}`, n.id));
      if (n.workedInto === n.id) add(issue('WORKED_INTO_SELF', 'A stitch cannot be worked into itself.', n.id));
      if (n.anchor === n.id) add(issue('ANCHOR_SELF', 'A stitch cannot anchor itself.', n.id));

      if (n.workedInto && nodeById.has(n.workedInto)) {
        const base = nodeById.get(n.workedInto);
        const nStep = Number.isInteger(n.round) ? n.round : (Number.isInteger(n.row) ? n.row : null);
        const bStep = Number.isInteger(base.round) ? base.round : (Number.isInteger(base.row) ? base.row : null);
        if (nStep != null && bStep != null && bStep > nStep) add(issue('FORWARD_REFERENCE', 'A stitch cannot be worked into a future row/round.', n.id));
      }
    }

    // Validate explicit chain-space topology when present.
    for (const s of graph.spaces) {
      if (!s?.id) continue;
      if (!Array.isArray(s.chainIds) || !s.chainIds.length) {
        add(issue('SPACE_CHAIN_EMPTY', `Space ${s.id} does not declare its chain stitches.`));
        continue;
      }
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

    // Optional explicit stitch-count contracts. These are the bridge from pattern generation to proof.
    // Example: graph.countContracts = [{ stepType:'round', step:1, count:10, include:['single'] }]
    if (Array.isArray(graph.countContracts)) {
      for (const c of graph.countContracts) {
        const key = c.stepType === 'row' ? 'row' : 'round';
        let found = graph.nodes.filter(n => n[key] === c.step);
        if (Array.isArray(c.include) && c.include.length) found = found.filter(n => c.include.includes(n.type));
        if (Array.isArray(c.exclude) && c.exclude.length) found = found.filter(n => !c.exclude.includes(n.type));
        if (!Number.isInteger(c.count) || c.count < 0) add(issue('COUNT_CONTRACT_INVALID', `Invalid count contract for ${key} ${c.step}.`));
        else if (found.length !== c.count) add(issue('COUNT_CONTRACT_FAIL', `${key} ${c.step} expected ${c.count} operations but found ${found.length}.`));
      }
    }

    // Physical-output requirements. They are warnings during R&D, but become errors for SELLABLE validation.
    const sellable = options.level === 'sellable' || graph.meta.supportStatus === 'VERIFIED';
    const physical = [
      ['gauge','GAUGE_MISSING','Gauge/tension is not declared.'],
      ['yarn','YARN_MISSING','Yarn specification/weight is not declared.'],
      ['hook','HOOK_MISSING','Hook size is not declared.']
    ];
    for (const [field, code, message] of physical) {
      if (!graph.meta[field]) add(issue(code, message, null, sellable ? 'error' : 'warning'));
    }
    if (sellable && !graph.written?.trim()) add(issue('WRITTEN_PATTERN_MISSING', 'A VERIFIED/sellable pattern must include written instructions.'));
    if (sellable && !graph.meta.finishedSize) add(issue('FINISHED_SIZE_MISSING', 'A VERIFIED/sellable pattern must state finished size or explicitly state that size is user-defined.'));

    const result = {
      ok: errors.length === 0,
      sellable: sellable && errors.length === 0,
      version: VERSION,
      errors,
      warnings,
      stats: { nodes: graph.nodes.length, spaces: graph.spaces.length, terminology: graph.meta.terminology },
      checkedAt: new Date().toISOString()
    };
    return result;
  }

  window.CROCHET_PATTERN_CORE_VERSION = VERSION;
  window.CROCHET_TERMINOLOGY = TERMINOLOGY;
  window.normalizeCrochetPatternGraph = normalizePatternGraph;
  window.validateCrochetPatternGraph = validatePatternGraph;
})();
