/**
 * پس‌زمینه زنده تم‌ها
 * مدار روح → ستاره‌های چشمک‌زن + کهکشان
 * اخگر → جرقه/شعله بالا‌رونده (+ حالت برگ پاییزی اختیاری)
 * فقط فرانت — بدون D1
 */
(function () {
  var host = null;
  var canvas = null;
  var ctx = null;
  var raf = null;
  var mode = null; // 'orbit' | 'ember' | 'ember-leaves' | null
  var particles = [];
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
      // برگ پاییزی اگر کاربر در localStorage خواسته باشد
      try {
        if (localStorage.getItem('katrans_ember_leaves') === '1') return 'ember-leaves';
      } catch (_) {}
      return 'ember';
    }
    return null;
  }

  function initOrbit() {
    particles = [];
    var n = Math.min(120, Math.floor((window.innerWidth * window.innerHeight) / 9000));
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.6 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.02,
        bright: 0.3 + Math.random() * 0.7
      });
    }
  }

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

  function initLeaves() {
    particles = [];
    var n = Math.min(40, Math.floor(window.innerWidth / 20));
    var colors = ['#c2410c', '#ea580c', '#d97706', '#b45309', '#a16207', '#9a3412'];
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        s: 6 + Math.random() * 10,
        vy: 0.0008 + Math.random() * 0.0018,
        vx: (Math.random() - 0.5) * 0.0008,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.04,
        color: colors[i % colors.length]
      });
    }
  }

  function drawOrbit(w, h, t) {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    // ستاره‌های دور آهسته
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.phase += p.speed;
      var twinkle = 0.25 + Math.abs(Math.sin(p.phase)) * p.bright;
      var x = p.x * w;
      var y = p.y * h;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(220,230,255,' + twinkle + ')';
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
      // درخشش گاه‌به‌گاه
      if (twinkle > 0.85) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(165,180,252,' + (twinkle * 0.35) + ')';
        ctx.arc(x, y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // شهاب گاه‌به‌گاه
    if (Math.sin(t * 0.0003) > 0.992) {
      var sx = (t * 0.05) % w;
      var sy = ((t * 0.02) % (h * 0.5));
      ctx.strokeStyle = 'rgba(186,230,253,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 40, sy + 18);
      ctx.stroke();
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

  function drawLeaves(w, h) {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.rot) * 0.0005;
      p.rot += p.vr;
      if (p.y > 1.1) {
        p.y = -0.05;
        p.x = Math.random();
      }
      if (p.x < -0.1) p.x = 1.1;
      if (p.x > 1.1) p.x = -0.1;
      var x = p.x * w;
      var y = p.y * h;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.s * 0.55, p.s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
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

  // API برای برگ پاییزی روی اخگر
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

  // مشاهده تغییر کلاس تم روی <html>
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
    // چند بار بعد از لود تم
    setTimeout(apply, 400);
    setTimeout(apply, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[theme-fx-bg] orbit stars / ember flames ready');
})();
