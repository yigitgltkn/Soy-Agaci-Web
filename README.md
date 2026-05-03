
Bu klasörde sitenin tüm kaynak dosyaları var. Bu klasörü güvenli bir yerde sakla
(Google Drive, harici disk, vs.) — geleceğe yatırım.

## Klasördeki Dosyalar

| Dosya | Ne İşe Yarar |
|---|---|
| `aile-verisi.xlsx` | **EN ÖNEMLİSİ** — Tüm aile bilgileri burada 
| `index.html` | Şu an Netlify'da yayında olan dosya |
| `index-template.html` | HTML şablonu (verisiz, kod) |
| `build_tree.py` | Excel'i HTML'e çeviren Python betiği |
| `data.js` | Excel'den üretilmiş ara dosya (443 kişinin JS verisi) |
| `people.json` | Excel'den üretilmiş ham veri (insan tarafından okunabilir) |

---

## DURUM 1: Küçük bir düzeltme yapmak istiyorum

Örn: bir tarihi düzeltmek, yazım hatası, vb.

1. `index.html` dosyasını bir text editör ile aç (Notepad, VS Code, vs.)
2. `Ctrl + F` ile düzeltmek istediğin ismi ara (örn. `YIGIT GULTEKIN`)
3. Bul-değiştir yap, kaydet
4. Netlify'a yeni `index.html`'i sürükle

⚠️ Dikkat: Eğer JS dizisini bozarsan site çalışmaz. Önce yedek al.

---

## DURUM 2: Yeni kişi eklemek istiyorum (önerilen yol)

Doğru yol şu: **Önce Excel'i güncelle, sonra HTML'i sıfırdan oluştur.**

### Adım 1: Excel'i güncelle
- `aile-verisi.xlsx`'i aç
- Yeni kişiyi doğru kuşağa ve sütuna ekle (Mehmet Bey'in koyduğu mantığa uygun)
- Kaydet

### Adım 2: HTML'i yeniden oluştur

E�er Python yüklüysen (Mac/Linux için varsayılan):

```bash
cd come-ahmet-soyu-kit
pip install openpyxl
python3 build_tree.py
```

Bu, `data.js` ve `people.json` dosyalarını yeniden üretir. Sonra:

```bash
# index-template.html'in içine yeni data.js'i göm
python3 -c "
html = open('index-template.html').read()
data = open('data.js').read()
out = html.replace('<script src=\"data.js\"></script>', f'<script>\n{data}\n</script>')
open('index.html', 'w').write(out)
"
```

### Adım 3: Yeni `index.html`'i Netlify'a yükle

---

## DURUM 3: Python bilmiyorum / korkuyorum

Hiçbir sorun değil. Şu seçeneklerden biri:

1. **Excel'i güncelle, bana (veya başka bir teknisyene) gönder**, ben yeniden üreteyim
2. **Bir akrabandan teknisyen bul** — Python bilen biri 5 dakikada yapabilir
3. **AI asistanına ver** — herhangi bir AI sohbet botuna bu klasörü ve ne yapmak istediğini ver,
   adım adım yardım eder

---

## Yedekleme Önerisi

Bu klasörü 3 ayrı yere kaydet:
- ✅ Bilgisayarın
- ✅ Google Drive / iCloud
- ✅ Bir aile üyesi (örn. Mehmet Bey'de bir kopya olsun)

Excel dosyasının özellikle güvende olması önemli — ailenin tüm tarihi içinde.

---

