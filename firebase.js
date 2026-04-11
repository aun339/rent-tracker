import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCHTqw2YRwitCDZTXYLnq76Eu0CojEIs2Y",
  authDomain: "rental-7b444.firebaseapp.com",
  projectId: "rental-7b444",
  storageBucket: "rental-7b444.firebasestorage.app",
  messagingSenderId: "573012830060",
  appId: "1:573012830060:web:edd57625e2905ef6863549",
  measurementId: "G-G26X5LMDZK"
};

// Initialize Firebase, Auth, and Database
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);