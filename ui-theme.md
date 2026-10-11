# UI Tema Kuralları

Bu projede arayüz **yalnızca açık, canlı ve ferah** temayı kullanır. Tek stil kaynağı `src/styles/theme.css` dosyasıdır.

## Kesin kurallar
- **Koyu tema yoktur.** Koyu tema, tema değiştirme butonu, `data-theme`, `.dark` sınıfı, `prefers-color-scheme: dark` ve `dark:` Tailwind sınıflarını ekleme. Mevcutsa kaldır.
- Renk, boşluk, yarıçap, gölge ve font için **ham değer yazma** (`#4f46e5`, `16px` vb.); `var(--primary)`, `var(--space-4)` gibi token'ları kullan.
- Gereken token yoksa önce `theme.css`'e ekle, sonra kullan ve kullanıcıya haber ver.
- Metin kontrastı en az 4.5:1 olmalı. Soluk metin için `--text-muted`.

## Görünüm ilkeleri
- Genel his: canlı, belirgin, yüksek kontrastlı. Soluk/pastel yüzey ve ince gri çerçeve kullanma; kenarlıklar 2px, gölgeler belirgin.
- Üst başlık: tam genişlikte `--header-gradient` şerit, beyaz yazı; gün seçici cam efektli, aktif gün beyaz.
- Zemin: `--bg-gradient` (lavanta/pembe/nane geçişi), kartlar beyaz (`--surface`) ve derin gölgeli.
- Kart başlığı kendi tonunda dolgulu: sınıf kartı seviye rengiyle (`data-level`), öğretmen kartı `data-tone="1..6"` ile dönüşümlü renkte.
- Sekmeler dolu hap butonlar; aktif sekme grubunun renginde dolgulu (`data-group="data|plan|output"`).
- Cömert boşluk: kart aralığı `--card-gap`, kart içi `--card-padding`, bölümler arası `--section-gap`.
- Yuvarlak hatlar: kartlar `--radius-md`, paneller `--radius-lg`, butonlar `--radius-sm`, gün seçici ve rozetler `--radius-pill`.
- Ana eylemler ve aktif öğeler `--primary-gradient` ile; sıradan butonlar beyaz zeminli çerçeveli.

## Renk anlamları
- `--primary`: ana eylem, aktif sekme, seçili gün
- `--accent`: ikincil vurgu (bilgi rozetleri, grafikler)
- `--success`: başarı bildirimleri
- `--warning`: mazeret / "Okula Gelemeyenler" ile ilgili her şey
- `--danger`: yalnızca yıkıcı eylemler ("Tümünü Sil"), onay penceresiyle
- `--level-9 … --level-12`: sınıf kartı sol şeridi (`data-level`)

## Bileşen kalıpları (theme.css'te hazır)
- Başlık: `.app-header`, `.app-logo`, `.app-title`, `.app-subtitle`
- Gün seçici: `.day-switcher` + `.day-pill[aria-selected]`
- Sekmeler: `.tabs` + `.tab[aria-selected][data-group]`; tüm sekmelerde ikon, tek satır etiket, gruplar arası `.tab-group-sep`
- Filtre çipleri: `.filter-chip[aria-pressed]` (seviye çiplerinde `data-level`)
- Avatar boş daire olarak bırakılmaz; baş harf veya ikon göster
- Panel üst şeridi `.panel-accent` yalnızca üst kenarda olur, yan kenarlara taşmaz
- Sekme şeridi ile altındaki panel arasında her zaman `--space-6` boşluk bırak (`.tabs` margin-bottom).
- Araç çubuğu: `.toolbar`; içerik paneli: `.panel`
- Kartlar: `.card-grid` içinde `.card`; sınıf kartı `.card.class-card[data-level]`; öğretmen kartında `.avatar`
- Gün satırı: `.day-row` (doluluk için `style="--fill: 60%"`), boş gün `data-empty="true"`
- Ders hücreleri: `.lesson-cell.c1 … .c6`; uzun metin taşmamalı, tooltip ver
- Arama kutusu: tek kenarlıklı `.input`; etrafına ek çerçeve veya kutu koyma
- Bildirim: kendiliğinden kapanan `.toast`
- Boş durum: `.empty-state` (büyük ikon, açıklama, birincil buton)

## Yapma
- Satır içi `style` ile renk verme; `bg-black`, `bg-gray-900`, `text-white` gibi sabit koyu zemin sınıfları kullanma.
- Aynı öğede çift kenarlık ya da çift ikon bırakma.
- Kullanıcı istemeden `theme.css` dosyasını baştan yazma.
