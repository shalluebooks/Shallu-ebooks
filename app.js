// ============================================================
// APP ENTRY POINT — Router & Initialization
// ============================================================

function navigateTo(page) {
  AppState.currentPage = page;

  // Update nav active states
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // Route to the correct page renderer
  const routes = {
    store: renderStorePage,
    profile: renderProfilePage,
    admin: renderAdminPage,
  };

  const renderer = routes[page];
  if (renderer) {
    renderer();
  } else {
    renderStorePage();
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('hidden');
}

// ── App Initialization ─────────────────────────────────────────
async function initApp() {
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    AppState.currentUser = session.user;
    const profile = await fetchUserProfile(session.user.id);
    AppState.currentProfile = profile;
    updateNavForAuth(true, profile);

    // Load user orders for store page "Owned" badges
    const { data: orders } = await supabase
      .from('orders')
      .select('book_id, id')
      .eq('user_id', session.user.id)
      .eq('status', 'completed');
    if (orders) AppState.userOrders = orders;
  } else {
    updateNavForAuth(false);
  }

  // Render initial page (always start with store)
  navigateTo('store');
}

// ── Start the app ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
