# 5.1 Önceki Sürümün Denetimi

Yeniden tasarımın gerekçesi, önceki sürümün (`d511799` işlemesi, "JankenMind v3.1 / CognitiveBrain v3")
kod düzeyinde denetimidir. Denetim dört bağımsız inceleyiciyle yapılmış, bulguların önemli bölümü kod
gerçekten çalıştırılarak doğrulanmıştır. Toplam 199 özellik/davranış envantere alınmış, 197 kusur kaydı
açılmıştır (inceleyicilerin alanları kesiştiği için aynı kusur birden fazla kayıtta geçebilir); kayıtların
21'i kritik, 68'i yüksek önem derecesindedir. En büyük sınıf "bilimsel dürüstlük"tür (66 kayıt):
kullanıcıya gösterilen ya da saklanan bir değerin ölçülmek yerine üretilmesi. Aşağıda yeniden tasarımı doğrudan belirleyen bulgular özetlenmiştir (satır numaraları
`d511799`'daki dosyalara aittir).

Bölüm 5.1.1–5.1.5 önceki sürümün denetimidir. Bölüm 5.1.6, aynı türden bir denetimin yeniden tasarımın
kendisine (v4'e) uygulanmasını, bulduğu kusurları ve bunların nasıl giderildiğini anlatır. Bölüm 5.1.7,
v4'ün gerçek bir kamerayla ilk kullanımında bildirilen sorunları, ardından yapılan değişiklikleri ve bu
değişikliklerin yayından önceki incelemesini anlatır.

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
5 turluk seri akışı. Bunlar yeni mimaride işlevleri korunarak modüllere taşınmıştır (Bölüm 5.2). Bunlardan
MediaPipe kurulumunun CPU öncelikli sırası ile yüz bulanıklaştırma ve ten kümesi yedeği sonradan
değiştirilmiştir: gerçek kamerada ilk denemede bildirilen sorunların en olası kaynakları bunlar çıkmıştır
(Bölüm 5.1.7). El izleyici artık önce GPU'da kurulur; yüz dedektörü kaldırılmış, yüz bulanıklaştırmanın
yerini yalnızca elin net kaldığı bir gizlilik görüntüsü almıştır.

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
| **Güvenlik ve gizlilik** | R4, R9, R12, R16 (ve R13, R18) | Veritabanının varsayılan ilkeleri bütün tabloları herkese açık anahtarla okunur, yazılır ve silinir bırakıyordu; "isteğe bağlı sıkılaştırma" bölümü ise istemcinin kendi yazma isteğini bozuyordu. Yüz gizliliği açık yönde hata veriyordu: görüntü dedektör yüklenmeden gösteriliyor, rozet dedektör olmasa da "açık" diyor, tek bir çizer hatası bulanıklığı donduruyordu; yüz dedektörü her mührü geciktiriyordu. Bulut kararı iki yere bölünmüştü. Uydurma sayılar içeren tasarım taslakları yayımlanıyor, İçerik Güvenlik İlkesi bütün bir CDN'e ve bütün Supabase projelerine izin veriyordu | Tek doğrulayan işlev ve kilitli tablolar; yüz gizliliğinin üç durumu ve "önce motor, sonra bulanıklaştırma" sırası (ikisi de yüz dedektörü sonradan kaldırılınca konusuz kalmıştır; güvenli yönde hata korunmuştur, Bölüm 5.1.7); bulut kararının tek yerde verilmesi; daraltılmış ilke; depo aynası (Bölüm 5.8, 5.5) | `the optional sync is decided in one place: consent, a real player and an allowed host`; `storage: one failed write does not turn the current settings and profile into defaults`. SQL bir veritabanında çalıştırılmamış, yüz gizliliği ve ilke yalnızca elle (sentetik video akışıyla) denenmiştir: bunların otomatik testi **yoktur** |
| **Diğer** | R39, R41–R44 | Depo ön sayfası hâlâ önceki sürümü ve uydurma sayılarını anlatıyordu. Füzyon ağırlıkları tek bir ıskayla kalıcı olarak düşüyordu. Düğüm sınırlı CTW bir olasılık modeli değildi ve testi bunu saptayamıyordu. Saklama–yükleme, geçmiş sınırı aşıldığında kesin değildi. Tutarsız bir ölçüt belgesi kabul ediliyordu | README yeniden yazıldı; gradyan kırpma; düğüm sınırının kaldırılması (ağaç yapı gereği sınırlıdır: derinlik 6 için en çok 1093 düğüm) ve normalize edilmemiş kütlenin sınanması; sınırın belgelenmesi; belgenin tutarlılık denetimi | `fusion weights: one confident miss cannot outweigh many confident hits`; `CTW: predictions are exact probabilities (sum to 1) …`; `metrics: … inconsistent documents are rejected` |

**İncelemenin sağlam bulduğu parçalar** da kayda geçmiştir: taahhüt kaydının bağlayıcılığı, gizleyiciliği ve
zinciri; olağan yollarda D1; hakemin YZ'nin taahhüdünden bağımsızlığı (gerçekten farklılaştırılmış
taahhütlerle sınandığında da); D6; sayısal yardımcılar, Kalman cebri, dedektörün olabilirlik yinelemesi,
CTW'nin (sınırsız hâliyle) kaba kuvvet karışımıyla eşleşmesi, güvenli sömürü sınırı; üretim başlıkları
altında sayfanın ilke ihlali olmadan açılması.

**Düzeltmelerden sonra.** Test paketi sekiz dosyada 105 teste çıkmıştır (Bölüm 5.1.7'deki değişiklikten
sonra bugün dokuz dosyada 113 test vardır); iki yeni dosya, yeniden üretilebilen her bulgu için bir
regresyon testi içerir (Bölüm 5.7). İncelemenin kendi betikleri düzeltilmiş kod üzerinde yeniden
koşulmuştur (simülasyon): elle kurulmuş 6000 kare dizisinden oluşan bulanık
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
  testlerinden ve Teorem 1'in ispatını hedef alan son saldırı denetiminden geçmiştir. Sonradan yapılan
  kamera değişikliği ise yayından önce ayrıca incelenmiştir; o inceleme yalnızca bu değişikliği kapsar
  (Bölüm 5.1.7).
- Gerçek veritabanı sınanmamıştır. Gerçek kamera ve gerçek elle ilk deneme sonradan proje sahibi
  tarafından yapılmış ve başarısız olmuştur: bildirilen sorunların en olası nedenleri giderilmiş,
  değişiklikten sonraki yeniden deneme ise henüz yapılmamıştır (Bölüm 5.1.7, 8.2).

Bu alt bölüm tezin savının parçasıdır: "dürüstlük değişmezleri kodda zorlanmış ve testlerle doğrulanmıştır"
cümlesi ilk v4 için de yazılmıştı ve yanlıştı. Doğrulama, onu yazanların testleriyle değil, onu kırmaya
çalışan bağımsız bir okumayla anlam kazanır; bu inceleme de son söz değildir — yukarıdaki üç delik,
inceleme ve düzeltmeleri bittikten sonra, o sıradaki bütün testler geçerken bulunmuştur.

## 5.1.7 Gerçek kamerada ilk deneme

Bölüm 5.1.6'daki inceleme ve düzeltmelerin hiçbiri gerçek bir kamerayla yapılmamıştı; kamera yolu yalnızca
sentetik bir video akışıyla duman testinden geçirilmişti (Bölüm 5.7). Uygulama gerçek bir kamerayla ilk kez
11 Kasım 2026'da, yayındaki sitede, proje sahibi tarafından Windows yüklü bir masaüstü bilgisayarda
Chrome/Edge ile denenmiştir. Deneme ölçüm aracı olmadan yapılmıştır; aşağıdaki belirtiler proje sahibinin
bildirimidir: (i) hızlı harekette elin algılanmaması, (ii) iskeletin hiç görünmemesi, (iii) belirgin gecikme
ve (iv) bulanıklığın elin önüne gelmesi. Proje sahibi bunun üzerine gizlilik için yeni bir tasarım seçmiştir:
yalnızca el net, geri kalan her şey bulanık.

**Ölçümler.** Nedenleri aramak için aynı bilgisayarda (20 mantıksal işlemci), ama Chrome/Edge'de değil
geliştirme ortamının yerleşik Chromium tarayıcısında, MediaPipe Tasks Vision 0.10.14 ile kare başına çıkarım
süreleri iki temsilcide (MediaPipe'ın `delegate` seçeneği: çıkarımın çalıştığı birim) ölçülmüştür. Girdi el
içermeyen $640\times480$ sentetik karelerdir: el bulunmadığından avuç dedektörü her karede çalışır; bu,
uygulamanın el aradığı durumdur (el izlenirken kare başına süre ayrıca ölçülmemiştir). Her satır, 10 ısınma karesinden sonra ölçülen 80 kareye dayanır (değişiklikten sonra,
makine yüklüyken yinelenen ölçüm **Doğrulama** başlığı altındadır):

| Model | Temsilci | Medyan | 90. yüzdelik |
|---|---|---|---|
| El izleyici (`GestureRecognizer`) | CPU (XNNPACK) | 47,4 ms | 60,3 ms |
| El izleyici (`GestureRecognizer`) | GPU (WebGL2) | 16,4 ms | 17,6 ms |
| Yüz dedektörü (BlazeFace, kısa menzil) | CPU | 9,6 ms | 10,9 ms |
| Yüz dedektörü (BlazeFace, kısa menzil) | GPU | 6,5 ms | 7,2 ms |

Eski boru hattı her kamera karesinde, ana iş parçacığında, önce el izleyiciyi CPU temsilcisinde, ardından
yine CPU'da yüz dedektörünü (son çalışmasından bu yana en az 28 ms geçmişse, yani neredeyse her karede)
çalıştırıyordu: kare başına yaklaşık 57 ms (47,4 + 9,6), yani saniyede en çok yaklaşık 17 işlenen kare.
Buna, yüz bulunamadığı sürece üç karede bir yapılan ten rengi taraması ($64\times48$ piksellik bir kare
üzerinde `getImageData`) ve bulanıklığın çizimi ekleniyordu.

**Tanı.** Aşağıdakiler ölçümlere ve koda dayanan en olası açıklamalardır; hiçbiri gerçek bir el ve kamerayla
yeniden üretilmemiştir.

- *Hız: (i) ve (iii).* Saniyede en çok yaklaşık 17 işlenen karede hızlı bir vuruş, eli iki işlenen kare
  arasında, izleyicinin bir önceki kareden çıkardığı ilgi bölgesinin (kırpımın) izleyebileceğinden daha
  uzağa taşır. İzleyici eli yitirir ve hareket bulanıklığına uğramış bir avucu yeniden saptamak zorunda
  kalır: avuç dedektörü yalnızca el yitirildiğinde çalışır [Zhang2020] ve model hareket bulanıklığı altında
  sınanmamıştır [MediaPipeHandCard2021]. Görüntünün üzerine çizilenler de videonun gerisinde kalır.
- *Elin üzerindeki bulanıklık: (iv).* Yüz dedektörü 0,16 güven eşiğiyle çalışıyor ve **her** saptama
  bulanıklaştırılıyordu. Yüz bulunamayan 8 kareden sonra bir ten rengi kümesi devreye giriyordu; taramada
  elden dışarıda tutulan yalnızca, her yönde kare boyutunun 0,12'si kadar büyütülmüş sınır kutusuydu.
  İkisi de ele ya da kola düşebilir.
- *İskeletin hiç görünmemesi: (ii).* Bu belirti yeniden üretilmemiştir (bunun için gerçek bir el ve kamera
  kullanılamamıştır) ve ölçüm ya da kod düzeyinde ayrı bir kanıtı yoktur. (i) ile tutarlıdır: her vuruşta
  yitirilen bir el, hareket ettiği sürece iskelet göstermez.

**Değişiklikler.** Aşağıdaki liste son hâli anlatır; yayından önceki incelemenin bulduğu kusurlar (K1–K6)
ve düzeltmeleri listenin ardından ayrıca verilmiştir.

- *El izleyici.* İzleyici önce GPU temsilcisinde kurulur; CPU yedektir. Model yüklendikten sonra
  $64\times64$ boş bir tuval üzerinde üç ısınma çıkarımı yapılır; böylece GPU gölgelendiricilerinin
  derlenmesi ilk kamera karelerine düşmez. Çalışma sırasında art arda 15'ten fazla hata olursa izleyici
  öteki temsilcide yeniden kurulur. Kullanılan temsilci, kare hızı rozetinin araç ipucunda gösterilir ("El
  izleyici: ekran kartı (GPU) · kare başına N ms"). Her kare işlendiği temsilciyi de taşır; izleyici öteki
  temsilcide yeniden kurulduğunda araç ipucu da yenisini adlandırır.
- *Yüz dedektörü kaldırılmıştır.* Modül (`web/js/platform/face_privacy.js`) ve model
  (`web/models/blaze_face_short_range.tflite`) silinmiştir; kameranın açılması artık dedektörü en çok 6 s
  beklemez.
- *Gizlilik, proje sahibinin seçtiği biçimde yeniden tasarlanmıştır* (`web/js/platform/hand_focus.js`;
  varsayılan olarak açık; Bölüm 5.8). Görüntünün tamamı odak dışı çizilir, yalnızca izlenen el net kalır;
  izlenen el yokken her şey bulanıktır. Arka plan için kare, yüksek nitelikli yumuşatmayla iki adımda
  küçültülür (önce 128, sonra 32 sütuna; satır sayısı en-boy oranından), böylece tek tek noktalar
  örneklenmez, ortalanır. Küçük kare, kenarları kararmasın diye 4 hücrelik bir dolguyla çevrilir (dolgunun
  altında karenin gerilmiş bir kopyası vardır), bu boyutta bir kez daha 1,6 hücre bulanıklaştırılır ve
  yumuşatılarak yeniden büyütülür. Bu son bulanıklaştırmayı `ctx.filter` bulunan tarayıcılarda tuvalin
  süzgeci, bulunmayanlarda 40 sütunluk dolgulu ara bellek üzerinde JavaScript'te küçük, ayrılabilir bir
  Gauss süzgeci aynı sigmayla yapar. Sonuç, Gauss sigması kare genişliğinin yaklaşık %5'i (640 piksellik
  bir karede yaklaşık 32 piksel) olan bir bulanıklıktır: yüzler, yazılar ve oda yumuşak renk alanlarına
  dönüşür. Net bölge, 21 kemik boyunca uzanan ve yarıçapı 0,22 × ref olan kapsüllerden, avuç çokgeninden
  (0, 1, 2, 5, 9, 13 ve 17 numaralı noktalar) ve yarıçapı 0,36 × ref olan bir bilek diskinden oluşur; kenar
  yumuşatması 0,09 × ref kadardır (tuval süzgeci olmayan tarayıcılarda kenar yumuşatılmaz; bu yalnızca
  görünüşü etkiler, bölge aynıdır). Burada ref, avuç boyunun (bilekten orta parmağın MCP eklemine), eklem
  noktalarının sınır kutusunun büyük kenarının 0,45 katının ve 14 pikselin en büyüğüdür. Maske, tuvalin
  dışına kenar yumuşatmasının üç katı (en az 3 piksel) kadar uzatılmış bir bölgede hesaplanır; sahnenin
  kenarından taşan bir el böylece o kenarda da net kalır. Bölgeyi izlenen karenin ham (süzülmemiş)
  noktaları belirler; iskelet yine süzülmüş noktalarla çizilir.
- *Çizilen görüntü izlenen karedir.* Kamera kaynağı izlediği her kareyi bir kez bir tuvale kopyalar; el
  izleyici bu kopya üzerinde çalışır, çizer de bu kopyayı çizer. Net bölge böylece tam olarak çizildiği
  karenin noktalarından hesaplanır ve hızlı vuruşlarda elin gerisinde kalmaz; bedeli, gösterilen görüntünün
  canlı kameranın bir izleyici çıkarımı kadar gerisinde kalmasıdır. İlk izlenen kare gelene kadar çizer
  canlı video öğesini kullanır.
- *Derinlemesine savunma.* Gizlilik açık olduğu her an video öğesinin kendisi de CSS ile bulanıklaştırılır
  (28 piksel): kamera açılırken ve el izleyici yüklenirken, sahneyi örten %90 opak yükleme kapısının
  arkasında da. Kare kopyası `drawImage` ile alınır ve CSS süzgeçleri `drawImage`'ı etkilemez; izleyici de
  çizer de ham kareyi görür. Çizer öğeyi tamamen örter; ilk çizimden önce ya da çizim durursa görünen, CSS
  ile bulanıklaştırılmış videodur. Gizlilik kapatıldığında tuval o karede temizlenir; canlı videonun
  üzerinde eski gizli görüntü kalmaz. Güvenli yönde hata korunmuştur: çizer hata verirse görüntü gizlenir.
  Kamera sahnesindeki rozet "Yalnızca el net", "Gizlilik kapalı" ya da "Gizlilik çizilemedi · görüntü
  kapatıldı" der; "Yüz gizleme: yaklaşık bölge" durumu artık yoktur (Bölüm 7.7).

İncelemenin R9 ve R18 bulguları (yüz gizliliği rozetinin durumları; bulanıklaştırma ile motorun sırası)
kaldırılan yüz dedektörüne ve çizerine ilişkindi; Bölüm 5.1.6'da onlar için yapılan düzeltmeler bu
değişiklikle konusuz kalmıştır. Arkalarındaki iki ilke korunmuştur: rozet yalnızca doğru olanı söyler ve
gizlilik çizilemezse görüntü gösterilmez.

**Yayından önceki inceleme.** Değişiklik yayımlanmadan önce üç bağımsız inceleyici tarafından incelenmiştir
(alanlar: gizlilik; çizimin doğruluğu; el izleyici ve bütünleştirme); her bulgu ayrıca ayrı bir çürütme
girişimiyle sınanmıştır. Doğrulanan 12 bulgu altı kusurda birleşir (belirtilerle ve R1–R45 ile
karışmaması için burada K1–K6 olarak anılır); altısı da yayından önce giderilmiştir:

| # | Ne yanlıştı | Düzeltme | Otomatik test |
|---|---|---|---|
| K1 | El izlenmiyorken gizlilik kapatılırsa son gizli görüntü canlı videonun üzerinde donup kalıyordu | Tuval, gizliliğin kapandığı karede temizlenir | Yok (görünüm katmanı) |
| K2 | CSS koruması ancak izleme başladığında uygulanıyordu: kamera açılırken ve el izleyici yüklenirken bulanıklaştırılmamış video, %90 opak yükleme kapısının arkasından parlaklığının yaklaşık %10'uyla görünüyordu | Koruma, gizlilik açık olduğu her an uygulanır | Yok (görünüm katmanı) |
| K3 | Net bölge izlenen karenin noktalarından hesaplanıyor, ama çizim anında video öğesinin gösterdiği kareye çiziliyordu; hızlı vuruşlarda net bölge elin gerisinde kalıyordu | Kamera kaynağı izlediği her kareyi bir kez bir tuvale kopyalar; izleyici de çizer de bu kopyayı okur (görüntü, canlı kameranın bir izleyici çıkarımı gerisindedir) | Yalnızca çizerin kare boyutunu bir tuval kopyasından da okuması: `frame size: a video counts only once it has a frame; a canvas copy by its size`; kopyalama ve çizim tarayıcı gerektirir |
| K4 | Tuval süzgeci olmayan tarayıcılarda arka plan amaçlanandan yaklaşık beş kat az bulanıklaşıyordu | Oralarda aynı 1,6 hücrelik sigmayı, 40 sütunluk dolgulu ara bellekte, JavaScript'teki küçük ve ayrılabilir bir Gauss süzgeci uygular; küçültme de iki adımlıdır (128, sonra 32 sütun) ve yüksek nitelikli yumuşatmayla noktaları örneklemek yerine ortalar. Maskenin kenarı oralarda sert kalır (görünüşe ilişkin; bölge aynıdır) | `fallback blur (browsers without canvas filters): Gaussian of the requested width, energy kept, edges clamped` |
| K5 | Sahnenin kenarından taşan bir elin net görüntüsü o kenarda yaklaşık yarıya kadar soluyordu | Maske, tuvalin dışına kenar yumuşatmasının üç katı (en az 3 piksel) uzatılmış bir bölgede hesaplanır | Yok (tuvale çizim tarayıcı gerektirir) |
| K6 | İzleyici öteki temsilcide yeniden kurulduktan sonra durum göstergesi eski temsilciyi adlandırmayı sürdürüyordu | Her kare temsilciyi taşır, gösterge onu izler | `the controller follows a tracker that moved to the other processor (status chip)`; kamera kaynağı testi de akış ortasında temsilci değiştiren bir izleyiciyle genişletilmiştir |

**Doğrulama.** `tests/camera_privacy.test.js` dosyasındaki sekiz otomatik testten ilk beşi şunları sınar:
`object-fit: cover` izdüşümü tuvali doldurur, ortalanır ve en-boy oranını korur; net bölge, 45 pozun her
birinde (açık el, yumruk ve Makas; her biri beş dönme ve üç konumda) bütün eklem noktalarını ve kemikleri
paylı olarak içerir; parmak eklemleri kameraya dönük (avucu kısalmış görünen) bir yumruk da parmakları
kadar geniş bir kapsül alır; bozuk eklem noktaları net bölge vermez; kamera kaynağı hiçbir bekleme süresi
olmadan açılır, her karede kullanılan temsilciyi bildirir (izleyici akış ortasında öteki temsilciye
geçtiğinde de), çizere ham, iskelete süzülmüş noktaları verir. Kalan üçü yukarıdaki tablodadır (K3, K4,
K6). Test paketi dokuz dosyada 113 teste çıkmıştır ve 113'ü de geçmiştir (bu metnin son denetimindeki
koşularda toplam süre 15,2 s ve 16,2 s).

Çizer, son hâliyle, yerleşik tarayıcıda sentetik girdiyle denetlenmiştir: her yerinde sert 2 piksellik
çizgiler, yazı ve yüze benzer bir disk bulunan $640\times480$ bir kare, sentetik eklem noktaları ve
$800\times600$ bir tuval. Yatay parlaklık gradyanının ortalama mutlak değeri (büyüdükçe görüntü keskindir)
kaynak karede 125,0, el bölgesinin içinde 72,0, elden uzakta 0,09, elden uzaktaki yüze benzer diskin
üzerinde 0,26, el yokken bütün görüntüde 0,09'dur; çizim başına JavaScript süresi 0,15 ms'dir (GPU'daki
çizim süresi ölçülmemiştir). El izleyicinin kare başına maliyeti aynı yöntemle (el içermeyen
$640\times480$ sentetik kareler, 10 ısınma ve 80 ölçüm karesi; önce GPU, sonra CPU) yeniden ölçülmüştür;
bu sırada makinedeki başka süreçler (aralarında başka bir uygulamanın on dakikalık otomatik tarayıcı
testi) işlemci yükünü %91'de tutuyordu. GPU'da medyan 33,2 ms (90. yüzdelik 36,0 ms), CPU'da 84,5 ms
(122,1 ms) çıkmıştır. Mutlak süreler yüke bağlıdır; iki koşuda da GPU yolu CPU yolundan 2,5–2,9 kat
hızlıdır. Yukarıdaki tablo ilk koşudur ve olduğu gibi bırakılmıştır. Ayrı bir ölçümde, izleyiciye
uygulamanın artık yaptığı gibi karenin tuval kopyası verildiğinde, GPU'da kare başına medyan 14,1 ms
ölçülmüştür (10 ısınma karesinden sonra 30 kare, el yok); kopyanın kendisi (video karesinin tuvale
çizilmesi) ana iş parçacığında medyan 0,1 ms, 90. yüzdelikte 0,4 ms sürer (60 kare; GPU'daki iş ölçülmedi).

Çizer denetimi ile el izleyicinin GPU ve CPU ölçümleri iki yerel sayfayla yinelenebilir. Sayfalar
yayımlanmaz (`.vercelignore`); `npm run serve` ile başlatılan yerel sunucuda açılırlar:
`http://localhost:8000/lab/focus_check.html` (çizer) ve
`http://localhost:8000/lab/tracker_bench.html` (el izleyici; sekme görünür olmalıdır). Tablodaki yüz
dedektörü satırları ise ancak dedektörün depodan kaldırılmış modeli git geçmişinden geri getirilerek
yinelenebilir (sayfa onu yalnızca dosya varsa ölçer; geri getirilen dosya depoya yeniden işlenmemelidir):
`git restore --source=4def20f -- web/models/blaze_face_short_range.tflite`.
Değişikliğin ilk hâli ayrıca yerel sunucuda sentetik bir kamera akışıyla (`canvas.captureStream()`)
açılmıştır: uygulama 0,7 s içinde kamerayı açmış, el izleyici GPU temsilcisinde hazır duruma gelmiş ve hata
görülmemiştir (model tarayıcının önbelleğindeydi). Tarayıcı bölmesi gizli olduğundan kare başına geri
çağrılar bu denetimde çalıştırılamamıştır.

**Doğrulanmayanlar.** Değişiklikten sonra gerçek bir el ve gerçek bir kamerayla deneme yapılmamıştır
(yerleşik tarayıcının kamerası yoktur); proje sahibinin yeniden denemesi beklenmektedir. Proje sahibinin
bilgisayarında gerçek kamerayla işlenen kare hızı da ölçülmemiştir: GPU'da kare başına 16,4 ms ile 30
kare/s'lik bir kameranın bütün karelerinin işlenmesi beklenir; bu bir beklentidir, ölçüm değildir ve
makinenin yüküne bağlıdır. Yük altında ölçülen 33,2 ms, 30 kare/s'de iki kare arasındaki sürenin neredeyse
tamamıdır.

**Sınırlar.** Net bölge elin çevresinde dar bir pay (yaklaşık bir parmak genişliği) içerir; yüzün önünde
tutulan bir el, yüzün hemen yanındaki bölümünü açar. İzleme yitirildiğinde el de yeniden bulunana kadar
bulanıktır. Net bölgenin ele oturmasının bedeli olarak, gösterilen görüntü canlı kameranın bir izleyici
çıkarımı kadar gerisindedir. Kameranın pozlamasından gelen hareket bulanıklığı sürer: daha yüksek işleme
hızı, loş ışıkta çok hızlı vuruşlardaki el kayıplarını azaltabilir ama ortadan kaldıramaz. GPU temsilcisi
çalışmayan bilgisayarlarda CPU yedeği geçerlidir (bu bilgisayarda kare başına medyan 47,4 ms, makine
yüklüyken 84,5 ms).

**Yöntemsel ders.** Kamera yolu yalnızca sentetik bir akışla duman testinden geçirilmişti; gerçek bir
kamerayla ilk kullanım, test paketinin göremediği bir başarım sorununu ve bir gizlilik tasarımı
sorununu ortaya çıkarmıştır. Sentetik akış zincirin çalıştığını gösteriyordu; hızlı bir elin izlenip
izlenmediğini ve bulanıklığın nereye düştüğünü göstermiyordu. Değişikliğin yayından önceki incelemesi aynı
dersi yinelemiştir: bulduğu altı kusurun hiçbiri test paketinde görünmüyordu; o sıradaki 110 testin hepsi
geçiyordu.
