import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLYbKQ4LKrnXLv_OZOfIDfBkYXv-HUPGk",
  authDomain: "parallel-programming-site.firebaseapp.com",
  projectId: "parallel-programming-site",
  storageBucket: "parallel-programming-site.firebasestorage.app",
  messagingSenderId: "1050372244196",
  appId: "1:1050372244196:web:2b384a48d2cd05b5b3e2f1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const API_KEY = firebaseConfig.apiKey; // экспортируем для REST