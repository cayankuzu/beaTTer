# beaTTer

beaTTer, tarayıcıda web kamerasıyla oynanan bir taş-kâğıt-makas rakibidir. Yapay zekâ, geçmiş hamlelerinden
öğrendiği davranış modelini ve elin havadayken parmaklarının açılmaya başlamasını birleştirerek hamlesini
**el inmeden önce** seçer, bu seçimi SHA-256 ile mühürleyip ekranda yayımlar ve tur bitince mührü açarak
hamlesini sonradan değiştirmediğini kanıtlar. Proje aynı zamanda bir tez çalışmasıdır: önceki sürümün
"yenilmezlik" iddiası denetlenmiş, sistem ölçülebilir ve sınanabilir dürüstlük kurallarıyla yeniden
yazılmış, yeniden yazılan sürüm de bağımsız bir incelemeden geçirilmiştir.

## Durum

| | |
|---|---|
| Doğrulandı | 113 otomatik test (`npm test`, dokuz dosya) geçiyor: taahhüt protokolü, hakem kuralları, kinematik, dizi modeli, uçtan uca turlar, uygulama yaşam döngüsü, gizli kamera görüntüsünün geometrisi ve bağımsız incelemenin yeniden üretilebilen bulguları için regresyon testleri. |
| Yapıldı | v4'ün bağımsız kod incelemesi: 45 bulgu (ikisi kritik); her biri giderildi ya da açık bir sınır olarak belgelendi (`docs/tez/05a-onceki-surum-denetimi.md`, Bölüm 5.1.6). |
| Doğrulandı | Sekiz yinelenebilir **simülasyon** deneyi (`docs/results`). Sentetik oyunculara karşı, belirtilen varsayımlar altında. Yedisi dedektörün varsayımlarıyla eşleşmiş bir sentetik el kullanır; sekizincisi (E8) bu eşleşmeyi bilerek bozar. |
| Denendi | **Gerçek kamera ve elle ilk deneme başarısız oldu** (proje sahibi; 11 Kasım 2026; yayımlanan site; Windows masaüstünde Chrome/Edge): hızlı hareketlerde el algılanmadı, el iskeleti hiç görünmedi, hareket çok gecikmeliydi, bulanıklık elin önüne geldi (gözlem; ölçülmedi). O sürümün kamera yolu daha önce yalnızca **sentetik bir video akışıyla** (`canvas.captureStream()`), yerelde ve yayımlanan sitede denenmişti: kamera → el izleyici → motor → arayüz zinciri çalışıyordu, İçerik Güvenlik İlkesi ihlali yoktu (duman testi). En olası nedenlere göre kod değiştirildi: el izleyici artık önce GPU'da çalışıyor (aynı bilgisayarda kare başına medyan 16,4 ms; eski düzende CPU'daki el izleyici ile yüz dedektörü birlikte yaklaşık 57 ms), yüz dedektörü kaldırıldı; görüntünün tamamı bulanık, yalnızca izlenen el net (`docs/tez/05a-onceki-surum-denetimi.md`, Bölüm 5.1.7). Değişiklik yayından önce üç bağımsız inceleyiciye okutuldu; doğrulanan bulgular altı kusurda birleşti ve altısı da giderildi (aralarında, kamera açılırken yükleme kapısının arkasından soluk görünen bulanıklaştırılmamış video). Değişikliğin ilk hâli yalnızca yerelde, sentetik akışla açıldı (kamera açık, el izleyici GPU'da hazır, hata yok); kare başına işleyiş bu denemede sınanamadı. |
| Doğrulandı | Turnuva'nın "geçerli turda kaybetmez" güvencesi kural gereğidir ve ispatının her adımı kodda zorlanır; inceleme sonrasında bulunan üç delik ve bir sayısal sınır durumu kapatılıp teste bağlandı. Metronom kipini de kapsayan 15 000 oturumluk saldırı bulanık sınamasında 14 579 geçerli turda kayıp yok (simülasyon; `docs/results/fuzz-guarantee.json`). |
| Doğrulanmadı | Gerçek insan verisi yok. Düzeltmeden sonra gerçek kamera ve elle yeniden deneme henüz yapılmadı (proje sahibinin denemesi bekleniyor); ilk denemedeki "iskelet hiç görünmedi" belirtisi, gerçek kamera ve el olmadan yeniden üretilemedi. Gerçek kamerada hiçbir ölçüm yapılmadı (işlenen kare hızı, izleyici gürültüsü, hareket bulanıklığı, kare kaybı, gecikme). `supabase_schema.sql` hiçbir veritabanında çalıştırılmadı. Arayüz kullanıcılarla sınanmadı. |

Simülasyondan iki dürüst özet (Turnuva hakem ayarı; ayrıntı için `docs/tez/06-deneyler.md`):

- **Koşullu (geçerli turlar):** geçerli turlarda yapay zekânın kaybı yoktur — deneylerin Turnuva
  hücrelerinde toplam 58 452 geçerli turda sıfır. Bu, tahminin iyi olduğunu göstermez: kuralın sonucudur
  (aşağıda). Bu deneyler oyuncunun kendi ritmiyle oynadığı kiplerdendir; metronom kipi güvence bulanık
  sınamasında denenmiştir.
- **Koşulsuz (bütün denemeler; 30 kare/s):** dedektörle eşleşmiş sentetik oyuncuda yapay zekâ, parmaklarını
  olağan zamanda açan oyuncunun denemelerinin %94,50'sini (%95 güven aralığı 93,06–95,65) kazanır, %5,25'i
  (4,12–6,66) faul sayılıp tekrarlanır; parmaklarını geç açan oyuncuda sonuçsuz kalan pay %35,25'tir
  (32,60–38,00). Sentetik el dedektörün varsayımlarından bilerek saptırıldığında dürüst bir oyuncunun
  sonuçsuz denemeleri %1,7 ile %23,4 arasında değişir.

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
sayılması için yumruğun inişten sonra 250 ms kapalı kalması gerekir. Hakem yalnızca inişten önceki parmak
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
├── tests/                     # node:test ile 113 test, dokuz dosya
│   ├── foundation, kinematics_stroke, opening_decision, sequence, round_engine, controller
│   ├── engine_regressions.test.js      # incelemenin çekirdekteki bulguları için regresyon testleri
│   ├── controller_lifecycle.test.js    # incelemenin uygulama katmanındaki bulguları için regresyon testleri
│   ├── camera_privacy.test.js          # gizli görüntünün geometrisi, yedek bulanıklık ve kamera kaynağı
│   └── helpers/                        # elle kurulan kare dizileri
├── experiments/
│   ├── run_all.mjs            # yinelenebilir simülasyon deneyleri (E1–E8)
│   └── fuzz_guarantee.mjs     # Turnuva güvencesinin saldırı bulanık sınaması
├── docs/
│   ├── tez/                   # tez metni
│   ├── results/               # deneylerin ham sayıları (JSON)
│   └── figures/               # şekiller (SVG)
├── legacy/desktop-prototype/  # ilk OpenCV/Arduino masaüstü prototipi (bakımı yapılmıyor)
├── serve_web.py               # yerel / yerel ağ sunucusu (üretimle aynı güvenlik başlıkları)
├── supabase_schema.sql        # isteğe bağlı bulut: kilitli tablolar ve tek doğrulayan işlev
├── vercel.json                # dağıtım yapılandırması ve güvenlik başlıkları
└── .vercelignore              # yalnızca web/ yüklenir (web/lab/ hariç); geri kalan her şey dışarıda kalır
```

## Testler ve deneyler

Gereksinim: Node.js 20 ya da üzeri; dış paket gerekmez.

```bash
npm test                               # 113 test
npm run fuzz                           # Turnuva güvencesinin saldırı bulanık sınaması (2500 oturum)
node experiments/run_all.mjs           # bütün deneyler (E1–E8); docs/results ve docs/figures yeniden üretilir
node experiments/run_all.mjs --quick   # hızlı deneme (tezdeki sayıları vermez)
```

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
[önceki sürümün denetimi ve v4'ün incelemesi](docs/tez/05a-onceki-surum-denetimi.md) ·
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
  Gösterilen görüntü el izleyicinin işlediği karedir; net bölge bu yüzden hızlı harekette de elin
  üstündedir. Sınırlar: net bölge elin çevresinde yaklaşık bir parmak genişliğinde pay bırakır, bu yüzden
  yüzün önünde tutulan el yüzün hemen yanını açar; izleme kaybedildiğinde el de, yeniden bulunana kadar,
  bulanıktır; görüntü canlı kameranın bir izleyici çıkarımı kadar geriden gelir. Gizlilik ayarlardan, üst
  çubuktaki düğmeyle ya da P tuşuyla kapatılır.
- Tarayıcının yerel deposunda yalnızca hamle geçmişi, zamanlama istatistikleri ve ayarlar tutulur;
  "Laboratuvar → Veri ve gizlilik" bölümünden dışa aktarılabilir ya da silinebilir. Demo verisi saklanmaz.
- **Anonim istatistik eşitleme varsayılan olarak kapalıdır.** Açılırsa yalnızca gerçek oyuncunun geçerli
  turlarının hamleleri, sonucu ve ölçülen zamanlamaları rastgele bir kimlikle gönderilir; ölçülemeyen
  değerler boş gönderilir. Demo turları ve geliştirme barındırıcıları (`localhost`, yerel ağ adresleri)
  hiçbir zaman gönderim yapmaz (`?cloud=1` ile açıkça istenmedikçe).
- **Üçüncü taraf istekleri:** el izleme kitaplığı
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/` dizininden (`vision_bundle.mjs` ve `wasm/`
  dosyaları), yazı tipleri Google Fonts'tan (`fonts.googleapis.com`, `fonts.gstatic.com`) yüklenir; her ikisi
  de IP adresinizi ilgili sağlayıcıya gösterir. İçerik Güvenlik İlkesi betikleri bu tek paket dizinine,
  bağlantıları buna ve tek bir Supabase projesine daraltır. Model dosyaları sitenin kendisinden sunulur.
- **Bulut eşitlemeyi kullanacaksanız `supabase_schema.sql` dosyasının tamamını** Supabase SQL düzenleyicisine
  yapıştırıp çalıştırın. Dosya tabloları kilitler (herkese açık anahtar hiçbir tabloyu okuyamaz, yazamaz,
  silemez) ve anahtara tek bir yetki verir: her alanı doğrulayan `beatter_push_round` işlevini çağırmak.
  Dosya uygulanana kadar isteğe bağlı eşitleme güvenli yönde başarısız olur (durum "çevrimdışı"); oyunun
  geri kalanı etkilenmez. Veritabanında önceki sürümlerin izin verici ilkeleri duruyorsa, onları kaldıran da
  bu dosyadır. Not: bu SQL bu çalışmada bir veritabanında çalıştırılarak sınanmamıştır.

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
işleyiş bu denemede sınanamamıştır (denemenin yapıldığı tarayıcı görünür değildi). Gerçek kamera ve elle
yeniden deneme beklemektedir.

Yayın adresi: <https://beatter.vercel.app> · Kaynak kod: <https://github.com/cayankuzu/beaTTer>

## Lisans ve yazar

Geliştirici: **Çayan Kuzu** · Portfolyo: <https://fikkis.vercel.app>
Lisans: MIT
