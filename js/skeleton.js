/* ============================================================
 * Billie Jean Dance — 火柴人骨骼引擎 (SVG + 正向运动学)
 * 关节角度 → 二维坐标，GSAP 在 onUpdate 里逐帧驱动
 * ============================================================ */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // 骨架比例（viewBox 0 0 200 222）
  var C = {
    hipX: 100, hipY: 118,
    torso: 56,        // 髋→肩
    upper: 26, fore: 24,   // 上臂 / 前臂
    thigh: 34, shin: 34,   // 大腿 / 小腿
    headR: 13,
    footLen: 16,
  };

  var rad = function (d) { return (d * Math.PI) / 180; };
  // 角度 0 = 竖直向下；正角度 → 屏幕右侧 (+x)；180° = 竖直向上
  var dir = function (a) { return [Math.sin(a), Math.cos(a)]; };

  /* ---------- 正向运动学：姿态 → 各关节坐标 ---------- */
  function fk(p) {
    var H = { x: C.hipX + (p.x || 0), y: C.hipY + (p.y || 0) };
    var lean = rad(p.lean || 0);
    // 躯干：绕髋部前倾/后仰
    var S = {
      x: H.x + C.torso * Math.sin(lean),
      y: H.y - C.torso * Math.cos(lean),
    };
    var head = {
      x: S.x + (p.headTilt || 0) * 3,
      y: S.y - C.headR - 3,
    };

    // 手臂：肩→肘→手
    function arm(ang, elbow) {
      var a = rad(ang);
      var d1 = dir(a);
      var E = { x: S.x + d1[0] * C.upper, y: S.y + d1[1] * C.upper };
      var b = rad(ang + elbow);
      var d2 = dir(b);
      return {
        E: E,
        H: { x: E.x + d2[0] * C.fore, y: E.y + d2[1] * C.fore },
      };
    }

    // 腿：髋→膝→踝 (+脚)。side: -1 左 / +1 右
    function leg(ang, bend, footA, side) {
      var a = rad(ang);
      var d1 = dir(a);
      var K = { x: H.x + d1[0] * C.thigh, y: H.y + d1[1] * C.thigh };
      var b = Math.min(bend, 105);
      // 屈膝时小腿在正面视角"缩短"，模拟脚向后收
      var eff = C.shin * (1 - 0.5 * (Math.max(0, b) / 105));
      var c = rad(ang + b * 0.45);
      var d2 = dir(c);
      var A = { x: K.x + d2[0] * eff, y: K.y + d2[1] * eff };
      var fa = rad(footA || 0);
      var F = {
        x: A.x + side * Math.cos(fa) * C.footLen,
        y: A.y - Math.sin(fa) * C.footLen,
      };
      return { K: K, A: A, F: F };
    }

    return {
      H: H, S: S, head: head,
      aL: arm(p.shL || 0, p.elL || 0),
      aR: arm(p.shR || 0, p.elR || 0),
      lL: leg(p.hipL || 0, p.kneeL || 0, p.footL || 0, -1),
      lR: leg(p.hipR || 0, p.kneeR || 0, p.footR || 0, 1),
    };
  }

  /* ---------- 在 svg 里创建骨骼元素 ---------- */
  function createSkeleton(svg, opts) {
    opts = opts || {};
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'bj-root');
    svg.appendChild(g);

    function line(cls) {
      var n = document.createElementNS(NS, 'line');
      n.setAttribute('class', cls || 'bj-seg');
      g.appendChild(n);
      return n;
    }

    var segs = {};
    ['spine', 'armL1', 'armL2', 'armR1', 'armR2',
      'legL1', 'legL2', 'legR1', 'legR2', 'footL', 'footR'].forEach(function (k) {
        segs[k] = line();
      });

    segs.head = document.createElementNS(NS, 'circle');
    segs.head.setAttribute('class', 'bj-seg');
    segs.head.setAttribute('r', C.headR);
    g.appendChild(segs.head);

    if (opts.hat) {
      segs.brim = line('bj-hat');
      segs.crown = document.createElementNS(NS, 'path');
      segs.crown.setAttribute('class', 'bj-hat');
      g.appendChild(segs.crown);
    }

    segs.root = g;
    segs._svg = svg;
    return segs;
  }

  /* ---------- 姿态 → 更新所有线段坐标 ---------- */
  function applyPose(segs, p) {
    var f = fk(p);
    function L(s, a, b) {
      s.setAttribute('x1', a.x.toFixed(2));
      s.setAttribute('y1', a.y.toFixed(2));
      s.setAttribute('x2', b.x.toFixed(2));
      s.setAttribute('y2', b.y.toFixed(2));
    }
    L(segs.spine, f.H, f.S);
    L(segs.armL1, f.S, f.aL.E); L(segs.armL2, f.aL.E, f.aL.H);
    L(segs.armR1, f.S, f.aR.E); L(segs.armR2, f.aR.E, f.aR.H);
    L(segs.legL1, f.H, f.lL.K); L(segs.legL2, f.lL.K, f.lL.A);
    L(segs.legR1, f.H, f.lR.K); L(segs.legR2, f.lR.K, f.lR.A);
    L(segs.footL, f.lL.A, f.lL.F); L(segs.footR, f.lR.A, f.lR.F);
    segs.head.setAttribute('cx', f.head.x.toFixed(2));
    segs.head.setAttribute('cy', f.head.y.toFixed(2));
    if (segs.brim) {
      L(segs.brim, { x: f.head.x - 19, y: f.head.y - 4 }, { x: f.head.x + 19, y: f.head.y - 4 });
      segs.crown.setAttribute('d',
        'M ' + (f.head.x - 13).toFixed(2) + ' ' + (f.head.y - 4).toFixed(2) +
        ' Q ' + f.head.x.toFixed(2) + ' ' + (f.head.y - 27).toFixed(2) +
        ' ' + (f.head.x + 13).toFixed(2) + ' ' + (f.head.y - 4).toFixed(2));
    }
  }

  var BASE = {
    x: 0, y: 0, lean: 0, headTilt: 0,
    shL: 0, elL: 0, shR: 0, elR: 0,
    hipL: 0, kneeL: 0, hipR: 0, kneeR: 0,
    footL: 0, footR: 0,
  };

  /* ---------- 完整演示组件：骨骼 + 控制条 + GSAP 时间线 ----------
   * container: 挂载点
   * move: { keyframes: [[t, pose, ease?], ...], spin?: [{at,to,dur,origin,ease}], loop? }
   * opts: { hat, mirror, autoplay, speed }
   */
  function demo(container, move, opts) {
    opts = opts || {};

    var stage = document.createElement('div');
    stage.className = 'demo-stage';
    container.appendChild(stage);

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 222');
    svg.setAttribute('aria-hidden', 'true');
    svg.className.baseVal = 'bj-fig';
    stage.appendChild(svg);

    var segs = createSkeleton(svg, { hat: !!opts.hat });

    var mir = null;
    if (opts.mirror) {
      var svg2 = document.createElementNS(NS, 'svg');
      svg2.setAttribute('viewBox', '0 0 200 222');
      svg2.setAttribute('aria-hidden', 'true');
      svg2.className.baseVal = 'bj-fig bj-mirror';
      stage.appendChild(svg2);
      mir = createSkeleton(svg2, { hat: !!opts.hat });
    }

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
    ctl.appendChild(speedWrap);
    container.appendChild(ctl);

    // 姿态代理 + 时间线
    var pose = Object.assign({}, BASE);
    var kfs = move.keyframes;
    Object.assign(pose, BASE, kfs[0][1]);

    var tl = gsap.timeline({
      repeat: opts.loop === false ? 0 : -1,
      repeatDelay: 0,
      defaults: { ease: 'power1.inOut' },
    });

    for (var i = 0; i < kfs.length - 1; i++) {
      var t0 = kfs[i][0], t1 = kfs[i + 1][0];
      var vars = Object.assign({}, kfs[i + 1][1]);
      vars.duration = Math.max(0.01, t1 - t0);
      vars.ease = kfs[i + 1][2] || 'power1.inOut';
      tl.to(pose, vars, t0);
    }

    // 整体旋转（转身 / 前倾）
    var spins = move.spin || [];
    spins.forEach(function (sp) {
      tl.to(segs.root, {
        rotation: sp.to,
        svgOrigin: sp.origin || '100 95',
        duration: sp.dur,
        ease: sp.ease || 'power2.inOut',
      }, sp.at);
      if (mir) {
        tl.to(mir.root, {
          rotation: sp.to,
          svgOrigin: sp.origin || '100 95',
          duration: sp.dur,
          ease: sp.ease || 'power2.inOut',
        }, sp.at);
      }
    });

    var kfTimes = kfs.map(function (k) { return k[0]; });

    tl.eventCallback('onUpdate', function () {
      applyPose(segs, pose);
      if (mir) applyPose(mir, pose);
      // 同步高亮当前教学步骤
      var t = tl.time();
      var idx = 0;
      for (var s = 0; s < kfTimes.length; s++) {
        if (t >= kfTimes[s] - 0.001) idx = s;
      }
      // 步骤高亮：默认查容器本身，也可通过 opts.stepsScope 指定外层
      var steps = (opts.stepsScope || container).querySelectorAll('[data-step]');
      if (idx >= steps.length) idx = steps.length - 1;
      for (var j = 0; j < steps.length; j++) {
        steps[j].classList.toggle('is-active', j === idx);
      }
    });

    // 初始姿态
    applyPose(segs, pose);
    if (mir) applyPose(mir, pose);

    // 控制
    function toggle() {
      if (tl.paused()) {
        tl.play();
        btnPlay.classList.add('is-playing');
      } else {
        tl.pause();
        btnPlay.classList.remove('is-playing');
      }
    }
    btnPlay.addEventListener('click', toggle);
    btnReset.addEventListener('click', function () {
      tl.pause(0);
      btnPlay.classList.remove('is-playing');
    });

    if (opts.autoplay !== false) {
      tl.play();
      btnPlay.classList.add('is-playing');
    } else {
      tl.pause(0);
    }

    return { tl: tl, pose: pose, segs: segs, mir: mir };
  }

  global.BJ = {
    fk: fk,
    createSkeleton: createSkeleton,
    applyPose: applyPose,
    demo: demo,
    BASE: BASE,
  };
})(window);
