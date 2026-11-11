# beaTTer: Hamle Tamamlanmadan Önce Karar Veren, Kriptografik Olarak Taahhüt Eden ve Çevrimiçi Öğrenen Bir Taş-Kâğıt-Makas Sistemi

**Yazar:** Çayan Kuzu
**Sürüm:** beaTTer v4 · Kasım 2026 (bağımsız inceleme sonrası)
**Belge türü:** Tez metni (GitHub üzerinde okunmak üzere Markdown; matematik `$…$` / `$$…$$` ile yazılmıştır)

---

## Durum kutusu — neyin doğrulandığı, neyin doğrulanmadığı

| | Durum |
|---|---|
| **Doğrulandı: birim ve bütünleştirme testleri** | 113 otomatik testin 113'ü geçiyor (`npm test`, dokuz dosya). Altı dürüstlük değişmezi, taahhüt protokolü, hakem kuralları, öğrenme bileşenleri, uygulama yaşam döngüsü ve gizli kamera görüntüsünün geometrisi testlerle sınanmıştır (Bölüm 5.7, Ek B). |
| **Yapıldı: v4'ün bağımsız incelemesi** | 45 bulgu (2 kritik, 8 yüksek). Her biri giderilmiş ya da açık bir sınır olarak belgelenmiş; yeniden üretilebilen kod kusurları için regresyon testleri yazılmıştır (Bölüm 5.1.6). Sistemin ikinci bir incelemesi yapılmamıştır; sonradan yapılan kamera değişikliği ise yayından önce ayrıca incelenmiştir (aşağıda, canlı kamera satırı). |
| **Doğrulandı: simülasyon** | Sekiz yinelenebilir deney (`node experiments/run_all.mjs`). Sentetik oyuncular gerçek motordan geçer. E1–E7 dedektörle **eşleşmiş** bir sentetik oyuncu kullanır; E8 bu eşleşmeyi bilerek bozar. Sonuçlar **belirtilen varsayımlar altındaki** davranışı gösterir (Bölüm 6). |
| **Doğrulandı: Turnuva güvencesi (kural gereği)** | Teorem 1'in, turun geçerli olması dışında koşulu yoktur ve ispatının her adımı kodda zorlanır. İnceleme sonrasında bulunan üç delik (tek atış kipi; metronom kipinde zaman yuvarlaması; atılamayan mühür) ve $h_F=\tfrac12$ sınır durumu kapatılmış, teste bağlanmıştır. Metronom kipini de kapsayan 15 000 oturumluk saldırı bulanık sınamasında 14 579 geçerli turda kayıp yoktur (simülasyon; Bölüm 4.7, 6.9). |
| **Doğrulanmadı: gerçek insan verisi** | Hiç toplanmamıştır. Bu metindeki hiçbir sayı gerçek oyunculara karşı ölçülmemiştir. Protokol Ek C'dedir. |
| **Doğrulanmadı: canlı kamera** | Gerçek kamera ve elle ilk deneme (proje sahibi; 11 Kasım 2026; yayımlanan site; Windows masaüstü bilgisayarda Chrome/Edge) **başarısız olmuştur**: hızlı hareketlerde el algılanmamış, el iskeleti hiç görünmemiş, hareket çok gecikmeli izlenmiş, bulanıklık elin önüne gelmiştir (gözlem; ölçülmemiştir). En olası nedenler belirlenmiş ve kod buna göre değiştirilmiştir (Bölüm 5.1.7): aynı bilgisayardaki ölçüme göre önceki düzende CPU'daki el izleyici ile yüz dedektörü kare başına yaklaşık 57 ms tutuyordu (saniyede en çok ≈ 17 işlenen kare); el izleyici artık önce GPU'da çalışır (kare başına medyan 16,4 ms; işlemci yükü %91 iken yinelenen ölçümde 33,2 ms; iki ölçümde de CPU'dakinden 2,5–2,9 kat hızlı). Düşük eşikli yüz dedektörü ve ten rengi yedeği bulanıklığı ele ya da kola kaydırabiliyordu; ikisi de kaldırılmış, görüntünün tamamı bulanıklaştırılıp yalnızca izlenen el net bırakılmıştır. Değişiklik yayından önce üç bağımsız inceleyiciye okutulmuş; doğrulanan bulgular altı kusurda birleşmiş ve altısı da giderilmiştir (aralarında, kamera açılırken yükleme kapısının arkasından soluk görünen bulanıklaştırılmamış video; Bölüm 5.1.7). İskeletin hiç görünmemesi, gerçek kamera ve el olmadan yeniden üretilememiştir. Düzeltmeden sonraki denetimler sentetiktir (testler; sentetik karelerle tarayıcı ölçümleri; değişikliğin ilk hâliyle `canvas.captureStream()` akışıyla yerelde açılış, kare başına işleyiş bu açılışta sınanamamıştır); gerçek kamera ve elle yeniden deneme **beklemektedir**. Gerçek kamerada izleyici gürültüsü, hareket bulanıklığı, kare kaybı, işlenen kare hızı, iniş saptama doğruluğu, kare → mühür gecikmesi ve gösterim gecikmesi ölçülmemiştir (Bölüm 8.2). |
| **Doğrulanmadı: veritabanı** | `supabase_schema.sql` hiçbir veritabanında çalıştırılmamıştır (Bölüm 5.8). |
| **Doğrulanmadı: arayüz** | Kullanıcılarla sınanmamıştır; erişilebilirlik denetimi yapılmamıştır (Bölüm 7). |

"Yenilmezlik" bu metinde yalnızca şu anlamda kullanılır: en sıkı hakem ayarında yapay zekâ **geçerli** turları
kural gereği kaybetmez (Teorem 1). Bu bir tahmin
başarısı değildir; bedeli, kurala uymayan ya da okunamayan
atışların faul ya da geçersiz sayılıp tekrarlanmasıdır ve sistemin ölçüsü, bütün denemeler içinde kazanılan
ve sonuçsuz kalan paylardır (Bölüm 4.7, 4.10, 8.1).

---

## İçindekiler

| Bölüm | Dosya |
|---|---|
| Özet / Abstract | [00-ozet.md](00-ozet.md) |
| 1. Giriş | [01-giris.md](01-giris.md) |
| 2. İlgili Çalışmalar | [02-literatur.md](02-literatur.md) |
| 3. Problem Tanımı ve Dürüstlük Değişmezleri | [03-problem-tanimi.md](03-problem-tanimi.md) |
| 4. Yöntem | [04-yontem.md](04-yontem.md) |
| 5.1 Önceki Sürümün Denetimi ve v4'ün Bağımsız İncelemesi | [05a-onceki-surum-denetimi.md](05a-onceki-surum-denetimi.md) |
| 5.2–5.9 Sistem Tasarımı ve Gerçekleme | [05-mimari.md](05-mimari.md) |
| 6. Deneyler ve Sonuçlar (simülasyon) | [06-deneyler.md](06-deneyler.md) |
| 7. Arayüz Tasarımı ve Gerekçesi | [07-arayuz.md](07-arayuz.md) |
| 8. Tartışma | [08-tartisma.md](08-tartisma.md) |
| 9. Sonuç ve Gelecek Çalışmalar | [09-sonuc.md](09-sonuc.md) |
| Kaynakça | [kaynakca.md](kaynakca.md) |
| Ekler: A Sabitler · B Testler · C İnsan denekli çalışma protokolü · D Sözlük | [ekler.md](ekler.md) |

Ham deney sonuçları: [`../results/`](../results/) · Şekiller: [`../figures/`](../figures/)

---

## Yeniden üretim

Gereksinim: Node.js 20 ya da üzeri. Bağımlılık kurulumu gerekmez (çekirdek ve testler dış paket kullanmaz).

```bash
# depo kökünde
npm test                          # 113 test; bu çalışmanın yazıldığı makinede yükle birlikte yaklaşık 15–40 s
npm run fuzz                      # Turnuva güvencesinin saldırı bulanık sınaması (2500 oturum)
node experiments/fuzz_guarantee.mjs 15000 --save   # tezdeki koşu; docs/results/fuzz-guarantee.json
node experiments/run_all.mjs      # bütün deneyler (E1–E8); docs/results/*.json ve docs/figures/*.svg yeniden üretilir
node experiments/run_all.mjs --quick   # dörtte bir tohumla hızlı deneme (tezdeki sayıları vermez)
```

Deneyler tohumlu üreteç kullanır; aynı kodla aynı sayılar elde edilir. Tam koşu bu çalışmanın yazıldığı
makinede 13 ile 30 dakika arasında sürmüştür (süre o andaki yüke bağlıdır). Uygulamayı çalıştırmak için:

```bash
python serve_web.py               # http://localhost:8000
```

Kamerasız, sentetik oyunculu demo: `http://localhost:8000/?demo=1` (ekranda "SİMÜLASYON" olarak etiketlenir).
Demonun varsayılan tohumunun açılışı elle seçilmiştir (ilk turlar geçerli ve çeşitlidir); `&seed=N` başka
bir diziyi oynatır ve uzun dönemdeki oranlar Bölüm 6'dakilerdir.

Bölüm 5.1.7'deki el izleyicinin GPU ve CPU ölçümleri ile çizer denetimi iki yerel sayfayla yinelenir. Sayfalar
`web/lab/` altındadır ve yayımlanmaz (`.vercelignore`); `npm run serve` (yani `python serve_web.py`) ile
sunucu açıldıktan sonra:

- `http://localhost:8000/lab/tracker_bench.html` — el izleyicinin kare başına süresi, önce GPU, sonra CPU
  (el içermeyen $640\times480$ sentetik kareler; sekme görünür olmalıdır);
- `http://localhost:8000/lab/focus_check.html` — gizlilik çizerinin keskinlik denetimi ve çizim başına
  JavaScript süresi.

Önceki sürümün yüz dedektörünü `tracker_bench.html` ancak modeli git geçmişinden geri getirilmişse ölçer
(geri getirilen dosya depoya yeniden işlenmemelidir):
`git restore --source=4def20f -- web/models/blaze_face_short_range.tflite`.

---

## Okuma kılavuzu

- Yalnızca sonuçlarla ilgilenen okur için: [Özet](00-ozet.md), [Bölüm 6.9](06-deneyler.md) ve [Bölüm 8.1](08-tartisma.md).
- "Kurala göre yenilmezlik" savının tam ifadesi, ispatı ve neyi iddia etmediği: [Bölüm 4.4 ve 4.7](04-yontem.md).
- Koşullu ve koşulsuz oranların farkı (hangi sayı neyi ölçer): [Bölüm 4.10](04-yontem.md) ve [Bölüm 6.0](06-deneyler.md).
- Simülasyonun ne kadar iyimser olduğu: [Bölüm 6.8](06-deneyler.md).
- Önceki sürümde ve v4'ün ilk hâlinde neyin yanlış olduğu: [Bölüm 5.1](05a-onceki-surum-denetimi.md).
- Atıf kuralları: metindeki `[Anahtar]` biçimindeki atıflar [Kaynakça](kaynakca.md)'dadır; yalnızca ikincil
  kaynaktan okunabilen çalışmalar orada ○ ile işaretlidir.
