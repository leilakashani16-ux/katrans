/**
 * پیام انگیزشی داشبورد + فیکس فیلتر
 * ضد دوبل‌شدن بنر (با theme-engine و بقیه سازگار)
 */
(function () {
  if (window.__dashMotivBooted) return;
  window.__dashMotivBooted = true;

  var MESSAGES = [
    '{name}، حضورت یعنی نظم؛ امروز هم با دقت بدرخش.',
    'سلام {name} — هر ثبت تمیز، یک قدم به تیم قوی‌تر.',
    '{name} عزیز، کیفیت کار تو استاندارد انصار است.',
    'صبح بخیر {name}. تمرکز کوچک، نتیجه بزرگ می‌سازد.',
    '{name}، تو بخشی از زنجیره‌ای هستی که به غذای خوب ختم می‌شود.',
    'آفرین که اینجایی {name}. مسئولیت‌پذیری تو دیده می‌شود.',
    '{name}، امروز را با دقت شروع کن؛ پایانش افتخار است.',
    'همراه خوبی هستی {name}. تیم با آدم‌هایی مثل تو جلو می‌رود.',
    '{name}، نظم امروزت، آرامش فردای انبار است.',
    'سلام {name}. حرفه‌ای بودن یعنی همین حضور و دقت.',
    '{name}، کار تمیز امضای توست — نگهش دار.',
    'خوش آمدی {name}. انرژی مثبتت به کل شیفت سرایت می‌کند.',
    '{name}، هر کیلو و هر عدد یعنی اعتماد مشتری — تو نگهبانش هستی.',
    'روز خوبی {name}. با آرامش کار کن، با دقت تمام کن.',
    '{name}، پیشرفت تیم از جزئیات دقیق تو ساخته می‌شود.',
    'درود {name}. امروز فرصت تازه‌ای برای کار فوق‌العاده است.',
    '{name}، تو فقط ثبت نمی‌کنی — استاندارد می‌سازی.',
    'سلام {name}. افتخار این مجموعه به آدم‌های مسئولیت‌پذیر است.',
    '{name}، آرام و دقیق؛ همین فرمول قهرمان‌های انصار است.',
    'خوش اومدی {name}. شیفت با تو کامل‌تر است.'
  ];

  function fullName() {
    try {
      var u = (window.Auth && Auth.currentUser) || JSON.parse(localStorage.getItem('kitchen_session') || 'null') || {};
      var n = String(u.full_name || u.username || '').trim();
      return n || 'همکار عزیز';
    } catch (_) {
      return 'همکار عزیز';
    }
  }

  function firstName(full) {
    var parts = String(full).trim().split(/\s+/);
    return parts[0] || full;
  }

  function pickMessage() {
    var name = fullName();
    var day = new Date();
    var key = day.getFullYear() + '-' + day.getMonth() + '-' + day.getDate() + '-' + name;
    var hash = 0;
    for (var i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    var tpl = MESSAGES[hash % MESSAGES.length];
    var display = name.length > 22 ? firstName(name) : name;
    return tpl.replace(/\{name\}/g, display);
  }

  function bannerHtml() {
    var msg = pickMessage()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return (
      '<div class="dash-motiv mb-4 rounded-2xl px-4 py-3 flex items-start gap-3" data-dash-motiv="1" style="' +
      'background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(56,189,248,0.08));' +
      'border:1px solid rgba(52,211,153,0.22)">' +
      '<span style="font-size:1.25rem;line-height:1.2" aria-hidden="true">✨</span>' +
      '<div class="min-w-0 flex-1">' +
      '<div class="text-[10px] uppercase tracking-wide text-emerald-400/80 mb-0.5 font-semibold">پیام روز</div>' +
      '<p class="text-sm text-slate-100 leading-relaxed m-0">' + msg + '</p>' +
      '</div></div>'
    );
  }

  /** حذف بنرهای تکراری از HTML قبل از اضافه کردن یکی */
  function stripMotiv(html) {
    if (!html || typeof html !== 'string') return html || '';
    // حذف همه بلوک‌های dash-motiv
    return html.replace(/<div class="dash-motiv\b[\s\S]*?<\/div>\s*<\/div>/gi, '');
  }

  function injectMotiv(html) {
    html = stripMotiv(typeof html === 'string' ? html : html == null ? '' : String(html));
    return bannerHtml() + html;
  }

  function copyFlags(from, to) {
    if (!from || !to) return;
    ['__motiv', '__teV4', '__fx', '__chartsFx'].forEach(function (k) {
      if (from[k]) to[k] = from[k];
    });
  }

  function patchDashboard() {
    if (typeof Pages === 'undefined' || typeof Pages.dashboard !== 'function') return false;
    if (Pages.dashboard.__motiv) return true;

    var prev = Pages.dashboard;
    var wrapped = async function () {
      var html = await prev.apply(this, arguments);
      return injectMotiv(html);
    };
    wrapped.__motiv = true;
    copyFlags(prev, wrapped);
    // theme-engine اگر دوباره چک کند، فکر نکند باید از نو بپیچد
    if (prev.__teV4) wrapped.__teV4 = true;
    Pages.dashboard = wrapped;
    return true;
  }

  function patchFilter() {
    if (typeof Pages === 'undefined') return;
    if (Pages.applyFilter && Pages.applyFilter.__fixed) return;

    Pages.applyFilter = function (page) {
      var df = (document.getElementById('f-df') || {}).value || '';
      var dt = (document.getElementById('f-dt') || {}).value || '';
      var q = (document.getElementById('f-q') || {}).value || '';
      var p = new URLSearchParams();
      if (df) p.set('df', df);
      if (dt) p.set('dt', dt);
      if (q) p.set('q', q);
      try {
        var cur = new URLSearchParams(location.hash.split('?')[1] || '');
        if (page === 'dashboard' && cur.get('cperiod') && !p.get('cperiod')) {
          p.set('cperiod', cur.get('cperiod'));
        }
      } catch (_) {}
      var target = page + (p.toString() ? '?' + p.toString() : '');
      if (typeof navigate === 'function') navigate(target);
      else location.hash = '#' + target;
    };
    Pages.applyFilter.__fixed = true;

    Pages.clearFilter = function (page) {
      if (typeof navigate === 'function') navigate(page);
      else location.hash = '#' + page;
    };
  }

  function boot() {
    patchFilter();
    patchDashboard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // theme-engine ممکن است بعداً dashboard را عوض کند — فقط یک‌بار دیگر وصل کن
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    patchFilter();
    patchDashboard();
    // اگر بنر دوبل در DOM بود پاک کن
    try {
      var list = document.querySelectorAll('[data-dash-motiv="1"]');
      for (var i = 1; i < list.length; i++) list[i].remove();
    } catch (_) {}
    if (tries > 25) clearInterval(timer);
  }, 400);

  console.log('[dash-motiv] v2 single-banner + filter fix');
})();
