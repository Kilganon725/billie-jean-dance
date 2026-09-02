/* ============================================================
 * Billie Jean Dance — MJ 小人模型引擎 (SVG 正向运动学)
 * 有粗细的四肢(胶囊)、躯干/髋部宽度、礼帽、单只白手套、
 * 10 个彩色关节标记 + 中文标签，驱动关节可高亮脉动。
 * 关节角度 → 坐标，GSAP 在 onUpdate 里逐帧驱动。
 * ============================================================ */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var VIEW = '0 0 240 240';

  // ---- 身体比例与配色（MJ 风：黑外套/黑裤/白袜/黑皮鞋/白手套/礼帽）----
  var C = {
    hipX: 120, hipY: 136,          // 髋心（全局 y 向下）
    shoulderHalf: 15, hipHalf: 8.5, // 半肩宽 / 半髋宽
    torso: 50, neck: 7,             // 髋心→肩心 / 肩→颈顶
    headR: 11.5,
    upperArm: 25, foreArm: 21, handR: 4.8,
    thigh: 31, shin: 29,            // 踝 y ≈ 196
    footLen: 16, shoeW: 8.5,
    skin: '#ecb98d',
    hair: '#1b1b22',
    jacket: '#26262e', jacketEdge: '#141419', belt: '#101014',
    shirt: '#efeae0',
    pants: '#1d1d24',
    sock: '#f2efe6',
    shoe: '#0e0e13',
    glove: '#f7f4ec',
    hatC: '#15151a', hatBand: '#8a6d2f',
  };

  var JOINT_DEF = {
    shoulder: { cn: '肩', en: 'Shoulder', color: '#ff6b6b' },
    elbow:    { cn: '肘', en: 'Elbow',    color: '#ffa94d' },
    wrist:    { cn: '腕', en: 'Wrist',    color: '#ffd43b' },
    hip:      { cn: '髋', en: 'Hip',      color: '#c084fc' },
    knee:     { cn: '膝', en: 'Knee',     color: '#60a5fa' },
    ankle:    { cn: '踝', en: 'Ankle',    color: '#4ade80' },
  };
  var SIDES = ['L', 'R'];

  var rad = function (d) { return d * Math.PI / 180; };
  function rot(x, y, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: x * c - y * s, y: x * s + y * c };
  }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---------------- 正向运动学：姿态 → 全部关节点 ---------------- */
  function fk(p) {
    var leanA = rad(p.lean || 0);
    var hipC = { x: C.hipX + (p.x || 0), y: C.hipY + (p.y || 0) };
    // 躯干轴线（髋心→肩心），lean 为侧倾
    var axis = rot(0, -C.torso, leanA);
    var perp = rot(1, 0, leanA); // 屏幕水平方向
    var shoulderC = { x: hipC.x + axis.x, y: hipC.y + axis.y };
    var shL = { x: shoulderC.x - perp.x * C.shoulderHalf, y: shoulderC.y - perp.y * C.shoulderHalf };
    var shR = { x: shoulderC.x + perp.x * C.shoulderHalf, y: shoulderC.y + perp.y * C.shoulderHalf };
    // 脖子 & 头（headTilt 绕颈顶旋转）
    var neckUnit = { x: axis.x / C.torso, y: axis.y / C.torso };
    var neckTop = { x: shoulderC.x + neckUnit.x * C.neck, y: shoulderC.y + neckUnit.y * C.neck };
    var tiltA = rad(p.headTilt || 0);
    var headOff = rot(0, -(C.headR + 2.5), tiltA);
    var headC = { x: neckTop.x + headOff.x, y: neckTop.y + headOff.y };
    var hipL = { x: hipC.x - perp.x * C.hipHalf, y: hipC.y - perp.y * C.hipHalf };
    var hipR = { x: hipC.x + perp.x * C.hipHalf, y: hipC.y + perp.y * C.hipHalf };

    // 手臂：肩 → 肘 → 手（角度 0=向下，正=朝右，180=朝上）
    function arm(base, angDeg, bendDeg) {
      var d1 = rot(0, 1, rad(angDeg));
      var E = { x: base.x + d1.x * C.upperArm, y: base.y + d1.y * C.upperArm };
      var d2 = rot(d1.x, d1.y, rad(bendDeg));
      var H = { x: E.x + d2.x * C.foreArm, y: E.y + d2.y * C.foreArm };
      return { E: E, H: H };
    }
    // 腿：髋 → 膝 → 踝（屈膝时小腿视觉缩短；脚为小斜块）
    function leg(base, angDeg, bendDeg, side) {
      var d1 = rot(0, 1, rad(angDeg));
      var K = { x: base.x + d1.x * C.thigh, y: base.y + d1.y * C.thigh };
      var b = Math.max(0, Math.min(bendDeg || 0, 115));
      var eff = C.shin * (1 - 0.42 * b / 115);
      var d2 = rot(d1.x, d1.y, rad(b * 0.55));
      var A = { x: K.x + d2.x * eff, y: K.y + d2.y * eff };
      // 鞋：从踝部向外下方的小斜块
      var sd = rot(side * 4.5, 9.5, 0);
      var shoeTip = { x: A.x + sd.x, y: A.y + sd.y };
      return { K: K, A: A, shoeTip: shoeTip };
    }

    var aL = arm(shL, p.shL || 0, p.elL || 0);
    var aR = arm(shR, p.shR || 0, p.elR || 0);
    var gL = leg(hipL, p.hipL || 0, p.kneeL || 0, -1);
    var gR = leg(hipR, p.hipR || 0, p.kneeR || 0, 1);

    return {
      hipC: hipC, shoulderC: shoulderC, neckTop: neckTop, headC: headC,
      shL: shL, shR: shR, hipL: hipL, hipR: hipR,
      aL: aL, aR: aR, gL: gL, gR: gR,
      joints: {
        shoulderL: shL, shoulderR: shR,
        elbowL: aL.E, elbowR: aR.E,
        wristL: aL.H, wristR: aR.H,
        hipL: hipL, hipR: hipR,
        kneeL: gL.K, kneeR: gR.K,
        ankleL: gL.A, ankleR: gR.A,
      },
    };
  }

  /* ---------------- 在 svg 里创建完整小人 ---------------- */
  function createFigure(svg, opts) {
    opts = opts || {};
    var root = el('g', { 'class': 'bj-root' }, svg);
    var fig = { root: root };

    // 带色胶囊线段
    function cap(cls, color, w) {
      var e = el('path', { 'class': cls }, root);
      e.setAttribute('stroke', color);
      e.setAttribute('stroke-width', w);
      e.setAttribute('stroke-linecap', 'round');
      e.setAttribute('fill', 'none');
      return e;
    }
    // 腿（后层）
    fig.thighL = cap('bj-thighL', C.pants, 11);
    fig.shinL = cap('bj-shinL', C.pants, 9.5);
    fig.sockL = cap('bj-sockL', C.sock, 7.5);
    fig.shoeL = cap('bj-shoeL', C.shoe, C.shoeW);
    fig.thighR = cap('bj-thighR', C.pants, 11);
    fig.shinR = cap('bj-shinR', C.pants, 9.5);
    fig.sockR = cap('bj-sockR', C.sock, 7.5);
    fig.shoeR = cap('bj-shoeR', C.shoe, C.shoeW);
    // 躯干（含腰带）
    fig.torso = el('path', { 'class': 'bj-torso' }, root);
    fig.torso.setAttribute('fill', C.jacket);
    fig.torso.setAttribute('stroke', C.jacketEdge);
    fig.torso.setAttribute('stroke-width', 1.2);
    fig.torso.setAttribute('stroke-linejoin', 'round');
    fig.belt = cap('bj-belt', C.belt, 3.4);
    // 手臂（层叠于躯干之上）
    fig.armL1 = cap('bj-armL1', C.jacket, 9.5);
    fig.armL2 = cap('bj-armL2', C.jacket, 8);
    fig.armR1 = cap('bj-armR1', C.jacket, 9.5);
    fig.armR2 = cap('bj-armR2', C.jacket, 8);
    // 手（左手肤色 / 右手白手套）
    fig.handL = el('circle', { 'class': 'bj-handL' }, root);
    fig.handL.setAttribute('r', C.handR);
    fig.handL.setAttribute('fill', C.skin);
    fig.handR = el('circle', { 'class': 'bj-handR' }, root);
    fig.handR.setAttribute('r', C.handR);
    fig.handR.setAttribute('fill', C.glove);
    fig.handR.setAttribute('stroke', '#d9d4c8');
    fig.handR.setAttribute('stroke-width', 0.8);
    // 脖子 / 头 / 头发 / 礼帽
    fig.neck = cap('bj-neck', C.skin, 9);
    fig.head = el('circle', { 'class': 'bj-head' }, root);
    fig.head.setAttribute('r', C.headR);
    fig.head.setAttribute('fill', C.skin);
    fig.hair = el('path', { 'class': 'bj-hair' }, root);
    fig.hair.setAttribute('fill', 'none');
    fig.hair.setAttribute('stroke', C.hair);
    fig.hair.setAttribute('stroke-width', 5.2);
    fig.hair.setAttribute('stroke-linecap', 'round');
    if (opts.hat) {
      fig.brim = el('ellipse', { 'class': 'bj-brim' }, root);
      fig.brim.setAttribute('fill', C.hatC);
      fig.crown = el('path', { 'class': 'bj-crown' }, root);
      fig.crown.setAttribute('fill', C.hatC);
      fig.band = el('path', { 'class': 'bj-band' }, root);
      fig.band.setAttribute('fill', 'none');
      fig.band.setAttribute('stroke', C.hatBand);
      fig.band.setAttribute('stroke-width', 2.2);
    }
    // ---- 关节标记：10 个 (肩肘腕髋膝踝 × 左右) ----
    fig.jgrps = {};
    Object.keys(JOINT_DEF).forEach(function (type) {
      SIDES.forEach(function (side) {
        var key = type + side;
        var g = el('g', { 'class': 'jgrp', 'data-j': key }, root);
        var ring = el('circle', { 'class': 'j-ring' }, g);
        ring.setAttribute('r', 4.6);
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', JOINT_DEF[type].color);
        ring.setAttribute('stroke-width', 1.7);
        var core = el('circle', { 'class': 'j-core' }, g);
        core.setAttribute('r', 2.4);
        core.setAttribute('fill', JOINT_DEF[type].color);
        var label = el('text', { 'class': 'j-label' }, g);
        label.textContent = JOINT_DEF[type].cn;
        label.setAttribute('font-size', 10);
        label.setAttribute('fill', JOINT_DEF[type].color);
        label.setAttribute('font-weight', 700);
        label.setAttribute('paint-order', 'stroke');
        label.setAttribute('stroke', '#07070b');
        label.setAttribute('stroke-width', 3);
        label.setAttribute('stroke-linejoin', 'round');
        fig.jgrps[key] = { g: g, ring: ring, core: core, label: label, side: side };
      });
    });

    // 激活关节（本动作驱动关节）→ 高亮脉动
    var active = opts.activeJoints || [];
    Object.keys(fig.jgrps).forEach(function (key) {
      var type = key.replace(/[LR]$/, '');
      if (active.indexOf(type) !== -1) fig.jgrps[key].g.classList.add('is-active');
    });

    fig._svg = svg;
    return fig;
  }

  /* ---------------- 姿态 → 更新小人所有元素 ---------------- */
  function applyPose(fig, p) {
    var f = fk(p);
    function P(e, a, b) { e.setAttribute('d', 'M ' + a.x.toFixed(2) + ' ' + a.y.toFixed(2) + ' L ' + b.x.toFixed(2) + ' ' + b.y.toFixed(2)); }
    // 腿：大腿→小腿→袜子→鞋
    P(fig.thighL, f.hipL, f.gL.K); P(fig.shinL, f.gL.K, f.gL.A);
    P(fig.sockL, f.gL.A, { x: f.gL.A.x, y: f.gL.A.y - 6 }); // 袜子向上延伸
    P(fig.shoeL, f.gL.A, f.gL.shoeTip);
    P(fig.thighR, f.hipR, f.gR.K); P(fig.shinR, f.gR.K, f.gR.A);
    P(fig.sockR, f.gR.A, { x: f.gR.A.x, y: f.gR.A.y - 6 });
    P(fig.shoeR, f.gR.A, f.gR.shoeTip);
    // 躯干 & 腰带
    fig.torso.setAttribute('d',
      'M ' + f.shL.x.toFixed(2) + ' ' + f.shL.y.toFixed(2) +
      ' L ' + f.shR.x.toFixed(2) + ' ' + f.shR.y.toFixed(2) +
      ' L ' + f.hipR.x.toFixed(2) + ' ' + f.hipR.y.toFixed(2) +
      ' L ' + f.hipL.x.toFixed(2) + ' ' + f.hipL.y.toFixed(2) + ' Z');
    P(fig.belt, f.hipL, f.hipR);
    // 手臂 & 手
    P(fig.armL1, f.shL, f.aL.E); P(fig.armL2, f.aL.E, f.aL.H);
    P(fig.armR1, f.shR, f.aR.E); P(fig.armR2, f.aR.E, f.aR.H);
    fig.handL.setAttribute('cx', f.aL.H.x.toFixed(2)); fig.handL.setAttribute('cy', f.aL.H.y.toFixed(2));
    fig.handR.setAttribute('cx', f.aR.H.x.toFixed(2)); fig.handR.setAttribute('cy', f.aR.H.y.toFixed(2));
    // 脖子 / 头 / 头发 / 礼帽
    P(fig.neck, f.shoulderC, f.neckTop);
    fig.head.setAttribute('cx', f.headC.x.toFixed(2)); fig.head.setAttribute('cy', f.headC.y.toFixed(2));
    var hR = C.headR;
    fig.hair.setAttribute('d',
      'M ' + (f.headC.x - hR * 0.82).toFixed(2) + ' ' + (f.headC.y - 1).toFixed(2) +
      ' Q ' + (f.headC.x - hR * 0.9).toFixed(2) + ' ' + (f.headC.y - hR * 1.05).toFixed(2) +
      ' ' + (f.headC.x).toFixed(2) + ' ' + (f.headC.y - hR * 0.62).toFixed(2) +
      ' Q ' + (f.headC.x + hR * 0.9).toFixed(2) + ' ' + (f.headC.y - hR * 1.05).toFixed(2) +
      ' ' + (f.headC.x + hR * 0.82).toFixed(2) + ' ' + (f.headC.y - 1).toFixed(2));
    if (fig.brim) {
      var bcy = f.headC.y - hR * 0.62;
      fig.brim.setAttribute('cx', f.headC.x.toFixed(2));
      fig.brim.setAttribute('cy', bcy.toFixed(2));
      fig.brim.setAttribute('rx', (hR * 1.5).toFixed(2));
      fig.brim.setAttribute('ry', (hR * 0.3).toFixed(2));
      fig.crown.setAttribute('d',
        'M ' + (f.headC.x - hR * 0.86).toFixed(2) + ' ' + bcy.toFixed(2) +
        ' Q ' + f.headC.x.toFixed(2) + ' ' + (bcy - hR * 1.55).toFixed(2) +
        ' ' + (f.headC.x + hR * 0.86).toFixed(2) + ' ' + bcy.toFixed(2) + ' Z');
      fig.band.setAttribute('d',
        'M ' + (f.headC.x - hR * 0.86).toFixed(2) + ' ' + bcy.toFixed(2) +
        ' Q ' + f.headC.x.toFixed(2) + ' ' + (bcy - hR * 0.62).toFixed(2) +
        ' ' + (f.headC.x + hR * 0.86).toFixed(2) + ' ' + bcy.toFixed(2));
    }
    // 关节标记
    Object.keys(fig.jgrps).forEach(function (key) {
      var j = fig.jgrps[key];
      var pt = f.joints[key];
      if (!pt) return;
      j.g.setAttribute('transform', 'translate(' + pt.x.toFixed(2) + ' ' + pt.y.toFixed(2) + ')');
      var lx = j.side === 'L' ? -9 : 9;
      j.label.setAttribute('x', lx);
      j.label.setAttribute('y', -9);
      j.label.setAttribute('text-anchor', j.side === 'L' ? 'end' : 'start');
    });
  }

  /* ---------------- 完整演示组件：小人 + 控制条 + GSAP 时间线 ---------------- */
  function demo(container, move, opts) {
    opts = opts || {};

    var stage = document.createElement('div');
    stage.className = 'demo-stage';
    container.appendChild(stage);

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', VIEW);
    svg.setAttribute('aria-hidden', 'true');
    svg.className.baseVal = 'bj-fig';
    stage.appendChild(svg);

    var activeJoints = (move.analysis && move.analysis.joints) || [];
    var fig = createFigure(svg, { hat: !!opts.hat, activeJoints: activeJoints });

    // 控制条
    var ctl = document.createElement('div');
    ctl.className = 'demo-controls';
    var btnPlay = document.createElement('button');
    btnPlay.type = 'button';
    btnPlay.className = 'dctl-play';
    btnPlay.setAttribute('aria-label', '播放 / 暂停');
    btnPlay.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path class="ic-play" d="M8 5v14l11-7z"/><path class="ic-pause" d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
    var btnReset = document.createElement('button');
    btnReset.type = 'button';
    btnReset.className = 'dctl-btn';
    btnReset.setAttribute('aria-label', '重置');
    btnReset.textContent = '↺';
    var btnMark = document.createElement('button');
    btnMark.type = 'button';
    btnMark.className = 'dctl-btn';
    btnMark.textContent = '标注';
    btnMark.setAttribute('aria-pressed', 'false');
    btnMark.addEventListener('click', function () {
      var on = stage.classList.toggle('is-labels-all');
      btnMark.classList.toggle('is-on', on);
      btnMark.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var speedWrap = document.createElement('div');
    speedWrap.className = 'dctl-speed';
    [0.5, 1, 1.5].forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dctl-btn' + (s === 1 ? ' is-on' : '');
      b.textContent = s + '×';
      b.addEventListener('click', function () {
        tl.timeScale(s);
        speedWrap.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
      speedWrap.appendChild(b);
    });
    ctl.appendChild(btnPlay);
    ctl.appendChild(btnReset);
    ctl.appendChild(btnMark);
    ctl.appendChild(speedWrap);
    container.appendChild(ctl);

    // 姿态代理 + 时间线
    var pose = Object.assign({}, BJ.BASE);
    var kfs = move.keyframes;
    Object.assign(pose, BJ.BASE, kfs[0][1]);

    var tl = gsap.timeline({
      repeat: opts.loop === false ? 0 : -1,
      defaults: { ease: 'power1.inOut' },
    });
    for (var i = 0; i < kfs.length - 1; i++) {
      var t0 = kfs[i][0], t1 = kfs[i + 1][0];
      var vars = Object.assign({}, kfs[i + 1][1]);
      vars.duration = Math.max(0.01, t1 - t0);
      vars.ease = kfs[i + 1][2] || 'power1.inOut';
      tl.to(pose, vars, t0);
    }
    // 整体旋转（转身 / 前倾）——绕 svg 原点
    var spins = move.spin || [];
    spins.forEach(function (sp) {
      tl.to(fig.root, {
        rotation: sp.to,
        svgOrigin: sp.origin || '120 100',
        duration: sp.dur,
        ease: sp.ease || 'power2.inOut',
      }, sp.at);
    });

    var kfTimes = kfs.map(function (k) { return k[0]; });
    tl.eventCallback('onUpdate', function () {
      applyPose(fig, pose);
      var t = tl.time();
      var idx = 0;
      for (var s = 0; s < kfTimes.length; s++) if (t >= kfTimes[s] - 0.001) idx = s;
      var steps = (opts.stepsScope || container).querySelectorAll('[data-step]');
      if (idx >= steps.length) idx = steps.length - 1;
      for (var j2 = 0; j2 < steps.length; j2++) steps[j2].classList.toggle('is-active', j2 === idx);
    });

    applyPose(fig, pose); // 初始姿态

    function toggle() {
      if (tl.paused()) { tl.play(); btnPlay.classList.add('is-playing'); }
      else { tl.pause(); btnPlay.classList.remove('is-playing'); }
    }
    btnPlay.addEventListener('click', toggle);
    btnReset.addEventListener('click', function () {
      tl.pause(0);
      btnPlay.classList.remove('is-playing');
    });

    if (opts.autoplay !== false) { tl.play(); btnPlay.classList.add('is-playing'); }
    else { tl.pause(0); }

    return { tl: tl, pose: pose, fig: fig };
  }

  global.BJ = {
    fk: fk,
    createFigure: createFigure,
    applyPose: applyPose,
    demo: demo,
    JOINT_DEF: JOINT_DEF,
    BASE: {
      x: 0, y: 0, lean: 0, headTilt: 0,
      shL: 0, elL: 0, shR: 0, elR: 0,
      hipL: 0, kneeL: 0, hipR: 0, kneeR: 0,
    },
  };
})(window);
