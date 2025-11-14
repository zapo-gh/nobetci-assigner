# Nöbetçi Atama Sistemi

Bu proje, okul nöbetçi atamalarını yönetmek için geliştirilmiş bir web uygulamasıdır. React ve Vite kullanılarak oluşturulmuştur.

## Özellikler

- Öğretmen ve sınıf bilgilerini yönetme
- Nöbetçi atamalarını otomatik olarak yapma
- Excel ve PDF dosyalarından veri içe aktarma
- Çakışma kontrolü ve önerileri
- Modern ve kullanıcı dostu arayüz

## Teknoloji Stack

- **Frontend:** React 19, Vite
- **Backend:** Supabase
- **Deployment:** Render.com

## Kurulum ve Çalıştırma

### Yerel Geliştirme

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

2. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

3. Tarayıcınızda `http://localhost:5173` adresine gidin.

### Build

```bash
npm run build
```

### Önizleme

```bash
npm run preview
```

## Render.com Deployment

Bu proje Render.com'da otomatik deployment için yapılandırılmıştır. GitHub'a push ettikten sonra Render.com otomatik olarak build ve deploy işlemini gerçekleştirir.

### Gerekli Adımlar

1. Render.com hesabınızda yeni bir web service oluşturun
2. GitHub repository'nizi bağlayın: `https://github.com/zapo-gh/nobetci-assigner`
3. Build settings:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run preview`
4. Environment variables ekleyin:
   - `NODE_ENV=production`
   - `VITE_SUPABASE_URL` (Supabase projenizin URL'i)
   - `VITE_SUPABASE_ANON_KEY` (Supabase anon key)

### Otomatik Deployment

GitHub'a push ettikten sonra Render.com otomatik olarak:
1. Kodu çeker
2. `npm run build` çalıştırır
3. Build dosyalarını deploy eder
4. Uygulamayı başlatır

## ESLint Yapılandırması

Üretim uygulaması geliştiriyorsanız, TypeScript ile tip-aware lint kuralları kullanmanızı öneririz. Daha fazla bilgi için [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) sayfasını inceleyin.
