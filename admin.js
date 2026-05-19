// ============================================================
// ADMIN MODULE
// ============================================================

let adminBooks = [];
let adminOrders = [];
let editingBookId = null;

async function renderAdminPage() {
  if (!AppState.currentUser || !AppState.isAdmin) {
    showToast('Admin access required', 'error');
    navigateTo('store');
    return;
  }

  const content = document.getElementById('app-content');
  content.innerHTML = `
    <div class="page">
      <!-- Admin Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <p class="text-gold text-xs font-semibold tracking-widest uppercase mb-1">Control Center</p>
          <h1 class="font-display text-3xl font-bold">Admin Panel</h1>
        </div>
        <div class="hidden sm:flex items-center gap-2 bg-ink-700 rounded-xl px-4 py-2 border border-ink-500">
          <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span class="text-xs text-gray-400">Live</span>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="flex gap-1 bg-ink-800 border border-ink-600 rounded-xl p-1 mb-8 overflow-x-auto">
        <button onclick="switchAdminTab('dashboard')" id="admin-tab-dashboard" class="admin-tab flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all bg-ink-600 text-white whitespace-nowrap">
          📊 Dashboard
        </button>
        <button onclick="switchAdminTab('orders')" id="admin-tab-orders" class="admin-tab flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all text-gray-400 whitespace-nowrap">
          📦 Orders
        </button>
        <button onclick="switchAdminTab('inventory')" id="admin-tab-inventory" class="admin-tab flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all text-gray-400 whitespace-nowrap">
          📚 Inventory
        </button>
      </div>

      <!-- Tab Content -->
      <div id="admin-tab-content"></div>
    </div>
  `;

  await loadAdminData();
  switchAdminTab('dashboard');
}

async function loadAdminData() {
  // Fetch all orders (admin sees all)
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select(`*, profiles:user_id(full_name)`)
    .order('purchased_at', { ascending: false });

  if (!ordersErr) adminOrders = orders || [];

  // Fetch all books
  const { data: books, error: booksErr } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (!booksErr) adminBooks = books || [];
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.remove('bg-ink-600', 'text-white');
    btn.classList.add('text-gray-400');
  });
  const active = document.getElementById(`admin-tab-${tab}`);
  active.classList.add('bg-ink-600', 'text-white');
  active.classList.remove('text-gray-400');

  const content = document.getElementById('admin-tab-content');
  if (tab === 'dashboard') renderAdminDashboard(content);
  else if (tab === 'orders') renderAdminOrders(content);
  else if (tab === 'inventory') renderAdminInventory(content);
}

function renderAdminDashboard(container) {
  const totalRevenue = adminOrders.filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
  const totalOrders = adminOrders.filter(o => o.status === 'completed').length;

  // Book-wise sales
  const bookSales = {};
  adminOrders.filter(o => o.status === 'completed').forEach(o => {
    if (!bookSales[o.book_title]) bookSales[o.book_title] = { count: 0, revenue: 0, cover: o.book_cover_url };
    bookSales[o.book_title].count++;
    bookSales[o.book_title].revenue += parseFloat(o.amount || 0);
  });
  const sortedBooks = Object.entries(bookSales).sort((a, b) => b[1].revenue - a[1].revenue);

  container.innerHTML = `
    <div class="animate-fade-in space-y-8">
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${[
          { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: '💰', color: 'text-gold' },
          { label: 'Total Orders', value: totalOrders, icon: '📦', color: 'text-blue-400' },
          { label: 'Books Listed', value: adminBooks.filter(b => b.is_active).length, icon: '📚', color: 'text-purple-400' },
          { label: 'Avg Order Value', value: totalOrders ? formatPrice(totalRevenue / totalOrders) : '₹0', icon: '📈', color: 'text-green-400' },
        ].map(kpi => `
          <div class="bg-ink-800 border border-ink-600 rounded-xl p-5">
            <div class="text-3xl mb-3">${kpi.icon}</div>
            <div class="font-display text-2xl font-bold ${kpi.color} mb-1">${kpi.value}</div>
            <div class="text-xs text-gray-500">${kpi.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- Book Performance -->
      <div class="bg-ink-800 border border-ink-600 rounded-xl overflow-hidden">
        <div class="p-5 border-b border-ink-600">
          <h2 class="font-display text-lg font-bold">Book Performance</h2>
          <p class="text-gray-500 text-sm">Revenue and sales by title</p>
        </div>
        <div class="overflow-x-auto">
          ${sortedBooks.length === 0
            ? `<p class="text-gray-500 text-center py-10">No sales data yet</p>`
            : `<table class="w-full admin-table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedBooks.map(([title, stats], i) => {
                    const maxRev = sortedBooks[0][1].revenue;
                    const pct = maxRev > 0 ? (stats.revenue / maxRev * 100).toFixed(0) : 0;
                    return `
                      <tr>
                        <td>
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-10 rounded overflow-hidden bg-ink-700 flex-shrink-0">
                              <img src="${stats.cover || ''}" alt="${title}" class="w-full h-full object-cover opacity-70" />
                            </div>
                            <span class="font-medium text-sm line-clamp-1">${title}</span>
                          </div>
                        </td>
                        <td><span class="text-blue-400 font-semibold">${stats.count}</span></td>
                        <td><span class="text-gold font-semibold">${formatPrice(stats.revenue)}</span></td>
                        <td>
                          <div class="flex items-center gap-2">
                            <div class="flex-1 bg-ink-600 rounded-full h-2 min-w-20">
                              <div class="bg-gradient-to-r from-gold-dark to-gold h-2 rounded-full transition-all" style="width:${pct}%"></div>
                            </div>
                            <span class="text-xs text-gray-500">${pct}%</span>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>`
          }
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="bg-ink-800 border border-ink-600 rounded-xl overflow-hidden">
        <div class="p-5 border-b border-ink-600 flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">Recent Orders</h2>
          <button onclick="switchAdminTab('orders')" class="text-gold text-sm hover:underline">View All</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead><tr><th>Customer</th><th>Book</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              ${adminOrders.slice(0, 5).map(o => `
                <tr>
                  <td class="text-gray-300">${o.profiles?.full_name || o.user_id?.slice(0, 8) + '...'}</td>
                  <td class="max-w-xs"><div class="truncate text-sm">${o.book_title}</div></td>
                  <td class="text-gold font-semibold">${formatPrice(o.amount)}</td>
                  <td class="text-gray-500 text-sm">${formatDate(o.purchased_at)}</td>
                  <td><span class="px-2 py-1 rounded-full text-xs font-semibold ${o.status === 'completed' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}">${o.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderAdminOrders(container) {
  container.innerHTML = `
    <div class="animate-fade-in">
      <div class="flex flex-col sm:flex-row gap-3 mb-6">
        <input type="text" id="order-search" class="input-dark flex-1" placeholder="Search by customer, book title..." oninput="filterAdminOrders()" />
        <select id="order-status-filter" class="input-dark sm:w-40" onchange="filterAdminOrders()">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div class="bg-ink-800 border border-ink-600 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full admin-table" id="admin-orders-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Book</th>
                <th>Payment ID</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="orders-tbody">
              ${renderOrderRows(adminOrders)}
            </tbody>
          </table>
        </div>
        ${adminOrders.length === 0 ? `<p class="text-gray-500 text-center py-12">No orders yet</p>` : ''}
      </div>
    </div>
  `;
}

function renderOrderRows(orders) {
  return orders.map(o => `
    <tr>
      <td>
        <div class="text-sm font-medium">${o.profiles?.full_name || 'Unknown'}</div>
        <div class="text-xs text-gray-600">${o.user_id?.slice(0, 12)}...</div>
      </td>
      <td>
        <div class="flex items-center gap-2">
          <img src="${o.book_cover_url || ''}" alt="${o.book_title}" class="w-8 h-10 object-cover rounded opacity-70" onerror="this.style.display='none'" />
          <div>
            <div class="text-sm font-medium line-clamp-1 max-w-xs">${o.book_title}</div>
            <div class="text-xs text-gray-500">by ${o.book_author}</div>
          </div>
        </div>
      </td>
      <td class="text-xs text-gray-500 font-mono">${o.razorpay_payment_id || '—'}</td>
      <td class="text-gold font-semibold">${formatPrice(o.amount)}</td>
      <td class="text-gray-500 text-sm">${formatDate(o.purchased_at)}</td>
      <td><span class="px-2 py-1 rounded-full text-xs font-semibold ${o.status === 'completed' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}">${o.status}</span></td>
    </tr>
  `).join('');
}

function filterAdminOrders() {
  const query = document.getElementById('order-search')?.value.toLowerCase() || '';
  const status = document.getElementById('order-status-filter')?.value || '';
  const filtered = adminOrders.filter(o => {
    const matchQ = !query || o.book_title?.toLowerCase().includes(query) ||
      o.profiles?.full_name?.toLowerCase().includes(query) ||
      o.razorpay_payment_id?.toLowerCase().includes(query);
    const matchS = !status || o.status === status;
    return matchQ && matchS;
  });
  document.getElementById('orders-tbody').innerHTML = renderOrderRows(filtered);
}

function renderAdminInventory(container) {
  container.innerHTML = `
    <div class="animate-fade-in space-y-8">
      <!-- Add/Edit Book Form -->
      <div class="bg-ink-800 border border-ink-600 rounded-xl overflow-hidden">
        <div class="p-5 border-b border-ink-600">
          <h2 class="font-display text-lg font-bold" id="inventory-form-title">Add New Book</h2>
        </div>
        <div class="p-6 grid sm:grid-cols-2 gap-4">
          <input type="hidden" id="book-id" />
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Title *</label>
            <input type="text" id="book-title" class="input-dark" placeholder="Book title" />
          </div>
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Author *</label>
            <input type="text" id="book-author" class="input-dark" placeholder="Author name" />
          </div>
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Price (INR) *</label>
            <input type="number" id="book-price" class="input-dark" placeholder="299" min="0" step="0.01" />
          </div>
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Category</label>
            <input type="text" id="book-category" class="input-dark" placeholder="Technology, Business..." />
          </div>
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Cover Image URL</label>
            <input type="url" id="book-cover" class="input-dark" placeholder="https://..." />
          </div>
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Download URL *</label>
            <input type="url" id="book-download" class="input-dark" placeholder="https://drive.google.com/..." />
          </div>
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Total Pages</label>
            <input type="number" id="book-pages" class="input-dark" placeholder="200" min="1" />
          </div>
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Language</label>
            <input type="text" id="book-language" class="input-dark" placeholder="English" />
          </div>
          <div class="sm:col-span-2">
            <label class="text-xs text-gray-400 mb-1 block">Description</label>
            <textarea id="book-description" class="input-dark" rows="3" placeholder="Short description of the book..."></textarea>
          </div>
        </div>
        <div class="px-6 pb-6 flex gap-3">
          <button onclick="saveBook()" class="btn-gold">
            <span id="save-book-label">Add Book</span>
          </button>
          <button onclick="resetBookForm()" class="btn-outline">Reset</button>
        </div>
      </div>

      <!-- Books Table -->
      <div class="bg-ink-800 border border-ink-600 rounded-xl overflow-hidden">
        <div class="p-5 border-b border-ink-600 flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">All Books</h2>
          <span class="text-sm text-gray-500">${adminBooks.length} total</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead>
              <tr><th>Book</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody id="inventory-tbody">
              ${renderInventoryRows(adminBooks)}
            </tbody>
          </table>
          ${adminBooks.length === 0 ? `<p class="text-gray-500 text-center py-10">No books yet. Add one above!</p>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderInventoryRows(books) {
  return books.map(book => `
    <tr id="inv-row-${book.id}">
      <td>
        <div class="flex items-center gap-3">
          <img src="${book.cover_url || ''}" alt="${book.title}" class="w-10 h-12 object-cover rounded opacity-70 flex-shrink-0" onerror="this.style.display='none'" />
          <div>
            <div class="text-sm font-semibold line-clamp-1 max-w-xs">${book.title}</div>
            <div class="text-xs text-gray-500">by ${book.author}</div>
          </div>
        </div>
      </td>
      <td><span class="category-pill !cursor-default">${book.category || '—'}</span></td>
      <td class="text-gold font-semibold">${formatPrice(book.price)}</td>
      <td>
        <span class="px-2 py-1 rounded-full text-xs font-semibold ${book.is_active ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}">
          ${book.is_active ? 'Active' : 'Hidden'}
        </span>
      </td>
      <td>
        <div class="flex gap-2">
          <button onclick="editBook(${JSON.stringify(book).replace(/"/g, '&quot;')})"
            class="text-xs px-3 py-1.5 bg-ink-600 hover:bg-ink-500 rounded-lg transition-colors">Edit</button>
          <button onclick="toggleBookStatus('${book.id}', ${book.is_active})"
            class="text-xs px-3 py-1.5 ${book.is_active ? 'bg-orange-900/40 text-orange-400 hover:bg-orange-900/60' : 'bg-green-900/40 text-green-400 hover:bg-green-900/60'} rounded-lg transition-colors">
            ${book.is_active ? 'Hide' : 'Show'}
          </button>
          <button onclick="deleteBook('${book.id}')"
            class="text-xs px-3 py-1.5 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded-lg transition-colors">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function editBook(book) {
  editingBookId = book.id;
  document.getElementById('book-id').value = book.id;
  document.getElementById('book-title').value = book.title || '';
  document.getElementById('book-author').value = book.author || '';
  document.getElementById('book-price').value = book.price || '';
  document.getElementById('book-category').value = book.category || '';
  document.getElementById('book-cover').value = book.cover_url || '';
  document.getElementById('book-download').value = book.download_url || '';
  document.getElementById('book-pages').value = book.total_pages || '';
  document.getElementById('book-language').value = book.language || 'English';
  document.getElementById('book-description').value = book.description || '';
  document.getElementById('inventory-form-title').textContent = 'Edit Book';
  document.getElementById('save-book-label').textContent = 'Update Book';
  document.getElementById('book-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('book-title').focus();
}

function resetBookForm() {
  editingBookId = null;
  ['book-id','book-title','book-author','book-price','book-category','book-cover','book-download','book-pages','book-description'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('book-language').value = 'English';
  document.getElementById('inventory-form-title').textContent = 'Add New Book';
  document.getElementById('save-book-label').textContent = 'Add Book';
}

async function saveBook() {
  const title = document.getElementById('book-title').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const price = parseFloat(document.getElementById('book-price').value);
  const downloadUrl = document.getElementById('book-download').value.trim();

  if (!title || !author || isNaN(price) || !downloadUrl) {
    showToast('Title, Author, Price, and Download URL are required', 'error');
    return;
  }

  const bookData = {
    title,
    author,
    price,
    download_url: downloadUrl,
    category: document.getElementById('book-category').value.trim() || 'General',
    cover_url: document.getElementById('book-cover').value.trim() || null,
    total_pages: parseInt(document.getElementById('book-pages').value) || null,
    language: document.getElementById('book-language').value.trim() || 'English',
    description: document.getElementById('book-description').value.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const btn = document.querySelector('#save-book-label');
  btn.textContent = 'Saving...';

  let error;
  if (editingBookId) {
    const res = await supabase.from('books').update(bookData).eq('id', editingBookId);
    error = res.error;
    if (!error) {
      const idx = adminBooks.findIndex(b => b.id === editingBookId);
      if (idx > -1) adminBooks[idx] = { ...adminBooks[idx], ...bookData };
    }
  } else {
    const res = await supabase.from('books').insert({ ...bookData, is_active: true }).select().single();
    error = res.error;
    if (!error && res.data) adminBooks.unshift(res.data);
  }

  if (error) {
    showToast('Failed to save book: ' + error.message, 'error');
  } else {
    showToast(`Book ${editingBookId ? 'updated' : 'added'} successfully!`, 'success');
    resetBookForm();
    document.getElementById('inventory-tbody').innerHTML = renderInventoryRows(adminBooks);
  }

  btn.textContent = 'Add Book';
}

async function toggleBookStatus(bookId, currentStatus) {
  const { error } = await supabase
    .from('books')
    .update({ is_active: !currentStatus })
    .eq('id', bookId);

  if (error) {
    showToast('Failed to update status', 'error');
    return;
  }

  const book = adminBooks.find(b => b.id === bookId);
  if (book) book.is_active = !currentStatus;
  document.getElementById('inventory-tbody').innerHTML = renderInventoryRows(adminBooks);
  showToast(`Book ${!currentStatus ? 'shown' : 'hidden'} successfully`, 'success');
}

async function deleteBook(bookId) {
  if (!confirm('Are you sure you want to delete this book? This cannot be undone.')) return;

  const { error } = await supabase.from('books').delete().eq('id', bookId);

  if (error) {
    showToast('Failed to delete book: ' + error.message, 'error');
    return;
  }

  adminBooks = adminBooks.filter(b => b.id !== bookId);
  document.getElementById('inventory-tbody').innerHTML = renderInventoryRows(adminBooks);
  showToast('Book deleted', 'success');
}
