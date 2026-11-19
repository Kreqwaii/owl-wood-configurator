(() => {
  'use strict';

  const TYPES = {
    dining: { label: 'Обеденный стол', heightCm: 75, thicknessMm: 45, factor: 1.0 },
    coffee: { label: 'Журнальный стол', heightCm: 45, thicknessMm: 40, factor: 0.86 },
    desk: { label: 'Письменный стол', heightCm: 75, thicknessMm: 40, factor: 0.94 },
    top: { label: 'Столешница (без подстолья)', heightCm: null, thicknessMm: 45, factor: 0.92 }
  };

  const WOODS = {
    karagach: {
      label: 'Карагач',
      ratePerSqm: 58000,
      densityKgPerSqm: 31,
      fillId: 'url(#wood-karagach)',
      stroke: '#6B3D1F',
      grainColor: 'rgba(64, 33, 15, 0.28)',
      innerEdgeColor: '#7C4B2A'
    },
    oak: {
      label: 'Дуб',
      ratePerSqm: 62000,
      densityKgPerSqm: 34,
      fillId: 'url(#wood-oak)',
      stroke: '#7D5B34',
      grainColor: 'rgba(92, 65, 34, 0.22)',
      innerEdgeColor: '#987246'
    },
    walnut: {
      label: 'Орех',
      ratePerSqm: 76000,
      densityKgPerSqm: 32,
      fillId: 'url(#wood-walnut)',
      stroke: '#301C13',
      grainColor: 'rgba(210, 172, 138, 0.20)',
      innerEdgeColor: '#7B5A47'
    },
    poplar: {
      label: 'Каповый тополь',
      ratePerSqm: 69000,
      densityKgPerSqm: 26,
      fillId: 'url(#wood-poplar)',
      stroke: '#8D6F44',
      grainColor: 'rgba(116, 82, 39, 0.24)',
      innerEdgeColor: '#9E7D4E'
    }
  };

  const RESINS = {
    none: { label: 'Без смолы (цельный слэб)', ratePerSqm: 0, fillId: null, stroke: null },
    clear: { label: 'Прозрачная река', ratePerSqm: 14500, fillId: 'url(#resin-clear)', stroke: '#8AA7A9' },
    smoke: { label: 'Дымчатая река', ratePerSqm: 16000, fillId: 'url(#resin-smoke)', stroke: '#4A4643' },
    black: { label: 'Черная матовая', ratePerSqm: 17500, fillId: 'url(#resin-black)', stroke: '#161311' }
  };

  const BASES = {
    trapezoid: { label: 'Лофт трапеция', baseCost: 22000, weightKg: 18 },
    'u-shape': { label: 'П-образное', baseCost: 20000, weightKg: 17 },
    cross: { label: 'Крест', baseCost: 26000, weightKg: 21 },
    solid: { label: 'Массив дерева', baseCost: 34000, weightKg: 24 }
  };

  const PRESETS = {
    'dining-river': { type: 'dining', wood: 'karagach', resin: 'clear', length: 220, width: 95, base: 'trapezoid' },
    'solid-oak': { type: 'dining', wood: 'oak', resin: 'none', length: 280, width: 105, base: 'u-shape' },
    'desk-walnut': { type: 'desk', wood: 'walnut', resin: 'smoke', length: 160, width: 76, base: 'trapezoid' },
    'coffee-poplar': { type: 'coffee', wood: 'poplar', resin: 'black', length: 110, width: 66, base: 'cross' }
  };

  const state = {
    type: 'dining',
    wood: 'karagach',
    resin: 'clear',
    length: 220,
    width: 95,
    base: 'trapezoid',
    showBaseOverlay: true,
    showGrid: true,
    activePreset: 'dining-river'
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SCALE = 1.8333; // 60 cm = 110 px

  const el = {
    rangeLength: document.getElementById('range-length'),
    rangeWidth: document.getElementById('range-width'),
    outLength: document.getElementById('out-length'),
    outWidth: document.getElementById('out-width'),
    toggleBaseOverlay: document.getElementById('toggle-base-overlay'),
    toggleGrid: document.getElementById('toggle-grid'),
    gridLayer: document.getElementById('grid-layer'),
    tableGroup: document.getElementById('table-drawing-group'),
    dimensionLines: document.getElementById('dimension-lines'),
    stampMeta: document.getElementById('stamp-meta'),
    metricDims: document.getElementById('metric-dims'),
    metricArea: document.getElementById('metric-area'),
    metricSeats: document.getElementById('metric-seats'),
    metricWeight: document.getElementById('metric-weight'),
    totalPrice: document.getElementById('total-price'),
    leadTime: document.getElementById('lead-time'),
    prepayNote: document.getElementById('prepay-note'),
    bdWood: document.getElementById('bd-wood'),
    bdArea: document.getElementById('bd-area'),
    bdResin: document.getElementById('bd-resin'),
    bdBase: document.getElementById('bd-base'),
    costWood: document.getElementById('cost-wood'),
    costResin: document.getElementById('cost-resin'),
    costBase: document.getElementById('cost-base'),
    specSummary: document.getElementById('spec-summary'),
    copySpecBtn: document.getElementById('copy-spec-btn'),
    copySpecLabel: document.getElementById('copy-spec-label'),
    baseControlGroup: document.getElementById('base-control-group'),
    baseDisabledNote: document.getElementById('base-disabled-note'),
    orderForm: document.getElementById('order-form'),
    orderConfirmation: document.getElementById('order-confirmation'),
    confirmId: document.getElementById('confirm-id'),
    mailtoTrigger: document.getElementById('mailto-trigger'),
    confirmCopyBtn: document.getElementById('confirm-copy-btn'),
    resetConfirmBtn: document.getElementById('reset-confirm-btn'),
    clientName: document.getElementById('client-name'),
    clientPhone: document.getElementById('client-phone'),
    clientComment: document.getElementById('client-comment')
  };

  function formatRub(val) {
    return Math.round(val).toLocaleString('ru-RU') + ' ₽';
  }

  function roundTo500(val) {
    return Math.round(val / 500) * 500;
  }

  function createSvgEl(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      node.setAttribute(k, String(v));
    }
    return node;
  }

  function computeEstimate() {
    const typeInfo = TYPES[state.type];
    const woodInfo = WOODS[state.wood];
    const resinInfo = RESINS[state.resin];
    const baseInfo = BASES[state.base];

    const area = (state.length * state.width) / 10000;
    const largeSlabPremium = state.length >= 260 ? 1.18 : state.length >= 220 ? 1.08 : 1.0;

    let woodCost = roundTo500(area * woodInfo.ratePerSqm * typeInfo.factor * largeSlabPremium);
    if (state.type === 'coffee') {
      woodCost = Math.max(woodCost, 34000);
    }

    const resinCost = state.resin === 'none'
      ? 0
      : roundTo500(area * resinInfo.ratePerSqm * (state.length >= 250 ? 1.12 : 1.0));

    let baseCost = 0;
    if (state.type !== 'top') {
      const lengthMultiplier = state.length > 240 ? 1.25 : state.length > 180 ? 1.1 : 1.0;
      const coffeeMultiplier = state.type === 'coffee' ? 0.8 : 1.0;
      baseCost = roundTo500(baseInfo.baseCost * lengthMultiplier * coffeeMultiplier);
    }

    const total = woodCost + resinCost + baseCost;
    const prepay = roundTo500(total * 0.5);

    let minDays = 10;
    let maxDays = 16;
    if (state.type === 'top' && state.resin === 'none') {
      minDays = 5;
      maxDays = 10;
    } else if (state.resin !== 'none') {
      minDays = state.length >= 250 ? 22 : 16;
      maxDays = state.length >= 250 ? 30 : 24;
    } else if (state.length >= 260) {
      minDays = 14;
      maxDays = 22;
    }

    const slabWeight = Math.round(area * woodInfo.densityKgPerSqm + (state.resin === 'none' ? 0 : area * 6));
    const baseWeight = state.type === 'top' ? 0 : baseInfo.weightKg;
    const totalWeight = slabWeight + baseWeight;

    let seats = '1-2 персоны';
    if (state.type === 'coffee') {
      seats = 'Гостиная зона';
    } else if (state.type === 'desk') {
      seats = state.length >= 180 ? '1-2 рабочих места' : '1 рабочее место';
    } else {
      const perSide = Math.max(1, Math.floor(state.length / 60));
      const ends = state.width >= 90 ? 2 : 0;
      const totalSeats = perSide * 2 + ends;
      seats = `${Math.max(4, totalSeats - 2)}-${totalSeats} персон`;
    }

    return {
      area,
      woodCost,
      resinCost,
      baseCost,
      total,
      prepay,
      minDays,
      maxDays,
      totalWeight,
      seats
    };
  }

  function buildSpecText(est) {
    const typeInfo = TYPES[state.type];
    const woodInfo = WOODS[state.wood];
    const resinInfo = RESINS[state.resin];
    const baseLabel = state.type === 'top' ? 'Не требуется (только столешница)' : BASES[state.base].label;
    const heightStr = typeInfo.heightCm ? `, высота ${typeInfo.heightCm} см` : '';

    return [
      `Изделие: ${typeInfo.label}`,
      `Порода дерева: ${woodInfo.label}`,
      `Габариты (Д x Ш): ${state.length} x ${state.width} см${heightStr} (${est.area.toFixed(2)} м2)`,
      `Заливка смолой: ${resinInfo.label}`,
      `Подстолье: ${baseLabel}`,
      `Финишное покрытие: натуральное масло с твердым воском`,
      `Ориентировочная смета: ${formatRub(est.total)} (предоплата 50%: ${formatRub(est.prepay)})`,
      `Срок изготовления: ${est.minDays}-${est.maxDays} рабочих дней | Гарантия: 12 мес.`
    ].join('\n');
  }

  function buildOrganicEdges(x, y, w, h) {
    // Плавные природные изгибы верхнего и нижнего живого края слэба
    const amp = Math.max(3, Math.min(8, h * 0.045));
    const topPts = [];
    const botPts = [];
    const segments = 6;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const px = x + w * t;
      const waveTop = Math.sin(t * Math.PI * 2.4 + 0.4) * amp * 0.7 + Math.cos(t * Math.PI * 4.1) * amp * 0.3;
      const waveBot = Math.cos(t * Math.PI * 2.1 + 1.1) * amp * 0.75 + Math.sin(t * Math.PI * 3.7) * amp * 0.25;
      topPts.push({ x: px, y: y + waveTop });
      botPts.push({ x: px, y: y + h + waveBot });
    }

    return { topPts, botPts };
  }

  function pointsToSmoothPath(pts, reverse = false) {
    const list = reverse ? [...pts].reverse() : pts;
    let d = '';
    for (let i = 0; i < list.length - 1; i++) {
      const p0 = list[i];
      const p1 = list[i + 1];
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      if (i === 0) {
        d += `L ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} `;
      }
      d += `Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)} `;
    }
    const last = list[list.length - 1];
    d += `L ${last.x.toFixed(1)} ${last.y.toFixed(1)} `;
    return d;
  }

  function renderBlueprint() {
    el.gridLayer.style.display = state.showGrid ? 'block' : 'none';

    const wPx = state.length * SCALE;
    const hPx = state.width * SCALE;
    const cx = 376;
    const cy = 202;
    const x = cx - wPx / 2;
    const y = cy - hPx / 2;

    el.tableGroup.innerHTML = '';
    el.dimensionLines.innerHTML = '';

    const woodInfo = WOODS[state.wood];
    const resinInfo = RESINS[state.resin];
    const { topPts, botPts } = buildOrganicEdges(x, y, wPx, hPx);

    // Тень под столешницей
    const shadowGroup = createSvgEl('g', { opacity: '0.12', transform: 'translate(4, 6)' });
    const outerD =
      `M ${topPts[0].x.toFixed(1)} ${topPts[0].y.toFixed(1)} ` +
      pointsToSmoothPath(topPts).replace(/^L [0-9.-]+ [0-9.-]+ /, '') +
      `L ${botPts[botPts.length - 1].x.toFixed(1)} ${botPts[botPts.length - 1].y.toFixed(1)} ` +
      pointsToSmoothPath(botPts, true).replace(/^L [0-9.-]+ [0-9.-]+ /, '') +
      'Z';

    shadowGroup.appendChild(createSvgEl('path', { d: outerD, fill: '#1E1A17' }));
    el.tableGroup.appendChild(shadowGroup);

    if (state.resin === 'none') {
      // Цельный слэб без смолы
      const slabPath = createSvgEl('path', {
        d: outerD,
        fill: woodInfo.fillId,
        stroke: woodInfo.stroke,
        'stroke-width': '1.6'
      });
      el.tableGroup.appendChild(slabPath);
    } else {
      // Две половинки слэба с рекой смолы посередине
      const riverCenterY = cy;
      const riverHalfWidth = Math.max(11, hPx * 0.13);
      const segments = 7;
      const riverTopPts = [];
      const riverBotPts = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const px = x + wPx * t;
        const meander = Math.sin(t * Math.PI * 2.2 - 0.3) * (hPx * 0.085);
        const swell = Math.cos(t * Math.PI * 3.1) * (riverHalfWidth * 0.28);
        riverTopPts.push({ x: px, y: riverCenterY + meander - riverHalfWidth - swell });
        riverBotPts.push({ x: px, y: riverCenterY + meander + riverHalfWidth + swell });
      }

      // Слой смолы на весь просвет + небольшой заход под кромку
      const riverD =
        `M ${riverTopPts[0].x.toFixed(1)} ${(riverTopPts[0].y - 3).toFixed(1)} ` +
        pointsToSmoothPath(riverTopPts).replace(/^L [0-9.-]+ [0-9.-]+ /, '') +
        `L ${riverBotPts[riverBotPts.length - 1].x.toFixed(1)} ${(riverBotPts[riverBotPts.length - 1].y + 3).toFixed(1)} ` +
        pointsToSmoothPath(riverBotPts, true).replace(/^L [0-9.-]+ [0-9.-]+ /, '') +
        'Z';

      el.tableGroup.appendChild(createSvgEl('path', {
        d: riverD,
        fill: resinInfo.fillId,
        stroke: resinInfo.stroke,
        'stroke-width': '1'
      }));

      // Внутренние линии живой кромки под полимером (для прозрачной и дымчатой)
      if (state.resin === 'clear' || state.resin === 'smoke') {
        const innerAlpha = state.resin === 'clear' ? '0.45' : '0.25';
        const innerTop = riverTopPts.map(p => ({ x: p.x, y: p.y + 4 }));
        const innerBot = riverBotPts.map(p => ({ x: p.x, y: p.y - 4 }));

        el.tableGroup.appendChild(createSvgEl('path', {
          d: `M ${innerTop[0].x.toFixed(1)} ${innerTop[0].y.toFixed(1)} ` + pointsToSmoothPath(innerTop).replace(/^L [0-9.-]+ [0-9.-]+ /, ''),
          fill: 'none',
          stroke: woodInfo.innerEdgeColor,
          'stroke-width': '1',
          'stroke-dasharray': '4 3',
          opacity: innerAlpha
        }));
        el.tableGroup.appendChild(createSvgEl('path', {
          d: `M ${innerBot[0].x.toFixed(1)} ${innerBot[0].y.toFixed(1)} ` + pointsToSmoothPath(innerBot).replace(/^L [0-9.-]+ [0-9.-]+ /, ''),
          fill: 'none',
          stroke: woodInfo.innerEdgeColor,
          'stroke-width': '1',
          'stroke-dasharray': '4 3',
          opacity: innerAlpha
        }));
      }

      // Верхний слэб
      const topSlabD =
        `M ${topPts[0].x.toFixed(1)} ${topPts[0].y.toFixed(1)} ` +
        pointsToSmoothPath(topPts).replace(/^L [0-9.-]+ [0-9.-]+ /, '') +
        `L ${riverTopPts[riverTopPts.length - 1].x.toFixed(1)} ${riverTopPts[riverTopPts.length - 1].y.toFixed(1)} ` +
        pointsToSmoothPath(riverTopPts, true).replace(/^L [0-9.-]+ [0-9.-]+ /, '') +
        'Z';

      // Нижний слэб
      const botSlabD =
        `M ${riverBotPts[0].x.toFixed(1)} ${riverBotPts[0].y.toFixed(1)} ` +
        pointsToSmoothPath(riverBotPts).replace(/^L [0-9.-]+ [0-9.-]+ /, '') +
        `L ${botPts[botPts.length - 1].x.toFixed(1)} ${botPts[botPts.length - 1].y.toFixed(1)} ` +
        pointsToSmoothPath(botPts, true).replace(/^L [0-9.-]+ [0-9.-]+ /, '') +
        'Z';

      el.tableGroup.appendChild(createSvgEl('path', {
        d: topSlabD,
        fill: woodInfo.fillId,
        stroke: woodInfo.stroke,
        'stroke-width': '1.6'
      }));
      el.tableGroup.appendChild(createSvgEl('path', {
        d: botSlabD,
        fill: woodInfo.fillId,
        stroke: woodInfo.stroke,
        'stroke-width': '1.6'
      }));
    }

    // Древесные волокна / каповый рисунок поверх столешницы
    const grainGroup = createSvgEl('g', { opacity: '0.85' });
    const lineCount = state.resin === 'none' ? 5 : 4;
    for (let i = 1; i <= lineCount; i++) {
      const gy = y + (hPx / (lineCount + 1)) * i;
      if (state.resin !== 'none' && Math.abs(gy - cy) < hPx * 0.14) continue;
      const gx1 = x + 14;
      const gx2 = x + wPx - 14;
      const wave = (i % 2 === 0 ? 1 : -1) * Math.min(8, hPx * 0.05);
      const d = `M ${gx1.toFixed(1)} ${gy.toFixed(1)} C ${(x + wPx * 0.35).toFixed(1)} ${(gy + wave).toFixed(1)}, ${(x + wPx * 0.65).toFixed(1)} ${(gy - wave).toFixed(1)}, ${gx2.toFixed(1)} ${(gy + wave * 0.4).toFixed(1)}`;
      grainGroup.appendChild(createSvgEl('path', {
        d,
        fill: 'none',
        stroke: woodInfo.grainColor,
        'stroke-width': '1.1',
        'stroke-linecap': 'round'
      }));
    }

    if (state.wood === 'poplar') {
      const knots = [
        { kx: x + wPx * 0.24, ky: y + hPx * 0.25, r: 9 },
        { kx: x + wPx * 0.68, ky: y + hPx * 0.76, r: 11 },
        { kx: x + wPx * 0.78, ky: y + hPx * 0.23, r: 7 }
      ];
      knots.forEach(k => {
        grainGroup.appendChild(createSvgEl('ellipse', {
          cx: k.kx.toFixed(1),
          cy: k.ky.toFixed(1),
          rx: k.r,
          ry: (k.r * 0.65).toFixed(1),
          fill: 'none',
          stroke: woodInfo.grainColor,
          'stroke-width': '1'
        }));
      });
    }
    el.tableGroup.appendChild(grainGroup);

    // Проекция подстолья пунктиром
    if (state.showBaseOverlay && state.type !== 'top') {
      const baseOverlay = createSvgEl('g', {
        stroke: '#1E1A17',
        'stroke-width': '1.3',
        'stroke-dasharray': '5 4',
        fill: 'none',
        opacity: '0.68'
      });

      const insetX = Math.max(24, wPx * 0.14);
      const legW = Math.max(10, Math.min(18, wPx * 0.035));
      const legH = hPx * 0.74;
      const ly = cy - legH / 2;

      if (state.base === 'trapezoid' || state.base === 'u-shape') {
        const leftX = x + insetX;
        const rightX = x + wPx - insetX - legW;
        baseOverlay.appendChild(createSvgEl('rect', {
          x: leftX.toFixed(1),
          y: ly.toFixed(1),
          width: legW.toFixed(1),
          height: legH.toFixed(1),
          rx: '2'
        }));
        baseOverlay.appendChild(createSvgEl('rect', {
          x: rightX.toFixed(1),
          y: ly.toFixed(1),
          width: legW.toFixed(1),
          height: legH.toFixed(1),
          rx: '2'
        }));
        if (state.base === 'trapezoid') {
          // Указание наклона стоек трапеции
          baseOverlay.appendChild(createSvgEl('rect', {
            x: (leftX - 6).toFixed(1),
            y: (ly + 10).toFixed(1),
            width: (legW + 12).toFixed(1),
            height: (legH - 20).toFixed(1),
            rx: '2',
            opacity: '0.5'
          }));
          baseOverlay.appendChild(createSvgEl('rect', {
            x: (rightX - 6).toFixed(1),
            y: (ly + 10).toFixed(1),
            width: (legW + 12).toFixed(1),
            height: (legH - 20).toFixed(1),
            rx: '2',
            opacity: '0.5'
          }));
        }
      } else if (state.base === 'cross') {
        const cxLeft = x + wPx * 0.22;
        const cxRight = x + wPx * 0.78;
        baseOverlay.appendChild(createSvgEl('line', {
          x1: cxLeft.toFixed(1), y1: ly.toFixed(1),
          x2: cxRight.toFixed(1), y2: (ly + legH).toFixed(1)
        }));
        baseOverlay.appendChild(createSvgEl('line', {
          x1: cxLeft.toFixed(1), y1: (ly + legH).toFixed(1),
          x2: cxRight.toFixed(1), y2: ly.toFixed(1)
        }));
        baseOverlay.appendChild(createSvgEl('rect', {
          x: cxLeft.toFixed(1),
          y: ly.toFixed(1),
          width: (cxRight - cxLeft).toFixed(1),
          height: legH.toFixed(1),
          opacity: '0.45'
        }));
      } else if (state.base === 'solid') {
        const solidW = Math.max(16, Math.min(26, wPx * 0.05));
        const leftX = x + insetX;
        const rightX = x + wPx - insetX - solidW;
        baseOverlay.appendChild(createSvgEl('rect', {
          x: leftX.toFixed(1),
          y: ly.toFixed(1),
          width: solidW.toFixed(1),
          height: legH.toFixed(1),
          rx: '2'
        }));
        baseOverlay.appendChild(createSvgEl('rect', {
          x: rightX.toFixed(1),
          y: ly.toFixed(1),
          width: solidW.toFixed(1),
          height: legH.toFixed(1),
          rx: '2'
        }));
        // Деревянная царга между опорами
        baseOverlay.appendChild(createSvgEl('rect', {
          x: (leftX + solidW).toFixed(1),
          y: (cy - 6).toFixed(1),
          width: Math.max(10, rightX - (leftX + solidW)).toFixed(1),
          height: '12'
        }));
      }

      el.tableGroup.appendChild(baseOverlay);
    }

    // Размерные выносные линии
    const dimColor = '#8C4A27';
    const topDimY = y - 24;

    // Горизонтальный размер (Длина)
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: x.toFixed(1), y1: (y - 6).toFixed(1),
      x2: x.toFixed(1), y2: (topDimY - 6).toFixed(1),
      stroke: dimColor, 'stroke-width': '1'
    }));
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: (x + wPx).toFixed(1), y1: (y - 6).toFixed(1),
      x2: (x + wPx).toFixed(1), y2: (topDimY - 6).toFixed(1),
      stroke: dimColor, 'stroke-width': '1'
    }));
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: x.toFixed(1), y1: topDimY.toFixed(1),
      x2: (x + wPx).toFixed(1), y2: topDimY.toFixed(1),
      stroke: dimColor, 'stroke-width': '1.2'
    }));
    // Засечки 45 градусов
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: (x - 4).toFixed(1), y1: (topDimY + 4).toFixed(1),
      x2: (x + 4).toFixed(1), y2: (topDimY - 4).toFixed(1),
      stroke: dimColor, 'stroke-width': '1.4'
    }));
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: (x + wPx - 4).toFixed(1), y1: (topDimY + 4).toFixed(1),
      x2: (x + wPx + 4).toFixed(1), y2: (topDimY - 4).toFixed(1),
      stroke: dimColor, 'stroke-width': '1.4'
    }));

    const lenBg = createSvgEl('rect', {
      x: (cx - 34).toFixed(1),
      y: (topDimY - 12).toFixed(1),
      width: '68',
      height: '18',
      rx: '3',
      fill: '#FCFBF8'
    });
    const lenText = createSvgEl('text', {
      x: cx.toFixed(1),
      y: (topDimY + 1).toFixed(1),
      'text-anchor': 'middle',
      fill: '#1E1A17',
      'font-family': 'JetBrains Mono, monospace',
      'font-size': '11.5',
      'font-weight': '600'
    });
    lenText.textContent = `${state.length} см`;
    el.dimensionLines.appendChild(lenBg);
    el.dimensionLines.appendChild(lenText);

    // Вертикальный размер (Ширина)
    const rightDimX = x + wPx + 26;
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: (x + wPx + 6).toFixed(1), y1: y.toFixed(1),
      x2: (rightDimX + 6).toFixed(1), y2: y.toFixed(1),
      stroke: dimColor, 'stroke-width': '1'
    }));
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: (x + wPx + 6).toFixed(1), y1: (y + hPx).toFixed(1),
      x2: (rightDimX + 6).toFixed(1), y2: (y + hPx).toFixed(1),
      stroke: dimColor, 'stroke-width': '1'
    }));
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: rightDimX.toFixed(1), y1: y.toFixed(1),
      x2: rightDimX.toFixed(1), y2: (y + hPx).toFixed(1),
      stroke: dimColor, 'stroke-width': '1.2'
    }));
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: (rightDimX - 4).toFixed(1), y1: (y + 4).toFixed(1),
      x2: (rightDimX + 4).toFixed(1), y2: (y - 4).toFixed(1),
      stroke: dimColor, 'stroke-width': '1.4'
    }));
    el.dimensionLines.appendChild(createSvgEl('line', {
      x1: (rightDimX - 4).toFixed(1), y1: (y + hPx + 4).toFixed(1),
      x2: (rightDimX + 4).toFixed(1), y2: (y + hPx - 4).toFixed(1),
      stroke: dimColor, 'stroke-width': '1.4'
    }));

    const widBg = createSvgEl('rect', {
      x: (rightDimX + 8).toFixed(1),
      y: (cy - 10).toFixed(1),
      width: '48',
      height: '20',
      rx: '3',
      fill: '#FCFBF8'
    });
    const widText = createSvgEl('text', {
      x: (rightDimX + 12).toFixed(1),
      y: (cy + 4).toFixed(1),
      fill: '#1E1A17',
      'font-family': 'JetBrains Mono, monospace',
      'font-size': '11.5',
      'font-weight': '600'
    });
    widText.textContent = `${state.width} см`;
    el.dimensionLines.appendChild(widBg);
    el.dimensionLines.appendChild(widText);
  }

  function syncUI() {
    // Синхронизация кнопок выбора
    document.querySelectorAll('.option-card[data-group]').forEach(btn => {
      const group = btn.dataset.group;
      const val = btn.dataset.value;
      const selected = state[group] === val;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });

    // Подстолье для столешницы
    const isTopOnly = state.type === 'top';
    el.baseControlGroup.classList.toggle('is-muted', isTopOnly);
    el.baseDisabledNote.hidden = !isTopOnly;
    document.querySelectorAll('#base-options .option-card').forEach(btn => {
      btn.disabled = isTopOnly;
    });

    // Пресеты
    document.querySelectorAll('.preset-chip[data-preset]').forEach(chip => {
      chip.classList.toggle('is-active', chip.dataset.preset === state.activePreset);
    });

    // Слайдеры
    el.rangeLength.value = state.length;
    el.rangeWidth.value = state.width;
    el.outLength.textContent = `${state.length} см`;
    el.outWidth.textContent = `${state.width} см`;

    const est = computeEstimate();

    el.stampMeta.textContent = `${state.length} x ${state.width} СМ | ${est.area.toFixed(2)} М2`;
    el.metricDims.textContent = `${state.length} x ${state.width} см`;
    el.metricArea.textContent = `${est.area.toFixed(2)} м2`;
    el.metricSeats.textContent = est.seats;
    el.metricWeight.textContent = `~${est.totalWeight} кг`;

    el.totalPrice.textContent = formatRub(est.total);
    el.leadTime.textContent = `${est.minDays}-${est.maxDays} раб. дней`;
    el.prepayNote.textContent = `Предоплата 50% по договору: ${formatRub(est.prepay)}`;

    el.bdWood.textContent = WOODS[state.wood].label;
    el.bdArea.textContent = `${est.area.toFixed(2)} м2`;
    el.bdResin.textContent = RESINS[state.resin].label;
    el.bdBase.textContent = isTopOnly ? 'не включено' : BASES[state.base].label;

    el.costWood.textContent = formatRub(est.woodCost);
    el.costResin.textContent = est.resinCost === 0 ? '0 ₽' : formatRub(est.resinCost);
    el.costBase.textContent = est.baseCost === 0 ? '0 ₽' : formatRub(est.baseCost);

    el.specSummary.textContent = buildSpecText(est);

    renderBlueprint();
  }

  function applyPreset(presetKey) {
    const p = PRESETS[presetKey];
    if (!p) return;
    state.type = p.type;
    state.wood = p.wood;
    state.resin = p.resin;
    state.length = p.length;
    state.width = p.width;
    state.base = p.base;
    state.activePreset = presetKey;
    syncUI();
  }

  function copyTextToClipboard(text, labelEl, defaultLabel) {
    const finish = () => {
      if (labelEl) {
        labelEl.textContent = 'Спецификация скопирована';
        setTimeout(() => {
          labelEl.textContent = defaultLabel;
        }, 2200);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(finish).catch(() => {
        fallbackCopy(text);
        finish();
      });
    } else {
      fallbackCopy(text);
      finish();
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (_) {}
    document.body.removeChild(ta);
  }

  function bindEvents() {
    document.querySelectorAll('.option-card[data-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        const val = btn.dataset.value;
        state[group] = val;
        state.activePreset = null;

        // Умная подстройка комфортных габаритов при смене типа с обеденного на журнальный и обратно
        if (group === 'type') {
          if (val === 'coffee' && state.length > 150) {
            state.length = 115;
            state.width = 68;
          } else if (val === 'desk' && state.length > 200) {
            state.length = 160;
            state.width = 78;
          } else if ((val === 'dining' || val === 'top') && state.length < 150) {
            state.length = 210;
            state.width = 95;
          }
        }

        syncUI();
      });
    });

    document.querySelectorAll('.preset-chip[data-preset]').forEach(chip => {
      chip.addEventListener('click', () => applyPreset(chip.dataset.preset));
    });

    el.rangeLength.addEventListener('input', () => {
      state.length = Number(el.rangeLength.value);
      state.activePreset = null;
      syncUI();
    });

    el.rangeWidth.addEventListener('input', () => {
      state.width = Number(el.rangeWidth.value);
      state.activePreset = null;
      syncUI();
    });

    el.toggleBaseOverlay.addEventListener('change', () => {
      state.showBaseOverlay = el.toggleBaseOverlay.checked;
      renderBlueprint();
    });

    el.toggleGrid.addEventListener('change', () => {
      state.showGrid = el.toggleGrid.checked;
      renderBlueprint();
    });

    el.copySpecBtn.addEventListener('click', () => {
      copyTextToClipboard(el.specSummary.textContent, el.copySpecLabel, 'Скопировать спецификацию');
    });

    document.querySelectorAll('.load-sample-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.type = btn.dataset.type || 'dining';
        state.wood = btn.dataset.wood || 'oak';
        state.resin = btn.dataset.resin || 'none';
        state.length = Math.min(320, Math.max(100, Number(btn.dataset.length) || 280));
        state.width = Math.min(120, Math.max(60, Number(btn.dataset.width) || 100));
        state.base = btn.dataset.base || 'trapezoid';
        state.activePreset = null;
        syncUI();
        document.getElementById('configurator').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    el.orderForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = el.clientName.value.trim();
      const phone = el.clientPhone.value.trim();
      const comment = el.clientComment.value.trim();

      el.clientName.classList.toggle('is-invalid', !name);
      el.clientPhone.classList.toggle('is-invalid', !phone);

      if (!name || !phone) {
        if (!name) el.clientName.focus();
        else el.clientPhone.focus();
        return;
      }

      const orderCode = 'OWL-' + Math.floor(1000 + Math.random() * 9000);
      el.confirmId.textContent = orderCode;

      const bodyLines = [
        `Заявка на расчет стола из слэба (${orderCode})`,
        `Клиент: ${name}`,
        `Телефон: ${phone}`,
        comment ? `Комментарий: ${comment}` : null,
        '',
        el.specSummary.textContent
      ].filter(v => v !== null).join('\n');

      const subject = encodeURIComponent(`Заявка на стол из слэба ${orderCode} (${WOODS[state.wood].label} ${state.length}x${state.width})`);
      const body = encodeURIComponent(bodyLines);
      el.mailtoTrigger.href = `mailto:zakaz@owl-wood.ru?subject=${subject}&body=${body}`;
      el.orderConfirmation.dataset.fullText = bodyLines;

      el.orderForm.hidden = true;
      el.orderConfirmation.hidden = false;
    });

    el.confirmCopyBtn.addEventListener('click', () => {
      const text = el.orderConfirmation.dataset.fullText || el.specSummary.textContent;
      copyTextToClipboard(text, el.confirmCopyBtn, 'Скопировать текст заявки');
    });

    el.resetConfirmBtn.addEventListener('click', () => {
      el.orderConfirmation.hidden = true;
      el.orderForm.hidden = false;
    });
  }

  bindEvents();
  syncUI();
})();
