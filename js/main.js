/* ============================================================
 * Billie Jean Dance — 主脚本 (GSAP + ScrollTrigger)
 * ============================================================ */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  var MOVES = window.BJ_MOVES;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function stars(n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }

  /* ---------- 1. 渲染动作总览卡片 ---------- */
  var grid = $('#moves-grid');
  MOVES.forEach(function (m) {
    var card = document.createElement('a');
    card.className = 'move-card';
    card.href = '#move-' + m.id;
    card.innerHTML =
      '<div class="mc-top">' +
      '<span class="mc-icon">' + m.icon + '</span>' +
      '<span class="mc-diff">' + stars(m.diff) + '</span>' +
      '</div>' +
      '<h3 class="mc-en">' + m.en + '</h3>' +
      '<p class="mc-cn">' + m.cn + (m.danger ? ' <b class="mc-danger">高风险</b>' : '') + '</p>' +
      '<div class="mc-tags">' + m.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</div>';
    grid.appendChild(card);
  });

  /* ---------- 2. 渲染教学区块 ---------- */
  var wrap = $('#moves-render');
  MOVES.forEach(function (m, i) {
    var sec = document.createElement('section');
    sec.className = 'move-block' + (i % 2 === 1 ? ' is-alt' : '');
    sec.id = 'move-' + m.id;
    sec.innerHTML =
      '<div class="move-visual">' +
      '<div class="move-demo" id="demo-' + m.id + '"></div>' +
      '<div class="move-ghost" aria-hidden="true">' + m.icon + '</div>' +
      '</div>' +
      '<div class="move-body">' +
      '<div class="move-head">' +
      '<span class="move-no">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<div><h3 class="move-en">' + m.en + '</h3>' +
      '<p class="move-cn">' + m.cn + ' · ' + stars(m.diff) + '</p></div>' +
      '</div>' +
      '<p class="move-music"><span class="chip">♪ ' + m.music + '</span></p>' +
      (m.danger ? '<div class="danger-note">⚠️ <b>高风险动作</b>：前倾需要极强的核心与跟腱力量，原版依赖特制鞋底钩子。请从 15° 或扶墙练习开始，量力而行，切勿直接挑战 45°。</div>' : '') +
      '<div class="mini-title">拆解步骤 <small>（播放动画时自动高亮）</small></div>' +
      '<ol class="step-list">' + m.steps.map(function (s, si) {
        return '<li data-step="' + si + '"><span class="step-no">' + (si + 1) + '</span>' + s + '</li>';
      }).join('') + '</ol>' +
      '<div class="cols2">' +
      '<div><div class="mini-title">✓ 要点</div><ul class="tips-list">' +
      m.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' +
      '<div><div class="mini-title">✗ 常见错误</div><ul class="mistake-list">' +
      m.mistakes.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' +
      '</div>' +
      '<details class="fact-box"><summary>💡 你知道吗</summary><p>' + m.fact + '</p></details>' +
      '</div>';
    wrap.appendChild(sec);
  });

  /* ---------- 3. 初始化动作演示（暂停待播放） ---------- */
  MOVES.forEach(function (m) {
    var el = $('#demo-' + m.id);
    var r = BJ.demo(el, m, {
      hat: m.id === 'moonwalk' || m.id === 'hatpoint',
      autoplay: false,
      loop: true,
      stepsScope: el.closest('.move-block'),
    });
    r.tl.pause(0);
  });

  /* ---------- 4. Hero：太空步火柴人（戴礼帽）自动播放 ---------- */
  BJ.demo($('#hero-demo'), MOVES[0], { hat: true, autoplay: true, loop: true });
  var hc = $('#hero-demo .demo-controls');
  if (hc) hc.remove();

  /* ---------- 5. 标题逐字动画 ---------- */
  $$('.split').forEach(function (el) {
    var txt = el.textContent;
    el.textContent = '';
    for (var i = 0; i < txt.length; i++) {
      var s = document.createElement('span');
      s.className = 'h-letter' + (txt[i] === ' ' ? ' is-space' : '');
      s.textContent = txt[i] === ' ' ? '\u00A0' : txt[i];
      el.appendChild(s);
    }
  });

  var heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTl
    .from('#hero-title .h-letter', { yPercent: 130, opacity: 0, rotate: 8, duration: 0.9, stagger: 0.05 })
    .from('#hero-sub', { y: 18, opacity: 0, duration: 0.7 }, '-=0.5')
    .from('#hero-badges > *', { y: 14, opacity: 0, stagger: 0.09, duration: 0.5 }, '-=0.4')
    .from('#hero-cta > *', { y: 12, opacity: 0, stagger: 0.09, duration: 0.5 }, '-=0.35')
    .from('#hero-demo', { opacity: 0, y: 40, scale: 0.94, duration: 0.9, ease: 'power2.out' }, '-=0.55');

  /* ---------- 6. 滚动浮现 ---------- */
  $$('.reveal').forEach(function (el) {
    gsap.from(el, {
      y: 34, opacity: 0, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });

  // 总览卡片瀑布式进场
  var cards = $$('#moves-grid .move-card');
  if (cards.length) {
    gsap.from(cards, {
      y: 40, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.06,
      scrollTrigger: { trigger: '#moves-grid', start: 'top 85%' },
    });
  }

  /* ---------- 7. 数字滚动 ---------- */
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count);
    var obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: function () { el.textContent = Math.round(obj.v); },
    });
  });

  /* ---------- 8. 跟跳时间线：8 拍鼓点循环 ---------- */
  var dots = $$('#beat-dots .beat-dot');
  if (dots.length) {
    var beat = 60 / 117; // 0.513s
    var btl = gsap.timeline({ repeat: -1 });
    dots.forEach(function (d, i) {
      btl.fromTo(d, { scale: 1 }, {
        scale: d.classList.contains('acc') ? 2.2 : 1.55,
        duration: 0.1, ease: 'power2.out',
      }, i * beat);
      btl.to(d, { scale: 1, duration: 0.28, ease: 'power2.in' }, i * beat + 0.1);
    });
  }

  /* ---------- 9. 节拍器 (117 BPM, Web Audio) ---------- */
  var metro = { on: false, ctx: null, timer: null, next: 0, step: 0, bpm: 117 };
  var bpmIn = $('#bpm');
  var bpmVal = $('#bpm-val');
  var metroBtn = $('#metro-btn');

  function ensureCtx() {
    if (!metro.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      metro.ctx = new AC();
    }
    if (metro.ctx.state === 'suspended') metro.ctx.resume();
  }
  function tick(accent) {
    var ctx = metro.ctx;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1150 : 740;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.32 : 0.18, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.1);
    // 视觉脉冲
    gsap.fromTo('#metro-disc', { scale: 1 }, {
      scale: accent ? 1.28 : 1.14, duration: 0.1, ease: 'power2.out', yoyo: true, repeat: 1,
    });
    $('#metro-beat').textContent = (metro.step % 4) + 1;
    metro.step++;
  }
  function scheduler() {
    var ctx = metro.ctx;
    while (metro.next < ctx.currentTime + 0.12) {
      tick(metro.step % 4 === 0);
      metro.next += 60 / metro.bpm;
    }
  }
  function startMetro() {
    ensureCtx();
    metro.on = true;
    metro.step = 0;
    metro.next = metro.ctx.currentTime + 0.06;
    scheduler();
    metro.timer = setInterval(scheduler, 25);
    metroBtn.textContent = '停止节拍';
    metroBtn.classList.add('is-on');
  }
  function stopMetro() {
    metro.on = false;
    clearInterval(metro.timer);
    metro.timer = null;
    metroBtn.textContent = '开始节拍';
    metroBtn.classList.remove('is-on');
  }
  metroBtn.addEventListener('click', function () {
    metro.on ? stopMetro() : startMetro();
  });
  bpmIn.addEventListener('input', function () {
    metro.bpm = parseInt(bpmIn.value, 10);
    bpmVal.textContent = metro.bpm;
  });

  /* ---------- 10. 平滑滚动 ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length > 1) {
        var t = $(id);
        if (t) {
          e.preventDefault();
          gsap.to(window, { scrollTo: { y: t, offsetY: 70 }, duration: 0.7, ease: 'power2.inOut' });
        }
      }
    });
  });

  /* ---------- 11. 顶部进度条 ---------- */
  gsap.to('#progress', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
  });

  /* ---------- 12. 导航高亮 + 回到顶部 ---------- */
  var navLinks = $$('#nav a');
  navLinks.forEach(function (link) {
    var target = $(link.getAttribute('href'));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: function (self) {
        if (self.isActive) {
          navLinks.forEach(function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      },
    });
  });

  var topBtn = $('#to-top');
  ScrollTrigger.create({
    start: 500,
    onToggle: function (self) { topBtn.classList.toggle('is-show', self.isActive); },
  });
  topBtn.addEventListener('click', function () {
    gsap.to(window, { scrollTo: 0, duration: 0.6, ease: 'power2.inOut' });
  });

  /* ---------- 13. 减弱动态偏好 ---------- */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroTl.progress(1);
    gsap.globalTimeline.timeScale(2);
  }
})();
