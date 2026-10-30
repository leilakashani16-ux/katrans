/**
 * پس‌زمینه زنده تم‌ها v2
 * مدار روح → فضای کهکشانی (نه فقط شب ساده)
 * اخگر → جرقه یا برگ چنار + برگ پاییزی قاطی
 */
(function () {
  var host = null;
  var canvas = null;
  var ctx = null;
  var raf = null;
  var mode = null;
  var particles = [];
  var nebulaBlobs = [];
  var reduced = false;

  try {
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {}

  function ensureHost() {
    host = document.getElementById('te-fx-bg');
    if (!host) {
      host = document.createElement('div');
      host.id = 'te-fx-bg';
      host.innerHTML =
        '<div class="te-fx-layer te-fx-nebula"></div>' +
        '<div class="te-fx-layer te-fx-flame-base"></div>' +
        '<canvas id="te-fx-canvas"></canvas>';
      document.body.insertBefore(host, document.body.firstChild);
    }
    canvas = document.getElementById('te-fx-canvas');
    if (canvas) ctx = canvas.getContext('2d');
  }

  function resize() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function detectMode() {
    var cl = document.documentElement.classList;
    if (cl.contains('te-orbit')) return 'orbit';
    if (cl.contains('te-ember')) {
      try {
        if (localStorage.getItem('katrans_ember_leaves') === '1') return 'ember-leaves';
      } catch (_) {}
      return 'ember';
    }
    return null;
  }

  /* ——— فضای کهکشانی ——— */
  function initOrbit() {
    particles = [];
    nebulaBlobs = [];
    var area = window.innerWidth * window.innerHeight;
    var n = Math.min(160, Math.floor(area / 7000));
    for (var i = 0; i < n; i++) {
      var far = Math.random() > 0.35;
      particles.push({
        x: Math.random(),
        y: Math.random(),
        r: far ? Math.random() * 1.2 + 0.2 : Math.random() * 2.2 + 0.8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.025,
        bright: 0.25 + Math.random() * 0.75,
        // رنگ فضایی: آبی یخی، بنفش، سفید کهکشانی
        tint: Math.random() < 0.15 ? 'violet' : Math.random() < 0.2 ? 'cyan' : 'white'
      });
    }
    // سحابی‌های شناور
    for (var j = 0; j < 5; j++) {
      nebulaBlobs.push({
        x: 0.15 + Math.random() * 0.7,
        y: 0.1 + Math.random() * 0.7,
        r: 0.12 + Math.random() * 0.22,
        hue: j % 2 === 0 ? 250 : 190,
        phase: Math.random() * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.003
      });
    }
  }

  function drawOrbit(w, h, t) {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // عمق فضا
    var deep = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    deep.addColorStop(0, 'rgba(40,20,90,0.25)');
    deep.addColorStop(0.45, 'rgba(10,15,40,0.12)');
    deep.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, w, h);

    // سحابی
    for (var b = 0; b < nebulaBlobs.length; b++) {
      var nb = nebulaBlobs[b];
      nb.phase += nb.speed;
      var pulse = 0.55 + Math.sin(nb.phase) * 0.2;
      var nx = nb.x * w + Math.sin(nb.phase * 0.7) * 12;
      var ny = nb.y * h + Math.cos(nb.phase * 0.5) * 10;
      var nr = nb.r * Math.min(w, h) * pulse;
      var g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      g.addColorStop(0, 'hsla(' + nb.hue + ',70%,55%,' + 0.14 * pulse + ')');
      g.addColorStop(0.5, 'hsla(' + (nb.hue + 20) + ',60%,40%,0.06)');
      g.addColorStop(1, 'hsla(' + nb.hue + ',50%,30%,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fill();
    }

    // ستاره‌ها
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.phase += p.speed;
      var tw = 0.2 + Math.abs(Math.sin(p.phase)) * p.bright;
      var x = p.x * w;
      var y = p.y * h;
      var col =
        p.tint === 'violet'
          ? 'rgba(196,181,253,'
          : p.tint === 'cyan'
            ? 'rgba(165,243,252,'
            : 'rgba(226,232,255,';
      ctx.beginPath();
      ctx.fillStyle = col + tw + ')';
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (tw > 0.88 && p.r > 1) {
        ctx.beginPath();
        ctx.fillStyle = col + tw * 0.3 + ')';
        ctx.arc(x, y, p.r * 3.5, 0, Math.PI * 2);
        ctx.fill();
        // صلیب نوری ستاره درخشان
        ctx.strokeStyle = col + tw * 0.45 + ')';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x - p.r * 5, y);
        ctx.lineTo(x + p.r * 5, y);
        ctx.moveTo(x, y - p.r * 5);
        ctx.lineTo(x, y + p.r * 5);
        ctx.stroke();
      }
    }

    // شهاب
    var meteor = (Math.sin(t * 0.00027) + 1) / 2;
    if (meteor > 0.97) {
      var mx = ((t * 0.08) % (w + 80)) - 40;
      var my = ((t * 0.025) % (h * 0.55));
      var mg = ctx.createLinearGradient(mx, my, mx + 55, my + 22);
      mg.addColorStop(0, 'rgba(224,242,254,0)');
      mg.addColorStop(0.4, 'rgba(186,230,253,0.7)');
      mg.addColorStop(1, 'rgba(255,255,255,0.9)');
      ctx.strokeStyle = mg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + 55, my + 22);
      ctx.stroke();
    }
  }

  /* ——— اخگر: جرقه ——— */
  function initEmber() {
    particles = [];
    var n = Math.min(55, Math.floor(window.innerWidth / 14));
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random(),
        y: 0.55 + Math.random() * 0.5,
        r: 1.5 + Math.random() * 3.5,
        vy: -(0.0015 + Math.random() * 0.0035),
        vx: (Math.random() - 0.5) * 0.0012,
        life: Math.random(),
        hue: 15 + Math.random() * 35
      });
    }
  }

  function drawEmber(w, h) {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.life * 8) * 0.0004;
      p.life += 0.01;
      p.r *= 0.997;
      if (p.y < -0.05 || p.r < 0.4) {
        p.x = Math.random();
        p.y = 0.85 + Math.random() * 0.2;
        p.r = 1.5 + Math.random() * 3.5;
        p.vy = -(0.0015 + Math.random() * 0.0035);
        p.life = 0;
      }
      var alpha = Math.max(0, 0.9 - p.life * 0.5);
      var g = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, p.r * 4);
      g.addColorStop(0, 'hsla(' + p.hue + ',100%,60%,' + alpha + ')');
      g.addColorStop(1, 'hsla(' + p.hue + ',100%,40%,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ——— برگ چنار + پاییزی قاطی ——— */
  function initLeaves() {
    particles = [];
    var n = Math.min(48, Math.floor(window.innerWidth / 16));
    // رنگ چنار پاییزی: زرد، طلایی، قهوه‌ای، نارنجی، کمی سبز کهنه
    var colors = [
      '#c2410c', '#ea580c', '#d97706', '#b45309', '#a16207',
      '#ca8a04', '#92400e', '#78350f', '#a3a3a3', '#854d0e',
      '#f59e0b', '#9a3412'
    ];
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        s: 8 + Math.random() * 14,
        vy: 0.0007 + Math.random() * 0.0016,
        vx: (Math.random() - 0.5) * 0.0009,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.035,
        color: colors[i % colors.length],
        // چنار (۵ لبه) یا بیضی ساده قاطی
        kind: Math.random() < 0.65 ? 'plane' : 'oval'
      });
    }
  }

  /** شکل تقریبی برگ چنار (۵ لوب) */
  function drawPlaneLeaf(ctx, size) {
    var s = size;
    ctx.beginPath();
    // مرکز و ۵ لبه
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      var a2 = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
      var outer = s * (i === 0 ? 1.05 : 0.85);
      var inner = s * 0.38;
      if (i === 0) ctx.moveTo(Math.cos(a) * outer, Math.sin(a) * outer);
      else ctx.lineTo(Math.cos(a) * outer * 0.9, Math.sin(a) * outer * 0.9);
      ctx.quadraticCurveTo(
        Math.cos(a2) * inner * 1.4,
        Math.sin(a2) * inner * 1.4,
        Math.cos(((i + 1) / 5) * Math.PI * 2 - Math.PI / 2) * outer * 0.9,
        Math.sin(((i + 1) / 5) * Math.PI * 2 - Math.PI / 2) * outer * 0.9
      );
    }
    ctx.closePath();
    ctx.fill();
    // رگبرگ وسط
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.2);
    ctx.lineTo(0, s * 0.7);
    ctx.stroke();
  }

  function drawLeaves(w, h) {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.rot * 1.2) * 0.00055;
      p.rot += p.vr;
      if (p.y > 1.12) {
        p.y = -0.08;
        p.x = Math.random();
      }
      if (p.x < -0.12) p.x = 1.1;
      if (p.x > 1.12) p.x = -0.1;

      var x = p.x * w;
      var y = p.y * h;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = p.color;
      if (p.kind === 'plane') {
        drawPlaneLeaf(ctx, p.s * 0.55);
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s * 0.5, p.s * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    if (!mode || reduced) {
      raf = null;
      return;
    }
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (mode === 'orbit') drawOrbit(w, h, t || 0);
    else if (mode === 'ember') drawEmber(w, h);
    else if (mode === 'ember-leaves') drawLeaves(w, h);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (ctx && canvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function apply() {
    ensureHost();
    var next = detectMode();
    if (next === mode && raf) return;
    mode = next;
    stop();
    if (!mode || reduced) return;
    resize();
    if (mode === 'orbit') initOrbit();
    else if (mode === 'ember') initEmber();
    else if (mode === 'ember-leaves') initLeaves();
    raf = requestAnimationFrame(frame);
  }

  window.ThemeFxBg = {
    setEmberLeaves: function (on) {
      try {
        localStorage.setItem('katrans_ember_leaves', on ? '1' : '0');
      } catch (_) {}
      mode = null;
      apply();
    },
    refresh: apply
  };

  var obs = new MutationObserver(function () {
    apply();
  });

  function boot() {
    ensureHost();
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', function () {
      resize();
      if (mode === 'orbit') initOrbit();
    });
    apply();
    setTimeout(apply, 400);
    setTimeout(apply, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[theme-fx-bg] v2 galaxy + plane-tree leaves');
})();
