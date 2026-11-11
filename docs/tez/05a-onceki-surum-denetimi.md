# 5.1 Önceki Sürümün Denetimi

Yeniden tasarımın gerekçesi, önceki sürümün (`d511799` işlemesi, "JankenMind v3.1 / CognitiveBrain v3")
kod düzeyinde denetimidir. Denetim dört bağımsız inceleyiciyle yapılmış, bulguların önemli bölümü kod
gerçekten çalıştırılarak doğrulanmıştır. Toplam 199 özellik/davranış envantere alınmış, 197 kusur kaydı
açılmıştır (inceleyicilerin alanları kesiştiği için aynı kusur birden fazla kayıtta geçebilir); kayıtların
21'i kritik, 68'i yüksek önem derecesindedir. En büyük sınıf "bilimsel dürüstlük"tür (66 kayıt):
kullanıcıya gösterilen ya da saklanan bir değerin ölçülmek yerine üretilmesi. Aşağıda yeniden tasarımı doğrudan belirleyen bulgular özetlenmiştir (satır numaraları
`d511799`'daki dosyalara aittir).

Bölüm 5.1.1–5.1.5 önceki sürümün denetimidir. Bölüm 5.1.6, aynı türden bir denetimin yeniden tasarımın
kendisine (v4'e) uygulanmasını, bulduğu kusurları ve bunların nasıl giderildiğini anlatır.

## 5.1.1 "Yenilmezlik" bir totolojiydi

| # | Bulgu | Kanıt |
|---|---|---|
| B1 | Vuruş anında motor, o karede görünen pozu okuyup karşı hamleyi yeniden kilitliyor; hakeme verilen "nihai hamle" de aynı karenin pozu. Yapay zekânın hamlesi her zaman, karşılaştırıldığı hamlenin karşılığı oluyor. | `web/app.js:899-929` (`_instantStrike`, "final reflex sync"), `2082-2099` |
| B2 | "Vuruş" avuç merkezinin kayan pencere orta çizgisini aşağı doğru geçtiği anda algılanıyor; bu, vuruşun gerçek dip noktasından önce. Benzetimde 460 ve 700 ms'lik salınımlarda olay gerçek dipten 103 ve 150 ms önce tetiklendi. Oyuncunun "nihai hamlesi" bu tek karedeki pozdu; oturma penceresi yoktu. | `web/app.js:727-738` |
| B3 | Kilitlendikten sonra motor, el ne gösterirse ona yeniden kilitleniyor (inişin %94'üne kadar); her yeniden kilit yeni bir "mühür" üretiyor ve ilk kilit iz bırakmıyor. | `web/app.js:695-717` |
| B4 | "Şimdi Vur!" / Boşluk yolu bir tahmin değil: tuşa basıldığında görünen pozu okuyup karşılığını oynuyor, ardından bunu "havada tahmin" olarak sunuyor. Kamerada hiç el yokken on bir tuş basışı 0–5'lik eksiksiz bir seri üretti. | `web/app.js:3572-3603`, `3718-3730` |
| B5 | Öğrenme yığını hamleyi değiştiremiyordu: bütün çağrılar `trustKinematics: true` ve sabit `0.995` güvenle yapıldığından dizi modeli ve "anti-feint" dalları erişilemezdi; 900'den fazla benzetim turunda oynanan hamle istisnasız `KARŞI[görülen poz]` idi. | `web/cognitive_brain.js:512, 550`; `web/app.js:806-849` |
| B6 | "%100 yenilmezlik" testi, oyuncunun gerçek hamlesini yapay zekâya "kinematik gözlem" olarak verip dönen karşı hamlenin onu yendiğini 100 kez doğruluyordu — yani kâğıdın taşı yendiğini sınıyordu. | `tests/test_ml_invincibility.js:184-218` |

Sonuç: sistem, kullanıcının asıl gereksinimi olan "kişi hamle yapmadan karar verme"yi sağlamıyor, tam
tersine tamamlanmış (ya da o karede görünen) hamleye tepki veriyordu.

## 5.1.2 Gösterilen sayılar ölçüm değildi

| # | Gösterge | Gerçekte ne olduğu | Kanıt |
|---|---|---|---|
| B7 | "‑X ms önce kilitlendi" | Hiçbir yerde (iniş zamanı − kilit zamanı) ölçülmüyordu. Değer; 3. vuruştan beri geçen sürenin 125–265 ms aralığına sıkıştırılmış hâli, ya da `185 + 4·(oynanan tur)` formülü, ya da sabit 185/95 idi. | `web/app.js:686, 711, 815-820, 921, 3577` |
| B8 | "Kripto mühür ✓ DOĞRULANDI" | `sealOk` her çağrıda sabit `true` idi; mühür ifşadan önce ekranda hiç gösterilmiyordu; mühür yoksa ifşa anında hesaplanıyor ya da `BEAT8821` sabiti yazılıyordu. Özetlenen içerik yalnızca `hamle|nonce|tur` idi (zaman, kare, oturum yok) ve nonce `Math.random` kaynaklıydı. | `web/app.js:928, 2145-2157`; `web/cognitive_brain.js:560-580` |
| B9 | "Bilişsel öğrenme %" rozeti | `min(99.6, 70 + 2.2·tur + 3.5·feint)`; sıfır veriyle %70'ten başlıyor, tahmin isabetinden bağımsız olarak ~14 turda tavana ulaşıyordu. HTML, betik çalışmadan önce "%96" gösteriyordu. | `web/cognitive_brain.js:557-558, 782-783`; `web/index.html:82` |
| B10 | "Güven %99.8" | Dal başına sabitler (0.998 / 0.985 / 0.96 / 0.95). | `web/app.js:236-257, 2999-3008` |
| B11 | "V‑Açısı" | Her zaman 0.0°: kod var olmayan `vAngle` alanını okuyordu (gerçek değer `metrics.vSpreadAngle` içindeydi). | `web/app.js:454-456` |
| B12 | "Tendon hızı °/s" | Birimsiz 0–1 açıklık skorunun kare farkının 180 ile çarpımı; çizim döngüsü zaman adımıyla hesaplandığı için yinelenen karelerde 0, yeni karelerde sıçrama. | `web/app.js:458-463` |
| B13 | Canlı olasılık çubukları | `scores.thumb` tanımsız olduğundan özellik `NaN`, yerine sabit 0.25 geçiyordu; tamamen açık bir el "TAŞ %83" gösteriyordu. | `web/app.js:465-468` |
| B14 | "Otomatik kalibrasyon" | Bir saniyelik zamanlayıcı; eşiği varsayılana döndürüp "optimize edildi" yazıyordu. | `web/app.js:3656-3670` |
| B15 | "Wang–Xu–Zhou (Nature 2014)" koşullu tepki matrisi ve "erkekler %42 taş" önseli | Yuvarlak, döngüsel simetrik, kaynağa izlenemeyen sayılar; makale *Scientific Reports* 4:5830'dur. Ayrıca sonuç etiketleri uyuşmadığından (`BOT_WIN`/`USER_WIN` ↔ `AI`/`USER`) koşullama hiç çalışmıyordu. | `web/app.js:276-293, 344-352` |
| B16 | MindTwin "zihin okuma" | Kestirim ile "nihai" sayı aynı karede okunan aynı değişkendi; 146/146 benzetim turunda "okundu". | `web/app.js:590-596, 2252-2264` |

## 5.1.3 Sinyal işleme ve öğrenme kusurları

- **Zamanlama:** Kinematik, kamera karelerinde değil çizim döngüsünde hesaplanıyordu; yeni çıkarım
  olmayan çizim adımlarında eski noktalar yeni gözlem gibi işleniyor, hız kestirimi 0 ve 2× arasında
  salınıyordu (`web/app.js:2895-2947`).
- **Süzgeç:** 1‑euro süzgeci piksel ölçeğine göre ayarlanmış ama 0–1 normalize koordinatlarla
  besleniyordu; ölçümde ~1,3 Hz'lik sabit bir alçak geçiren gibi davranıp 2–3 Hz'lik salınımları
  0,35–0,49 kazanç ve 49–69 ms gecikmeyle geçirdi (`web/app.js:1004-1013`). En kritik zamanlama yolunda
  ~2 karelik gecikme demektir.
- **Karışım:** Uzman ağırlıkları yarı ömrü ~5 tur olan bir unutmayla güncelleniyordu; "sabit-paylaşım"
  olarak adlandırılan adım gerçekte skorları ortalamaya çeken bir işlemdi (`web/ml_engine.js:298-310`).
  Dizi modeli ayrıca *oynanmamış* bir oyundan öğreniyordu: kendi seçtiği ama uygulamanın kullanmadığı hamleyi
  yapay zekâ hamlesi sayıyordu (`web/ml_engine.js:644-661`).
- **Veri hijyeni:** El yokken oynanan turlar da puanlanıp öğrenmeye giriyordu (`handDetected` her zaman
  doğruydu).
- **Ölü kod:** `rps_engine.js` (945 satır) örnekleniyor ama hiç beslenmiyordu; "Q‑öğrenme" ağırlıkları
  güncelleniyor ama hiçbir kararda okunmuyordu.

## 5.1.4 Gizlilik, güvenlik ve erişilebilirlik

- Sayfa yüklenir yüklenmez kalıcı bir kimlik üretilip üçüncü taraf veritabanına gönderiliyor, her turdan
  sonra davranış profili ve tur telemetrisi yükleniyordu; bildirim, onay ya da devre dışı bırakma yoktu.
- Veritabanı satır düzeyi güvenlik ilkeleri `USING (true)` idi: istemciye gömülü anahtarla herkes bütün
  profilleri okuyabilir, üzerine yazabilir, silebilir durumdaydı; uzaktan gelen profil doğrulanmadan yerel
  duruma karıştırılıyordu.
- `localhost`'ta her 600 ms'de bulanıklaştırılmamış kamera karesi yerel bir hata ayıklama sunucusuna
  gönderiliyordu (yüz gizliliği ayarından bağımsız).
- Üretimde İçerik Güvenlik İlkesi ve İzin İlkesi başlıkları yoktu.
- Erişilebilirlik: sıfır ARIA özniteliği; yakınlaştırma kapalı (`user-scalable=no`) iken telefonlarda
  8–9 px yazı; ikincil metin rengi koyu yüzeylerde 3,4–4,1:1 karşıtlık (WCAG 1.4.3 başarısız); pencere
  düzeyindeki Boşluk tuşu dinleyicisi odaklanmış denetimlerin klavyeyle kullanımını engelliyordu.

## 5.1.5 Korunan değerler

Denetim yalnızca kusurları değil, yeniden kullanılacak sağlam parçaları da belirlemiştir: kamera hata
kurtarma akışı ve aygıt seçici; MediaPipe kurulumu (CPU/XNNPACK öncelikli, GPU yedekli, monoton zaman
damgaları, kendini onaran yeniden başlatma); eşzamanlı SHA‑256 gerçeklemesi; her aygıtta çalışan üç
aşamalı piramit + yumuşak geçişli yüz bulanıklaştırma ve düşük ışık için ten kümesi yedeği; `object-fit:
cover` izdüşümüyle iskelet çizimi; uzman tablosu ve Iocaine döndürmeleri fikri; Türkçe sesli geri bildirim;
5 turluk seri akışı. Bunlar yeni mimaride işlevleri korunarak modüllere taşınmıştır (Bölüm 5.2).

## 5.1.6 Aynı denetim v4'e uygulandı: bağımsız inceleme

Önceki sürümü denetleyip yeniden yazan bir çalışmanın kendi ürününü denetlemeden bırakması tutarsız olurdu.
v4 yazıldıktan ve o sıradaki test paketi (altmış yedi test) eksiksiz geçtikten sonra, kod **bağımsız bir
incelemeden** geçirilmiştir. İnceleme, Bölüm 5.1'deki denetimle aynı yöntemi izlemiştir: üç alan ayrı ayrı
incelenmiş (uygulama katmanı, tarayıcı bağdaştırıcıları, güvenlik ve gizlilik; dürüstlük değişmezleri ve tur
durum makinesi; matematik, istatistik ve öğrenme), kod okunmuş ve her şüphe, gerçek modülleri çağıran
atılabilir betiklerle **çalıştırılarak** sınanmıştır. İnceleme sırasında depodaki hiçbir dosya
değiştirilmemiştir. Sonuç 45 bulgudur (B1–B16 ile karışmaması için burada R1–R45 olarak anılır): 2 kritik,
8 yüksek, 17 orta, 18 düşük önemde. İki kritik bulgu aynı kusurdur ve iki inceleyici tarafından birbirinden
bağımsız bulunmuştur.

En önemli gözlem bulguların sayısı değil, türüdür: v3'te eleştirilen kusur sınıflarının her biri, daha
ince biçimlerde, v4'te de ortaya çıkmıştır — olduğundan güçlü ifade edilmiş bir güvence, ölçülmeyen
sayılar, başarısız olması olanaksız testler. Ve bunların hepsi, bütün testler geçerken vardı.

| Grup | Bulgular | Ne yanlıştı | Ne değişti | Regresyon testi |
|---|---|---|---|---|
| **Güvence delikleri** | R20, R21, R36 (ve R28) | Turnuva'da **geçerli bir tur kaybedilebiliyordu.** Kaybetmeme kuralı, hakemin hâlâ yasal saydığı ama YZ'nin kendi inancında kütlesi küçük olan bir sınıfı "olanaksız" sayıyordu; inanç yasal sınıflara hiç kütle vermediğinde ise hakemin çoktan dışladığı hamlelere göre oynuyordu. İnceleme iki saldırı kurmuştur: Makas gibi açıp yüzük ve serçeyi son anda açmak (6720 hükümde 192 oyuncu galibiyeti) ve YZ'yi erken açılmalarla eğitip sonra geç açmak (geçerli turların %44'üne varan kayıp). Ayrıca kullanıcıya açık "karar ufku" ayarı Turnuva'da da etkiliydi. Arayüz ve kod yorumları "geçerli turda kaybetmez" diyor, çekinceler yalnızca tez metninde duruyordu | Güvenlik artık inanca değil **hakemin yasal kümesine** göre belirlenir; yasal destek üzerinde düzgün geri düşüş; dondurma ufku kaybetmeme öncelikli ön ayarda yok sayılır; Teorem 1 yeniden yazılmıştır (Bölüm 4.7) | `turnuva cannot be beaten by opening ring and pinky at the last moment` (384 hüküm, 202 geçerli, 0 kayıp); `… by training the AI on early openings and then opening late` (160 / 81 / 0); `decision: safety follows the legal set of the referee, not the size of the belief`; `the decision freeze cannot void the turnuva guarantee …` |
| **Yaşam döngüsü** | R1–R7, R19 (ve R10, R14, R17) | **Kritik:** herhangi bir ayar, kip ya da profil değişikliğinden ya da demodan kameraya geçişten sonra oyun ölüyordu: yeniden kurulan motor tur numarasını 1'den başlatıyor, oturumun mühür kaydı o turu kapalı bulup hata fırlatıyor ve sayfa yenilenene kadar hiçbir tur hükme bağlanmıyordu. Ayrıca: kameradan demoya geçişte kamera açık kalıyordu; kamera başlatılırken açılan demonun sentetik turları **gerçek oyuncunun profiline yazılıyor ve buluta gönderiliyordu**; izleyici yüklenemediğinde kamera hata iletisinin arkasında açık kalıyordu; biten bir seri tur kabul etmeye devam ediyordu; kamerada ölçülen gecikme demoda gösteriliyordu; kamera kaybı hiç fark edilmiyordu | Tek mühür kaydı ve süren tur numaraları; kare kaynakları için kuşak sayacı; biten seri; ölçümlerin kaynağıyla düşmesi; kamera kaybı; motor hatasından kurtulma (Bölüm 5.4.1) | `a rebuilt engine on the same commit log continues the round numbering …`; `the game goes on after every kind of engine rebuild …`; `camera -> demo releases the device …`; `a demo started while the camera is still starting stays a demo …`; `a denied or failed camera start never leaves the device on …`; `losing the camera mid-session is reported …`; `a finished series accepts no further round …`; `metronome demo: a settings change during the count-in …` |
| **Tek atış kipi ve titreşim** | R22–R25, R34, R35 | Vuruş izleyicinin hız kestirimi neredeyse bir kare farkıydı; hareketsiz bir elin titreşimi bütün eşikleri aşabiliyordu. Tek atış kipinde bu **hayalet turlar** üretiyordu: oyuncu hiçbir şey yapmadan geçerli bir "Taş" turu hükme bağlanıyor, YZ'ye yazılıyor ve öğreniliyordu (60 kare/s'de 20 s'de 6 tur); denemelerin %36–85'i ise hiç hükme bağlanmıyordu. Taban çizgisine önceki turun açık eli sızıyordu; yumruk 1,2 s'den uzun bekletilince dedektör ızgarası tükeniyor ve faul %8,5'ten %21–24'e çıkıyordu; erken açanların %27'si iptal ediliyordu | İki hız kestirimi ve doğrulanan başlangıçlar; inişin üç sonu; yeniden tanımlanan yumuşak iniş (Bölüm 4.2); ızgara kaydırma (Bölüm 4.3); tek atış kuralları (Bölüm 4.4) | `a hand that only jitters starts neither strokes nor rounds, at any frame rate`; `stroke tracker: every descent ends as exactly one of bottom / weakBottom / falseStart`; `single-stroke mode: the fist baseline comes from the hold that armed the round …`; `single-stroke mode: waiting long before the throw does not blunt the referee; early openers are not aborted` |
| **D1'in kenar durumları** | R26, R27 (ve R15, R30) | Yaklaşık 92 kare/s'nin üzerinde, metronom kipinde, iniş karesi 24 karelik bir halkada arandığından inişten sonra atılmış bir mühür değerlendirilebiliyordu. Vuruşun hızlı bölümünü örten bir izleme boşluğundan sonra, el durmuşken gelen ilk kare "havada" sayılıyor ve mühür fiziksel inişten sonra atılabiliyordu. Sayım sırasında duraksayan kare akışı negatif öncelikli bir tur üretiyordu | "İniş sonrası" işareti turun eksiksiz kare listesinde, kare sırasına göre (ilk düzeltme buna bir zaman koşulu da eklemişti; o koşul kendi deliğini açtı ve kaldırıldı, aşağıda); boşluk sonrası iniş kuralı; kanıtın tazeliği (bayat kanıt → EL YOK, asla faul); metronom duraksaması (Bölüm 4.4) | `metronome mode at 120 and 144 fps: a late stroke never gets a post-landing commitment judged`; `a tracking gap over the fast part of the stroke voids the round …`; `metronome mode: a stall past the scheduled throw aborts the count-in …`; `single-stroke mode: a stroke hidden by a dropped frame is void, not a judged behavioural guess` |
| **Ölçüm dürüstlüğü** | R8, R11, R31, R37 (ve R32) | Mührün tek zaman damgası karenin yakalanma zamanıydı; özetin gerçekte ne zaman var olduğu hiçbir yerde ölçülmüyordu, dolayısıyla yayımlanan her "öncelik" kare → mühür gecikmesini yok sayıyordu. Buluta bilinmeyen ölçümler 0 olarak, düzgün bir inanç "Taş" kestirimi olarak gidiyordu. Sonuçtaki birkaç "ölçüm" sistematik olarak kayıktı ya da sabitti (izleme oranı hiçbir zaman 1 olamıyor; geriye dönük inişlerde kare hızı şişiyor; Taş için anlamsız bir "tamamlanmaya öncelik"; tutulan davranış mührünün oluşum oranı sabit 0). "Yenilmezlik" oranı, aralığı ve $p$ değeri YZ'nin kendi dedektörünün seçtiği örneklem üzerindeydi ve beceri ölçüsü gibi sunuluyordu. İptal edilen turların mühürleri açılıyor ama doğrulanmıyor ve oyuncuya gösterilmiyordu | Duvar saati damgası, kare → mühür gecikmesi ve duvar saati önceliği; `null` gönderimi; uçuş istatistiklerinin düzeltilmesi; koşulsuz oranlar ve arayüzdeki açıklama (Bölüm 4.10, 7.5); iptalde doğrulama | `I4: flight statistics count what was measured; undefined quantities are null`; `cloud payload: unknown values are null, a prediction is reported only when one was made`; `metrics: unconditional rates count every judged attempt; inconsistent documents are rejected`; `I3: an aborted round opens and verifies the seals it had shown`; duvar saati alanları `camera -> demo releases the device …` testinde sınanır |
| **Eşleşmiş simülatör ve zayıf testler** | R38 (ve R29, R45) | Simülatör dedektörün kendi üretici modelinden çekiliyordu; yayımlanan faul ve geçersiz oranları modeli kendisine karşı ölçüyordu ve bu iyimserlik nicelenmemişti. D5 testi gerçekte özdeş üç koşuyu karşılaştırıyordu: YZ'nin taahhüdünü okuyan bir hakemde de geçerdi. E1'in "en iyi yanıt" sütunu politika-dışı bir karşı-olgusaldı | Simülatöre `perturb` seçeneği ve E8 (Bölüm 6.8); taahhütleri gerçekten farklılaştıran D5 testi; E1'de iki kapalı döngü | `I5: with commitments that really differ, the referee decides the same` (60 senaryo; davranış mühürleri 58'inde, değerlendirilen hamleler 29'unda farklı). E8 bir test değil, deneydir |
| **Soğuk başlangıç** | R33, R40 | Gevşek açılan ya da varsayılan kalibrasyonun yanlış okuduğu bir elde Kâğıt hep BELİRSİZ ŞEKİL oluyor; geçersiz turlar hiçbir şey öğretmediğinden kalibrasyon düzelmiyordu (Kâğıt yaklaşık 100 deneme oynanamıyordu) | Sınıfa özgü şablon sapmaları; geçersiz turlardan algılayıcı kalibrasyonu (D6'nın inceltilmesi, Bölüm 4.9); sayımın, el açıkça açık olmadıkça başlaması (Bölüm 5.4) | `a relaxed open hand is readable, and the sensor calibration adapts even when the first rounds are void`; `a fist that the default calibration reads as half-open is not locked out: void first, then learned` |
| **Güvenlik ve gizlilik** | R4, R9, R12, R16 (ve R13, R18) | Veritabanının varsayılan ilkeleri bütün tabloları herkese açık anahtarla okunur, yazılır ve silinir bırakıyordu; "isteğe bağlı sıkılaştırma" bölümü ise istemcinin kendi yazma isteğini bozuyordu. Yüz gizliliği açık yönde hata veriyordu: görüntü dedektör yüklenmeden gösteriliyor, rozet dedektör olmasa da "açık" diyor, tek bir çizer hatası bulanıklığı donduruyordu; yüz dedektörü her mührü geciktiriyordu. Bulut kararı iki yere bölünmüştü. Uydurma sayılar içeren tasarım taslakları yayımlanıyor, İçerik Güvenlik İlkesi bütün bir CDN'e ve bütün Supabase projelerine izin veriyordu | Tek doğrulayan işlev ve kilitli tablolar; yüz gizliliğinin üç durumu ve "önce motor, sonra bulanıklaştırma" sırası; bulut kararının tek yerde verilmesi; daraltılmış ilke; depo aynası (Bölüm 5.8, 5.5) | `the optional sync is decided in one place: consent, a real player and an allowed host`; `storage: one failed write does not turn the current settings and profile into defaults`. SQL bir veritabanında çalıştırılmamış, yüz gizliliği ve ilke yalnızca elle (sentetik video akışıyla) denenmiştir: bunların otomatik testi **yoktur** |
| **Diğer** | R39, R41–R44 | Depo ön sayfası hâlâ önceki sürümü ve uydurma sayılarını anlatıyordu. Füzyon ağırlıkları tek bir ıskayla kalıcı olarak düşüyordu. Düğüm sınırlı CTW bir olasılık modeli değildi ve testi bunu saptayamıyordu. Saklama–yükleme, geçmiş sınırı aşıldığında kesin değildi. Tutarsız bir ölçüt belgesi kabul ediliyordu | README yeniden yazıldı; gradyan kırpma; düğüm sınırının kaldırılması (ağaç yapı gereği sınırlıdır: derinlik 6 için en çok 1093 düğüm) ve normalize edilmemiş kütlenin sınanması; sınırın belgelenmesi; belgenin tutarlılık denetimi | `fusion weights: one confident miss cannot outweigh many confident hits`; `CTW: predictions are exact probabilities (sum to 1) …`; `metrics: … inconsistent documents are rejected` |

**İncelemenin sağlam bulduğu parçalar** da kayda geçmiştir: taahhüt kaydının bağlayıcılığı, gizleyiciliği ve
zinciri; olağan yollarda D1; hakemin YZ'nin taahhüdünden bağımsızlığı (gerçekten farklılaştırılmış
taahhütlerle sınandığında da); D6; sayısal yardımcılar, Kalman cebri, dedektörün olabilirlik yinelemesi,
CTW'nin (sınırsız hâliyle) kaba kuvvet karışımıyla eşleşmesi, güvenli sömürü sınırı; üretim başlıkları
altında sayfanın ilke ihlali olmadan açılması.

**Düzeltmelerden sonra.** Test paketi sekiz dosyada 105 teste çıkmıştır; iki yeni dosya, yeniden
üretilebilen her bulgu için bir regresyon testi içerir (Bölüm 5.7). İncelemenin kendi betikleri düzeltilmiş
kod üzerinde yeniden koşulmuştur (simülasyon): elle kurulmuş 6000 kare dizisinden oluşan bulanık
sınama, aşağıdaki üç deliğin düzeltmelerinden sonra bugünkü kodla yinelenmiştir: 5904 hüküm, 1420
geçerli tur, sıfır oyuncu galibiyeti; istisna, sonlu olmayan sayı, pozitif olmayan öncelik ya da
doğrulanamayan mühür yok. Bütün deneyler yeniden üretilmiş,
Bölüm 6 baştan yazılmıştır.

**İncelemeden sonra bulunan üç delik (üçü de kapatılmıştır).** İnceleme ve düzeltmeleri bittikten
sonra, Teorem 1'in ispatı kodla adım adım karşılaştırılırken Turnuva güvencesinde iki delik daha, metnin
son doğrulamasındaki bir saldırı denetiminde de motorun programlama arayüzü düzeyinde bir üçüncüsü
bulunmuştur. Ayrıntıları, yeniden üretim sayıları ve regresyon testleri Bölüm 4.7'dedir; özeti şudur:

| Delik | Nasıl bulundu | Ne yanlıştı | Yeniden üretim (elle kurulmuş kareler; simülasyon) | Düzeltme ve regresyon testi |
|---|---|---|---|---|
| Tek atış kipinde görülmeyen vuruş | Metin yazılırken, ispatın 2. adımı kodla karşılaştırılırken | Kurulmuş bekleyişin kareleri "havadaki kare" sayılıyor ama YZ o karelerde revize etmiyordu; tek bir düşen kareye sığan bir vuruşta son havadaki kare bir bekleyiş karesi oluyor ve hiç revize edilmemiş davranış mührü yasal bir Taş'a karşı hükme bağlanıyordu | 20 ve 30 kare/s'de 40'ar denemede 17 oyuncu galibiyeti, 14 YZ galibiyeti, 9 beraberlik; düzeltmeden sonra 15, 20 ve 30 kare/s'de 40'ta 40 EL YOK | Hakem, son havadaki karesinde revizyon adımına ulaşılmamış turu geçersiz sayar (Bölüm 4.4). `single-stroke mode: a stroke hidden by a dropped frame is void, not a judged behavioural guess` |
| Yuvarlanmış mühür zamanı | Metnin olgu denetiminde, ispatın 3. adımı kodla karşılaştırılırken | "İniş sonrası" işareti mühürdeki, $0{,}1$ ms'ye yuvarlanmış zamana da bakıyor, hakem ise son havadaki kareyi yuvarlanmamış kare zamanıyla seçiyordu; metronom kipinde ilan edilmiş atış anından $0{,}05$ ms'den kısa süre önce yakalanan karede atılan mühür değerlendirme dışı kalıyor ve bir önceki mühür kaybedebiliyordu | Son havadaki kare atış anının $0{,}02$ ms öncesinde, 800 tur: o karedeki 244 mührün 244'ü değerlendirme dışı, 108 oyuncu galibiyeti; düzeltmeden sonra 800 tur, 244 mühür, 0 değerlendirme dışı, 0 oyuncu galibiyeti (359 YZ galibiyeti, 441 faul) | "İnişten önce" her iki tarafta yalnızca kare sırasıyla belirlenir; dizini ilerlemeyen kare atılır (Bölüm 4.4). `metronome mode: a frame a few hundredths of a millisecond before the scheduled landing keeps its seal`; `frames must advance in index as well as in time …` |
| Atılamayan mühür | Metnin son doğrulamasında, ispatı kodla kırmaya çalışan bir saldırı denetiminde | "Revizyon adımına ulaşıldı" işareti mühür atılmadan önce konuyordu; taahhüt kaydı mührü reddederse (mühürlenemeyen kare dizini ya da zamanı, bozulan nonce kaynağı) istisnayı yutup motoru beslemeyi sürdüren bir çağıran için tur eski mühür üzerinden hükme bağlanıyordu. Uygulama bu yola girmiyordu (denetleyici turu iptal edip motoru yeniden kurar). Ön ayar adı denetimi kalıtılmış nesne anahtarlarını da kabul ediyordu | Nonce bozulmasında 40 turun 40'ı davranış mührü üzerinden: 17 oyuncu galibiyeti; dizinler $2^{53}$'ü aşınca 60 turda 23, zaman sınırında 40 turda 17 oyuncu galibiyeti; düzeltmeden sonra nonce bozulmasında 26 iptal, 14 hüküm, 0 oyuncu galibiyeti; sınırı aşan kareler motora girmez | İşaret revizyon adımının sonunda konur; atılamayan mühür turu iptal eder (`ENGINE_ERROR`), gösterilmiş mühürler açılıp doğrulanır; motor yalnızca mühürlenebilir kareleri kabul eder; yalnızca üç adlı ön ayar geçerlidir (Bölüm 4.7, (c)). `a seal that cannot be made aborts the round; …`; `frames the commit log could not seal are ignored …`; `only the three named presets are accepted …` |

Aynı sırada teoremin sayısal sınır koşulu da kaldırılmıştır: hakem büyüklüğünün tam olarak $\tfrac12$
çıktığı durum artık "açık" sayılır, böylece Turnuva'da yasal küme hiçbir değerde üç sınıf içermez
(`the legal set never holds three throws under turnuva, not even at a heading of exactly one half`). Bu
durum bir kayıp olarak üretilmemişti; değişiklik teoremi koşulsuz kılmak içindir (Bölüm 4.7). Kullanıcı
arayüzündeki Turnuva açıklaması da hakemin gerçekte yaptığını söyleyecek biçimde düzeltilmiş (Bölüm 7.5)
ve dışa aktarıma tur kayıtları eklenmiştir (Bölüm 5.5).

**Uygulama katmanında sonradan bulunan bir kilitlenme (giderilmiştir).** Son doğrulama sırasında bir yaşam
döngüsü testi (`an aborted round clears the live strip; …`) yüklü makinede ara sıra başarısız oldu. Neden
yeni motor değişikliği değildi: aynı test bir önceki işlemenin koduyla da, dört koşu paralel yürütülürken,
20 koşunun 2'sinde başarısız oldu. Koşu sırasındaki tanılama dökümleri ve elle sürülen bir saatle yapılan
deterministik sahneleme nedeni gösterdi: tek atış kipinde motor dinlenen bir yumrukta kendiliğinden kurulur,
kamerasız demonun sentetik oyuncusu ise yeni bir atışı yalnızca motor BOŞTA iken planlıyordu. Motor
oyuncunun atışı olmadan kurulduğunda — bir pencerenin arkasında bekleyen yumrukta ya da oyuncu saatin
gerisindeyken iptal edilen turdan kalan karelerde — ikisi birbirini süresiz bekliyor ve oyun duruyordu;
hiçbir tur yanlış hükme bağlanmıyordu. Eski kodla iptal sahnelemesinde 60 senaryonun 12'si (40 kat hızlı
demoda 15 ms'lik, yani oyun zamanıyla 600 ms'lik bir duraksamada 12 tohumun 12'si), pencere sahnelemesinde
(tek atış kipi, pencere oyun zamanıyla yaklaşık 10 s açık) 6 tohumun 6'sı ve tek atış kipine geçişi de
içeren yeniden kurulum dizisinde 486 adımın 14'ü (hepsi tek atış kipinde) kilitlendi; düzeltmeden sonra
0/60, 0/6 ve 0/500. Düzeltme: sentetik oyuncu, kuyruğu boşaldığında motor hâlâ bir atış bekliyorsa (BOŞTA ya da, tek
atış kipinde, kurulmuş) yeniden atar. Yük altındaki aynı test düzeninde, düzeltmeden önce 24 koşunun
4'ünde görülen başarısızlık, düzeltmeden sonra 24 koşunun hiçbirinde görülmemiştir. Regresyon testi: `demo,
single-stroke mode: the synthetic player never waits for an engine that is waiting for it`. Düzeltmeden
önceki yüklü koşularda bir kez de yeniden kurulum testi süre sınırını motor BOŞTA iken aşmıştır; bu durum
deterministik sahnelemede yeniden üretilememiş, düzeltmeden sonraki koşularda da görülmemiştir.

**Geriye kalanlar** gizlenmemelidir:

- Zayıf atışlarda (yumuşak iniş) varsayılanın 2–3 katı görüntü gürültüsünde, yaklaşık 370 geçerli turun
  1–2'sinde değerlendirilen mühür simülasyondaki gerçek inişten sonra atılmıştır (varsayılan gürültüde 0).
- Tek atış kipinde kurulma için sıkı eşik ($0{,}4$) korunmuştur (daha gevşeği, kadrajda dinlenen gevşek bir
  elde kur–iptal döngüsüne girerdi); bu kip, yumruğu çok yanlış okunan bir eli hâlâ dışarıda bırakabilir.
- Kare düşmesinin bedeli EL YOK hükümleridir (hızlı bir denetimde %8 taban düşme oranında denemelerin
  yaklaşık %13'ü; %15'te Bölüm 6.4).
- Teorem 1'in bilinen bir koşulu ya da açık bir kusuru kalmamıştır; ama bu, yazarlarının kendi okumasının
  sonucudur. İspatın 4. adımının (hakemin, YZ'nin kullandığı sayıların aynısını okuması) kendine ait bir
  testi yoktur ve ispat adımlarını rastgele kare dizileri üzerinde doğrudan savlayan bir sınama
  yazılmamıştır (Bölüm 5.7, 9.2).
- Raporlanan öncelik $0{,}1$ ms'ye yuvarlanmış mühür zamanından hesaplanır; metronom kipinde, son havadaki
  kare ilan edilmiş atış anının $0{,}05$ ms'den yakınındaysa $0{,}0$ ms okunabilir (Bölüm 4.7).
- İkinci bir bağımsız inceleme yapılmamıştır; inceleme sonrasında eklenen kod (otuzu aşkın yeni test ve
  motordaki düzeltmeler; incelemeden sonra bulunan üç deliğin düzeltmeleri dâhil) yalnızca yazarlarının
  testlerinden ve Teorem 1'in ispatını hedef alan son saldırı denetiminden geçmiştir.
- Gerçek kamera, gerçek el, gerçek veritabanı: hiçbiri sınanmamıştır (Bölüm 8.2).

Bu alt bölüm tezin savının parçasıdır: "dürüstlük değişmezleri kodda zorlanmış ve testlerle doğrulanmıştır"
cümlesi ilk v4 için de yazılmıştı ve yanlıştı. Doğrulama, onu yazanların testleriyle değil, onu kırmaya
çalışan bağımsız bir okumayla anlam kazanır; bu inceleme de son söz değildir — yukarıdaki üç delik,
inceleme ve düzeltmeleri bittikten sonra, o sıradaki bütün testler geçerken bulunmuştur.
