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

  // ── Network API (Real-time polling) ─────────────────────────
  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch data:', e);
    }
    return [];
  };

  const pollData = async () => {
    const items = await loadData();
    // Re-render if data object as a string differs from what we have
    if (JSON.stringify(items) !== JSON.stringify(allItems)) {
      allItems = items;
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
  };

  showLoading();
  pollData().then(() => {
    // Poll every 1.5 seconds for cross-device real-time updates without Firebase
    setInterval(pollData, 1500);
  });
});
