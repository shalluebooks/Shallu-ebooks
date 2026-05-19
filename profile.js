// ============================================================
// PROFILE / MY LIBRARY MODULE
// ============================================================

async function renderProfilePage() {
  if (!AppState.currentUser) {
    openAuthModal('login');
    navigateTo('store');
    return;
  }

  const content = document.getElementById('app-content');
  content.innerHTML = `
    <div class="page">
      <!-- Profile Header -->
      <div class="bg-ink-800 border border-ink-600 rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div class="w-20 h-20 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-ink text-3xl font-bold font-display flex-shrink-0" id="profile-avatar">
          ${(AppState.currentProfile?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div class="flex-1">
          <h1 class="font-display text-3xl font-bold mb-1">${AppState.currentProfile?.full_name || 'Reader'}</h1>
          <p class="text-gray-400 text-sm mb-3">${AppState.currentUser.email}</p>
          <div class="flex gap-4">
            <div class="text-center">
              <div class="font-display text-2xl font-bold text-gold" id="total-books-count">—</div>
              <div class="text-xs text-gray-500">Books Owned</div>
            </div>
            <div class="text-center">
              <div class="font-display text-2xl font-bold text-gold" id="total-spent">—</div>
              <div class="text-xs text-gray-500">Total Spent</div>
            </div>
          </div>
        </div>
        <div>
          <button onclick="openEditProfile()" class="btn-outline text-sm">Edit Profile</button>
        </div>
      </div>

      <!-- Edit Profile Modal (inline, hidden by default) -->
      <div id="edit-profile-section" class="hidden bg-ink-800 border border-gold/30 rounded-2xl p-6 mb-8 animate-slide-up">
        <h2 class="font-display text-xl font-bold mb-4">Edit Profile</h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Full Name</label>
            <input type="text" id="edit-fullname" class="input-dark" value="${AppState.currentProfile?.full_name || ''}" />
          </div>
        </div>
        <div class="flex gap-3 mt-4">
          <button onclick="saveProfile()" class="btn-gold text-sm py-2 px-5">Save Changes</button>
          <button onclick="document.getElementById('edit-profile-section').classList.add('hidden')" class="btn-outline text-sm py-2 px-5">Cancel</button>
        </div>
      </div>

      <!-- My Orders -->
      <div>
        <h2 class="font-display text-2xl font-bold mb-6 flex items-center gap-3">
          📚 My Library
          <span class="text-sm font-body font-normal text-gray-500 bg-ink-600 px-3 py-1 rounded-full" id="orders-count-badge">Loading...</span>
        </h2>

        <div id="orders-loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${Array(3).fill(0).map(() => `<div class="skeleton h-40 rounded-xl"></div>`).join('')}
        </div>

        <div id="orders-grid" class="hidden grid sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>

        <div id="orders-empty" class="hidden text-center py-20">
          <div class="text-6xl mb-4">📖</div>
          <h3 class="font-display text-2xl text-gray-400 mb-2">No purchases yet</h3>
          <p class="text-gray-600 mb-6">Explore our store and find your next great read</p>
          <button onclick="navigateTo('store')" class="btn-gold">Browse Store</button>
        </div>
      </div>
    </div>
  `;

  await loadUserOrders();
}

async function loadUserOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', AppState.currentUser.id)
    .eq('status', 'completed')
    .order('purchased_at', { ascending: false });

  const loading = document.getElementById('orders-loading');
  const grid = document.getElementById('orders-grid');
  const empty = document.getElementById('orders-empty');
  const badge = document.getElementById('orders-count-badge');

  loading?.classList.add('hidden');

  if (error || !orders) {
    showToast('Failed to load orders', 'error');
    return;
  }

  AppState.userOrders = orders;

  // Update stats
  document.getElementById('total-books-count').textContent = orders.length;
  const total = orders.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
  document.getElementById('total-spent').textContent = formatPrice(total);
  badge.textContent = `${orders.length} book${orders.length !== 1 ? 's' : ''}`;

  if (orders.length === 0) {
    empty?.classList.remove('hidden');
    return;
  }

  grid?.classList.remove('hidden');
  grid.innerHTML = orders.map(order => `
    <div class="bg-ink-800 border border-ink-600 rounded-xl overflow-hidden flex flex-col hover:border-gold/30 transition-colors">
      <div class="h-32 relative overflow-hidden bg-ink-700">
        <img src="${order.book_cover_url || 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80'}"
          alt="${order.book_title}" class="w-full h-full object-cover opacity-70" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink-800/80 to-transparent"></div>
        <span class="absolute bottom-2 left-3 text-xs text-green-400 font-semibold">✓ Purchased</span>
      </div>
      <div class="p-4 flex flex-col flex-1 gap-2">
        <div>
          <h3 class="font-semibold text-sm leading-snug">${order.book_title}</h3>
          <p class="text-xs text-gray-500">by ${order.book_author}</p>
        </div>
        <div class="flex items-center justify-between mt-auto pt-2 border-t border-ink-600">
          <div>
            <div class="text-gold font-bold text-sm">${formatPrice(order.amount)}</div>
            <div class="text-xs text-gray-600">${formatDate(order.purchased_at)}</div>
          </div>
          <a href="${order.download_url || '#'}" target="_blank"
            class="bg-green-900/50 hover:bg-green-800/60 text-green-400 border border-green-800 text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
            ⬇ Download
          </a>
        </div>
        <div class="text-xs text-gray-700 truncate">ID: ${order.razorpay_payment_id || order.id.slice(0,8)}</div>
      </div>
    </div>
  `).join('');
}

function openEditProfile() {
  document.getElementById('edit-profile-section').classList.remove('hidden');
  document.getElementById('edit-fullname').focus();
}

async function saveProfile() {
  const fullName = document.getElementById('edit-fullname').value.trim();
  if (!fullName) {
    showToast('Name cannot be empty', 'error');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq('id', AppState.currentUser.id);

  if (error) {
    showToast('Failed to update profile', 'error');
    return;
  }

  AppState.currentProfile.full_name = fullName;
  document.getElementById('edit-profile-section').classList.add('hidden');

  // Update UI
  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) {
    avatarEl.textContent = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  document.getElementById('nav-username').textContent = fullName.split(' ')[0];
  document.getElementById('nav-avatar').textContent = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  showToast('Profile updated!', 'success');
}
