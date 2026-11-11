# beaTTer

beaTTer, tarayıcıda web kamerasıyla oynanan bir taş-kâğıt-makas rakibidir. Yapay zekâ, geçmiş hamlelerinden
öğrendiği davranış modelini ve elin havadayken parmaklarının açılmaya başlamasını birleştirerek hamlesini
**el inmeden önce** seçer, bu seçimi SHA-256 ile mühürleyip ekranda yayımlar ve tur bitince mührü açarak
hamlesini sonradan değiştirmediğini kanıtlar. Proje aynı zamanda bir tez çalışmasıdır: önceki sürümün
"yenilmezlik" iddiası denetlenmiş, sistem ölçülebilir ve sınanabilir dürüstlük kurallarıyla yeniden
yazılmıştır.

## Durum

| | |
|---|---|
| Doğrulandı | 67 otomatik test (`npm test`) geçiyor: taahhüt protokolü, hakem kuralları, kinematik, dizi modeli ve uçtan uca turlar. |
| Doğrulandı | Yedi yinelenebilir **simülasyon** deneyi (`docs/results`). Sentetik oyunculara karşı, belirtilen varsayımlar altında. |
| Doğrulanmadı | Gerçek insan verisi yok. Canlı kamerada doğrulama (izleyici gürültüsü, hareket bulanıklığı, gecikme) yapılmadı. Arayüz kullanıcılarla sınanmadı. |

Simülasyondan iki dürüst özet (Turnuva hakem ayarı, 30 kare/s; ayrıntı için `docs/tez/06-deneyler.md`):
geçerli turlarda yapay zekânın kaybı gözlenmedi; buna karşılık parmaklarını geç açan sentetik oyuncunun
atışlarının %35,25'i (%95 güven aralığı 32,60–38,00) faul sayılıp tekrarlandı. Bu sayılar gerçek oyunculara
ait değildir.

## Hızlı başlangıç

```bash
python serve_web.py
```

Ardından tarayıcıda `http://localhost:8000` adresini açın ve "Kamerayı aç" düğmesine basın. Kamera görüntüsü
cihazınızdan çıkmaz.

- **Kamerasız demo:** `http://localhost:8000/?demo=1` — sentetik bir el aynı motorla oynar; ekranda
  "SİMÜLASYON" olarak etiketlenir, verisi saklanmaz. (`&seed=N` ile yinelenebilir, `&speed=K` ile hızlandırılmış.)
- **Telefon ya da tablet:** sunucu aynı ağdaki cihazlar için `https://<yerel-IP>:8443` adresini de açar
  (kamera güvenli bağlantı gerektirir; kendinden imzalı sertifika uyarısı çıkar).

## Bir tur nasıl işler?

1. Yumruğunu kameraya göster ve ritimle salla: "taş – kâğıt – makas". Yapay zekâ bu sırada yalnızca geçmiş
   hamlelerine bakarak ilk kararını verir ve mühürler; özetin ilk sekiz hanesi ekranda görünür.
2. Dördüncü vuruşta ("vur!") hamleni **el havadayken** aç. Yapay zekâ parmaklarının açılmaya başlamasını
   izler; kanıt değişirse mührünü yeniler. Her yenileme yeni bir mühürdür ve hiçbiri silinmez.
3. Elin indiği andan itibaren yapay zekâ mühür atamaz. İnen şekil senin hamlendir; mühürler açılır ve
   doğrulanır.
4. Tur raporu kararın inişten kaç milisaniye önce verildiğini, o anda hamlenin ne kadarının oluşmuş
   olduğunu, bütün mühürleri ve "kendin doğrula" aracını gösterir.

**Geç hamle kuralı.** Şekil el inmeden önce havada oluşmalıdır. El indikten sonra açılan ya da kapanan
parmaklar geç hamledir: tur faul sayılır, skora işlenmez ve tekrar oynanır. İnişte yumruk olan elin Taş
sayılması için yumruğun inişten sonra 250 ms kapalı kalması gerekir. Hakem yalnızca inişten önceki parmak
hareketine ve inen şekle bakar; yapay zekânın neyi mühürlediğine bakmaz.

Ritim serbest (sen sallarsın) ya da metronomlu olabilir; hazırlık vuruşu sayısı 3, 2 ya da 0'dır (tek atış).
İkinci bir kip olan MindTwin skor tutmaz: parmak açıklığının 120 ms sonrasını öngörür ve bu öngörünün
ölçülen başarısını gösterir.

## Hakem ayarları

| Ayar | Ön parmak eşiği | Arka parmak eşiği | Anlamı |
|---|---|---|---|
| Turnuva (varsayılan) | 0,50 | 0,15 | Ön parmaklar inişten önce ya "ölçülebilir biçimde açılmıştır" ya da "açılmamıştır"; belirsiz bölge yoktur. Bu ayarda, tezde yazılı koşullar altında, yapay zekâ geçerli turları kaybetmez; bedeli geç açanlarda artan faul oranıdır. |
| Standart | 0,15 | 0,10 | Belirsiz bir bölge bırakır; insan meşru biçimde kazanabilir. |
| Serbest | 0,03 | 0,03 | En geniş belirsiz bölge. |

Eşik, hakemin "parmak grubu şu ana kadar ölçülebilir biçimde açıldı" olasılığı üzerindedir; tanımı ve
kaybetmeme teoremi `docs/tez/04-yontem.md` Bölüm 4.4 ve 4.7'dedir.

## Proje düzeni

```
beaTTer/
├── web/                       # Yayımlanan uygulama (derleme adımı yok, ES modülleri)
│   ├── index.html
│   ├── css/                   # tasarım belirteçleri ve biçemler
│   ├── models/                # el izleme ve yüz saptama modelleri
│   └── js/
│       ├── core/              # saf bilim çekirdeği: kinematik, ritim, açılma dedektörü, karar,
│       │   └── sequence/      #   taahhüt kaydı, tur motoru ve hakem; davranış dizi modeli
│       ├── sim/               # sentetik el ve davranış oyuncuları (testler, deneyler, demo)
│       ├── platform/          # kamera, el izleyici, ses, yerel depo, isteğe bağlı bulut
│       ├── app/               # denetleyici, kare kaynakları, durum deposu
│       └── ui/                # görünümler ve bütün Türkçe metinler
├── tests/                     # node:test ile 67 test
├── experiments/run_all.mjs    # yinelenebilir simülasyon deneyleri
├── docs/
│   ├── tez/                   # tez metni
│   ├── results/               # deneylerin ham sayıları (JSON)
│   └── figures/               # şekiller (SVG)
├── legacy/desktop-prototype/  # ilk OpenCV/Arduino masaüstü prototipi (bakımı yapılmıyor)
├── serve_web.py               # yerel / yerel ağ sunucusu
├── supabase_schema.sql        # isteğe bağlı bulut tabloları ve sıkılaştırma bölümü
└── vercel.json                # dağıtım yapılandırması ve güvenlik başlıkları
```

## Testler ve deneyler

Gereksinim: Node.js 20 ya da üzeri; dış paket gerekmez.

```bash
npm test                               # 67 test
node experiments/run_all.mjs           # bütün deneyler; docs/results ve docs/figures yeniden üretilir
node experiments/run_all.mjs --quick   # hızlı deneme (tezdeki sayıları vermez)
```

Deneyler tohumlu üreteç kullanır. Ürettikleri her sayı sentetik oyunculara aittir ve dosyalarda
`"simulated": true` olarak işaretlidir.

## Tez

Tam metin [`docs/tez/`](docs/tez/README.md) klasöründedir:
[özet](docs/tez/00-ozet.md) ·
[giriş](docs/tez/01-giris.md) ·
[ilgili çalışmalar](docs/tez/02-literatur.md) ·
[problem tanımı](docs/tez/03-problem-tanimi.md) ·
[yöntem](docs/tez/04-yontem.md) ·
[önceki sürümün denetimi](docs/tez/05a-onceki-surum-denetimi.md) ·
[mimari](docs/tez/05-mimari.md) ·
[deneyler](docs/tez/06-deneyler.md) ·
[arayüz](docs/tez/07-arayuz.md) ·
[tartışma](docs/tez/08-tartisma.md) ·
[sonuç](docs/tez/09-sonuc.md) ·
[kaynakça](docs/tez/kaynakca.md) ·
[ekler](docs/tez/ekler.md)

## Gizlilik

- Kamera kareleri ve el noktaları yalnızca tarayıcıda işlenir; saklanmaz ve gönderilmez. Kamera görüntüsünde
  yüz varsayılan olarak bulanıklaştırılır.
- Tarayıcının yerel deposunda yalnızca hamle geçmişi, zamanlama istatistikleri ve ayarlar tutulur;
  "Laboratuvar → Veri ve gizlilik" bölümünden dışa aktarılabilir ya da silinebilir. Demo verisi saklanmaz.
- **Anonim istatistik eşitleme varsayılan olarak kapalıdır.** Açılırsa yalnızca geçerli turların hamleleri,
  sonucu ve ölçülen zamanlamaları rastgele bir kimlikle gönderilir.
- Üçüncü taraf istekleri: el izleme kitaplığı `cdn.jsdelivr.net`'ten, yazı tipleri Google Fonts'tan yüklenir.
- Bulut eşitlemeyi kendi Supabase projenizde kullanacaksanız `supabase_schema.sql` dosyasının sonundaki
  sıkılaştırma bölümünü uygulayın; dosyanın ilk bölümündeki ilkeler herkese açık anahtarla bütün satırların
  okunup değiştirilmesine izin verir.

## Dağıtım

Uygulama durağan dosyalardan oluşur. Vercel yapılandırması `vercel.json` içindedir: `outputDirectory` değeri
`web`'dir; İçerik Güvenlik İlkesi, İzin İlkesi (`camera=(self)`) ve önbellek başlıkları aynı dosyada
tanımlıdır. Depo Vercel'e bağlıysa ana dala yapılan gönderimler yayına alınır; elle dağıtım için depo
kökünde `vercel --prod` kullanılabilir.

Yayın adresi: <https://beatter.vercel.app> · Kaynak kod: <https://github.com/cayankuzu/beaTTer>

## Lisans ve yazar

Geliştirici: **Çayan Kuzu** · Portfolyo: <https://fikkis.vercel.app>
Lisans: MIT
