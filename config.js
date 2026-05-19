// ============================================================
// CONFIG — Replace these with your actual credentials
// ============================================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';        // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Your project's anon/public key
const RAZORPAY_KEY_ID = 'YOUR_RAZORPAY_KEY_ID';   // e.g. rzp_test_xxxxxxxxxxxx

// ── Initialize Supabase ───────────────────────────────────────
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── App State ─────────────────────────────────────────────────
const AppState = {
  currentUser: null,
  currentProfile: null,
  currentPage: 'store',
  books: [],
  userRatings: {},
  userOrders: [],
  isAdmin: false,
};

// ── Toast Notifications ───────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="mr-2">${icons[type]}</span>${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ── Loading Helpers ───────────────────────────────────────────
function setLoading(btnId, isLoading, text = 'Loading...') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading ? `<span class="animate-pulse">${text}</span>` : btn.dataset.originalText || btn.innerHTML;
  if (!isLoading && btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
}

// ── Format currency ───────────────────────────────────────────
function formatPrice(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
}

// ── Format date ───────────────────────────────────────────────
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}
