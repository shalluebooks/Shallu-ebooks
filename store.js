// ============================================================
// STORE MODULE
// ============================================================

let allBooks = [];
let filteredBooks = [];
let activeCategory = 'All';

async function renderStorePage() {
  const content = document.getElementById('app-content');
  content.innerHTML = `
    <div class="page">
      <!-- Hero -->
      <div class="relative text-center py-16 mb-10 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent rounded-3xl pointer-events-none"></div>
        <p class="text-gold text-sm font-semibold tracking-widest uppercase mb-3">Premium Digital Library</p>
        <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
          Expand Your Mind,<br/>
          <span class="text-gold-gradient">One Page at a Time</span>
        </h1>
        <p class="text-gray-400 text-lg max-w-xl mx-auto">Handpicked books across technology, business, and self-growth. Instant download after purchase.</p>
      </div>

      <!-- Search & Filter -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
          <input type="text" id="book-search" class="input-dark pl-10" placeholder="Search books, authors..." oninput="filterBooks()" />
        </div>
        <div class="flex gap-2 overflow-x-auto pb-1 flex-nowrap" id="category-filters">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- Book Grid -->
      <div id="books-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Skeleton loaders -->
        ${Array(6).fill(0).map(() => `
          <div class="skeleton h-80 rounded-2xl"></div>
        `).join('')}
      </div>

      <!-- Empty State -->
      <div id="empty-state" class="hidden text-center py-20">
        <div class="text-6xl mb-4">📭</div>
        <h3 class="font-display text-2xl text-gray-400 mb-2">No books found</h3>
        <p class="text-gray-600">Try a different search or category</p>
      </div>
    </div>
  `;

  await loadBooks();
}

async function loadBooks() {
  const { data: books, error } = await supabase
    .from('books_with_ratings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Failed to load books', 'error');
    document.getElementById('books-grid').innerHTML = `<p class="text-gray-500 col-span-full text-center py-8">Could not load books. Please try again.</p>`;
    return;
  }

  allBooks = books || [];
  filteredBooks = [...allBooks];

  // Load user ratings if logged in
  if (AppState.currentUser) {
    const { data: ratings } = await supabase
      .from('ratings')
      .select('book_id, rating')
      .eq('user_id', AppState.currentUser.id);
    if (ratings) {
      ratings.forEach(r => AppState.userRatings[r.book_id] = r.rating);
    }
  }

  buildCategoryFilters();
  renderBookGrid();
}

function buildCategoryFilters() {
  const categories = ['All', ...new Set(allBooks.map(b => b.category).filter(Boolean))];
  const container = document.getElementById('category-filters');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <button class="category-pill whitespace-nowrap ${cat === activeCategory ? 'active' : ''}"
      onclick="setCategory('${cat}')">${cat}</button>
  `).join('');
}

function setCategory(cat) {
  activeCategory = cat;
  filterBooks();
  document.querySelectorAll('.category-pill').forEach(p => {
    p.classList.toggle('active', p.textContent === cat);
  });
}

function filterBooks() {
  const query = (document.getElementById('book-search')?.value || '').toLowerCase();
  filteredBooks = allBooks.filter(book => {
    const matchesSearch = !query ||
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query);
    const matchesCat = activeCategory === 'All' || book.category === activeCategory;
    return matchesSearch && matchesCat;
  });
  renderBookGrid();
}

function renderBookGrid() {
  const grid = document.getElementById('books-grid');
  const empty = document.getElementById('empty-state');
  if (!grid) return;

  if (filteredBooks.length === 0) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  grid.innerHTML = filteredBooks.map(book => renderBookCard(book)).join('');
}

function renderBookCard(book) {
  const avgRating = parseFloat(book.avg_rating || 0);
  const userRating = AppState.userRatings[book.id] || 0;
  const stars = [1, 2, 3, 4, 5].map(i => `
    <span class="star ${i <= (userRating || Math.round(avgRating)) ? 'filled' : ''}"
      data-value="${i}" data-book="${book.id}"
      onmouseenter="hoverStar(this)" onmouseleave="unhoverStar('${book.id}')"
      onclick="rateBook('${book.id}', ${i})">★</span>
  `).join('');

  const isPurchased = AppState.userOrders.some(o => o.book_id === book.id);

  return `
    <div class="book-card bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden flex flex-col" id="book-${book.id}">
      <!-- Cover -->
      <div class="relative h-52 overflow-hidden bg-ink-700">
        <img src="${book.cover_url || 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80'}"
          alt="${book.title}" class="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-300" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink-800/90 to-transparent"></div>
        <span class="absolute top-3 left-3 bg-ink-800/80 text-gold text-xs font-semibold px-2 py-1 rounded-lg border border-gold/30">${book.category || 'General'}</span>
        ${isPurchased ? `<span class="absolute top-3 right-3 bg-green-900/80 text-green-400 text-xs font-semibold px-2 py-1 rounded-lg">✓ Owned</span>` : ''}
      </div>

      <!-- Info -->
      <div class="p-5 flex flex-col flex-1 gap-3">
        <div>
          <h3 class="font-display font-bold text-lg leading-snug mb-1 line-clamp-2">${book.title}</h3>
          <p class="text-gray-400 text-sm">by ${book.author}</p>
        </div>

        <p class="text-gray-500 text-sm leading-relaxed line-clamp-2">${book.description || ''}</p>

        <!-- Stars -->
        <div class="flex items-center gap-2">
          <div class="stars-row flex gap-0.5" id="stars-${book.id}">${stars}</div>
          <span class="text-xs text-gray-500">${avgRating.toFixed(1)} (${book.rating_count || 0})</span>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between mt-auto pt-3 border-t border-ink-600">
          <span class="font-display text-2xl font-bold text-gold">${formatPrice(book.price)}</span>
          ${isPurchased
            ? `<a href="${book.download_url || '#'}" target="_blank" class="btn-gold text-sm py-2 px-4">⬇ Download</a>`
            : `<button onclick="initiatePurchase(${JSON.stringify(book).replace(/"/g, '&quot;')})"
                class="btn-gold text-sm py-2 px-4">Buy Now</button>`
          }
        </div>
      </div>
    </div>
  `;
}

// ── Rating functions ──────────────────────────────────────────
function hoverStar(el) {
  const val = parseInt(el.dataset.value);
  const bookId = el.dataset.book;
  document.querySelectorAll(`#stars-${bookId} .star`).forEach(s => {
    s.classList.toggle('hover', parseInt(s.dataset.value) <= val);
  });
}

function unhoverStar(bookId) {
  document.querySelectorAll(`#stars-${bookId} .star`).forEach(s => s.classList.remove('hover'));
}

async function rateBook(bookId, rating) {
  if (!AppState.currentUser) {
    showToast('Please sign in to rate books', 'info');
    openAuthModal('login');
    return;
  }

  const { error } = await supabase.from('ratings').upsert({
    book_id: bookId,
    user_id: AppState.currentUser.id,
    rating,
  }, { onConflict: 'book_id,user_id' });

  if (error) {
    showToast('Could not save rating', 'error');
    return;
  }

  AppState.userRatings[bookId] = rating;

  // Update stars UI
  document.querySelectorAll(`#stars-${bookId} .star`).forEach(s => {
    s.classList.toggle('filled', parseInt(s.dataset.value) <= rating);
  });

  showToast(`Rated ${rating} star${rating > 1 ? 's' : ''}!`, 'success');
}

// ── Payment ───────────────────────────────────────────────────
async function initiatePurchase(book) {
  if (!AppState.currentUser) {
    showToast('Please sign in to purchase', 'info');
    openAuthModal('login');
    return;
  }

  const amountPaise = Math.round(book.price * 100); // Razorpay uses paise

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: amountPaise,
    currency: 'INR',
    name: 'Shallu E-Books',
    description: book.title,
    image: book.cover_url || '',
    handler: async function(response) {
      await savePurchase(book, response);
    },
    prefill: {
      name: AppState.currentProfile?.full_name || '',
      email: AppState.currentUser.email,
    },
    theme: { color: '#C9A84C' },
    modal: {
      ondismiss: () => showToast('Payment cancelled', 'info')
    }
  };

  const rzp = new Razorpay(options);
  rzp.on('payment.failed', (res) => showToast('Payment failed: ' + res.error.description, 'error'));
  rzp.open();
}

async function savePurchase(book, razorpayResponse) {
  const orderData = {
    user_id: AppState.currentUser.id,
    book_id: book.id,
    book_title: book.title,
    book_author: book.author,
    book_cover_url: book.cover_url,
    download_url: book.download_url,
    amount: book.price,
    currency: 'INR',
    razorpay_order_id: razorpayResponse.razorpay_order_id || null,
    razorpay_payment_id: razorpayResponse.razorpay_payment_id,
    razorpay_signature: razorpayResponse.razorpay_signature || null,
    status: 'completed',
  };

  const { data, error } = await supabase.from('orders').insert(orderData).select().single();

  if (error) {
    showToast('Payment succeeded but order save failed. Contact support.', 'error');
    console.error('Order save error:', error);
    return;
  }

  AppState.userOrders.push(data);
  showToast(`🎉 "${book.title}" purchased! Check My Library.`, 'success', 5000);

  // Refresh the book card to show download button
  const card = document.getElementById(`book-${book.id}`);
  if (card) {
    const buyBtn = card.querySelector('.btn-gold');
    if (buyBtn) {
      buyBtn.outerHTML = `<a href="${book.download_url || '#'}" target="_blank" class="btn-gold text-sm py-2 px-4">⬇ Download</a>`;
    }
    // Add "Owned" badge
    const badge = card.querySelector('img')?.nextElementSibling?.nextElementSibling;
  }
}
