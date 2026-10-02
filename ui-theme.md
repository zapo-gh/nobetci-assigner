# UI Tema Kuralları

Bu projedeki tüm arayüz çalışmalarında `src/styles/theme.css` dosyası tek stil kaynağıdır.

## Zorunlu kurallar
- Renk, boşluk, yarıçap, gölge ve font için **asla ham değer yazma** (`#4f7cff`, `16px` vb.). Her zaman `theme.css` içindeki CSS değişkenlerini kullan (`var(--primary)`, `var(--space-4)` …).
- İhtiyaç duyulan token yoksa önce `theme.css`'e ekle, sonra kullan. Kullanıcıya haber ver.
- Hem açık hem koyu temada çalışmalı; renkleri sadece token üzerinden ver ki `data-theme="dark"` ile otomatik değişsin.
- Metin kontrastı WCAG AA (4.5:1) altına düşmemeli. Soluk metin için `--text-muted` kullan.

## Renk anlamları
- `--primary`: ana eylemler, aktif sekme, seçili gün
- `--success`: başarı rozetleri ve bildirimleri
- `--warning`: mazeret / "Okula Gelemeyenler" ile ilgili her şey
- `--danger`: yalnızca yıkıcı eylemler ("Tümünü Sil"); mutlaka onay penceresi ile
- `--level-9 … --level-12`: sınıf kartı sol şeridi (`data-level` özniteliği ile)

## Bileşen kalıpları
- Kartlar: `.card` sınıfı (padding, border, gölge, hover yükselmesi hazır)
- Sınıf kartları: `.card.class-card[data-level="10"]`
- Sekmeler: alt çizgili stil (`.tab[aria-selected="true"]`), tüm sekmelerde ikon + tek satır etiket
- Butonlar: `.btn-primary`, `.btn-danger`; basınca `scale(0.98)`
- Kart aralığı `var(--card-gap)`, içerik genişliği `var(--content-max-width)`
- Başarı mesajları kalıcı rozet değil, kendiliğinden kapanan toast olmalı
- Boş durum ekranlarında: büyük ikon, açıklayıcı metin ve birincil eylem butonu bulunmalı

## Yapma
- Satır içi `style={{ color: ... }}` ile renk verme
- Yeni bileşende `bg-black`, `bg-gray-900` gibi sabit renk sınıfları kullanma
- Tema dosyasını kullanıcı istemeden yeniden yazma
