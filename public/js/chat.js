/**
 * چت تیمی حرفه‌ای — فاز ۱
 * کانال‌ها · بج خوانده‌نشده · soft-delete · client_id · نوتیف
 * بعد از bundle.js لود شود تا Pages.chat را جایگزین کند
 */
(function () {
  var SEEN_KEY = 'kitchen_chat_seen';
  var CHANNEL_KEY = 'kitchen_chat_channel';
  var POLL_MS = 8000;
  var MAX_BODY = 2000;

  var CHANNELS = [
    { id: 'general', label: 'عمومی', roles: null },
    { id: 'kitchen', label: 'تولید', roles: ['admin', 'production', 'manager'] },
    { id: 'warehouse', label: 'انبار', roles: ['admin', 'warehouse', 'manager'] },
    { id: 'management', label: 'مدیریت', roles: ['admin', 'manager'] },
    { id: 'announce', label: 'اعلامیه', roles: null, announce: true }
  ];

  function me() {
    try {
      return (window.Auth && Auth.currentUser) || JSON.parse(localStorage.getItem('kitchen_session') || 'null') || {};
    } catch (_) {
      return {};
    }
  }

  function myRole() {
    return String((me().role || '')).toLowerCase();
  }

  function isAdmin() {
    return !!(window.Auth && Auth.isAdmin && Auth.isAdmin()) || myRole() === 'admin';
  }

  function canAccessChannel(ch) {
    if (!ch.roles) return true;
    if (isAdmin()) return true;
    return ch.roles.indexOf(myRole()) >= 0;
  }

  function canWriteChannel(chId) {
    var ch = CHANNELS.find(function (c) { return c.id === chId; });
    if (!ch) return false;
    if (!canAccessChannel(ch)) return false;
    if (ch.announce) return isAdmin();
    return true;
  }

  function visibleChannels() {
    return CHANNELS.filter(canAccessChannel);
  }

  function getChannel() {
    var c = localStorage.getItem(CHANNEL_KEY) || 'general';
    var ok = visibleChannels().some(function (x) { return x.id === c; });
    return ok ? c : 'general';
  }

  function setChannel(c) {
    localStorage.setItem(CHANNEL_KEY, c);
  }

  function getSeenMap() {
    try {
      return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function getSeenId(channel) {
    var m = getSeenMap();
    return Number(m[channel] || 0);
  }

  function setSeenId(channel, id) {
    id = Number(id || 0);
    if (!id) return;
    var m = getSeenMap();
    if (id > Number(m[channel] || 0)) {
      m[channel] = id;
      localStorage.setItem(SEEN_KEY, JSON.stringify(m));
    }
  }

  function displayName(m) {
    return (m && (m.full_name || m.username)) || 'کاربر';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function clientId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async function loadAllRaw() {
    return (await DB.getAll('chat_messages').catch(function () { return []; })) || [];
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
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
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
      toast('نوتیف مسدود است — در تنظیمات مرورگر Allow کنید', 'error');
      return false;
    }
    try {
      var p = await Notification.requestPermission();
      return p === 'granted';
    } catch (e) {
      toast('درخواست نوتیف ناموفق', 'error');
      return false;
    }
  }

  function channelUnreadCounts(allMsgs) {
    var user = me();
    var map = {};
    visibleChannels().forEach(function (ch) {
      var seen = getSeenId(ch.id);
      map[ch.id] = allMsgs.filter(function (m) {
        var chId = m.channel || 'general';
        if (chId !== ch.id) return false;
        if (Number(m.deleted)) return false;
        if (Number(m.id) <= seen) return false;
        if (m.username && user.username && m.username === user.username) return false;
        return true;
      }).length;
    });
    return map;
  }

  function renderTabs(active, unreadMap) {
    return (
      '<div class="chat-channels flex gap-1 overflow-x-auto pb-2 mb-2" style="scrollbar-width:none;-webkit-overflow-scrolling:touch">' +
      visibleChannels()
        .map(function (ch) {
          var on = ch.id === active;
          var u = unreadMap[ch.id] || 0;
          return (
            '<button type="button" class="chat-ch-btn' +
            (on ? ' active' : '') +
            '" data-channel="' +
            ch.id +
            '" style="flex:0 0 auto;padding:0.35rem 0.75rem;border-radius:999px;font-size:0.75rem;font-weight:600;border:1px solid ' +
            (on ? 'rgba(52,211,153,0.5)' : 'rgba(71,85,105,0.5)') +
            ';background:' +
            (on ? 'rgba(16,185,129,0.2)' : 'rgba(30,41,59,0.7)') +
            ';color:' +
            (on ? '#e2e8f0' : '#94a3b8') +
            '">' +
            escapeHtml(ch.label) +
            (u > 0
              ? ' <span style="background:#ef4444;color:#fff;border-radius:999px;font-size:9px;padding:0 5px">' +
                (u > 99 ? '99+' : u) +
                '</span>'
              : '') +
            '</button>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderBubble(m, user) {
    var mine = m.username && user.username && m.username === user.username;
    var canMod = mine || isAdmin();
    var time = String(m.created_at || '').replace('T', ' ').slice(0, 16);
    var edited = m.edited_at ? ' · ویرایش‌شده' : '';
    var bodyHtml = Number(m.deleted)
      ? '<span class="text-slate-500 italic text-sm">این پیام حذف شد</span>'
      : '<div class="text-sm whitespace-pre-wrap break-words">' + escapeHtml(m.body) + '</div>';
    var replyPreview = '';
    if (m.reply_to && window.__chatMsgIndex && window.__chatMsgIndex[m.reply_to]) {
      var rm = window.__chatMsgIndex[m.reply_to];
      replyPreview =
        '<div class="text-[10px] text-slate-400 border-r-2 border-emerald-500/50 pr-2 mb-1 opacity-90">' +
        '↳ ' + escapeHtml(displayName(rm)) + ': ' + escapeHtml(String(rm.body || '').slice(0, 50)) +
        '</div>';
    }
    var acts =
      '<div class="flex gap-2 mt-1">' +
      '<button type="button" class="text-[10px] text-cyan-400 chat-act" data-act="reply" data-id="' +
      m.id +
      '">پاسخ</button>' +
      (canMod && !Number(m.deleted)
        ? (mine
            ? '<button type="button" class="text-[10px] text-slate-400 chat-act" data-act="edit" data-id="' +
              m.id +
              '">ویرایش</button>'
            : '') +
          '<button type="button" class="text-[10px] text-red-400 chat-act" data-act="del" data-id="' +
          m.id +
          '">حذف</button>'
        : '') +
      '</div>';
    return (
      '<div class="mb-3 flex ' +
      (mine ? 'justify-start' : 'justify-end') +
      '"><div class="max-w-[85%] rounded-2xl px-3 py-2 ' +
      (mine ? 'bg-emerald-600/25 border border-emerald-500/30' : 'bg-slate-800/80 border border-slate-600/40') +
      '"><div class="text-[10px] text-slate-400 mb-0.5">' +
      escapeHtml(displayName(m)) +
      (m.role ? ' · ' + escapeHtml(m.role) : '') +
      ' · ' +
      escapeHtml(time) +
      escapeHtml(edited) +
      '</div>' +
      replyPreview + bodyHtml + acts + '</div></div>'
    );
  }

  Pages.chat = async function () {
    var channel = getChannel();
    var all = await loadAllRaw();
    var msgs = all
      .filter(function (m) {
        return (m.channel || 'general') === channel && !Number(m.deleted);
      })
      .sort(function (a, b) {
        return Number(a.id || 0) - Number(b.id || 0);
      });

    window.__chatMsgIndex = {};
    all.forEach(function (x) { if (x && x.id) window.__chatMsgIndex[x.id] = x; });
    if (msgs.length) setSeenId(channel, msgs[msgs.length - 1].id);
    var unreadMap = channelUnreadCounts(all);
    var totalUnread = Object.keys(unreadMap).reduce(function (s, k) {
      return s + (unreadMap[k] || 0);
    }, 0);
    updateBadge(totalUnread);

    var user = me();
    var perm = 'Notification' in window ? Notification.permission : 'unsupported';
    var canWrite = canWriteChannel(channel);
    var rows = msgs
      .map(function (m) {
        return renderBubble(m, user);
      })
      .join('');

    var chLabel = (CHANNELS.find(function (c) { return c.id === channel; }) || {}).label || channel;
    var notifyBtn =
      perm === 'granted'
        ? '<span class="text-[10px] text-emerald-400">نوتیف فعال</span>'
        : '<button type="button" class="btn-ghost text-xs" onclick="Pages.requestChatNotify()">فعال‌سازی نوتیف</button>';

    var html =
      '<div class="mb-3 flex items-center justify-between gap-2 flex-wrap">' +
      '<h1 class="text-xl font-bold">💬 گفتگوی تیم</h1>' +
      notifyBtn +
      '</div>' +
      renderTabs(channel, unreadMap) +
      '<div class="glass-card rounded-2xl p-3 flex flex-col" style="min-height:55vh;max-height:68vh">' +
      '<div id="chat-scroll" class="flex-1 overflow-y-auto mb-3 px-1">' +
      (rows || '<p class="text-center text-slate-500 py-10 text-sm">هنوز پیامی در این کانال نیست</p>') +
      '</div>' +
      (canWrite
        ? (window.__chatReplyTo
            ? '<div id="chat-reply-bar" class="text-xs text-slate-300 mb-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/80 border border-slate-600/40">' +
              '<span class="flex-1">پاسخ به: ' + escapeHtml(displayName((window.__chatMsgIndex && window.__chatMsgIndex[window.__chatReplyTo]) || {})) +
              ' — ' + escapeHtml(String(((window.__chatMsgIndex && window.__chatMsgIndex[window.__chatReplyTo]) || {}).body || '').slice(0, 40)) + '</span>' +
              '<button type="button" class="text-red-400 text-[10px]" id="chat-reply-cancel">لغو</button></div>'
            : '') +
          '<form id="chat-form" class="flex gap-2 items-end">' +
          '<textarea id="chat-input" class="input-field flex-1" rows="2" placeholder="پیام در «' +
          escapeHtml(chLabel) +
          '»..." maxlength="' +
          MAX_BODY +
          '"></textarea>' +
          '<button type="submit" class="btn-primary whitespace-nowrap" id="chat-send-btn">ارسال</button></form>'
        : '<p class="text-center text-xs text-slate-500 py-2">فقط مدیران می‌توانند در این کانال بنویسند</p>') +
      '</div>';

    // navigate منتظر return رشته HTML است — innerHTML مستقیم نگذار
    setTimeout(function () {
      var sc = document.getElementById('chat-scroll');
      if (sc) sc.scrollTop = sc.scrollHeight;
      var cancel = document.getElementById('chat-reply-cancel');
      if (cancel) {
        cancel.onclick = function () {
          window.__chatReplyTo = null;
          if (typeof navigate === 'function') navigate('chat');
        };
      }
    }, 80);
    return html;
  };

  document.addEventListener('submit', function (ev) {
    if (!ev.target || ev.target.id !== 'chat-form') return;
    ev.preventDefault();
    Pages.sendChatMessage();
  });

  if (!window.__chatChannelBound) {
    window.__chatChannelBound = true;
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest && ev.target.closest('.chat-ch-btn');
      if (!t) return;
      ev.preventDefault();
      var ch = t.getAttribute('data-channel');
      if (!ch) return;
      setChannel(ch);
      if (typeof navigate === 'function') navigate('chat');
      else Pages.chat();
    });
  }

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
    var channel = getChannel();
    if (!canWriteChannel(channel)) return toast('مجوز نوشتن در این کانال را ندارید', 'error');
    var user = me();
    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }
    try {
      var payload = {
        body: text.slice(0, MAX_BODY),
        username: user.username || '',
        full_name: user.full_name || user.username || '',
        role: user.role || '',
        channel: channel,
        client_id: clientId(),
        deleted: 0,
        reply_to: window.__chatReplyTo || null,
        created_at: new Date().toISOString()
      };
      window.__chatReplyTo = null;
      var id = await DB.add('chat_messages', payload);
      if (ta) ta.value = '';
      toast('ارسال شد', 'success');
      if (id) setSeenId(channel, id);
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
      if (/no such table|chat_messages/i.test(msg)) msg = 'جدول چت روی سرور نیست — Deploy جدید لازم است';
      toast(msg || 'خطا در ارسال', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'ارسال';
      }
    }
  };

  Pages.deleteChatMessage = async function (id) {
    id = Number(id);
    if (!id) return toast('شناسه پیام نامعتبر', 'error');
    if (!window.confirm('این پیام حذف شود؟')) return;
    try {
      var msgs = await loadAllRaw();
      var m = msgs.find(function (x) { return Number(x.id) === id; });
      if (!m) return toast('پیام پیدا نشد', 'error');
      var user = me();
      if (!isAdmin() && m.username !== user.username) return toast('فقط پیام خودتان', 'error');
      try {
        m.deleted = 1;
        m.body = m.body || ' ';
        await DB.put('chat_messages', m);
      } catch (e1) {
        await DB.remove('chat_messages', id);
      }
      toast('حذف شد', 'success');
      if (typeof navigate === 'function') navigate('chat');
    } catch (e) {
      console.error(e);
      toast((e && e.message) || 'خطا در حذف', 'error');
    }
  };

  Pages.editChatMessage = async function (id) {
    id = Number(id);
    if (!id) return toast('شناسه پیام نامعتبر', 'error');
    try {
      var msgs = await loadAllRaw();
      var m = msgs.find(function (x) { return Number(x.id) === id; });
      if (!m || Number(m.deleted)) return toast('پیام پیدا نشد', 'error');
      var user = me();
      if (!isAdmin() && m.username !== user.username) return toast('فقط پیام خودتان', 'error');
      showModal(
        '<div class="modal max-w-md"><h3 class="text-lg font-bold mb-3">ویرایش پیام</h3>' +
          '<textarea id="chat-edit-body" class="input-field h-28">' +
          escapeHtml(m.body) +
          '</textarea>' +
          '<div class="flex gap-2 mt-3">' +
          '<button type="button" class="btn-primary flex-1" id="chat-edit-save">ذخیره</button>' +
          '<button type="button" class="btn-ghost" onclick="closeModal()">انصراف</button></div></div>'
      );
      document.getElementById('chat-edit-save').onclick = async function () {
        var next = (document.getElementById('chat-edit-body').value || '').trim().slice(0, MAX_BODY);
        if (!next) return toast('پیام خالی است', 'error');
        try {
          m.body = next;
          m.edited_at = new Date().toISOString();
          await DB.put('chat_messages', m);
          closeModal();
          toast('ذخیره شد', 'success');
          if (typeof navigate === 'function') navigate('chat');
        } catch (e) {
          toast((e && e.message) || 'خطا در ذخیره', 'error');
        }
      };
    } catch (e) {
      toast((e && e.message) || 'خطا', 'error');
    }
  };

  Pages.pollChat = async function () {
    if (window.__chatPollBusy) return;
    window.__chatPollBusy = true;
    try {
      var all = await loadAllRaw();
      var user = me();
      var unreadMap = channelUnreadCounts(all);
      var total = Object.keys(unreadMap).reduce(function (s, k) {
        return s + (unreadMap[k] || 0);
      }, 0);

      if (typeof currentPage !== 'undefined' && currentPage === 'chat') {
        var channel = getChannel();
        var channelMsgs = all
          .filter(function (m) {
            return (m.channel || 'general') === channel && !Number(m.deleted);
          })
          .sort(function (a, b) {
            return Number(a.id || 0) - Number(b.id || 0);
          });
        var last = channelMsgs[channelMsgs.length - 1];
        var seen = getSeenId(channel);
        if (last && Number(last.id) > seen) {
          var ta = document.getElementById('chat-input');
          var typing = ta && document.activeElement === ta && (ta.value || '').length > 0;
          setSeenId(channel, last.id);
          updateBadge(
            Object.keys(unreadMap).reduce(function (s, k) {
              return s + (k === channel ? 0 : unreadMap[k] || 0);
            }, 0)
          );
          if (!typing) {
            navigate('chat');
            setTimeout(function () {
              var sc = document.getElementById('chat-scroll');
              if (sc) sc.scrollTop = sc.scrollHeight;
            }, 150);
          }
        } else {
          updateBadge(total);
        }
        return;
      }

      if (total > 0) {
        updateBadge(total);
        var fromOthers = all.filter(function (m) {
          if (Number(m.deleted)) return false;
          if (m.username && user.username && m.username === user.username) return false;
          var ch = m.channel || 'general';
          return Number(m.id) > getSeenId(ch);
        });
        if (fromOthers.length) {
          var newest = fromOthers[fromOthers.length - 1];
          var lastNotified = Number(window.__chatLastNotifiedId || 0);
          if (Number(newest.id) > lastNotified) {
            var chLabel =
              (CHANNELS.find(function (c) {
                return c.id === (newest.channel || 'general');
              }) || {}).label || 'چت';
            notifyBrowser(
              'پیام جدید — ' + chLabel,
              displayName(newest) + ': ' + String(newest.body || '').slice(0, 80)
            );
            try {
              toast(
                '💬 [' + chLabel + '] ' + displayName(newest) + ': ' + String(newest.body || '').slice(0, 35),
                'info'
              );
            } catch (_) {}
            window.__chatLastNotifiedId = Number(newest.id);
          }
        }
      } else {
        updateBadge(0);
      }
    } catch (e) {
      console.warn('chat poll', e);
    } finally {
      window.__chatPollBusy = false;
    }
  };

  if (!window.__chatActBound) {
    window.__chatActBound = true;
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.classList || !t.classList.contains('chat-act')) return;
      ev.preventDefault();
      var id = t.getAttribute('data-id');
      var act = t.getAttribute('data-act');
      if (act === 'del') Pages.deleteChatMessage(id);
      if (act === 'edit') Pages.editChatMessage(id);
      if (act === 'reply') {
        window.__chatReplyTo = Number(id);
        if (typeof navigate === 'function') navigate('chat');
        else Pages.chat();
        setTimeout(function () {
          var ta = document.getElementById('chat-input');
          if (ta) ta.focus();
        }, 200);
      }
    });
  }

  try {
    if (window.Pages) {
      window.Pages.deleteChatMessage = Pages.deleteChatMessage;
      window.Pages.editChatMessage = Pages.editChatMessage;
      window.Pages.sendChatMessage = Pages.sendChatMessage;
      window.Pages.pollChat = Pages.pollChat;
      window.Pages.requestChatNotify = Pages.requestChatNotify;
      window.Pages.chat = Pages.chat;
    }
  } catch (_) {}

  function isLoggedIn() {
    try {
      if (window.Auth && Auth.currentUser) return true;
      var s = localStorage.getItem('kitchen_session');
      return !!(s && s.length > 5);
    } catch (_) {
      return false;
    }
  }

  if (!window.__chatPollStartedV2) {
    window.__chatPollStartedV2 = true;
    setInterval(function () {
      if (document.visibilityState !== 'visible') return;
      if (!isLoggedIn()) return;
      // خارج از صفحه چت فقط بج را سبک چک کن (همان poll، ولی نه قبل از لاگین)
      Pages.pollChat();
    }, POLL_MS);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && isLoggedIn()) Pages.pollChat();
    });
  }

  // اولین poll را عقب بینداز و فقط بعد از لاگین — لود اولیه را سنگین نکن
  setTimeout(function () {
    try {
      if (isLoggedIn()) Pages.pollChat();
    } catch (_) {}
  }, 8000);

  console.log('[chat] phase-1 channels ready + deferred poll');
})();
