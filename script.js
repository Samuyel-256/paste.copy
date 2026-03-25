// ============================================================
//  PASTE.COPY_AI — Public Hub Script
//  Supports: Firebase Firestore (cross-device) + localStorage fallback
// ============================================================

// ── FIREBASE CONFIG ──────────────────────────────────────────
// 🔴 FILL IN your Firebase project config here.
//    Go to: Firebase Console → Project Settings → Your Apps → SDK setup
//    If you haven't created a project yet, visit https://firebase.google.com
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const COLLECTION_NAME = "hub_content"; // Change if you use a different Firestore collection name
// ─────────────────────────────────────────────────────────────

const IS_FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

// HTML escape utility
const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

document.addEventListener('DOMContentLoaded', () => {
  const contentGrid = document.getElementById('contentGrid');
  const searchInput = document.getElementById('searchInput');
  let allItems = []; // In-memory store for search filtering

  // ── Render cards ────────────────────────────────────────────
  const renderCards = (items) => {
    contentGrid.innerHTML = '';

    if (!items || items.length === 0) {
      contentGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-muted); padding: 2rem;">No posts found.</p>';
      return;
    }

    const sorted = [...items].sort((a, b) => b.created_date - a.created_date);

    sorted.forEach((item, index) => {
      const delay = (index * 0.08) % 0.8;
      const card = document.createElement('div');
      card.className = 'card';
      card.style.animationDelay = `${delay}s`;

      const aiLinksHtml = [];
      if (item.ai_link_1) {
        aiLinksHtml.push(`<a href="${item.ai_link_1}" target="_blank" rel="noopener" class="btn btn-secondary">${escapeHtml(item.ai_link_1_title || 'AI Tool 1')}</a>`);
      }
      if (item.ai_link_2) {
        aiLinksHtml.push(`<a href="${item.ai_link_2}" target="_blank" rel="noopener" class="btn btn-secondary">${escapeHtml(item.ai_link_2_title || 'AI Tool 2')}</a>`);
      }

      card.innerHTML = `
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <div class="card-shortcut">${escapeHtml(item.shortcut_text)}</div>
        <div class="card-actions">
          <a href="${item.post_url}" target="_blank" rel="noopener" class="btn btn-primary">Watch Reel/Post</a>
          ${aiLinksHtml.length > 0 ? `<div class="action-row">${aiLinksHtml.join('')}</div>` : ''}
        </div>
      `;
      contentGrid.appendChild(card);
    });
  };

  // ── Search handler ──────────────────────────────────────────
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderCards(allItems);
      return;
    }
    const filtered = allItems.filter(item =>
      (item.title || '').toLowerCase().includes(query) ||
      (item.shortcut_text || '').toLowerCase().includes(query)
    );
    renderCards(filtered);
  };

  searchInput.addEventListener('input', handleSearch);

  // ── Loading indicator ───────────────────────────────────────
  const showLoading = () => {
    contentGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-muted); padding: 2rem;">Loading...</p>';
  };

  // ── localStorage fallback ───────────────────────────────────
  const loadFromLocalStorage = () => {
    const data = localStorage.getItem('hub_content');
    return data ? JSON.parse(data) : [];
  };

  const saveToLocalStorage = (items) => {
    localStorage.setItem('hub_content', JSON.stringify(items));
  };

  // ── Same-device real-time sync (localStorage storage event) ──
  //    This fires when another tab on the same device updates localStorage
  window.addEventListener('storage', (e) => {
    if (e.key === 'hub_content') {
      const updated = e.newValue ? JSON.parse(e.newValue) : [];
      allItems = updated;
      const query = searchInput.value.toLowerCase().trim();
      if (query) {
        const filtered = allItems.filter(item =>
          (item.title || '').toLowerCase().includes(query) ||
          (item.shortcut_text || '').toLowerCase().includes(query)
        );
        renderCards(filtered);
      } else {
        renderCards(allItems);
      }
    }
  });

  // ── Firebase real-time listener (cross-device) ──────────────
  if (IS_FIREBASE_CONFIGURED && typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      const db = firebase.firestore();

      showLoading();

      // Real-time listener — updates instantly on any device when data changes
      db.collection(COLLECTION_NAME)
        .orderBy('created_date', 'desc')
        .onSnapshot((snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          allItems = items;
          saveToLocalStorage(items); // keep localStorage in sync as cache
          const query = searchInput.value.toLowerCase().trim();
          if (query) {
            const filtered = allItems.filter(item =>
              (item.title || '').toLowerCase().includes(query) ||
              (item.shortcut_text || '').toLowerCase().includes(query)
            );
            renderCards(filtered);
          } else {
            renderCards(allItems);
          }
        }, (err) => {
          console.warn('Firestore error, falling back to localStorage:', err);
          allItems = loadFromLocalStorage();
          renderCards(allItems);
        });

    } catch (err) {
      console.warn('Firebase init failed, using localStorage:', err);
      allItems = loadFromLocalStorage();
      renderCards(allItems);
    }
  } else {
    // Fallback: localStorage only (same device, requires manual refresh for cross-device)
    if (IS_FIREBASE_CONFIGURED) {
      console.warn('Firebase SDK not loaded. Using localStorage fallback.');
    }
    allItems = loadFromLocalStorage();
    renderCards(allItems);
  }
});
