# 9. Sonuç ve Gelecek Çalışmalar

## 9.1 Sonuç

Bu çalışma, "insana karşı kaybetmeyen" bir taş-kâğıt-makas sistemini üç soruya indirgeyerek yeniden
tasarlamıştır: karar gerçekten hamleden önce mi veriliyor, bu kanıtlanabiliyor mu ve bedeli nedir?

**Yapılanlar ve doğrulananlar.** (1) Önceki sürümün denetimi, "yenilmezliğin" görülen poza tepki vermekten
ibaret olduğunu ve gösterilen sayıların çoğunun ölçüm olmadığını ortaya koymuştur. (2) Altı dürüstlük
değişmezi tanımlanmış ve kodda yapısal olarak zorlanmıştır. (3) Açılmanın başlangıcını sezen Bayesyen bir
süzgeç bankası, bundan türeyen ve YZ ile hakemin aynı sayıyı hesapladığı bir "geç hamle" kuralı ve bu kural
altında, kararı YZ'nin inancına değil hakemin yasal kümesine bağlayan bir politikayla, geçerli turların
kural gereği kaybedilmediğini söyleyen bir teorem verilmiş; teoremin, turun geçerli olması dışında bir
koşulu yoktur ve ispatının her adımı kodda zorlanmaktadır (aşağıda). (4) Her karar 128 bitlik nonce içeren, özet
zincirine bağlı bir SHA-256 taahhüdüyle iniş öncesinde bağlanmakta, bütün revizyonlar saklanıp açılmakta ve
doğrulanmaktadır. (5) Davranış kanalı yayımlanmış sayılardan kurulmuş bir önsel, 26 uzman ve sınırlı kayıp
güvencesiyle çalışmaktadır. (6) Arayüz yalnızca ölçülen değerleri göstermekte, simülasyonu etiketlemekte,
mührün neyi kanıtlamadığını ve "kaybetmeme" oranının neyi ölçmediğini söylemektedir. (7) **Yeniden tasarımın
kendisi bağımsız bir incelemeden geçirilmiştir.** İnceleme 45 bulguyla, ilk v4 gerçeklemesinin — bütün
testleri geçerken — Turnuva'da geçerli turlar kaybedebildiğini, herhangi bir ayar değişikliğinden sonra
hiçbir turu hükme bağlamadığını, tek atış kipinde oyuncu hiçbir şey yapmadan tur hükme bağladığını, bazı
"ölçüm"lerin sabit ya da kayık olduğunu ve yayımlanan oranların dedektörle eşleşmiş bir simülatöre
dayandığını göstermiştir. Bulgular giderilmiş ya da açık sınır olarak belgelenmiş, yeniden üretilebilen kod kusurları için regresyon
testleri yazılmış (v4.0'da toplam 113 test), deneyler yeniden üretilmiş ve bu metin baştan yazılmıştır. (8) **v4.2
de aynı yöntemle denetlenmiştir** (Bölüm 5.1.8). Bu çalışmanın dışında yayımlanan sürümlerde v4.2.1'in hakeme
eklediği iki kural Turnuva güvencesini kırmıştı (bulanık sınamada 16 911 geçerli turda 7 kayıp; simülasyon);
Makas için eklenen bir bağlantı telafisi, yüzük ve serçe parmağı geride kalan dürüst Kâğıt'ı faule çeviriyordu
(eşleşmiş simülasyonda, Turnuva'da, normal açanlarda ve 30 kare/s'de açık dürüst atışlardaki faul payı
v4.0'da %0,55, v4.2.2'de %2,71) ve istatistik paylaşımı anahtarına dokunulmadan açılıyordu. v4.2.3'te üçü de giderilmiş (aynı faul payı %0,46); düzeltmelerin ilk hâli de yayından önce incelenmiş ve
bulunan yirmi kusur giderilmiştir (Bölüm 5.1.8). On iki regresyon testi eklenmiş (paket 126 test) ve bütün
deneyler yeniden koşulmuştur.

**Simülasyonun gösterdikleri.** Belirtilen varsayımlar altında Turnuva ön ayarında 59 684 geçerli turda
kayıp gözlenmemiştir; bu, kuralın sonucudur ve dedektörün kalitesini ölçmez. Sistemi ölçen koşulsuz oranlarda:
dedektörle eşleşmiş sentetik bir oyuncuya karşı YZ, normal açan oyuncunun denemelerinin yaklaşık %94,8'ini
kazanır ve %5'i sonuçsuz kalır; geç açan oyuncuda denemelerin üçte biri sonuçsuzdur. Model bilerek
bozulduğunda kayıp sıfırda kalır ama dürüst bir oyuncunun sonuçsuz denemeleri %20'ye kadar çıkar; en zararlı
bozulmalar, gerçek el ve kameralarda beklenenlerdir (geride kalan yüzük ve serçe parmağı, yavaş başlayan
açılma, vuruşta gevşeyen parmaklar, hareketle büyüyen gürültü). Aynı
deneyler diğer sınırları da göstermiştir: kinematik kanalın değeri son karelerdedir; karar çoğu turda
hareket oluşurken verilir; karar önceliğini öğrenmeden çok oyuncunun açılma zamanı belirler; sonsal az
güvenlidir; yüksek eklem gürültüsünde sistem denemelerin önemli bir bölümünü (8 mm'de %40–43'ünü) geçersiz
sayar, karelerin %15'i düştüğünde denemelerin beşte biri sonuçsuz kalır;
davranış kanalı rastgele bir oyuncuya karşı hiçbir şey kazanmaz.

**İnceleme sonrasında bulunan delikler.** Bağımsız inceleme ve düzeltmeleri bittikten sonra, teoremin
ispatı kodla adım adım karşılaştırılırken Turnuva güvencesinde iki delik daha bulunmuştur: tek atış kipinde,
düşen bir kareye saklanan çok hızlı bir vuruşta hiç revize edilmemiş davranış mührünün hükme bağlanması ve
metronom kipinde mühre yazılan yuvarlanmış zamanın yuvarlanmamış kare zamanıyla karşılaştırılması. İkisi de
elle kurulmuş karelerle yeniden üretilmiş (tek atışta 20 ve 30 kare/s'de 40'ar denemenin 17'si, metronomda
800 sahnelenmiş turun 108'i oyuncu galibiyetiydi), giderilmiş ve regresyon testine bağlanmıştır; aynı
sahnelemeler düzeltmeden sonra sıfır oyuncu galibiyeti verir. Son doğrulamadaki bir saldırı denetimi,
motorun programlama arayüzü düzeyinde üçüncü bir delik bulmuştur: taahhüt kaydı bir revizyon mührünü
reddettiğinde, istisnayı yutup motoru beslemeyi sürdüren bir çağıran için tur eski mühür üzerinden hükme
bağlanıyordu (nonce kaynağı bozulduğunda 40 turda 17 oyuncu galibiyeti; uygulamanın kendisi bu yola
girmiyordu); artık atılamayan bir mühür turu iptal eder. Teoremde sayısal bir koşul olarak duran
$h_F=\tfrac12$ sınır durumu da hakem sınaması değiştirilerek kaldırılmıştır. Metronom kipini de kapsayan
15 000 oturumluk bir saldırı bulanık sınaması son kodla (v4.2.3) 17 404 geçerli turda sıfır kayıp vermiştir
(simülasyon; Bölüm 6.9).

**Doğrulanmayanlar.** Gerçek insanlarla denetimli bir ölçüm yapılmamıştır. Proje sahibinin gerçek bir
kamerayla, ölçüm kaydı almadan yaptığı ilk deneme başarısız olmuştur: hareket gecikmeli izlenmiş, el hızlı
vuruşlarda kaybolmuş, bulanıklık elin üzerine kaymıştır. En olası nedenleri ölçüm ve kod okumasıyla bulunup
giderilmiştir: aynı bilgisayarda el izleyici ekran kartında işlemcidekinden 2,5–2,9 kat hızlı çalışır,
yüz dedektörü kaldırılmış ve gizlilik artık elden başka her şeyi bulanıklaştırır. Gerçek kameradan elde
edilen tek veri, düzeltmeden sonra proje sahibinin 12 Kasım 2026'da Turnuva'da oynadığı turların yerel
kayıtlarıdır: 79 kaydın 33'ü iptaldir; hüküm verilen 46 turun 26'sı geçerli (hepsini YZ kazanmıştır),
11'i faul, 9'u geçersizdir (Bölüm 5.1.8). Bunlar tek bir oyuncunun, sürüm bilgisi taşımayan kayıtlarıdır;
v4.2.3 gerçek kamerayla denenmemiştir (Bölüm 8.2). Canlı kamerada izleyici gürültüsü, hareket bulanıklığı,
kare kaybı, iniş saptama hatası, kare → mühür gecikmesi yalnızca proje sahibinin tek oturum dizisinde ölçülmüştür (geçerli 26 turda kare → mühür gecikmesinin medyanı 62,5 ms (10.–90. yüzdelik 38,2–107,2); duvar saatine göre önceliğin medyanı 120,6 ms'dir ve 26 turun 2'sinde bu öncelik negatiftir (−47,4 ve −0,2 ms); Bölüm 8.2), gösterim gecikmesi bilinmemektedir; işlenen kare
hızı yalnızca bu kayıtlarda ölçülmüştür (uçuşta medyan 17 kare/s). İnişin tarihlenmesi simülasyonda da açık
bir noktadır: v4.2.0'ın eklediği bir yumuşak iniş yolu, 20 kare/s'de atış vuruşu genliğinin %6'sına ya da
%10'una indirildiğinde turların onda birinde inişi gerçek inişten yaklaşık 100 ms ya da daha sonraya tarihler ve
aradaki mühürler inişten önce sayılır (Bölüm 5.1.8). Model uyumsuzluğu deneyi bir duyarlılık
çözümlemesidir, gerçek dünyadaki oranların ölçümü değildir. Veritabanı betiği bu çalışmada çalıştırılmamış,
arayüz kullanıcılarla sınanmamıştır. Bu nedenle çalışmanın savı "insanlara karşı yenilmez bir sistem yapılmıştır"
değil, "yenilmezlik iddiasının ne anlama gelebileceği kesin olarak tanımlanmış, bunu denetlenebilir kılan bir
sistem kurulmuş, varsayımlar altındaki davranışı ve bu varsayımlara duyarlılığı ölçülmüştür" biçimindedir.

Çalışmanın yöntemle ilgili sonucu da kayda değerdir: bir dürüstlük iddiası, onu yazanların testleriyle değil,
onu kırmaya çalışan bağımsız bir okumayla sınanır. Önceki sürüm için yapılan denetim yeniden tasarım için
yinelendiğinde, aynı kusur sınıfları daha ince biçimlerde yeniden bulunmuştur; üç delik de incelemeden
sonra ortaya çıkmıştır: ikisi teoremin ispatı kodla adım adım karşılaştırılırken (biri metin yazılırken,
öteki metnin olgu denetiminde), üçüncüsü ispatı kırmaya çalışan son saldırı denetiminde; üçü de
kapatılmıştır. v4.2'nin denetimi aynı dersi yinelemiştir: ölçülmeden yayımlanan değişiklikler, v4.2.2'nin 114
testinin hepsi geçerken Turnuva güvencesini kırmış ve dürüst Kâğıt'a verilen faulü artırmıştır; ikisini de
bulanık sınama ve eşleşmiş simülasyon göstermiştir.

## 9.2 Gelecek çalışmalar

1. **Gerçek kamera ve insan denekli doğrulama.** Ek C'deki protokol uygulanmalıdır: sonuçsuz deneme payının
   (faul ve geçersiz) ve dürüst atışlardaki haksız faulün gerçek dağılımı, karar önceliğinin bilgi kümesine
   ve duvar saatine göre gerçek değerleri (kare → mühür gecikmesi), hakemin iniş ve geç hamle kararlarının
   yüksek hızlı video ile karşılaştırılması, Turnuva altında gerçek kayıp oranı ve canlı tahmin
   göstergesinin oyuncu davranışına etkisi ölçülmelidir. Uygulamanın dışa aktarımı bunun için gereken tur
   kayıtlarını içerir; yalnızca tur başına örnek izleri dışarıda bırakılır (Ek C). Bunlardan önce v4.2.3
   gerçek bir kamerayla denenmeli: işlenen kare hızı ve izleyicinin hızlı vuruşlarda eli kaybetme sıklığı
   birden çok oyuncuda ölçülmeli (tek oyuncunun yerel kayıtlarında 79 kaydın 18'i el kaybıyla iptal
   edilmiştir; Bölüm 5.1.8), gizlilik gerçek bir yüz ve elle sınanmalıdır (Bölüm 8.2).
2. **Davranış kanalının açık veri kümeleriyle çevrimdışı değerlendirmesi.** Brockbank ve Vul'un açık
   verileri (58 insan çifti; yedi kararlı bota karşı 218 ve sekiz uyarlanır bota karşı 194 katılımcı;
   300'er tur) ve L. Wang ve arkadaşlarının 52 oyuncunun 300 turluk dizilerini içeren ek dosyaları
   [BrockbankVul2024; WangL2020] dizi modelinin gerçek insan dizilerindeki logaritmik kaybını ve net kazancını
   ölçmeye uygundur. Bu, simülasyondaki iyimserliği doğrudan sınar.
3. **Daha erken bir ipucu olarak kol salınımı.** Yalnızca bilek kinematiğinden hamlenin şansın üzerinde
   (%47,6) çözülebildiği gösterilmiştir [Keck2026]. Salınım öznitelikleri üçüncü bir kanıt kanalı olarak
   eklenebilir; etkisi küçük olacaktır ama parmaklar kıpırdamadan önce bilgi verir.
4. **Daha yüksek kare hızı ve bulanıklığın ölçülmesi.** 120 kare/s ve kısa pozlamalı kameralarla açılma
   başlangıcının gerçek saptama gecikmesi ölçülmeli; izleyici gürültüsünün hareket hızına bağımlılığı
   doğrudan kestirilerek gürültü modeline konmalıdır. E8'e göre bu, sistemin en duyarlı olduğu
   uyumsuzluklardandır (karar önceliğini en çok kısaltan iki bozulmadan biridir; açık dürüst atışlardaki faulü
   yalnızca geride kalan yüzük ve serçe parmağı ondan çok artırır): dedektör tur başına sabit bir gürültü varyansı kullanır, gerçek
   hata ise tam da kanıtın en değerli olduğu anda büyür.
5. **Güvenilir zaman damgası.** Oturum zincirinin başı her seri sonunda bir zaman damgası yetkilisine
   [RFC3161] ya da bir tanık sunucusuna demirlenebilir; böylece zincir sırası istemci dışından
   doğrulanabilir. Her atış öncesinde ağ gidiş dönüşü pratik olmadığından demirleme seri düzeyinde
   yapılmalıdır.
6. **Öğrenilmiş bir olabilirlik modeli.** En küçük sarsım ailesi yerine, toplanan gerçek açılma izlerinden
   öğrenilen (ör. oyuncuya özgü biçim parametreli ya da ilintili gürültülü) bir olabilirlik modeli
   kalibrasyonu düzeltebilir. Kesin uygun skorlarla ölçülen kalibrasyon hatası bu çalışmanın başarı ölçütü
   olmalıdır.
7. **Kuralın yeniden tasarımı.** Faul oranını düşürmek için hakem büyüklüğünün eşikleri oyuncunun ölçülen
   kare hızına ve gürültüsüne göre uyarlanabilir; ancak bu, kuralın oyuncudan bağımsızlığını (D5) zayıflatır
   ve ayrı bir tartışma gerektirir.
8. **Arayüzün kullanıcılarla sınanması**, açık tema, üçüncü taraf kaynakların siteyle birlikte sunulması,
   veritabanı betiğinin gerçek bir veritabanında sınanması ve yazma uç noktasına hız sınırı konması.
9. **Tek atış kipi için açık bir kalibrasyon adımı.** Bu kipte kurulma eşiği sıkıdır ve yumruğu çok yanlış
   okunan bir el dışarıda kalabilir (Bölüm 5.1.6); iki duruşluk (yumruk, açık el) kısa bir kalibrasyon bu
   sınırı kaldırır.
10. **İkinci bir bağımsız inceleme ve biçimsel denetim.** İlk inceleme 45 bulgu çıkarmış, düzeltmelerden
    sonra üç delik daha bulunmuştur; hiçbirini testler bulmamıştır. v4.2.1'in güvenceyi kırdığını da testler
    değil, bulanık sınama bulmuştur. Teorem 1'in ispat adımlarının (son
    havadaki karede revizyon adımının tamamlanması, aynı sayıların
    okunması, kare sırası) model denetimiyle ya da biçimsel bir kanıt aracıyla doğrudan zorlanması, "kural
    gereği" savını bir sonraki okumaya bırakmaktan daha sağlam olur; bugünkü saldırı bulanık sınaması
    (Bölüm 6.9) yalnızca rastgele örneklemeye dayalı bir ilk adımdır.
