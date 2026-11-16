# 7. Arayüz Tasarımı ve Gerekçesi

Bu bölüm arayüz kararlarını Bölüm 2.6'daki kaynaklara bağlar. Betimleme, bu metin yazılırken depoda bulunan
`web/index.html`, `web/css/tokens.css` (tasarım belirteçleri) ve `web/js/ui/strings_tr.js` (kullanıcıya
görünen bütün metinler ve sayı biçimleri) dosyalarına ve görünüm modüllerine (`web/js/ui/views/`) dayanır.
Bölüm **tasarım belirtimini ve metin katmanını** anlatır; piksel düzeyindeki yerleşim ayrıca
belgelenmemiştir. Bağımsız incelemeden sonra değişen göstergeler (skor kartı, rapordaki zamanlama satırları,
gizlilik rozeti, iptal bildirimi) ilgili alt bölümlerde belirtilmiştir. Betimleme v4.2.3 kodudur: v4.2.0–v4.2.2
bu çalışmanın dışında arayüzü de değiştirmiştir (raporun başına düz dilli bir özet, yeni ve yalın bir renk
paleti, sürüm bildirimi, verinin panoya kopyalanması, konsolda bir kamera düğmesi). Bu değişiklikler ilgili alt
bölümlerde, kodun okunmasına dayanarak anlatılır; metinlerinin bir kısmı `strings_tr.js`'te değil,
`views/report.js`, `views/lab.js` ve `main.js` içindedir (Bölüm 5.2). Arayüz kullanıcılarla
sınanmamıştır; aşağıdaki gerekçeler literatüre dayalı tasarım gerekçeleridir, ölçülmüş kullanılabilirlik
sonuçları değildir.

## 7.1 Tasarım ilkeleri

| # | İlke | Dayanak |
|---|---|---|
| P1 | Sistem ne yapabildiğini ve ne kadar iyi yapabildiğini baştan söyler | [Amershi2019] G1, G2 |
| P2 | Her tur için "neden bu hamle?" sorusu, karşılaştırmalı ve nedene dayalı tek bir açıklamayla yanıtlanır | [Miller2019; Amershi2019] G11 |
| P3 | Açıklama, gerçekte çalışan modeli anlatır; daha basit bir hikâye uydurulmaz | [Kulesza2015] |
| P4 | Ekrandaki her sayı ölçümdür; ölçülmemiş değer "—" olarak gösterilir | D4; [Adar2013] |
| P5 | Belirsizlik gizlenmez: oranlar aralıklarıyla, olasılıklar kalibrasyon hatasıyla sunulur | [PAIR; Kay2016] |
| P6 | Simülasyon her zaman simülasyon olarak etiketlenir | [Adar2013; Gray2018] |
| P7 | Ayrıntı isteğe bağlıdır: oyun ekranı yalın, kanıtlar rapor ve laboratuvarda | [Nielsen2006; LimDey2009] |
| P8 | Renk tek bilgi taşıyıcı değildir; arayüz klavyeyle ve ekran okuyucuyla kullanılabilir | [WCAG22; OkabeIto2008] |
| P9 | Veri varsayılan olarak cihazda kalır; paylaşım açık bir tercihtir | [GDPR; KVKK6698] |

## 7.2 Tur sırasında gösterilenler

Ekran iki sahneden oluşur: oyuncunun kamerası ("KAMERA · SEN"; üzerinde 21 eklemli iskelet ve parmak
açıklığı ölçerleri) ve yapay zekânın sahnesi (mekanik el, mühür, inanç çubukları). Altta bir ritim ve
sinyal konsolu bulunur: vuruş sözcükleri ("TAŞ, KAĞIT, MAKAS, VUR!"), ölçülen tempo ve 100 ms ızgaralı canlı
bir zaman şeridi (avuç yüksekliği, ön ve arka parmak açılması, mühürler, kestirilen ve gerçekleşen iniş).
v4.2.0'dan beri şeridin açıklama satırı ("avuç", "ön parmak", "arka parmak", "mühür", "iniş", "ızgara
100 ms") CSS ile gizlidir: eğriler yalnızca bantları ve çizgi biçimleriyle (ön grup düz, arka grup kesikli)
ayrılır; mühürler sıra numarasıyla, iniş adıyla şeridin üstünde etiketli kalır. Kaynak seçilmemişken konsol,
v4.2.2'den beri, kamerayı doğrudan açan bir "Kamerayı aç" düğmesi gösterir; bu düğme paylaşım ayarına
dokunmaz (Bölüm 7.7).

- **İnanç çubukları** önce "davranış beklentisi"ni (hareket başlamadan önceki önsel), uçuşta "canlı
  tahmin"i gösterir; yanında o an en etkili davranış uzmanının adı yer alır. Çubuklar konum/uzunluk
  kodlamasıdır [HeerBostock2010]. Oyuncu isterse canlı tahmini kapatabilir (o zaman olasılıklar tur
  sırasında gizlenir, sonuçla açılır): gösterge oyuncunun davranışını istemeden değiştirecekse gösterilmemesi
  önerilir [PAIR].
- **Düşünce satırı** motorun durum kodlarından üretilen tek cümledir ("Açılma görülmüyor: taş olasılığı
  yükseliyor · inişe ~120 ms"). Cümleler yalnızca kendilerine verilen ölçülmüş parametreleri biçimler; metin
  katmanında sayı üreten hiçbir ifade yoktur (P4).
- **Yanıt süresi.** Canlı gösterge kamera karelerinden beslenir ve depoya 20 Hz'te yansıtılır; bu, anlık
  hissedilen yaklaşık 0,1 s sınırının [Nielsen1993] altındadır. Mührün kendisi ise karenin işlendiği anda,
  seyreltme beklenmeden atılır.

## 7.3 Mühür

YZ sahnesinde mühür üç durumdan birindedir: "MÜHÜRLENMEDİ" (altında "Hamle, elin inmeden önce mühürlenir"),
"MÜHÜRLENDİ" (SHA-256 özetinin ilk sekiz hanesi, dörtlü gruplar hâlinde; revizyon sayısı; inişe kalan süre)
ve ifşadan sonra "AÇIKLANDI: …". Özet, hamle açıklanmadan **önce** ekrandadır; önceki sürümde mühür ifşadan
önce hiç gösterilmiyordu (Bölüm 5.1, B8). Ekran okuyucu için özet "SHA-256 özetinin ilk 8 hanesi" olarak
duyurulur. Her revizyon yeni bir mühürdür ve zaman şeridinde ayrı bir işaret olarak görünür; revizyonlar
gizlenmez (D3).

**İptal edilen tur.** Bir tur mühür atıldıktan sonra iptal edilirse (el kadrajdan çıktı, ritim yarım kaldı,
kullanıcı Esc ile durdurdu) oyuncu ekranda bir mühür kodu görmüş ama açıldığını görmemiş olurdu. Bu yüzden
iptal bildirimi nedeni söyledikten sonra mühürlerin akıbetini de bildirir: "İptal edilen turun mührü açıldı
ve doğrulandı" (birden çoksa sayısıyla); doğrulama başarısız olsaydı bunun yerine bir uyarı gösterilirdi.
İptalde canlı zaman şeridi temizlenir; iptal edilen turun mührü bir sonraki turun şeridinde kalmaz. Motorun
beklenmedik bir hatası da oyunu dondurmaz: tur iptal edilir ve "Beklenmeyen bir hata oluştu: tur iptal
edildi, oyun sürüyor" bildirimi gösterilir.

## 7.4 Tur raporu ve karar zamanının kanıtı

Her turdan sonra açılan rapor v4.2.0'dan beri şu sırayı izler (P2, P7):

1. **Hüküm** ve tek cümlelik gerekçe ("Kağıt taşı sarar"; faulde "El indikten sonra açıldı. Tur sayılmadı;
   tekrar oynanır").
2. **Düz dilli özet** ("Bu Turda Ne Oldu? (Adım Adım Özet)"; v4.2.0): üç adım. "Başlangıç Tahmini"
   hareketten önceki davranış mührünün hamlesini, "Karar Anı" değerlendirilen mührün inişten kaç ms önce
   (Kâğıt ve Makas'ta ayrıca şeklin yüzde kaçı oluşmuşken) atıldığını, "Doğrulama" o mührün sıra numarasını
   söyler. Faul ve geçersiz turlarda adımların üstünde bir uyarı kutusu, ne olduğunu ve "Nasıl düzeltilir"
   önerisini verir. Altında "Yapay Zekâ Senden Ne Öğrendi?" (geçerli tur sayısı, açılma başlangıcının
   ortalaması, en sık hamle) ve serinin geçerli turlarının tur tur geçmişi yer alır.
3. **Teknik ayrıntı**: kapalı başlayan tek bir açılır bölüm ("Detaylı Zaman Grafiği, Mühür Zinciri ve Teknik
   Ölçümler"). v4.2.0'a kadar raporun gövdesi olan altı bölüm buradadır:
   - **Karar zamanı**: "Karar: inişten N ms önce", ardından "hamlenin %X'i oluşmuşken" ve "şekil
     tamamlanmadan N ms önce" (negatifse "tamamlandıktan N ms sonra" yazılır; gizlenmez). v4.2.0'a kadar
     raporun ana sayısıydı.
   - **Tur zaman çizelgesi** (inişe göre ms): ön ve arka parmak açılması, hakemin okuduğu açılma olasılığı,
     avuç yüksekliği, bütün mühürler, şeklin tamamlanma anı ve iniş. Bölümü açan kullanıcı, mührün iniş
     çizgisinin solunda olduğunu kendi gözüyle görür. Çizelgenin ekran okuyucu için metin karşılığı vardır.
   - **"Neden bu hamle?"** — on üç açıklama kodundan biri. Açıklamalar karşılaştırmalıdır ("Makas iki
     olasılığa karşı da kaybetmez (kağıdı keser, makasla berabere kalır); bu yüzden makas mühürlendi") ve
     belirsizliği söyler ("Bu bir tahmindi, kesinlik değil"). Yanında mühür anındaki inanç ve "yalnızca
     davranış modeliyle: kazanırdı / kaybederdi / berabere" karşı-olgusalı yer alır.
   - **Mühür zinciri** tablosu: sıra, zaman, neden (Davranış / Kinematik / Revizyon), hamle, özet, durum
     ("bağlayıcı", "iniş sonrası · değerlendirilmedi", "Doğrulandı").
   - **"Kendin doğrula"**: mühür içeriği (UTF-8) ve özeti gösterilir; düğme özeti iki bağımsız
     gerçeklemeyle (kendi SHA-256 kodumuz ve tarayıcının Web Crypto'su) yeniden hesaplar. Altındaki not
     sınırı açıkça yazar: içerikteki zaman, kararın dayandığı kameranın **kare zamanıdır**; özetin fiilen
     hesaplandığı an ölçümlerde "duvar saati" satırında ayrıca verilir; "Zaman damgaları bu cihazın kendi
     saatidir."
   - **Bu turun ölçümleri**: açılma başlangıcı ve süresi, tepe parmak hızı (°/s), V açıklığı (°), uçuşta
     izlenen kare payı ve kare hızı, iniş kaynağı, hakem okumaları, ölçüm gürültüsü, hakem ayarı; ayrıca
     aşağıdaki zamanlama satırları.

**Zamanlama satırları.** Karar zamanındaki "inişten N ms önce" bir bilgi kümesi önceliğidir (Bölüm
4.10) ve ölçümlerde "kare zamanı" adıyla ayrılır; kamera turlarında yanında iki duvar saati satırı daha
vardır. İnceleme sonrasında eklenen ya da yeniden adlandırılan satırlar şunlardır:

| Rapor satırı | Anlamı |
|---|---|
| "Mühür → iniş (kare zamanı)" | Kararın dayandığı karenin yakalanmasından inişe kadar geçen süre ($\Delta_L$) |
| "Kare → mühür gecikmesi" | O karenin yakalanmasından özetin var olduğu ana kadar geçen duvar saati süresi |
| "Mühür → iniş (duvar saati)" | İkisinin farkı: özet var olduktan sonra inişe kalan süre; negatif çıkabilir ve öyle gösterilir |
| "Mühür anında şeklin oluşma payı" | $\pi_c$; Taş için ve ölçülemediğinde "—" |
| "Son havadaki karenin yaşı" | Hakemin okuduğu son havadaki kare ile iniş arasındaki süre (kanıtın tazeliği, Bölüm 4.4) |

Demoda kare → mühür gecikmesi ve duvar saati önceliği ölçülmez ve "—" gösterilir (P4). Bu satırlar,
incelemenin "yayımlanan her öncelik yakalama–mühür gecikmesini yok sayıyor" bulgusunun karşılığıdır: bir
şüpheci artık mührün gerçek zamanda da inişten önce var olup olmadığını kendi cihazında okuyabilir.

Açıklama türlerinin hepsini birden göstermek zararlı olabileceğinden [LimDey2009] rapor önce hükmü ve düz
dilli özeti, sonra isteyene (kapalı bölümde) ayrıntıyı verir.

**Düz dilli özetin sınırları.** Özet raporun ilk görünen bölümü olduğundan P3 ve P4 açısından ayrıca
değerlendirilmelidir. Kodun okunması şunları gösterir. (i) v4.2.0–v4.2.2'de özet "Uyum: %X" gösteriyordu; bu bir ölçüm değil, geçerli tur sayısı $n$'nin bir
işleviydi ($\min(100,\,100\,(1-e^{-n/10}))$): Bölüm 7.5'te kaldırıldığı söylenen, formülle üretilmiş
"öğrenme yüzdesi"nin bir benzeri ve P4'e aykırı. v4.2.3'te kaldırılmıştır; özet yalnızca öğrenilen geçerli tur
sayısını söyler. (ii) "Parmaklarını inişten
ortalama N ms önce açıyorsun" cümlesi ölçülen değerlerin ortalamasını değil, açılma başlangıcı önseliyle
(170 ms; Ek A.8) birleşen sonsalın ortalamasını gösterir; az turda bu değer büyük ölçüde önseldir.
Laboratuvarın kinematik profil kartı aynı değeri ölçüm sayısı $n$ ile birlikte verir; özet vermez. (iii) "Karar
Anı" adımı, Kâğıt ve Makas'ta YZ'nin parmakların oyuncunun hamlesi için açıldığını "gördüğünü" söyler;
oysa o hamle hakemin inen şekilden okuduğudur ve YZ, Kâğıt ile Makas ayrışmamışken ikisine karşı da
kaybetmeyen hamleyi mühürleyebilir (açıklama kodu `SAFE_SCISSORS`). Tur geçmişi de davranış mührünün hiç
değişmediği turları "N ms önce okudu" diye etiketler. (iv) v4.2.0–v4.2.2'de faul başlıkları "Senin Hatan: …" diyordu; oysa
simülasyonda açılması inişten en az 110 ms önce başlamış dürüst atışların da bir bölümü faul sayılır
(normal açanlarda %0,19–0,47, model uyumsuzluklarında %14,7'ye kadar; Bölüm 6.3, 6.8). v4.2.3'te başlıklar
suçlamaz ("Geç Hamle: Açılma İnişten Önce Görülmedi") ve metin kameranın açılmanın başını kaçırmış
olabileceğini söyler; havadaki karelerin çeliştiği geçersiz turların (Bölüm 5.1.8) ayrı bir açıklama kodu ve
metni vardır ("Kareler Birbirini Tutmadı"). (v) Metinler üç hazırlık vuruşunu varsayar ("4. vuruş"); iki vuruşlu, tek atış
ve metronom kiplerinde bu ifade tutmaz. (ii), (iii) ve (v) numaralı noktalar v4.2.3'te değiştirilmemiştir; özetin bu bölümün
ilkeleriyle uyumlu hâle getirilmesi açık bir iştir. Özet kullanıcılarla sınanmamıştır.

## 7.5 Laboratuvar, kurallar ve simülasyon etiketi

**Laboratuvar** birikimli ölçütleri altı kartta toplar: skor (aşağıda); karar zamanı (medyan, çeyrekler
arası aralık, ortalama oluşum payı, "hareketten önce karar" payı, histogram ve — davranış mührü değişmeyen
turlar hariç tutularak — "EL OKUYARAK VERİLEN KARAR · medyan"); tahmin kalitesi (isabet,
Brier, log-kayıp, bilgi kazancı, ECE ve güvenilirlik diyagramı); davranış kanalının tek başına karşı-olgusal
oranı, sömürü payı $\lambda$, güvenlik bütçesi ve füzyon ağırlıkları; davranış profili (hamle sıklığı,
önceki sonuca göre geçişler, yanında [ForderDyson2016] değerleri "lit." çentiği olarak); kinematik profil
($n=0$ olan satırlarda değerin **önsel** olduğu yazılır). Veri yokken kartlar sayı uydurmaz; neyin ne zaman
görüneceğini söyleyen boş durum metinleri gösterir. Bu kartlar, önceki sürümdeki formülle üretilmiş
"öğrenme yüzdesi" ve "güven %99,8" göstergelerinin yerini alır (v4.2.0'ın tur raporuna eklediği "Uyum"
yüzdesi bu ilkenin bir istisnasıydı ve v4.2.3'te kaldırılmıştır; Bölüm 7.4).

**Skor kartı: iki tür oran.** Kart dört oranı %95 Wilson aralığıyla gösterir: "KAZANMA ORANI" ve
"KAYBETMEME · geçerli turlarda" (ikisi de geçerli turlar üzerinde; "şans %33" çentiği ve tek yönlü kesin
binom testiyle), ardından "TÜM DENEMELERDE KAZANMA" ve "SONUÇSUZ DENEME (faul + geçersiz)" (ikisi de hükme
bağlanan bütün denemeler üzerinde). İlk v4 arayüzü yalnızca ilk ikisini, ikincisini de "YENİLMEZLİK"
başlığıyla gösteriyordu. İnceleme bunun bir beceri ölçüsü gibi okunduğunu, oysa Turnuva'da kuralın sonucu
olduğunu göstermiştir (Bölüm 5.1.6): başlık değiştirilmiş, koşulsuz oranlar eklenmiş ve kartın altına şu
not konmuştur: "Üstteki oranlar yalnızca geçerli turları sayar. Turnuva hakeminde bir turun geçerli olması,
YZ'nin de baktığı havadaki karelere bağlıdır; bu yüzden 'kaybetmeme' kuralın sonucudur, tahmin başarısının
ölçüsü değildir. Sistemin gerçek başarımı alttaki iki satırdır: bütün denemeler içinde kazanılanlar ve
sonuçsuz kalanlar." Bu, P5'in (belirsizliği gizleme) ötesinde bir ilkedir: bir sayının *neyi ölçmediğini*
de söylemek.

**Kurallar açıklayıcısı** üç kuralı, geç hamle kuralını ("Hakem yalnızca inişten önceki parmak yönüne ve inen
şekle bakar; YZ'nin hamlesine bakmaz"), üç hakem ayarını ve "Mühür neyi kanıtlar, neyi kanıtlamaz?"
başlığını içerir. Standart ve Serbest için "insan meşru biçimde kazanabilir" denir (P1). Turnuva ayarının
açıklaması, bu metnin olgu denetiminden sonra, hakemin gerçekte yaptığını söyleyecek biçimde yeniden
yazılmıştır: "Ön parmaklar el inmeden önce ölçülebilir biçimde açılmadıysa yalnızca taş geçerlidir;
sonradan açılan hamle fauldür ve tur tekrarlanır. Bu ayarda YZ geçerli bir turu kural gereği kaybetmez;
bedeli, geç açanlarda artan faul sayısıdır." Önceki metin açılmamış bir elin Taş *sayıldığını* söylüyordu;
hakem bunu yapmaz: böyle bir turda oyuncu Kâğıt ya da Makas indirirse tur fauldür ve tekrarlanır (Bölüm
4.4). İkinci cümle Teorem 1'in ifadesidir; teoremin turun geçerliliği dışında bir önkoşulu kalmadığından
(Bölüm 4.7) kodla her oyun kipinde — metronom kipi dâhil — örtüşür ve bedelini aynı cümlede söyler.
Ayarlardaki
"Karar ufku" açıklaması ise ayarın Turnuva'da etkisiz olduğunu ve nedenini söyler ("orada hakem eli son
havadaki kareye kadar okur, YZ daha erken bakmayı bırakırsa geçerli bir hamleye kaybedebilirdi").

**Simülasyon etiketi.** Kamerasız demoda kamera sahnesinde kalıcı "SİMÜLASYON — sentetik el" etiketi, durum
çubuğunda "Simülasyon · kaydedilmez", laboratuvarda "Bu kartlardaki sayılar SİMÜLASYON verisidir … Gerçek
oyuncu ölçümü değildir" uyarısı bulunur; iskelet çiziminin erişilebilir adı bile "kamera görüntüsü değildir"
der. Demo verisi saklanmaz ve gönderilmez. Sentetik bir oyuncuya karşı elde edilen skorun gerçek başarım
sanılması, [Adar2013]'ün tanımıyla dayanaksız bir inanç oluşturmak olurdu.

**Demonun açılışı elle seçilmiştir.** Demonun varsayılan tohumu, ilk on turu geçerli olan ve ilk beş
turunda üç hamlenin de göründüğü tohumlar arasından seçilmiştir (Bölüm 5.4.1); amaç, ilk izlenimde raporun
ve üç hamlenin de görülebilmesidir. Seçilen yalnızca açılıştır: demo uzadıkça faul ve kazanma oranları
simülatörünkilere (Bölüm 6) yaklaşır ve `?seed=N` başka bir diziyi oynatır. Demonun ilk turlarından
"faul yok" sonucu çıkarılmamalıdır; bu not, P6'nın gereğidir.

## 7.6 Erişilebilirlik ve renk sistemi

| Karar | Gerçekleme | Ölçüt |
|---|---|---|
| Metin karşıtlığı | v4.2.0'dan beri belirteç dosyası karşıtlık değeri belgelemez. Belirteç renklerinden WCAG bağıl parlaklık formülüyle bu metinde hesaplanan değerler (birinci panel yüzeyinde): birincil metin 17,2:1, ikincil 7,3:1, üçüncül 3,9:1 (en açık panel yüzeyinde 3,4:1). Üçüncül metin 12 piksellik etiketlerde ve tablo başlıklarında kullanılır. v4.0'ın belgelediği değerler 16,3:1, 9,9:1 ve 6,3:1 (5,4:1) idi | WCAG 1.4.3 (≥ 4,5:1): üçüncül metinde v4.2.0'dan beri sağlanmaz |
| Denetim sınırları ve grafik çizgileri | Sınır rengi zeminde 3,1:1, panel yüzeylerinde 2,5–2,9:1 (hesaplanmış; v4.0'da her yüzeyde ≥ 3:1) | WCAG 1.4.11 (≥ 3:1): panel yüzeylerinde v4.2.0'dan beri sağlanmaz |
| Renk tek taşıyıcı değil | Her durumun metin etiketi vardır ("MÜHÜRLENDİ", "FAUL: GEÇ HAMLE"); beraberlik dilimi taramalı, kayıp dilimi çerçeveli çizilir; seriler doğrudan etiketlenir | WCAG 1.4.1; [OkabeIto2008] |
| Yakınlaştırma | `user-scalable=no` kaldırıldı; yazı ölçeği `rem` tabanlı, en küçük 12 px | WCAG 1.4.4 |
| Klavye | Boşluk/Enter (sayım, sonraki tur), L, S, M, P, D, Esc (açık paneli ya da raporu kapatır; tur sürerken turu durdurur); kısayollar odaktaki bir denetimin kendi tuşlarını ezmez; iletişim kutularında odak tuzağı | WCAG 2.1.1 |
| Odak göstergesi | 2 px çerçeve (`:focus-visible`); v4.2.0'dan beri oyuncu rengiyle aynı buz mavisi `#67B7DC` (önce sarı), yüzeylerde 7,1–8,8:1 (hesaplanmış) | WCAG 2.4.7 |
| Dokunma hedefi | Denetimlerde en küçük 44 px (`--hit`); v4.2.0'ın sürüm bildirimindeki "Şimdi Yenile" düğmesi bu belirteci kullanmaz (dolgusu ve satır yüksekliğiyle 20 px) | WCAG 2.5.8 (AA 24 px), 2.5.5 (AAA 44 px) |
| Durum iletileri | Sonuç, kamera durumu, demo geçişleri ve (v4.2.0'dan beri) sürüm bildirimi ekran okuyucuya odağı taşımadan duyurulur; yalnızca görsel öğelerin metin karşılıkları vardır | WCAG 4.1.3 |
| Hareket | `prefers-reduced-motion` izlenir; ayrıca ayarlarda "Hareketi azalt: Sistem / Açık / Kapalı"; azaltılmış kipte bütün canlandırma ve geçişler kapatılır | WCAG 2.3.3, 2.2.2 |
| Parlama | Belirteçlerde tanımlı yinelenen göstergelerin dönemi 1 s ve 1,6 s'dir (saniyede üç parlama eşiğinin altında) | WCAG 2.3.1 |
| Sayılar | Eşit genişlikli rakamlar (`tabular-nums`), ondalık virgül, gerçek eksi işareti | okunabilirlik |

**Renk sistemi.** v4.0'da anlam taşıyan beş renk Okabe–Ito paletinden alınmıştı [OkabeIto2008] ve her
birine tek bir rol verilmişti: gök mavisi `#56B4E9` oyuncu (kamera, iskelet, parmak sinyalleri), turuncu
`#E69F00` yapay zekâ (inanç, mekanik el), mavimsi yeşil `#009E73` mühür ve doğrulama, kiremit `#D55E00` faul
ve yıkıcı eylemler, sarı `#F0E442` odak ve simülasyon etiketi; kırmızı–yeşil karşıtlığı kullanılmıyordu.
v4.2.0'ın yalın arayüzü bu paleti değiştirmiştir (`tokens.css`; değişken adları `--oi-*` olarak kalmıştır,
değerleri Okabe–Ito'nun değildir): oyuncu buz mavisi `#67B7DC`, yapay zekâ gümüş-arduvaz `#CBD5E1`, mühür ve
doğrulama turkuaz `#2DD4BF`, faul ve yıkıcı eylemler kehribar `#F59E0B`. Simülasyon etiketi yapay zekâyla,
odak göstergesi oyuncuyla aynı rengi kullanır; renklerin her biri artık tek bir rol taşımaz. Yeni paletin
renk görme eksikliklerinde ayırt edilebilirliği bu metinde sınanmamıştır. Öğeler yine renk anahtarı yerine
doğrudan etiketlenir (canlı şeridin açıklama satırı dışında; Bölüm 7.2). Turkuaz ve kehribarın koyu zemindeki
*metin* kullanımları için ayrı tonlar vardır (`#5EEAD4` ve `#FBBF24`; hesaplanan karşıtlık mühür zemininde
11,1:1 ve birinci panel yüzeyinde 11,3:1; v4.0'daki tonlarda aynı zeminlerde 7,9:1 ve 8,2:1).

**Koyu tema bir okunabilirlik iddiası değildir.** Kamera görüntüsü ve iskelet çizimi koyu bir çerçevede
daha az parlar; ancak koyu zeminde açık metnin daha okunaklı olduğu savı desteklenmez [Piepenbrock2013]. Bu
nedenle gövde metni yüksek karşıtlıkla ve en az 12 px ile sınırlandırılmıştır; açık tema gelecek çalışmadır.

**Geri bildirimde ölçülülük.** Parlama ve "mühür damgası" gibi efektler yalnızca canlı sinyaller ve mühür
olayı için kullanılır; daha fazla efektin deneyimi iyileştirdiğine dair kanıt yoktur [JuulBegy2016].
v4.2.0'dan beri CSS'teki parlama belirteçleri boştur; hareket azaltılmamışsa canlı şeritteki ön grup
eğrisinin tuval üzerindeki hafif parlaması kalır.

## 7.7 İzinler ve veri paylaşımı

- **Kamera izni** sayfa yüklenirken istenmez. İlk ekran kapalı kameralı bir kapıdır: "Görüntü cihazından
  çıkmaz; el takibi tarayıcında çalışır" açıklaması ve iki eşdeğer seçenek ("Kamerayı aç", "Kamerasız
  demo"). Tarayıcı istemi yalnızca bir düğmeye — tanıtım ekranındaki ya da, v4.2.2'den beri, kaynak yokken
  konsoldaki "Kamerayı aç" düğmesine — basıldıktan sonra açılır [PermissionsBP]. Hata durumlarının her
  biri için nedeni ve çözümü söyleyen ayrı metinler vardır (izin verilmedi, kamera başka uygulamada, kamera
  yok, güvenli bağlantı yok, model yüklenemedi ve — oturum ortasında — "Kamera bağlantısı kesildi").
- **Gizlilik (yalnızca el net)** varsayılan olarak açıktır ve P tuşuyla, üst çubuktaki düğmeyle ya da
  ayarlardaki "Gizlilik: yalnızca el net" anahtarıyla değiştirilebilir. Açıkken kamera görüntüsünün tamamı
  bulanıklaştırılır, yalnızca izlenen el net görünür; el görülmediğinde her şey bulanıktır. Tanıtım ekranı
  bunu "Görüntü cihazından çıkmaz. Yalnızca elin net görünür; yüzün ve odanın geri kalanı
  bulanıklaştırılır." diye anlatır. Bu tasarımı, gerçek kamerada ilk denemede yüz bulanıklığının elin önüne
  geldiğini gören proje sahibi seçmiştir (Bölüm 5.1.7). Gösterilen görüntü, el izleyicinin işlediği karenin
  kendisidir (v4.2.0'dan beri izleyici bu karenin küçültülmüş bir kopyasını okur): net bölge o karenin eklem
  noktalarından hesaplandığından hızlı vuruşlarda da elin üstündedir; bedeli, görüntünün canlı kameranın bir
  izleyici çıkarımı kadar geriden gelmesidir. v4.2.0'dan beri izleme koptuktan sonraki en çok 160 ms'de son
  net bölge elin son görüldüğü yerde kalır ve orada ne varsa net gösterir; "El görülmediğinde her şey
  bulanıktır" metni bu kısa payı söylemez (Bölüm 5.8). Kamera sahnesindeki rozet üç metinden birini
  gösterir: "Yalnızca el net" (gizlilik açık; üzerine gelindiğinde "Gizlilik açık:
  görüntünün tamamı bulanık, yalnızca izlenen el net. El görülmediğinde her şey bulanıktır; görüntü
  cihazından çıkmaz."), "Gizlilik çizilemedi · görüntü kapatıldı" (çizer hata verdiyse kamera görüntüsü
  gösterilmez, iskelet çizilmeye devam eder) ve "Gizlilik kapalı"; son ikisi uyarı biçeminde çizilir. Ek bir
  önlem olarak, gizlilik açık olduğu her an video öğesinin kendisi de CSS ile bulanıklaştırılır (28 piksel);
  bu, kamera açılırken ve el izleyici yüklenirken sahneyi örten %90 opak kapının arkasında da geçerlidir.
  Gizlilik uygulanmış görüntü ilk kez çizilmeden önce ya da çizim durursa görünen, bu bulanık videodur.
  Rozet yine yalnızca doğru olanı söyler. Önceki tasarımda yüzün gizlenmesi bir yüzün bulunmasına bağlıydı;
  rozetin bu yüzden "Yüz gizleme: yaklaşık bölge" diye ayrı bir durumu vardı ve ilk v4 arayüzünde rozet,
  dedektör olmasa da "açık" yazarak bir gizlilik güvencesini olduğundan güçlü gösteriyordu (Bölüm 5.1.6).
  Yeni tasarımda yüzün gizlenmesi için hiçbir şeyin bulunması gerekmediğinden "yaklaşık" bir durum da
  yoktur. Sınırı da yazılmalıdır: net bölge elin çevresinde dar bir pay içerir; yüzün önünde tutulan el,
  yüzün hemen yanındaki bölümünü açar (Bölüm 5.1.7).
- **İstatistik paylaşımı** tanıtım ekranında kapalı bir anahtar olarak sunulur ve varsayılan olarak kapalıdır
  (varsayılan olarak veri koruma [GDPR]; ölçülülük [KVKK6698]). Metni neyin gönderildiğini (rastgele
  kimlikle: tur ve tanılama kayıtları) ve neyin asla gönderilmediğini söyler.
  Önceden işaretli kutu ya da gizli gönderim karanlık örüntü sınıflamasındaki "ön seçim" ve "gizleme"
  türlerine girerdi [Gray2018]; önceki sürüm bildirim olmadan gönderim yapıyordu (Bölüm 5.1.4).
  v4.2.0–v4.2.2'de anahtara dokunmadan "Kamerayı aç"a basmak paylaşımı açıyordu ve metin gönderilenin bir
  kısmını söylüyordu; ikisi de bu iki türe girer ve v4.2.3'te düzeltilmiştir (Bölüm 5.1.8); v4.2.3 ayrıca önceki sürümlerden
  kalan kayıtlı rızayı geçersiz sayar, bunu oyuncuya bir kez bildirir ve başka profile geçildiğinde paylaşımı
  kapatır. Kaynak yokken
  konsolda görünen "Kamerayı aç" düğmesi (v4.2.2) paylaşım ayarına dokunmaz. Paylaşım yalnızca gerçek
  oyuncunun kamera turları için, izinli bir barındırıcıda etkindir; veritabanı tarafı kurulmamışsa gönderim güvenli yönde başarısız olur ve durum
  "çevrimdışı" olarak gösterilir (Bölüm 5.8).
- **"Veri ve gizlilik" kartı** neyin saklandığını, neyin saklanmadığını (kamera görüntüsü, yüz, ham el
  noktaları) ve nerede saklandığını yazar. Saklananlar üç satırdır: "Hamle ve sonuç geçmişi", "Zamanlama
  ölçümleri: tempo, açılma başlangıcı ve süresi" ve "Mühür zinciri ve bu oturumun tur sonuçları: mühür
  içeriği, SHA-256 özetleri, hükümler ve ölçümler (yalnızca bu oturum; dışa aktarılabilir)". Üçüncü satır
  dışa aktarımın bugünkü içeriğini söyler: tur sonuçları yalnızca bellekte, sayfa oturumu boyunca tutulur
  ve "Dışa aktar (JSON)" düğmesiyle indirilen belgeye girer (Bölüm 5.5). v4.2.0'dan beri aynı belgeyi
  panoya kopyalayan bir "Veriyi panoya kopyala" düğmesi de vardır (metni `views/lab.js` içindedir). Onay
  isteyen "Hafızayı sıfırla" düğmesi de buradadır. Uygulama bir geliştirme barındırıcısında açıldığında
  v4.2.0'dan beri tur sonuçlarının yerel sunucuya da yazıldığını (Bölüm 5.8) ne bu kart ne arayüzün başka
  bir yeri söyler.
- **Sürüm bildirimi** (v4.2.0; `main.js`). Sayfa kendi kökeninden `version.json` dosyasını açılışta, her
  35 s'de bir ve sekme yeniden görünür olduğunda, önbelleği atlayarak ister. Dosyadaki yapı kimliği
  (`buildId`) sayfanın ilk okuduğundan farklıysa ekranın üstünde "Yeni sürüm hazır (sürüm) · not" bildirimi
  ve "Şimdi Yenile" düğmesi belirir; sayfa yalnızca düğmeye basılınca yeniden yüklenir. İstek oyuncuya ait
  hiçbir veri taşımaz (adresteki tek parametre önbelleği aşan bir zaman damgasıdır). Bildirim ekran okuyucuya
  `role="status"` ile duyurulur; metinleri `strings_tr.js`'te değil, `main.js` içindedir ve notun kendisi
  `version.json`'dan gelir.

## 7.8 MindTwin kipi

İkinci kip skor içermez: parmak açıklıklarının 120 ms sonraki öngörüsünü çizer ve öngörünün **ölçülen
becerisini** gösterir (öngörü hatası, "el yerinde kalır" varsayımının hatası, aralarındaki oran). Açıklama
metni becerinin sıfır ya da negatif olabileceğini söyler. Önceki sürümdeki "zihin okuma" göstergesi kestirim
ile gerçeği aynı değişkenden okuduğu için her zaman "başarılı" görünüyordu (Bölüm 5.1, B16).
