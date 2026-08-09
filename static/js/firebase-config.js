// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLYbKQ4LKrnXLv_OZOfIDfBkYXv-HUPGk",
  authDomain: "parallel-programming-site.firebaseapp.com",
  projectId: "parallel-programming-site",
  storageBucket: "parallel-programming-site.firebasestorage.app",
  messagingSenderId: "1050372244196",
  appId: "1:1050372244196:web:2b384a48d2cd05b5b3e2f1",
  measurementId: "G-TQNT142FEH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);