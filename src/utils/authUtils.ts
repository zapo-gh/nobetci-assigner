/**
 * authUtils — Okul Yönetici Şifresi / Kilit Ekranı Güvenlik Yardımcıları
 * 
 * Web Crypto API kullanarak SHA-256 ile tuzlanmış hashleme yapar.
 * sessionStorage ve localStorage tabanlı oturum yönetimi sunar.
 */

const SALT = 'nobetci_asistan_meb_salt_v1';
const SESSION_KEY = 'nobetci_auth_session';
const REMEMBER_KEY = 'nobetci_auth_remember';
const CACHED_HASH_KEY = 'nobetci_cached_admin_hash';

/**
 * Verilen şifreyi Web Crypto API ile SHA-256 olarak hashler.
 */
export async function hashPassword(password: string): Promise<string> {
  const cleanPass = String(password || '').trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${cleanPass}_${SALT}`);
  
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback (örneğin eski test ortamları için)
  let hash = 0;
  const str = `${cleanPass}_${SALT}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

/**
 * Girilen şifrenin saklanan hash ile eşleşip eşleşmediğini doğrular.
 */
export async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  if (!inputPassword || !storedHash) return false;
  const hashedInput = await hashPassword(inputPassword);
  return hashedInput === storedHash;
}

/**
 * Tarayıcıda geçerli aktif oturum var mı kontrol eder.
 */
export function isSessionAuthenticated(): boolean {
  try {
    const sessionAuth = sessionStorage.getItem(SESSION_KEY) === 'true';
    const rememberAuth = localStorage.getItem(REMEMBER_KEY) === 'true';
    return sessionAuth || rememberAuth;
  } catch {
    return false;
  }
}

/**
 * Oturumu açar ve isteğe bağlı 'Beni Hatırla' kaydını yapar.
 */
export function setSessionAuthenticated(rememberMe: boolean = false): void {
  try {
    sessionStorage.setItem(SESSION_KEY, 'true');
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, 'true');
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  } catch (e) {
    // LocalStorage hatası olursa yoksay
  }
}

/**
 * Oturumu kapatır ve ekranı kilitler.
 */
export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  } catch (e) {
    // LocalStorage hatası olursa yoksay
  }
}

/**
 * Çevrimdışı / hızlı erişim için bilinen şifre hashini önbelleğe alır.
 */
export function cacheAdminHashLocally(hash: string): void {
  try {
    if (hash) {
      localStorage.setItem(CACHED_HASH_KEY, hash);
    }
  } catch {}
}

/**
 * Önbellekteki şifre hashini döndürür.
 */
export function getCachedAdminHash(): string | null {
  try {
    return localStorage.getItem(CACHED_HASH_KEY);
  } catch {
    return null;
  }
}
