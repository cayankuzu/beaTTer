# 8. Tartışma

## 8.1 "Yenilmez" burada ne demektir, ne demek değildir?

Projenin adı ve önceki sürümünün iddiası "yenilmezlik"ti. Denetim bu iddianın bir totolojiye dayandığını
gösterdi (Bölüm 5.1): YZ, karşılaştırıldığı pozu görüp karşılığını oynuyordu. Yeni sistemde sözcüğün anlamı
dar ve açıktır:

1. **Kurala göre yenilmezlik.** Turnuva ön ayarında YZ **geçerli** hiçbir turu kaybetmez (Teorem 1). Bu bir tahmin başarısı değil, kuralın sonucudur: son havadaki karede ön parmakların "ölçülebilir biçimde
   açılmış" ya da "açılmamış" olması nihai hamlenin yasal kümesini en çok iki sınıfa indirir, iki sınıfa
   karşı kaybetmeyen bir hamle her zaman vardır (Lemma 1) ve YZ, kendi inancı ne derse desin, o hamleyi
   oynar. Dedektör ne kadar kötü olursa olsun geçerli turlarda kayıp sıfırdır; bu yüzden "geçerli turlarda
   kayıp yok" cümlesi dedektör hakkında hiçbir şey söylemez.
2. **Bedeli sonuçsuz denemelerdir.** Kuralın dışında kalan atışlar (açılması havada ölçülemeyecek kadar geç
   başlayanlar, inişten sonra açılan ya da kapananlar) ve hakemin taze kanıt bulamadığı ya da şekli
   tanıyamadığı turlar kaybedilmez ama kazanılmaz da: tekrarlanır. Sistemin ölçüsü budur. Eşleşmiş
   simülasyonda sonuçsuz deneme payı açılma alışkanlığına göre %0,2 ile %35 arasındadır (Bölüm 6.3); normal
   açan dürüst bir oyuncu için model uyumsuzluğuna göre %1,7 ile %23 arasında değişir (Bölüm 6.8). Geç açan
   bir oyuncu için "yenilmezlik", atışlarının üçte birinin sayılmaması demektir.
3. **Güvence, gerçekleme kadar sağlamdır.** Teorem kuralı anlatır; kuralın kodda eksiksiz uygulanması ayrı
   bir iştir. İlk v4 gerçeklemesi "geçerli turda kaybetmez" diyordu ve bağımsız inceleme Turnuva'da geçerli
   turların kaybedildiği iki saldırı kurdu (Bölüm 5.1.6). Düzeltmelerden sonra, bu metin yazılırken ve
   denetlenirken, ispat kodla satır satır karşılaştırıldı ve iki delik daha bulundu: tek atış kipinde, düşen
   bir kareye saklanan çok hızlı bir vuruşta hiç revize edilmemiş davranış mührünün hükme bağlanması ve
   metronom kipinde mühre yazılan yuvarlanmış zamanın yuvarlanmamış kare zamanıyla karşılaştırılması.
   Son doğrulamadaki bir saldırı denetimi üçüncü bir delik buldu: taahhüt kaydı bir revizyon mührünü
   reddettiğinde, istisnayı yutup motoru beslemeyi sürdüren bir çağıran için tur eski mühür üzerinden hükme
   bağlanıyordu (uygulamanın kendisi bu yola girmiyordu). Teoremde ayrıca sayısal bir koşul olarak
   $h_F\neq\tfrac12$ duruyordu. Dördü de giderildi ve regresyon testine bağlandı (Bölüm 4.7). Bugün
   teoremin, turun geçerli olması dışında bir koşulu yoktur ve ispatın her adımı kodda zorlanır; metronom
   kipini de kapsayan 15 000 oturumluk bir saldırı bulanık
   sınaması 14 579 geçerli turda sıfır kayıp vermiştir (simülasyon; Bölüm 6.9). Yine de bu tarihçe,
   "kural gereği" sözünün bir sonraki okumaya kadar geçerli bir sav olduğunu gösterir: üç deliğin hiçbirini
   testler bulmadı; ikisini ispatın kodla karşılaştırılması, üçüncüsünü ispatı kırmaya çalışan saldırı
   denetimi buldu.
4. **Motorun inişine göredir.** Güvence, motorun kendi kare akışında saptadığı inişe göre tanımlıdır.
   Motorun inişi fiziksel inişten sonraysa, mühür "inişten önce" görünür ama el gerçekte inmiştir.
   Simülasyonda bu, yüksek gürültülü zayıf atışların küçük bir bölümünde olmuştur; gerçek kamerada
   ölçülmemiştir (Bölüm 8.2).
5. **Daha gevşek ön ayarlarda insan kazanabilir.** Standart ve Serbest ön ayarları belirsiz bir bölge
   bırakır. Simülasyonda bu pay küçüktür: Serbest'te dürüst oyunculara karşı en çok %0,3 (Bölüm 6.3),
   model uyumsuzluğunda en çok %0,5 (Bölüm 6.8), incelemenin "önce Makas, sonra yüzük ve serçe"
   saldırısında %1,2 (Bölüm 6.4). Gerçek oyuncularda ne olacağı bilinmemektedir.
6. **Fiziğe karşı hiçbir iddia yoktur.** Hareket hakkında hiçbir ipucu ortaya çıkmadan kesin tahmin
   yapılamaz. Kinematik kanalın değeri son karelerdedir: Serbest'te kararın inişten 40 ms önce dondurulması
   bile simülasyonda %2–4 kayıp getirir; 200 ms'de sistem şans düzeyindedir (Bölüm 6.2). Turnuva'da
   dondurmaya izin verilmemesinin nedeni budur. Rastgele oynayan birine karşı davranış kanalı hiçbir şey
   kazanmaz (Bölüm 6.1); kuram bunu zaten gerektirir [GanzfriedSandholm2015].

Bu yüzden arayüzde ve bu metinde "yenilmezlik" bir başarım ölçüsü olarak kullanılmaz. Sorulması gereken
"geçerli turların yüzde kaçını kaybetti?" değil — Turnuva'da yanıt kural gereği
sıfırdır —, "denemelerin
yüzde kaçını kazandı ve yüzde kaçı sonuçsuz kaldı?" sorusudur. Eşleşmiş simülasyonda yanıt, normal açan bir
oyuncu için yaklaşık %94,5 ve %5; geç açan için %65–68 ve %32–35'tir.

Kullanıcı gereksinimi "kişi hamle yapmadan karar verilmesi" idi. Dürüst yanıt şudur: karar **inişten önce
yakalanmış bilgiye dayanır** ve bu kriptografik olarak bağlanır (D1, D2); ancak çoğu turda **hareket
başladıktan sonra**, nihai şeklin yaklaşık yarısı oluşmuşken verilir ve şeklin tamamlanmasına medyanda bir
kare kalmıştır. El okunarak verilen kararların önceliği normal açanlarda medyanda 135 ms, geç açanlarda 66
ms dolayındadır. "Hiç hareket görmeden" verilen ve sonuna kadar korunan kararların payı simülasyonda
%12–23'tür ve bunların başarısı davranış kanalının sınırlı gücüyle sınırlıdır. Bu öncelikler kare zamanına
göredir; özetin duvar saatiyle ne zaman var olduğu ayrı bir ölçümdür ve gerçek bir kamerada henüz
toplanmamıştır. Arayüz bu büyüklükleri her turda ayrı ayrı gösterir.

## 8.2 Geçerliliğe yönelik tehditler

**Simülasyon ile gerçeklik.** Bütün sayısal sonuçlar sentetik oyunculardan gelir. En ağır varsayım, simüle
edilen açılmanın dedektörün varsaydığı aynı yörünge ailesinden (en küçük sarsım) üretilmesidir. Bu profilin
parmak eklemlerini betimlediği kavrama hareketlerinde ve dört katılımcıda gösterilmiştir [FriedmanFlash2009];
bir oyun sırasında, sallanan bir kolun ucunda, hızlı ve bazen aldatmacalı açılmalar için gösterilmemiştir.

**Eşleşmiş simülatör: artık nicelenmiş, ama hâlâ simülasyon.** Bölüm 6'nın E1–E7 deneylerindeki sentetik
oyuncu dedektörün kendi üretici modelinden çekilir: aynı yörünge ailesi, aynı önsel merkezleri, tam genlik,
bağımsız Gauss gürültüsü ve çekirdeğin tam tersi olan bir el. Bu sayılar modeli kendisine karşı ölçer.
Bağımsız incelemenin bu eleştirisi üzerine eklenen E8 (Bölüm 6.8) iyimserliği niceler: yirmi bir ayrı
uyumsuzlukta Turnuva'nın geçerli turlardaki kaybı sıfırda kalırken dürüst bir oyuncunun sonuçsuz deneme
payı tabandaki %4,6'dan %23,4'e kadar çıkmış, açılması zamanında başlamış atışlardaki faul %17,5'e
ulaşmıştır. E8 yine de bir duyarlılık çözümlemesidir: hangi uyumsuzlukların zarar verdiğini gösterir,
gerçek elin bu uyumsuzluklardan hangisini ne ölçüde taşıdığını değil. Gerçek dünyadaki oran bu aralığın
içinde de dışında da olabilir.

**Model uyumsuzluğu.** Gerçek açılmalar asimetrik olabilir, parmaklar farklı zamanlarda başlayabilir (açılmada
DIP ve MCP eklemlerinin PIP'den önce başladığı bildirilmiştir [Li2023]) ve yumruk gerginliği taban çizgisini
kaydırabilir. Unutma katsayısı ve yeniden çapalama bu uyumsuzluğu hafifletmek için vardır. E8'e göre
sistemin en duyarlı olduğu yerler, açılmanın inişten önce ölçülebilir hâle gelmesini geciktiren her şeydir:
yavaş başlayan ya da yavaş süren açılma ve Kâğıt'ta arka parmakların geç başlaması. Açılma tarzlarının
parametreleri (260 / 170 / 80 ms) varsayımdır; gerçek dağılım "geç" tarza yakınsa sonuçsuz deneme payı kabul
edilemez düzeyde olur.

**Hareket bulanıklığı ve izleyici gürültüsü.** El izleme modeli üreticisinin kendi beyanıyla hareket
bulanıklığı ve düşük ışıkta sınanmamıştır ve bildirilen iki boyutlu hata avuç boyunun %10'u dolayındadır
[MediaPipeHandCard2021]. Simülasyon bağımsız 2 mm Gauss gürültüsü varsayar; E5, 6 mm'de denemelerin
%22–32'sinin, 8 mm'de %42–59'unun geçersiz kaldığını göstermiştir. Hızlı bir atış vuruşunda elin tam da en
hızlı hareket ettiği an, parmakların açılmaya başladığı andır; bulanıklığın en büyük, kanıtın en değerli
olduğu an çakışır. E8'de sınanan en zararlı bozulma tam olarak budur: avuç hızıyla büyüyen gürültü faulü
%23'e çıkarır ve karar önceliğini 67 ms'ye indirir. Gerçek izleyicide bu bağımlılığın büyüklüğü
ölçülmemiştir. Gerçek gürültü ayrıca kareler arasında ilintilidir (izleyici bir önceki karenin kırpımını
kullanır [Zhang2020]); E8'de $\rho=0{,}8$'lik bir ilinti tek başına az etkilemiştir, ancak dedektörün
bağımsızlık varsayımı ihlal edildiğinde olasılıkların aşırı güvenli olması beklenir ve kalibrasyon bu koşulda
ölçülmemiştir. Pozlama bulanıklığının yanında işleme hızı da belirleyicidir: proje sahibinin ilk gerçek
kamera denemesinde saniyede en çok yaklaşık 17 kare işlenirken el hızlı vuruşlarda algılanmıyordu ve en
olası neden bu hızdı (aşağıda); ekran kartı yolu bir kareyi medyanda 16,4 ms'de (makine yüklüyken
33,2 ms'de) işler, ama pozlama bulanıklığının kendisi kalır.

**Kare düşmesi.** Hakem ancak atışa ait taze kanıtla hüküm verir; kanıt bayatsa tur geçersizdir. Bu kural
tutucudur ve bedeli ölçülmüştür: karelerin taban olarak %15'i düştüğünde (hızlı vuruşta daha fazlası)
denemelerin yalnızca %35'i geçerli tura dönüşür (Bölüm 6.4). Gerçek bir izleyicinin hızlı vuruşlarda eli ne
sıklıkla kaybettiği bilinmemektedir; bu, ürünün kullanılabilirliğini kayıp oranından çok daha fazla
belirleyebilir.

**Kare hızı ve nicemleme.** 30 kare/s'de hızlı bir açılma iki ile dört kareye sığar (Bölüm 2.3) ve
simülasyonda değerlendirilen mühür şeklin tamamlanmasından medyanda bir kare öncedir. Kamera düşük ışıkta
kare hızını düşürebilir ve ayardaki değer elde edilen değer değildir [MediaCapture]; sistem uçuştaki kare
hızını ölçüp raporlar. Regresyon testleri vuruş izleyiciyi 30, 60 ve 120 kare/s'de, D1'i 120 ve 144
kare/s'de, tek atış kipini 15–30 kare/s'de sınar; ancak tam sistem deneyleri yalnızca 30 ve 60 kare/s'dedir
ve düzensiz kare aralıklarında başarımın ne olacağı sınanmamıştır.

**İnişin saptanması.** Bütün değişmezler iniş anına göre tanımlıdır; iniş ise avuç merkezinin düşey hızından
kestirilir. Simülasyonda hata küçüktür (ortalama birkaç ms, en kötü ≈ 20 ms), ama bir masaya vurmayan,
havada duran ya da yatay sallanan gerçek bir elde "iniş"in kendisi belirsizdir. Geç saptanan bir iniş
YZ'nin lehine çalışır (fiziksel inişten sonra atılmış bir mühür "inişten önce" görünür), erken saptanan bir
iniş oyuncunun aleyhine faul üretir. İnceleme sonrasında yumuşak iniş, zayıf vuruşun bittiği ana tarihlenir
(30 kare/s'de simülasyondaki gerçeğin medyanda 3–4 ms çevresinde; varsayılan gürültüde en çok +54 ms); yine
de varsayılanın 2–3 katı görüntü gürültüsünde yaklaşık 370 geçerli yumuşak iniş turunun 1–2'sinde
değerlendirilen mühür simülasyondaki gerçek inişten sonra atılmıştır. Gerçek kamerada bu hata yüksek hızlı
bir ikinci kamerayla ölçülmelidir (Ek C).

**İstemci saati, mühür gecikmesi ve gösterim gecikmesi.** Mühürdeki zaman ile iniş aynı saatte, aynı kare
akışında ölçülür; sabit bir kamera gecikmesi aralarındaki farkı değiştirmez. Üç çekince vardır. (i) Zaman
damgaları istemcinin kendi beyanıdır ve üçüncü tarafa karşı kanıt değildir [RFC3161]. (ii) Mühürdeki zaman
karenin yakalanma zamanıdır; özet, kamera ve çıkarım gecikmesi kadar sonra var olur. İnceleme bunun hiçbir
yerde ölçülmediğini göstermişti; artık her kamera turunda kare → mühür gecikmesi ve duvar saati önceliği
ölçülüp raporlanır (Bölüm 4.10) ve ikincisi negatif çıkabilir. Ancak bu çalışmada **gerçek kamerayla
toplanmış tek bir değer yoktur**; telefonlarda yalnızca yakalama–geri çağrı gecikmesi 60–90 ms ölçülmüştür
[Kamarainen2017], yani "inişten 66 ms önce" bir bilgi kümesi önceliği, duvar saatinde inişten sonraya
düşebilir. Karenin yakalanma zamanının kendisi de tarayıcının bildirdiği bir değerdir. (iii) Kullanıcının
mührü *ekranda gördüğü* an ayrıca gösterim gecikmesi kadar sonradır ve hiç ölçülmemektedir.

**Gerçek kamerayla yapılan ilk deneme başarısız olmuştur.** Kamera yolu — kamera, el izleyici, motor,
arayüz — önce yalnızca bir duman testinden geçmişti: tarayıcıda, sentetik bir `canvas.captureStream()` video
akışıyla zincirin uçtan uca çalıştığı, MediaPipe'ın daraltılmış İçerik Güvenlik İlkesi altında yüklendiği,
ilke ihlali olmadığı ve el izleyici ile o sırada kullanılan yüz dedektörünün hazır duruma geldiği görülmüş,
aynı sınama yayımlanan sitede yinelenmişti (Bölüm 5.7). Bu, kodun bozuk olmadığını gösteriyordu,
kullanılabilir olduğunu değil. Proje sahibi yayımlanan siteyi 11 Kasım 2026'da bir Windows masaüstü
bilgisayarda Chrome/Edge ile, gerçek bir kamera ve kendi eliyle denemiştir. Deneme ölçüm kaydı alınmadan
yapılmıştır; gözlemler sahibinin bildirimidir: hızlı el hareketlerinde el algılanmamış, el iskeleti hiç
görünmemiş, hareket çok gecikmeli izlenmiş ve bulanıklık elin önüne gelmiştir. Nedenleri bulmak için aynı
bilgisayarda (20 mantıksal işlemci), geliştirme ortamının yerleşik Chromium tarayıcısında ölçüm yapılmıştır
(Bölüm 5.9). El içermeyen $640\times480$ sentetik karelerde (avuç dedektörü her karede çalışır: uygulamanın
el aradığı durum) el izleyici kare başına işlemcide medyan 47,4 ms, ekran kartında 16,4 ms sürmüş; yüz
dedektörü işlemcide medyan 9,6 ms sürmüştür. Eski boru hattı ana iş parçacığında, her kamera karesinde önce
işlemcideki el izleyiciyi, ardından (son çalışmasından bu yana en az 28 ms geçmişse, yani hemen her karede)
yüz dedektörünü çalıştırıyordu: kare başına yaklaşık 57 ms, yani saniyede en çok yaklaşık 17 işlenen kare;
buna ten rengi taraması ve bulanıklığın çizimi de ekleniyordu. Ölçümlere ve koda dayanan, ama gerçek bir
elle yeniden üretilmemiş en olası açıklama şudur. (a) Bu hızda hızlı bir vuruş, iki işlenen kare arasında
eli izleyicinin bir önceki kareden çıkardığı kırpımın dışına taşır; izleyici eli kaybeder ve hareketle
bulanıklaşmış bir avucu baştan saptamak zorunda kalır [Zhang2020]; üstteki çizim de videonun gerisinde
kalır. (b) Yüz dedektörü 0,16 güven eşiğiyle çalışıyor ve her saptama bulanıklaştırılıyordu; yüz
bulunamayan 8 kareden sonra, yalnızca elin her yönde karenin 0,12'si kadar büyütülmüş sınırlayıcı kutusunu
dışarıda bırakan bir ten rengi kümesi devreye giriyordu; ikisi de ele ya da kola denk gelebilir.
(c) "İskeletin hiç görünmemesi" yeniden üretilmemiştir (ölçüm ortamında gerçek bir el ve kamera yoktu);
(a) ile tutarlıdır: her vuruşta kaybolan bir el, hareket ederken iskelet göstermez.

**Düzeltilmiş kamera yolu gerçek bir kamerayla denenmemiştir.** Düzeltmede el izleyici önce ekran kartı
(WebGL2) yolunda çalıştırılır, işlemci (XNNPACK) yolu yedektir; model yüklendikten sonra boş bir karede üç
kez çalıştırılarak ısıtılır, böylece ekran kartı gölgelendiricilerinin derlenmesi ilk kamera karelerine
düşmez; çalışma sırasında art arda 15'ten fazla hatada izleyici öteki yolda yeniden kurulur ve hangi yolun
kullanıldığı kare hızı rozetinin açıklama metninde yazar. Yüz dedektörü tümüyle kaldırılmış, kamera açılışı
artık onu (en çok 6 s) beklemez. Gizlilik, proje sahibinin seçtiği tasarımla yeniden yapılmıştır: görüntünün
tamamı bulanıklaştırılır, yalnızca izlenen el net kalır; çizilen görüntü, el izleyicinin işlediği karenin
kopyasıdır; gizlilik açık olduğu her an (kamera açılırken ve izleyici yüklenirken de) video öğesinin kendisi
de CSS ile bulanıklaştırılır ve çizer hata verirse görüntü kapatılır (Bölüm 5.8, 8.3). Değişiklik yayından
önce üç bağımsız inceleyiciye okutulmuş; doğrulanan bulgular altı kusurda birleşmiş, altısı da giderilmiştir
(Bölüm 5.1.7). Düzeltmeden sonraki sınamaların hepsi sentetiktir: sekiz otomatik test
(`tests/camera_privacy.test.js`; net bölgenin geometrisi, kamera kaynağının açılışı ve bildirdiği temsilci,
yedek bulanıklık); tarayıcıda, her yeri 2 piksellik keskin çizgilerle kaplı, yazı ve yüze benzeyen bir disk
içeren sentetik bir karede, sentetik eklem noktalarıyla çizerin son hâlinin denetimi (ortalama mutlak yatay
parlaklık gradyanı kaynak karede 125,0, el bölgesinde 72,0, elden uzakta 0,09, yüze benzeyen diskin elden
uzak kısmında 0,26); ve değişikliğin ilk hâliyle, yerel sunucuda sentetik bir kamera akışıyla uygulamanın
açılışı (kamera açık, izleyici ekran kartında hazır, hata yok; tarayıcı penceresi gizli olduğundan kare
başına geri çağrılar tetiklenmemiştir). Bunlar kodun bozuk olmadığını, izleyicinin yerleşik tarayıcıda ekran
kartında çalıştığını ve çizerin sentetik bir karede eli net, geri kalanı bulanık bıraktığını gösterir.
Düzeltilmiş sürüm gerçek bir kamera ve gerçek bir elle henüz denenmemiştir (yerleşik tarayıcının kamerası
yoktur); proje sahibinin yeniden denemesi beklenmektedir. Sahibinin bilgisayarında gerçek kamerayla işlenen
kare hızı da ölçülmemiştir: kare başına 16,4 ms ile 30 kare/s'lik bir kameranın her karesinin işlenmesi
beklenir; bu bir beklentidir, ölçüm değildir ve yüke bağlıdır: işlemci yükü %91 iken yinelenen ölçümde ekran
kartında medyan 33,2 ms çıkmıştır, bu da 30 kare/s'de iki kare arasındaki sürenin neredeyse tamamıdır. Bu
sınamalar izleyici gürültüsü, zamanlama, iniş saptama, net bölgenin hızlı hareket eden gerçek bir eli izleyip
izlemediği, yüzün gerçekten gizli kalıp kalmadığı ve kamera kaybı senaryoları hakkında hiçbir şey söylemez.

**Veritabanı betiği çalıştırılmamıştır.** `supabase_schema.sql` bu çalışmada hiçbir veritabanında
çalıştırılmamıştır; betimlemesi dosyanın okunmasına dayanır. Üretim veritabanının şu anki ilke durumu da
yoklanmamıştır (Bölüm 5.8).

**Demonun açılışı elle seçilmiştir.** Kamerasız demonun varsayılan tohumu, ilk turları geçerli ve çeşitli
olacak biçimde seçilmiştir (Bölüm 5.4.1). Demoyu birkaç tur izleyen biri faul oranını olduğundan düşük
sanabilir; uzun dönemdeki oranlar Bölüm 6'dakilerdir.

**Tek cihaz, tek kamera, tek el.** Sistem tek bir tarayıcıda çalışır; hakem ve oyuncu aynı yazılımdır.
Değişmezler kodda zorlanır ve testlerle doğrulanır, fakat bağımsız bir tanık yoktur: kötü niyetli olarak
değiştirilmiş bir istemci istediğini gösterebilir. Protokol, dürüst istemcinin dürüstlüğünü denetlenebilir
kılar; dürüst olmayan bir istemciyi engellemez.

**Doğrulamanın kendisi.** İlk v4 için "değişmezler testlerle doğrulanmıştır" cümlesi yazılmıştı ve o
sıradaki bütün testler geçerken kod iki kritik ve sekiz yüksek önemde kusur taşıyordu (Bölüm 5.1.6).
Bugünkü test paketi daha büyüktür ve incelemenin her yeniden üretilebilen bulgusunu kapsar; ama testler
yalnızca yazarlarının aklına gelen durumları sınar. Nitekim inceleme sonrasında yazılan testlerin hepsi
geçerken Turnuva güvencesinde üç delik daha vardı (Bölüm 4.7); hiçbirini testler bulmadı: ikisini ispatın
kodla satır satır karşılaştırılması, üçüncüsünü ispatı kırmaya yönelik bir saldırı denetimi buldu. Üçü de
giderilmiş ve teste bağlanmıştır (bugün 113 test) ve güvence için ayrıca bir saldırı bulanık sınaması
vardır (Bölüm 6.9); ama ders aynıdır: geçen bir test paketi boşluk olmadığını göstermez. Testlerin
başarısızlığı da ciddiye alınmalıdır: yaşam döngüsü testlerinden biri yüklü makinede ara sıra başarısız
oluyordu ve nedeni test değil, demodaki gerçek bir kilitlenmeydi (Bölüm 5.1.6). Sistemin ikinci bir
bağımsız incelemesi yapılmamıştır; yalnızca sonradan eklenen kamera değişikliği yayından önce ayrıca
incelenmiş ve o sıradaki bütün testler geçerken altı kusur bulunmuştur (Bölüm 5.1.7).

**İstatistiksel.** Güven aralıkları tohumlar arası değişkenliği değil, havuzlanmış turların binom
belirsizliğini yansıtır; aynı oturumdaki turlar bağımsız değildir (model öğrenir). Koşullu oranlar (geçerli
turlar üzerindeki kazanma ve kayıp), YZ'nin kendi dedektörünün seçtiği bir örneklem üzerindedir ve
Turnuva'da bilgi taşımaz (Bölüm 4.10). Çok sayıda hücre karşılaştırılmış, çoklu karşılaştırma düzeltmesi
yapılmamıştır. Simülasyon parametreleri ve dedektör parametreleri aynı geliştirme sürecinde seçildiği için
aşırı uyum riski vardır; E8'in bozulmaları da aynı süreçte seçilmiştir.

## 8.3 Etik ve gizlilik

**Veri en aza indirme.** Kamera kareleri ve eklem noktaları cihazdan çıkmaz ve saklanmaz; saklanan, hamle
geçmişi ve zamanlama istatistikleridir. Bu, 6698 sayılı Kanun'un amaçla bağlantılı, sınırlı ve ölçülü işleme
ilkesiyle [KVKK6698] ve GDPR'ın veri en aza indirme ve varsayılan olarak koruma ilkeleriyle [GDPR]
uyumludur. El geometrisi kimlik saptamak için işlenmediğinden ve saklanmadığından, sistemin biyometrik veri
işlediğini düşünmüyoruz; ancak bu bir hukuki görüş değildir ve bir hukukçu tarafından değerlendirilmelidir.
Eski veritabanı şemasında bulunan "el geometrisi oranı" sütunu yeni istemci tarafından doldurulmaz.

**Açık noktalar.** (i) Yazı tipleri ve MediaPipe çalışma zamanı üçüncü taraf sunuculardan yüklenir (İçerik
Güvenlik İlkesi ikincisini tek bir paket sürümünün dizinine daraltır); bunların siteyle birlikte sunulması
gerekir. (ii) Bulut eşitleme açıkken gönderilen anonim kimlik kalıcıdır ve tur kayıtlarıyla birleştiğinde
tekil bir kayıt oluşturur; saklama süresi için öneri vardır (180 gün) ama otomatik uygulanmaz. (iii)
Veritabanı betiği sahibi tarafından elle ve bütünüyle uygulanmalıdır; uygulanana kadar isteğe bağlı
eşitleme güvenli yönde başarısız olur, ama veritabanında eski izin verici ilkeler duruyorsa onları kaldıran
da bu uygulamadır. Betik bu çalışmada çalıştırılmamıştır (Bölüm 5.8). (iv) Gizlilik artık bir yüz bulmaya
dayanmaz: yüz dedektörlü önceki tasarım kaldırılmış; görüntünün tamamı bulanıklaştırılır, yalnızca
izlenen el net kalır (Bölüm 5.8). Net bölge elin çevresinde dar bir pay (yaklaşık bir parmak
genişliği) içerir; yüzün önünde tutulan bir el, yüzün hemen yanındaki kısmını açar. İzleme kaybolduğunda el
de yeniden bulunana kadar bulanıktır. Tasarım gerçek bir yüz ve gerçek bir kamerayla sınanmamıştır;
bulanıklık yalnızca sentetik bir karede ölçülmüştür (Bölüm 8.2). (v) İnsan denekli doğrulama etik kurul
onayı gerektirir (Ek C).

**İkna edici teknoloji riski.** "Hamleni okuyan" bir sistem, kullanıcıda gerçekte olmayan bir yetenek izlenimi
bırakabilir. Arayüzün simülasyonu etiketlemesi, belirsizliği göstermesi ve mührün neyi kanıtlamadığını
söylemesi bu riski azaltmayı amaçlar; kullanıcıların bu bilgileri gerçekten nasıl anladığı ölçülmemiştir.

## 8.4 Janken robotuyla karşılaştırma

| | Tokyo janken robotu [Katsuki2015; Ito2016] | beaTTer |
|---|---|---|
| Algılama | 500 kare/s yüksek hızlı kamera, 2 ms tanıma çevrimi | Web kamerası, 30–60 kare/s |
| Yöntem | Oluşan şekli parmak sayarak tanır | Açılmanın başlangıcını yörünge modeliyle sezer + davranış önseli |
| Zamanlama | İnsandan ≈30 ms sonra başlar, aynı anda ya da ≈20 ms sonra bitirir | İnişten önce yakalanmış kareye dayanarak mühürler (simülasyonda, Turnuva'da medyan 84–235 ms; el okunarak verilen kararlarda 66–232 ms; kare zamanına göre) |
| İlke | İnsanın fark edemeyeceği kadar hızlı **tepki** | İniş öncesi **taahhüt** + açık geç hamle kuralı |
| Denetlenebilirlik | Yüksek hızlı video | Özet zinciri, tur raporu, dışa aktarım |
| Belirsiz durum | Yok (her turda oynar) | Faul / geçersiz tur (tekrar): eşleşmiş simülasyonda denemelerin %0,2–35'i |
| Kanıt düzeyi | Gösterim; kazanma oranı istatistiği yayımlanmamış | Birim testleri, bağımsız kod incelemesi ve simülasyon; insan verisi ve gerçek kamera ölçümü yok |

İki sistem farklı sorulara yanıt verir. Robot, donanım hızıyla "geç hamle"yi algılanamaz kılar; aynı
kaynaklara göre kol aşağı inene kadar bilerek bekletilir, yani tanıma inişten önce de mümkündür. beaTTer
donanım hızına sahip değildir; bunun yerine kararını inişten önce bağlar ve bağladığını gösterir. Robotun
yaklaşımı her atışı karşılar; beaTTer'ınki bazı atışları reddeder. Hangisinin "daha adil" olduğu bir tanım
sorunudur; beaTTer'ın katkısı kuralı ve bedelini açıkça yazmasıdır.

## 8.5 Davranış kanalının sınırları

Davranış kanalının varsayımı insanların rastgele olmadığıdır; literatür bunu grup düzeyinde destekler ama
üç sınır koyar. Birincisi, etki küçüktür: grup tablosunun taşıdığı bilgi tur başına ≈0,03 bittir ve
bireylerin çoğu sonuca bağlı bir örüntü göstermeyebilir [ZhangMoisan2021]. İkincisi, insanlar **uyum
sağlar**: sömürülebilir bir rakibi hızla öğrenir, basit uyarlanır botları yenerler [BrockbankVul2024;
SundvallDyson2022]; YZ'nin davranış kararları kestirilebilir hâle gelirse oyuncu bunu kullanabilir. Bütçeli
karma strateji bu kaybı sınırlar (Önerme 1) ama sıfırlamaz ve bedeli vardır: insan benzeri sentetik oyuncuda
en iyi yanıtın tur başına 0,06'lık net kazancı güvenli stratejiyle 0,02'ye düşer (Bölüm 6.1). Üçüncüsü,
simülasyondaki sentetik oyuncular uyum
sağlamaz; E1 ve E7'deki davranış kazançları bu yüzden iyimserdir. Kanalın gerçek değeri ancak yayımlanmış
tur düzeyindeki veri kümelerinde çevrimdışı ve gerçek oyuncularla çevrimiçi ölçülebilir (Bölüm 9).

Son olarak, iki kanalın etkileşimi ölçülmemiş bir risk taşır: arayüz davranış beklentisini oyuncuya
gösterir. Bunu gören bir oyuncu beklentinin tersini oynayabilir; bu, döndürme hipotezlerinin tam da
modellediği durumdur, ama aynı zamanda oyuncunun davranışını arayüzün kendisinin değiştirdiği anlamına
gelir. İnsan denekli çalışmada canlı tahminin açık ve kapalı olduğu koşullar karşılaştırılmalıdır.
