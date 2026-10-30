/**
 * پیام انگیزشی داشبورد + اطمینان از فیلتر تاریخ
 * بعد از bundle و api-fast لود شود
 */
(function () {
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
    // نام کامل در پیام؛ اگر خیلی بلند بود فقط نام اول
    var display = name.length > 22 ? firstName(name) : name;
    return tpl.replace(/\{name\}/g, display);
  }

  function bannerHtml() {
    var msg = pickMessage();
    return (
      '<div class="dash-motiv mb-4 rounded-2xl px-4 py-3 flex items-start gap-3" style="' +
      'background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(56,189,248,0.08));' +
      'border:1px solid rgba(52,211,153,0.22);' +
      '">' +
      '<span style="font-size:1.25rem;line-height:1.2" aria-hidden="true">✨</span>' +
      '<div class="min-w-0 flex-1">' +
      '<div class="text-[10px] uppercase tracking-wide text-emerald-400/80 mb-0.5 font-semibold">پیام روز</div>' +
      '<p class="text-sm text-slate-100 leading-relaxed m-0">' +
      msg.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      '</p></div></div>'
    );
  }

  function patchDashboard() {
    if (typeof Pages === 'undefined' || typeof Pages.dashboard !== 'function') return false;
    if (Pages.dashboard.__motiv) return true;
    var prev = Pages.dashboard;
    Pages.dashboard = async function () {
      var html = await prev.apply(this, arguments);
      if (typeof html !== 'string') html = html == null ? '' : String(html);
      // بنر را بالای محتوا بگذار (بعد از هر هدر داخلی اگر هست، اول صفحه)
      return bannerHtml() + html;
    };
    Pages.dashboard.__motiv = true;
    return true;
  }

  // اطمینان دوباره از applyFilter اگر bundle کهنه بود
  function patchFilter() {
    if (typeof Pages === 'undefined' || typeof Pages.applyFilter !== 'function') return;
    if (Pages.applyFilter.__fixed) return;
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
        if (page === 'dashboard' && cur.get('cperiod') && !p.get('cperiod')) p.set('cperiod', cur.get('cperiod'));
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
    if (!patchDashboard()) {
      var n = 0;
      var t = setInterval(function () {
        n++;
        patchFilter();
        if (patchDashboard() || n > 50) clearInterval(t);
      }, 120);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 600);

  console.log('[dash-motiv] filter fix + motiv ready');
})();
