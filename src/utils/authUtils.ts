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
const SESSION_TOKEN_KEY = 'nobetci_auth_token';
const DEVICE_SECRET_KEY = 'nobetci_auth_device_secret';

// Oturumu imzalayan yerel cihaz anahtarını alır veya oluşturur
function getDeviceSecret(): string {
  try {
    let secret = localStorage.getItem(DEVICE_SECRET_KEY);
    if (!secret) {
      secret = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem(DEVICE_SECRET_KEY, secret);
    }
    return secret;
  } catch {
    return 'fallback_device_secret';
  }
}

// Zaman damgası ve cihaz imzası içeren oturum token'ı üretir
function generateSessionToken(): string {
  const secret = getDeviceSecret();
  const timestamp = Date.now();
  let hash = 0;
  const str = `${timestamp}_${secret}_admin`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `${timestamp}.${Math.abs(hash).toString(36)}`;
}

// Token imzasını ve süresini (maksimum 14 gün) doğrular
function verifySessionToken(token: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const timestamp = parseInt(parts[0], 10);
  if (!Number.isFinite(timestamp)) return false;

  // 14 günden eski oturumları geçersiz kıl
  const age = Date.now() - timestamp;
  if (age < 0 || age > 14 * 24 * 60 * 60 * 1000) return false;

  // İmzayı doğrula
  const secret = getDeviceSecret();
  let hash = 0;
  const str = `${timestamp}_${secret}_admin`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return parts[1] === Math.abs(hash).toString(36);
}

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
 * Konsoldan nobetci_auth_remember=true yazarak yapılan sahte girişleri engeller.
 */
export function isSessionAuthenticated(): boolean {
  try {
    const sessionAuth = sessionStorage.getItem(SESSION_KEY) === 'true';
    const rememberAuth = localStorage.getItem(REMEMBER_KEY) === 'true';
    if (!sessionAuth && !rememberAuth) return false;

    // Oturum token'ını ve imzasını doğrula
    const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const rememberToken = localStorage.getItem(SESSION_TOKEN_KEY);
    const token = sessionAuth ? sessionToken : rememberToken;

    const isValid = verifySessionToken(token);
    if (!isValid) {
      // Sahte veya süresi dolmuş oturumu temizle
      clearSession();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Oturumu açar ve imzalı oturum token'ı oluşturur.
 */
export function setSessionAuthenticated(rememberMe: boolean = false): void {
  try {
    const token = generateSessionToken();
    sessionStorage.setItem(SESSION_KEY, 'true');
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, 'true');
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch (e) {
    // LocalStorage hatası olursa yoksay
  }
}

/**
 * Oturumu kapatır, token'ları temizler ve ekranı kilitler.
 */
export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
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
