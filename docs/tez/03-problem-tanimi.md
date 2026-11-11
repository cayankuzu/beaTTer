# 3. Problem Tanımı ve Dürüstlük Değişmezleri

## 3.1 Oyun ve gösterim

Taş–Kâğıt–Makas (TKM) iki oyunculu, sıfır toplamlı, eşzamanlı hamleli bir oyundur. Hamle kümesi
$\mathcal{M}=\{\mathrm{T},\mathrm{K},\mathrm{M}\}$ tamsayılarla $\{0,1,2\}$ olarak kodlanır; $m$ hamlesini
yenen hamle $\operatorname{yener}(m)=(m+1) \bmod 3$'tür. Yapay zekânın (YZ) $a$, insanın $y$ oynadığı bir
turda YZ'nin kazancı

$$
u(a,y)=\begin{cases}+1, & a=\operatorname{yener}(y)\\ \;\;\,0, & a=y\\ -1, & \text{aksi hâlde}\end{cases}
$$

olur. Oyunun tek Nash dengesi her iki oyuncunun da $(\tfrac13,\tfrac13,\tfrac13)$ karma stratejisini
oynamasıdır ve oyunun değeri $0$'dır [vonNeumann1928; Nash1951]; standart TKM'de düzgün dağılımdan her
sapmanın bir rakip tarafından sömürülebildiği [GanzfriedSandholm2015]'te açıkça gösterilmiştir. Bundan çıkan
ilk sonuç bu tezin bütün tasarımını belirler:

> **Gözlem 1.** Rakibi gerçekten düzgün dağılımdan bağımsız örnekleyen bir oyuncuya karşı, yalnızca geçmiş
> turları kullanan hiçbir strateji beklenen değerde $0$'dan iyi yapamaz. Dolayısıyla "yenilmezlik" ya
> (i) insanın rastgele olmamasından (davranışsal kanal), ya da (ii) hamle tamamlanmadan önce gözlenen
> fiziksel ipuçlarından (kinematik kanal) gelmek zorundadır.

beaTTer her iki kanalı da kullanır ve — bu tezin temel iddiası olarak — hangisinin ne kadar katkı verdiğini
her turda ölçer ve raporlar.

## 3.2 Bir turun zaman yapısı

Oyuncu yumruğunu ritimle $N_p$ kez sallar (varsayılan $N_p=3$: "Taş – Kâğıt – Makas") ve bir sonraki
vuruşta ("Vur!") hamlesini gösterir. Gerçekleme ayrıca $N_p=2$'yi, tek atışı ($N_p=0$: sabit bir yumruk
350 ms tutulduğunda tur kurulur) ve sayımı uygulamanın verdiği metronom kipini destekler; aşağıdaki
tanımlar hepsinde aynıdır. Tüm zamanlar tek bir monoton saatte, milisaniye cinsindendir; "kare"
işlenen bir kamera karesidir ve yakalanma zamanı $t_k$ ile dizini $k$ vardır.

| Simge | Tanım |
|---|---|
| $t_{b}$ | Son hazırlık vuruşunun dip noktası; **uçuş** bu anda başlar |
| $t_{L}$ | **İniş**: atış vuruşunun bittiğinin algılandığı ilk karenin zamanı (yumuşak iniş, metronom ve izleme boşluğu durumlarında geriye dönük tarihlenebilir; metronom kipinde bir karenin zamanı yerine ilan edilmiş atış anı da olabilir; Bölüm 4.2, 4.4). **İniş karesi**, zamanı $t_L$'den küçük olmayan ilk karedir; dizini $m_L$'dir |
| $m_L-1$ | **Son havadaki kare**: iniş karesinden önce (dizini $m_L$'den küçük) elin izlendiği son kare |
| $t_{C}$ | Nihai el şeklinin durağan sınıflandırıcıya göre ilk kez kararlı olduğu an (inişten önce de olabilir) |
| $t_{c}^{(j)}$ | YZ'nin $j$. taahhüdünün (mührünün) zamanı: dayandığı karenin yakalanma zamanı, mühre $0{,}1$ ms'ye yuvarlanarak yazılır; $k^{(j)}$ taahhüdün dayandığı son kare |

YZ'nin bilgi kümesi iki bileşenden oluşur: önceki turların geçmişi
$\mathcal{H}_{r-1}=\{(y_i,a_i)\}_{i<r}$ ve içinde bulunulan turun kinematik gözlemleri
$X_{1:k}$. YZ, $k<m_L$ koşuluyla

$$
P\!\left(Y_r=y \mid \mathcal{H}_{r-1},X_{1:k}\right)\;\propto\;
\underbrace{P\!\left(y\mid \mathcal{H}_{r-1}\right)}_{\text{A kanalı: davranış}}\;
\underbrace{P\!\left(X_{1:k}\mid y\right)}_{\text{B kanalı: kinematik}}
$$

sonsalını hesaplar ve hamlesini buna göre **mühürler**.

## 3.3 Dürüstlük değişmezleri

Önceki sürümün incelenmesi (bkz. Bölüm 5.1) "yenilmezliğin" bir totolojiden kaynaklandığını göstermiştir:
vuruş anında görünen poz hem oyuncunun hamlesi sayılıyor hem de YZ'nin karşı hamlesini belirliyor,
"önceden kilitlenme süresi" ise ölçülmek yerine sabit bir aralığa sıkıştırılıyordu. Bu nedenle yeni
sistemde aşağıdaki altı değişmez **tasarım gereksinimi** olarak tanımlanmış, kodda yapısal olarak zorlanmış
ve otomatik testlerle doğrulanmıştır (kaynak kodda ve test adlarında aynı değişmezler sırasıyla I1–I6
olarak geçer; testlerle eşlemesi Bölüm 5.7'dedir).

**D1 — Bilgi kümesi ön-taahhüdü.** Bir turda YZ'nin *değerlendirilen* taahhüdü, iniş karesinden **önceki**
bir karede ($k<m_L$) yapılmış son taahhüttür. "Önce" **yalnızca kare sırasıyla** belirlenir: kare dizinleri
tamsayıdır ve kesin artandır, dolayısıyla sınama kesindir; zaman damgaları bu iş için hiçbir zaman
karşılaştırılmaz (mühürdeki zaman $0{,}1$ ms'ye yuvarlanır, kare zamanı yuvarlanmaz; ikisinin karıştırılması
bir kez, iniş öncesi bir mührün değerlendirme dışı kalmasına yol açmıştır; Bölüm 4.7). İniş karesi iniş
zamanında ya da sonrasında yakalanmış ilk kare olduğundan, değerlendirilen taahhüdün dayandığı kare inişten
önce yakalanmıştır. Uçuş (ve tek atış kipindeki kurulmuş bekleyiş) dışında taahhüt yolu kapalıdır; (geriye
dönük de olabilen) iniş karesinde ya da sonrasında üretilmiş taahhütler kayıtta kalır, "iniş sonrası"
olarak işaretlenir ve asla değerlendirmeye girmez. Bir izleme boşluğunu izleyen ve eli zaten iniş yüksekliğinde gösteren izlenen kare, iniş karesinin
kendisidir: boşluğun içinde ne olduğu bilinmediğinden ondan sonraki hiçbir şey "havada" sayılmaz. Bir
mühür atılamazsa (taahhüt kaydı onu reddederse) tur iptal edilir: bir tur, yenisi atılamadığı için eski bir
mühür üzerinden hiçbir zaman hükme bağlanmaz.

**D2 — Bağlayıcılık.** Her taahhüt, hamleyi ve 128 bitlik kriptografik rastgele bir nonce'u içeren kanonik
bir yükün SHA-256 özetidir; özet taahhüt anında yayımlanır, yük ancak ifşada açılır (Bölüm 4.8).

**D3 — Eksiksiz denetim izi.** Bir turun bütün taahhütleri ve revizyonları sırasıyla saklanır, ifşada
hepsi açılır ve doğrulanır — tur iptal edildiğinde de; hiçbir kayıt üzerine yazılmaz. Taahhütler özet
zinciriyle birbirine bağlıdır.

**D4 — Ölçülen, uydurulmayan.** Arayüze ya da kalıcı belleğe ulaşan her sayı ölçülmüş ya da ölçümlerden
hesaplanmıştır. "Güzel görünen" aralıklara sıkıştırma, sabit güven değerleri, formülle üretilmiş
"öğrenme yüzdesi" yoktur; bilinmeyen değer boş (—) gösterilir.

**D5 — Hakem bağımsızlığı.** Bir turun geçerli mi, faul mü olduğuna karar veren kurallar YZ'nin neyi
mühürlediğine ya da turu kimin kazanacağına bakmaz; yalnızca iniş öncesi kinematik kanıta (sabit,
oyuncudan bağımsız bir önsel altında) ve iniş sonrasında oturan şekle dayanır. **Atışa ait** taze bir
havadaki kanıt — inişten kısa süre önce, YZ'nin revize etmekte serbest olduğu izlenen bir kare — yoksa tur
geçersizdir, asla faul değildir: izleyicinin boşluğu oyuncuya yazılmaz.

**D6 — Öğrenme hijyeni.** Oyun hakkındaki her şey (hamle dizisi, güvenlik bütçesi, füzyon ağırlıkları,
açılma zamanlaması, şekil şablonları, ölçütler) yalnızca geçerli turlardan öğrenilir; faul ve geçersiz
turlar yalnızca sayaçları günceller. Tek istisna algılayıcı kalibrasyonudur: kameranın bu elin yumruğunu
ve açık parmaklarını hangi açılarla okuduğu, "yumruk yok" ve kararlı "belirsiz şekil" turlarından da
uyarlanabilir. Kalibrasyon ölçüm aygıtını betimler ve hiçbir oyun sonucunu kullanmaz (gerekçesi Bölüm
4.9'dadır).

Değişmezlerin bu ifadeleri, kaynak koddaki tur motorunun başlığındaki (`web/js/core/round_engine.js`)
I1–I6 tanımlarıyla aynıdır. D1, D3, D5 ve D6'nın yukarıdaki inceltilmiş hâlleri, v4'ün bağımsız
incelemesinde bulunan kenar durumlarının sonucudur (Bölüm 5.1.6); D1'deki kare sırası ifadesi ve atılamayan
mühür kaydı ile D5'teki "atışa ait" ve "revize etmekte serbest" kayıtları ise incelemeden sonra bulunan üç
deliğin sonucudur (Bölüm 4.7).

## 3.4 "Hamleden önce karar" ne demektir?

Kullanıcı gereksinimi şudur: *"Kişi hamle yapmadan beaTTer karar vermeli; böylece kişinin yaptığı harekete
göre hamle yapmış olabilme ihtimali ortadan kalksın."* Bu gereksinim üç ölçülebilir büyüklüğe çevrilmiştir
ve her tur raporunda verilir:

1. **İnişe göre öncelik**, $\Delta_L = t_L - t_c^{\text{son}} \ge 0$. D1 gereği değerlendirilen mührün karesi
   inişten önce yakalanmıştır, yani öncelik kare zamanı cinsinden yapısal olarak pozitiftir; raporlanan
   değer mühre yazılan, $0{,}1$ ms'ye yuvarlanmış zamandan hesaplandığı için negatif olmaz ama seyrek bir
   durumda $0{,}0$ okunabilir (Bölüm 4.7). Bu
   bir *bilgi kümesi* önceliğidir: mühürdeki zaman, kararın dayandığı karenin yakalanma zamanıdır. Özetin
   fiilen hesaplandığı anla iniş arasındaki **duvar saati önceliği** kamera turlarında ayrıca ölçülür ve
   raporlanır; negatif çıkabilir (Bölüm 4.10).
2. **Tamamlanmaya göre öncelik**, $\Delta_C = t_C - t_c^{\text{son}}$. Negatif çıkabilir (şekil havada çok
   erken tamamlanmışsa); gizlenmez.
3. **Mühür anındaki oluşum oranı**, $\pi_c\in[0,1]$: nihai açılma vektörünün, mühür karesinde ne kadarının
   oluşmuş olduğu (Taş için tanımsızdır).

Ayrıca her turda yalnızca davranış kanalıyla, hareket başlamadan verilen ilk kararın (uçuş başındaki
mührün) tek başına ne sonuç vereceği de karşı-olgusal olarak kaydedilir. Böylece "hiç hareket görmeden
verilen karar" ile "havadaki kinematikle güncellenen karar" ayrı ayrı raporlanır.

## 3.5 Neyin iddia edilmediği

Nedensellik gereği, hamle hakkında hiçbir fiziksel ipucu ortaya çıkmadan *kesin* tahmin mümkün değildir
(Gözlem 1). Bu tez şunu iddia eder: (a) davranış kanalı insanın rastgele olmamasından istatistiksel bir
üstünlük sağlar ve en kötü durumda beklenen kayıp sınırlıdır (Bölüm 4.6); (b) kinematik kanal, parmak
açılmasının *başlangıcını* iniş öncesinde yakalayarak kalan belirsizliği büyük ölçüde kapatır; (c) açıkça
ilan edilmiş "geç hamle" kuralının en sıkı ayarında (Turnuva) YZ geçerli bir turu **kural gereği** kaybetmez
(Teorem 1, Bölüm 4.7; teoremin, turun geçerli olması dışında bir önkoşulu yoktur). Bu, tahminin iyi olduğu
anlamına gelmez: kuralın bedeli tekrarlanan turlardır — faul ve geçersiz — ve sistemin ölçüsü geçerli
turlardaki oran değil, bütün denemeler içinde kazanılan ve sonuçsuz kalan paylardır (Bölüm 4.10). Daha gevşek kurallarda insanın meşru kazanma olasılığı ölçülür ve raporlanır.
Raporlanan sayısal sonuçların tamamı **simülasyon** sonuçlarıdır (Bölüm 6); gerçek insan verisiyle
doğrulama için gereken deney protokolü ve veri dışa aktarma aracı sistemle birlikte sunulmuştur.
