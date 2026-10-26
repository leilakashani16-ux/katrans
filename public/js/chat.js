/**
 * چت تیمی بین کاربران + نوتیفیکیشن
 */
(function () {
  const SEEN_KEY = 'kitchen_chat_seen_id';
  const POLL_MS = 7000;

  function me() {
    try {
      return (Auth && Auth.currentUser) || JSON.parse(localStorage.getItem('kitchen_session') || 'null') || {};
    } catch (_) {
      return {};
    }
  }

  function getSeenId() {
    return Number(localStorage.getItem(SEEN_KEY) || 0);
  }
  function setSeenId(id) {
    if (id && Number(id) > getSeenId()) localStorage.setItem(SEEN_KEY, String(id));
  }

  function displayName(m) {
    return (m && (m.full_name || m.username)) || 'کاربر';
  }

  async function loadMessages() {
    const list = (await DB.getAll('chat_messages').catch(function () { return []; })) || [];
    return list.slice().sort(function (a, b) {
      return Number(a.id || 0) - Number(b.id || 0);
    });
  }

  function updateBadge(n) {
    var el = document.getElementById('chat-nav-badge');
    if (!el) return;
    if (n > 0) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.remove('hidden');
    } else {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  function notifyBrowser(title, body) {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      // موبایل: اگر ServiceWorker فعال باشد از آن استفاده کن
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg.showNotification) {
            reg.showNotification(title, {
              body: body,
              tag: 'katrans-chat',
              renotify: true,
              icon: 'icons/icon-192.png',
              badge: 'icons/icon-192.png'
            }).catch(function () {
              try { new Notification(title, { body: body, tag: 'katrans-chat' }); } catch (_) {}
            });
          } else {
            try { new Notification(title, { body: body, tag: 'katrans-chat' }); } catch (_) {}
          }
        });
      } else {
        new Notification(title, { body: body, tag: 'katrans-chat', icon: 'icons/icon-192.png' });
      }
    } catch (e) {
      console.warn('notify', e);
    }
  }

  async function ensureNotifyPermission() {
    if (!('Notification' in window)) {
      toast('این مرورگر نوتیفیکیشن را پشتیبانی نمی‌کند', 'error');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      toast('نوتیف مسدود است — در تنظیمات مرورگر/گوشی برای این سایت Allow کنید', 'error');
      return false;
    }
    // باید از gest کاربر صدا زده شود
    try {
      var p = await Notification.requestPermission();
      return p === 'granted';
    } catch (e) {
      toast('درخواست نوتیف ناموفق: ' + (e.message || ''), 'error');
      return false;
    }
  }

  Pages.chat = async function () {
    var msgs = await loadMessages();
    if (msgs.length) setSeenId(msgs[msgs.length - 1].id);
    updateBadge(0);
    var user = me();
    var perm = ('Notification' in window) ? Notification.permission : 'unsupported';

    var rows = msgs
      .map(function (m) {
        var mine = m.username && user.username && m.username === user.username;
        var time = (m.created_at || '').replace('T', ' ').slice(0, 16);
        return (
          '<div class="flex ' +
          (mine ? 'justify-start' : 'justify-end') +
          ' mb-2">' +
          '<div class="max-w-[85%] rounded-2xl px-3 py-2 text-sm ' +
          (mine
            ? 'bg-brand-600/30 border border-brand-500/30'
            : 'bg-slate-800/80 border border-slate-600/40') +
          '">' +
          '<div class="text-[10px] text-slate-400 mb-0.5">' +
          displayName(m) +
          (m.role ? ' · ' + m.role : '') +
          (time ? ' · ' + time : '') +
          '</div>' +
          '<div class="text-slate-100 whitespace-pre-wrap break-words">' +
          String(m.body || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;') +
          '</div></div></div>'
        );
      })
      .join('');

    var notifyHint =
      perm === 'granted'
        ? '<span class="text-xs text-brand-400">نوتیف فعال است</span>'
        : perm === 'denied'
          ? '<span class="text-xs text-red-400">نوتیف مسدود — از تنظیمات سایت Allow کنید</span>'
          : '<span class="text-xs text-amber-300">برای نوتیف دکمه را بزنید (روی iPhone: ابتدا Add to Home Screen)</span>';

    return (
      '<div class="mb-4 flex flex-wrap items-center justify-between gap-2">' +
      '<div><h1 class="text-2xl font-bold">💬 گفتگوی تیم</h1>' +
      '<p class="text-slate-400 text-sm">پیام مشترک بین همه کاربران</p></div>' +
      '<div class="flex flex-wrap gap-2 items-center">' +
      notifyHint +
      '<button type="button" class="btn-secondary text-xs" onclick="Pages.requestChatNotify()">فعال‌سازی نوتیفیکیشن</button></div></div>' +
      '<div class="glass-card rounded-2xl p-3 flex flex-col" style="min-height:60vh;max-height:70vh">' +
      '<div id="chat-scroll" class="flex-1 overflow-y-auto mb-3 px-1">' +
      (rows || '<p class="text-center text-slate-500 py-10 text-sm">هنوز پیامی نیست — اولین نفر باش</p>') +
      '</div>' +
      '<form id="chat-form" class="flex gap-2 items-end" onsubmit="event.preventDefault();Pages.sendChatMessage();return false;">' +
      '<textarea id="chat-input" class="input-field flex-1" rows="2" placeholder="پیام خود را بنویسید..." maxlength="2000"></textarea>' +
      '<button type="submit" class="btn-primary whitespace-nowrap" id="chat-send-btn">ارسال</button>' +
      '</form></div>'
    );
  };

  document.addEventListener('submit', function (ev) {
    if (!ev.target || ev.target.id !== 'chat-form') return;
    ev.preventDefault();
    Pages.sendChatMessage();
  });

  Pages.requestChatNotify = async function () {
    var ok = await ensureNotifyPermission();
    if (ok) {
      toast('نوتیفیکیشن چت فعال شد', 'success');
      notifyBrowser('گفتگوی تیم', 'نوتیفیکیشن با موفقیت فعال شد');
      if (typeof currentPage !== 'undefined' && currentPage === 'chat') navigate('chat');
    }
  };

  Pages.sendChatMessage = async function () {
    var ta = document.getElementById('chat-input');
    var btn = document.getElementById('chat-send-btn');
    var text = ((ta && ta.value) || '').trim();
    if (!text) return toast('پیام خالی است', 'error');
    var user = me();
    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }
    try {
      var payload = {
        body: text.slice(0, 2000),
        username: user.username || '',
        full_name: user.full_name || user.username || '',
        role: user.role || '',
        created_at: new Date().toISOString()
      };
      var id = await DB.add('chat_messages', payload);
      if (ta) ta.value = '';
      toast('ارسال شد', 'success');
      if (id) setSeenId(id);
      if (typeof currentPage !== 'undefined' && currentPage === 'chat') {
        navigate('chat');
        setTimeout(function () {
          var sc = document.getElementById('chat-scroll');
          if (sc) sc.scrollTop = sc.scrollHeight;
        }, 250);
      }
    } catch (e) {
      console.error('chat send', e);
      var msg = e.message || String(e);
      if (/no such table|chat_messages/i.test(msg)) {
        msg = 'جدول چت روی سرور نیست — Deploy جدید لازم است';
      }
      toast(msg || 'خطا در ارسال', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'ارسال';
      }
    }
  };

  Pages.pollChat = async function () {
    try {
      if (!window.DB) return;
      var user = me();
      if (!user || !user.username) return;
      var msgs = await loadMessages();
      if (!msgs.length) {
        updateBadge(0);
        return;
      }
      var last = msgs[msgs.length - 1];
      var seen = getSeenId();
      var unread = msgs.filter(function (m) {
        return Number(m.id) > seen;
      });
      var fromOthers = unread.filter(function (m) {
        return !m.username || m.username !== user.username;
      });

      if (typeof currentPage !== 'undefined' && currentPage === 'chat') {
        if (unread.length && Number(last.id) > seen) {
          var ta = document.getElementById('chat-input');
          var typing = ta && document.activeElement === ta && (ta.value || '').length > 0;
          setSeenId(last.id);
          updateBadge(0);
          if (!typing) {
            navigate('chat');
            setTimeout(function () {
              var sc = document.getElementById('chat-scroll');
              if (sc) sc.scrollTop = sc.scrollHeight;
            }, 150);
          }
        } else {
          setSeenId(last.id);
          updateBadge(0);
        }
        return;
      }

      if (fromOthers.length > 0) {
        updateBadge(fromOthers.length);
        var newest = fromOthers[fromOthers.length - 1];
        var lastNotified = Number(window.__chatLastNotifiedId || 0);
        if (Number(newest.id) > lastNotified) {
          notifyBrowser('پیام جدید — غذای انصار', displayName(newest) + ': ' + String(newest.body || '').slice(0, 80));
          try {
            toast('💬 ' + displayName(newest) + ': ' + String(newest.body || '').slice(0, 40), 'info');
          } catch (_) {}
          window.__chatLastNotifiedId = Number(newest.id);
        }
      } else {
        updateBadge(0);
      }
    } catch (e) {
      console.warn('chat poll', e);
    }
  };

  if (!window.__chatPollStarted) {
    window.__chatPollStarted = true;
    setInterval(function () {
      if (document.visibilityState === 'visible') Pages.pollChat();
    }, POLL_MS);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') Pages.pollChat();
    });
  }

  setTimeout(function () {
    try {
      Pages.pollChat();
    } catch (_) {}
  }, 2500);
})();
