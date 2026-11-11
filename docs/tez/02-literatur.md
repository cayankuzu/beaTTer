# 2. İlgili Çalışmalar

Bu bölüm altı alanı tarar ve her alanın sonunda beaTTer tasarımı için çıkan somut sonucu verir. Kaynakların
tamamı birincil metinleri açılarak doğrulanmıştır; yalnızca ikincil bir kaynak üzerinden okunabilenler
"aktarıldığına göre" kaydıyla anılır. TKM hakkında yaygın ama kaynağına izlenemeyen bilgiler ("folklor")
ayrıca işaretlenmiş ve kullanılmamıştır; önceki sürümün bir bölümü bu folklora dayanıyordu (Bölüm 5.1).

## 2.1 İnsanlar TKM'yi nasıl oynar ve neden kestirilebilir?

**Denge ve rastgelelik.** Sonlu iki kişilik sıfır toplamlı oyunlarda en küçük-en büyük değerler karma
stratejilerde çakışır [vonNeumann1928] ve her sonlu oyunun bir karma strateji dengesi vardır [Nash1951].
TKM'de bu denge düzgün dağılımdır; düzgün oynayan bir oyuncuya karşı her stratejinin beklenen kazancı
sıfırdır ve düzgün dağılımdan her sapma bir rakip tarafından sömürülebilir [GanzfriedSandholm2015]. Öte
yandan insanlar rastgele dizi üretmekte sistematik olarak zorlanır: Wagenaar'ın 15 deneysel çalışmayı
kapsayan taramasında hemen hepsinde ardışık yanıt yanlılığı, çoğunda da olumsuz yakınlık etkisi (fazla
değişim, kısa tekrar dizileri) bulunmuştur [Wagenaar1972]. İkili dizilerde standart yönerge altında üretilen
değişim olasılığı beklenen $0{,}50$ yerine $0{,}56$–$0{,}63$ arasındadır [FalkKonold1997].

**Koşullu tepkiler.** Wang, Xu ve Zhou 360 öğrenciyi altışar kişilik 60 grupta 300'er tur oynatmış ve
bir önceki turun sonucuna koşullu "kal / saat yönünde kay / ters yönde kay" olasılıklarını bildirmiştir
[Wang2014]. Bu olasılıklar makalede yalnızca çubuk grafik olarak yer alır; tablo yoktur. Standart ödeme
yapısında ($a=2$) koşullu tepki stratejisinin Nash'e göre ölçülen kazancı $0{,}000\pm0{,}006$'dır; "koşullu
tepki Nash'i yener" sonucu yalnızca beraberliğin maliyetli olduğu $a>2$ koşulları içindir. Sayısal tablo
veren en açık kaynak Forder ve Dyson'dır: 36 katılımcı, sömürülemeyen bir bilgisayara karşı 450'şer tur
[ForderDyson2016]. Bir önceki sonuca göre sonraki hamle (aynı / bir üst / bir alt):

| Önceki sonuç | Aynı | Bir üst (kendi hamlesini yenen) | Bir alt |
|---|---|---|---|
| Kazanç | %42,45 | %29,32 | %28,23 |
| Kayıp | %21,46 | %39,13 | %39,41 |
| Beraberlik | %29,28 | %37,32 | %33,40 |

Aynı laboratuvarın sonraki çalışmalarında "kaybedince değiştir" eğilimi şansın ($\%66{,}66$) üzerinde
($\%77{,}23$, $p<0{,}001$), "kazanınca kal" ise şanstan ayırt edilemez ($\%36{,}67$, $p=0{,}28$) bulunmuştur
[Dyson2021].

**Etki büyüklükleri küçüktür.** Yukarıdaki tablodan iki sınır türetilebilir (kendi türetimimiz; sonuçların
eşit olasılıklı olduğu varsayımıyla). Tabloyu tam olarak izleyen bir oyuncuya karşı en iyi yanıtın net
kazancı kazançtan sonra $0{,}4245-0{,}2823=0{,}142$, kayıptan sonra $0{,}3913-0{,}2146=0{,}177$,
beraberlikten sonra $0{,}3732-0{,}2928=0{,}080$, ortalamada tur başına yaklaşık $0{,}13$'tür. Aynı tablonun
koşullu entropisi ortalama $1{,}558$ bittir; şansa ($\log_2 3=1{,}585$) göre bilgi kazancı tur başına
yalnızca yaklaşık $0{,}027$ bittir. Yani grup düzeyindeki yanlılık gerçektir ama zayıftır; onu kullanmak
yüzlerce turluk kanıt gerektirir.

**Bireysel farklar ve uyum.** Grup ortalamaları bireyleri iyi temsil etmez. Zhang ve arkadaşlarında 90
katılımcının yalnızca 36'sının geçişleri önceki sonuca bağlıdır ve bunların bir bölümü ters örüntü gösterir
[ZhangMoisan2021]. Sömürülemeyen rakiplere karşı grup düzeyinde anlamlı bir kal/kay yanlılığı
bulunmamış, sömürülebilir (kuralını %70 izleyen) rakiplere karşı ise katılımcılar %49,4 kazanmıştır
[SundvallDyson2022]. İnsan çiftlerinde 300 turda ortalama mutlak galibiyet farkı $19{,}26$'dır (rastgele
oyunda beklenen $11{,}3$) [BrockbankVul2020]. İnsanlar basit kurallı botları hızla öğrenir (önceki hamleye
dayalı botlara karşı %57,9–%66,5 kazanma), fakat sonuç × geçiş bağımlılığını izleyen bota karşı şans
düzeyinde kalır (%34,1); uyarlanır botlardan yalnızca 27 hücreli bağımlılık izleyenler insanları yenmiş,
3 hücreli basit botlar ise yenilmiştir [BrockbankVul2024].

**Botlar insanlara karşı ne başardı?** Hakemli tek insan-bot ölçümü L. Wang ve arkadaşlarınındır: 1–5.
(ya da 1–10.) dereceden Markov zincirlerinden oluşan topluluk 52 öğrenciye karşı 300 turda ortalama
$+37{,}39$ (SS $33{,}12$) ve $+35{,}64$ (SS $21{,}21$) net skor elde etmiştir; bu tur başına yaklaşık
$+0{,}12$'dir [WangL2020]. Makale bütün oyuncular için tablo ya da anlamlılık testi vermediğinden "insanların
%95'inden fazlasını yener" ifadesi güçlü bir istatistiksel iddia olarak alınmamalıdır. Kuramsal üst sınırlar
yalnızca deterministik yanlılıklar içindir: deterministik kazan-kal/kaybet-değiştir oyuncusu üç hamleli
oyunda en çok 13 tur dışında her turda yenilebilir [BlumDutz2024]; stokastik insanlar için tavanı
kestirilebilirlik belirler.

**İlk hamle ve hamle sıklıkları.** En büyük veri kümesinde (5 012 128 ilk atış) dağılım Taş %33,99, Kâğıt
%34,82, Makas %31,20'dir [Batzilis2019]. Laboratuvar örneklemlerinde Taş fazlalığı (%35,2–%35,6)
istatistiksel olarak anlamlı değildir [Dyson2016; ForderDyson2016].

**Tutmayan folklor.** (i) "Taş %35,4, Kâğıt %35,0, Makas %29,6" sayılarının örneklem büyüklüğü, tarihi ya da
yöntemi bulunamamıştır. (ii) "Erkekler taşla, kadınlar makasla açar" iddiasının hakemli bir dayanağı yoktur.
(iii) "En sık ilk hamle taştır" en büyük veri kümesinde doğru değildir. (iv) "İnsanlar kazan-kal/kaybet-değiştir
oynar" genel bir yasa değildir. (v) "Kaybeden, taş-kâğıt-makas sırasındaki bir sonraki hamleye geçer"
[Wang2014]'ün yanlış aktarımıdır. (vi) Elin oluşumunu görebilen oyuncularda beraberliklerin artması
(%36,3'e karşı %33,3) küçük ve tek yönlü sınamayla bulunmuş bir etkidir [Cook2012].

> **Bu çalışma için sonuç.** Davranış kanalı kendi başına küçük bir üstünlük sağlar (literatürde tur başına
> $\approx 0{,}12$ net; kuramsal tavan grup tablosu için $\approx 0{,}13$) ve rastgele oynayan birine karşı
> hiçbir üstünlük sağlayamaz. Topluluk önseli yalnızca [Batzilis2019] ve [ForderDyson2016]'nın yayımlanmış
> sayılarından kurulur ve karışımda tek bir uzmandır; kişisel uzmanlar daha iyi kestirdiğinde ağırlığını
> yitirir. "Yenilmezlik" bu kanaldan beklenemez; asıl yük kinematik kanaldadır.

## 2.2 Dizi kestirimi, uzman tavsiyesiyle öğrenme ve güvenli sömürü

**RoShamBo yarışması ve Iocaine Powder.** Billings'in aktardığına göre 1999'daki ilk uluslararası RoShamBo
programlama yarışmasında programlar 1000'er turluk maçlarda birbirleriyle karşılaşmış, birinciliği Iocaine
Powder almıştır [Billings2000]. Egnor'un açıklamasına göre bu program her temel kestiriciyi altı aday
stratejiye çevirir (kestirimi yenen hamle, rakibin bunu sezdiği varsayımıyla bir ve iki adım ötesi ve aynı
üç düzeyin roller değiştirilmiş hâli) ve o ana kadar en çok puan toplayan adayı oynar [Egnor2000]. Bu seçici
"lideri izle" türündendir ve Hannan tutarlı değildir [CesaBianchiLugosi2006]; gücü kuramsal değil görgüldür
ve yalnızca botlara karşı ölçülmüştür.

**Uzman tavsiyesiyle kestirim.** Ağırlıklı Çoğunluk algoritması yanılan uzmanın ağırlığını bir çarpanla
küçültür [LittlestoneWarmuth1994]; Hedge bunu sürekli kayıplara genelleştirir [FreundSchapire1997]. $[0,1]$
değerli dışbükey kayıpta üstel ağırlıklı ortalama kestiricinin pişmanlığı $n$ tur ve $N$ uzman için en çok
$\sqrt{(n/2)\ln N}$'dir; logaritmik kayıp $\eta=1$ ile üstel-içbükey olduğundan pişmanlık dizinin uzunluğundan
bağımsız olarak en çok $\ln N$'dir ve bu durumda kestirici tam olarak Bayesyen karışımdır
[CesaBianchiLugosi2006]. beaTTer'ın $N=79$ hipotezi için bu, en iyi hipoteze göre toplamda en çok
$\ln 79\approx4{,}4$ nat ($\approx6{,}3$ bit) fazladan logaritmik kayıp demektir (unutma ve sabit-paylaşım
eklendiğinde bu sınır aynen geçerli değildir). "Daha çok uzman her zaman daha iyidir" doğru değildir: bedel
$\ln N$ ile büyür. En iyi uzmanın zamanla değiştiği diziler için sabit-paylaşım, her turda ağırlığın $\alpha$
kadarını düzgün dağıtır [HerbsterWarmuth1998] (bu çalışmada [CesaBianchiLugosi2006] üzerinden okunmuştur).

**Evrensel kestirim ve sıkıştırma tabanlı modeller.** Krichevsky–Trofimov kestiricisi, Dirichlet$(\tfrac12)$
önseli altında belleksiz modellerin Bayesyen karışımıdır [KT1981] ([CesaBianchiLugosi2006] ve [Willems1995]
üzerinden okunmuştur). Bağlam Ağacı Ağırlıklandırma, belirli bir derinliğe kadar bütün ağaç kaynakları
üzerinde, her düğümde KT kestiricisiyle, kesin bir Bayesyen karışım hesaplar [Willems1995]. Özgün yöntem
ikili alfabe içindir; çok simgeli doğrudan genellemenin büyük alfabelerde kötü çalıştığı bildirilmiştir
[Begleiter2004]; üç simgeli durum için yayımlanmış bir karşılaştırmaya taramamızda rastlanmamıştır. Kısmi Eşleşmeyle Kestirim (PPM) en uzun eşleşen bağlamdan kestirir ve
görülmemiş simgeler için daha kısa bağlama "kaçar" [ClearyWitten1984; Begleiter2004]. Bireysel diziler için
evrensel kestirim kuramı, derecesi büyüyen Markov kestiricilerinin sonlu durumlu kestirilebilirliğe
ulaştığını ve eşitliklere yakın durumlarda rastgeleleştirmenin zorunlu olduğunu gösterir [Feder1992].

**Güvenli sömürü.** Ganzfried ve Sandholm, tekrarlı oyunda dengeden sapan güvenli stratejilerin ancak
rakibin "hediye" stratejisi varsa var olabildiğini kanıtlar; standart TKM'de hediye stratejisi yoktur, yani
düzgün dağılımdan her sapma bir rakibe karşı beklenen değerde kaybettirebilir [GanzfriedSandholm2015].
Düzgün oyun her hamleye karşı tam olarak oyun değerini kazandığından, "beklenen değerde kazandığını riske
at" türü bir bütçeye TKM'de hiç kazanç yazılmaz (kendi çıkarımımız).

**Skorlama ve kalibrasyon.** Bir skorlama kuralı, beklenen skoru yalnızca gerçek dağılım bildirildiğinde en
büyükleniyorsa kesin uygundur; Brier (karesel) ve logaritmik skor kesin uygundur, isabet oranı ise uygun ama
kesin uygun değildir ve olasılıkların niteliğini belgeleyemez [GneitingRaftery2007; Brier1950]. Beklenen
kalibrasyon hatası (ECE), kutulara ayrılmış kestirimlerde gözlenen isabet ile ortalama güven arasındaki
ağırlıklı mutlak farktır [Naeini2015; Guo2017]; 10 ya da 15 kutu bir standart değil, bu çalışmaların deney
ayarıdır. Oranlar için Wilson skor aralığı kullanılır [Wilson1927]. Zaman serilerinin erken sınıflandırması
yazını, kararı ne kadar erken vermenin doğruluğa ne kadar mal olduğunu açık bir ödünleşim olarak ele alır
[Xing2012].

> **Bu çalışma için sonuç.** (a) Seçici olarak "lideri izle" yerine logaritmik kayıpta Bayesyen karışım
> kullanılır; Iocaine'in ikinci-tahmin düzeyleri dağılımların döndürülmesi olarak karışıma katılır. (b)
> Düzgün (Nash) uzman her zaman karışımdadır. (c) TKM'de kesin güvenli sömürü olanaksız olduğundan sınırlı ve
> ilan edilmiş bir kayıp bütçesi kullanılır (Önerme 1). (d) Raporlama kesin uygun skorlarla (Brier,
> logaritmik kayıp), Wilson aralıklarıyla ve güvenilirlik diyagramıyla yapılır; isabet tek başına verilmez.
> (e) Erkenlik–doğruluk ödünleşimi ayrı bir deneyle ölçülür (Bölüm 6.2).

## 2.3 Biyomekanik ve motor kontrol

**Tokyo janken robotu: yayımlanmış sayılar.** Hakemli kısa bildiriye göre sistem $1280\times1024$ piksellik
yüksek hızlı bir kamerayla el şeklini her 2 ms'de (500 Hz) tanır; 3000 kare/s çekimle ölçülen zaman
çizelgesinde insan elinin şekil değiştirmesi yaklaşık 60 ms sürer, robot el insandan yaklaşık 30 ms sonra
başlar ve 30 ms içinde tamamlar; oyuncu ve deneme sayısı bildirilmemiştir [Katsuki2015]. Laboratuvarın proje
sayfası birinci sürümde robotun şeklini insandan yaklaşık 20 ms sonra, ikinci sürümde neredeyse aynı anda
tamamladığını belirtir [IshikawaLab]. Üçüncü kuşak 500 kare/s'lik bir izleme kamerası kullanır; robotun şekil
oluşturması 20 ms sürer ve robot, kol aşağı inmeye başlayana kadar bilerek bekletilir; kazanma oranı
istatistiği yoktur, yalnızca gösterim videosu vardır [Ito2016]. **Yapmadıkları:** bu sistemler hamleyi
*kestirmez*; oluşmakta olan şekli parmak sayarak tanır ve insanın fark edemeyeceği kadar kısa bir gecikmeyle
*tepki verir*. Taahhüt, öğrenme ya da davranış modeli içermezler. "1000 kare/s kamera, 1 ms'de tanıma"
yalnızca web sayfasında geçer; hakemli metinlerde 2 ms'dir.

**Parmak kinematiği ve hızları.** 22 sağlıklı yetişkinde hızlı kavra-bırak sırasında uzun parmak eklemlerinin
tepe açılma hızları MCP $1270\pm244$, PIP $1368\pm295$, DIP $1144\pm222$ °/s'dir [Li2023]. En yüksek hızda
işaret parmağı bük-aç hareketinde genç yetişkinlerin tepe açılma hızı $1010\pm53$ °/s, hızı $5{,}2\pm0{,}24$
Hz'dir [Chadnova2017]. Kendi hızında el açma ise $0{,}9\pm0{,}6$ s sürer ve MCP tepe hızı $354\pm181$
°/s'dir [Carpinella2011]. Uzun parmakların etkin bükülme aralığı MCP'de yaklaşık 84–87°, PIP'de 92–97°,
DIP'de 82–85°'dir [BK2024]. En küçük sarsım profilinde tepe hız $1{,}875\,A/D$ olduğundan (aşağıya bakınız),
$A\approx190$–$265$° toplam açılma ve üç eklemin tepe hızları toplamı ($\approx3780$ °/s) için en kısa
açılma süresi $D\approx95$–$130$ ms çıkar (kendi türetimimiz). Dolayısıyla "şekil değişimi 200 ms sürer, 30
kare/s kamerada bol kare vardır" varsayımı hızlı atışlar için desteklenmez: 30 kare/s'de hızlı bir açılma
iki ile dört kareye sığar.

**Parmakların bağımsız olmaması.** Bireyselleşme indisi (1 = tam bağımsız) sağ elde işaret parmağı için
$0{,}982$, orta için $0{,}937$, yüzük için $0{,}907$'dir; yüzük parmağı 10 sağ elin 9'unda en az bağımsız
parmaktır [HagerRoss2000]. Kuvvet üretiminde, basması istenmeyen parmaklar kendi en büyük kuvvetlerinin
%67,5'ine varan kuvvet üretebilir [Zatsiorsky2000].

**En küçük sarsım.** Hogan ile Flash ve Hogan'ın modeline göre (ikincil kaynaktan okunmuştur) durağan
başlayıp biten düzgün hareketler sarsımın karesinin zaman integralini en aza indirir; konum profili
$10s^3-15s^4+6s^5$, hız profili simetrik çan biçimlidir [FlashHogan1985]. Kavrama sırasında işaret parmağı
yörüngelerini üç eniyileme modeli arasında en iyi betimleyen, her eklem açısının bu beşinci derece
polinomu izlediği en küçük açısal sarsım modelidir (dört katılımcı) [FriedmanFlash2009].

**El şeklinin erken çözülebilirliği.** Uzanma sırasında el şekli sonda değil hareket boyunca kademeli
oluşur [Santello2002]. Kavranacak nesnenin boyu el kinematiğinden hareketin %10'unda %63,14, %20'sinde
%70,49, %50'sinde %95,81 doğrulukla sınıflanabilmiştir (şans %50) [Ansuini2015]. TKM'ye özgü olarak, yalnızca
bilek salınım kinematiğinden oyuncunun kendi yaklaşan hamlesi %47,6 (%95 GA 46,9–48,3; şans %33,3)
doğrulukla çözülmüştür (38 çift, 300'er oyun, 240 Hz hareket yakalama) [Keck2026].

**Tepki süresi sınırları.** 1469 kişilik bir örneklemde basit görsel tepki süresi ortalama $230{,}8$ ms
(SS $26{,}8$), ölçülen donanım gecikmesi düşüldüğünde 213 ms'dir [Woods2015]. Başlatılmış bir el hareketini
durdurma süresi beş çalışmada 204–219 ms'dir [Jana2020]. Uzanma sırasında görsel sarsıntıya istemsiz
düzeltme yaklaşık 108–152 ms'de, istemli yanıt ise ortalama $232\pm38$ ms'de başlar [FranklinWolpert2008].

**Ritim.** İki düzeyli zamanlama modeli, ardışık vuruş aralıklarını merkezî bir saat aralığı ile motor
gecikmelerinin farkının toplamı olarak yazar [WingKristofferson1973]. Vuruş eşzamanlama yazınında
değişkenlik 250–2000 ms aralığında yaklaşık olarak aralıkla orantılıdır; yanıp sönen görsel uyarana
eşzamanlama yaklaşık 460 ms'den kısa aralıklarda başarısız olurken işitsel diziler 100–120 ms'ye kadar
izlenebilir; kendi hızında vuruşta yeğlenen dönemler 250 ms ve 500–600 ms dolayındadır [Repp2005].

> **Bu çalışma için sonuç.** (a) Açılma modeli en küçük sarsım ailesidir ve süre ızgarası 50–340 ms'yi
> kapsar. (b) Tanınacak olay tamamlanmış şekil değil açılmanın *başlangıcıdır*; bir web kamerası janken
> robotunun 2 ms'lik çevrimine yaklaşamayacağı için üstünlük hızdan değil modelden gelmelidir. (c) Makas'ta
> yüzük/serçe için artık açılma ($\kappa$) modellenir. (d) İniş sonrası yumruk tutma penceresi (250 ms) basit
> tepki süresinin hemen üzerine konmuştur. (e) Sayım işitseldir; metronom varsayılanı 100 vuruş/dk'dır
> (600 ms). (f) Kol salınımının tek başına bilgi taşıdığı [Keck2026] gelecekteki bir ipucu kaynağıdır
> (Bölüm 9).

## 2.4 Görü ve işaret işleme

**MediaPipe Hands.** Boru hattı iki aşamalıdır: tek atımlı bir avuç dedektörü ve 21 eklem noktası, el
varlığı olasılığı ve el yönü üreten bir regresyon modeli; dedektör yalnızca ilk karede ya da el
yitirildiğinde çalışır; derinlik yalnızca sentetik görüntülerden öğrenilmiştir [Zhang2020]. Model kartına
göre metre cinsinden "dünya" koordinatları sentetik veriden kestirilir ve değerlendirme yalnızca iki
boyutta yapılır; avuç boyuna normalize ortalama mutlak hata tam model için $\%10{,}09\pm1{,}73$, insan
yeniden işaretlemesi için %6,0'dır; model düşük ışık ve **hareket bulanıklığı** altında sınanmamıştır
[MediaPipeHandCard2021]. Hazır jest sınıflandırıcısı yedi durağan jesti tanır; hareket içeren jestler kapsam
dışıdır [MediaPipeGestureCard2022]. Yüz gizliliğinde kullanılan BlazeFace $128\times128$ girdili, altı
anahtar noktalı bir yüz dedektörüdür [Bazarevsky2019].

**Süzme ve türev.** 1-euro süzgeci, kesim frekansı işaretin süzülmüş hızıyla artan birinci derece bir alçak
geçirendir [Casiez2012]; 1 Hz kesimde zaman sabiti 159 ms'dir, yani hızlı olaylar için kabul edilemez bir
gecikme üretir. Gürültülü veride sayısal türev kötü konumlanmış bir problemdir; yalın sonlu farklar orta
düzeyde gürültüde bile kullanılamaz türevler verir, yumuşatma ise tepeleri bastırır [vanBreugel2020].
Kalman'ın özyineli durum kestiricisi [Kalman1960] konum ve hızı birlikte, belirsizlikleriyle verir.

**Tarayıcıda zamanlama.** `requestVideoFrameCallback` her video karesi için bir geri çağrı ve kare meta
verisi (sunum zamanı, yerel kameralar için isteğe bağlı yakalama zamanı) sağlar; bir W3C standardı değil
topluluk taslağıdır ve yakalama zamanının tarayıcılar arası varlığı doğrulanmamıştır [WICGrvfc2024].
`performance.now()` 100 µs'ye (yalıtılmış bağlamda 5 µs'ye) kabalaştırılır ve tarayıcı daha kaba bir değer
ya da titreşim ekleyebilir [HRTime]. Kamera ayarındaki `frameRate` elde edilen değil yapılandırılan
değerdir [MediaCapture].

**Kamera gecikmesi.** Telefonlarda sensörden uygulama geri çağrısına gecikme 30 kare/s'de 60–90 ms
ölçülmüştür [Kamarainen2017]; endüstriyel bir kamera-ekran zincirinde camdan cama ortalama gecikme 25 Hz'de
50,4 ms'dir [Bachhuber2016]. Tüketici web kameralarının tarayıcıdaki yakalama gecikmesi ya da 30 kare/s'de
el izleme için hareket bulanıklığı üzerine hakemli bir ölçüm bulunamamıştır.

> **Bu çalışma için sonuç.** (a) Bilim çekirdeği ham (süzülmemiş) eklem noktalarını alır; 1-euro yalnızca
> görüntüleme içindir; hız Kalman süzgecinden ya da yörünge ailesine uyumdan gelir, sayısal türevden değil.
> (b) Öznitelikler metrik derinliğe değil kemikten kemiğe açılara dayanır ve her turda yumruğa göre yeniden
> sıfırlanır; gürültü hareket hâlindeyken ölçülür. (c) Kareler kamera karesi başına bir kez, mevcut en iyi
> yakalama zaman damgasıyla işlenir; 60 kare/s istenir ama elde edilen hız ölçülerek raporlanır. (d)
> Bütün zamanlar aynı saatte ölçüldüğü için sabit kamera gecikmesi iniş–mühür farklarını etkilemez; ancak
> ekranda mührün görünme anını etkiler (Bölüm 8.2).

## 2.5 Taahhüt şemaları, özet zincirleri ve zamanlama kuralları

**Taahhüt.** Bir taahhüt şeması, mesaj için bir taahhüt dizgisi ve bir açılış dizgisi üreten ve bunları
doğrulayan bir algoritma çiftidir; *bağlayıcılık* aynı taahhüdün iki farklı mesajla açılamamasını,
*gizleyicilik* taahhüdün mesaj hakkında bilgi vermemesini ister [BonehShoup2023]. Özet tabanlı kurulumda
gizleyicilik büyük bir nonce uzayı gerektirir: üç olası mesajda nonce'suz bir özet üç denemeyle açılır ve
çakışma dayanıklılığı gizleyiciliği gerektirmez. Uzaktan oyunlarda taahhüt-sonra-ifşa fikrinin kökeni
Blum'un telefonla yazı-tura protokolü olarak aktarılır [Blum1983]; çakışmasız özetlemeden kanıtlanabilir
güvenli taahhüt Halevi ve Micali tarafından önerilmiştir [HaleviMicali1996] (yalnızca özeti okunmuştur).
SHA-256, 256 bitlik özet üretir [FIPS180-4]; çakışma dayanıklılığı 128 bittir [SP800-107].

**Zaman damgası ve zincirler.** Haber ve Stornetta, bir belgenin ne zaman oluşturulduğunu, zaman damgası
hizmetiyle iş birliği yapılsa bile geriye ya da ileriye tarihlenemeyecek biçimde belgeleme problemini
ortaya koymuştur [HaberStornetta1991]. Özet zincirli denetim kayıtları kurcalamayı önlemez, sonradan
*saptanabilir* kılar [SchneierKelsey1999]. Üçüncü tarafa karşı zaman kanıtı için güvenilir bir zaman damgası
yetkilisi gerekir [RFC3161]. Web Crypto'da `subtle` arayüzü yalnızca güvenli bağlamda, `getRandomValues`
ise her bağlamda kullanılabilir [WebCrypto].

**Bir taahhüt neyi kanıtlar, neyi kanıtlamaz?** Kanıtladığı: ifşa edilen hamle, özet yayımlandığı anda
sabitlenmiş olan hamledir. Kanıtlamadığı: özetin *ne zaman* yayımlandığı; bu, taahhüdü yapan tarafın kendi
saatine ve arayüzüne duyulan güvene kalır.

**Zamanlama kuralları.** Tanınmış bir uluslararası federasyon yoktur. World RPS Society kurallarında oyuncular
hazırlık vuruşlarıyla ("prime") eşzamanlanır, yaklaşma kol gövdeyle 90° yaptığında biter ve hamlenin bu
noktadan önce gösterilmesi gerekir; daha geç gösterilen hamle Zorunlu Taş sayılır [WRPS]. WRPSA'nın 2026
kurallarında yumruk sayım boyunca kapalı kalır; erken açma uyarı ve tekrarla, geç hamle doğrudan tur
kaybıyla cezalandırılır [WRPSA2026]. Japoncadaki *ato-dashi* için resmî bir kural metni bulunamamıştır.

> **Bu çalışma için sonuç.** Her mühür 128 bitlik kriptografik nonce içerir ve bir öncekinin özetine
> bağlanır; bütün revizyonlar saklanır ve ifşada açılır. Arayüz, mührün neyi kanıtlamadığını (zamanı) açıkça
> söyler. "Geç hamle" ilkesi var olan kural metinlerinden alınmış, ölçülebilir bir büyüklüğe ($h_F,h_B$)
> bağlanmış ve ceza olarak tekrar seçilmiştir.

## 2.6 İnsan–bilgisayar etkileşimi

**Yanıt süreleri.** Yaklaşık 0,1 s anlık hissedilir, 1 s düşünce akışını bozmaz, 10 s dikkatin sınırıdır
[Nielsen1993]. "Doherty eşiği 400 ms" olarak bilinen sayı anılan raporda yer almaz ve kullanılmamıştır.

**İnsan–YZ etkileşimi ve açıklanabilirlik.** Amershi ve arkadaşlarının 18 yönergesi arasında sistemin ne
yapabildiğini (G1) ve bunu ne kadar iyi yapabildiğini (G2) baştan açıklamak ve sistemin neden öyle
davrandığını açıklamak (G11) yer alır [Amershi2019]. Miller'ın derlemesine göre açıklamalar karşılaştırmalıdır,
seçilmiş bir iki nedene dayanır ve olasılıklara gönderme yapmak nedenlere gönderme yapmaktan daha az
etkilidir [Miller2019]. Açıklayıcı hata ayıklama ilkeleri açıklamanın *doğru* (gerçekte kullanılandan daha
basit bir modeli açıklamamak), eksiksiz ama bunaltmayan nitelikte olmasını ister [Kulesza2015]. Serbest
sorgulamada kullanıcıların istediği bilgi türleri uygulamanın ne yaptığı (%59,8), modeli (%33,6), girdileri
(%19,8) ve "neden"dir (%19,0); bütün açıklama türlerini birden sunmak zararlı olabilir [LimDey2009]. Google PAIR rehberi amacı güvenin *kalibrasyonu* olarak koyar ve güven gösteriminin, kullanıcının
davranışını değiştirmeyecekse ya da yanıltacaksa hiç yapılmamasını önerir [PAIR].

**Belirsizliğin iletimi.** Ayrık sonuçlu gösterimler (20 noktalı nokta grafikleri) olasılık okumasını
yoğunluk eğrilerine göre daha kesin kılar [Kay2016]; doğal sıklık biçimi Bayesyen çıkarımı kolaylaştırır
(%16'ya karşı %46 doğru çözüm) [GigerenzerHoffrage1995]. Konum kodlaması nicel değerlerin en doğru okunduğu
görsel kodlamadır [HeerBostock2010].

**Arayüzde dürüstlük.** Adar ve arkadaşları arayüzde aldatmayı, kullanıcıda sistem hakkında yanlış ya da
dayanaksız bir inanç oluşturan iddia, eksiltme ya da davranış olarak tanımlar ve aldatma ortaya çıktığında
güvene verilen zararın tartılması gerektiğini vurgular [Adar2013]. Karanlık örüntü sınıflamaları (dırdır,
engelleme, gizleme, arayüz müdahalesi, zorlama) şüpheli öğeleri sınıflamaya yarar [Gray2018]. "Daha çok
efekt daha iyidir" desteklenmez: 46 kişilik bir çalışmada "sulu" geri bildirimin anlamlı bir etkisi
bulunmamıştır [JuulBegy2016].

**Erişilebilirlik.** WCAG 2.2: metin karşıtlığı en az 4,5:1 (1.4.3), metin dışı öğeler 3:1 (1.4.11), renk
tek bilgi taşıyıcı olamaz (1.4.1), metin %200'e kadar büyütülebilmelidir (1.4.4; yakınlaştırmayı kapatan
`user-scalable=no` sınanabilir bir ihlaldir), saniyede üçten fazla parlama olmamalıdır (2.3.1), kendiliğinden
başlayan hareketli içerik durdurulabilmelidir (2.2.2), etkileşimle tetiklenen canlandırma kapatılabilmelidir
(2.3.3), bütün işlevler klavyeyle kullanılabilmeli (2.1.1) ve odak görünür olmalıdır (2.4.7), işaretçi
hedefleri en az $24\times24$ CSS pikseli olmalıdır (2.5.8; AAA'da 44, 2.5.5) ve durum iletileri odağı
taşımadan yardımcı teknolojiye duyurulmalıdır (4.1.3) [WCAG22]. Okabe–Ito paleti renk körü olan ve olmayan
izleyiciler için karışmayan sekiz renk verir ve öğelerin doğrudan etiketlenmesini önerir [OkabeIto2008].
"Koyu tema daha okunaklıdır" desteklenmez: koyu zemin üzerinde açık metin yerine açık zemin üzerinde koyu
metin lehine bir üstünlük ölçülmüştür [Piepenbrock2013].

**Gizlilik.** GDPR veri en aza indirmeyi (md. 5(1)(c)) ve tasarımdan itibaren/varsayılan olarak veri
korumayı (md. 25) ister [GDPR] (madde özetleri üzerinden okunmuştur); 6698 sayılı Kanun md. 4(2) amaçla bağlantılı, sınırlı ve ölçülü işlemeyi,
md. 6 biyometrik veriyi özel nitelikli sayarak açık rızayı, md. 10 aydınlatmayı ister [KVKK6698]. İzin
istemleri kullanıcı etkileşiminden sonra gösterildiğinde %30, bağlamsız gösterildiğinde %12 oranında kabul
edilir; sayfa yüklenirken izin istemek en kötü uygulamadır [PermissionsBP]. Aşamalı açıklama, önce en
önemli seçenekleri gösterip gelişmişleri isteğe bağlı ikinci bir görünüme bırakır [Nielsen2006].

> **Bu çalışma için sonuç.** Bölüm 7'deki her arayüz kararı bu kaynaklardan birine bağlanmıştır: yetenek ve
> sınırların baştan söylenmesi, karşılaştırmalı ve nedene dayalı tur açıklaması, ölçülmemiş değer yerine
> "—", simülasyon etiketinin kalıcılığı, Okabe–Ito'dan türetilmiş renk rolleri, klavye ve ekran okuyucu
> desteği, kamera izninin yalnızca düğmeye basıldıktan sonra istenmesi ve varsayılan olarak kapalı veri
> paylaşımı.

## 2.7 Özet: iddia → kaynak → beaTTer'da kullanımı

| İddia | Kaynak | beaTTer'da kullanımı |
|---|---|---|
| Düzgün oynayan rakibe karşı beklenen kazanç 0'dır; TKM'de her sapma sömürülebilir | [vonNeumann1928; Nash1951; GanzfriedSandholm2015] | Gözlem 1; Nash uzmanı; sınırlı kayıp bütçesi |
| Sonuca koşullu geçiş olasılıkları (kal/üst/alt) | [ForderDyson2016] | Topluluk önseli (`population.js`), "wsls" ve "humanLike" simüle oyuncular |
| İlk atış dağılımı %33,99 / %34,82 / %31,20 | [Batzilis2019] | Topluluk önselinin ilk tur dağılımı |
| İnsanlar basit sömürüye uyum sağlar; karmaşık bağımlılıklar sömürülebilir | [BrockbankVul2024] | Çok bağlamlı uzmanlar (sonuç × geçiş, ortak zincirler), unutma ve sabit-paylaşım |
| Markov topluluğu insanlara karşı tur başına ≈ +0,12 net | [WangL2020] | Bölüm 6.1 ve 6.7'de karşılaştırma ölçütü |
| Logaritmik kayıpta Bayesyen karışımın pişmanlığı ≤ ln N | [CesaBianchiLugosi2006] | Karışım tasarımı; 79 hipotez |
| Sabit-paylaşım değişen en iyi uzmanı izler | [HerbsterWarmuth1998] | $\alpha=0{,}002$ |
| KT kestiricisi, CTW, PPM | [KT1981; Willems1995; ClearyWitten1984] | Tablo uzmanları, üç CTW ve bir PPM-C uzmanı |
| İkinci-tahmin meta-stratejileri | [Egnor2000] (ikincil) | Döndürmeler ve ayna uzmanlar |
| Kesin uygun skorlar; ECE; Wilson aralığı | [GneitingRaftery2007; Naeini2015; Guo2017; Wilson1927] | `metrics.js`, laboratuvar paneli |
| Janken robotu 2 ms'de tanır, ≈30 ms sonra tepki verir; kestirmez | [Katsuki2015; Ito2016] | Bölüm 8.4'teki karşılaştırma |
| Hızlı atışta şekil değişimi ≈60 ms; tepe parmak hızları ≈1100–1400 °/s | [Katsuki2015; Li2023] | Süre ızgarası (50–340 ms), açısal hız göstergesi |
| En küçük sarsım parmak eklem yörüngelerini betimler | [FlashHogan1985; FriedmanFlash2009] | Açılma dedektörünün yörünge ailesi; simüle el |
| Yüzük parmağı en az bağımsız parmaktır | [HagerRoss2000; Zatsiorsky2000] | Makas şablonunda artık açılma |
| Basit görsel tepki süresi ≈213–231 ms | [Woods2015] | Yumruk tutma penceresi 250 ms |
| Ritim değişkenliği aralıkla orantılı; işitsel eşzamanlama daha kesin | [WingKristofferson1973; Repp2005] | Tempo tabanlı iniş kestirimi; işitsel metronom |
| MediaPipe: 21 nokta, sentetikten öğrenilmiş derinlik, hareket bulanıklığında sınanmamış | [Zhang2020; MediaPipeHandCard2021] | Açı tabanlı öznitelikler, tur içi gürültü kestirimi, geçerlilik tehdidi (Bölüm 8.2) |
| Sayısal türev gürültüyü büyütür; 1-euro gecikme üretir | [vanBreugel2020; Casiez2012] | Ham örnekler + Kalman; 1-euro yalnızca görüntülemede |
| rVFC kare başına geri çağrı ve meta veri verir | [WICGrvfc2024] | `camera.js` kare saati |
| Özet taahhüdü büyük nonce ile gizleyicidir | [BonehShoup2023; FIPS180-4] | 128 bit nonce, SHA-256, özet zinciri |
| Zincir kurcalamayı saptar; zaman için üçüncü taraf gerekir | [SchneierKelsey1999; HaberStornetta1991; RFC3161] | "Mühür neyi kanıtlamaz" metni; gelecek çalışma |
| Geç gösterilen hamle kural dışıdır | [WRPS; WRPSA2026] | Bağlama kuralı ve geç hamle faulü |
| Yetenek ve sınırları söyle; nedenini açıkla | [Amershi2019; Miller2019; Kulesza2015] | Tanıtım, tur raporu, açıklama kodları |
| Renk tek taşıyıcı olamaz; karşıtlık, klavye, hareket | [WCAG22; OkabeIto2008] | Tasarım belirteçleri (Bölüm 7.6) |
| Veri en aza indirme, varsayılan olarak koruma | [GDPR; KVKK6698] | Yerel işleme, varsayılan kapalı eşitleme |
