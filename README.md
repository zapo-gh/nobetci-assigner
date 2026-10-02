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

### Ortam Değişkenleri

Yerel geliştirmenin sorunsuz ilerlemesi için proje kökünde `.env.local` dosyası oluşturup aşağıdaki değerleri tanımlayın:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=SUPABASE_ANON_KEYINIZ
VITE_APP_VERSION=local
```

`VITE_APP_VERSION` isteğe bağlıdır ancak üretim build'lerinde servis worker önbelleğini güncel tutmak için benzersiz bir sürüm etiketi kullanmanız önerilir.

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
5. GitHub repository'nizde `RENDER_DEPLOY_HOOK_URL` isimli bir secret oluşturup Render deploy hook URL'inizi girin.

### Otomatik Deployment

GitHub'a push ettikten sonra Render.com otomatik olarak:
1. Kodu çeker
2. `npm run build` çalıştırır
3. Build dosyalarını deploy eder
4. Uygulamayı başlatır

## Supabase Veri Tabanı Notları

Uygulamanın gerçek zamanlı ve çok kullanıcılı senaryolarda sorunsuz çalışması için aşağıdaki veritabanı kısıtlarını eklemeniz önerilir:

### 1. Sınıf adları için benzersiz indeks

```sql
create unique index if not exists classes_class_name_lower_idx
  on classes (lower(classname));
```

Bu indeks aynı sınıf adının (ör. `9-E`) farklı cihazlardan eş zamanlı olarak iki kez eklenmesini engeller. Uygulamadaki `insertClass` fonksiyonu hata kodu `23505` döndüğünde mevcut kaydı tekrar kullanacak şekilde güncellendi.

### 2. `class_absence` performansı

`class_absence` tablosu artık her otomatik kaydetme işleminde tamamen silinip yeniden yazılmıyor; mevcut satırlar ile hedef durum karşılaştırılarak sadece değişen kayıtlar güncelleniyor. Yine de büyüyen tablolar için aşağıdaki indeksler sorgu performansını iyileştirir:

```sql
create index if not exists class_absence_day_idx on class_absence (day);
create index if not exists class_absence_day_period_idx on class_absence (day, period);
```

Bu adımlar opsiyoneldir ancak yüksek trafikli kullanımda Supabase üzerindeki yükü ciddi ölçüde azaltır.

## ESLint Yapılandırması

Üretim uygulaması geliştiriyorsanız, TypeScript ile tip-aware lint kuralları kullanmanızı öneririz. Daha fazla bilgi için [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) sayfasını inceleyin.
