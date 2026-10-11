# Nöbetçi Atama Sistemi

Bu proje, okul nöbetçi atamalarını yönetmek için geliştirilmiş bir web uygulamasıdır. React ve Vite kullanılarak oluşturulmuştur.

## Özellikler

- Öğretmen ve sınıf bilgilerini yönetme
- Nöbetçi atamalarını otomatik ve adil olarak yapma
- Excel ve PDF dosyalarından veri içe aktarma
- Çakışma kontrolü ve önerileri
- Yazdırılabilir günlük nöbet ve vekâlet listeleri
- Modern ve kullanıcı dostu arayüz

## Teknoloji Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Firebase (Cloud Firestore)
- **Hosting:** Firebase Hosting

## Kurulum ve Çalıştırma

### Ortam Değişkenleri

Yerel geliştirmenin sorunsuz ilerlemesi için proje kökünde `.env.local` dosyası oluşturup aşağıdaki Firebase değerlerini tanımlayın:

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```

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

### Build ve Test

```bash
# Projeyi derleme
npm run build

# Testleri çalıştırma
npm run test

# Üretim build önizlemesi
npm run preview
```

## Firebase Deployment

Bu proje Firebase Hosting üzerinde yayınlanmaktadır.

```bash
npm run build
firebase deploy --only hosting
```
