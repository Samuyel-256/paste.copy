// ============================================================
//  PASTE.COPY_AI — Admin Portal Script
//  Supports: Firebase Firestore (cross-device) + localStorage fallback
// ============================================================

// ── FIREBASE CONFIG ──────────────────────────────────────────
// 🔴 MUST match the config in script.js exactly
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const COLLECTION_NAME = "hub_content";
// ─────────────────────────────────────────────────────────────

const IS_FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

document.addEventListener('DOMContentLoaded', () => {
  const SECRET_CODE = "7981184810";
  const STORAGE_KEY = "hub_content";

  // Elements
  const loginContainer = document.getElementById('loginContainer');
  const dashboardContainer = document.getElementById('dashboardContainer');
  const secretCodeInput = document.getElementById('secretCode');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  const contentForm = document.getElementById('contentForm');
  const formTitle = document.getElementById('formTitle');
  const saveBtn = document.getElementById('saveBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const adminList = document.getElementById('adminList');

  // Form Fields
  const idField = document.getElementById('editId');
  const titleField = document.getElementById('postTitle');
  const shortcutField = document.getElementById('shortcutText');
  const postUrlField = document.getElementById('postUrl');
  const aiLink1Field = document.getElementById('aiLink1');
  const aiLink1TitleField = document.getElementById('aiLink1Title');
  const aiLink2Field = document.getElementById('aiLink2');
  const aiLink2TitleField = document.getElementById('aiLink2Title');

  // Status banner
  let statusTimeout;
  const showStatus = (msg, type = 'success') => {
    let banner = document.getElementById('statusBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'statusBanner';
      banner.style.cssText = `
        position: fixed; top: 1.5rem; right: 1.5rem; z-index: 9999;
        padding: 0.9rem 1.5rem; border-radius: 0.75rem; font-weight: 600;
        font-size: 0.95rem; color: white; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        transition: opacity 0.4s ease; opacity: 0;
      `;
      document.body.appendChild(banner);
    }
    banner.textContent = msg;
    banner.style.background = type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)';
    banner.style.opacity = '1';
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => { banner.style.opacity = '0'; }, 3000);
  };

  // HTML escape
  const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // ── Firebase init ────────────────────────────────────────────
  let db = null;
  if (IS_FIREBASE_CONFIGURED && typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
    } catch (e) {
      console.warn('Firebase init failed:', e);
      db = null;
    }
  }

  // ── localStorage helpers (fallback) ─────────────────────────
  const loadFromLocalStorage = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  };

  const saveToLocalStorage = (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  // ── Auth ─────────────────────────────────────────────────────
  let isAdminAuthed = false;

  const tryLogin = () => {
    if (secretCodeInput.value === SECRET_CODE) {
      isAdminAuthed = true;
      loginError.classList.remove('visible');
      showDashboard();
    } else {
      loginError.classList.add('visible');
      secretCodeInput.value = '';
      secretCodeInput.focus();
    }
  };

  loginBtn.addEventListener('click', tryLogin);
  secretCodeInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') tryLogin(); });

  logoutBtn.addEventListener('click', () => {
    isAdminAuthed = false;
    dashboardContainer.style.display = 'none';
    loginContainer.style.display = 'flex';
    secretCodeInput.value = '';
  });

  const showDashboard = () => {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    renderAdminList();

    // Real-time listener in admin list (Firebase)
    if (db) {
      db.collection(COLLECTION_NAME)
        .orderBy('created_date', 'desc')
        .onSnapshot((snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          saveToLocalStorage(items);
          renderAdminListFromItems(items);
        });
    }
  };

  // ── Form reset ───────────────────────────────────────────────
  const resetForm = () => {
    contentForm.reset();
    idField.value = '';
    formTitle.textContent = 'Add New Content';
    saveBtn.textContent = 'Publish Content';
    saveBtn.disabled = false;
    cancelEditBtn.style.display = 'none';
  };

  // ── Form submit (add / edit) ─────────────────────────────────
  contentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const isEdit = idField.value !== '';
    const now = Date.now();

    const newItem = {
      title: titleField.value.trim(),
      shortcut_text: shortcutField.value.trim(),
      post_url: postUrlField.value.trim(),
      ai_link_1: aiLink1Field.value.trim(),
      ai_link_1_title: aiLink1TitleField.value.trim() || 'AI Tool 1',
      ai_link_2: aiLink2Field.value.trim(),
      ai_link_2_title: aiLink2TitleField.value.trim() || 'AI Tool 2',
    };

    if (db) {
      // ── Firebase path ──────────────────────────────────────
      try {
        if (isEdit) {
          await db.collection(COLLECTION_NAME).doc(idField.value).update(newItem);
          showStatus('✅ Content updated!');
        } else {
          newItem.created_date = now;
          await db.collection(COLLECTION_NAME).add(newItem);
          showStatus('✅ Content published!');
        }
        resetForm();
        // List auto-updates via onSnapshot listener
      } catch (err) {
        console.error('Firestore write error:', err);
        showStatus('❌ Save failed. Check console.', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Save Changes' : 'Publish Content';
      }
    } else {
      // ── localStorage path ──────────────────────────────────
      const items = loadFromLocalStorage();
      if (isEdit) {
        const idx = items.findIndex(i => i.id === idField.value);
        if (idx !== -1) {
          newItem.id = idField.value;
          newItem.created_date = items[idx].created_date;
          items[idx] = newItem;
        }
        showStatus('✅ Content updated!');
      } else {
        newItem.id = now.toString();
        newItem.created_date = now;
        items.push(newItem);
        showStatus('✅ Content published!');
      }
      saveToLocalStorage(items);
      resetForm();
      renderAdminList();
    }
  });

  cancelEditBtn.addEventListener('click', resetForm);

  // ── Render admin list ────────────────────────────────────────
  const renderAdminList = () => {
    const items = loadFromLocalStorage().sort((a, b) => b.created_date - a.created_date);
    renderAdminListFromItems(items);
  };

  const renderAdminListFromItems = (items) => {
    adminList.innerHTML = '';
    if (!items || items.length === 0) {
      adminList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No entries published yet.</p>';
      return;
    }
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'admin-card';
      const dateStr = new Date(item.created_date).toLocaleString();
      card.innerHTML = `
        <div class="admin-card-info">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${dateStr}</p>
        </div>
        <div class="admin-card-actions">
          <button class="btn btn-secondary edit-btn" data-id="${item.id}">Edit</button>
          <button class="btn btn-danger delete-btn" data-id="${item.id}">Delete</button>
        </div>
      `;
      adminList.appendChild(card);
    });
  };

  // ── Edit / Delete delegation ─────────────────────────────────
  adminList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) { handleEdit(editBtn.dataset.id); return; }
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) { handleDelete(deleteBtn.dataset.id); }
  });

  const handleEdit = (id) => {
    const items = loadFromLocalStorage();
    const item = items.find(i => i.id === id);
    if (!item) return;

    idField.value = item.id;
    titleField.value = item.title;
    shortcutField.value = item.shortcut_text;
    postUrlField.value = item.post_url;
    aiLink1Field.value = item.ai_link_1 || '';
    aiLink1TitleField.value = item.ai_link_1_title === 'AI Tool 1' ? '' : (item.ai_link_1_title || '');
    aiLink2Field.value = item.ai_link_2 || '';
    aiLink2TitleField.value = item.ai_link_2_title === 'AI Tool 2' ? '' : (item.ai_link_2_title || '');

    formTitle.textContent = 'Edit Content';
    saveBtn.textContent = 'Save Changes';
    cancelEditBtn.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;

    if (db) {
      try {
        await db.collection(COLLECTION_NAME).doc(id).delete();
        showStatus('🗑️ Deleted.');
        if (idField.value === id) resetForm();
        // List auto-updates via onSnapshot
      } catch (err) {
        console.error('Firestore delete error:', err);
        showStatus('❌ Delete failed.', 'error');
      }
    } else {
      let items = loadFromLocalStorage();
      items = items.filter(i => i.id !== id);
      saveToLocalStorage(items);
      renderAdminList();
      showStatus('🗑️ Deleted.');
      if (idField.value === id) resetForm();
    }
  };
});
