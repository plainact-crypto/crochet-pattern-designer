// Strict grid-native renderer for generated flower charts.
// Source of truth: integer gridCol/gridRow on the board's 24px grid.
(() => {
  const CELL = 24;
  if (typeof render !== 'function' || typeof board === 'undefined') return;

  const roundInt = v => Math.round(v);
  const angleForPetal = (index, count) => -Math.PI / 2 + index * (Math.PI * 2 / count);
  const polarCell = (cx, cy, radiusCells, angle) => ({
    col: roundInt(cx + Math.cos(angle) * radiusCells),
    row: roundInt(cy + Math.sin(angle) * radiusCells)
  });

  function petalTemplate(length) {
    if (length === 5) return [
      {t:-2,r:1},{t:-1,r:2},{t:0,r:3},{t:1,r:2},{t:2,r:1}
    ];
    if (length === 8) return [
      {t:-4,r:1},{t:-3,r:2},{t:-2,r:3},{t:-1,r:4},
      {t:1,r:4},{t:2,r:3},{t:3,r:2},{t:4,r:1}
    ];
    // medium/default 6-stitch petal
    return [
      {t:-3,r:1},{t:-2,r:2},{t:-1,r:3},
      {t:1,r:3},{t:2,r:2},{t:3,r:1}
    ];
  }

  function setGrid(it, col, row) {
    it.gridCol = roundInt(col);
    it.gridRow = roundInt(row);
    it.gridX = it.gridCol;
    it.gridY = it.gridRow;
    it.gridCellPx = CELL;
    it.coordinateSystem = 'grid-index';
    it.xPx = it.gridCol * CELL;
    it.yPx = it.gridRow * CELL;
    it.x = (it.xPx / Math.max(board.clientWidth || 2200, 1)) * 100;
    it.y = it.yPx;
  }

  function orientFootTo(it, anchor) {
    if (!anchor) return;
    const dx = anchor.gridCol - it.gridCol;
    const dy = anchor.gridRow - it.gridRow;
    if (!dx && !dy) return;
    const targetDeg = Math.atan2(dy, dx) * 180 / Math.PI;
    // Crochet post symbols are authored vertically with their foot at the bottom.
    it.rotation = targetDeg - 90;
  }

  function layoutGeneratedFlower(list) {
    const gen = list.filter(i => i?.generatedPattern && i.patternKind === 'flower');
    if (!gen.length) return {ok:true, errors:[]};

    const center = gen.find(i => i.role === 'start' && i.type === 'ring');
    if (!center) return {ok:false, errors:['Missing Magic Ring center.']};

    // Keep the chart centered on an integer grid point.
    const cx = Number.isInteger(center.gridCol) ? center.gridCol : roundInt((board.clientWidth || 2200) / CELL / 2);
    const cy = Number.isInteger(center.gridRow) ? center.gridRow : 21;
    setGrid(center, cx, cy);

    const petalIds = [...new Set(gen.map(i => i.petal).filter(Number.isFinite))];
    const P = window.activeCrochetGraph?.params?.petals || Math.max(1, ...petalIds);
    const anchors = new Map();
    const spaces = new Map();

    // Round 1: sc anchors sit two cells from MR.
    for (let p = 1; p <= P; p++) {
      const a = angleForPetal(p - 1, P);
      const sc = gen.find(i => i.role === 'petal-anchor' && i.petal === p);
      if (!sc) continue;
      const pos = polarCell(cx, cy, 2, a);
      setGrid(sc, pos.col, pos.row);
      orientFootTo(sc, center);
      anchors.set(p, sc);
    }

    // ch-3 space p lives BETWEEN anchor p and anchor p+1.
    for (let p = 1; p <= P; p++) {
      const a0 = angleForPetal(p - 1, P);
      const a1Raw = angleForPetal(p % P, P);
      let delta = a1Raw - a0;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const chains = gen
        .filter(i => i.type === 'chain' && i.sourceRegion === `space-${p}`)
        .sort((a,b) => (a.orderInPath ?? a.col ?? 0) - (b.orderInPath ?? b.col ?? 0));
      chains.forEach((ch, index) => {
        const t = (index + 1) / (chains.length + 1);
        const aa = a0 + delta * t;
        const pos = polarCell(cx, cy, 4, aa);
        setGrid(ch, pos.col, pos.row);
        ch.rotation = aa * 180 / Math.PI + 90;
      });
      const middle = chains[Math.floor(chains.length / 2)] || chains[0];
      if (middle) spaces.set(p, middle);
    }

    // Round 1 join belongs exactly on first sc anchor.
    const r1Join = gen.find(i => i.round === 1 && i.role === 'join' && i.type === 'slip');
    const firstAnchor = anchors.get(1);
    if (r1Join && firstAnchor) {
      setGrid(r1Join, firstAnchor.gridCol, firstAnchor.gridRow);
      r1Join.rotation = firstAnchor.rotation || 0;
    }

    // Round 2: every petal is a discrete symmetric grid template around its ch-3 space.
    for (let p = 1; p <= P; p++) {
      const space = spaces.get(p);
      if (!space) continue;
      const a0 = angleForPetal(p - 1, P);
      const a1Raw = angleForPetal(p % P, P);
      let delta = a1Raw - a0;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const axis = a0 + delta / 2;
      const ux = Math.cos(axis), uy = Math.sin(axis);      // outward radial axis
      const tx = -Math.sin(axis), ty = Math.cos(axis);    // tangent axis

      const petal = gen
        .filter(i => i.role === 'petal-stitch' && i.petal === p)
        .sort((a,b) => (a.orderInPath ?? a.col ?? 0) - (b.orderInPath ?? b.col ?? 0));
      const tpl = petalTemplate(petal.length);
      petal.forEach((st, index) => {
        const q = tpl[index] || tpl[tpl.length - 1];
        const col = space.gridCol + tx * q.t + ux * q.r;
        const row = space.gridRow + ty * q.t + uy * q.r;
        setGrid(st, col, row);
        orientFootTo(st, space);
      });

      const separator = gen.find(i => i.petal === p && (i.role === 'petal-separator' || i.role === 'finish'));
      const nextAnchor = anchors.get((p % P) + 1);
      if (separator && nextAnchor) {
        setGrid(separator, nextAnchor.gridCol, nextAnchor.gridRow);
        separator.rotation = nextAnchor.rotation || 0;
      }
    }

    const errors = [];
    for (const it of gen) {
      if (!Number.isInteger(it.gridCol) || !Number.isInteger(it.gridRow)) errors.push(`${it.id}: non-integer grid coordinate`);
      if (it.xPx !== it.gridCol * CELL || it.yPx !== it.gridRow * CELL) errors.push(`${it.id}: pixel/grid mismatch`);
    }

    // Reject accidental duplicate centers except deliberate slip-stitch joins sharing an anchor.
    const occupancy = new Map();
    for (const it of gen) {
      const k = `${it.gridCol},${it.gridRow}`;
      const arr = occupancy.get(k) || [];
      arr.push(it);
      occupancy.set(k, arr);
    }
    for (const [k, arr] of occupancy) {
      const nonSlip = arr.filter(i => i.type !== 'slip');
      if (nonSlip.length > 1) errors.push(`Grid collision at ${k}: ${nonSlip.map(i=>i.type).join(', ')}`);
    }
    return {ok:!errors.length, errors};
  }

  function applyDomGrid() {
    const els = [...board.querySelectorAll('.placed')];
    items.forEach((it, index) => {
      if (!it?.generatedPattern || !Number.isInteger(it.gridCol) || !Number.isInteger(it.gridRow)) return;
      const el = els[index];
      if (!el) return;
      el.style.left = `${it.gridCol * CELL}px`;
      el.style.top = `${it.gridRow * CELL}px`;
      el.style.width = `${CELL}px`;
      el.style.height = `${CELL}px`;
      el.style.zIndex = '2';
    });
    // No spider/helper topology lines in final crochet charts.
    board.querySelectorAll('.crochet-topology-overlay,.path-guide').forEach(n => n.remove());
  }

  const previousRender = render;
  render = function() {
    if (Array.isArray(items) && items.some(i => i?.generatedPattern && i.patternKind === 'flower')) {
      const check = layoutGeneratedFlower(items);
      board.dataset.generatedFlowerGridValid = check.ok ? 'true' : 'false';
      if (!check.ok) console.error('Generated flower grid validation failed', check.errors);
    }
    previousRender();
    applyDomGrid();
  };

  window.layoutGeneratedFlowerOnGrid = layoutGeneratedFlower;
})();
