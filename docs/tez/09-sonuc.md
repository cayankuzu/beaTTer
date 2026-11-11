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
testleri yazılmış (toplam 105 test), deneyler yeniden üretilmiş ve bu metin baştan yazılmıştır.

**Simülasyonun gösterdikleri.** Belirtilen varsayımlar altında Turnuva ön ayarında 58 452 geçerli turda
kayıp gözlenmemiştir; bu, kuralın sonucudur ve dedektörün kalitesini ölçmez. Sistemi ölçen koşulsuz oranlarda:
dedektörle eşleşmiş sentetik bir oyuncuya karşı YZ, normal açan oyuncunun denemelerinin yaklaşık %94,5'ini
kazanır ve %5'i sonuçsuz kalır; geç açan oyuncuda denemelerin üçte biri sonuçsuzdur. Model bilerek
bozulduğunda kayıp sıfırda kalır ama dürüst bir oyuncunun sonuçsuz denemeleri %23'e kadar çıkar; en zararlı
bozulmalar, gerçek kameralarda beklenenlerdir (hareketle büyüyen gürültü, geç başlayan parmaklar). Aynı
deneyler diğer sınırları da göstermiştir: kinematik kanalın değeri son karelerdedir; karar çoğu turda
hareket oluşurken verilir; karar önceliğini öğrenmeden çok oyuncunun açılma zamanı belirler; sonsal az
güvenlidir; yüksek eklem gürültüsünde ya da kare kaybında sistem denemelerin büyük bölümünü geçersiz sayar;
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
15 000 oturumluk bir saldırı bulanık sınaması 14 579 geçerli turda sıfır kayıp vermiştir
(simülasyon; Bölüm 6.9).

**Doğrulanmayanlar.** Gerçek insanlarla tek bir tur bile ölçülmemiştir. Kamera yolu yalnızca sentetik bir
video akışıyla denenmiştir; canlı kamerada izleyici gürültüsü, hareket bulanıklığı, kare kaybı, iniş saptama
hatası, kare → mühür gecikmesi ve gösterim gecikmesi bilinmemektedir. Model uyumsuzluğu deneyi bir duyarlılık
çözümlemesidir, gerçek dünyadaki oranların ölçümü değildir. Veritabanı betiği çalıştırılmamış, arayüz
kullanıcılarla sınanmamıştır. Bu nedenle çalışmanın savı "insanlara karşı yenilmez bir sistem yapılmıştır"
değil, "yenilmezlik iddiasının ne anlama gelebileceği kesin olarak tanımlanmış, bunu denetlenebilir kılan bir
sistem kurulmuş, varsayımlar altındaki davranışı ve bu varsayımlara duyarlılığı ölçülmüştür" biçimindedir.

Çalışmanın yöntemle ilgili sonucu da kayda değerdir: bir dürüstlük iddiası, onu yazanların testleriyle değil,
onu kırmaya çalışan bağımsız bir okumayla sınanır. Önceki sürüm için yapılan denetim yeniden tasarım için
yinelendiğinde, aynı kusur sınıfları daha ince biçimlerde yeniden bulunmuştur; üç delik de incelemeden
sonra ortaya çıkmıştır: ikisi teoremin ispatı kodla adım adım karşılaştırılırken (biri metin yazılırken,
öteki metnin olgu denetiminde), üçüncüsü ispatı kırmaya çalışan son saldırı denetiminde; üçü de
kapatılmıştır.

## 9.2 Gelecek çalışmalar

1. **Gerçek kamera ve insan denekli doğrulama.** Ek C'deki protokol uygulanmalıdır: sonuçsuz deneme payının
   (faul ve geçersiz) ve dürüst atışlardaki haksız faulün gerçek dağılımı, karar önceliğinin bilgi kümesine
   ve duvar saatine göre gerçek değerleri (kare → mühür gecikmesi), hakemin iniş ve geç hamle kararlarının
   yüksek hızlı video ile karşılaştırılması, Turnuva altında gerçek kayıp oranı ve canlı tahmin
   göstergesinin oyuncu davranışına etkisi ölçülmelidir. Uygulamanın dışa aktarımı bunun için gereken tur
   kayıtlarını içerir; yalnızca tur başına örnek izleri dışarıda bırakılır (Ek C).
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
   doğrudan kestirilerek gürültü modeline konmalıdır. E8'e göre bu, sistemin en duyarlı olduğu tek
   uyumsuzluktur: dedektör tur başına sabit bir gürültü varyansı kullanır, gerçek hata ise tam da kanıtın en
   değerli olduğu anda büyür.
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
    sonra üç delik daha bulunmuştur; hiçbirini testler bulmamıştır. Teorem 1'in ispat adımlarının (son
    havadaki karede revizyon adımının tamamlanması, aynı sayıların
    okunması, kare sırası) model denetimiyle ya da biçimsel bir kanıt aracıyla doğrudan zorlanması, "kural
    gereği" savını bir sonraki okumaya bırakmaktan daha sağlam olur; bugünkü saldırı bulanık sınaması
    (Bölüm 6.9) yalnızca rastgele örneklemeye dayalı bir ilk adımdır.
