import React, { useState, useEffect, useRef } from 'react';
import {
  hashPassword,
  verifyPassword,
  setSessionAuthenticated,
  cacheAdminHashLocally,
  getCachedAdminHash
} from '../utils/authUtils';
import { getAdminAuthConfig, setAdminAuthConfig } from '../services/firebaseDataService';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [storedHash, setStoredHash] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // İlk yüklemede Firebase veya yerel önbellekten mevcut şifre hashini kontrol et
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSetup() {
      try {
        setIsCheckingSetup(true);
        // Önce yerel önbellek
        const localHash = getCachedAdminHash();
        if (localHash && isMounted) {
          setStoredHash(localHash);
        }

        // Firebase'den en güncel hash'i çek
        const fbConfig = await getAdminAuthConfig();
        if (isMounted) {
          if (fbConfig?.passwordHash) {
            setStoredHash(fbConfig.passwordHash);
            cacheAdminHashLocally(fbConfig.passwordHash);
            setIsFirstSetup(false);
          } else if (!localHash) {
            // Hiç şifre tanımlanmamışsa ilk kurulum moduna geç
            setIsFirstSetup(true);
          }
        }
      } catch (err) {
        // Çevrimdışı fallback: yerel önbellek varsa onu kullan
        const localHash = getCachedAdminHash();
        if (localHash && isMounted) {
          setStoredHash(localHash);
          setIsFirstSetup(false);
        } else if (isMounted) {
          // Varsayılan olarak ilk kurulum
          setIsFirstSetup(true);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSetup(false);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    }

    checkAuthSetup();
    return () => { isMounted = false; };
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Normal Giriş
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Lütfen yönetici şifresini giriniz.');
      triggerShake();
      inputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      let currentHash = storedHash;

      // Eğer henüz hash yoksa (örneğin ilk açılışta ağ gecikmesi olduysa) tekrar sorgula
      if (!currentHash) {
        const fbConfig = await getAdminAuthConfig();
        if (fbConfig?.passwordHash) {
          currentHash = fbConfig.passwordHash;
          setStoredHash(currentHash);
          cacheAdminHashLocally(currentHash);
        }
      }

      // Eğer sistemde hiç hash yoksa varsayılan şifre '1234' kabul edilir veya ilk kurulum önerilir
      if (!currentHash) {
        if (password.trim() === '1234') {
          const newHash = await hashPassword('1234');
          await setAdminAuthConfig({ passwordHash: newHash });
          cacheAdminHashLocally(newHash);
          setSessionAuthenticated(rememberMe);
          onLoginSuccess();
          return;
        } else {
          setErrorMsg('Sistemde henüz şifre belirlenmemiş. Varsayılan şifre: 1234');
          triggerShake();
          setIsLoading(false);
          return;
        }
      }

      const isValid = await verifyPassword(password.trim(), currentHash);
      if (isValid) {
        setSessionAuthenticated(rememberMe);
        onLoginSuccess();
      } else {
        setErrorMsg('Girdiğiniz yönetici şifresi hatalı. Lütfen tekrar deneyiniz.');
        triggerShake();
        setPassword('');
        inputRef.current?.focus();
      }
    } catch (err: any) {
      setErrorMsg('Doğrulama sırasında bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // İlk Kurulumda Şifre Belirleme
  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 4) {
      setErrorMsg('Yönetici şifresi en az 4 karakterden oluşmalıdır.');
      triggerShake();
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const newHash = await hashPassword(password.trim());
      await setAdminAuthConfig({ passwordHash: newHash });
      cacheAdminHashLocally(newHash);
      setStoredHash(newHash);
      setSessionAuthenticated(rememberMe);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMsg('Şifre kaydedilirken bir hata oluştu: ' + (err?.message || ''));
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-backdrop">
      {/* Arka Plan Dekoratif Işık Halkaları */}
      <div className="login-ambient-orb orb-1" />
      <div className="login-ambient-orb orb-2" />
      <div className="login-ambient-orb orb-3" />

      <div className={`login-card ${shake ? 'shake-anim' : ''}`}>
        {/* Okul & Sistem Başlığı */}
        <div className="login-header">
          <div className="logo-ring">
            <img src="/logo.png" alt="Okul Logosu" className="login-logo-img" />
          </div>
          <div className="login-badge-pill">
            <span className="badge-dot" />
            MEB Nöbet & Görevlendirme
          </div>
          <h1 className="login-title">
            {isFirstSetup ? 'Yönetici Şifresi Belirleyin' : 'Yönetici Girişi'}
          </h1>
          <p className="login-subtitle">
            {isFirstSetup
              ? 'Sisteme güvenli erişim için okul idaresine özel bir şifre tanımlayınız.'
              : 'Verilere ve planlama ekranına erişmek için okul şifresini giriniz.'}
          </p>
        </div>

        {isCheckingSetup ? (
          <div className="login-loading-state">
            <div className="login-spinner" />
            <span>Güvenlik modülü yükleniyor...</span>
          </div>
        ) : (
          <form onSubmit={isFirstSetup ? handleSetupPassword : handleLogin} className="login-form">
            {/* Şifre Alanı */}
            <div className="login-input-group">
              <label htmlFor="admin-password">
                {isFirstSetup ? 'Yeni Yönetici Şifresi' : 'Okul Şifresi'}
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔐</span>
                <input
                  id="admin-password"
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isFirstSetup ? 'En az 4 karakter giriniz' : 'Yönetici şifrenizi giriniz'}
                  className="login-input"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                  aria-label="Şifre görünürlüğünü değiştir"
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* İlk Kurulum: Şifre Tekrar Alanı */}
            {isFirstSetup && (
              <div className="login-input-group">
                <label htmlFor="admin-confirm-password">Şifre Tekrar</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔑</span>
                  <input
                    id="admin-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifrenizi tekrar yazınız"
                    className="login-input"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Hata Mesajı */}
            {errorMsg && (
              <div className="login-error-alert" role="alert">
                <span className="error-icon">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Beni Hatırla & Bilgilendirme */}
            <div className="login-options-row">
              <label className="remember-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span>Bu cihazda oturumu açık tut</span>
              </label>
            </div>

            {/* Gönder Butonu */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="btn-loading-content">
                  <div className="login-spinner-sm" />
                  <span>Doğrulanıyor...</span>
                </div>
              ) : isFirstSetup ? (
                <span>🛡️ Şifreyi Kaydet ve Başla</span>
              ) : (
                <span>🔓 Giriş Yap</span>
              )}
            </button>
          </form>
        )}

        {/* Alt Bilgi */}
        <div className="login-footer">
          <span className="footer-shield">🛡️</span>
          <span>Tüm verileriniz Firebase bulut altyapısında şifreli korunmaktadır.</span>
        </div>
      </div>

      <style>{`
        .login-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          z-index: 9999;
          padding: 20px;
          box-sizing: border-box;
          overflow: hidden;
          font-family: inherit;
        }

        /* Arka Plan Ambient Orb Efektleri */
        .login-ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          opacity: 0.45;
          animation: floatOrb 18s ease-in-out infinite alternate;
        }
        .orb-1 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, #6366f1 0%, transparent 70%);
          top: -100px;
          left: -100px;
        }
        .orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #a855f7 0%, transparent 70%);
          bottom: -120px;
          right: -120px;
          animation-delay: -5s;
        }
        .orb-3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
          top: 40%;
          left: 60%;
          animation-delay: -10s;
        }

        @keyframes floatOrb {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.1); }
          100% { transform: translate(-30px, 40px) scale(0.95); }
        }

        /* Glassmorphism Giriş Kartı */
        .login-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 28px;
          padding: 38px 34px;
          box-shadow: 
            0 25px 60px -15px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(255, 255, 255, 0.4) inset;
          box-sizing: border-box;
          z-index: 10;
          animation: cardEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Titreme Animasyonu (Hatalı Şifre) */
        .shake-anim {
          animation: shakeCard 0.45s ease-in-out;
        }
        @keyframes shakeCard {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-9px); }
          40%, 80% { transform: translateX(9px); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 26px;
        }

        .logo-ring {
          width: 80px;
          height: 80px;
          margin: 0 auto 14px;
          border-radius: 22px;
          background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
          box-shadow: 
            0 10px 25px rgba(99, 102, 241, 0.2),
            0 0 0 1px rgba(226, 232, 240, 0.8);
          display: grid;
          place-items: center;
          padding: 10px;
          box-sizing: border-box;
          transition: transform 0.25s ease;
        }
        .logo-ring:hover {
          transform: translateY(-2px) scale(1.03);
        }
        .login-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .login-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 0.76rem;
          font-weight: 700;
          border-radius: 999px;
          margin-bottom: 10px;
          letter-spacing: 0.3px;
          border: 1px solid #c7d2fe;
        }
        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4f46e5;
          box-shadow: 0 0 8px #6366f1;
        }

        .login-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
          letter-spacing: -0.4px;
        }

        .login-subtitle {
          font-size: 0.86rem;
          color: #64748b;
          margin: 0 auto;
          line-height: 1.45;
          max-width: 330px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }

        .login-input-group label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          font-size: 1.05rem;
          pointer-events: none;
          opacity: 0.8;
        }

        .login-input {
          width: 100%;
          padding: 13px 44px 13px 42px;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 14px;
          font-size: 0.96rem;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
          transition: all 0.2s ease;
          box-sizing: border-box;
          outline: none;
        }
        .login-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.16);
        }

        .btn-toggle-eye {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          font-size: 1.1rem;
          cursor: pointer;
          opacity: 0.65;
          transition: opacity 0.15s ease, transform 0.15s ease;
          padding: 4px;
        }
        .btn-toggle-eye:hover {
          opacity: 1;
          transform: scale(1.1);
        }

        .login-error-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #fef2f2;
          border: 1.5px solid #fecaca;
          border-radius: 12px;
          color: #b91c1c;
          font-size: 0.82rem;
          font-weight: 600;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.82rem;
        }

        .remember-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #475569;
          cursor: pointer;
          user-select: none;
          font-weight: 500;
        }
        .remember-checkbox-label input {
          accent-color: #6366f1;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .login-submit-btn {
          width: 100%;
          padding: 13px;
          margin-top: 4px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff;
          font-size: 0.98rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(79, 70, 229, 0.35);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: grid;
          place-items: center;
        }
        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 8px 22px rgba(79, 70, 229, 0.45);
          background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
        }
        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .btn-loading-content {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .login-loading-state {
          padding: 30px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #64748b;
          font-size: 0.88rem;
        }

        .login-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .login-spinner-sm {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.74rem;
          color: #94a3b8;
          text-align: center;
        }
        .footer-shield {
          font-size: 0.85rem;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 30px 22px;
            border-radius: 22px;
          }
          .login-title {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </div>
  );
}
