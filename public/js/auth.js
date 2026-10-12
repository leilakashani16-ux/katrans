/**
 * Auth — cloud-first (D1 via /api), local fallback only if API offline
 */
let currentUser = null;

function getSession() {
  try {
    const s = localStorage.getItem('kitchen_session');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function setSession(user) {
  currentUser = user;
  localStorage.setItem(
    'kitchen_session',
    JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
    })
  );
}

function clearSession() {
  currentUser = null;
  localStorage.removeItem('kitchen_session');
  if (window.Api) Api.logout();
}

async function login(username, password) {
  if (window.Api) {
    const health = await Api.health();
    if (health.ok) {
      try {
        const res = await Api.login(username, password);
        if (!res.ok) return { ok: false, msg: res.msg || 'ورود ناموفق' };
        setSession(res.user);
        return { ok: true, user: res.user, mode: 'cloud' };
      } catch (e) {
        return { ok: false, msg: e.message || 'خطا در ورود ابری' };
      }
    }
    if (health.code === 'NO_D1') {
      return {
        ok: false,
        msg: 'دیتابیس ابری (D1) متصل نیست. در Cloudflare یک D1 بسازید و به پروژه bind کنید.',
      };
    }
  }

  if (!window.DB || !DB.getAll) {
    return { ok: false, msg: 'سرور در دسترس نیست' };
  }
  await DB.openDB();
  await DB.seedIfEmpty();
  const users = await DB.getAll('users');
  const user = users.find((u) => u.username === username && u.active !== false);
  if (!user) return { ok: false, msg: 'نام کاربری یا رمز عبور اشتباه است' };
  const ok = await verifyPassword(password, user.password || user.password_hash);
  if (!ok) return { ok: false, msg: 'نام کاربری یا رمز عبور اشتباه است' };
  if (user.password && String(user.password).length !== 64) {
    user.password = await hashPassword(password);
    await DB.put('users', user);
  }
  setSession(user);
  return { ok: true, user, mode: 'local' };
}

function logout() {
  clearSession();
  location.reload();
}

function isAdmin() {
  return currentUser?.role === 'admin';
}
function canEntry() {
  return currentUser?.role === 'admin' || currentUser?.role === 'entry';
}
function canProduction() {
  return currentUser?.role === 'admin' || currentUser?.role === 'production';
}
function canEditDelete() {
  return currentUser?.role === 'admin';
}

function requireAuth() {
  const s = getSession();
  if (!s) return false;
  currentUser = s;
  if (window.Api) Api.loadToken();
  return true;
}

window.Auth = {
  login,
  logout,
  requireAuth,
  isAdmin,
  canEntry,
  canProduction,
  canEditDelete,
  get currentUser() {
    return currentUser;
  },
};
