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
let currentUserEmail = localStorage.getItem('boutiquePointsCurrentUserEmail') || null;
const cachedUserData = localStorage.getItem('boutiquePointsUserData');
if (cachedUserData) {
  try {
    const parsed = JSON.parse(cachedUserData);
    if (parsed && parsed.email) {
      currentUserEmail = parsed.email;
      dbState.users[parsed.email] = parsed;
    }
  } catch(e) {}
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

async function initFirebase() {
  try {
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
  } catch (err) {
    console.error("Firebase init error:", err);
    document.getElementById('syncText').textContent = 'Mode local (hors ligne)';
  }
}

function startCloudListeners() {
  // Cloud logic can be linked here via Firestore snapshots
}

window.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  if (currentUserEmail) {
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    // --- GESTION DES POINTS DE BASE (15 pts) ---
function initUserPoints() {
    if (currentUserEmail && dbState.users[currentUserEmail]) {
        // Si l'utilisateur n'a pas encore de points initialisés
        if (dbState.users[currentUserEmail].points === undefined) {
            dbState.users[currentUserEmail].points = 15; // 15 points de base
            localStorage.setItem('boutiquePointsUserData', JSON.stringify(dbState.users[currentUserEmail]));
        }
        // Mise à jour de l'affichage dans l'interface
        const pointsElement = document.getElementById('pointsDisponibles'); // Adapte l'ID selon ton HTML
        if (pointsElement) {
            pointsElement.textContent = dbState.users[currentUserEmail].points + ' pts';
        }
    }
}

// --- GESTION DES CLICS SUR LE MENU DE NAVIGATION ---
function initNavigation() {
    // Sélectionne tous les boutons du menu (en haut)
    const navButtons = document.querySelectorAll('header button, nav button, .nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetName = button.textContent.trim();
            console.log("Clic sur l'onglet :", targetName);
            
            // Ici tu peux ajouter la logique pour afficher/masquer les sections correspondantes
            // Exemple : masquer toutes les sections et afficher celle qui correspond au bouton cliqué
        });
    });
}

// Mets à jour ton DOMContentLoaded existant pour lancer ces fonctions :
window.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    if (currentUserEmail) {
        document.getElementById('login').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        // Initialise les points et la navigation dès que l'app s'affiche
        initUserPoints();
        initNavigation();
    }
});
  }
});
