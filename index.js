import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

'use strict';

const ADMIN_SECRET = 'PITOU-ADMIN-2026';
const TEN_MINUTES_MS = 10 * 60 * 1000;

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

let app, auth, db;
let cart = {};
let currentUserEmail = null;
let currentUserName = null;
let isAdminMode = false;
let adminTestMode = false;

let dbState = {
  users: {},
  orders: [],
  storeOpen: true,
  products: [
    { id: 1, name: 'Cahier 96 pages', price: 6, stock: 30, icon: '📓' },
    { id: 2, name: 'Stylo bille premium', price: 2, stock: 80, icon: '🖊️' },
    { id: 3, name: 'Boîte crayons de couleur', price: 8, stock: 25, icon: '🎨' },
    { id: 4, name: 'Feutres de couleur (x12)', price: 8, stock: 25, icon: '🖍️' },
    { id: 5, name: 'Gomme blanche', price: 2, stock: 40, icon: '◻️' },
    { id: 6, name: 'Surligneur fluo', price: 4, stock: 35, icon: '🖌️' },
    { id: 7, name: 'Règle plate 20cm', price: 3, stock: 30, icon: '📏' },
    { id: 8, name: 'Équerre géométrique', price: 4, stock: 20, icon: '📐' }
  ],
  theme: 'cream',
  adminImpersonating: null
};

// Device identification helper
function detectDevice() {
  const ua = navigator.userAgent;
  if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) return '💻 Mac';
  if (/Windows/.test(ua)) return '🖥️ PC Windows';
  if (/iPhone|iPad|iPod/.test(ua)) return '📱 Appareil iOS';
  if (/Android/.test(ua)) return '📱 Android';
  if (/Linux/.test(ua)) return '🐧 Linux';
  return '🌐 Autre appareil';
}

// Robust session persistence on load
function loadUserFromStorage() {
  const cachedUserEmail = localStorage.getItem('boutiquePointsCurrentUserEmail');
  const cachedUserData = localStorage.getItem('boutiquePointsUserData');
  
  if (cachedUserData) {
    try {
      const parsed = JSON.parse(cachedUserData);
      if (parsed && parsed.email) {
        currentUserEmail = parsed.email;
        currentUserName = parsed.name || parsed.email;
        dbState.users[parsed.email] = parsed;
        return true;
      }
    } catch(e) {}
  }
  return false;
}

const cachedOrders = localStorage.getItem('boutiquePointsOrders');
if (cachedOrders) {
  try {
    const parsedOrders = JSON.parse(cachedOrders);
    if (Array.isArray(parsedOrders)) {
      dbState.orders = parsedOrders;
    }
  } catch(e) {}
}

// Toast notification system
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Theme system
function setAppTheme(theme) {
  dbState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('boutiquePointsTheme', theme);
  showToast(`Thème changé en ${theme}`);
}

// View switching
function switchView(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  // Show selected view
  const view = document.getElementById(viewName);
  if (view) {
    view.classList.add('active');
  }
  
  // Update nav active state
  document.querySelectorAll('.nav').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`[data-view="${viewName}"]`);
  if (navBtn) navBtn.classList.add('active');
}

// Initialize Firebase
async function initFirebase() {
  try {
    if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);

      if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
      } else {
        await signInAnonymously(auth);
      }

      document.getElementById('syncText').textContent = 'Cloud Synchronisé en direct';
      startCloudListeners();
    } else {
      document.getElementById('syncText').textContent = 'Mode local (hors ligne)';
    }
  } catch (err) {
    console.error("Firebase init error:", err);
    document.getElementById('syncText').textContent = 'Mode local (hors ligne)';
  }
}

function startCloudListeners() {
  // Cloud logic can be linked here via Firestore snapshots
}

// Login form handler
function handleLoginSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  
  if (!name || !email) {
    showToast('Veuillez remplir tous les champs');
    return;
  }
  
  currentUserEmail = email;
  currentUserName = name;
  
  // Create or update user
  if (!dbState.users[email]) {
    dbState.users[email] = {
      email: email,
      name: name,
      points: 150,
      pointsSpent: 0,
      device: detectDevice(),
      lastLogin: new Date().toISOString()
    };
  } else {
    dbState.users[email].name = name;
    dbState.users[email].lastLogin = new Date().toISOString();
  }
  
  // Save to localStorage
  localStorage.setItem('boutiquePointsCurrentUserEmail', email);
  localStorage.setItem('boutiquePointsUserData', JSON.stringify(dbState.users[email]));
  
  // Show app, hide login
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  
  updateUI();
  renderShop();
  showToast(`Bienvenue ${name}!`);
}

// Update all UI elements
function updateUI() {
  if (!currentUserEmail) return;
  
  const user = dbState.users[currentUserEmail];
  if (!user) return;
  
  // Welcome section
  document.getElementById('welcome').textContent = user.name || 'Utilisateur';
  
  // Home stats
  document.getElementById('homeBalance').textContent = user.points + ' pts';
  document.getElementById('homeSpent').textContent = (user.pointsSpent || 0) + ' pts';
  
  // Card display
  document.getElementById('cardNameDisplay').textContent = (user.name || 'UTILISATEUR').toUpperCase();
  document.getElementById('cardBalance').textContent = user.points + ' pts';
  
  // Shop balance
  document.getElementById('shopBalance').textContent = `Solde : ${user.points} pts disponibles`;
  
  // Account info
  document.getElementById('accountInfo').textContent = `Nom: ${user.name} | Email: ${user.email}`;
  
  // Cart count
  updateCartCount();
  
  // Store status
  updateStoreStatus();
}

function updateCartCount() {
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  document.getElementById('cartCount').textContent = count;
}

function updateStoreStatus() {
  const isClosed = !dbState.storeOpen;
  document.getElementById('globalStoreStatus').classList.toggle('hidden', !isClosed);
  document.getElementById('shopClosedMsg').classList.toggle('hidden', !isClosed);
  
  if (isAdminMode) {
    const indicator = document.getElementById('storeStatusIndicator');
    indicator.textContent = dbState.storeOpen ? '✅ Boutique ouverte' : '❌ Boutique fermée';
  }
}

// Render products in shop
function renderShop() {
  const productsContainer = document.getElementById('products');
  productsContainer.innerHTML = '';
  
  dbState.products.forEach(product => {
    const div = document.createElement('div');
    div.className = 'card product';
    div.innerHTML = `
      <div class="emoji">${product.icon}</div>
      <h3>${product.name}</h3>
      <div class="price">${product.price} pts</div>
      <div class="muted" style="font-size: 12px; margin: 8px 0;">Stock: ${product.stock}</div>
      <button class="btn ${product.stock > 0 ? 'primary' : 'outline'} btn-add-to-cart" data-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''} style="width: 100%; margin-top: auto;">
        ${product.stock > 0 ? '🛒 Ajouter' : '❌ Rupture'}
      </button>
    `;
    productsContainer.appendChild(div);
  });
  
  // Add event listeners
  document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const productId = parseInt(btn.dataset.id);
      addToCart(productId);
    });
  });
}

function addToCart(productId) {
  const product = dbState.products.find(p => p.id === productId);
  if (!product) return;
  
  const user = dbState.users[currentUserEmail];
  if (user.points < product.price) {
    showToast('Pas assez de points!');
    return;
  }
  
  if (product.stock <= 0) {
    showToast('Article en rupture de stock');
    return;
  }
  
  cart[productId] = (cart[productId] || 0) + 1;
  updateCartCount();
  showToast(`${product.name} ajouté au panier`);
  renderCart();
}

function renderCart() {
  const cartItemsList = document.getElementById('cartItemsList');
  cartItemsList.innerHTML = '';
  
  let total = 0;
  
  Object.entries(cart).forEach(([productId, quantity]) => {
    const product = dbState.products.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    const itemPrice = product.price * quantity;
    total += itemPrice;
    
    const div = document.createElement('div');
    div.className = 'row';
    div.style.alignItems = 'center';
    div.innerHTML = `
      <div>
        <div>${product.name}</div>
        <div class="muted">${product.price} pts × ${quantity}</div>
      </div>
      <div style="font-weight: bold; color: var(--leaf);">${itemPrice} pts</div>
      <button class="btn outline" style="padding: 4px 8px; font-size: 12px;" onclick="removeFromCart(${productId})">✕</button>
    `;
    cartItemsList.appendChild(div);
  });
  
  document.getElementById('cartTotalPrice').textContent = total + ' pts';
}

function removeFromCart(productId) {
  delete cart[productId];
  updateCartCount();
  renderCart();
  showToast('Article supprimé du panier');
}

window.removeFromCart = removeFromCart;

function openCart() {
  const modal = document.getElementById('cartModal');
  renderCart();
  modal.classList.add('active');
}

function closeCart() {
  document.getElementById('cartModal').classList.remove('active');
}

function checkout() {
  if (Object.keys(cart).length === 0) {
    showToast('Votre panier est vide');
    return;
  }
  
  const user = dbState.users[currentUserEmail];
  let total = 0;
  
  Object.entries(cart).forEach(([productId, quantity]) => {
    const product = dbState.products.find(p => p.id === parseInt(productId));
    if (product) {
      total += product.price * quantity;
      product.stock -= quantity;
    }
  });
  
  if (user.points < total) {
    showToast('Points insuffisants pour valider cette commande');
    return;
  }
  
  // Process order
  user.points -= total;
  user.pointsSpent = (user.pointsSpent || 0) + total;
  
  const order = {
    id: Date.now(),
    email: currentUserEmail,
    items: cart,
    total: total,
    date: new Date().toISOString(),
    status: 'confirmée'
  };
  
  dbState.orders.push(order);
  cart = {};
  
  // Save to localStorage
  localStorage.setItem('boutiquePointsUserData', JSON.stringify(user));
  localStorage.setItem('boutiquePointsOrders', JSON.stringify(dbState.orders));
  
  closeCart();
  updateUI();
  renderShop();
  
  showTicket(order);
  showToast('Commande validée!');
}

function showTicket(order) {
  let itemsHTML = '';
  Object.entries(order.items).forEach(([productId, quantity]) => {
    const product = dbState.products.find(p => p.id === parseInt(productId));
    if (product) {
      itemsHTML += `<div class="row"><div>${product.name} × ${quantity}</div><div>${product.price * quantity} pts</div></div>`;
    }
  });
  
  const ticketContent = document.getElementById('ticketContent');
  ticketContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 16px;">
      <strong style="font-size: 18px;">TICKET DE RETRAIT #${order.id}</strong>
      <div class="muted" style="font-size: 12px; margin-top: 4px;">${new Date(order.date).toLocaleString('fr-FR')}</div>
    </div>
    <div style="border-top: 2px dashed var(--line); border-bottom: 2px dashed var(--line); padding: 16px 0; margin: 16px 0;">
      ${itemsHTML}
    </div>
    <div class="row" style="justify-content: space-between; font-weight: bold; margin-bottom: 16px;">
      <span>TOTAL</span>
      <span style="color: var(--leaf);">${order.total} pts dépensés</span>
    </div>
    <div class="muted" style="font-size: 12px;">
      📍 Présente ce ticket au lycée Camille Desmoulins pour retirer ton matériel.
    </div>
  `;
  
  const modal = document.getElementById('ticketModal');
  modal.classList.add('active');
}

function closeTicketModal() {
  document.getElementById('ticketModal').classList.remove('active');
}

window.closeTicketModal = closeTicketModal;

// Orders list
function renderOrders() {
  const ordersList = document.getElementById('ordersList');
  ordersList.innerHTML = '';
  
  const userOrders = dbState.orders.filter(o => o.email === currentUserEmail);
  
  if (userOrders.length === 0) {
    ordersList.innerHTML = '<p class="muted" style="text-align: center; padding: 40px;">Aucune commande pour le moment</p>';
    return;
  }
  
  userOrders.forEach(order => {
    let itemsHTML = '';
    Object.entries(order.items).forEach(([productId, quantity]) => {
      const product = dbState.products.find(p => p.id === parseInt(productId));
      if (product) {
        itemsHTML += `<div class="muted" style="font-size: 12px;">• ${product.name} × ${quantity}</div>`;
      }
    });
    
    const div = document.createElement('div');
    div.className = 'card';
    div.style.padding = '16px';
    div.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>Ticket #${order.id}</strong>
          <div class="muted" style="font-size: 12px; margin-top: 4px;">${new Date(order.date).toLocaleString('fr-FR')}</div>
          ${itemsHTML}
        </div>
        <div style="text-align: right;">
          <div style="color: var(--leaf); font-weight: bold; font-size: 18px;">${order.total} pts</div>
          <span class="badge badge-green" style="font-size: 11px; margin-top: 8px;">✓ ${order.status}</span>
        </div>
      </div>
    `;
    ordersList.appendChild(div);
  });
}

// Advice system
function showAdvice(type) {
  const adviceDiv = document.getElementById('advice');
  const advice = {
    colors: '🎨 <strong>Kit Coloré</strong><br>• Boîte crayons de couleur (8 pts)<br>• Feutres de couleur x12 (8 pts)<br>• Stylo bille premium (2 pts)<br><strong>Total: 18 pts</strong>',
    geometry: '📐 <strong>Kit Géométrie</strong><br>• Règle plate 20cm (3 pts)<br>• Équerre géométrique (4 pts)<br><strong>Total: 7 pts</strong>',
    complete: '🎒 <strong>Trousse Garnie Complète</strong><br>• Cahier 96 pages (6 pts)<br>• Boîte crayons de couleur (8 pts)<br>• Feutres x12 (8 pts)<br>• Règle (3 pts)<br>• Équerre (4 pts)<br>• Gomme (2 pts)<br>• Surligneur (4 pts)<br><strong>Total: 35 pts</strong>'
  };
  adviceDiv.innerHTML = advice[type] || '<em>Choisis une catégorie</em>';
}

window.showAdvice = showAdvice;

// Admin functions
function unlockAdmin() {
  const code = document.getElementById('adminCode').value.trim();
  if (code === ADMIN_SECRET) {
    isAdminMode = true;
    document.getElementById('adminNav').classList.remove('hidden');
    document.getElementById('adminMsg').textContent = '✅ Mode admin activé!';
    document.getElementById('adminMsg').style.color = 'var(--leaf)';
    showToast('Mode administrateur activé');
    renderAdminDashboard();
  } else {
    document.getElementById('adminMsg').textContent = '❌ Code incorrect';
    document.getElementById('adminMsg').style.color = 'var(--coral)';
  }
}

window.unlockAdmin = unlockAdmin;

function toggleStore() {
  dbState.storeOpen = !dbState.storeOpen;
  updateStoreStatus();
  showToast(dbState.storeOpen ? 'Boutique ouverte' : 'Boutique fermée');
}

window.toggleStore = toggleStore;

function testStudentMode() {
  adminTestMode = true;
  document.getElementById('adminTestBanner').classList.remove('hidden');
  switchView('home');
  showToast('Mode test élève activé');
}

window.testStudentMode = testStudentMode;

function returnToAdmin() {
  adminTestMode = false;
  document.getElementById('adminTestBanner').classList.add('hidden');
  switchView('admin-dashboard');
  showToast('Retour au mode administrateur');
}

window.returnToAdmin = returnToAdmin;

function renderAdminDashboard() {
  updateStoreStatus();
  renderAdminStocks();
  renderAdminClients();
  renderAdminOrders();
}

function renderAdminStocks() {
  const stockList = document.getElementById('adminStockList');
  stockList.innerHTML = '';
  
  dbState.products.forEach(product => {
    const div = document.createElement('div');
    div.className = 'row';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'space-between';
    div.innerHTML = `
      <div>
        <strong>${product.icon} ${product.name}</strong>
        <div class="muted" style="font-size: 12px;">Stock actuel: ${product.stock}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <input type="number" value="${product.stock}" style="width: 70px; padding: 8px; border: 1px solid var(--line); border-radius: 6px;" data-product-id="${product.id}" class="stock-input">
      </div>
    `;
    stockList.appendChild(div);
  });
  
  document.querySelectorAll('.stock-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const productId = parseInt(e.target.dataset.productId);
      const product = dbState.products.find(p => p.id === productId);
      if (product) {
        product.stock = parseInt(e.target.value) || 0;
        showToast('Stock mis à jour');
      }
    });
  });
}

function resetAllStocks() {
  dbState.products.forEach(p => p.stock = 100);
  renderAdminStocks();
  showToast('Tous les stocks sont à 100%');
}

window.resetAllStocks = resetAllStocks;

function renderAdminClients() {
  const table = document.getElementById('adminUsersTable');
  table.innerHTML = '';
  
  Object.values(dbState.users).forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${user.name}</strong></td>
      <td class="muted">${user.email}</td>
      <td>${user.device || '?'}</td>
      <td><strong>${user.points} pts</strong></td>
      <td>
        <button class="btn outline" style="padding: 4px 8px; font-size: 11px;" onclick="givePoints('${user.email}')">Ajouter pts</button>
      </td>
    `;
    table.appendChild(tr);
  });
}

function givePoints(email) {
  const amount = prompt('Combien de points ajouter?', '10');
  if (amount && !isNaN(amount)) {
    const user = dbState.users[email];
    if (user) {
      user.points += parseInt(amount);
      if (email === currentUserEmail) updateUI();
      renderAdminClients();
      showToast(`${amount} pts ajoutés à ${user.name}`);
    }
  }
}

window.givePoints = givePoints;

function renderAdminOrders() {
  const ordersList = document.getElementById('adminOrdersList');
  ordersList.innerHTML = '';
  
  if (dbState.orders.length === 0) {
    ordersList.innerHTML = '<p class="muted" style="text-align: center;">Aucune commande pour le moment</p>';
    return;
  }
  
  dbState.orders.forEach(order => {
    const user = dbState.users[order.email];
    let itemsHTML = '';
    Object.entries(order.items).forEach(([productId, quantity]) => {
      const product = dbState.products.find(p => p.id === parseInt(productId));
      if (product) {
        itemsHTML += `<div class="muted" style="font-size: 12px;">• ${product.name} × ${quantity}</div>`;
      }
    });
    
    const div = document.createElement('div');
    div.className = 'card';
    div.style.padding = '16px';
    div.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${user?.name || 'Utilisateur'}</strong>
          <div class="muted" style="font-size: 12px;">${new Date(order.date).toLocaleString('fr-FR')}</div>
          ${itemsHTML}
        </div>
        <div style="text-align: right;">
          <div style="color: var(--leaf); font-weight: bold;">${order.total} pts</div>
          <span class="badge badge-green" style="font-size: 11px; margin-top: 8px;">✓ ${order.status}</span>
        </div>
      </div>
    `;
    ordersList.appendChild(div);
  });
}

// Logout
function logout() {
  localStorage.removeItem('boutiquePointsCurrentUserEmail');
  localStorage.removeItem('boutiquePointsUserData');
  currentUserEmail = null;
  cart = {};
  isAdminMode = false;
  adminTestMode = false;
  
  document.getElementById('login').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginForm').reset();
  showToast('Déconnexion effectuée');
}

// Unregister
function confirmUnregisterAccount() {
  document.getElementById('unregisterModal').classList.add('active');
}

window.confirmUnregisterAccount = confirmUnregisterAccount;

function closeUnregisterModal() {
  document.getElementById('unregisterModal').classList.remove('active');
}

window.closeUnregisterModal = closeUnregisterModal;

function executeUnregister() {
  if (currentUserEmail && dbState.users[currentUserEmail]) {
    delete dbState.users[currentUserEmail];
    localStorage.removeItem('boutiquePointsCurrentUserEmail');
    localStorage.removeItem('boutiquePointsUserData');
    logout();
    showToast('Compte supprimé');
  }
}

window.executeUnregister = executeUnregister;

// QR Code (simplified - would need QR library)
function generateQRCode() {
  const url = window.location.href;
  document.getElementById('qrUrlText').textContent = url;
  // In production, use a QR code library
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  
  // Load theme
  const savedTheme = localStorage.getItem('boutiquePointsTheme') || 'cream';
  document.documentElement.setAttribute('data-theme', savedTheme);
  dbState.theme = savedTheme;
  
  // Check if user is already logged in
  if (loadUserFromStorage()) {
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    updateUI();
    renderShop();
    renderOrders();
    generateQRCode();
  } else {
    document.getElementById('login').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
  
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
  
  // Cart modal
  const cartBtn = document.getElementById('cartBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartModal = document.getElementById('cartModal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  
  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);
  
  if (cartModal) {
    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) closeCart();
    });
  }
  
  // Navigation
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const viewName = btn.dataset.view;
      switchView(viewName);
      if (viewName === 'orders') renderOrders();
      if (viewName === 'admin-dashboard' && isAdminMode) renderAdminDashboard();
    });
  });
  
  // Theme buttons
  window.setAppTheme = setAppTheme;
  
  // Admin functions
  const adminUnlock = document.getElementById('adminUnlock');
  if (adminUnlock) adminUnlock.addEventListener('click', unlockAdmin);
  
  const toggleStoreBtn = document.getElementById('toggleStoreBtn');
  if (toggleStoreBtn) toggleStoreBtn.addEventListener('click', toggleStore);
  
  const testStudentBtn = document.getElementById('testStudentBtn');
  if (testStudentBtn) testStudentBtn.addEventListener('click', testStudentMode);
  
  const resetStocksBtn = document.getElementById('resetStocksBtn');
  if (resetStocksBtn) resetStocksBtn.addEventListener('click', resetAllStocks);
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  // Advice buttons
  document.querySelectorAll('[data-advice]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.advice;
      showAdvice(type);
    });
  });
  
  // Cancel order button
  const cancelOrderBtn = document.getElementById('cancelOrderModalBtn');
  if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener('click', () => {
      cart = {};
      updateCartCount();
      closeTicketModal();
      showToast('Commande annulée');
    });
  }
  
  // Make sure all buttons are clickable
  document.querySelectorAll('button, a, .nav-btn').forEach(el => {
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
  });
});
