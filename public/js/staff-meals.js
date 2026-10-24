/**
 * Staff teams + attendance + daily staff meals
 * Loaded after pages.js
 */
(function () {
  const TEAM_LABELS = {
    executive: 'تیم اجرایی',
    sales: 'تیم فروش',
    transport: 'تیم ترابری'
  };
  const SHIFT_LABELS = {
    full: 'فول‌تایم (صبح+ناهار+شام)',
    single: 'تک‌شیفت (صبح+ناهار)'
  };

  function hashParam(key, fallback) {
    try {
      const h = (location.hash || '').replace(/^#/, '');
      const q = h.includes('?') ? h.slice(h.indexOf('?') + 1) : '';
      const v = new URLSearchParams(q).get(key);
      return v != null && v !== '' ? v : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function personTeam(p) {
    return (p && p.team) || 'executive';
  }
  function personShift(p) {
    return (p && p.shift_type) || (personTeam(p) === 'executive' ? 'full' : 'single');
  }

  window.TEAM_LABELS = TEAM_LABELS;
  window.SHIFT_LABELS = SHIFT_LABELS;
  window.hashParam = hashParam;
  window.personTeam = personTeam;
  window.personShift = personShift;

  Pages.personnel = async function () {
    const tab = hashParam('tab', 'executive');
    const list = (await DB.getAll('personnel')) || [];
    const canEdit = Auth.isAdmin();
    const filtered = list.filter((p) => personTeam(p) === tab);
    const counts = {
      executive: list.filter((p) => personTeam(p) === 'executive').length,
      sales: list.filter((p) => personTeam(p) === 'sales').length,
      transport: list.filter((p) => personTeam(p) === 'transport').length
    };

    const tabBtn = (id, label) => {
      const active = tab === id;
      return (
        '<button class="' +
        (active ? 'btn-primary' : 'btn-secondary') +
        ' text-sm" onclick="navigate(\'personnel?tab=' +
        id +
        '\')">' +
        label +
        ' <span class="opacity-70">(' +
        (counts[id] || 0) +
        ')</span></button>'
      );
    };

    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-4">' +
      '<div><h1 class="text-2xl font-bold">پرسنل</h1>' +
      '<p class="text-slate-400 text-sm">تیم اجرایی · فروش · ترابری — حضور و غذای روزانه</p></div>' +
      '<div class="flex flex-wrap gap-2">' +
      '<button class="btn-primary" onclick="navigate(\'attendance\')">🍽️ حضور و غذای روزانه</button>' +
      (tab === 'executive'
        ? '<button class="btn-secondary" onclick="navigate(\'league\')">🏆 لیگ پرسنل</button>' +
          '<button class="btn-secondary" onclick="Pages.staffReportPrompt()">گزارش کار</button>'
        : '') +
      (canEdit
        ? '<button class="btn-secondary" onclick="Pages.showPersonForm(null,\'' +
          tab +
          '\')">+ افزودن</button>'
        : '') +
      '</div></div>' +
      '<div class="flex flex-wrap gap-2 mb-4">' +
      tabBtn('executive', 'تیم اجرایی') +
      tabBtn('sales', 'تیم فروش') +
      tabBtn('transport', 'تیم ترابری') +
      '</div>' +
      (tab === 'executive'
        ? '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-300 border border-brand-500/20">' +
          'تیم اجرایی در <b>تولید</b>، <b>لیگ</b> و <b>نمره‌دهی</b> شرکت می‌کند. فروش و ترابری فقط در حضور و غذای پرسنلی دیده می‌شوند.' +
          '</div>'
        : '<div class="glass-card rounded-2xl p-3 mb-4 text-sm text-slate-400">' +
          'این تیم فقط برای حضور و وعده غذایی پرسنلی است و در لیگ/تولید تداخل ندارد.' +
          '</div>') +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap"><table class="data">' +
      '<thead><tr><th>کد</th><th>نام</th><th>سمت</th><th>شیفت</th><th>فعال</th><th></th></tr></thead><tbody>' +
      (filtered.length
        ? filtered
            .map(function (p) {
              const safe = String(p.name || '').replace(/'/g, "\\'");
              return (
                '<tr><td class="text-slate-400">' +
                (p.code || '') +
                '</td><td class="font-medium">' +
                (p.name || '') +
                '</td><td>' +
                (p.position || '—') +
                '</td><td class="text-xs">' +
                (SHIFT_LABELS[personShift(p)] || personShift(p)) +
                '</td><td>' +
                (p.active !== false && p.active !== 0
                  ? '<span class="badge badge-ok">بله</span>'
                  : '<span class="badge badge-danger">خیر</span>') +
                '</td><td class="space-x-1 space-x-reverse whitespace-nowrap">' +
                (tab === 'executive'
                  ? '<button class="btn-ghost text-xs text-brand-300" onclick="Pages.staffReportPrompt(\'' +
                    safe +
                    '\')">گزارش کار</button> '
                  : '') +
                (canEdit
                  ? '<button class="btn-ghost text-xs" onclick="Pages.showPersonForm(' +
                    p.id +
                    ')">ویرایش</button> ' +
                    '<button class="btn-ghost text-xs text-red-400" onclick="Pages.deletePerson(' +
                    p.id +
                    ", '" +
                    safe +
                    '\')">حذف</button>'
                  : '') +
                '</td></tr>'
              );
            })
            .join('')
        : '<tr><td colspan="6" class="text-center text-slate-500 py-8">هنوز فردی در این تیم ثبت نشده</td></tr>') +
      '</tbody></table></div></div>'
    );
  };

  const _origShowPersonForm = Pages.showPersonForm;
  Pages.showPersonForm = async function (id, defaultTeam) {
    if (!Auth.isAdmin()) return;
    let item = {
      code: '',
      name: '',
      position: '',
      team: defaultTeam || 'executive',
      shift_type: defaultTeam && defaultTeam !== 'executive' ? 'single' : 'full',
      active: true
    };
    if (id) item = (await DB.getById('personnel', id)) || item;
    const team = item.team || defaultTeam || 'executive';
    const shift = item.shift_type || (team === 'executive' ? 'full' : 'single');

    showModal(
      '<div class="modal"><h3 class="text-lg font-bold mb-4">' +
        (id ? 'ویرایش پرسنل' : 'افزودن پرسنل') +
        '</h3><form id="person-form" class="space-y-3">' +
        '<div><label class="text-xs text-slate-400">کد</label><input name="code" class="input-field" value="' +
        (item.code || '') +
        '" required ' +
        (id ? 'readonly' : '') +
        ' /></div>' +
        '<div><label class="text-xs text-slate-400">نام</label><input name="name" class="input-field" value="' +
        (item.name || '') +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">سمت</label><input name="position" class="input-field" value="' +
        (item.position || '') +
        '" /></div>' +
        '<div><label class="text-xs text-slate-400">تیم</label><select name="team" class="input-field">' +
        '<option value="executive"' +
        (team === 'executive' ? ' selected' : '') +
        '>تیم اجرایی (آشپزخانه)</option>' +
        '<option value="sales"' +
        (team === 'sales' ? ' selected' : '') +
        '>تیم فروش</option>' +
        '<option value="transport"' +
        (team === 'transport' ? ' selected' : '') +
        '>تیم ترابری</option></select></div>' +
        '<div><label class="text-xs text-slate-400">نوع شیفت پیش‌فرض</label><select name="shift_type" class="input-field">' +
        '<option value="full"' +
        (shift === 'full' ? ' selected' : '') +
        '>فول‌تایم — صبح + ناهار + شام</option>' +
        '<option value="single"' +
        (shift === 'single' ? ' selected' : '') +
        '>تک‌شیفت — صبح + ناهار</option></select>' +
        '<p class="text-[10px] text-slate-500 mt-1">بعداً با تقویم کاری قابل override است</p></div>' +
        '<div class="flex gap-2 pt-2"><button type="submit" class="btn-primary flex-1">ذخیره</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div>' +
        '</form></div>'
    );

    document.getElementById('person-form').onsubmit = async function (ev) {
      ev.preventDefault();
      const btn = ev.target.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'در حال ذخیره...';
      }
      try {
        const data = Object.fromEntries(new FormData(ev.target).entries());
        data.active = 1;
        data.team = data.team || 'executive';
        data.shift_type = data.shift_type || 'full';
        if (id) {
          data.id = id;
          const prev = await DB.getById('personnel', id);
          if (prev) Object.assign(prev, data);
          await DB.put('personnel', prev || data);
        } else await DB.add('personnel', data);
        toast('ذخیره شد', 'success');
        closeModal();
        navigate('personnel?tab=' + (data.team || 'executive'));
      } catch (e) {
        console.error(e);
        toast(e.message || 'خطا در ذخیره پرسنل', 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'ذخیره';
        }
      }
    };
  };

  Pages.attendance = async function () {
    const day = hashParam('day', todayJalali());
    const teamFilter = hashParam('team', 'all');
    const canEdit = Auth.isAdmin();

    const people0 = await DB.getAll('personnel').catch(function () {
      return [];
    });
    const menus0 = await DB.getAll('daily_staff_menu').catch(function () {
      return [];
    });
    const att0 = await DB.getAll('attendance_meals').catch(function () {
      return [];
    });

    const people = (people0 || []).filter(function (p) {
      return p.active !== false && p.active !== 0;
    });
    const menu =
      (menus0 || []).find(function (m) {
        return m.date === day;
      }) || { date: day, breakfast_name: '', main_meal_name: '', notes: '' };
    const attRows = (att0 || []).filter(function (a) {
      return a.date === day;
    });
    const attByPerson = {};
    attRows.forEach(function (a) {
      attByPerson[a.person_id] = a;
    });

    let rows = people.map(function (p) {
      const sh = personShift(p);
      const a = attByPerson[p.id] || {};
      return {
        person: p,
        team: personTeam(p),
        shift: sh,
        present: !!Number(a.present),
        breakfast: !!Number(a.breakfast),
        lunch: !!Number(a.lunch),
        dinner: !!Number(a.dinner)
      };
    });
    if (teamFilter !== 'all')
      rows = rows.filter(function (r) {
        return r.team === teamFilter;
      });

    const sum = {
      present: rows.filter(function (r) {
        return r.present;
      }).length,
      breakfast: rows.filter(function (r) {
        return r.breakfast;
      }).length,
      lunch: rows.filter(function (r) {
        return r.lunch;
      }).length,
      dinner: rows.filter(function (r) {
        return r.dinner;
      }).length,
      total: rows.length
    };

    const teamChip = function (id, label) {
      const active = teamFilter === id;
      return (
        '<button class="' +
        (active ? 'btn-primary' : 'btn-ghost') +
        ' text-xs" onclick="navigate(\'attendance?day=' +
        encodeURIComponent(day) +
        '&team=' +
        id +
        '\')">' +
        label +
        '</button>'
      );
    };

    const chk = function (name, pid, checked, disabled) {
      if (disabled) return '<span class="text-slate-600">—</span>';
      return (
        '<input type="checkbox" data-field="' +
        name +
        '" data-pid="' +
        pid +
        '" ' +
        (checked ? 'checked' : '') +
        ' class="att-chk w-4 h-4 accent-emerald-500 cursor-pointer" ' +
        (canEdit ? '' : 'disabled') +
        ' />'
      );
    };

    const body = rows
      .map(function (r) {
        const allowDinner = r.shift === 'full';
        return (
          '<tr data-pid="' +
          r.person.id +
          '" data-name="' +
          String(r.person.name || '').replace(/"/g, '&quot;') +
          '" data-team="' +
          r.team +
          '" data-shift="' +
          r.shift +
          '">' +
          '<td class="font-medium">' +
          r.person.name +
          '</td>' +
          '<td class="text-xs text-slate-400">' +
          (TEAM_LABELS[r.team] || r.team) +
          '</td>' +
          '<td>' +
          chk('present', r.person.id, r.present, false) +
          '</td>' +
          '<td>' +
          chk('breakfast', r.person.id, r.breakfast, false) +
          '</td>' +
          '<td>' +
          chk('lunch', r.person.id, r.lunch, false) +
          '</td>' +
          '<td>' +
          chk('dinner', r.person.id, r.dinner, !allowDinner) +
          '</td></tr>'
        );
      })
      .join('');

    return (
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-4">' +
      '<div><h1 class="text-2xl font-bold">🍽️ حضور و غذای روزانه</h1>' +
      '<p class="text-slate-400 text-sm">صبحانه جدا · ناهار و شام یک غذا · قابل گزارش</p></div>' +
      '<div class="flex flex-wrap gap-2">' +
      '<button class="btn-secondary text-sm" onclick="navigate(\'personnel\')">← پرسنل</button>' +
      '<button class="btn-secondary text-sm" onclick="Pages.staffMealWhatsApp()">📱 واتساپ امروز</button>' +
      '<button class="btn-secondary text-sm" onclick="Pages.staffMealReportForm()">📑 گزارش</button>' +
      '</div></div>' +
      '<div class="glass-card rounded-2xl p-4 mb-4 space-y-3">' +
      '<div class="flex flex-wrap gap-3 items-end"><div>' +
      '<label class="text-xs text-slate-400">تاریخ</label>' +
      '<input id="att-day" class="input-field" value="' +
      day +
      '" style="max-width:140px" onchange="navigate(\'attendance?day=\'+encodeURIComponent(this.value)+\'&team=' +
      teamFilter +
      '\')" /></div>' +
      '<div class="flex gap-1 flex-wrap">' +
      teamChip('all', 'همه') +
      teamChip('executive', 'اجرایی') +
      teamChip('sales', 'فروش') +
      teamChip('transport', 'ترابری') +
      '</div></div>' +
      '<div class="grid sm:grid-cols-2 gap-3"><div>' +
      '<label class="text-xs text-slate-400">نام غذا — صبحانه</label>' +
      '<input id="menu-breakfast" class="input-field" value="' +
      String(menu.breakfast_name || '').replace(/"/g, '&quot;') +
      '" placeholder="مثلاً نیمرو + پنیر" ' +
      (canEdit ? '' : 'readonly') +
      ' /></div><div>' +
      '<label class="text-xs text-slate-400">نام غذا — ناهار / شام (مشترک)</label>' +
      '<input id="menu-main" class="input-field" value="' +
      String(menu.main_meal_name || '').replace(/"/g, '&quot;') +
      '" placeholder="مثلاً عدس پلو" ' +
      (canEdit ? '' : 'readonly') +
      ' /></div></div>' +
      (canEdit
        ? '<button class="btn-primary text-sm" onclick="Pages.saveStaffMenu(\'' +
          day +
          '\')">ذخیره نام غذا</button>'
        : '') +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">' +
      '<div class="stat-card text-center"><div class="text-xs text-slate-400">حضور</div><div class="text-lg font-bold">' +
      sum.present +
      '/' +
      sum.total +
      '</div></div>' +
      '<div class="stat-card text-center"><div class="text-xs text-slate-400">صبحانه</div><div class="text-lg font-bold">' +
      sum.breakfast +
      '</div></div>' +
      '<div class="stat-card text-center"><div class="text-xs text-slate-400">ناهار</div><div class="text-lg font-bold">' +
      sum.lunch +
      '</div></div>' +
      '<div class="stat-card text-center"><div class="text-xs text-slate-400">شام</div><div class="text-lg font-bold">' +
      sum.dinner +
      '</div></div></div>' +
      '<div class="glass-card rounded-2xl p-4"><div class="table-wrap">' +
      '<table class="data" id="att-table"><thead><tr><th>نام</th><th>تیم</th><th>حضور</th><th>صبحانه</th><th>ناهار</th><th>شام</th></tr></thead><tbody>' +
      (body ||
        '<tr><td colspan="6" class="text-center text-slate-500 py-8">پرسنل فعالی نیست</td></tr>') +
      '</tbody></table></div>' +
      (canEdit
        ? '<div class="flex flex-wrap gap-2 mt-4">' +
          '<button class="btn-primary" onclick="Pages.saveAttendance(\'' +
          day +
          '\')">💾 ذخیره حضور و وعده‌ها</button>' +
          '<button class="btn-ghost text-sm" onclick="Pages.markAllPresent()">همه حاضر</button></div>'
        : '') +
      '</div>'
    );
  };

  Pages.saveStaffMenu = async function (day) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    day = day || (document.getElementById('att-day') && document.getElementById('att-day').value) || todayJalali();
    const breakfast_name = ((document.getElementById('menu-breakfast') && document.getElementById('menu-breakfast').value) || '').trim();
    const main_meal_name = ((document.getElementById('menu-main') && document.getElementById('menu-main').value) || '').trim();
    try {
      const all = (await DB.getAll('daily_staff_menu').catch(function () { return []; })) || [];
      const existing = all.find(function (m) { return m.date === day; });
      const data = { date: day, breakfast_name: breakfast_name, main_meal_name: main_meal_name, updated_at: new Date().toISOString() };
      if (existing && existing.id) {
        data.id = existing.id;
        await DB.put('daily_staff_menu', Object.assign({}, existing, data));
      } else {
        data.created_at = new Date().toISOString();
        await DB.add('daily_staff_menu', data);
      }
      toast('منوی روز ذخیره شد', 'success');
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره منو', 'error');
    }
  };

  Pages.markAllPresent = function () {
    document.querySelectorAll('#att-table input[data-field="present"]').forEach(function (el) {
      el.checked = true;
    });
  };

  Pages.saveAttendance = async function (day) {
    if (!Auth.isAdmin()) return toast('فقط مدیر', 'error');
    day = day || (document.getElementById('att-day') && document.getElementById('att-day').value) || todayJalali();
    try {
      await Pages.saveStaffMenu(day);
    } catch (_) {}

    const trs = document.querySelectorAll('#att-table tbody tr[data-pid]');
    try {
      const all = (await DB.getAll('attendance_meals').catch(function () { return []; })) || [];
      let saved = 0;
      for (let i = 0; i < trs.length; i++) {
        const tr = trs[i];
        const pid = Number(tr.getAttribute('data-pid'));
        const name = tr.getAttribute('data-name') || '';
        const team = tr.getAttribute('data-team') || '';
        const shift = tr.getAttribute('data-shift') || 'full';
        const get = function (f) {
          const el = tr.querySelector('input[data-field="' + f + '"]');
          return el && el.checked ? 1 : 0;
        };
        const present = get('present');
        const breakfast = get('breakfast');
        const lunch = get('lunch');
        const dinner = shift === 'full' ? get('dinner') : 0;
        const existing = all.find(function (a) {
          return a.date === day && Number(a.person_id) === pid;
        });
        const data = {
          date: day,
          person_id: pid,
          person_name: name,
          team: team,
          present: present,
          breakfast: breakfast,
          lunch: lunch,
          dinner: dinner,
          updated_at: new Date().toISOString()
        };
        if (existing && existing.id) {
          await DB.put('attendance_meals', Object.assign({}, existing, data, { id: existing.id }));
        } else {
          data.created_at = new Date().toISOString();
          await DB.add('attendance_meals', data);
        }
        saved++;
      }
      toast('حضور و وعده‌ها ذخیره شد (' + saved + ' نفر)', 'success');
      navigate('attendance?day=' + encodeURIComponent(day));
    } catch (e) {
      console.error(e);
      toast(e.message || 'خطا در ذخیره حضور', 'error');
    }
  };

  Pages.staffMealReportForm = async function () {
    const from = todayJalali();
    showModal(
      '<div class="modal"><h3 class="text-lg font-bold mb-4">گزارش حضور و غذای پرسنلی</h3>' +
        '<form id="meal-report-form" class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-xs text-slate-400">از تاریخ</label><input name="from" class="input-field" value="' +
        from +
        '" required /></div>' +
        '<div><label class="text-xs text-slate-400">تا تاریخ</label><input name="to" class="input-field" value="' +
        from +
        '" required /></div></div>' +
        '<div><label class="text-xs text-slate-400">تیم</label><select name="team" class="input-field">' +
        '<option value="all">همه</option><option value="executive">تیم اجرایی</option>' +
        '<option value="sales">تیم فروش</option><option value="transport">تیم ترابری</option></select></div>' +
        '<div class="flex gap-2 pt-2"><button type="submit" class="btn-primary flex-1">نمایش گزارش</button>' +
        '<button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button></div></form></div>'
    );
    document.getElementById('meal-report-form').onsubmit = async function (ev) {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(ev.target).entries());
      closeModal();
      await Pages.staffMealReport(fd.from, fd.to, fd.team || 'all');
    };
  };

  Pages.staffMealReport = async function (from, to, team) {
    const att0 = await DB.getAll('attendance_meals').catch(function () { return []; });
    const menus0 = await DB.getAll('daily_staff_menu').catch(function () { return []; });
    let rows = (att0 || []).filter(function (a) {
      if (from && a.date < from) return false;
      if (to && a.date > to) return false;
      if (team && team !== 'all' && a.team !== team) return false;
      return true;
    });
    const menuByDate = {};
    (menus0 || []).forEach(function (m) {
      menuByDate[m.date] = m;
    });

    const byDay = {};
    rows.forEach(function (a) {
      if (!byDay[a.date]) byDay[a.date] = { present: 0, breakfast: 0, lunch: 0, dinner: 0 };
      if (Number(a.present)) byDay[a.date].present++;
      if (Number(a.breakfast)) byDay[a.date].breakfast++;
      if (Number(a.lunch)) byDay[a.date].lunch++;
      if (Number(a.dinner)) byDay[a.date].dinner++;
    });
    const days = Object.keys(byDay).sort();

    const totals = rows.reduce(
      function (s, a) {
        s.present += Number(a.present) ? 1 : 0;
        s.breakfast += Number(a.breakfast) ? 1 : 0;
        s.lunch += Number(a.lunch) ? 1 : 0;
        s.dinner += Number(a.dinner) ? 1 : 0;
        return s;
      },
      { present: 0, breakfast: 0, lunch: 0, dinner: 0 }
    );

    showModal(
      '<div class="modal" style="max-width:720px"><h3 class="text-lg font-bold mb-2">گزارش حضور و غذا</h3>' +
        '<p class="text-sm text-slate-400 mb-3">' +
        from +
        ' تا ' +
        to +
        ' · ' +
        (team === 'all' ? 'همه تیم‌ها' : TEAM_LABELS[team] || team) +
        '</p>' +
        '<div class="grid grid-cols-4 gap-2 mb-4 text-center text-sm">' +
        '<div class="stat-card"><div class="text-xs text-slate-400">حضور</div><b>' +
        totals.present +
        '</b></div>' +
        '<div class="stat-card"><div class="text-xs text-slate-400">صبحانه</div><b>' +
        totals.breakfast +
        '</b></div>' +
        '<div class="stat-card"><div class="text-xs text-slate-400">ناهار</div><b>' +
        totals.lunch +
        '</b></div>' +
        '<div class="stat-card"><div class="text-xs text-slate-400">شام</div><b>' +
        totals.dinner +
        '</b></div></div>' +
        '<div class="table-wrap max-h-80 overflow-y-auto"><table class="data">' +
        '<thead><tr><th>تاریخ</th><th>صبحانه</th><th>ناهار/شام</th><th>حضور</th><th>صبح</th><th>ناهار</th><th>شام</th></tr></thead><tbody>' +
        (days.length
          ? days
              .map(function (d) {
                const m = menuByDate[d] || {};
                const s = byDay[d];
                return (
                  '<tr><td>' +
                  d +
                  '</td><td class="text-xs">' +
                  (m.breakfast_name || '—') +
                  '</td><td class="text-xs">' +
                  (m.main_meal_name || '—') +
                  '</td><td>' +
                  s.present +
                  '</td><td>' +
                  s.breakfast +
                  '</td><td>' +
                  s.lunch +
                  '</td><td>' +
                  s.dinner +
                  '</td></tr>'
                );
              })
              .join('')
          : '<tr><td colspan="7" class="text-center text-slate-500 py-6">داده‌ای نیست</td></tr>') +
        '</tbody></table></div>' +
        '<div class="flex gap-2 mt-4">' +
        '<button class="btn-secondary flex-1" onclick="Pages.exportStaffMealExcel(\'' +
        from +
        "','" +
        to +
        "','" +
        team +
        '\')">📥 اکسل</button>' +
        '<button class="btn-ghost" onclick="closeModal()">بستن</button></div></div>'
    );
  };

  Pages.exportStaffMealExcel = async function (from, to, team) {
    const att0 = await DB.getAll('attendance_meals').catch(function () { return []; });
    const menus0 = await DB.getAll('daily_staff_menu').catch(function () { return []; });
    let rows = (att0 || []).filter(function (a) {
      if (from && a.date < from) return false;
      if (to && a.date > to) return false;
      if (team && team !== 'all' && a.team !== team) return false;
      return true;
    });
    const menuByDate = {};
    (menus0 || []).forEach(function (m) {
      menuByDate[m.date] = m;
    });
    const data = rows.map(function (a) {
      const m = menuByDate[a.date] || {};
      return {
        تاریخ: a.date,
        نام: a.person_name,
        تیم: TEAM_LABELS[a.team] || a.team,
        حضور: Number(a.present) ? 'بله' : 'خیر',
        صبحانه: Number(a.breakfast) ? 'بله' : 'خیر',
        ناهار: Number(a.lunch) ? 'بله' : 'خیر',
        شام: Number(a.dinner) ? 'بله' : 'خیر',
        'غذای صبحانه': m.breakfast_name || '',
        'غذای ناهار/شام': m.main_meal_name || ''
      };
    });
    if (!data.length) return toast('داده‌ای برای خروجی نیست', 'error');
    exportToExcel(data, 'staff-meals-' + from + '-' + to);
    toast('خروجی اکسل آماده شد', 'success');
  };
})();
