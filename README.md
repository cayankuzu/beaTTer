# beaTTer

beaTTer, tarayıcıda web kamerasıyla oynanan bir taş-kâğıt-makas rakibidir. Yapay zekâ, geçmiş hamlelerinden
öğrendiği davranış modelini ve elin havadayken parmaklarının açılmaya başlamasını birleştirerek hamlesini
**el inmeden önce** seçer, bu seçimi SHA-256 ile mühürleyip ekranda yayımlar ve tur bitince mührü açarak
hamlesini sonradan değiştirmediğini kanıtlar. Proje aynı zamanda bir tez çalışmasıdır: önceki sürümün
"yenilmezlik" iddiası denetlenmiş, sistem ölçülebilir ve sınanabilir dürüstlük kurallarıyla yeniden
yazılmış, yeniden yazılan sürüm de bağımsız bir incelemeden geçirilmiştir; sonraki v4.2 sürümleri aynı
yöntemle denetlenmiş ve bulunan kusurlar v4.2.3'te giderilmiştir. Bu belge v4.2.3'ü anlatır.

## Durum

| | |
|---|---|
| Doğrulandı | 126 otomatik test (`npm test`, dokuz dosya) geçiyor: taahhüt protokolü, hakem kuralları, kinematik, dizi modeli, uçtan uca turlar, uygulama yaşam döngüsü, gizli kamera görüntüsünün geometrisi, bağımsız incelemenin ve v4.2 denetiminin yeniden üretilebilen bulguları için regresyon testleri. |
| Yapıldı | v4'ün bağımsız kod incelemesi: 45 bulgu (ikisi kritik); her biri giderildi ya da açık bir sınır olarak belgelendi (`docs/tez/05a-onceki-surum-denetimi.md`, Bölüm 5.1.6). |
| Yapıldı | v4.2'nin denetimi (v4.2.0–v4.2.2 bu çalışmanın dışında yayımlandı): v4.2.1'in hakeme eklediği kurallar Turnuva güvencesini kırmıştı; varsayılan bir parmak bağlantısı payının çıkarılması, yüzük ve serçesi geride kalan dürüst Kâğıt'ı faule çeviriyordu; tanıtım ekranında "Kamerayı aç" paylaşımı da açıyordu ve bütün oyuncuların tanılama kayıtlarını listeleyen işlev herkese açık anahtara verilmişti; 20 varsayılanın değişmesi ve bir yenisinin eklenmesi belgelenmemişti. Düzeltmeler v4.2.3'tür; kusurlar için on iki regresyon testi eklendi. Düzeltmelerin ilk hâli de yayından önce incelendi ve bulunan yirmi kusur giderildi: bulanık son kareli dürüst Kâğıt artık faul sayılmıyor, çelişen kareler kendi koduyla geçersiz, oyuncu modeli buluta gönderilmiyor ve geri okunmuyor, önceki sürümlerden kalan paylaşım rızası geçersiz sayılıyor. Açık bir nokta kalmıştır: v4.2.0'ın eklediği yumuşak iniş yollarından biri, çok hafif bir atış vuruşunda inişi simülasyonda turların yaklaşık onda birinde gerçek inişten 100 ms ya da daha sonraya tarihler ve aradaki mühürler inişten önce sayılır. Düzeltmeler gerçek kamerayla doğrulanmadı (`docs/tez/05a-onceki-surum-denetimi.md`, Bölüm 5.1.8). |
| Doğrulandı | Sekiz yinelenebilir **simülasyon** deneyi (`docs/results`; v4.2.3 koduyla yeniden koşuldu). Sentetik oyunculara karşı, belirtilen varsayımlar altında. Yedisi dedektörün varsayımlarıyla eşleşmiş bir sentetik el kullanır; sekizincisi (E8) bu eşleşmeyi bilerek bozar. |
| Denendi | **Gerçek kamera ve elle ilk deneme başarısız oldu** (proje sahibi; 11 Kasım 2026; yayımlanan site; Windows masaüstünde Chrome/Edge): hızlı hareketlerde el algılanmadı, el iskeleti hiç görünmedi, hareket çok gecikmeliydi, bulanıklık elin önüne geldi (gözlem; ölçülmedi). O sürümün kamera yolu daha önce yalnızca **sentetik bir video akışıyla** (`canvas.captureStream()`), yerelde ve yayımlanan sitede denenmişti: kamera → el izleyici → motor → arayüz zinciri çalışıyordu, İçerik Güvenlik İlkesi ihlali yoktu (duman testi). En olası nedenlere göre kod değiştirildi: el izleyici artık önce GPU'da çalışıyor (aynı bilgisayarda kare başına medyan 16,4 ms; eski düzende CPU'daki el izleyici ile yüz dedektörü birlikte yaklaşık 57 ms), yüz dedektörü kaldırıldı; görüntünün tamamı bulanık, yalnızca izlenen el net (`docs/tez/05a-onceki-surum-denetimi.md`, Bölüm 5.1.7). Değişiklik yayından önce üç bağımsız inceleyiciye okutuldu; doğrulanan bulgular altı kusurda birleşti ve altısı da giderildi (aralarında, kamera açılırken yükleme kapısının arkasından soluk görünen bulanıklaştırılmamış video). Değişikliğin ilk hâli yalnızca yerelde, sentetik akışla açıldı (kamera açık, el izleyici GPU'da hazır, hata yok); kare başına işleyiş bu denemede sınanamadı. Ardından proje sahibi 12 Kasım 2026'da yerel geliştirme sunucusunda, Turnuva ön ayarında gerçek kamerayla oynadı (tek oyuncu, 79 kayıt; kayıtlar sürüm bilgisi taşımaz): 33'ü iptal (18'i el kaybı), hüküm verilen 46 turun 26'sı geçerli ve hepsini YZ kazandı, 11'i faul, 9'u geçersiz; uçuşta işlenen kare hızının medyanı 17 kare/s (10.–90. yüzdelik 9,9–20,3). v4.2'nin gerekçesi bu oturumlardır (Bölüm 5.1.8). |
| Doğrulandı | Turnuva'nın "geçerli turda kaybetmez" güvencesi kural gereğidir ve ispatının her adımı kodda zorlanır; inceleme sonrasında bulunan üç delik ve bir sayısal sınır durumu kapatılıp teste bağlandı. v4.2.1'de hakeme eklenen kurallar güvenceyi kırmıştı (YZ, hakemin kabul edebileceği bir atışı yasal saymadan karar verebiliyordu); v4.2.3'te YZ, hakemin okuyacağı yönelimlere göre karar verir. Metronom kipini de kapsayan 15 000 oturumluk saldırı bulanık sınamasında v4.2.3 koduyla 17 404 geçerli turda kayıp yok; aynı oturumlarda v4.2.2 16 911 geçerli turda 7 tur kaybediyordu (simülasyon; `docs/results/fuzz-guarantee.json`). |
| Doğrulanmadı | Tezin Ek C'sindeki insan denekli çalışma yapılmadı; gerçek veri yalnızca yukarıdaki tek oyuncunun 79 yerel kaydıdır. İlk denemedeki "iskelet hiç görünmedi" belirtisi, gerçek kamera ve el olmadan yeniden üretilemedi. Gerçek kamerada izleyici gürültüsü, hareket bulanıklığı, iniş saptama doğruluğu ve gösterim gecikmesi ölçülmedi; v4.2.3'ün düzeltmeleri yalnızca simülasyonla sınandı. `supabase_schema.sql`'in son hâli bu çalışmada hiçbir veritabanında çalıştırılmadı; uygulanması veritabanı sahibine kalmıştır. Arayüz kullanıcılarla sınanmadı. |

Simülasyondan iki dürüst özet (Turnuva hakem ayarı; ayrıntı için `docs/tez/06-deneyler.md`):

- **Koşullu (geçerli turlar):** geçerli turlarda yapay zekânın kaybı yoktur — deneylerin Turnuva
  hücrelerinde (E3, E4, E5, E7, E8) toplam 59 684 geçerli turda sıfır. Bu, tahminin iyi olduğunu
  göstermez: kuralın sonucudur (aşağıda). Bu deneyler oyuncunun kendi ritmiyle oynadığı kiplerdendir;
  metronom kipi güvence bulanık sınamasında denenmiştir.
- **Koşulsuz (bütün denemeler; 30 kare/s):** dedektörle eşleşmiş sentetik oyuncuda yapay zekâ, parmaklarını
  olağan zamanda açan oyuncunun denemelerinin %94,75'ini (%95 güven aralığı 93,34–95,88) kazanır, %5,00'ı
  (3,90–6,38) faul sayılıp tekrarlanır; parmaklarını geç açan oyuncuda sonuçsuz kalan pay %35,50'dir
  (32,84–38,25). Sentetik el dedektörün varsayımlarından bilerek saptırıldığında dürüst bir oyuncunun
  sonuçsuz denemeleri %1,9 ile %20,2 arasında değişir.

Bu sayılar gerçek oyunculara ait değildir.

## Hızlı başlangıç

```bash
python serve_web.py
```

Ardından tarayıcıda `http://localhost:8000` adresini açın ve "Kamerayı aç" düğmesine basın. Kamera görüntüsü
cihazınızdan çıkmaz.

- **Kamerasız demo:** `http://localhost:8000/?demo=1` — sentetik bir el aynı motorla oynar; ekranda
  "SİMÜLASYON" olarak etiketlenir, verisi saklanmaz. (`&seed=N` ile yinelenebilir, `&speed=K` ile
  hızlandırılmış.) **Demonun açılışı elle seçilmiştir:** varsayılan tohum, ilk on turu geçerli ve ilk beş
  turunda üç hamle de görünen tohumlar arasından alınmıştır. Yalnızca açılış seçilmiştir; demo uzadıkça faul
  ve kazanma oranları simülatörünkilere yaklaşır (`docs/tez/06-deneyler.md`).
- **Telefon ya da tablet:** sunucu aynı ağdaki cihazlar için `https://<yerel-IP>:8443` adresini de açar
  (kamera güvenli bağlantı gerektirir; kendinden imzalı sertifika uyarısı çıkar).

## Bir tur nasıl işler?

1. Yumruğunu kameraya göster ve ritimle salla: "taş – kâğıt – makas". Yapay zekâ bu sırada yalnızca geçmiş
   hamlelerine bakarak ilk kararını verir ve mühürler; özetin ilk sekiz hanesi ekranda görünür.
2. Dördüncü vuruşta ("vur!") hamleni **el havadayken** aç. Yapay zekâ parmaklarının açılmaya başlamasını
   izler; kanıt değişirse mührünü yeniler. Her yenileme yeni bir mühürdür ve hiçbiri silinmez.
3. Elin indiği andan itibaren yapay zekâ mühür atamaz. İnen şekil senin hamlendir; mühürler açılır ve
   doğrulanır. Tur iptal edilirse (el kadrajdan çıktı, Esc) o ana kadar atılan mühürler yine açılır ve
   doğrulanır.
4. Tur raporu kararın inişten kaç milisaniye önce yakalanmış bilgiye dayandığını, o anda hamlenin ne
   kadarının oluşmuş olduğunu, bütün mühürleri ve "kendin doğrula" aracını gösterir. Kamera turlarında
   ayrıca özetin fiilen hesaplandığı anla (duvar saati) iniş arasındaki süre de ölçülüp gösterilir.

**Geç hamle kuralı.** Şekil el inmeden önce havada oluşmalıdır. El indikten sonra açılan ya da kapanan
parmaklar geç hamledir: tur faul sayılır, skora işlenmez ve tekrar oynanır. İnişte yumruk olan elin Taş
sayılması için yumruğun inişten sonra 215 ms kapalı kalması gerekir. Hakem yalnızca inişten önceki parmak
hareketine ve inen şekle bakar; yapay zekânın neyi mühürlediğine bakmaz. Elin inişten hemen önce
izlenemediği turlar (kare kaybı) faul değil, geçersizdir ve tekrarlanır.

Ritim serbest (sen sallarsın) ya da metronomlu olabilir; hazırlık vuruşu sayısı 3, 2 ya da 0'dır (tek atış).
İkinci bir kip olan MindTwin skor tutmaz: parmak açıklığının 120 ms sonrasını öngörür ve bu öngörünün
ölçülen başarısını gösterir.

## Hakem ayarları

| Ayar | Ön parmak eşiği | Arka parmak eşiği | Anlamı |
|---|---|---|---|
| Turnuva (varsayılan) | 0,50 | 0,15 | Ön parmaklar inişten önce ya "ölçülebilir biçimde açılmıştır" ya da "açılmamıştır"; belirsiz bölge yoktur. Bu ayarda yapay zekâ geçerli bir turu **kural gereği** kaybetmez: hakemin kabul edebileceği hamleler en çok iki sınıfa iner ve yapay zekâ, kendi tahmini ne olursa olsun, o ikisine de kaybetmeyen hamleyi oynar. Bu bir tahmin başarısı değildir; bedeli faul ve geçersiz turlardır (geç açanlarda ve kamera eli iyi okuyamadığında artar). |
| Standart | 0,15 | 0,10 | Belirsiz bir bölge bırakır; insan meşru biçimde kazanabilir. |
| Serbest | 0,03 | 0,03 | En geniş belirsiz bölge. |

Eşik, hakemin "parmak grubu şu ana kadar ölçülebilir biçimde açıldı" olasılığı üzerindedir; tanımı,
kaybetmeme teoremi (Teorem 1), ispatı ve neyi iddia etmediği `docs/tez/04-yontem.md` Bölüm 4.4 ve 4.7'dedir.
Laboratuvar panelindeki "kaybetmeme" oranı bu yüzden yalnızca geçerli turları sayar; sistemin gerçek
başarımı aynı karttaki "tüm denemelerde kazanma" ve "sonuçsuz deneme" satırlarıdır.

## Proje düzeni

```
beaTTer/
├── web/                       # Yayımlanan uygulama (derleme adımı yok, ES modülleri)
│   ├── index.html
│   ├── css/                   # tasarım belirteçleri ve biçemler
│   ├── models/                # el izleme modeli
│   ├── lab/                   # yerel ölçüm sayfaları (el izleyici, gizlilik çizeri); yayımlanmaz
│   └── js/
│       ├── core/              # saf bilim çekirdeği: kinematik, ritim, açılma dedektörü, karar,
│       │   └── sequence/      #   taahhüt kaydı, tur motoru ve hakem; davranış dizi modeli
│       ├── sim/               # sentetik el ve davranış oyuncuları (testler, deneyler, demo)
│       ├── platform/          # kamera, el izleyici, gizlilik çizeri, ses, yerel depo, isteğe bağlı bulut
│       ├── app/               # denetleyici, kare kaynakları, durum deposu
│       └── ui/                # görünümler ve bütün Türkçe metinler
├── tests/                     # node:test ile 126 test, dokuz dosya
│   ├── foundation, kinematics_stroke, opening_decision, sequence, round_engine, controller
│   ├── engine_regressions.test.js      # incelemenin ve v4.2 denetiminin çekirdekteki bulguları için regresyon testleri
│   ├── controller_lifecycle.test.js    # incelemenin ve v4.2 denetiminin uygulama katmanındaki bulguları için regresyon testleri
│   ├── camera_privacy.test.js          # gizli görüntünün geometrisi, yedek bulanıklık ve kamera kaynağı
│   └── helpers/                        # elle kurulan kare dizileri
├── experiments/
│   ├── run_all.mjs            # yinelenebilir simülasyon deneyleri (E1–E8)
│   ├── fuzz_guarantee.mjs     # Turnuva güvencesinin saldırı bulanık sınaması
│   └── version_compare.mjs    # aynı tohumlarla sürüm karşılaştırması (Bölüm 5.1.8)
├── scripts/analyze_telemetry.mjs  # gerçek kamera kayıtlarının çözümlemesi (`npm run analyze`)
├── docs/
│   ├── tez/                   # tez metni
│   ├── results/               # deneylerin ham sayıları (JSON)
│   └── figures/               # şekiller (SVG)
├── legacy/desktop-prototype/  # ilk OpenCV/Arduino masaüstü prototipi (bakımı yapılmıyor)
├── serve_web.py               # yerel / yerel ağ sunucusu (üretimle aynı güvenlik başlıkları)
├── supabase_schema.sql        # isteğe bağlı bulut: kilitli tablolar; herkese açık anahtara yalnızca iki yazma işlevi (Gizlilik bölümü)
├── vercel.json                # dağıtım yapılandırması ve güvenlik başlıkları
└── .vercelignore              # yalnızca web/ yüklenir (web/lab/ hariç); geri kalan her şey dışarıda kalır
```

## Testler ve deneyler

Gereksinim: Node.js 20 ya da üzeri; dış paket gerekmez.

```bash
npm test                               # 126 test
npm run fuzz                           # Turnuva güvencesinin saldırı bulanık sınaması (2500 oturum)
node experiments/run_all.mjs           # bütün deneyler (E1–E8); docs/results ve docs/figures yeniden üretilir
node experiments/run_all.mjs --quick   # hızlı deneme (tezdeki sayıları vermez)
node experiments/version_compare.mjs [dizin]   # aynı simülasyon turları başka bir sürümün kodunda (Bölüm 5.1.8)
npm run analyze                        # .local_telemetry/ kayıtlarının çözümlemesi; uzak tanılama kayıtları
                                       # yalnızca SUPABASE_SERVICE_ROLE_KEY ortam değişkeniyle okunur
```

`version_compare.mjs` dizin verilmezse çalışma ağacının kodunu kullanır; eski bir sürüm önce
`git archive <işleme> web tests | tar -x -C <dizin>` ile çıkarılır (betiğin başında yazılıdır).

Deneyler tohumlu üreteç kullanır. Ürettikleri her sayı sentetik oyunculara aittir ve dosyalarda
`"simulated": true` olarak işaretlidir.

Tarayıcıdaki iki ölçüm (el izleyicinin kare başına süresi ve gizlilik çizerinin denetimi) yerel sayfalarla
yinelenir; bu sayfalar yayımlanmaz (`.vercelignore`). `npm run serve` ile yerel sunucuyu açın, ardından:

- `http://localhost:8000/lab/tracker_bench.html` — el izleyici, önce GPU, sonra CPU (sekme görünür olmalıdır);
- `http://localhost:8000/lab/focus_check.html` — gizlilik çizeri: el net mi, geri kalanı bulanık mı; çizim
  süresi.

## Tez

Tam metin [`docs/tez/`](docs/tez/README.md) klasöründedir:
[özet](docs/tez/00-ozet.md) ·
[giriş](docs/tez/01-giris.md) ·
[ilgili çalışmalar](docs/tez/02-literatur.md) ·
[problem tanımı](docs/tez/03-problem-tanimi.md) ·
[yöntem](docs/tez/04-yontem.md) ·
[önceki sürümün denetimi, v4'ün incelemesi ve v4.2'nin denetimi](docs/tez/05a-onceki-surum-denetimi.md) ·
[mimari](docs/tez/05-mimari.md) ·
[deneyler](docs/tez/06-deneyler.md) ·
[arayüz](docs/tez/07-arayuz.md) ·
[tartışma](docs/tez/08-tartisma.md) ·
[sonuç](docs/tez/09-sonuc.md) ·
[kaynakça](docs/tez/kaynakca.md) ·
[ekler](docs/tez/ekler.md)

## Gizlilik

- Kamera kareleri ve el noktaları yalnızca tarayıcıda işlenir; saklanmaz ve gönderilmez.
- Gizlilik varsayılan olarak açıktır: kamera görüntüsünün tamamı bulanıklaştırılır, yalnızca izlenen el net
  kalır; el görülmediğinde her şey bulanıktır. Bunun için yüzün bulunması gerekmez. (Önceki sürümler yüzü
  bir yüz dedektörüyle bulup bulanıklaştırıyordu; ilk gerçek kamera denemesinde bulanıklık elin önüne geldi
  ve bu düzen kaldırıldı.) Kamera sahnesindeki rozet gerçekte olanı söyler: "Yalnızca el net" (gizlilik
  açık), "Gizlilik kapalı" ya da "Gizlilik çizilemedi · görüntü kapatıldı" (gizli görüntü çizilemedi;
  görüntü gösterilmez). Gizlilik açık olduğu her an — kamera açılırken ve el izleyici yüklenirken de — video
  öğesinin kendisi de CSS ile bulanıklaştırılır: ilk çizimden önce ya da çizim durursa görünen budur.
  Gösterilen görüntü el izleyicinin işlediği karedir; net bölge bu yüzden, el izlendiği sürece, hızlı
  harekette de elin üstündedir. Sınırlar: net bölge elin çevresinde yaklaşık bir parmak genişliğinde pay
  bırakır, bu yüzden yüzün önünde tutulan el yüzün hemen yanını açar; izleme koptuğunda son net bölge ve
  iskelet en çok 160 ms eski yerlerinde kalır (v4.2.0'dan beri; bulanık bir iki karede titremesinler diye),
  sonra el de, yeniden bulunana kadar, bulanıktır; görüntü canlı kameranın bir izleyici çıkarımı kadar
  geriden gelir. Gizlilik ayarlardan, üst çubuktaki düğmeyle ya da P tuşuyla kapatılır.
- Tarayıcının yerel deposunda yalnızca hamle geçmişi, öğrenilen oyuncu modeli (zamanlama istatistikleri, el
  kalibrasyonu) ve ayarlar tutulur; "Laboratuvar → Veri ve gizlilik" bölümünden dışa aktarılabilir ya da
  silinebilir. Demo verisi saklanmaz. Geliştirme sunucusunda, sayfa sunucunun çalıştığı makinede (`localhost`) açıldığında ayrıca
  her gerçek kamera turunun sonuç kaydı (parmak açılma ve hakem izleri dahil, el noktaları hariç), her iptal
  ve oturumun dışa aktarımı yerel sunucuya gönderilir; `serve_web.py` bunları `.local_telemetry/` dizinine
  yazar (eşitleme anahtarından bağımsız; dizin depoya ve Vercel yüklemesine girmez). Yerel ağdaki başka bir
  cihazdan bu kayıt yalnızca adrese `?telemetry=1` eklenirse tutulur (v4.2.0–v4.2.2 her cihazdan
  kaydediyordu); `?telemetry=0` kapatır.
- **İstatistik eşitleme varsayılan olarak kapalıdır**; yalnızca oyuncu anahtarı açarsa (tanıtım ekranı ya da
  "Laboratuvar → Veri ve gizlilik") çalışır. Açılırsa rastgele bir oyuncu kimliğiyle şunlar gönderilir:
  gerçek oyuncunun hükme bağlanan her kamera turu için hamleler, sonuç, ölçülen zamanlamalar ve parmak
  açılma ölçümleri (faul ve geçersiz turlar dahil; hakem yönelimleri ve iki parmak grubunun açılma izinin
  son on değeri); geçerli turlarda ayrıca değerlendirilen mührün SHA-256 özeti, YZ'nin o mühürdeki tahmini
  ve güveni ile toplam skor. Öğrenilen oyuncu modeli gönderilmez ve sunucudan
  hiçbir şey geri okunmaz (v4.2.0–v4.2.2 modeli gönderip geri yüklüyordu). Ölçülemeyen değerler boş
  gönderilir; görüntü, yüz, el noktaları ve açılmamış mühürler hiçbir zaman gönderilmez. Demo turları ve
  geliştirme barındırıcıları (`localhost`, yerel ağ adresleri) buluta hiçbir zaman gönderim yapmaz
  (`?cloud=1` ile açıkça istenmedikçe). v4.2.0–v4.2.2'de tanıtım ekranında anahtara dokunmadan kamerayı
  açmak paylaşımı da açıyordu; v4.2.3 bunu geri almıştır.
- **Üçüncü taraf istekleri:** el izleme kitaplığı
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/` dizininden (`vision_bundle.mjs` ve `wasm/`
  dosyaları), yazı tipleri Google Fonts'tan (`fonts.googleapis.com`, `fonts.gstatic.com`) yüklenir; her ikisi
  de IP adresinizi ilgili sağlayıcıya gösterir. İçerik Güvenlik İlkesi betikleri bu tek paket dizinine,
  bağlantıları buna ve tek bir Supabase projesine daraltır. Model dosyaları sitenin kendisinden sunulur.
- **Bulut eşitlemeyi kullanacaksanız `supabase_schema.sql` dosyasının tamamını** Supabase SQL düzenleyicisine
  yapıştırıp çalıştırın. Dosya tabloları kilitler (herkese açık anahtar hiçbir tabloyu okuyamaz, yazamaz,
  silemez) ve anahtara yalnızca iki yazma işlevi bırakır (`beatter_push_round`,
  `beatter_push_diagnostic`). Bütün oyuncuların tanılama kayıtlarını listeleyen
  `beatter_pull_recent_diagnostics` ile saklanan modeli döndüren `beatter_pull_state` yalnızca gizli servis
  anahtarıyla çağrılabilir (`SUPABASE_SERVICE_ROLE_KEY=... npm run analyze`); v4.2.0 şemasında ikisi de herkese
  açık anahtara verilmişti, bu yetkileri geri alan da bu dosyadır. v4.2.0–v4.2.2'nin sakladığı oyuncu
  modellerini silen ifade dosyanın sonunda not olarak durur; çalıştırmak size kalır. Dosya uygulanana kadar isteğe bağlı eşitleme güvenli yönde başarısız
  olur (durum "çevrimdışı"); oyunun geri kalanı etkilenmez. Veritabanında önceki sürümlerin izin verici
  ilkeleri duruyorsa, onları kaldıran da bu dosyadır. Not: bu SQL'in son hâli bu çalışmada bir veritabanında
  çalıştırılarak sınanmamıştır.

## Dağıtım

Uygulama durağan dosyalardan oluşur. Vercel yapılandırması `vercel.json` içindedir: `outputDirectory` değeri
`web`'dir; İçerik Güvenlik İlkesi, İzin İlkesi (`camera=(self)`) ve önbellek başlıkları aynı dosyada
tanımlıdır. `.vercelignore` yalnızca `web/` dizininin yüklenmesini sağlar; onun içindeki yerel ölçüm
sayfaları (`web/lab/`) da yüklenmez. Model dosyaları bir yıl değişmez olarak önbelleğe alınır;
adreslerindeki `?v=4.0.0` parametresi dosya değiştiğinde artırılmalıdır. Depo Vercel'e bağlıysa ana dala
yapılan gönderimler yayına alınır; elle dağıtım için depo kökünde `vercel deploy --prod` kullanılabilir.

Site 11 Kasım 2026'da bu yolla dağıtılmış ve yayında denetlenmiştir: yanıt başlıkları (daraltılmış İçerik
Güvenlik İlkesi, İzin İlkesi, `nosniff`), bütün varlıkların yüklenmesi, önceki sürümün dosyalarının artık
sunulmaması, demonun mühürleri doğrulanmış turları hükme bağlaması (konsol hatası ve ilke ihlali olmadan) ve
sentetik bir video akışıyla kamera yolunun el izleyiciyi ve o sürümde kullanılan yüz dedektörünü üretim
ilkesi altında yüklemesi. Aynı gün proje sahibinin yayımlanan sitede gerçek bir kamera ve elle yaptığı ilk
deneme başarısız olmuştur (yukarıdaki durum tablosu). Bunun üzerine el izleyici önce GPU'da çalışacak
biçimde değiştirilmiş, yüz dedektörü kaldırılmış ve görüntüde yalnızca el net bırakılmıştır (Gizlilik
bölümü). Değişikliğin ilk hâli yerel sunucuda sentetik bir video akışıyla açılmıştır: kamera açıldı, el
izleyici GPU üzerinde hazır oldu, hata yoktu (0,7 s içinde; model tarayıcı önbelleğindeydi); kare başına
işleyiş bu denemede sınanamamıştır (denemenin yapıldığı tarayıcı görünür değildi). Proje sahibi ertesi gün
(12 Kasım 2026) yerel geliştirme sunucusunda gerçek kamerayla oynamıştır; bu oturumların kayıtları, onlara
dayanan v4.2 sürümleri ve v4.2'nin denetimi Bölüm 5.1.8'dedir (durum tablosu).

Yayın adresi: <https://beatter.vercel.app> · Kaynak kod: <https://github.com/cayankuzu/beaTTer>

## Lisans ve yazar

Geliştirici: **Çayan Kuzu** · Portfolyo: <https://fikkis.vercel.app>
Lisans: MIT
