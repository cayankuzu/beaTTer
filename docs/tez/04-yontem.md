# 4. Yöntem

Bu bölüm sistemin matematiksel modelini verir. Kod yapısı Bölüm 5'te, sabitlerin tam listesi Ek A'dadır.
Sabitlerin değerleri literatürden ya da simülasyon çalışmalarından gelir; her birinin kaynağı Ek A'da
belirtilmiştir.

## 4.1 El kinematiği: dönme, ölçek ve el-yönü değişmez öznitelikler

El izleyici her karede 21 eklem noktası üretir: görüntü düzleminde normalize koordinatlar ve el merkezli,
metrik "dünya" koordinatları [Zhang2020]. Sınıflandırma piksel konumlarına değil **eklem açılarına**
dayanır. İşaret, orta, yüzük ve serçe parmak için bilek noktası $W$ ve MCP, PIP, DIP, uç noktalarıyla kemik
vektörleri

$$
\mathbf b_0=\mathrm{MCP}-W,\quad \mathbf b_1=\mathrm{PIP}-\mathrm{MCP},\quad
\mathbf b_2=\mathrm{DIP}-\mathrm{PIP},\quad \mathbf b_3=\mathrm{U\c{c}}-\mathrm{DIP}
$$

tanımlanır. Eklem bükülme açıları ve toplam bükülme

$$
\theta_{\mathrm{MCP}}=\angle(\mathbf b_0,\mathbf b_1),\quad
\theta_{\mathrm{PIP}}=\angle(\mathbf b_1,\mathbf b_2),\quad
\theta_{\mathrm{DIP}}=\angle(\mathbf b_2,\mathbf b_3),\qquad
\Theta_f=\theta_{\mathrm{MCP}}+\theta_{\mathrm{PIP}}+\theta_{\mathrm{DIP}}
$$

olur; $\angle(\mathbf a,\mathbf b)=\arccos\frac{\mathbf a\cdot\mathbf b}{\lVert\mathbf a\rVert\lVert\mathbf b\rVert}$.
Açılar kemikten kemiğe (içsel) ölçüldüğünden katı dönme, öteleme, düzgün ölçekleme ve aynalama (sağ/sol el)
altında değişmezdir; bu özellik 200 rastgele poz üzerinde $10^{-6}$ toleransla test edilir.

Parmağın **açıklık** değeri, oyuncuya özgü kalibrasyonla ($\Theta^{\text{yumruk}}_f$, $\Theta^{\text{açık}}_f$)

$$
e_f=\frac{\Theta^{\text{yumruk}}_f-\Theta_f}{\Theta^{\text{yumruk}}_f-\Theta^{\text{açık}}_f}
$$

olarak normalize edilir ($e=0$ yumruk, $e=1$ tam açık; değer $[-0{,}25,\;1{,}25]$ aralığına kırpılır, böylece
Gauss modelleri taşmaları da görür). Her turda, uçuş başlamadan önceki son 20 karede (hazırlık vuruşları
sırasında) ölçülen açıklıkların medyanı **yumruk taban çizgisi** $b_f$ olarak alınır ve tabana göre açılma

$$
u_f=\frac{e_f-b_f}{\max(0{,}25,\;1-b_f)}
$$

kullanılır. Böylece kamera açısı ve el anatomisi kaynaklı sapmalar her turda yeniden sıfırlanır. Tek atış
kipinde hazırlık vuruşu yoktur; taban çizgisi yalnızca turu kuran sabit yumruk bekleyişinin örneklerinden
alınır (Bölüm 4.4), daha eski kareler — örneğin bir önceki turun hâlâ açık duran eli — kullanılmaz. İzleme
kesildiğinde örnek arabelleği boşaltılır: bir taban çizgisi hiçbir zaman bir izleme kaybının iki yanına
yayılmaz. TKM için iki parmak grubu yeterlidir:

$$
u_F=\tfrac12\,(u_{\text{işaret}}+u_{\text{orta}}),\qquad u_B=\tfrac12\,(u_{\text{yüzük}}+u_{\text{serçe}}),
$$

çünkü nihai şekiller bu düzlemde üç köşeye düşer: Taş $(0,0)$, Makas $(1,\kappa)$, Kâğıt $(1,1)$. Buradaki
$\kappa>0$, yüzük parmağının orta parmağa kısmen eşlik etmesinden ("enslaving") kaynaklanan artık açılmadır
[HagerRoss2000; Zatsiorsky2000]. Ölçüm gürültüsü varyansı $\sigma^2$ da her turda, el *hareket hâlindeyken*
(hazırlık vuruşlarında) $u_F,u_B$'nin örnek varyansından kestirilir; böylece hareket bulanıklığının etkisi
gürültü modeline dâhil olur. Kestirilen standart sapma $[0{,}035,\;0{,}15]$ aralığında tutulur: alt sınır
aşırı güveni, üst sınır dedektörün tümüyle körleşmesini önler.

Arayüzde gösterilen biyomekanik büyüklükler — eklem açıları (°), işaret–orta parmak arası V açısı (°) ve
bükülme açısal hızı (°/s) — bu gerçek açılardan türetilir.

## 4.2 Ritim, uçuş evresi ve inişin saptanması

Avuç merkezinin (0, 5, 9, 13, 17 numaralı noktaların ortalaması) görüntüdeki düşey konumu, avuç boyuna
(bilek–orta parmak MCP uzaklığı; 500 ms zaman sabitli üstel ortalaması) bölünerek ölçekten bağımsız $Y(t)$
işareti elde edilir; birimi "avuç boyu"dur (AB), hızın birimi AB/s'dir. Görüntüde $y$ aşağı doğru
büyüdüğünden aşağı vuruşun hızı pozitiftir. Eşikler AB ve AB/s cinsinden olduğundan kamera uzaklığından
bağımsızdır.

**İki hız kestirimi.** Aynı işaretten iki ayrı hız kestirimi tutulur, çünkü iki farklı soruyu yanıtlarlar:

*Hızlı kestirim* $\dot Y$, sabit hızlı durum modeli ve beyaz ivme süreç gürültüsü olan bir Kalman
süzgecinden gelir [Kalman1960]:

$$
\mathbf x=\begin{bmatrix}Y\\ \dot Y\end{bmatrix},\quad
\mathbf F=\begin{bmatrix}1&\Delta t\\0&1\end{bmatrix},\quad
\mathbf Q=q\begin{bmatrix}\Delta t^3/3&\Delta t^2/2\\ \Delta t^2/2&\Delta t\end{bmatrix},\quad \mathbf H=\begin{bmatrix}1&0\end{bmatrix},
$$

$q=900$ AB²/s³ ve ölçüm varyansı $0{,}025^2$ AB² ile. Kazancı yüksektir; bir vuruşu neredeyse gecikmesiz
izler ve bir inişin *bittiği* anı tarihlemek için gereken budur. Bedeli, hareketsiz bir elde bir kare
farkına yakın olmasıdır: gürültüsü yaklaşık $\sqrt2\,\sigma_Y/\Delta t$'dir ($\sigma_Y$: avuç merkezinin
titreşimi) ve kare hızıyla büyür.

*Yavaş kestirim* $\dot Y_S$, ham $Y$ değerlerinin son 110 ms'deki (en az üç örnek) en küçük kareler
eğimidir. Gürültüsü birkaç kat küçüktür ve kare hızıyla büyümez; bedeli yaklaşık yarım pencerelik
gecikmedir.

**Hareket başlangıçlarının doğrulanması ve "hareketsiz"in tanımı.** Vuruşlar histerezisli bir durum
makinesiyle izlenir (DİNLENME → YUKARI → TEPE → AŞAĞI). Bir hareketin *başladığına* yalnızca iki kestirim
birlikte karar verir:

$$
\text{iniş başlar:}\quad \dot Y>v_\downarrow\ \wedge\ \dot Y_S\ge\tfrac12 v_\downarrow,\qquad
\text{yukarı çıkış başlar:}\quad \dot Y<-v_\uparrow\ \wedge\ \dot Y_S\le-\tfrac12 v_\uparrow,
$$

$v_\downarrow=1{,}2$ AB/s, $v_\uparrow=1{,}0$ AB/s. Yukarı çıkışın tepesi $\dot Y\ge-0{,}3$ AB/s olduğunda
kaydedilir. Avuç, yalnızca yavaş kestirime göre, $\lvert\dot Y_S\rvert\le0{,}8$ AB/s iken **hareketsiz**
sayılır. Gerekçe bağımsız incelemenin bir bulgusudur (Bölüm 5.1.6): ilk v4 gerçeklemesinde bütün eşikler
hızlı kestirime uygulanıyordu ve hareketsiz bir elde bu kestirimin gürültüsü eşiklerin hepsini aşabiliyordu;
yalnızca titreyen bir el vuruş başlatıyor, "hareketsiz" sayılmıyor ve tek atış kipinde hayalet turlar
üretiyordu.

**Bir inişin üç olası sonu.** İniş, en az 40 ms sürdükten sonra hız o inişin tepe hızının belirli bir
oranının altına düştüğünde biter:

$$
t-t_{\text{iniş başl.}}\ge 40\ \text{ms}\quad\wedge\quad \dot Y(t)\le \max\!\big(\rho\,\dot Y_{\text{tepe}},\,v_{\min}\big),
\qquad \rho=0{,}2,\ v_{\min}=0{,}4\ \text{AB/s}.
$$

En küçük sarsımlı bir vuruşta hız, tepe hızının %20'sine sürenin %87'sinde düşer ve o anda genliğin %98'i
katedilmiştir; yani olay inişin ortasını değil sonunu işaretler. 40 ms'lik alt sınır bir varsayımdır
(gerçek vuruşların en az 100 ms dolayında sürdüğü kabul edilmiştir) ve tek karelik bir hız sıçramasının
"biten bir iniş" sayılmasını önler. Biten her iniş, genliği $A=Y(t)-Y_{\text{başl.}}$ ve tepe hızına göre
**tam olarak bir** olay üretir:

| Olay | Koşul | Anlamı |
|---|---|---|
| `bottom` (dip) | $A\ge0{,}45$ AB ve $\dot Y_{\text{tepe}}\ge2{,}5$ AB/s | Sayılan bir vuruş: hazırlık vuruşu ya da iniş |
| `weakBottom` (zayıf dip) | $A\ge0{,}15$ AB ve $\dot Y_{\text{tepe}}\ge1{,}5$ AB/s | Gerçek ama küçük bir vuruş; yumuşak iniş adayı |
| `falseStart` (yanlış başlangıç) | ikisi de değil | Vuruş olmadı (titreşim, seğirme); tepe anı ve salınımın en üst noktası korunur, asıl iniş hâlâ gelebilir |

Hassasiyet ayarı $v_\uparrow$, $v_\downarrow$ ile genlik ve tepe hızı eşiklerini aynı çarpanla ölçekler.

**Uçuş ve iniş.** Son hazırlık vuruşunun dibi uçuşun başlangıcıdır ($t_b$); atış vuruşunun `bottom` olayı
**iniş**tir ($t_L$) ve o olayı getiren karenin zamanına tarihlenir. Oyuncunun atış vuruşu zayıfsa **yumuşak
iniş** kuralı devreye girer: sayımdan sonra gelen bir `weakBottom` — uçuşta bir yukarı çıkışın tepesi
görülmüşse ya da uçuşun başından beri en az yarım dönem geçmişse — bir iniş **adayı**dır ve o zayıf vuruşun
bittiği ana tarihlenir; izleyen 90 ms içinde daha güçlü bir vuruş gelmezse (ve o anda yeni bir iniş
hareketi sürmüyorsa) iniş olarak kabul edilir. Aday ile kabul arasındaki karelerde üretilmiş taahhütler D1
gereği değerlendirme dışıdır. İlk v4 gerçeklemesindeki tanım ("herhangi bir iniş hareketinden sonra 90 ms
hareketsizlik") inişi geç tarihliyor ve titreşimin bir turu bitirmesine izin veriyordu; yeni tanımda
yumuşak iniş de ölçülmüş bir genlik ve tepe hızı ister. Metronom kipinde atış vuruşunun dibi, yalnızca
sayımın ilan ettiği atış anının $\pm260$ ms çevresindeyse iniş sayılır; atış anı geçtiğinde el hareket
etmiyorsa ya da bu pencere dolmuşsa iniş, ilan edilmiş atış anına geriye dönük olarak tarihlenir. Tek atış
kipinde yalnızca `bottom` iner (Bölüm 4.4).

İniş anının kestirimi ($\hat t_L$), mevcut en özgül kaynaktan alınır:

$$
\hat t_L=\begin{cases}
t_{\text{iniş başl.}}+\bar d & \text{iniş hareketi sürerken } (\bar d:\text{ önceki inişlerin ortalama süresi})\\[1mm]
t+\dfrac{\bar Y_{\text{dip}}-Y(t)}{\dot Y(t)} & \text{iniş sürerken, } \bar d \text{ henüz bilinmiyorsa (kalan yol / hız)}\\[2mm]
t_{\text{tepe}}+\bar d_{\text{tepe}} & \text{tepe saptandıktan sonra } (\bar d_{\text{tepe}}:\text{ ortalama tepe–dip süresi})\\[1mm]
t_b+\hat T\,(1+\beta) & \text{son dip ve dönem biliniyorsa } (\hat T:\text{ son iki vuruş aralığının ortalaması})\\[1mm]
t_{\text{iniş başl.}}+200\ \text{ms} & \text{iniş sürerken, hiçbir geçmiş yoksa (varsayılan süre)}
\end{cases}
$$

Burada $\beta$, oyuncunun atış aralığının vuruş aralığından ortalama göreli sapmasıdır ve geçerli turlardan
öğrenilir; $\bar d$ ve $\bar d_{\text{tepe}}$ için o turun hazırlık vuruşları, yoksa oyuncunun öğrenilmiş
ortalamaları kullanılır. Son satır açık bir **varsayım**dır, ölçüm değildir: yalnızca hakkında hiçbir
geçmiş bulunmayan bir vuruşta (yeni bir oyuncunun ilk tek atış turu) kullanılır ve kaynağı sonuçta
`default` olarak adlandırılır. Ritmik hareketlerde ardışık aralıkların değişkenliği sınırlı olduğundan
[WingKristofferson1973; Repp2005] tempo tabanlı kestirim uçuşun başında yeterli bir çapa sağlar; iniş
yaklaştıkça kinematik kestirim onu düzeltir (birim testinin kendi ölçümünde ortalama mutlak hata: tempo
kaynağı için 27,9 ms, iniş kaynağı için 12,8 ms; simülasyon). $\hat t_L$ yalnızca YZ'nin *önsel*
dağılımlarını çapalamak için kullanılır; hakemin kararları $\hat t_L$'ye bağlı değildir (Bölüm 4.4).

**Titreşime dayanıklılığın ölçümü (simülasyon).** Tümüyle hareketsiz tutulan simüle bir yumrukta, 15 s
boyunca, 30, 60 ve 120 kare/s'de ve simülatörün varsayılan eklem gürültüsünün 1 ve 2 katında: sahte iniş
başlangıcı sayısı 0; karelerin %97'sinden fazlasında avuç "hareketsiz"; tek atış kipinde tur en geç 1,5 s
içinde kurulur; hükme bağlanan hayalet tur sayısı 0 (regresyon testi, Bölüm 5.7). Düzeltmeden önce aynı
türden bir ölçümde 60 kare/s'de 20 s içinde 6 hayalet tur hükme bağlanıyor, tek atış denemelerinin
%36–85'i hiç hükme bağlanmıyordu. Bu ölçüm simülatörün gürültü modeline aittir; gerçek bir el izleyicinin
titreşimi ölçülmemiştir (Bölüm 8.2).

## 4.3 Açılma başlangıcı dedektörü: Bayesyen eşleşmiş süzgeç bankası

Sistemin "hamle tamamlanmadan önce sezme" yeteneğinin çekirdeği, bir parmak grubunun yumruktan açılmaya
*başladığını* mümkün olan en erken karede, olasılıksal olarak saptamaktır.

**Üretici model.** Bir grubun tabana göre açılması $u(t)$ için iki hipotez ailesi tanımlanır:

- $H_0$ (kapalı kalır): $u(t)=0$.
- $H_1(a,D)$ (açılır): gizil başlangıç zamanı $a$ ve süre $D$ ile, en küçük sarsım (minimum-jerk) yörüngesi
  [FlashHogan1985]; bu profilin parmak eklem yörüngelerini iyi betimlediği kavrama hareketlerinde
  gösterilmiştir [FriedmanFlash2009]

$$
u(t)=A\;g\!\left(\frac{t-a}{D}\right),\qquad g(s)=10s^3-15s^4+6s^5,\; s\in[0,1],
$$

  ($s<0$ için $g=0$, $s>1$ için $g=1$), genlik $A\sim\mathcal N(\mu_A,\sigma_A^2)$; varsayılan
  $\mu_A=1$, $\sigma_A^2=0{,}03$.

Gözlem modeli karelerden bağımsız Gauss gürültüsüdür: $\tilde u(t_k)=u(t_k)+\varepsilon_k$,
$\varepsilon_k\sim\mathcal N(0,\sigma^2)$. Bağımsızlık varsayımını korumak için dedektöre **süzülmemiş** ham
açılma değerleri verilir; hız bilgisi türev alınarak değil, yörünge ailesine uyum üzerinden örtük olarak
kullanılır (sayısal türevin gürültüyü büyütmesinden böylece kaçınılır).

**Izgara ve yinelemeli olabilirlik.** $(a,D)$ uzayı bir ızgarayla ayrıklaştırılır: $a_i=t_b+i\,\delta$
($\delta=16$ ms; uçuş penceresi 1200 ms, yani 76 başlangıç) ve $D_j\in\{50,70,95,130,180,250,340\}$ ms. Süre
ızgarası, hızlı atışlar için bildirilen yaklaşık 60 ms'lik şekil değiştirme süresinden [Katsuki2015] kendi
hızında el açma için bildirilen birkaç yüz milisaniyeye [Carpinella2011] kadar olan aralığı kapsar. Her hücre
için bir log-ağırlık tutulur ve her karede *üstel unutmayla* güncellenir:

$$
\lambda_k=e^{-\Delta t_k/\tau_m},\qquad
\ell_{ij}\leftarrow \lambda_k\,\ell_{ij}+\log\mathcal N\!\big(\tilde u_k;\;\mu_A\,g_{ij},\;\sigma^2+g_{ij}^2\sigma_A^2\big),\qquad
\ell_{0}\leftarrow \lambda_k\,\ell_{0}+\log\mathcal N\!\big(\tilde u_k;\;0,\;\sigma^2+\sigma_0^2\big),
$$

burada $g_{ij}=g\big((t_k-a_i)/D_j\big)$, $\tau_m=140$ ms ve $\sigma_0^2=0{,}004$'tür (kapalı bir grubun sıfır
çevresindeki fazladan oynaklığı: yumruk titremesi, Makas'taki eşlik etme). $g_{ij}=0$ olan hücrelerde $H_0$
terimi kullanılır. Başlangıcı henüz gelecekte olan bir hücre
($a_i>t_k$) şimdiye kadarki her karede tam olarak $H_0$'ın öngördüğünü ($u=0$) öngörmüştür; bu yüzden
log-ağırlığı $\ell_0$'a eşittir ve ayrıca saklanmaz. Unutma katsayısı ($\lambda<1$) eski karelerin
kanıtını söndürür; bu, yörünge ailesinin dışındaki hareketlerde (ör. aldatmacalarda) dedektörün güncel
duruma hızla uymasını sağlar.

**Yeniden çapalama (yumruğa dönüş kuralı).** Banka, yumruktan *tek bir* açılmayı modeller. Açılma, kapalı
eşiğinin ($\max(3\sigma,\,0{,}12)$) altında art arda iki kare ölçülür ve banka hâlâ "açıldı" diyorsa
(aşağıda tanımlanan hakem büyüklüğü $h>\tfrac12$), dedektör o andan itibaren yeniden başlatılır: bütün
log-ağırlıklar sıfırlanır ve başlangıç ızgarası o kareye çapalanır. Böylece havada açıp yeniden kapatma türü meşru aldatmacalar
doğru izlenir.

**Izgaranın kaydırılması (tek atış kipi).** Başlangıç ızgarası çapadan itibaren yalnızca 1200 ms'yi kapsar.
Hazırlık vuruşlu kiplerde uçuş bir vuruş aralığı kadar sürdüğünden bu yeterlidir; tek atış kipinde ise
oyuncu yumruğunu istediği kadar bekletebilir. Izgara çapada bırakılırsa 1200 ms'den sonra "şimdi başlayan"
bir açılmayı modelleyen hücre kalmaz ve dedektör — dolayısıyla hakem büyüklüğü — körleşir: açılma ancak
neredeyse tamamlandığında saptanır ve dürüst atışlar faul sayılır. Bu yüzden tur kurulmuş beklerken ve iki
grubun hakem büyüklüğü de sıfıra yakınken ($h_F,h_B<0{,}02$: yumruk açıkça kapalı) her iki dedektörün
çapası 400 ms'de bir o kareye **kaydırılır**; iz silinmez ve bu bir aldatmaca sayılmaz. Aynı anda tur
arabellekleri son 1,2 s ile sınırlanır. Kaydırma yalnızca grup kapalıyken yapıldığından, başlamış bir
açılmanın kanıtı hiçbir zaman atılmaz.

**YZ'nin kullandığı kanıt.** Öğrenilmiş bir başlangıç önseliyle (aşağıda) hücre önselleri

$$
\log\pi_{ij}=\log\mathcal N\!\big(\hat t_L-a_i;\;\mu_\ell,\sigma_\ell^2\big)+\log\mathrm{LogN}\!\big(D_j;\;\mu_D,\sigma_D\big)+\text{sabit}
$$

olarak yazılır ($\hat t_L-a$: başlangıcın inişe göre önceliği) ve ızgara üzerinde normalize edilir; öğrenme
öncesi değerler $\mu_\ell=170$ ms, $\sigma_\ell=85$ ms, süre için medyan 130 ms ve log-ölçek sapması 0,5'tir
(varsayım; Ek A). Kestirilen inişten 150 ms sonrasına kadar olan başlangıçlar da modellenir. Bir hücre, inişte
en az $\pi_{\min}=0{,}15$ oranında açılma öngörüyorsa **zamanında**, aksi hâlde **geç** sayılır. Üç marjinal log-olabilirlik elde
edilir:

$$
\Lambda^{\text{kal}}=\ell_0,\qquad
\Lambda^{\text{aç}}=\operatorname*{logsumexp}_{(i,j)\ \text{zamanında}}\big(\log\pi_{ij}+\ell_{ij}\big),\qquad
\Lambda^{\text{geç}}=\operatorname*{logsumexp}_{(i,j)\ \text{geç}}\big(\log\pi_{ij}+\ell_{ij}\big).
$$

**Yokluğun kanıtı.** Yumruk hâlâ kapalıyken iniş yaklaştıkça, zamanında açılmayı mümkün kılan başlangıç
hücrelerinin önsel kütlesi tükenir; $\Lambda^{\text{aç}}$ kendiliğinden küçülür ve Taş olasılığı yükselir.
Yani "parmak hareketi yok" gözlemi, oyuncunun öğrenilmiş açılma zamanlamasına göre nicel bir kanıta dönüşür.
Erken açan bir oyuncuda bu kanıt daha erken, geç açan bir oyuncuda daha geç birikir; kilitlenme önceliğinin
oyuncuya göre *öğrenilmesi* buradan doğar.

**Kâğıt için grup eşlemesi.** Kâğıtta arka parmaklar ön parmaklarla birlikte açılır. Bu yüzden Kâğıt
hipotezinde arka grubun başlangıç önseli inişe değil, ön grubun sonsal ortalama başlangıcına çapalanır:
$a_B\sim\mathcal N(\bar a_F+\mu_\Delta,\sigma_\Delta^2)$ (varsayılan $\mu_\Delta=15$ ms, $\sigma_\Delta=40$ ms;
oyuncuya göre öğrenilir). Bu eşleme yalnızca ön grup için açılma kanıtı belirdiğinde
($\max(\Lambda_F^{\text{aç}},\Lambda_F^{\text{geç}})>\Lambda_F^{\text{kal}}-3$) kullanılır; öncesinde arka grup da
inişe çapalı önselle değerlendirilir. Ön parmaklar açılmaya başlayıp arka parmaklar kıpırdamadığında Kâğıt
hipotezi birkaç kare içinde güçlü biçimde cezalanır ve Makas–Kâğıt ayrımı erken çözülür.

## 4.4 Hakem modeli ve "geç hamle" kuralı

TKM'nin tanınmış bir uluslararası federasyonu yoktur; atıf yapılabilen yazılı kural metinleri iki özel
kuruluşa aittir. World RPS Society kurallarında hamlenin yaklaşma hareketi tamamlanmadan (ön kol gövdeyle
90° yapmadan) gösterilmesi gerekir; bu noktadan sonra gösterilen hamle "Zorunlu Taş" sayılır [WRPS]. WRPSA
kurallarında ise rakibin eline tepki vermek üzere geciktirilen ya da "Vur"dan sonra değiştirilen hamle "geç
hamle"dir ve turun kaybıyla cezalandırılır [WRPSA2026]. (Japoncadaki *ato-dashi* teriminin bir faul olarak
tanımı yalnızca kaynak göstermeyen ikincil bir metinde bulunabilmiştir; burada dayanak alınmamıştır.) Sistem
"iniş sonrasında şekil değiştirilemez" ilkesini nicel hâle getirir; ceza olarak tur kaybı yerine **tekrar**
uygulanır.

**Hakem büyüklüğü.** Her grup için, *sabit ve düz* bir önsel altında, grubun **şu ana kadar ölçülebilir
biçimde açılmış olma** sonsal olasılığı tanımlanır:

$$
h(t_k)=\frac{\displaystyle\sum_{(i,j):\,g_{ij}(t_k)\ge\pi_{\min}} \bar\pi_{j}\,e^{\ell_{ij}}}
{\displaystyle\tfrac12 e^{\ell_0}+\sum_{(i,j)} \bar\pi_{j}\,e^{\ell_{ij}}},\qquad
\bar\pi_j=\tfrac12\cdot\tfrac1{N}\cdot w_j,
$$

burada $N$ ızgaradaki toplam başlangıç sayısı (uçuş penceresi sabit, 1200 ms), $w_j$ süreler üzerinde sabit
bir log-normal ağırlıktır (medyan 120 ms, log-ölçek sapması 0,6; ızgara üzerinde normalize); paydadaki
toplam, gelecekteki hücrelerin $\ell_0$ ağırlıklı kütlesini de içerir. $h$ yalnızca o ana kadarki karelere
(ve o turun hazırlık vuruşlarında ölçülen taban çizgisi ile gürültüye, yani ölçüm ölçeğine) bağlıdır: iniş
kestirimine, oyuncunun öğrenilmiş zamanlama modeline ve YZ'nin taahhüdüne bağlı değildir (D5).

**Bağlama kuralı.** Son havadaki karede ön ve arka grup için $h_F,h_B$ okunur. $(\epsilon_F,\epsilon_B)$
eşikleriyle nihai hamle şu durumlarda **geç hamle faulü**dür:

| Nihai hamle | Faul koşulu | Sözel anlamı |
|---|---|---|
| Taş | $h_F\ge1-\epsilon_F$ veya $h_B\ge1-\epsilon_B$ | El havada açılıyordu, sonradan kapandı |
| Kâğıt | $h_F<\epsilon_F$ veya $h_B<\epsilon_B$ | Açılma (ön ya da arka) havada başlamamıştı |
| Makas | $h_F<\epsilon_F$ veya $h_B\ge1-\epsilon_B$ | Ön açılmamıştı ya da arka havada açılıyordu |

Yani bir grup $h\ge1-\epsilon$ iken **açık**, $h<\epsilon$ iken **kapalı** sayılır: sınır değeri "açık"
tarafındadır, "kapalı" sınaması kesin eşitsizliktir. Sonlu olmayan bir $h$ değeri $0$, yani kapalı okunur.
YZ'nin kendi kararında kullandığı sınama (`foulNow`) bunun kendisidir (Bölüm 4.7).

Üç ön ayar sunulur:

| Ön ayar | $\epsilon_F$ | $\epsilon_B$ | Karar politikası |
|---|---|---|---|
| Serbest | 0,03 | 0,03 | Risk duyarlı ($\mu=2$) |
| Standart | 0,15 | 0,10 | Risk duyarlı ($\mu=3$) |
| Turnuva (varsayılan) | 0,50 | 0,15 | Kaybetmeme öncelikli (yasal küme politikası, Bölüm 4.7) |

$\epsilon_F=0{,}5$ olduğunda ön grup için belirsiz bölge kalmaz: son havadaki karede ön parmaklar ya
"ölçülebilir biçimde açılmıştır" ($h_F\ge\tfrac12$) ya da "açılmamıştır" ($h_F<\tfrac12$). İki sınama
birbirinin tam tümleyenidir; $h_F$'nin tam olarak $\tfrac12$ çıktığı durum da "açık" sayılır ve üçüncü bir
olasılık yoktur. Küçük $\epsilon$ değerlerinde ise iki kararlı bölge
arasında, her iki sonucun da yasal olduğu bir **belirsizlik bölgesi** kalır; insanın meşru biçimde
kazanabileceği yer burasıdır.

**İniş sonrası açılma (yumruk tutma kuralı).** Bağlama kuralı, inişte yumruk olup hemen ardından açılan eli
tek başına yakalayamaz: son havadaki karede $h_F$ küçükken oturma penceresinin ilk kareleri "Taş" gibi
görünür. Bu yüzden inen şekil Taş olarak sınıflanmışsa hüküm, inişten sonra $250$ ms geçene kadar verilmez;
bu süre içinde ön grubun açılması art arda iki karede $0{,}35$'i aşarsa tur **geç hamle faulü**dür. $250$ ms,
basit görsel tepki süresinin (büyük bir örneklemde ortalama 231 ms, donanım gecikmesi düşüldüğünde 213 ms
[Woods2015]) hemen üzerindedir: YZ'nin ifşa edilen hamlesine *tepki olarak* açılan bir el bu pencerenin
içinde kalamaz, pencere dışında açılan el ise zaten Taş olarak hükme bağlanmıştır.

**Kanıtın tazeliği: atışın kendisi görülmüş olmalıdır.** Bağlama kuralı "son havadaki kare"yi okur; bu
kare, inişten önce elin *izlendiği* son karedir. Hakem ancak **atışa ait taze kanıtla** hüküm verir.
$\bar\Delta$ ölçülen kare aralığı (üstel ortalama) olmak üzere üç koşul aranır: (i) inişten önceki
$\max(160\ \text{ms},\,2{,}6\,\bar\Delta)$ içinde elin izlendiği en az iki kare vardır; (ii) son havadaki karenin
yaşı $t_L-t_{m_L-1}\le\max(45\ \text{ms},\,2{,}2\,\bar\Delta)$'dır; (iii) son havadaki kare, YZ'nin **revizyon
adımını tamamladığı** bir karedir: o karede revizyon yolu açıktır, turda, o kareyle birlikte, en az iki
izlenen kare görülmüştür (`minEvidenceFrames`) ve adım — gerekiyorsa yeni mührüyle — sonuna kadar
yürümüştür. Motor bunu her havadaki kareyle birlikte tek bir işaret olarak, adımın en sonunda saklar ve
hakem o işareti okur; mühür atılamazsa işaret konmaz ve tur iptal edilir (Bölüm 4.7, (c)). Üçüncü koşul
yalnızca tek atış kipinde bağlayıcıdır (öteki kiplerde revizyon yolu uçuşun her izlenen karesinde açıktır
ve iki kare alt sınırı (i)'den çıkar): orada kurulmuş
bekleyişin kareleri de "havadaki kare" olarak kaydedilir ama YZ o karelerde revize etmez (aşağıda). İniş, vuruşun
kendisine ait hiçbir kare görülmeden tarihlenmişse — tek bir düşen kareye sığan çok hızlı bir vuruş —
atıştan hiçbir şey görülmemiştir ve ayaktaki mühür hakemin okumasını izleme fırsatı bulamamıştır.
Koşullardan biri sağlanmıyorsa tur **EL YOK** ile geçersizdir — hiçbir zaman faul değildir. Gerekçe: birkaç
kare eski ya da atıştan önceye ait bir bakış, parmakların inişin hemen öncesinde ne yaptığı hakkında bir şey
söylemez; izleyicinin boşluğu oyuncuya yazılamaz (faul olamaz) ve YZ lehine de aleyhine de kullanılamaz (o
boşluğun içinde ya da sonrasında atılmış bir mühür değerlendirilemez; hiç revize edilememiş bir davranış
mührü de yasal bir hamleyle karşılaştırılamaz). (iii) koşulu oyunun fiziksel evresine — iniş hareketinin
başlamış olup olmadığına — ve izlenen kare sayısına bağlıdır, YZ'nin neyi mühürlediğine değil; D5 korunur. Son havadaki karenin
yaşı her tur raporunda ölçüm olarak verilir.

**İzleme boşluğundan sonraki iniş.** El, vuruşun en hızlı bölümünde izlenemeyip tam durduğunda yeniden
bulunursa, o karedeki hız kestirimi boşluk üzerindeki ortalamadır ve iniş bir kare geç saptanır; arada
"havada" sayılan kare gerçekte iniş sonrasıdır. Bunu önlemek için havadaki her örnek avuç yüksekliğini ve
bir izleme boşluğunu izleyip izlemediğini kaydeder: bir önceki izlenen örnekten $1{,}6\,\bar\Delta$'dan uzun
bir aradan sonra gelen ilk iki izlenen kare "boşluk sonrası" işaretlenir (hız süzgecinin toparlanması bir
kare daha sürer). İniş saptandığında, inişten geriye doğru avuç yüksekliği iniş yüksekliğinin
$\max(0{,}04\ \text{AB},\ \%3\times\text{vuruş genliği})$ yakınında kalan kesintisiz kare dizisine bakılır; bu
dizideki en erken boşluk sonrası kare **iniş karesinin kendisidir** ve iniş o karenin zamanına tarihlenir.
Boşluğun içinde ne olduğu bilinmediğinden, o kareden itibaren hiçbir şey "havada" sayılmaz. İncelemenin
kendi ölçüm betiğiyle (simülasyon; karelerin taban olarak %8'i düşürülür, vuruş hızlandıkça daha fazlası),
değerlendirilen mührü simülasyondaki *gerçek* inişten sonra atılmış geçerli tur sayısı: normal açanlarda
30 kare/s'de 496'da 0; geç açanlarda 30 kare/s'de 498'de 1 (3 ms ile); geç açanlarda 15 kare/s'de 323'te 0.
Düzeltmelerden önce aynı ölçüm 498'de 6 (17 ms'ye kadar) ve 325'te 7 (82 ms'ye kadar) veriyordu. Kare
düşmesi olmadan 15/30/60 kare/s'de 2000 turda 0'dır. Yani D1 simülasyondaki gerçek inişe göre de — bir
turda 3 ms'lik bir istisnayla — tutmaktadır; kare düşmesinin bedeli EL YOK hükümleridir (hızlı bir
denetimde %8 taban düşme oranında denemelerin yaklaşık %13'ü).

**"İnişten önce" yalnızca kare sırasıyla belirlenir.** İniş belirlendikten sonra, kare dizini iniş
karesinin dizininden ($m_L$) küçük olmayan her taahhüt "iniş sonrası" işaretlenir ve değerlendirilmez (D1);
hakemin okuduğu havadaki kareler de **aynı sınamayla**, dizini $m_L$'den küçük olan karelerdir. Kare
dizinleri tamsayıdır ve motor, dizini ya da zamanı bir öncekini aşmayan kareyi atar; dolayısıyla kare
sırası iyi tanımlıdır, sınama kesindir ve iki tarafta aynıdır. Zaman damgaları bu iş için
**karşılaştırılmaz**. İniş karesi, iniş zamanında ya da sonrasında yakalanmış ilk karedir: vuruşla
tarihlenen inişte o olayı getiren kare, geriye dönük (yumuşak ve metronom) inişlerde turun eksiksiz kare
listesinde zamanı $t_L$'den küçük olmayan ilk kare, boşluk sonrası kuralında o boşluk sonrası karenin
kendisi. Bu yüzden iniş karesinden önceki her kare inişten önce yakalanmıştır; iniş karesi ayrıca her
zaman uçuşun başladığı kareden sonradır, yani davranış mührü hiçbir zaman "iniş sonrası" olmaz.

Bu kural iki düzeltmenin sonucudur. İlk v4 gerçeklemesi yalnızca kare dizinine bakıyor ama iniş karesini 24
karelik bir halkada arıyordu; 92 kare/s'nin üzerinde, metronom kipindeki 260 ms'lik geriye dönük tarihleme
bu halkadan taşıyor ve inişten sonra atılmış bir mühür değerlendirilebiliyordu. İncelemeden sonraki ilk
düzeltme halkayı eksiksiz kare listesiyle değiştirmiş ve işarete ikinci bir koşul eklemişti: mühürdeki
zaman $t_L$'den küçük değilse de işaretle. Bu koşul mühre yazılan, $0{,}1$ ms'ye yuvarlanmış zamanı
yuvarlanmamış iniş zamanıyla karşılaştırıyordu ve kendi deliğini açtı (Bölüm 4.7); kaldırılmıştır. Bugünkü
kural 120 ve 144 kare/s'de ve ilan edilmiş atış anının $0{,}02$ ms öncesine yerleştirilmiş karelerle
sınanmıştır (Bölüm 5.7).

**Tek atış kipine özgü kurallar.** Hazırlık vuruşu olmadığında tur şöyle işler:

1. *Kurulma.* Ön ve arka grubun ham açıklığı $0{,}4$'ün altında ve avuç hareketsizken (Bölüm 4.2) 350 ms
   geçerse tur kurulur ve davranış mührü atılır. Taban çizgisi ve gürültü kestirimi **yalnızca bu
   bekleyişin** örneklerinden alınır.
2. *Bekleme.* Oyuncu istediği kadar bekleyebilir; yumruk kapalıyken dedektörlerin ızgarası 400 ms'de bir
   kaydırılır (Bölüm 4.3). Kinematik revizyon, iniş hareketi başlayana kadar yapılmaz (o ana kadar önselleri
   çapalayacak bir iniş kestirimi yoktur).
3. *Açık bir vuruş gerekir.* Turu yalnızca bir `bottom` olayı indirir. Bir `weakBottom` ya da `falseStart`
   atış sayılmaz; tur "kurulmuş" durumuna geri döner. Tek bir vuruşun karar verdiği bir kipte bundan azı —
   bir seğirme ya da eklem titreşimi — atış kabul edilemez.
4. *Vuruşsuz açılan el.* El (ön ya da arka grubun ham açıklığı $0{,}45$'in üzerinde) vuruş olmadan kesintisiz
   600 ms açık kalırsa tur iptal edilir. Ölçülen, **elin ne kadardır açık olduğu**dur; ilk gerçekleme avucun
   ne kadardır hareketsiz olduğuna bakıyor ve parmaklarını vuruştan hemen önce açan oyuncuları iptal
   ediyordu. 1500 ms içinde bitmeyen bir iniş hareketi de turu iptal eder.

Regresyon testlerinde (simülasyon; hücre başına 120 deneme) faul oranı yumruk 1,0 s bekletildiğinde de
3,5 s bekletildiğinde de %5,8'dir (kaydırmadan önce uzun beklemede %21–24'e çıkıyordu); erken açan
oyuncularda iptal 120 denemede 0–1'dir (önce %27); 15, 20 ve 25 kare/s'de bir önceki turun açık elinin
taban çizgisine sızmasından kaynaklanan YUMRUK YOK hükmü görülmez (önce düşük kare hızlarında, açık elle
biten bir turu izleyen turlarda sistematik olarak veriliyordu).

**Metronom kipinde duraksama.** Sayım sırasında kare akışı duraksar ve ilk gelen kare ilan edilen atış
anını geçmişse (gizlenen sekme, uzun takılma) uçuş başlatılmaz; sayım "ritim koptu" ile iptal edilir. İlk
gerçeklemede böyle bir kare uçuşu başlatıp mührü ilan edilmiş inişten *sonra* atıyor, rapor negatif öncelik
gösteriyordu. Ayrıca sayım, el kadrajda değilken başlatılabilir: el kaybı süreölçeri el ilk görüldüğünde
başlar.

Diğer geçersizlik durumları: iniş sonrasında el yoksa (EL YOK), oturma penceresinde kararlı bir TKM şekli
oluşmamışsa (BELİRSİZ ŞEKİL), hazırlık vuruşlarında (tek atış kipinde kurulma bekleyişinde) el yumruk
değilse, yani taban çizgisinde ön ya da arka grubun ham açıklığı $0{,}45$'i aşıyorsa (YUMRUK YOK). Denetim
sırası YUMRUK YOK, EL YOK (tazelik koşulları dâhil), iniş sonrası açılma, BELİRSİZ ŞEKİL ve bağlama
kuralıdır. Bu turlar tekrarlanır ve oyun hakkındaki öğrenmeye girmez (D6; tek istisna Bölüm 4.9'daki
algılayıcı kalibrasyonudur).

**Nihai hamle.** İnişten sonraki oturma penceresinde (≤ 450 ms), tabana göre dört parmak açılma vektörü
$\mathbf u_4$ üzerinde sınıf-koşullu bağımsız Gauss şablonlarıyla (Taş $[0,0,0,0]$, Kâğıt $[1,1,1,1]$, Makas
$[1,1,\kappa_1,\kappa_2]$ ve TKM dışı şekilleri soğuran geniş bir "diğer" sınıfı) sonsal hesaplanır; aynı
sınıf en az 3 ardışık karede ve 70 ms boyunca $\ge 0{,}85$ sonsalla gözlenirse nihai hamle olarak kabul
edilir. İzleyicinin kendi sinirsel jest etiketi, oyuncuya göre öğrenilen bir karışıklık matrisiyle ikinci
bir kanıt olarak çarpılır (eklem noktalarıyla ilişkili olduğu için $0{,}5$ üssüyle zayıflatılarak). $t_C$, bu sınıfın sonsalının kesintisiz $\ge 0{,}85$ kaldığı en erken andır.

## 4.5 Davranışsal dizi kestirimi (A kanalı)

İnsanlar rastgele dizi üretmekte sistematik olarak başarısızdır ve TKM'de sonuca bağlı koşullu tepkiler
gösterir (Bölüm 2). A kanalı, oyuncunun bir sonraki hamlesi için $\mathbf p\in\Delta^2$ dağılımını **hareket
başlamadan önce** üretir.

**Uzmanlar.** Bağlam $c=(P,A,O)$: oyuncunun hamleleri, YZ'nin hamleleri ve sonuçlar. 26 temel uzman
kullanılır: dört farklı unutma hızında sıklık modelleri; oyuncu hamleleri üzerinde 1–4. derece Markov
zincirleri; YZ'nin son hamlelerine tepki modelleri; ortak (oyuncu, YZ) çiftleri üzerinde 1–3. derece
zincirler; sonuca koşullu **kaydırma** modelleri (kazan-kal/kaybet-değiştir'in genelleştirilmesi: hedef
değişken $(y-P_{\text{son}})\bmod 3$'tür); kaydırma dizileri üzerinde zincirler; üç Bağlam Ağacı Ağırlıklandırma
(CTW) kestiricisi; bir PPM-C kestiricisi; YZ'nin kendi dizisini modelleyen üç "ayna" uzman ve literatürden
alınan topluluk önseli. Tablo tabanlı uzmanlar Krichevsky–Trofimov yumuşatması kullanır [KT1981]:

$$
q(x)=\frac{c_x+\tfrac12}{n+\tfrac32},
$$

ve bağlamları için yeterli kütle birikene kadar **çekimser** kalır.

**CTW.** Derinliği $D$ olan bağlam ağacında her düğüm $s$ için KT kestirim olasılığı $P_e^s$ ve ağırlıklı
olasılık

$$
P_w^s=\begin{cases}P_e^s, & \operatorname{derinlik}(s)=D\\[1mm]
\tfrac12P_e^s+\tfrac12\prod_{x}P_w^{xs}, & \text{aksi hâlde}\end{cases}
$$

tutulur; kestirim $P(x\mid \text{geçmiş})=P_w^{\text{kök}}(\text{geçmiş}\,x)/P_w^{\text{kök}}(\text{geçmiş})$
ile *kesin* olarak hesaplanır [Willems1995]. CTW, derinliği $D$'yi aşmayan bütün ağaç kaynakları üzerinde
Bayesyen bir karışımdır; bu sayede oyuncunun alışkanlığının "kaçıncı dereceden" olduğunu önceden bilmek
gerekmez.

**Meta-stratejiler.** Bir uzmanın kestirimi $\mathbf q$ ise $r\in\{0,1,2\}$ döndürmeleri

$$
\operatorname{rot}_r(\mathbf q)[y]=\mathbf q\big[(y-r)\bmod 3\big]
$$

"oyuncu, bu modelin öngördüğünden $r$ adım ötesini oynar" hipotezlerini verir. Bu, Iocaine Powder'ın
ikinci-tahmin meta-stratejilerinin [Egnor2000] dağılım diline çevrilmiş hâlidir; ayna uzmanların
döndürmeleri de "rakip bizi modelliyor" stratejilerini kapsar. Toplam $26\times3=78$ uzman ve her zaman
uyanık bir düzgün (Nash) uzman vardır.

**Karışım.** Uzmanlar, çekimser ("uyuyan") uzmanları destekleyen Bayesyen bir karışımla birleştirilir:
çekimser kalan bir hipoteze o turda karışımın kendi kaybı yazılır, dolayısıyla uyanık kümeye göre göreli
ağırlığı değişmez. Uyanık küme $\mathcal A_t$ üzerinde

$$
\mathbf p_t=\frac{\sum_{i\in\mathcal A_t}w_{i}\,\mathbf q_{i,t}}{\sum_{i\in\mathcal A_t}w_{i}}
$$

ve gerçekleşen hamle $y_t$ görüldükten sonra log-ağırlıklar

$$
\log w_i\leftarrow \gamma\log w_i+\eta\cdot
\begin{cases}\log \max(\mathbf q_{i,t}[y_t],\,p_{\min}), & i\in\mathcal A_t\\ \log \max(\mathbf p_t[y_t],\,p_{\min}), & i\notin\mathcal A_t\end{cases}
$$

ile güncellenir ($\eta=1$ için logaritmik kayıpta Bayes güncellemesi; $\gamma<1$ üstel unutma). Ağırlıklar
normalize edildikten sonra sabit-paylaşım adımı uygulanır [HerbsterWarmuth1998]:

$$
w_i\leftarrow(1-\alpha)\,w_i+\frac{\alpha}{N}.
$$

Gerçeklemedeki değerler $\eta=1$, $\gamma=0{,}999$, $\alpha=0{,}002$, $p_{\min}=0{,}02$ ve $N=79$'dur. İnsan
yanlılıkları zayıf olduğundan (tur başına yüzde birkaç bit düzeyinde; Bölüm 2.1) kanıtın yüzlerce tur
boyunca birikmesi gerekir; kısa bellekli ($\gamma=0{,}985$) ve yüksek paylaşımlı ayarlar parametre
taramasında bu işaretin çoğunu kullanamamıştır (geliştirme sırasındaki simülasyon taraması; ayrı bir sonuç
dosyası saklanmamıştır). $\alpha$, yararlı bir uzmanın tur
başına olabilirlik üstünlüğünün altında kalmalıdır; aksi hâlde o uzman ağırlık biriktiremez.

Sabit-paylaşım, oyuncu tarz değiştirdiğinde (en iyi uzmanın değiştiği parçalı durağan dizilerde) ağırlığın
hızla yeni uzmana akmasını sağlar. Düzgün uzman karışımda her zaman bulunduğundan, hiçbir uzman şanstan iyi
kestiremiyorsa ağırlık ona akar ve A kanalı kendiliğinden Nash'e yaklaşır.

## 4.6 Güvenli sömürü

Deterministik en iyi yanıt, kendisini modelleyen bir rakibe karşı sömürülebilir. A kanalının kararı bu
yüzden bütçeli bir karma stratejiyle verilir: $a^\star=\arg\max_a\sum_y p_y\,u(a,y)$ en iyi yanıt olmak üzere

$$
\sigma_t=\lambda_t\,\delta_{a^\star}+(1-\lambda_t)\,\mathrm{U},\qquad \lambda_t=\min\{1,\max\{0,B_t\}\},
$$

$$
B_{t+1}=B_t+\varepsilon+\lambda_t\,u(a^\star,y_t),\qquad B_1=B_0.
$$

Düzgün bileşen her hamleye karşı $0$ beklenen kazanç verdiğinden $\lambda_t\,u(a^\star,y_t)$, $\sigma_t$'nin
gerçekleşen rakip hamlesine karşı beklenen kazancıdır; bütçe yalnızca "kazanılmış olanı" riske atar
[GanzfriedSandholm2015].

> **Önerme 1 (sınırlı kayıp).** Her rakip stratejisi için, $T$ tur sonunda A kanalının toplam beklenen
> kazancı $\ge -(B_0+\varepsilon T)$'dir.
>
> *İspat.* $G_T=\sum_{t\le T}\lambda_t\,u(a_t^\star,y_t)$ olsun; yinelemeden $B_{T+1}=B_0+\varepsilon T+G_T$.
> Tümevarımla $B_t\ge0$ gösterilir: $B_1=B_0\ge0$. $B_t\ge0$ ise $\lambda_t=\min\{1,B_t\}\le B_t$ ve
> $u\ge-1$ olduğundan $B_{t+1}\ge B_t-\lambda_t+\varepsilon\ge\varepsilon\ge0$. O hâlde
> $G_T=B_{T+1}-B_0-\varepsilon T\ge-(B_0+\varepsilon T)$. $\blacksquare$

Yani mükemmel bir karşı-kestirici bile A kanalından uzun dönemde tur başına ortalamada en çok $\varepsilon$
(varsayılan $0{,}02$; $B_0=1$) kazanç elde edebilir. Gerçeklemede bütçe ayrıca $B_{\max}=6$ ile üstten
sınırlanır ($B_{t+1}\leftarrow\min\{B_{\max},\cdot\}$); bu kırpma $B_t\ge0$ tümevarımını bozmaz ve
$B_{T+1}\le B_0+\varepsilon T+G_T$ eşitsizliği korunduğundan sınır geçerli kalır. Birim testinde, YZ'nin
hamlesini önceden bilen bir rakibe karşı 2000 turda beklenen kazanç $-40{,}98$, sınır $-41$'dir.

Bu yapı, "kazanılmış olanı riske at" fikrinden esinlenmiştir ama onunla aynı değildir: standart TKM'de
rakibin "hediye" stratejisi bulunmadığından düzgün dağılımdan her sapma bir rakibe karşı beklenen değerde
kaybettirebilir ve kesin anlamda güvenli sömürü mümkün değildir [GanzfriedSandholm2015]. beaTTer bu yüzden
sıfır değil, **açıkça ilan edilmiş ve sınırlı** bir sömürülebilirliği ($B_0+\varepsilon T$) kabul eder.

## 4.7 Füzyon, karar ve "kurala göre yenilmezlik"

**Füzyon.** Kinematik sınıf log-olabilirlikleri iki grubun kanıtlarından kurulur:

$$
\begin{aligned}
L(\mathrm T)&=\Lambda_F^{\text{kal}}+\Lambda_B^{\text{kal}},\\
L(\mathrm M)&=\Lambda_F^{\text{aç}}+\Lambda_B^{\text{kal}},\\
L(\mathrm K)&=\Lambda_F^{\text{aç}}+\Lambda_{B\mid F}^{\text{aç}},
\end{aligned}
$$

ve içinde $\Lambda^{\text{geç}}$ terimi bulunan birleşimler "geç hamle" kütlesini oluşturur. Davranış önseli
ile birleştirme log-doğrusal havuzla yapılır:

$$
P(o)\;\propto\;\exp\!\big(w_p\log p_{y(o)}+w_k\,L(o)\big),
$$

burada $o$ {Taş, Kâğıt-zamanında, Makas-zamanında, geç} sonuçlarını gezer. $(w_p,w_k)$ ağırlıkları
(başlangıçta $1,1$), değerlendirilen mührün kinematik olduğu her geçerli turdan sonra, o mühür anındaki
sonsalın logaritmik kaybı üzerinde bir çevrimiçi gradyan adımıyla (adım $0{,}05$; ağırlıklar
$[0{,}25,\;2{,}5]$ aralığında) öğrenilir; yani sistem iki kanala ne kadar güveneceğini de veriden öğrenir.
Tur başına gradyan $\pm2$ nat ile **kırpılır**. Gerekçe: logaritmik kaybın gradyanı aşağıdan sınırsızdır
(kendinden emin bir ıska), yukarıdan ise yaklaşık sıfırla sınırlıdır (kendinden emin bir isabet); kırpma
olmadan tek bir kötü tur yüzlerce iyi turdan ağır basıyor, kinematik kanalın ağırlığı tek turda $0{,}69$
düşüp pratikte geri gelmiyordu. Kırpmayla tek bir ıska $w_k$'yi en çok $0{,}05\times2=0{,}1$ değiştirir ve
birkaç düzine isabetle geri kazanılır (regresyon testi).

**Hakemin yasal kümesi ve yasal kütle.** Hakem büyüklükleri $h_F,h_B$ YZ tarafından da her izlenen karede
hesaplanır (hakemle birebir aynı sayı). $k$ karesi için **yasal küme**, "uçuş bu karede bitseydi" bağlama
kuralının (Bölüm 4.4) faul saymayacağı nihai hamlelerin kümesidir:

$$
\mathrm T\in\mathcal L_k \iff h_F<1-\epsilon_F\ \wedge\ h_B<1-\epsilon_B,\qquad
\mathrm K\in\mathcal L_k \iff h_F\ge\epsilon_F\ \wedge\ h_B\ge\epsilon_B,\qquad
\mathrm M\in\mathcal L_k \iff h_F\ge\epsilon_F\ \wedge\ h_B<1-\epsilon_B.
$$

Bu, Bölüm 4.4'teki faul tablosunun tam tümleyenidir: "açık" sınaması ($h\ge1-\epsilon$) sınır değerini
içerir, "kapalı" sınaması ($h<\epsilon$) içermez. YZ ile hakem aynı işlevi (`foulNow`) çağırır.

YZ'nin inancı $\mathbf p$ (zamanında oynanan üç sınıfın birleşik kütlesi) bu kümeye kısıtlanarak **yasal
kütle** $\mathbf m$ elde edilir; üç durum vardır:

1. $\mathcal L_k\neq\varnothing$ ve inanç yasal sınıflara kütle veriyor ($\sum_{y\in\mathcal L_k}p_y>10^{-12}$):
   $m_y=p_y\,\mathbb 1[y\in\mathcal L_k]$.
2. $\mathcal L_k\neq\varnothing$ ama inanç yasal sınıflara (sayısal olarak) hiç kütle vermiyor — örneğin keskin
   biçimde öğrenilmiş bir başlangıç önseli olağandışı geç bir açılmayla karşılaştığında —: kütle **yasal
   küme üzerinde düzgün** alınır, $m_y=\mathbb 1[y\in\mathcal L_k]/\lvert\mathcal L_k\rvert$. Hakemin desteği
   kazanır: karar, zaten faul olan hamleler hakkındaki bir inanca göre değil, hâlâ yasal olanlara göre
   verilir. (İlk v4 gerçeklemesi bu durumda kısıtsız inanca geri düşüyor ve hakemin çoktan dışladığı bir
   hamleye göre oynayabiliyordu; Bölüm 5.1.6.)
3. $\mathcal L_k=\varnothing$ (üç hamle de faul olurdu): hiçbir sonuç kayıp olamaz; kısıtsız inanç kullanılır.
   Gerçekleme bu durumda güvenli hamle aramaz: karar kuralına üç sınıf da yasalmış gibi girilir (aşağıdaki
   "güvenli hamle yok" dalı).

$M=\sum_y m_y$ toplam yasal kütledir.

**Risk duyarlı karar (Serbest, Standart).** Kayıptan kaçınma katsayısı $\mu\ge1$ ile

$$
\mathrm{BF}_\mu(a)=\sum_y m_y\,u_\mu(a,y),\qquad u_\mu=\{+1\ \text{kazanç},\;0\ \text{berabere},\;-\mu\ \text{kayıp}\}
$$

en büyüklenir.

**Kaybetmeme öncelikli karar: yasal küme politikası (Turnuva).** $W(a)=\sum_y m_y\mathbb 1[a \text{ yener } y]$
kazanma kütlesi, $\ell(a)=\sum_y m_y\mathbb 1[y \text{ yener } a]$ kayıp kütlesi olsun. Bir $a$ hamlesi, onu
yenen hamle yasal değilse **güvenli**dir:

$$
a \text{ güvenli} \iff \operatorname{yener}(a)\notin\mathcal L_k .
$$

Güvenlik, YZ'nin bir olasılığı ne kadar küçük sandığına göre değil, **yalnızca hakemin yasal kümesine**
göre belirlenir: yasal olan ama YZ'nin neredeyse olanaksız saydığı bir hamle de YZ'nin kaybetmemesi gereken
bir hamledir. Seçim şöyledir:

- Güvenli bir hamle varsa, güvenli hamleler arasında $W(a)$'sı en büyük olan seçilir.
- Güvenli hamle yoksa (üç sınıf da yasaldır ya da $\mathcal L_k=\varnothing$), önce $\ell(a)$ en aza indirilir (farkları $10^{-3}M$'yi aşmayan
  kayıp kütleleri eşit sayılır), eşitlikte $W(a)$ en büyüklenir.
- Kalan eşitlikler sabit Kâğıt, Makas, Taş sırasıyla bozulur.

**Revizyon.** Mühür, ayaktaki taahhüde göre yeni seçim yeterince daha iyi olduğunda revize edilir. Risk
duyarlı politikada: beklenen fayda farkı $\ge0{,}25M$ ya da ayaktaki hamlenin kayıp kütlesi $\ge0{,}30M$.
Kaybetmeme öncelikli politikada: (i) ayaktaki hamle güvenli değil, yeni seçim güvenliyse **her zaman**;
(ii) ikisi de güvenliyse yalnızca $W$ en az $0{,}25M$ artıyorsa; (iii) güvenli hamle yoksa, kayıp kütlesi
$10^{-3}M$'den fazla azalıyorsa ya da kayıplar eşitken $W$ en az $0{,}25M$ artıyorsa. Turda en az iki
izlenen kare değerlendirilmeden (tek atış kipinde kurulmuş bekleyişin kareleri dâhil) kinematik revizyon
yapılmaz. Her revizyon zincire yeni bir mühür olarak eklenir
(D3).

**İsteğe bağlı dondurma ufku.** Deneysel çalışma için, $\hat t_L-t<\Delta_{\text{don}}$ olduğunda revizyonu
yasaklayan bir "karar ufku" parametresi bulunur ($\Delta_{\text{don}}=0$: kapalı). Bu parametre taranarak
**erkenlik–doğruluk eğrisi** elde edilir (Bölüm 6.2). Dondurma ufku **kaybetmeme öncelikli ön ayarda yok
sayılır**: orada hakem eli son havadaki kareye kadar okur; daha erken bakmayı bırakan bir YZ yasal bir
hamleye kaybedebilirdi. İlk v4 gerçeklemesinde kullanıcıya açık olan bu ayar Turnuva'da da etkiliydi ve
güvenceyi sessizce geçersiz kılıyordu (Bölüm 5.1.6). Serbest ve Standart'ta ayar etkilidir.

> **Lemma 1 (güvenli hamlenin varlığı).** $\mathcal L\subsetneq\mathcal M$ boş olmayan bir yasal küme olsun
> (yani en az bir, en çok iki sınıf yasal). O zaman güvenli bir hamle vardır ve güvenli bir hamle
> $\mathcal L$'deki hiçbir hamleye kaybetmez. $\lvert\mathcal L\rvert=2$ ise güvenli hamle tektir: yasal
> sınıflardan birini yener, diğeriyle berabere kalır. $\lvert\mathcal L\rvert=1$, $\mathcal L=\{y\}$ ise iki
> güvenli hamle vardır: $\operatorname{yener}(y)$ (kazanır) ve $y$ (berabere kalır).
>
> *İspat.* TKM'de bir $a$ hamlesi yalnızca $\operatorname{yener}(a)$'ya kaybeder ve
> $\operatorname{yener}$ bir döngüsel kaydırma, dolayısıyla bire bir ve örtendir. $c\notin\mathcal L$ bir sınıf
> olsun ve $a$, $\operatorname{yener}(a)=c$ olan hamle olsun. $a$ yalnızca $c$'ye kaybeder; $c\notin\mathcal L$
> olduğundan $a$ güvenlidir ve $\mathcal L$'deki hiçbir hamleye kaybetmez. $\lvert\mathcal L\rvert=2$ ise
> $c$ tektir, dolayısıyla $a$ da tektir; $\mathcal L$ geri kalan iki sınıftan, yani $a$'nın kendisinden
> (berabere) ve $a$'nın yendiği sınıftan oluşur. $\lvert\mathcal L\rvert=1$ ise $c$ için iki seçenek vardır;
> karşılık gelen hamleler $\operatorname{yener}(a)\ne y$ olan iki hamledir: $a=y$ ve $a=\operatorname{yener}(y)$.
> $\blacksquare$

> **Teorem 1 (kurala göre yenilmezlik).** Ön grup eşiği $\epsilon_F=\tfrac12$ olan ve kaybetmeme öncelikli
> politikayı kullanan bir ön ayar (Turnuva) altında, hakemin **geçerli** saydığı her turda YZ kaybetmez:
> hüküm "YZ kazandı" ya da "berabere"dir.
>
> Teoremin, turun geçerli olması dışında bir önkoşulu yoktur. YZ'nin inancına, o inancın kalibrasyonuna,
> dedektörün doğruluğuna, zaman damgalarına ya da oyun kipine (üç ya da iki hazırlık vuruşu, tek atış,
> metronom) ilişkin hiçbir varsayım içermez. Bu metnin bir önceki hâlinde teorem iki koşulla veriliyordu
> (hakem büyüklüğünün tam olarak $\tfrac12$ çıkmaması ve metronom kipinde bir zaman yuvarlaması koşulu);
> ikisi de gerçeklemede kapatılmıştır (1. ve 3. adım; aşağıda, "Sınır değeri $h_F=\tfrac12$" ve "İnceleme
> sonrasında bulunan delikler", (b)).
>
> *İspat.* Tur geçerli olsun. $m_L$ iniş karesinin dizini; $j$ turun son havadaki karesi, yani dizini
> $m_L$'den küçük olan son izlenen (değerlendirilmiş) kare; $h_F,h_B$ motorun $j$ karesiyle birlikte
> sakladığı hakem büyüklükleri; $y$ hakemin tanıdığı nihai hamle olsun. Geçerli bir turda $j$ vardır
> (Bölüm 4.4, tazelik koşulları).
>
> **1. adım — yasal küme, her $h_F$ için, en çok iki sınıflıdır.** $\epsilon_F=\tfrac12$ ile ön grup
> $h_F\ge\tfrac12$ iken açık, $h_F<\tfrac12$ iken kapalıdır. Bu iki sınama birbirinin tam tümleyenidir: her
> $h_F$ değeri için — tam $\tfrac12$ dâhil; sonlu olmayan bir değer $0$ okunur — tam olarak biri doğrudur.
> (i) $h_F<\tfrac12$: Kâğıt ve Makas yasal değildir; $\mathcal L_j=\{\mathrm T\}$ ($h_B<1-\epsilon_B$ ise) ya da
> $\mathcal L_j=\varnothing$.
> (ii) $h_F\ge\tfrac12$: Taş yasal değildir; $\mathcal L_j=\{\mathrm K\}$ ($h_B\ge1-\epsilon_B$), $\{\mathrm M\}$
> ($h_B<\epsilon_B$) ya da $\{\mathrm K,\mathrm M\}$ ($\epsilon_B\le h_B<1-\epsilon_B$).
> Her durumda $\lvert\mathcal L_j\rvert\le2$'dir.
>
> **2. adım — $j$ karesindeki değerlendirmeden sonra ayakta kalan mühür güvenlidir.** Tur geçerli
> olduğundan tazeliğin üçüncü koşulu sağlanmıştır (Bölüm 4.4): motor $j$ karesinde revizyon adımını
> tamamlamıştır — revizyon yolu açıktır, turda en az iki izlenen kare görülmüştür ve adımın sonuna
> varılmıştır. Aksi hâlde hakem turu EL YOK ile geçersiz sayardı. Hakemin okuduğu işaret, revizyon
> adımının en sonunda, gereken mühür atıldıktan sonra konur; mühür atılamazsa (taahhüt kaydı onu
> reddederse) tur o karede iptal edilir ve hiç hükme bağlanmaz. Dondurma ufku bu ön ayarda yok sayılır.
> Demek ki $j$ karesinde seçim, o karenin $h_F,h_B$ değerleriyle yeniden hesaplanmış ve revizyon kuralı
> uygulanmıştır. Geçerli bir turda
> $y\in\mathcal L_j$, dolayısıyla $\mathcal L_j\neq\varnothing$'dir (4. adım); 1. adımla birlikte $\mathcal L_j$
> boş olmayan bir öz alt kümedir ve Lemma 1 gereği güvenli bir hamle vardır. Politika, güvenli bir hamle
> varken yalnızca güvenli hamleler arasından seçer; seçimi $a^\circ$ güvenlidir. Ayaktaki mühür $a$ için üç
> olasılık vardır: $a=a^\circ$ ise güvenlidir; $a$ güvenli değilse revizyon kuralının (i) maddesi gereği
> koşulsuz olarak $a^\circ$ ile değiştirilir; $a\neq a^\circ$ güvenliyse yerinde kalabilir ama zaten
> güvenlidir. Bu adımda YZ'nin inancının büyüklüğü hiçbir rol oynamaz: güvenlik yalnızca $\mathcal L_j$'ye
> bağlıdır ve yasal kütle, inanç yasal sınıflara hiç kütle vermese bile tanımlıdır (yasal destek üzerinde
> düzgün).
>
> **3. adım — değerlendirilen mühür o mühürdür (kare sırası).** Taahhütler yalnızca uçuşun (tek atış
> kipinde kurulmuş bekleyişin) başladığı karede ve izlenen karelerin değerlendirilmesinde, kare başına en
> çok bir tane üretilir. Motor, dizini ya da zamanı ilerlemeyen kareyi attığından taahhütlerin kare
> dizinleri kesin artandır. Değerlendirilen her kare havadaki kareler listesine yazılır; tek atış kipindeki
> arabellek kırpması bu listenin yalnızca en eski karelerini atar, yani liste her an değerlendirilmiş
> karelerin bir son ekidir. "İniş sonrası" işareti ile "havadaki kare" aynı tamsayı sınamasının iki yüzüdür
> (Bölüm 4.4): bir taahhüt, kare dizini $\ge m_L$ ise işaretlenir; havadaki kareler, dizini $<m_L$
> olanlardır; hiçbir zaman damgası karşılaştırılmaz. İniş saptandıktan sonra taahhüt üretilemez (taahhüt
> yolu kapanır; inişi getiren kare değerlendirilmez). Buradan iki şey çıkar. (a) $j$ karesinde ya da daha
> önce üretilmiş hiçbir taahhüt işaretli değildir: kare dizini $j$'ninkinden büyük değildir, o da
> $m_L$'den küçüktür. Uçuşun başındaki davranış mührü de böyledir; $j$ ondan sonra değerlendirilmiş bir
> karedir. (b) $j$ karesindeki değerlendirmeden sonra üretilmiş her taahhüt, $j$'den sonra değerlendirilmiş
> bir karededir; böyle bir kare listede $j$'den sonra gelir ve $j$, dizini $m_L$'den küçük olan son kare
> olduğundan, onun dizini $\ge m_L$'dir: taahhüt işaretlidir. Değerlendirilen taahhüt, işaretli olmayan son
> taahhüttür; o hâlde $j$ karesindeki değerlendirmeden sonra ayakta kalan mühürdür.
>
> **4. adım — hakem aynı kareyi, aynı sayılarla okur.** Tur geçerli sayıldığına göre oturan şekil bir TKM
> hamlesi $y$'dir ve bağlama kuralı onu $j$ karesinin $h_F,h_B$ değerleriyle faul saymamıştır:
> $y\in\mathcal L_j$. Bu değerler YZ'nin 2. adımda kullandığı sayıların kendisidir: motor, kendi kararı için
> hesapladığı iki değeri kareyle birlikte saklar; hakem saklanan değerleri aynı ön ayarla (ön ayar tur
> boyunca değişmez) aynı işleve verir. Ayakta kalan $a$ güvenli olduğundan
> $\operatorname{yener}(a)\notin\mathcal L_j$, yani $y\neq\operatorname{yener}(a)$: $y$, $a$'yı yenmez.
> $\blacksquare$

> **Sonuç 1.** Geçerli bir Turnuva turunda beraberlik yalnızca $\mathcal L_j=\{\mathrm K,\mathrm M\}$ iken oyuncu
> Makas indirdiğinde ortaya çıkar. $\lvert\mathcal L_j\rvert=1$ ise YZ kazanır: berabere kalan güvenli hamle
> ayaktaysa, kazanan güvenli hamle $W$'yi $M$ kadar (yani en az $0{,}25M$) artırdığından revizyon kuralının
> (ii) maddesi uygulanır.

Teorem daha önceki metinlerde koşullarla veriliyordu. İlk v4 metnindeki iki koşul (YZ'nin inancının yasal
hamlelere "ihmal edilemez" kütle vermesi ve bir sayısal tolerans) bağımsız incelemede gerçekten ihlal
edilebilir bulunmuş, Turnuva'da geçerli turlar kaybedilebilmişti (Bölüm 5.1.6); yasal küme politikasında o
koşullar yoktur: güvenlik inanca değil yasal kümeye bağlıdır. İnceleme sonrasındaki metinde kalan iki koşul
da kapatılmıştır (aşağıda). İspatın gerçeklemeye dayanan dayanakları motorda zorlanır ve regresyon
testleriyle korunur (Bölüm 5.7): "açık" ve "kapalı" sınamalarının tam tümleyen olması (1. adım); son
havadaki karede revizyon adımının tamamlanmış olması — hakemin geçerlilik koşulu —, atılamayan bir mührün
turu iptal etmesi ve dondurma ufkunun yok sayılması (2. adım); iniş öncesinin iki tarafta aynı kare sırası
sınamasıyla belirlenmesi ve karelerin dizinde de ilerlemek zorunda olması (3. adım). 2. adımdaki "en az iki
izlenen kare" alt sınırı varsayılan
sabitlerle tazeliğin birinci koşulundan da çıkar; işarete yazılmış olması ispatı sabitlerin değerinden
bağımsız kılar. 4. adımın kendine ait bir testi **yoktur**: "aynı sayı" yapısal olarak sağlanır (kareyle
birlikte saklanan tek bir değer çifti) ve yalnızca dolaylı olarak, Turnuva testlerindeki "sıfır oyuncu
galibiyeti" savlarıyla sınanır.

**İnceleme sonrasında bulunan delikler (kapatılmıştır).** Bağımsız inceleme ve düzeltmeleri bittikten
sonra, bu metin yazılırken ve denetlenirken, ispatın adımları kodla tek tek karşılaştırılmış ve iki delik
daha bulunmuştur: birini metnin yazarı ispatı yazarken, ötekini metnin olgu denetimi bulmuştur. Metnin son
doğrulamasında, ispatı kodla kırmaya çalışan ayrı bir saldırı denetimi, motorun programlama arayüzü
düzeyinde üçüncü bir delik bulmuştur. Üçü de elle kurulmuş kare dizileriyle (simülasyon) yeniden üretilmiş,
giderilmiş ve regresyon testine bağlanmıştır.

*(a) Tek atış kipinde, kurulmuş bekleyişin bir karesi üzerinden hükme bağlanan tur (2. adım).* Tek atış
kipinde kurulmuş bekleyişte YZ eli izler ama revize etmez; bu kareler yine de "havadaki kare" olarak
kaydedilir. Atış vuruşunun tamamı tek bir düşen kareye sığacak kadar hızlıysa boşluk sonrası iniş kuralı
inişi boşluktan sonraki ilk kareye tarihliyor, son havadaki kare bir bekleyiş karesi oluyor ve — yaşı
tazelik sınırının altında kaldığında — hiç revize edilmemiş davranış mührü yasal bir Taş'la
karşılaştırılıyordu. Yeniden üretim (rastgele davranış mührü; 20 ve 30 kare/s'de 40'ar deneme): her iki
kare hızında 17 oyuncu galibiyeti, 14 YZ galibiyeti ve 9 beraberlik — yani şans — ve hepsi davranış mührü
üzerinden; 15 kare/s'de yaş koşulu bu turları zaten geçersiz sayıyordu. Düzeltme: motor her havadaki
kareyle birlikte "bu karede revizyon adımına ulaşıldı" işaretini saklar (bugün: "revizyon adımı
tamamlandı"; aşağıda (c)) ve hakem, son havadaki karesi bu
işareti taşımayan turu EL YOK ile geçersiz sayar (tazeliğin üçüncü koşulu, Bölüm 4.4). Düzeltmeden sonra
aynı sahneleme 15, 20 ve 30 kare/s'de 40'ta 40 EL YOK verir. Regresyon testi: `single-stroke mode: a stroke
hidden by a dropped frame is void, not a judged behavioural guess`.

*(b) Yuvarlanmış mühür zamanının yuvarlanmamış kare zamanıyla karıştırılması (3. adım).* "İniş sonrası"
işareti, taahhüdün mühre yazılan zamanı $t_L$'den küçük değilse de konuyordu. Mühürdeki zaman, karenin
yakalanma zamanının $0{,}1$ ms'lik ızgaraya en yakın değere yuvarlanmış hâlidir (Bölüm 4.8) ve kare
zamanından $0{,}05$ ms'ye kadar büyük olabilir; hakem ise son havadaki kareyi yuvarlanmamış kare zamanıyla
seçiyordu. Metronom kipinde iniş bir karenin zamanına değil, ilan edilmiş atış anına tarihlenebildiğinden
(Bölüm 4.2), o andan $0{,}05$ ms'den kısa süre önce yakalanmış son havadaki karede atılan mühür
değerlendirme dışı kalıyor, hakem o kareyi okumayı sürdürüyor ve değerlendirilen bir önceki mühür yasal bir
hamleye kaybedebiliyordu. Yeniden üretim (olgu denetiminin sahnelemesi: metronom kipi, son havadaki kare
ilan edilmiş atış anının $0{,}02$ ms öncesinde, 800 tur): o karede atılan 244 mührün 244'ü değerlendirme
dışı, 108 oyuncu galibiyeti. Düzeltme: "inişten önce" her iki tarafta yalnızca kare sırasıyla belirlenir
(Bölüm 4.4) ve motor, dizini ilerlemeyen kareyi de atar. Düzeltmeden sonra aynı sahneleme: 800 tur, o
karede 244 mühür, değerlendirme dışı kalan 0, oyuncu galibiyeti 0 (359 YZ galibiyeti, 441 faul). Regresyon
testleri: `metronome mode: a frame a few hundredths of a millisecond before the scheduled landing keeps its
seal` (400 sahnelenmiş tur, son havadaki karede 122 mühür, hiçbiri değerlendirme dışı değil, oyuncu
galibiyeti yok) ve `frames must advance in index as well as in time (frame order is what I1 rests on)`. Bu
delik D1'i çiğnemiyordu (değerlendirilen mühür yine inişten önceydi); çiğnenen, ispatın 3. adımıydı.
Düzeltmeden önceki gerçek sıklığı ölçülmemiştir; pencere en çok $0{,}05$ ms idi ve Bölüm 6'daki deneylerin
hiçbiri metronom kipini kullanmaz.

*(c) Atılamayan bir mühür (2. adım; motorun programlama arayüzü düzeyinde).* Motor, havadaki bir kareyi
"bu karede revizyon adımına ulaşıldı" diye işaretledikten **sonra** revizyon mührünü atıyordu. Taahhüt
kaydı o mührü reddederse — kaydın mühürleyemeyeceği bir kare yüzünden (dizini $2^{53}-1$'i ya da zamanı
$2^{52}/10$ ms'yi aşan; motor bu kareleri kabul ediyordu) ya da bozulan bir nonce kaynağı yüzünden —
istisna motordan dışarı çıkıyor, kare ise işaretli kalıyordu. İstisnayı yutup aynı motoru beslemeyi
sürdüren bir çağıran için tur, hiç revize edilmemiş eski mühür üzerinden hükme bağlanıyordu: 2. adımın
dayanağı motorda değil, çağıranın davranışındaydı. Uygulamanın kendisi bu yola girmiyordu: denetleyici bir
motor istisnasında turu iptal edip motoru yeniden kurar; kare dizinleri sıfırdan sayılır, zamanlar
`performance.now()` zaman tabanındadır ve nonce'lar Web Crypto'dan çekilir. Yeniden üretim (oyuncu Taş atar,
davranış mührü rastgele; simülasyon): nonce kaynağı davranış mühründen sonra bozulduğunda 40 turun 40'ı
davranış mührü üzerinden hükme bağlandı — 17 oyuncu galibiyeti, 14 YZ galibiyeti, 9 beraberlik, yani yazı
tura; uçuş başladıktan sonra kare dizinleri $2^{53}$'ü aştığında 60 turda 23 oyuncu galibiyeti; mühürlenebilir
zamanın sınırı uçuşun başına denk getirildiğinde 40 turda 17 oyuncu galibiyeti. Düzeltme: işaret revizyon
adımının en sonunda konur; mühür atılamazsa tur `ENGINE_ERROR` nedeniyle iptal edilir, gösterilmiş
mühürler açılıp doğrulanır (D3) ve istisna motordan çıkmaz; motor yalnızca kaydın mühürleyebileceği
kareleri kabul eder. Düzeltmeden sonra aynı sahnelemeler: nonce bozulmasında 40 turun 26'sı iptal edilir,
revizyon gerektirmeyen 14'ü hükme bağlanır (14 YZ galibiyeti), oyuncu galibiyeti 0; sınırı aşan kareler
motora hiç girmez ve hiçbir tur hükme bağlanmaz. Aynı denetim, ön ayar adının ön ayar tablosunda yalnızca
bir anahtar olarak aranmasının kalıtılmış nesne anahtarlarını da kabul ettiğini göstermiştir:
`constructor` gibi bir ad ön ayar sayılıyor ve hakem eşiksiz kalıyordu (30 sahnelenmiş Taş turunda kayıp
yoktu, ama sonuç "constructor" ön ayarıyla kaydedildi); artık yalnızca üç adlı ön ayar kabul edilir.
Regresyon testleri: `a seal that cannot be made aborts the round; the round is never judged on an older
seal`, `frames the commit log could not seal are ignored (index beyond 2^53 - 1, time beyond 2^52 / 10 ms)`
ve `only the three named presets are accepted (no inherited object keys)`.

**Sınır değeri $h_F=\tfrac12$.** Bir önceki metindeki öteki koşul sayısaldı. O sıradaki gerçeklemede "ön
açık" $h_F>\tfrac12$, "ön kapalı" $h_F<\tfrac12$ olarak sınanıyordu; tam eşitlikte ön grup hiçbir sınıfı
dışlamıyor ve $h_B$ de belirsizse üç sınıf yasal kalıyor, politika güvenli hamle bulamıyordu. $h_F$ iki
üstel toplamın oranıdır; tam $\tfrac12$ çıkması bu toplamların kayan noktada bit düzeyinde eşit olmasını
gerektirir. Durum testlerde ve deneylerde gözlenmemiş, bir kayıp olarak da üretilmemiştir; yine de
teoremde bir koşul olarak kalmaması için sınama değiştirilmiştir: sınır "açık" tarafına alınmıştır (Bölüm
4.4). Regresyon testi (`the legal set never holds three throws under turnuva, not even at a heading of
exactly one half`), ön büyüklüğün sekiz değeri ($0$; $0{,}25$; $\tfrac12-2^{-52}$; $\tfrac12$;
$\tfrac12+2^{-52}$; $0{,}75$; $1$; sonlu olmayan bir değer) ile arka büyüklüğün eşikler çevresindeki sekiz
değerinin her birleşiminde yasal kümenin en çok iki sınıf içerdiğini, bir şey yasalken güvenli bir hamlenin
bulunduğunu ve politikanın — her sınıfa $10^{-300}$ kütle veren bir inançla bile — onu seçtiğini savlar.

Bu tarihçe, teoremin "kural gereği" niteliğinin gerçeklemenin her ayrıntısına bağlı olduğunu ve ispatın
neden regresyon testleriyle korunması gerektiğini gösterir: bağımsız incelemeden ve onun düzeltmelerinden
sonra bile üç delik kalmıştı ve hiçbirini bulan test değildi: ilk ikisini ispatın kodla satır satır
karşılaştırılması, üçüncüsünü ispatı kırmaya çalışan saldırı denetimi buldu. Yukarıdaki ispat, kodun bugünkü
hâliyle bir kez daha satır satır karşılaştırılmış ve
başka bir boşluk bulunmamıştır; bu, boşluk olmadığının kanıtı değildir (Bölüm 8.2, "Doğrulamanın kendisi").

**Teoremin iddia etmedikleri.**

1. **Tahmin kalitesi hakkında bir şey söylemez.** Teorem kuralın bir özelliğidir: son havadaki karede ön
   parmakların "ölçülebilir biçimde açılmış" ya da "açılmamış" olması yasal kümeyi en çok iki sınıfa
   indirir ve YZ o kümeye karşı kaybetmeyen hamleyi oynar. Dedektör ne kadar kötü olursa olsun geçerli
   turlarda kayıp yine sıfırdır.
2. **Kaç denemenin geçerli tura dönüştüğünü söylemez.** Dedektörün her zayıflığı — geç saptanan bir açılma,
   yanlış okunan bir el, kaybolan bir kare — kayıp olarak değil, **faul ve geçersiz tur** olarak ortaya
   çıkar. Kuralın bedeli budur ve sistemin ölçüsü geçerli turlardaki oran değil, bütün denemeler üzerindeki
   orandır (Bölüm 4.10). Model uyumsuzluğu altında kayıp sıfırda kalırken faul ve geçersiz payının nasıl
   büyüdüğü Bölüm 6.8'de ölçülmüştür.
3. **Standart ve Serbest için geçerli değildir.** $\epsilon_F<\tfrac12$ iken $h_F\in[\epsilon_F,1-\epsilon_F)$
   ve $h_B\in[\epsilon_B,1-\epsilon_B)$ olduğunda üç sınıf da yasaldır; güvenli hamle yoktur ve insan meşru
   biçimde kazanabilir. Bu ön ayarlarda YZ bir kumar oynar ve kayıp oranı ölçülür.
4. **Fiziksel inişi değil, motorun saptadığı inişi esas alır.** D1 ve teorem, motorun kendi kare akışına
   ve kendi iniş saptamasına göredir. Simülasyonda motorun inişi gerçek inişin birkaç milisaniye
   çevresindedir (Bölüm 5.9); yine de varsayılanın 2–3 katı görüntü gürültüsünde, yumuşak inişle biten
   yaklaşık 370 geçerli turun 1–2'sinde değerlendirilen mühür simülasyondaki gerçek inişten sonra
   atılmıştır (varsayılan gürültüde 30 kare/s'de 370'te, 60 kare/s'de 384'te 0; olağan vuruşlarda sınanan
   her gürültü düzeyinde 0). Gerçek kamerada bu fark ölçülmemiştir. Mührün duvar saatine göre ne zaman
   var olduğu ayrı bir ölçümdür (Bölüm 4.10).
5. **Dürüst olmayan bir istemciyi engellemez** (Bölüm 4.8, 8.2).
6. **Raporlanan önceliğin kesin pozitif olduğunu söylemez.** Teoremin ve D1'in "inişten önce"si kare
   sırasıdır: değerlendirilen mührün karesi iniş karesinden öncedir ve inişten önce yakalanmıştır.
   Raporlanan öncelik ise iniş zamanı eksi **mühre yazılan** zamandır; mühürdeki zaman $0{,}1$ ms'lik
   ızgaraya yuvarlanır ve fark da $0{,}1$ ms'ye yuvarlanarak verilir. Son havadaki kare ilan edilmiş bir
   atış anının $0{,}05$ ms'den yakınında yakalanmışsa (metronom kipinde, iniş o ana tarihlendiğinde)
   raporda öncelik $0{,}0$ ms okunabilir; yuvarlamadan önce kesin pozitiftir. Testler kare sırasını ve
   önceliğin negatif olmadığını savlar.

Teorem bir "hile" değildir: karar yalnızca iniş öncesi karelerden verilir ve mühürlenir; kural, yalnızca
"iniş sonrasında şekil değiştirilemez" ilkesini nicel hâle getirir. Otomatik testlerde Turnuva ön ayarında
kayıp gözlenmemiştir (simülasyon): karışık oturumlarda 1520 geçerli tur; dedektör düzeyindeki regresyon
çalışmalarında 2830; incelemenin iki saldırı senaryosunda — Makas gibi açıp yüzük ve serçe parmağı son
anda açmak (384 hüküm, 202 geçerli tur) ve YZ'yi erken açılmalarla eğitip sonra geç açmak (160 hüküm, 81
geçerli tur) — sıfır oyuncu galibiyeti; elle kurulmuş 6000 kare dizisinden oluşan bir bulanık sınamada
(bugünkü kodla) 5904 hüküm, 1420 geçerli tur, sıfır oyuncu galibiyeti. İnceleme düzeltmeden
önce birinci senaryoda 6720 hükümde 192 oyuncu galibiyeti, ikincisinde geçerli turların %44'üne varan kayıp ölçmüştü. Metronom kipi
ayrıca sahnelenmiştir: son havadaki karenin ilan edilmiş atış anının $0{,}02$ ms öncesine yerleştirildiği
400 turda (regresyon testi; bu metnin son denetimindeki koşuda 186 YZ galibiyeti ve 214 faul) sıfır oyuncu
galibiyeti. Bütün kipleri ve bu sahnelerin rastgele birleşimlerini kapsayan bir saldırı bulanık sınaması
da (Bölüm 6.9) 15 000 oturumda, metronom kiplerindeki 6696 tur dâhil 14 579 geçerli
turda sıfır oyuncu galibiyeti vermiştir. Bu sayılar teoremin yerine geçmez; gerçeklemenin teoremle uyumlu
davrandığını gösteren regresyon kanıtıdır. Standart
ve Serbest ön ayarları belirsiz bölgeyi genişleterek insana meşru bir kazanma payı bırakır. Bölüm 6 bu
ödünleşimi (kayıp oranı – faul ve geçersiz payı – karar önceliği) nicel olarak verir.

## 4.8 Taahhüt–ifşa protokolü

Her taahhüt için kanonik yük

```
beaTTer/v4|sid=<oturum>|seq=<n>|round=<r>|prev=<önceki özet>|t=<ms>|frame=<kare>|move=<HAMLE>|reason=<neden>|nonce=<32 onaltılık hane>
```

oluşturulur ve $c_n=\operatorname{SHA\text{-}256}(\text{yük}_n)$ yayımlanır [FIPS180-4]. $\textit{prev}$ alanı
bir önceki taahhüdün özetidir (ilk taahhütte oturuma bağlı bir başlangıç özeti); böylece taahhütler
kurcalamaya duyarlı bir **özet zinciri** oluşturur [SchneierKelsey1999; HaberStornetta1991]. Böyle bir zincir
kurcalamayı önlemez, sonradan saptanabilir kılar. İfşada yük açılır; doğrulama (i)
özetin yeniden hesaplanması ve (ii) zincir bağlantısının denetlenmesidir. Tarayıcı güvenli bağlamdaysa
doğrulama, bağımsız ikinci bir gerçekleme olan Web Crypto ile de yinelenir ve kullanıcıya "kendin doğrula"
olarak sunulur.

`t` alanı karenin yakalanma zamanıdır ve 0,1 ms'lik ızgaraya en yakın değere yuvarlanır; mühürdeki zaman
bu yüzden kare zamanından 0,05 ms'ye kadar büyük ya da küçük olabilir. Yuvarlama yalnızca kayıt ve gösterim
içindir: bir taahhüdün inişten önce olup olmadığına mühürdeki zamanla değil, yükteki `frame` alanıyla, yani
kare sırasıyla karar verilir (Bölüm 4.4). Başlangıç özeti
$\operatorname{SHA\text{-}256}(\texttt{beaTTer/v4/genesis|}\langle\text{oturum}\rangle)$'dur. Güvenlik özellikleri
standart özet-taahhüt şemasınınkilerdir; tanımlar için [BonehShoup2023] izlenmiştir (çakışmaya dayanıklı
özetlemeden kanıtlanabilir güvenli taahhüt kurulumu için bkz. [HaleviMicali1996], yalnızca özeti
incelenmiştir):

- **Bağlayıcılık:** YZ'nin aynı $c_n$'yi farklı bir hamleyle açabilmesi SHA-256'da çakışma bulmayı
  gerektirir (çakışma dayanıklılığı 128 bit [SP800-107]).
- **Gizleyicilik:** Mesaj uzayı yalnızca üç hamle olduğundan nonce zorunludur: nonce'suz bir özet üç
  özetleme denemesiyle açılır ve çakışma dayanıklılığı tek başına gizleyicilik sağlamaz. İşletim sisteminin
  kriptografik rastgele sayı üretecinden alınan 128 bitlik nonce ile özet, hamle hakkında (rastgele kâhin
  modelinde) bilgi sızdırmaz; böyle bir üreteç yoksa sistem zayıf bir kaynağa düşmek yerine hata verir.
  Önceki sürümdeki 32 bit dolayındaki, kriptografik olmayan nonce bu özelliği sağlamıyordu.

İptal edilen bir turun (el kayboldu, ritim koptu, kullanıcı durdurdu) o ana kadar ekranda gösterilmiş
mühürleri de açılır ve aynı biçimde doğrulanır; sonuç kullanıcıya bildirilir (D3). Bir oturumda tek bir
mühür kaydı vardır ve tur numaraları, motor yeniden kurulsa bile (ayar değişikliği, kip ya da profil
değişimi), kayıttaki son turdan devam eder: açılmış bir tur kalıcı olarak kapalıdır ve numarası yeniden
kullanılamaz.

Yükteki `t`, kararın dayandığı **karenin** zamanıdır; özetin fiilen hesaplandığı an değildir. Uygulama
kaydı duvar saatiyle kurar, böylece her mühür ayrıca üretildiği anı (`sealedAt`) taşır ve ikisi arasındaki
fark kamera turlarında ölçülüp raporlanır (Bölüm 4.10).

Protokolün kanıtlayamadığı şey de açıkça belirtilmelidir: zaman damgaları istemcinin kendi saatinden gelir.
Mührün iniş öncesinde ekranda *görünmesi* ve zincir sırası istemci içinde tutarlılık sağlar; üçüncü tarafa
karşı zaman kanıtı için güvenilir bir zaman damgası hizmeti gerekir [RFC3161] ve bu çalışmanın kapsamı
dışındadır.

## 4.9 Çevrimiçi öğrenme

D6, öğrenilenleri iki sınıfa ayırır. **Oyun hakkındaki** her şey — dizi modeli, güvenlik bütçesi, füzyon
ağırlıkları, açılma zamanlaması, şekil şablonları ve ölçütler — yalnızca geçerli turlardan öğrenilir; faul
ve geçersiz turlar yalnızca sayaçları artırır, iptal edilen turlar hiçbir şey öğretmez. **Algılayıcı
kalibrasyonu** ise (aşağıda) belirli geçersiz turlardan da uyarlanabilir. Her geçerli turdan sonra şunlar
güncellenir:

1. **Dizi modeli:** bütün uzman tabloları, CTW/PPM ağaçları ve karışım ağırlıkları (Bölüm 4.5).
2. **Açılma zamanlaması:** dedektör izinden ölçülen başlangıç önceliği $\ell=t_L-a$ ve süre $D$ (min-jerk
   profilinde %10–%90 yükselme süresi $0{,}506\,D$'dir) için Normal–Ters-Gama eşlenik güncellemesi
   [Murphy2007]. $n$ gözlem, örnek ortalaması $\bar x$ ve önsel $(\mu_0,\kappa_0,\alpha_0,\beta_0)$ ile

$$
\kappa_n=\kappa_0+n,\quad \mu_n=\frac{\kappa_0\mu_0+n\bar x}{\kappa_n},\quad
\alpha_n=\alpha_0+\frac n2,\quad
\beta_n=\beta_0+\tfrac12\sum_i(x_i-\bar x)^2+\frac{\kappa_0 n(\bar x-\mu_0)^2}{2\kappa_n}.
$$

   Gerçeklemede güncelleme gözlem gözlem (ardışık) yapılır; önsel $\kappa_0=4$, $\alpha_0=3$ sözde-gözleme
   karşılık gelir ve $\kappa\le40$, $\alpha\le21$ ile üstten sınırlanır. Sınır, alışkanlıkları zamanla kayan
   bir oyuncuda sonsalın uyum yeteneğini korur; sınırlara ulaşılana kadar ardışık güncelleme yukarıdaki
   toplu formülle özdeştir. Başlangıç zamanı, ölçülen %10 noktasından $0{,}247\,D$ geri gidilerek bulunur.
   Bütün parametreler fiziksel olarak makul aralıklara kırpılır (Ek A). Öğrenilen başlangıç önceliğinin
   YZ'nin kullandığı standart sapması **en az 40 ms**'dir (önce 25 ms): çok tutarlı bir oyuncuda önsel o
   kadar keskinleşiyordu ki alışılmadık geç bir açılma YZ'nin inancında sayısal olarak sıfır kütle
   alıyordu. Yasal küme politikası (Bölüm 4.7) bunu artık bir kayba çeviremez; taban, inancın kendisini
   makul tutmak içindir.

3. **Grup gecikmesi** (Kâğıt turlarında arka–ön başlangıç farkı), **vuruş istatistikleri** (iniş süresi,
   son aralık yanlılığı), **hareket içi gürültü** ve **sinirsel etiket karışıklık matrisi**.
4. **Şekil şablonları.** Oturan şeklin sınıf şablonları (ortalama ve sapma) o sınıfın geçerli turlarından
   güncellenir. Başlangıç sapmaları **sınıfa özgüdür**: Taş $[0{,}16;\,0{,}16;\,0{,}18;\,0{,}20]$, Kâğıt
   $[0{,}22;\,0{,}22;\,0{,}24;\,0{,}26]$, Makas $[0{,}22;\,0{,}22;\,0{,}18;\,0{,}20]$ (işaret, orta, yüzük,
   serçe). Kapalı parmaklar dar, açık parmaklar geniş tutulur: gevşek açılmış bir parmak tam düz değildir
   ve bükülme negatif olmayan açıların toplamı olduğundan eklem gürültüsü düz bir parmağı yalnızca
   "bükülmüş" okutabilir (yanlılık tek yönlüdür). Öğrenilen sapma $[0{,}12;\,0{,}35]$ aralığında tutulur
   (alt sınır önce 0,08 idi).
5. **Füzyon ağırlıkları** $(w_p,w_k)$ (yalnızca değerlendirilen mühür kinematikse; kırpılmış gradyanla,
   Bölüm 4.7) ve **güvenlik bütçesi** $B_t$.
6. **Algılayıcı kalibrasyonu** ($\Theta^{\text{yumruk}}$, $\Theta^{\text{açık}}$): yumruk bükülmesi hazırlık
   duruşundan; açık parmak bükülmesi, tanınan hamlenin açık tuttuğu parmaklardan (Kâğıt'ta dört parmak,
   Makas'ta işaret ve orta) öğrenilir. İlk gerçeklemedeki "açılma $\ge0{,}75$ ise" eşiği kaldırılmıştır: o
   eşik, varsayılan kalibrasyonun düşük okuduğu bir elde açık parmak açısının hiç öğrenilmemesine yol
   açıyordu.
7. **Değerlendirme ölçütleri** (Bölüm 4.10).

**Geçersiz turlardan kalibrasyon: D6'nın inceltilmesi.** Kalibrasyon — ve yalnızca o — iki tür geçersiz
turdan da uyarlanır: YUMRUK YOK hükmünde hazırlık duruşunun bükülmesinden; BELİRSİZ ŞEKİL hükmünde, oturan
şekil kararlıysa (son örneklerde hiçbir parmağın açılması $0{,}25$'ten fazla oynamamışsa), açılması
$0{,}55$'i geçen parmakların bükülmesinden. Bunun D6'yı çiğnemediğinin gerekçesi üç noktadır. (i)
Kalibrasyon **ölçüm aygıtını** betimler: bu kameranın bu elin yumruğu ve açık parmakları için hangi açıları
bildirdiğini. Oyuncunun ne oynadığı, ne zaman açtığı ya da turu kimin kazandığı hakkında hiçbir şey
taşımaz. (ii) Güncelleme hiçbir oyun sonucunu kullanmaz: geçersiz bir turun kazananı yoktur ve YZ'nin
mührü güncellemeye girmez. (iii) Onsuz bir **soğuk başlangıç kilitlenmesi** oluşur: varsayılan
kalibrasyonun yanlış okuduğu bir el (gevşek açılan parmaklar) hiç geçerli Kâğıt turu üretemez, geçerli tur
olmadan da kalibrasyon düzelmez. İnceleme böyle bir elde Kâğıt'ın yaklaşık 100 deneme boyunca
oynanamadığını ölçmüştü. Regresyon testinde (simülasyon) parmakları varsayılan açık okumanın %75'inde
kalan bir el ilk turlardan itibaren okunur; %62'sinde kalan bir elde ilk 6 deneme BELİRSİZ ŞEKİL'dir,
ardından kalibrasyon uyarlanır ve son 16 denemenin 15'i geçerli Kâğıt'tır. Aynı test, geçersiz turların
dizi modeline hiçbir şey öğretmediğini doğrular. Yumruk için de aynı şey geçerlidir: yumruğu, modelin
varsaydığı 215° yerine toplam 120° bükülen (yani varsayılan kalibrasyonun yarı açık okuduğu) bir elde ilk
tur YUMRUK YOK ile geçersizdir, yumruk açısı o turdan öğrenilir ve son 12 denemenin 11'i geçerlidir. Bunun
önkoşulu, böyle bir elin tur başlatabilmesidir; sayımın başlama kapısı bu yüzden YUMRUK YOK eşiğinden
gevşektir (Bölüm 5.4). Tek atış kipinde kurulma eşiği sıkı tutulmuştur (gevşek bir eşik, kadrajda dinlenen
bir elde kur–iptal döngüsüne girerdi); o kip, yumruğu çok yanlış okunan bir eli hâlâ dışarıda bırakabilir.
Kalibrasyon sınırlıdır: açılar fiziksel aralıklara kırpılır, yumruk ile açık arasında en az 60° tutulur ve
tek bir tur farkın en çok %15'i kadar oynatır.

"Tur sayısı arttıkça daha erken tanır" iddiası böylece bir formül değil, ölçülen bir öğrenme eğrisidir:
karar önceliğinin ve mühür anındaki oluşum oranının tur sayısına göre değişimi laboratuvar panelinde
çizilir. Simülasyonda bu eğrinin beklenenden düz çıktığı, yani karar önceliğini öğrenmeden çok oyuncunun
kendi açılma zamanının belirlediği Bölüm 6.6'da açıkça raporlanmıştır.

## 4.10 Değerlendirme ölçütleri

Bütün ölçütler sayımlardan hesaplanır ve örneklem büyüklüğüyle birlikte raporlanır. İki ayrım bu bölümün
özüdür: hangi paydanın kullanıldığı ve "öncelik"in hangi saate göre ölçüldüğü.

**Koşullu ve koşulsuz oranlar.** Hükme bağlanan bir deneme üç sınıftan birine düşer: geçerli tur (YZ
kazandı, berabere, oyuncu kazandı), faul ya da geçersiz. $n_v$ geçerli tur, $n_f$ faul, $n_g$ geçersiz
tur ve $n=n_v+n_f+n_g$ olsun.

- **Koşullu oranlar (payda: geçerli turlar).** Kazanma, berabere ve kayıp oranları, "kaybetmeme"
  ($1-$kayıp oranı) ve şansa karşı sınama $n_v$ üzerinden hesaplanır. Turnuva ön ayarında bir turun geçerli
  olması, YZ'nin de okuduğu aynı havadaki karelere bağlıdır: YZ'nin kaybedeceği bir durum, tur geçerli
  sayılmadan önce faul ya da geçersiz olarak sınıflanır. Bu yüzden koşullu oranlar **kuralı** betimler;
  Turnuva'da kayıp oranının sıfır olması Teorem 1'in sonucudur ve tahminin iyi olduğunun kanıtı değildir.
  Aynı nedenle güven aralığı ve $p$ değeri de YZ'nin kendi dedektörünün seçtiği bir örneklem üzerindedir.
- **Koşulsuz oranlar (payda: bütün denemeler).** **Kazanılan deneme payı** $n_{\text{YZ}}/n$ ve **sonuçsuz
  deneme payı** $(n_f+n_g)/n$; ayrıca geçersiz payı $n_g/n$. Dedektörün her zayıflığı buraya düşer: geç
  saptanan bir açılma faul, okunamayan bir el ya da kaybolan bir kare geçersiz tur olur. **Sistemin ölçüsü
  bunlardır.** Deneylerde payda iptal edilen denemeleri de içerir (sonuçsuz pay = faul + geçersiz + iptal);
  uygulamadaki laboratuvar panelinde iptaller sayılmadığından payda hükme bağlanan denemelerdir.
- Faul oranı, önceki metinle karşılaştırılabilirlik için $n_f/(n_v+n_f)$ olarak da verilir; "dürüst ve açık"
  atışlardaki faul oranı (Taş atışları ile açılması inişten en az 110 ms önce başlayan atışlar) deneylerde
  ayrıca raporlanır, çünkü kuralın haklı olarak cezalandırdığı geç açılmalarla dedektörün hatasını ayırır.

Oranlar Wilson skor aralığıyla verilir [Wilson1927]: $n$ denemede $k$ başarı için

$$
\frac{\hat p+\frac{z^2}{2n}\pm z\sqrt{\frac{\hat p(1-\hat p)}{n}+\frac{z^2}{4n^2}}}{1+\frac{z^2}{n}},\qquad \hat p=\frac kn,\ z=1{,}96.
$$

- **Şansa karşı sınama.** $H_0: P(\text{YZ kazanır}\mid\text{geçerli})\le\tfrac13$ için kesin binom üst kuyruk
  olasılığı. Koşullu bir büyüklüktür; Turnuva'da yukarıdaki çekinceyle okunmalıdır.
- **Kestirim kalitesi.** Değerlendirilen mühür anındaki sonsal $\mathbf p_t$ için isabet (en olası sınıf doğru
  mu), çok sınıflı Brier skoru [Brier1950] $\frac1n\sum_t\sum_y(p_{t,y}-\mathbb 1[y=y_t])^2$, bit cinsinden
  ortalama logaritmik kayıp $-\frac1n\sum_t\log_2 p_{t,y_t}$ ve şansa göre **bilgi kazancı**
  $\log_23-\text{logkayıp}$ (tur başına bit) [Shannon1948].
- **Kalibrasyon.** En büyük sonsal olasılık üzerinde 10 eşit genişlikli kutuyla güvenilirlik diyagramı ve
  beklenen kalibrasyon hatası $\mathrm{ECE}=\sum_b\frac{n_b}{n}\lvert\operatorname{isabet}_b-\operatorname{güven}_b\rvert$
  [Naeini2015; Guo2017].
- **Karar önceliği.** $\Delta_L$ ve $\Delta_C$ için medyan ve çeyrekler arası aralık; mühür anındaki
  ortalama oluşum oranı $\pi_c$; davranış mührünün hiç revize edilmediği turların payı. $\Delta_C$ ve
  $\pi_c$ Taş için tanımsızdır (yumruk baştan beri oradadır) ve boş bırakılır.
- **Kinematik öncelik.** $\Delta_L$'nin dağılımı iki tepelidir: davranış mührünün hiç revize edilmediği
  turlarda öncelik bütün uçuş süresidir (tek atış kipinde oyuncunun bekleme süresi de buna eklenir), revize
  edilen turlarda son revizyonla iniş arasındaki birkaç karedir. "El okunarak verilen karar"ın ne kadar
  erken olduğunu görmek için **kinematik öncelik** ayrıca raporlanır: yalnızca değerlendirilen mührü
  kinematik (ya da revizyon) olan geçerli turlardaki $\Delta_L$.
- **Kanal ayrıştırması.** Yalnızca davranış kanalının (uçuş başı mührünün) karşı-olgusal G/B/M dökümü.
- **Veri kalitesi.** Faul ve geçersiz tur sayıları (türlerine göre), uçuştaki izleme oranı ve kare hızı
  (ikisi de yalnızca iniş karesinden önceki kareler üzerinden), son havadaki karenin yaşı.

**Bilgi kümesi önceliği ve duvar saati önceliği.** Mühürdeki zaman, kararın dayandığı karenin
**yakalanma zamanı**dır; $\Delta_L=t_L-t_c$ bu yüzden bir **bilgi kümesi önceliği**dir: karar, inişten
$\Delta_L$ önce yakalanmış bilgiye dayanır. ($t_c$ mühre yazılan, $0{,}1$ ms'ye yuvarlanmış zamandır ve
$\Delta_L$ de $0{,}1$ ms'ye yuvarlanarak raporlanır; bu yüzden raporlanan değer negatif olmaz ama Bölüm
4.7'de anlatılan seyrek durumda $0{,}0$ okunabilir.) Özetin fiilen var olduğu an ise daha geçtir: kare yakalandıktan
sonra tarayıcıya ulaşır, el izleme modeli çalışır, motor kararını verir ve SHA-256 hesaplanır. Mühür kaydı
bu anı duvar saatiyle damgalar ve iki büyüklük tanımlanır:

$$
\delta_{\text{mühür}}=t^{\text{duvar}}_{\text{özet}}-t_c\quad(\text{kare} \to \text{mühür gecikmesi}),\qquad
\Delta_L^{\text{duvar}}=\Delta_L-\delta_{\text{mühür}}\quad(\text{duvar saati önceliği}).
$$

$\Delta_L^{\text{duvar}}$ negatif çıkabilir: o zaman özet, el fiziksel olarak indikten sonra hesaplanmıştır
— D1 (bilgi kümesi) yine sağlanır, ama "mühür el inmeden önce vardı" savı o tur için doğru değildir. İki
büyüklük de yalnızca kamera turlarında ölçülür ve tur raporunda gösterilir; simülasyonda (demo ve Bölüm 6)
tanımsızdır ve boş bırakılır. Gerçek kamerada hangi değerleri aldıkları bu çalışmada ölçülmemiştir (Bölüm
8.2). Kullanıcının mührü *ekranda gördüğü* an ayrıca gösterim gecikmesi kadar sonradır ve hiç
ölçülmemektedir.

Bu ölçütler, önceki sürümdeki formülle üretilmiş "öğrenme seviyesi" ve "feint direnci" göstergelerinin
yerini alır.
