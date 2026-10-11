/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBWByutpdFOZqlm9wwkAnGoVUjLDAyTBaM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nobetci-assigner.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nobetci-assigner",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nobetci-assigner.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1088862899198",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1088862899198:web:5b0033051f72d8e8390eaf",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-W3W13JZDYH"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});