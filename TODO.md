# Veri Uyumsuzluğu Düzeltme Planı

## Tamamlanan
- [x] Detaylı analiz yapıldı (veri akışı, uyumsuzluklar belirlendi)
- [x] Kullanıcı onayı alındı

## Devam Eden
- [ ] database-schema.sql güncelle (class_free/teacher_free JSONB yap, index'ler ekle)
- [ ] supabaseDataService.js güncelle (bulk save fonksiyonları ekle, loadInitialData iyileştir)
- [ ] App.jsx güncelle (mount'ta Supabase fallback, auto-save'e bulk save'ler ekle)
- [ ] Test et (npm run dev, veri ekle/import et, Supabase kontrol)

## Notlar
- Schema değişikliği: class_free/teacher_free JSONB'ye çevrilerek nested data desteklenecek
- Bulk save'ler: Tüm state verilerini Supabase'e senkronize edecek
- Mount fallback: localStorage boşsa Supabase'den yükleme
- Import iyileştirmesi: Excel/PDF import sonrası bulk save çağrısı
Schema güncellendi: class_free ve teacher_free JSONB yapısına çevrildi, idx_teachers_source eklendi.
Service güncellendi: bulkSaveTeachers, bulkSaveClasses, bulkSaveAbsents, bulkSaveClassFree, bulkSaveTeacherFree, bulkSaveLocks eklendi.
loadInitialData güncellendi: classFree ve teacherFree JSONB'den yükleniyor.
loadInitialData güncellendi: classFree ve teacherFree JSONB'den yükleniyor.
App.jsx güncellendi: Supabase fallback yükleme ve tüm bulk save'ler eklendi.
Test: Schema çalıştır, npm run dev, veri ekle/import et, Supabase kontrol et.
