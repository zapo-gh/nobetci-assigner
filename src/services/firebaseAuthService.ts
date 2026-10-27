import { signInAnonymously, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseClient.js';
import { logger } from '../utils/logger.js';

const IS_FB_CONFIGURED = !!import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.MODE !== 'test';

/**
 * Yönetici şifresi doğrulandığında Firebase Auth oturumu açar.
 * Böylece Firestore Security Rules (request.auth != null) başarıyla geçer.
 */
export async function loginWithFirebaseAuth(): Promise<User | null> {
  if (!IS_FB_CONFIGURED) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err: any) {
    logger.warn('[FirebaseAuth] Firebase Auth bağlanamadı (Konsolda henüz aktif olmayabilir):', err?.code || err?.message);
    // auth/configuration-not-found veya operation-not-allowed durumunda uygulamayı kilitleme
    return null;
  }
}

/**
 * Firebase Auth oturumunun hazır ve aktif olduğunu garanti eder.
 * Sayfa yenilendiğinde IndexedDB'den kullanıcının yüklenmesini bekler,
 * oturum yoksa anonim giriş yapar.
 */
export async function ensureFirebaseAuth(): Promise<User | null> {
  if (!IS_FB_CONFIGURED) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    if (typeof (auth as any).authStateReady === 'function') {
      await (auth as any).authStateReady();
    }
    if (auth.currentUser) return auth.currentUser;
    return await loginWithFirebaseAuth();
  } catch (err: any) {
    logger.warn('[FirebaseAuth] ensureFirebaseAuth uyarısı:', err?.code || err?.message);
    return null;
  }
}

/**
 * Ekran kilitlendiğinde veya oturum kapatıldığında Firebase Auth oturumunu sonlandırır.
 * Böylece veritabanı erişimi anında kesilir.
 */
export async function logoutFirebaseAuth(): Promise<void> {
  if (!IS_FB_CONFIGURED) return;
  try {
    await signOut(auth);
  } catch (err) {
    logger.warn('[FirebaseAuth] Çıkış hatası:', err);
  }
}

/**
 * Aktif Firebase Auth kullanıcısını döndürür.
 */
export function getFirebaseAuthUser(): User | null {
  if (!IS_FB_CONFIGURED) return null;
  return auth.currentUser;
}

/**
 * Auth durumu değiştiğinde bildirim almak için dinleyici.
 */
export function onFirebaseAuthStateChanged(callback: (user: User | null) => void): () => void {
  if (!IS_FB_CONFIGURED) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
