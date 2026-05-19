// ============================================================
// AUTH MODULE
// ============================================================

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').classList.remove('hidden');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginTab.classList.add('bg-ink-500', 'text-white');
    loginTab.classList.remove('text-gray-400');
    signupTab.classList.remove('bg-ink-500', 'text-white');
    signupTab.classList.add('text-gray-400');
  } else {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    signupTab.classList.add('bg-ink-500', 'text-white');
    signupTab.classList.remove('text-gray-400');
    loginTab.classList.remove('bg-ink-500', 'text-white');
    loginTab.classList.add('text-gray-400');
  }
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  const btn = document.querySelector('#form-login .btn-gold');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = 'Sign In →';

  if (error) {
    showToast(error.message, 'error');
    return;
  }

  showToast('Welcome back!', 'success');
  closeAuthModal();
}

async function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!name || !email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  const btn = document.querySelector('#form-signup .btn-gold');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });

  btn.disabled = false;
  btn.textContent = 'Create Account →';

  if (error) {
    showToast(error.message, 'error');
    return;
  }

  showToast('Account created! You are now logged in.', 'success');
  closeAuthModal();
}

async function handleLogout() {
  await supabase.auth.signOut();
  AppState.currentUser = null;
  AppState.currentProfile = null;
  AppState.isAdmin = false;
  AppState.userOrders = [];
  AppState.userRatings = {};
  updateNavForAuth(false);
  navigateTo('store');
  showToast('Signed out successfully', 'info');
}

async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
  return data;
}

function updateNavForAuth(isLoggedIn, profile = null) {
  const loggedOut = document.getElementById('auth-logged-out');
  const loggedIn = document.getElementById('auth-logged-in');
  const navProfile = document.getElementById('nav-profile');
  const navAdmin = document.getElementById('nav-admin');
  const mobNavProfile = document.getElementById('mob-nav-profile');
  const mobNavAdmin = document.getElementById('mob-nav-admin');

  if (isLoggedIn && profile) {
    loggedOut.classList.add('hidden');
    loggedIn.classList.remove('hidden');
    navProfile.classList.remove('hidden');
    mobNavProfile.classList.remove('hidden');

    const initials = (profile.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('nav-avatar').textContent = initials;
    document.getElementById('nav-username').textContent = (profile.full_name || 'User').split(' ')[0];

    if (profile.is_admin) {
      navAdmin.classList.remove('hidden');
      mobNavAdmin.classList.remove('hidden');
      AppState.isAdmin = true;
    }
  } else {
    loggedOut.classList.remove('hidden');
    loggedIn.classList.add('hidden');
    navProfile.classList.add('hidden');
    navAdmin.classList.add('hidden');
    mobNavProfile.classList.add('hidden');
    mobNavAdmin.classList.add('hidden');
  }
}

// ── Auth State Listener ───────────────────────────────────────
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    AppState.currentUser = session.user;
    const profile = await fetchUserProfile(session.user.id);
    AppState.currentProfile = profile;
    updateNavForAuth(true, profile);

    // Refresh current page if it requires auth
    if (AppState.currentPage === 'profile' || AppState.currentPage === 'admin') {
      navigateTo(AppState.currentPage);
    }
  } else {
    AppState.currentUser = null;
    AppState.currentProfile = null;
    AppState.isAdmin = false;
    updateNavForAuth(false);
  }
});

// Close modal on backdrop click
document.getElementById('auth-modal').addEventListener('click', function(e) {
  if (e.target === this) closeAuthModal();
});

// Enter key support
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const modal = document.getElementById('auth-modal');
    if (!modal.classList.contains('hidden')) {
      const loginVisible = !document.getElementById('form-login').classList.contains('hidden');
      loginVisible ? handleLogin() : handleSignup();
    }
  }
});
