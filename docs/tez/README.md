# beaTTer: Hamle Tamamlanmadan Önce Karar Veren, Kriptografik Olarak Taahhüt Eden ve Çevrimiçi Öğrenen Bir Taş-Kâğıt-Makas Sistemi

**Yazar:** Çayan Kuzu
**Sürüm:** beaTTer v4.2.3 · Kasım 2026 (bağımsız inceleme ve v4.2 denetimi sonrası)
**Belge türü:** Tez metni (GitHub üzerinde okunmak üzere Markdown; matematik `$…$` / `$$…$$` ile yazılmıştır)

---

## Durum kutusu — neyin doğrulandığı, neyin doğrulanmadığı

| | Durum |
|---|---|
| **Doğrulandı: birim ve bütünleştirme testleri** | 126 otomatik testin 126'sı geçiyor (`npm test`, dokuz dosya). Altı dürüstlük değişmezi, taahhüt protokolü, hakem kuralları, öğrenme bileşenleri, uygulama yaşam döngüsü, gizli kamera görüntüsünün geometrisi ve v4.2 denetiminin bulguları testlerle sınanmıştır (Bölüm 5.1.8, 5.7, Ek B). |
| **Yapıldı: v4'ün bağımsız incelemesi** | 45 bulgu (2 kritik, 8 yüksek). Her biri giderilmiş ya da açık bir sınır olarak belgelenmiş; yeniden üretilebilen kod kusurları için regresyon testleri yazılmıştır (Bölüm 5.1.6). Sistemin ikinci bir bağımsız incelemesi yapılmamıştır; sonradan yapılan kamera değişikliği yayından önce ayrıca incelenmiş (aşağıda, canlı kamera satırı), v4.2'nin değişiklikleri de ayrıca denetlenmiştir (sonraki satır). |
| **Yapıldı: v4.2'nin denetimi** | Bu çalışmanın dışında yayımlanan v4.2.0–v4.2.2, Bölüm 5.1.6'daki yöntemle denetlenmiştir (Bölüm 5.1.8). v4.2.1'in hakeme eklediği kurallar Turnuva güvencesini kırmıştı (15 000 oturumluk bulanık sınamada 16 911 geçerli turda 7 kayıp); varsayılan bir bağlantı payının çıkarılması dürüst Kâğıt'ı faule çeviriyordu (E3, Turnuva, olağan açanlar, 30 kare/s: açık dürüst atışlarda faul v4.0'da %0,55, v4.2.2'de %2,71); tanıtım ekranında "Kamerayı aç" paylaşımı da açıyordu ve bütün oyuncuların tanılama satırlarını döndüren işlev herkese açık anahtara verilmişti; 20 varsayılanın değişmesi ve bir yenisinin eklenmesi belgelenmemişti (Ek A). Düzeltmeler v4.2.3'tür (aynı hücrede %0,46); kusurlar için on iki regresyon testi yazılmıştır. Düzeltmelerin ilk hâli de yayından önce incelenmiş ve bulunan yirmi kusur giderilmiştir: bulanık son kareli dürüst Kâğıt artık faul sayılmaz, çelişen kareler kendi koduyla geçersizdir, oyuncu modeli buluta gönderilmez ve geri okunmaz, önceki sürümlerden kalan paylaşım rızası geçersiz sayılır. Açık bir nokta kalmıştır: v4.2.0'ın eklediği yumuşak iniş yollarından biri, çok hafif bir atış vuruşunda (20 kare/s, vuruş genliğinin %6'sı ya da %10'u) inişi turların yaklaşık onda birinde gerçek inişten 100 ms ya da daha sonraya tarihler; aradaki mühürler inişten önce sayılır. Karşılaştırmalar aynı tohumlarla yapılmış simülasyondur; gerçek kamerayla doğrulama yapılmamıştır. |
| **Doğrulandı: simülasyon** | Sekiz yinelenebilir deney (`node experiments/run_all.mjs`); hepsi v4.2.3 koduyla yeniden koşulmuştur. Sentetik oyuncular gerçek motordan geçer. E1–E7 dedektörle **eşleşmiş** bir sentetik oyuncu kullanır; E8 bu eşleşmeyi bilerek bozar. Sonuçlar **belirtilen varsayımlar altındaki** davranışı gösterir (Bölüm 6). |
| **Doğrulandı: Turnuva güvencesi (kural gereği)** | Teorem 1'in, turun geçerli olması dışında koşulu yoktur ve ispatının her adımı kodda zorlanır. İnceleme sonrasında bulunan üç delik (tek atış kipi; metronom kipinde zaman yuvarlaması; atılamayan mühür) ve $h_F=\tfrac12$ sınır durumu kapatılmış, teste bağlanmıştır. v4.2.1'in kuralları güvenceyi gerçeklemede kırmıştı; v4.2.3'te YZ her havadaki karede, hakemin o kare için okuyacağı (kareyle birlikte saklanan) yönelimlere göre karar verir (Bölüm 5.1.8). Metronom kipini de kapsayan 15 000 oturumluk saldırı bulanık sınamasında v4.2.3 koduyla 27 829 hükümde 17 404 geçerli tur vardır ve kayıp yoktur (simülasyon; Bölüm 4.7, 6.9). |
| **Doğrulanmadı: gerçek insan verisi** | Ek C'deki çalışma yapılmamıştır. Tek gerçek veri, proje sahibinin 12 Kasım 2026'da yerel geliştirme sunucusunda Turnuva ön ayarında oynadığı turların 79 yerel kaydıdır (tek oyuncu; hüküm verilen 46 turun 26'sı geçerli ve hepsini YZ kazanmıştır; Bölüm 5.1.8). Bunlar dışında bu metindeki hiçbir sayı gerçek oyunculara karşı ölçülmemiştir. Protokol Ek C'dedir. |
| **Doğrulanmadı: canlı kamera** | Gerçek kamera ve elle ilk deneme (proje sahibi; 11 Kasım 2026; yayımlanan site; Windows masaüstü bilgisayarda Chrome/Edge) **başarısız olmuştur**: hızlı hareketlerde el algılanmamış, el iskeleti hiç görünmemiş, hareket çok gecikmeli izlenmiş, bulanıklık elin önüne gelmiştir (gözlem; ölçülmemiştir). En olası nedenler belirlenmiş ve kod buna göre değiştirilmiştir (Bölüm 5.1.7): aynı bilgisayardaki ölçüme göre önceki düzende CPU'daki el izleyici ile yüz dedektörü kare başına yaklaşık 57 ms tutuyordu (saniyede en çok ≈ 17 işlenen kare); el izleyici artık önce GPU'da çalışır (kare başına medyan 16,4 ms; işlemci yükü %91 iken yinelenen ölçümde 33,2 ms; iki ölçümde de CPU'dakinden 2,5–2,9 kat hızlı). Düşük eşikli yüz dedektörü ve ten rengi yedeği bulanıklığı ele ya da kola kaydırabiliyordu; ikisi de kaldırılmış, görüntünün tamamı bulanıklaştırılıp yalnızca izlenen el net bırakılmıştır. Değişiklik yayından önce üç bağımsız inceleyiciye okutulmuş; doğrulanan bulgular altı kusurda birleşmiş ve altısı da giderilmiştir (aralarında, kamera açılırken yükleme kapısının arkasından soluk görünen bulanıklaştırılmamış video; Bölüm 5.1.7). İskeletin hiç görünmemesi, gerçek kamera ve el olmadan yeniden üretilememiştir. Düzeltmeden sonraki ilk denetimler sentetiktir (testler; sentetik karelerle tarayıcı ölçümleri; değişikliğin ilk hâliyle `canvas.captureStream()` akışıyla yerelde açılış, kare başına işleyiş bu açılışta sınanamamıştır). Ertesi gün (12 Kasım 2026) proje sahibi yerel geliştirme sunucusunda gerçek kamerayla oynamıştır (79 kayıt; kayıtlar sürüm bilgisi taşımaz; Bölüm 5.1.8): hüküm verilen turlarda uçuşta işlenen kare hızının medyanı 17 kare/s (10.–90. yüzdelik 9,9–20,3), son havadaki karenin yaşının medyanı 96 ms, geçerli turlarda karar önceliğinin medyanı 192 ms'dir; 79 kaydın 33'ü iptaldir (18'i el kaybı). Bu kayıtlar bir doğrulama değildir: tek bir oyuncuya aittir ve v4.2.3'ün düzeltmeleri gerçek kamerayla sınanmamıştır. Kayıtlarda kare → mühür gecikmesi ve uçuşta izlenen kare payı da vardır, ama bu metinde çözümlenmemiştir. Gerçek kamerada izleyici gürültüsü, hareket bulanıklığı, iniş saptama doğruluğu ve gösterim gecikmesi ölçülmemiştir (Bölüm 8.2). |
| **Doğrulanmadı: veritabanı** | `supabase_schema.sql`'in son hâli (v4.2.3) bu çalışmada hiçbir veritabanında çalıştırılmamıştır; yeniden uygulanması veritabanı sahibine kalmıştır (Bölüm 5.1.8, 5.8). Dosyanın herkese açık anahtara verdiği yetkiler yalnızca metin olarak, bir testte sınanır (Ek B). |
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
| 5.1 Önceki Sürümün Denetimi, v4'ün Bağımsız İncelemesi ve v4.2'nin Denetimi | [05a-onceki-surum-denetimi.md](05a-onceki-surum-denetimi.md) |
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
npm test                          # 126 test; bu çalışmanın yazıldığı makinede yükle birlikte yaklaşık 14–40 s
npm run fuzz                      # Turnuva güvencesinin saldırı bulanık sınaması (2500 oturum)
node experiments/fuzz_guarantee.mjs 15000 --save   # tezdeki koşu; docs/results/fuzz-guarantee.json
node experiments/fuzz_guarantee.mjs --seeds=151,3629,4391,5774,6735,7979,9438   # v4.2.1'i kıran yedi oturum (Bölüm 5.1.8)
node experiments/run_all.mjs      # bütün deneyler (E1–E8); docs/results/*.json ve docs/figures/*.svg yeniden üretilir
node experiments/run_all.mjs --quick   # dörtte bir tohumla hızlı deneme (tezdeki sayıları vermez)
node experiments/version_compare.mjs [dizin]   # aynı simülasyon turları başka bir sürümün kodunda (Bölüm 5.1.8)
npm run analyze                   # gerçek kamera kayıtlarının (.local_telemetry/) çözümlemesi; uzak tanılama
                                  # kayıtları yalnızca SUPABASE_SERVICE_ROLE_KEY ortam değişkeniyle okunur
```

`version_compare.mjs` dizin verilmezse çalışma ağacının kodunu kullanır; eski bir sürüm önce
`git archive <işleme> web tests | tar -x -C <dizin>` ile çıkarılır (Bölüm 5.1.8'deki sütunlar: v4.0 =
`79ada3b`, v4.2.0 = `355bf07`, v4.2.2 = `b9d9481`, v4.2.3 = çalışma ağacı).

Deneyler tohumlu üreteç kullanır; aynı kodla aynı sayılar elde edilir. Tam koşu bu çalışmanın yazıldığı
makinede 6 ile 30 dakika arasında sürmüştür (v4.2.3 koduyla son koşu 380,7 s; süre o andaki yüke bağlıdır).
Uygulamayı çalıştırmak için:

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
- Önceki sürümde, v4'ün ilk hâlinde ve v4.2'de neyin yanlış olduğu: [Bölüm 5.1](05a-onceki-surum-denetimi.md).
- Atıf kuralları: metindeki `[Anahtar]` biçimindeki atıflar [Kaynakça](kaynakca.md)'dadır; yalnızca ikincil
  kaynaktan okunabilen çalışmalar orada ○ ile işaretlidir.
