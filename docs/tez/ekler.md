# Ekler

## Ek A — Sabitler

Aşağıdaki değerler kaynak koddaki `DEFAULTS` nesnelerinden (ve belirtilen yerlerde modül düzeyindeki
sabitlerden) okunmuştur; kod yetkilidir. **Kaynak** sütunu: bir atıf anahtarı (literatür), "tarama"
(geliştirme sırasında simülasyon taramasıyla seçilmiş; ayrı sonuç dosyası yoktur), "türetim" (metinde
türetilmiş) ya da "varsayım" (mühendislik seçimi; ölçüme dayanmaz). AB = avuç boyu.

### A.1 Ortak (`core/constants.js`, `core/math.js`, `core/commit.js`)

| Ad | Değer | Birim | Anlamı | Kaynak |
|---|---|---|---|---|
| `RULES.serbest` | $\epsilon_F=0{,}03$, $\epsilon_B=0{,}03$, $\mu=2$, risk duyarlı | — | Hakem ön ayarı | varsayım |
| `RULES.standart` | $\epsilon_F=0{,}15$, $\epsilon_B=0{,}10$, $\mu=3$, risk duyarlı | — | Hakem ön ayarı | varsayım |
| `RULES.turnuva` | $\epsilon_F=0{,}50$, $\epsilon_B=0{,}15$, $\mu=3$, kaybetmeme öncelikli (`noLoss`) | — | Hakem ön ayarı (varsayılan) | türetim (Teorem 1) |
| `SCHEMA_VERSION` | 4 | — | Saklanan belgelerin sürümü | — |
| `wilsonZ` | 1,959964 | — | %95 aralık için normal dağılım kantili | [Wilson1927] |
| `domain` | `beaTTer/v4` | — | Yükün alan ayırma etiketi | varsayım |
| `nonceBytes` | 16 | bayt | Nonce uzunluğu (128 bit) | [BonehShoup2023] |
| `timeDecimals` | 1 | ondalık | Mühürdeki zamanın ızgarası (0,1 ms; en yakın değere yuvarlanır, yani mühürdeki zaman kare zamanından 0,05 ms'ye kadar büyük olabilir; bu yüzden "inişten önce" zamanla değil, yalnızca kare sırasıyla belirlenir, Bölüm 4.4, 4.7) | [HRTime] |
| `shortLength` | 8 | hane | Ekranda gösterilen özet kısaltması | varsayım |

### A.2 Kinematik ve ritim (`core/kinematics.js`, `core/stroke.js`)

| Ad | Değer | Birim | Anlamı | Kaynak |
|---|---|---|---|---|
| `thetaFist` | 95, 215, 220, 215, 205 | ° | Yumrukta toplam bükülme (baş–serçe), başlangıç değeri | [BK2024] + varsayım |
| `thetaOpen` | 20, 25, 22, 25, 28 | ° | Açık parmakta artık bükülme, başlangıç değeri | varsayım |
| `extensionMin`, `extensionMax` | −0,25; 1,25 | — | Açıklığın kırpma aralığı | varsayım |
| `minBaselineSpan` | 0,25 | — | Tabana göre normalizasyonda en küçük payda | varsayım |
| `q` | 900 | AB²/s³ | Avuç yüksekliği Kalman süreç gürültüsü (hızlı hız kestirimi) | varsayım |
| `r` | 0,000625 | AB² | Kalman ölçüm varyansı (≈ 0,025 AB titreşim) | varsayım |
| `palmTauMs` | 500 | ms | Avuç boyu ortalamasının zaman sabiti | varsayım |
| `vUp`, `vApex`, `vDown` | 1,0; 0,3; 1,2 | AB/s | Yukarı çıkış, tepe ve iniş başlangıcı eşikleri (hızlı kestirim üzerinde) | varsayım |
| `slowWindowMs` | 110 | ms | Yavaş hız kestiriminin (en küçük kareler eğimi) penceresi; en az üç örnek | varsayım; inceleme sonrası |
| `confirmFrac` | 0,5 | — | Bir başlangıcın sayılması için yavaş kestirimin eşiğe oranı (aynı yönde) | varsayım; inceleme sonrası |
| `stopFrac` | 0,2 | — | İniş, hız tepe hızının bu oranına düşünce biter | türetim (Bölüm 4.2) |
| `vStopFloor` | 0,4 | AB/s | İniş bitişi için mutlak hız tabanı | varsayım |
| `minDescentMs` | 28 | ms | Bir iniş bundan önce bitmiş sayılmaz | varsayım; v4.2.0'da değişti (önce 40) |
| `stillSpeed` | 0,8 | AB/s | "Hareketsiz" sayılan hız (**yalnızca yavaş kestirim** üzerinde) | varsayım |
| `minAmplitudePL` | 0,43 | AB | `bottom` için en küçük genlik (inişin en alçak noktasına göre ölçülür) | varsayım; v4.2.0'da değişti (önce 0,45) |
| `minPeakSpeedPL` | 2,3 | AB/s | `bottom` için en küçük tepe hızı | varsayım; v4.2.0'da değişti (önce 2,5) |
| `weakAmplitudePL`, `weakPeakSpeedPL` | 0,15; 1,5 | AB; AB/s | `weakBottom` için en küçük genlik ve tepe hızı; altı `falseStart` | varsayım; inceleme sonrası |
| `maxGapFactor` | 2,2 | — | Ritim, dönemin bu katı kadar (en az 1250 ms) boşlukta düşer; bir iniş sürerken düşmez | varsayım; v4.2.0'da değişti (önce 1,9, alt sınırsız) |
| `firstBeatTimeoutMs` | 1750 | ms | Yalnızca bir vuruş görülmüşken ritmin düşmesi için en kısa süre | varsayım; v4.2.0'da eklendi |
| `defaultPeriodMs` | 520 | ms | İki vuruş oluşmadan varsayılan dönem | [Repp2005] ile uyumlu varsayım |
| `defaultDescentMs` | 200 | ms | Hiçbir geçmişi olmayan bir vuruş için varsayılan iniş süresi (kaynak `default`) | varsayım; inceleme sonrası |
| `lostMs` | 420 | ms | Bu kadar örnek boşluğu izleyiciyi sıfırlar; tur motoru bunu `handLostMs` (600 ms) ile geçersiz kılar | varsayım; v4.2.0'da değişti (önce 350) |

### A.3 Açılma dedektörü (`core/opening.js`)

| Ad | Değer | Birim | Anlamı | Kaynak |
|---|---|---|---|---|
| `onsetStepMs` | 16 | ms | Başlangıç ızgarası adımı | varsayım |
| `maxFlightMs` | 1200 | ms | Izgara uzunluğu (en uzun uçuş); tek atış kipinde ızgara kaydırılır (A.6) | varsayım |
| `durationsMs` | 45, 65, 90, 125, 175, 245, 340 | ms | Gizil açılma süreleri | [Katsuki2015; Li2023; Carpinella2011]; v4.2.0'da değişti (önce 50, 70, 95, 130, 180, 250, 340) |
| `memoryMs` | 140 | ms | Log-kanıtın üstel unutma zaman sabiti | varsayım |
| `ampMean`, `ampVar` | 1; 0,03 | — | Nihai açılma genliğinin ortalaması ve varyansı | varsayım |
| `stayVar` | 0,004 | — | Kapalı grubun sıfır çevresindeki ek varyansı | varsayım; [HagerRoss2000] |
| `legalProgress` | 0,15 | — | "Ölçülebilir biçimde açık" sayılan oluşum oranı | varsayım |
| `lateSlackMs` | 150 | ms | İnişten sonra modellenen başlangıç payı | varsayım |
| `flatDurLogMean`, `flatDurLogSd` | ln 120; 0,6 | ln ms | Hakemin süreler üzerindeki sabit önseli | varsayım |
| `closedSigmas`, `closedMin` | 3; 0,12 | — | Yeniden çapalamada "kapalı" eşiği | varsayım |
| `reanchorFrames` | 2 | kare | Yeniden çapalama için ardışık kapalı kare | varsayım |
| tur motorundaki gruplar | ön: `legalProgress` 0,105, `stayVar` 0,0032 · arka: `legalProgress` 0,135, `stayVar` 0,0042, `closedMin` 0,20 (`reanchorFrames` varsayılan 2) | — | Tur motoru iki dedektörü yukarıdaki varsayılanların yerine bu değerlerle kurar | varsayım; v4.2.0'da eklendi (önce varsayılanlar). v4.2.0 arka grupta `reanchorFrames` 1 de veriyordu; v4.2.3 varsayılan 2'ye döndü (tek bulanık kare yeniden çapalamaya yetmemeli; Bölüm 5.1.8) |

### A.4 Şekil sınıflandırıcı (`core/pose.js`)

| Ad | Değer | Birim | Anlamı | Kaynak |
|---|---|---|---|---|
| `mean` | Taş 0, 0, 0, 0; Kâğıt 1, 1, 1, 1; Makas 0,95, 0,95, 0,12, 0,08 | — | Sınıf şablonları (işaret, orta, yüzük, serçe) | [HagerRoss2000] + varsayım; v4.2.0'da değişti (Makas önce 1, 1, 0,08, 0,06) |
| `sd` | Taş 0,16; 0,16; 0,18; 0,20 · Kâğıt 0,22; 0,22; 0,24; 0,26 · Makas 0,25; 0,25; 0,22; 0,22 | — | Sınıfa ve parmağa göre şablon sapması (açık parmaklar daha geniş) | varsayım; inceleme sonrası sınıfa özgü; v4.2.0'da değişti (Makas önce 0,22; 0,22; 0,18; 0,20) |
| `otherMean`, `otherSd` | 0,5; 0,6 | — | "Diğer" sınıfı | varsayım |
| `prior` | 0,3; 0,3; 0,3; 0,1 | — | Taş, Kâğıt, Makas, diğer | varsayım |
| `neuralCounts` | köşegen 6, diğer 1, "yok" 2 | sözde-sayım | Jest etiketi karışıklık önseli | varsayım |
| `neuralWeight` | 0,5 | — | Jest etiketi olabilirliğinin üssü; etiketin güveni $s\ge0{,}65$ ise $(0{,}6+0{,}9\,s)$ ile çarpılır | varsayım; çarpan v4.2.0'da eklendi |
| `stableFrames`, `stableMs`, `stableProb` | 3; 70; 0,85 | kare; ms; — | Nihai hamle kararlılık ölçütü | varsayım |

### A.5 Füzyon ve karar (`core/decision.js`), güvenli sömürü (`core/safety.js`)

| Ad | Değer | Birim | Anlamı | Kaynak |
|---|---|---|---|---|
| `reviseMargin` | 0,25 | × $M$ | Risk duyarlı politikada revizyon için fayda farkı | varsayım |
| `reviseLossProb` | 0,30 | × $M$ | … ya da mevcut hamlenin kayıp kütlesi | varsayım |
| `lossTolerance` | $10^{-3}$ | × $M$ | Kaybetmeme öncelikli politikada, **yalnızca güvenli hamle yokken** (üç sınıf da yasalken) eşit sayılan kayıp farkı. Güvenliğin kendisi bu toleransa değil hakemin yasal kümesine bağlıdır | varsayım |
| `winGain` | 0,25 | × $M$ | İki güvenli hamle arasında (ya da eşit kayıpta) revizyon için kazanma artışı | varsayım |
| yasal destek tabanı | $10^{-12}$ | kütle | İnanç yasal sınıflara bundan az kütle veriyorsa kütle yasal küme üzerinde düzgün alınır | varsayım; inceleme sonrası |
| `fusionRate` | 0,05 | — | Füzyon ağırlıklarının öğrenme adımı | varsayım |
| `fusionMin`, `fusionMax` | 0,25; 2,5 | — | Füzyon ağırlıklarının sınırları | varsayım |
| `fusionGradClip` | 2 | nat | Tur başına füzyon gradyanının kırpma sınırı (±) | varsayım; inceleme sonrası |
| `probFloor` | $10^{-6}$ | — | Logaritma içi olasılık tabanı | varsayım |
| `initialBudget` | 1,0 | kazanç | $B_0$ | varsayım |
| `epsilonPerRound` | 0,02 | kazanç/tur | $\varepsilon$ | varsayım |
| `maxBudget` | 6 | kazanç | Bütçe tavanı | varsayım |

### A.6 Tur motoru (`core/round_engine.js`)

| Ad | Değer | Birim | Anlamı | Kaynak |
|---|---|---|---|---|
| `primeBeats` | 3 | vuruş | Hazırlık vuruşu sayısı (3, 2 ya da 0) | [WRPS] |
| `rules` | turnuva | — | Varsayılan hakem ön ayarı | — |
| `settleMs` | 420 | ms | İniş sonrası oturma penceresi | varsayım; v4.2.0'da değişti (önce 450) |
| `rockHoldMs` | 215 | ms | Taş'ın onaylanması için yumruk tutma süresi; tepkiyle açılan bir el pencereye sığmamalıdır (Bölüm 4.4) | [Woods2015]; v4.2.0'da değişti (önce 250) |
| `lateOpenThreshold` | 0,42 | — | İniş sonrası "açıldı" sayılan ön grup açılması (art arda iki kare) | varsayım; v4.2.0'da değişti (önce 0,35) |
| `minEvidenceFrames` | 2 | kare | Bundan az izlenen karede kinematik revizyon yok | varsayım |
| `inAirWindowMs`, `inAirWindowFrames`, `minInAirTracked` | 220; 3,5; 1 | ms; kare aralığı; kare | EL YOK ölçütü: inişten önceki $\max(220\ \text{ms},\,3{,}5\,\bar\Delta)$ içinde en az bir izlenen kare | varsayım; v4.2.0'da değişti (önce 160; 2,6; 2) |
| `inAirMaxAgeMs`, `inAirMaxAgeFrames` | 95; 2,5 | ms; kare aralığı | Kanıtın tazeliği: son havadaki karenin yaşı en çok $\max(95\ \text{ms},\,2{,}5\,\bar\Delta)$; o karede YZ revizyon adımını tamamlamış ve ön grubu açık okumuşsa bunun 1,65 katı | varsayım; v4.2.0'da değişti (önce 45; 2,2; çarpan yoktu) |
| `latchWindowMs`, `latchWindowFrames`, `latchMinOpening` | 340; 3,5; 0,42 | ms; kare aralığı; — | Hakem yönelimleri: bir grubun yönelimi, son $\max(340\ \text{ms},\,3{,}5\,\bar\Delta)$ içindeki bir revizyon karesinde grubun ham açılması en az 0,42 okunduysa o karedeki değerin altına düşemez; grubun dedektörü o kareden sonra yeniden çapalanmışsa koruma kalkar. YZ her karede bu yönelimlere göre karar verir; aynı pencere, çelişen kareleri saptamak için de kullanılır (Bölüm 4.4, 5.1.8) | pencere v4.2.1'de; kural ve 0,42 eşiği v4.2.3'te (eşik: tarama, 0,25 / 0,32 / 0,42) |
| `arrivedMarginPL`, `arrivedFrac` | 0,04; 0,03 | AB; × genlik | Boşluk sonrası kare, avuç iniş yüksekliğinin bu yakınındaysa iniş karesidir | varsayım; inceleme sonrası |
| `gapRecoveryFrames` | 2 | kare | Bir izleme boşluğundan sonra "boşluk sonrası" işaretlenen izlenen kare sayısı (boşluk: $>1{,}6\,\bar\Delta$) | varsayım; inceleme sonrası |
| `softLandingHoldMs` | 65 | ms | Zayıf bir atış vuruşu, bu süre içinde daha güçlüsü gelmezse iniş kabul edilir | varsayım; v4.2.0'da değişti (önce 90) |
| `armHoldMs`, `armMaxExtension` | 350; 0,45 | ms; — | Tek atış kipinde kurulma: iki grubun ham açıklığı eşiğin altında ve avuç hareketsizken geçen süre | varsayım; v4.2.0'da değişti (önce 350; 0,4) |
| `armedSlideMs`, `armedKeepMs` | 400; 1200 | ms | Tek atış kipinde kurulmuş beklerken ızgaranın kaydırılma aralığı ve tutulan geçmiş | varsayım; inceleme sonrası |
| `armedOpenAbortMs` | 600 | ms | Tek atış kipinde el vuruşsuz bu kadar açık kalırsa iptal | varsayım |
| `singleStrokeTimeoutMs` | 1500 | ms | Tek atış kipinde bitmeyen bir iniş hareketi için iptal süresi | varsayım; inceleme sonrası |
| `metronomeLeadInMs` | 700 | ms | Metronomda ilk vuruştan önceki süre | varsayım |
| `metronomeWindowMs` | 260 | ms | İlan edilen atış anı çevresindeki tolerans | varsayım |
| `metronomePeriodMs` | 600 | ms | Varsayılan metronom dönemi (100 vuruş/dk) | [Repp2005] |
| `noiseFloorSd`, `noiseCapSd` | 0,035; 0,085 | — | Tur içi gürültü kestiriminin sınırları | varsayım; v4.2.0'da değişti (önce 0,035; 0,15) |
| `baselineFrames` | 20 | kare | Yumruk taban çizgisi için en çok örnek sayısı (tek atış kipinde yalnızca kurulma bekleyişinden) | varsayım |
| `fistMaxExtension` | 0,45 | — | YUMRUK YOK eşiği (taban çizgisinde); tek atış kipinde "el açık" eşiği | varsayım |
| `primeStartMaxExtension` | 0,7 | — | Sayım, ilk vuruşta ham açıklık bunun altındaysa başlar (bilerek `fistMaxExtension`'dan gevşek) | varsayım; inceleme sonrası |
| `freezeLeadMs` | 0 | ms | Karar dondurma ufku (0 = kapalı); kaybetmeme öncelikli ön ayarda yok sayılır | deney parametresi (E2) |
| `postureOpenMin`, `postureStableRange` | 0,55; 0,25 | — | Geçersiz turdan kalibrasyon: "açık" sayılan parmak açılması ve oturan şeklin en büyük oynaması | varsayım; inceleme sonrası |
| `handLostMs` | 600 | ms | Bu kadar süre el yoksa tur iptal | varsayım; v4.2.0'da değişti (önce 400) |
| bükülme Kalman'ı | $q=4\times10^{6}$, $r=60$ | °²/s³; °² | Açısal hız göstergesi için süzgeç | varsayım |

### A.7 Davranış kanalı (`core/sequence/*`)

| Ad | Değer | Birim | Anlamı | Kaynak |
|---|---|---|---|---|
| `historyCap` | 4000 | tur | Saklanan ve yeniden oynatılan geçmiş; ötesinde yükleme yalnızca son 4000 turdan kurar | varsayım |
| `rotations` | 3 | — | Uzman başına döndürme sayısı | [Egnor2000] |
| `eta` | 1,0 | — | Logaritmik kayıpta öğrenme hızı (Bayes) | [CesaBianchiLugosi2006] |
| `gamma` | 0,999 | — | Log-ağırlık unutma çarpanı | tarama |
| `share` | 0,002 | — | Sabit-paylaşım oranı ($\alpha$) | [HerbsterWarmuth1998]; varsayım |
| `probFloor` | 0,02 | — | Kayıptaki olasılık tabanı ($p_{\min}$) | varsayım |
| sıklık uzmanı sönümleri | 0,60; 0,85; 0,97; 1,0 | — | Dört sıklık uzmanının sayım sönümü | varsayım |
| tablo uzmanı sönümü | 0,96 (ayna sıklık: 0,9) | — | Sayım sönümü | varsayım |
| en küçük kütle | 0,5 (sıklık uzmanları: 0,9) | sayım | Altında uzman çekimser kalır | varsayım |
| CTW derinlikleri | 6; 5; 3 | — | Hamle, kaydırma ve ortak çift bağlamları. Düğüm sayısı sınırı yoktur; ağaç yapı gereği sınırlıdır (derinlik 6, üç simge için en çok 1093 düğüm) | [Willems1995] + varsayım |
| PPM-C en büyük derece | 6 | — | — | [ClearyWitten1984] + varsayım |
| `OPENING` | 0,3399; 0,3482; 0,3120 | — | İlk atış dağılımı | [Batzilis2019] |
| `SHIFT_AFTER.win` | 0,4245; 0,2932; 0,2823 | — | Kazançtan sonra aynı / üst / alt | [ForderDyson2016] |
| `SHIFT_AFTER.loss` | 0,2146; 0,3913; 0,3941 | — | Kayıptan sonra | [ForderDyson2016] |
| `SHIFT_AFTER.tie` | 0,2928; 0,3732; 0,3340 | — | Beraberlikten sonra | [ForderDyson2016] |

### A.8 Oyuncu modeli (`core/player_model.js`), ölçütler, MindTwin

| Ad | Değer | Birim | Anlamı | Kaynak |
|---|---|---|---|---|
| `leadMeanMs`, `leadSdMs` | 170; 85 | ms | Açılma başlangıcı önceliği önseli | varsayım |
| `durLogMean`, `durLogSd` | ln 130; 0,5 | ln ms | Açılma süresi önseli | varsayım; [Katsuki2015; Li2023] |
| `groupDelayMeanMs`, `groupDelaySdMs` | 15; 40 | ms | Kâğıt'ta arka–ön başlangıç farkı önseli | varsayım |
| `kappa0`, `alpha0` | 4; 3 | sözde-gözlem | Normal–Ters-Gama önsel gücü | [Murphy2007] + varsayım |
| `kappaMax`, `alphaMax` | 40; 21 | — | Sonsalın uyumunu koruyan tavanlar | varsayım |
| `slowRate` | 0,15 | — | Yavaş değişen büyüklükler için üstel ortalama ağırlığı | varsayım |
| `posePseudo` | 5 | sözde-sayım | Şekil şablonu güncelleme önseli | varsayım |
| `bounds.leadMs` | −100 … 700 | ms | Kırpma aralığı | varsayım |
| `bounds.leadSdMs` | 40 … 200 | ms | " (alt sınır inceleme sonrası 25'ten 40'a) | varsayım |
| `bounds.durMs`, `bounds.durLogSd` | 40 … 600; 0,2 … 0,8 | ms; — | " | varsayım |
| `bounds.groupDelayMs`, `…SdMs` | −150 … 250; 15 … 120 | ms | " | varsayım |
| `bounds.thetaFistLong`, `thetaFistThumb`, `thetaOpen` | 120 … 290; 40 … 170; 0 … 80 | ° | " | [BK2024] ile uyumlu varsayım |
| `bounds.poseSd`, `noiseSd` | 0,12 … 0,35; 0,02 … 0,2 | — | " (şablon sapmasının alt sınırı inceleme sonrası 0,08'den 0,12'ye) | varsayım |
| `bounds.descentMs`, `intervalBias` | 60 … 600; −0,4 … 0,6 | ms; — | " | varsayım |
| `CAP`, `BINS` (`metrics.js`) | 400; 10 | tur; kutu | Saklanan dağılım örnekleri; güvenilirlik kutuları | [Naeini2015] (10 kutu, bir standart değil) |
| `horizonMs` (`mindtwin.js`) | 120 | ms | Öngörü ufku | varsayım |
| `q`, `r` (`mindtwin.js`) | 100; 0,0016 | birim²/s³; birim² | Parmak açıklığı Kalman'ı | tarama |
| `deadband` | 1,5 | SS | Hız için yumuşak eşik | tarama |
| `window`, `openThreshold` | 300; 0,5 | değerlendirme; — | Hata penceresi; açık/kapalı eşiği | varsayım |

### A.9 Simülasyon (`sim/kinematic_player.js`) — tamamı varsayım

| Ad | Değer | Birim | Anlamı |
|---|---|---|---|
| `STYLES.early / normal / late` | (260, 60) / (170, 60) / (80, 35) | ms | Başlangıç önceliğinin ortalaması ve sapması |
| `fps`, `primeBeats` | 30; 3 | kare/s; vuruş | Varsayılan düzenek |
| `leadInMs`, `settleMs` | 450; 750 | ms | Tur öncesi ve sonrası süre |
| `periodMs`, `periodCv`, `descentFrac` | 520; 0,05; 0,38 | ms; —; — | Ritim |
| `amplitudeMean`, `amplitudeSd` | 1,6; 0,3 | AB | Vuruş genliği |
| `durMedianMs`, `durLogSd` | 130; 0,35 | ms; — | Açılma süresi |
| `groupDelayMean`, `groupDelaySd` | 15; 20 | ms | Kâğıt'ta arka grup gecikmesi |
| `enslaveMean`, `enslaveSd` | 0,08; 0,04 | — | Makas'ta yüzük/serçe artık açılması |
| `worldNoiseSd`, `imageNoiseSd` | 0,002; 0,003 | m; görüntü yüksekliği | Eklem gürültüsü |
| `palmSize`, `palmX`, `palmTopY`, `aspect` | 0,19; 0,66; 0,36; 4/3 | görüntü yüksekliği; — | Kadraj |
| `timestampJitterMs` | 2 | ms | Zaman damgası titreşimi |
| `neuralMissRate` | 0,05 | — | Jest etiketinin eksik olma olasılığı |
| `perturb` (varsayılan: yok) | — | — | Dedektörle eşleşmeyi bilerek bozan seçenekler (E8, E4'ün gevşek el senaryosu ve bir regresyon testi kullanır): `profile` (minjerk / linear / exponential / cubicIn), `asyncSdMs` (varsayılan 5 ms), `openAmplitude`, `durMedianMs`, `groupDelay`, `noiseRho`, `noiseSpeedGain`, `outlierRate` ve `outlierM` (varsayılan 0,03 m), `palmJitterSd`, `pitchDeg`, `loosen` ve `loosenThrowOnly`, `handCalibration`. E8'de kullanılan değerler Bölüm 6.8'dedir |
| tek atış turunda bekleme | en az 1000 | ms | Tek atış kipinde atıştan önceki sabit yumruk süresi (`leadInMs` ile uzatılabilir) |

### A.10 Platform ve uygulama

| Ad | Değer | Anlamı | Kaynak |
|---|---|---|---|
| MediaPipe Tasks Vision sürümü | 0.10.14; `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/` dizininden `vision_bundle.mjs` ve `wasm/` | El izleme kitaplığı; İçerik Güvenlik İlkesi yalnızca bu dizine izin verir | — |
| Model dosyası sürüm parametresi | `?v=4.0.0` | Bir yıl değişmez önbelleğe alınan model dosyalarının önbelleğini geçersiz kılar | — |
| Kamera duraksama süresi | 4000 ms | Sayfa görünürken bu kadar süre kare gelmezse kamera kaybı bildirilir | varsayım; inceleme sonrası |
| Demo varsayılan tohumu | 20261112 | 20261111–20261510 arasından, açılışı geçerli ve çeşitli olacak biçimde seçilmiştir (Bölüm 5.4.1) | elle seçim |
| Bulut uç noktaları | `POST /rest/v1/rpc/beatter_push_round`, `…/beatter_push_diagnostic` | İsteğe bağlı eşitlemenin iki çağrısı: geçerli turun satırı; hükme bağlanan her turun (faul ve geçersiz turlar dahil) tanılama satırı. Oyuncu modeli gönderilmez, hiçbir şey geri okunmaz (v4.2.0–v4.2.2'de üçüncü bir çağrı modeli geri okuyordu; Bölüm 5.1.8) |
| `MIN_DETECTION_CONFIDENCE`, `MIN_PRESENCE_CONFIDENCE`, `MIN_TRACKING_CONFIDENCE` | 0,12; 0,06; 0,06 | El saptama, varlık ve izleme eşikleri (hareket bulanıklığında, ters ışıkta ve dik bakış açılarında izlemeyi sürdürmek için düşük) | varsayım; v4.2.0'da değişti (önce üçü de 0,28: `MIN_CONFIDENCE`) |
| El izleyici temsilcisi (`delegate`) | önce GPU (WebGL2), kurulamazsa CPU (XNNPACK) | Çıkarımın çalıştığı birim (önceki sıra: önce CPU); kullanılan temsilci kare hızı göstergesinin ipucunda gösterilir. Her kare temsilciyi taşır: izleyici öteki temsilcide yeniden kurulunca gösterge de ona geçer. Geliştirme makinesinde, elsiz 640 × 480 sentetik karelerde kare başına medyan 16,4 ms'ye karşı 47,4 ms; işlemci yükü %91'deyken yinelenen ölçümde 33,2 ms'ye karşı 84,5 ms | ölçüm (Bölüm 5.9) |
| Isınma çıkarımları | 3; 64 × 64 düz gri tuval | Model yüklendikten hemen sonra; GPU gölgelendiricilerinin derlenmesi ilk kamera karelerine düşmez | varsayım |
| `MAX_FAILURES` | 15 | Ardışık çalışma zamanı hatası bu sayıyı aşınca izleyici, öteki temsilciden başlanarak yeniden kurulur | varsayım |
| Kare kopyası ve izleyici girdisi (`app/sources.js`) | uzun kenar en çok 640 px; izleyiciye uzun kenarı en çok 384 px olan bir küçültme | Kamera kaynağı her kareyi bir kez, uzun kenarı en çok 640 piksel olacak biçimde bir tuvale kopyalar (çizer bu kopyayı çizer) ve kopyanın uzun kenarı en çok 384 piksellik bir küçültmesini el izleyiciye verir | varsayım; v4.2.0'da eklendi (önce izleyici de çizer de karenin tam boyutlu kopyasını okuyordu; Bölüm 5.1.7'deki 14,1 ms'lik ölçüm o düzene aittir) |
| Kurtarma denemesi (`app/sources.js`) | elin son izlendiği kareden en çok 110 ms sonra; `contrast(1.42) brightness(0.85)` | El bulunamazsa aynı kare, bu süzgeçten geçirilmiş küçük kopyasıyla izleyiciye bir kez daha verilir: hızlı vuruşta izleyicinin ilgi bölgesinden çıkan ya da parlak bir pencerede kaybolan el, kare atlanmadan yeniden aranır (yalnızca tuval süzgeci olan tarayıcılarda) | varsayım; v4.2.0'da eklendi; ayrı bir ölçüm kaydı yoktur |
| Kamera istemi | 640 × 480, 60 kare/s (ideal) | Kısıt merdiveni | [MediaCapture] |
| `BG_COLS`, `BG_PAD` (`platform/hand_focus.js`) | 32 sütun; 4 hücre | Gizli görüntünün arka planı: kare (`MID_COLS` üzerinden) 32 sütuna küçültülür (satır sayısı en-boy oranından), kenarları kararmasın diye altına gerilmiş bir kopyası konarak her yandan 4 hücre genişletilir ve yumuşatılarak geri büyütülür | varsayım |
| `MID_COLS` | 128 sütun | Küçültmenin ara adımı: kare iki adımda, önce 128, sonra 32 sütuna, yumuşatmayla küçültülür. Yayın öncesi incelemeden sonra eklenen yüksek nitelik ayarı (`imageSmoothingQuality = 'high'`) v4.2.0'da kaldırılmıştır; küçültmenin tek tek pikselleri örneklemek yerine ortalama alıp almadığı artık tarayıcının varsayılan yumuşatma niteliğine bağlıdır ve bu metinde ölçülmemiştir | varsayım; yayın öncesi kamera incelemesinden sonra (Bölüm 5.7); nitelik ayarı v4.2.0'da kaldırıldı |
| `BG_BLUR_CELLS` | 1,6 hücre | Küçültülmüş karenin ek bulanıklaştırması: tuval süzgeci (`ctx.filter`) olan tarayıcılarda süzgeçle, olmayanlarda aynı standart sapmayla JavaScript'te (sonraki satır). Gauss standart sapması kare genişliğinin yaklaşık %5'i (640 piksellik karede ≈ 32 piksel); yüzler, yazılar ve oda yumuşak renk alanlarına dönüşür | varsayım |
| Yedek bulanıklık (`blurRGBA`) | $\sigma=1{,}6$ hücre; çekirdek yarıçapı $\lceil 3\sigma\rceil=5$ hücre | Tuval süzgeci olmayan tarayıcılarda paylı 40 sütunluk ara bellek üzerinde ayrılabilir Gauss bulanıklığı; kenarlarda en yakın piksel kullanılır. Bu tarayıcılarda net bölgenin maskesi yumuşatılmaz, kenarı sert kalır (yalnızca görünüş; bölge aynıdır) | varsayım; yayın öncesi kamera incelemesinden sonra (Bölüm 5.7) |
| `SHAPE.capsule`, `.wrist`, `.feather`, `.minRefPx` | 0,22 × ref; 0,36 × ref; 0,09 × ref; 14 px | Net bölge: 21 kemik boyunca kapsüllerin yarıçapı, bilek diskinin yarıçapı, kenar yumuşatması ve ref'in alt sınırı; avuç çokgeni 0, 1, 2, 5, 9, 13, 17 noktalarıdır. ref (başvuru uzunluğu) = max(avuç boyu (bilekten orta parmağın MCP eklemine), eklem noktalarının sınırlayıcı kutusunun büyük kenarının 0,45 katı, 14 px). Bölgeyi son izlenen karenin ham (yumuşatılmamış) eklem noktaları belirler ve bölge aynı karenin kopyasına çizilir (v4.2.0'dan beri izleme koptuktan sonraki en çok 160 ms'de daha yeni karelere: `DISPLAY_GRACE_MS`, aşağıda); iskelet yumuşatılmış noktalarla çizilir | varsayım |
| Maskenin kenar uzatması | 3 × kenar yumuşatması, en az 3 px | Net bölgenin maskesi tuvalin dışına doğru bu kadar genişletilmiş bir bölgede hesaplanır: sahnenin kenarını geçen el o kenarda da net kalır, kırpılan maskenin kenarında sönmez | varsayım; yayın öncesi kamera incelemesinden sonra (Bölüm 5.7) |
| Maske ölçeği (`platform/hand_focus.js`) | 0,35 (tuval süzgeci olmayan tarayıcılarda 1) | Net bölgenin maskesi bu ölçekte çizilir, kenarı aynı ölçekte $\max(0{,}8\ \text{px},\ 0{,}35\times\text{kenar yumuşatması})$ ile yumuşatılır ve büyütülerek uygulanır (ana iş parçacığındaki maske maliyetini düşürmek için) | varsayım; v4.2.0'da eklendi |
| `DISPLAY_GRACE_MS` (`app/sources.js`) | 160 ms | İzleme koptuğunda, son izlenen karenin iskeleti ve net bölgesi bu süre boyunca yeni karelerin üzerine çizilmeye devam eder (bulanık bir iki karede titremesinler diye); motora giden kare değişmez, el yok olarak gider. Bu süre içinde net bölge elin değil, elin son görüldüğü yerin üstündedir | varsayım; v4.2.0'da eklendi |
| Koruyucu CSS bulanıklığı (`.cam--private .cam__video`) | 28 px | Gizlilik açık olduğu sürece (kamera açılırken ve izleyici yüklenirken, %90 opak yükleme kapısının arkasında da) video öğesinin kendisi de bulanıktır; çizer ham kareyi okur (CSS süzgeçleri `drawImage`'ı etkilemez) ve öğeyi tamamen örter. İlk çizimden önce ya da çizim durursa görünen budur | varsayım |
| `SNAPSHOT_MS` | 50 ms | Depoya anlık görüntü aktarımı (20 Hz) | [Nielsen1993] |
| Hassasiyet çarpanları | 0,6; 0,8; 1; 1,25; 1,5 | Ayarlardaki 1–5 düzeyleri | varsayım |
| Bulut zaman aşımı | 4000 ms | İsteğe bağlı eşitleme | varsayım |
| Yerel kayıt (yalnızca geliştirme barındırıcısında) | `POST /__local_telemetry` → `.local_telemetry/rounds.jsonl`, `latest_session.json` | `localhost` ve yerel ağ adreslerinde her gerçek kamera turunun tam sonucu (izler dahil, el noktaları hariç), her iptal ve oturumun dışa aktarımı yerel sunucuya gönderilir; `serve_web.py` bunları dosyaya yazar (istek başına en çok 8 MB). Eşitleme anahtarından bağımsızdır; dizin depoya alınmaz. Bölüm 5.1.8'deki gerçek kamera kayıtları buradandır | — ; v4.2.0'da eklendi |
| Varsayılan ayarlar | Turnuva; serbest ritim; 3 vuruş; 100 vuruş/dk; hassasiyet 3; gizlilik (yalnızca el net) açık; ses açık; canlı tahmin açık; **bulut kapalı** (yalnızca anahtar açar; v4.2.0–v4.2.2'de tanıtım ekranındaki "Kamerayı aç" düğmesi anahtara dokunulmadan da açıyordu, Bölüm 5.1.8); karar ufku 0 (Turnuva'da etkisiz); seri 5 tur | `DEFAULT_SETTINGS` | [GDPR] (varsayılan olarak koruma) |

---

## Ek B — Testler ve kanıtladıkları

`npm test` → 126 test, 126 başarılı (v4.2.3; bu metnin son denetimindeki iki koşuda toplam süre 15,1 s ve
14,2 s; süre makineye ve o andaki yüke bağlıdır). Test sayısı v4.0'da 113, v4.2.0'da 114 idi (Bölüm
5.1.8). Dokuz dosya; `engine_regressions.test.js` ve `controller_lifecycle.test.js` bağımsız incelemenin
bulguları için yazılmış regresyon testleridir (Bölüm 5.1.6); v4.2'nin denetiminde bulunan kusurların on iki
testi de bu iki dosyadadır (Bölüm 5.1.8). Sonuncusu, `camera_privacy.test.js`, ilk gerçek kamera
denemesinden sonra yüz dedektörünün yerini alan gizli görüntünün tarayıcısız sınanabilen kısmını ve kamera
kaynağını sınar (Bölüm 5.1.7); üç testi, değişikliğin yayından önceki incelemesinde bulunan kusurlar içindir
(Bölüm 5.7). Testlerdeki bütün oyuncular sentetiktir: aşağıdaki tablolarda geçen tur sayıları ve oranlar
**simülasyon** sayılarıdır ve v4.2.3 koduyla yapılan koşudandır.

**`foundation.test.js` (9)**

| Test | Kanıtladığı |
|---|---|
| constants: the game is rock-paper-scissors | Kazanç matrisi ve döngüsel üstünlük; geçersiz hamle kodları hata verir |
| SHA-256: NIST vectors, long input, non-BMP text, async agreement | Kendi SHA-256 gerçeklememiz standart vektörleri ve Web Crypto ile aynı sonucu verir |
| math: numerically careful helpers | Yardımcı işlevler NaN üretmez; Wilson aralığı, binom kuyruğu, en küçük sarsım profili doğru |
| rng: deterministic, roughly uniform and normal; crypto source has the same interface | Tohumlu üreteç yinelenebilir; kriptografik kaynak aynı arayüzü sunar |
| commit log: binding, hiding until reveal, hash chain, tamper evidence | D2 ve D3'ün kayıt düzeyindeki yarısı |
| metrics: every number is what the rounds say | D4: her ölçüt tur sayımlarından yeniden hesaplananla eşit |
| metrics: calibration error is ~0 for a calibrated stream and large for an over-confident one | ECE hesaplaması anlamlı |
| pose: clean and noisy shapes, odd shapes, stability rule, completion time | Nihai şekil kararı ve tamamlanma zamanı |
| MindTwin: the forecast beats persistence on a moving hand and claims nothing on a still one | Öngörü becerisi ölçülür; durağan elde iddia yok |

**`kinematics_stroke.test.js` (9)**

| Test | Kanıtladığı |
|---|---|
| filters: Kalman tracks a ramp, extrapolation variance grows, 1-euro and stats behave | Süzgeçlerin temel doğruluğu |
| kinematics: finger angles are invariant to rotation, scale, translation and mirroring | Bölüm 4.1'deki değişmezlik (200 poz, $10^{-6}$) |
| hand model is the exact inverse of the kinematics: extension round-trips for any pose | Simülasyon elinin çekirdekle tutarlılığı |
| kinematics: noise robustness, V-spread, palm measures, malformed input | Gürültü altında hata; bozuk girdide `null` |
| stroke tracker: counts the priming beats and dates the landing at the true bottom | İniş gerçek dibe tarihlenir (önceki sürümdeki erken tetiklemenin düzeltilmesi) |
| stroke tracker: independent of camera distance; ignores tremor; resets on timeout and lost hand | Ölçek bağımsızlığı ve ritim sıfırlama |
| stroke tracker: period estimate and landing prediction are accurate enough to anchor priors | İniş kestirimi hatası |
| kinematic player: deterministic, monotone timestamps, fist during priming, options behave | Simülatörün kendisi |
| palmSize stays stable when the hand is pointed knuckles-first or sideways at the camera | Avuç boyu, eklemleri kameraya dönük ya da yan duran bir yumrukta da kararlıdır: dört dönmede (Euler açıları 90°/0°/0°, 110°/35°/−20°, 180°/82°/0°, 150°/−65°/30°) önden görülen yumruğun avuç boyunun 0,7–1,35 katı içinde kalır (v4.2.0'da eklendi; avuç boyunun yeni tanımı Bölüm 5.1.8'dedir) |

**`opening_decision.test.js` (18)**

| Test | Kanıtladığı |
|---|---|
| opening: a fist keeps the heading near zero and makes "stay" dominate as landing approaches | Yokluğun kanıtı |
| opening: onset 180 ms before landing is detected at least 80 ms before landing (30 fps) | Erken saptama |
| opening: open-then-close re-anchors the bank | Yeniden çapalama |
| opening: an onset 20 ms before landing is assigned to "late", not "legal" | Geç başlangıç ayrımı |
| opening: heading is independent of evidence() calls and landing estimates (referee independence) | D5: hakem büyüklüğü iniş kestiriminden bağımsız |
| opening: robust to dt = 0, out-of-order samples, non-finite input and huge noise | Sağlamlık |
| opening: clone() is an independent deep copy | Durum yalıtımı |
| measureOpening recovers onset and duration of a minimum-jerk opening | Öğrenmede kullanılan ölçüm |
| decision: fuse() without kinematic evidence returns the prior | Füzyonun sınır durumu |
| decision: structural no-loss fact — two live classes always leave a move that cannot lose | Lemma 1 |
| decision: safety follows the legal set of the referee, not the size of the belief | Yasal küme politikası: inancın neredeyse sıfır kütle verdiği yasal bir sınıf da güvenliği belirler; yasal destek üzerinde düzgün geri düşüş (inceleme: R20, R21, R36) |
| decision: risk-sensitive choice, tie-break order and revision rules | Karar ve revizyon kuralları |
| decision: legal mass follows the referee rule and falls back when everything is foul | Yasal kütle ve üç hamlenin de faul olduğu durum |
| decision: fusion weights move towards the channel that was right and stay bounded | Füzyon öğrenmesi |
| statistical regression: "turnuva" never loses a valid round; fouls stay moderate; decisions are early | 30/60 kare/s ve yüksek gürültüde sıfır kayıp (simülasyon) |
| statistical regression: feints are handled without a loss under "turnuva" | Aldatmacalar ve geç açanlar (simülasyon) |
| statistical regression: "serbest" leaves the human a small legitimate chance | Serbest'te kayıp < %1,5 (simülasyon) |
| performance: observe + heading + evidence stays well under a millisecond per frame | Kare başına süre |

**`sequence.test.js` (16)**

| Test | Kanıtladığı |
|---|---|
| CTW: predictions are exact probabilities (sum to 1) and match a brute-force mixture at depth 1 | CTW gerçeklemesinin doğruluğu; normalize edilmemiş kestirim kütlesi 1'dir (inceleme: R42) |
| CTW learns a second-order deterministic source | Yapı öğrenme |
| PPM-C returns a proper distribution and learns a repeating pattern | PPM-C |
| population prior uses the published tables and rotates the shift by the last move | Önselin yayımlanmış sayılarla eşitliği |
| there are 26 base experts with unique names; all predictions are proper or null | Uzman kümesi |
| mixture: weights stay normalised and finite; sleeping experts keep their relative weight | Karışım |
| sequence model converges on an i.i.d. biased source | Yakınsama |
| sequence model masters deterministic structure (cycle, period-5 pattern) | Döngü ve örüntü |
| sequence model exploits outcome-conditioned play and reports honest numbers | Literatür tablosuna karşı net kazanç |
| Iocaine rotations: a second-guessing player is out-guessed | Döndürmeler |
| no overfitting on a uniform random player: log-loss stays at chance | Gözlem 1 ile tutarlılık |
| follows a player who changes style (fixed-share + forgetting) | Unutma + sabit-paylaşım |
| serialisation: replaying the stored history rebuilds an identical model; bad input is rejected | Kalıcılık |
| every behaviour player kind produces legal moves | Simülasyon oyuncuları |
| safe exploitation: budget arithmetic and the worst-case bound against an oracle | Önerme 1 |
| the anti-predictor really beats a naive best responder (so the safety test is meaningful) | Güvenlik testinin anlamlı olması |

**`round_engine.test.js` (11)**

| Test | Kanıtladığı |
|---|---|
| a clean round: beats, behavioural seal before any finger moves, kinematic revision, landing, verified reveal | Uçtan uca akış; ilk mühür parmaklar açılmadan önce |
| secrecy: nothing the UI can read before the reveal contains the AI move | İfşadan önce arayüzün okuyabildiği hiçbir şey hamleyi içermez |
| honesty invariants hold on thousands of mixed rounds; "turnuva" never loses a valid round | D1–D4, D6 ve sıfır kayıp (1562 geçerli tur; simülasyon) |
| "serbest" keeps losses rare for honest openers | Serbest'te kayıp < %3 |
| referee: late throws are fouls, odd shapes and missing fists are voids, a lost hand aborts | Hakem kuralları |
| I5: the verdict class does not depend on what the AI committed | D5 (inceleme bu testin özdeş koşuları karşılaştırdığını göstermiştir; asıl sınama regresyon dosyasındadır) |
| tampering with a revealed commitment or reordering the chain is detected | Kurcalama saptama |
| modes: two priming beats, single stroke, metronome with a stroke and with a still hand | Kipler |
| a weak throw stroke lands softly and is still judged on pre-landing commitments only | Yumuşak iniş ve D1 |
| learning: onset timing adapts to the player, behaviour is exploited, the model survives a round trip | Öğrenme ve seri hâle getirme |
| robustness and speed: garbage frames are ignored and a frame costs well under 1.5 ms | Bozuk karelere dayanıklılık; kare başına süre |

**`controller.test.js` (6)**

| Test | Kanıtladığı |
|---|---|
| settings are validated field by field | Ayar doğrulama |
| storage: profiles, debounced saves, broken backend falls back to memory | Kalıcılık ve yedek |
| store notifies only when the selected slice changes | Durum deposu |
| demo mode drives the real engine end to end: rounds, series, metrics, no persistence | Demo gerçek motoru sürer ve hiçbir şey saklamaz |
| report flow: a result opens the report, the primary action continues, a full series opens the summary | Rapor ve seri akışı |
| metronome mode and MindTwin mode work through the controller | Kipler |

**`engine_regressions.test.js` (33)** — incelemenin çekirdekte bulduğu kusurlar, incelemeden sonra bulunan delikler ve v4.2'nin denetiminde bulunan kusurlar (Bölüm 5.1.8)

| Test | Kanıtladığı (bulgu) |
|---|---|
| a rebuilt engine on the same commit log continues the round numbering (the game used to die here) | Tur numaraları kayıttaki son turdan sürer; tur ortasında yeniden kurulumda da (R1, R19) |
| turnuva cannot be beaten by opening ring and pinky at the last moment | 384 hüküm, 206 geçerli tur, 0 oyuncu galibiyeti (R20, R36) |
| turnuva cannot be beaten by training the AI on early openings and then opening late | 160 hüküm, 85 geçerli tur, 0 oyuncu galibiyeti; öğrenilen önselin sapma tabanı (R21) |
| a hand that only jitters starts neither strokes nor rounds, at any frame rate | 30/60/120 kare/s, gürültü ×1 ve ×2: sahte iniş yok, hayalet tur yok (R22, R34) |
| stroke tracker: every descent ends as exactly one of bottom / weakBottom / falseStart | İnişin üç sonu |
| single-stroke mode: the fist baseline comes from the hold that armed the round (low frame rates) | 15, 20, 25 kare/s'de YUMRUK YOK yok (R23) |
| single-stroke mode: waiting long before the throw does not blunt the referee; early openers are not aborted | 1,0 s beklemede faul %6,7, 3,5 s beklemede %5,8; erken açanlar iptal edilmez (R24, R25, R35) |
| metronome mode at 120 and 144 fps: a late stroke never gets a post-landing commitment judged | D1 kare sırasına göre; geç gelen vuruşta değerlendirilen mühür inişten öncedir (R26) |
| metronome mode: a frame a few hundredths of a millisecond before the scheduled landing keeps its seal | 400 sahnelenmiş tur; son havadaki karede atılan 121 mührün hiçbiri değerlendirme dışı kalmaz, oyuncu galibiyeti yok (inceleme sonrası bulunan delik; Teorem 1'in 3. adımı) |
| the legal set never holds three throws under turnuva, not even at a heading of exactly one half | Sınır değeri "açık" tarafındadır: yasal küme hiçbir değerde üç sınıf içermez, bir şey yasalken güvenli hamle vardır ve politika onu seçer (Teorem 1'in 1. adımı) |
| the scissors rule: the AI decides against every throw the referee could still accept | Hakemin "net Makas" kuralının kabul edebileceği atışlar (ön grup açıksa Makas, arka grup ne derse desin) YZ'nin yasal kümesine katılır: bu üst küme düz kuralın kabul ettiği her atışı içerir, hiçbir yönelim çiftinde ikiden çok sınıf içermez ve politikanın seçtiği hamle bu kümenin hiçbir atışına kaybetmez (v4.2 denetimi, Bulgu 1; Bölüm 5.1.8) |
| turnuva: a scissors on time with one blurred frame right before the landing is neither fouled nor lost | 20 kare/s'de 60 sahnelenmiş tur: zamanında açılan Makas, son havadaki kare bulanık ve neredeyse kapalı okunuyor. Oyuncu galibiyeti yok; hakemin ön grubu açık tuttuğu turlar (24) geçerlidir ve Makas sayılır; 60 turun 60'ını YZ kazanır (v4.2.2 bu sahnede 24 tur kaybediyordu; Bulgu 1) |
| contradictory in-air frames void the round under a code of its own: never a foul, never a loss | İki sahneleme, 60'ar tur: (a) 20 kare/s'de yumruk, inişten iki kare önce işaret ve orta parmak tek bir karede 0,45 okunuyor; (b) 30 kare/s'de zamanında açılan Makas, son iki havadaki kare bulanık. Hiçbir tur faul ya da oyuncu galibiyeti değildir; çelişen turlar `VOID_CONFLICT` koduyla geçersizdir ve el her karede izlenmiştir (Bulgu 1 ve 5) |
| an on-time PAPER whose last in-air frame is blurred is not fouled for it | Zamanında açılan Kâğıt, son havadaki karede dört parmak da kapalı okunuyor: 30 kare/s'de en az 55, 20 kare/s'de en az 25 tur geçerli; hiçbiri faul ya da oyuncu galibiyeti değil (v4.2.x: 60 turun 59–60'ı faul; Bulgu 5) |
| the report shows the referee headings as they were measured; the clear-scissors rule is a flag | Yüzük ve serçesi öbür ikisiyle kalkıp inişten sonra oturan Makas: beraberlik; raporlanan arka yönelim ölçülen değerdir (0,05 değil) ve kuralın uygulandığı ayrı işaretle bildirilir (D4; Bulgu 5) |
| the release check cannot pass by running nothing: unreadable fuzz arguments are an error | Bulanık sınamanın komut satırı: okunamayan tohum listesi, bilinmeyen seçenek ya da sıfır oturum hata verir; boş bir liste gerçekten hiçbir şey koşmaz (Bulgu 5) |
| an honest PAPER whose ring and little finger lag behind the other two is not fouled for it | İşaret ve orta parmak inişten 260 ms önce açılmaya başlar, yüzük ve serçe 170 ms önce: Turnuva 30 ve 20 kare/s ile Serbest 30 kare/s'de 60'ar turun 60'ı geçerli, hepsini YZ kazanır (v4.2.2'de 58, 26 ve 57 faul; Bulgu 2) |
| the guarantee fuzz finds nothing: the seven sessions that broke v4.2.1, and the first 150 sessions | Bulanık sınamanın v4.2.1'i kıran yedi oturumu (151, 3629, 4391, 5774, 6735, 7979, 9438) ve ilk 150 oturumu her test koşusunda yeniden oynatılır: kayıp, istisna ve kare sırası ihlali yok (Bulgu 1) |
| frames must advance in index as well as in time (frame order is what I1 rests on) | Dizini ilerlemeyen kare atılır ve sonucu değiştirmez; D1'in dayandığı kare sırası iyi tanımlıdır |
| a seal that cannot be made aborts the round; the round is never judged on an older seal | Nonce kaynağı davranış mühründen sonra bozulur: tur `ENGINE_ERROR` ile iptal edilir, gösterilmiş mühür açılır ve doğrulanır; 40 denemede 26 iptal, revizyon gerektirmeyen 14 hüküm, 0 oyuncu galibiyeti; hiçbir istisna motordan çıkmaz (son doğrulamada bulunan delik; Teorem 1'in 2. adımı) |
| frames the commit log could not seal are ignored (index beyond 2^53 - 1, time beyond 2^52 / 10 ms) | Taahhüt kaydının mühürleyemeyeceği kare motora hiç girmez; akışın geri kalanı o kareler hiç gelmemiş gibi sürer |
| only the three named presets are accepted (no inherited object keys) | `constructor`, `toString` gibi kalıtılmış nesne anahtarları ön ayar sayılmaz: yapılandırmada varsayılana (Turnuva) düşülür, `setRules` reddeder |
| a tracking gap over the fast part of the stroke voids the round instead of judging stale or late evidence | Bayat kanıt → EL YOK, asla faul; tek düşen kare hoş görülür (R27) |
| single-stroke mode: a stroke hidden by a dropped frame is void, not a judged behavioural guess | Atış görülmediyse tur geçersizdir (Teorem 1'in 2. adımı; inceleme sonrası bulunan kenar durumu) |
| metronome mode: a stall past the scheduled throw aborts the count-in; arming with the hand away does not | Metronom duraksaması (R15, R30) |
| the decision freeze cannot void the turnuva guarantee (it is ignored there) but acts under serbest | Dondurma ufku (R28) |
| I5: with commitments that really differ, the referee decides the same | D5, gerçekten farklı taahhütlerle (R29) |
| I4: flight statistics count what was measured; undefined quantities are null | D4: izleme oranı, kare hızı, Taş için `null` (R31) |
| I3: an aborted round opens and verifies the seals it had shown | D3: iptal edilen tur (R32) |
| a relaxed open hand is readable, and the sensor calibration adapts even when the first rounds are void | Soğuk başlangıç; geçersiz turlar oyun hakkında hiçbir şey öğretmez (R33, R40) |
| a fist that the default calibration reads as half-open is not locked out: void first, then learned | Sayımın başlama kapısı ve yumruk kalibrasyonu |
| fusion weights: one confident miss cannot outweigh many confident hits | Gradyan kırpma (R41) |
| metrics: unconditional rates count every judged attempt; inconsistent documents are rejected | Koşulsuz oranlar; ölçüt belgesinin tutarlılık denetimi (R37, R44) |

**`controller_lifecycle.test.js` (16)** — incelemenin uygulama katmanında bulduğu kusurlar, sonradan bulunan bir kilitlenme ve v4.2'nin denetiminde bulunan rıza ve şema kusurları (Bölüm 5.1.8)

| Test | Kanıtladığı (bulgu) |
|---|---|
| the game goes on after every kind of engine rebuild (settings, mode, rhythm, memory reset) | Yeniden kurulumdan sonra turlar hükme bağlanmaya devam eder (R1, R19) |
| camera -> demo releases the device; demo -> camera plays on; numbers measured on the camera do not leak into the demo | Aygıtın bırakılması; ölçümlerin kaynağıyla düşmesi; kare → mühür gecikmesi ve duvar saati önceliği kamera turlarında ölçülür, demoda `null`'dır (R2, R7, R8) |
| a demo started while the camera is still starting stays a demo: nothing is stored or uploaded as the real player | Kuşak sayacı (R3) |
| a denied or failed camera start never leaves the device on, and never breaks a running demo | Başarısız başlatma (R3, R5) |
| losing the camera mid-session is reported and stops the round | Kamera kaybı (R17) |
| a finished series accepts no further round until a new series is started | Biten seri (R6) |
| an aborted round clears the live strip; its seal is reported as opened and verified | İptalde canlı şerit ve mühür bildirimi (R10, R32) |
| demo, single-stroke mode: the synthetic player never waits for an engine that is waiting for it | Motor, oyuncunun atışı olmadan kurulduğunda (oyuncu saatin gerisindeyken iptal edilen turdan sonra; bir pencerenin arkasında) sentetik oyuncu yeniden atar; elle sürülen saatle, makinenin yükünden bağımsız (Bölüm 5.1.6) |
| metronome demo: a settings change during the count-in neither stalls the game nor leaves the old count-in sounding | Zamanlayıcılar ve ses iptali (R14) |
| the optional sync is decided in one place: consent, a real player and an allowed host | Bulut kararı (R12) |
| cloud payload: unknown values are null, a prediction is reported only when one was made | Buluta giden satır (R11) |
| sharing is opt-in: only the two switches turn it on, and a stored "on" needs a consent under the current text | `web/js` içinde paylaşım ayarını anahtarın kendi değeri dışında bir değerle yazan çağrı yoktur; v4.2.x'in sakladığı "açık" kapalı okunur ve bir kez bildirilir; açmak rızayı sürümüyle kaydeder; başka sürümün rızası sayılmaz (Bulgu 3) |
| a browser that an earlier version opted in is not synced after the update; the player is told once | Uygulamanın kendi açılış sırasıyla: kayıtlı "açık" ile başlayan tarayıcıda aktarım hiç açılmaz, `CONSENT_RESET` bildirimi bir kez gösterilir (Bulgu 3 ve 5) |
| another profile does not inherit the consent to share | Yeni bir profil oluşturulduğunda ya da başka profile geçildiğinde paylaşım kapanır ve bildirilir (Bulgu 3) |
| the database file opens two write-only calls to the public key, and the client makes no other | `supabase_schema.sql`'de herkese açık role ulaşan bütün GRANT'ler yalnızca iki yazma işlevidir (yazımı ne olursa olsun); her işlev ve tablo için REVOKE ve satır düzeyi güvenlik vardır, ilke yoktur, model yazılmaz; istemci yalnızca bu iki uç noktayı çağırır, gövdede model yoktur, okuyan çağrı yoktur (Bulgu 3) |
| storage: one failed write does not turn the current settings and profile into defaults | Depo aynası (R13) |

**`camera_privacy.test.js` (8)** — yüz dedektörünün yerini alan gizli görüntünün geometrisi, yedek bulanıklığı ve kamera kaynağı (Bölüm 5.1.7, 5.7)

| Test | Kanıtladığı |
|---|---|
| cover mapping: the frame fills the canvas, centred, aspect kept | Görüntünün tuvale `object-fit: cover` izdüşümü (arka plan ve net bölge bununla çizilir): dört tuval–kare boyut çiftinde kare tuvali doldurur, ortalanır, en-boy oranı korunur |
| sharp region: every landmark and every bone lies inside it, with margin, for open hands and fists in any pose | 45 gürültülü sentetik pozda (açık el, yumruk ve Makas şekli × 5 dönüş × 3 konum) net bölge hesaplanır; çizim kutusu her eklem noktasını kapsül yarıçapı payıyla içerir, yani hiçbir kemik kapsülü kırpılmaz; kapsül yarıçapı avuç boyunun 0,22 katından küçük değildir, bilek diski kapsülden geniştir, kenar yumuşatması sıfırdan büyüktür; avuç çokgeni 0, 1, 2, 5, 9, 13, 17 noktalarıdır |
| a fist seen knuckles-first (foreshortened palm) still gets a capsule as wide as its fingers | Eklemleri kameraya dönük yumrukta (avuç kısalmış görünür) başvuru uzunluğu ref, eklem noktalarının sınırlayıcı kutusunun büyük kenarının 0,45 katından ve avuç boyundan küçük değildir: kısalan avuç kapsülü inceltmez |
| malformed landmarks give no sharp region (the whole picture stays defocused) | `null`, 20 noktalık dizi ya da `NaN`, `Infinity`, `undefined` koordinat net bölge üretmez: görüntünün tamamı bulanık kalır |
| camera source: opens without waiting for any face detector, reports the delegate, hands raw landmarks to the painter | Sahte kamera ve sahte izleyiciyle: kamera kaynağı yalnızca el izleyiciyi bekler (bekleme süresi yok; açılış 1 s'nin altında) ve kullanılan temsilciyi (`GPU`) bildirir; her karede motor ve çizer aynı karenin ham eklem noktalarını alır, iskelete giden alan 21 noktalıdır; çıkarım süresi ve kare dizinleri (0, 1, 2) iletilir; her kare temsilciyi taşır ve izleyici akışın ortasında öteki temsilcide (`CPU`) yeniden kurulunca sonraki kare bunu söyler (Bölüm 5.7, kusur vi); DOM olmadığında kare kopyası üretilmez (`picture` `null`'dır); izleyici eli bulamayınca motora giden kare el yok olarak gider, iskelet ve net bölge ise son izlenen karenin noktalarıyla çizilmeyi sürdürür: elin son görüldüğü kareden 33 ms sonra korunurlar, 200 ms sonra kalkarlar (`DISPLAY_GRACE_MS`, Ek A.10; bu kısım v4.2.0'da eklendi) |
| the controller follows a tracker that moved to the other processor (status chip) | Sahte bir kamera kaynağıyla denetleyici: kamera açılınca durumdaki temsilci (kare hızı göstergesinin ipucunun okuduğu alan) `GPU`'dur; `CPU` taşıyan bir kare gelince `CPU`'ya geçer (kusur vi); ipucu temsilciyi Türkçe adlandırır ("işlemci (CPU)", "ekran kartı (GPU)") ve çıkarım süresi yokken süre yazmaz; kopyası olmayan karede `frame().picture` `null`'dır |
| fallback blur (browsers without canvas filters): Gaussian of the requested width, energy kept, edges clamped | Tuval süzgeci olmayan tarayıcılar için JavaScript bulanıklığı (`blurRGBA`; kusur iv): 41 × 41'lik siyah bir ara bellekteki tek parlak piksel $\sigma=1{,}6$ ile bulanıklaştırılınca toplam parlaklık yuvarlama payı içinde (±12) korunur, ağırlık merkezi yerinde kalır (0,05 pikselden az kayma), yatay yayılımın standart sapması 1,6'ya 0,25'ten yakındır, opaklık değişmez; düzgün bir görüntü kenarları dâhil değişmez (kenarlar kararmaz); $\sigma=0$ hiçbir şeyi değiştirmez |
| frame size: a video counts only once it has a frame; a canvas copy by its size | Çizerin kare boyutu yardımcısı (`frameSize`; kusur iii): video öğesi karesi yokken (`readyState` 1) ya da boyutu sıfırken boyut vermez, karesi varken (`readyState` 4) kendi boyutunu verir; tuval kopyası kendi genişlik ve yüksekliğiyle ölçülür; boyutu sıfır olan kopya ya da `null` boyut vermez |

Otomatik testi **olmayan** inceleme bulguları: veritabanı betiği (R4; hiçbir veritabanında çalıştırılmadı;
v4.2.3'ten beri yalnızca herkese açık anahtara verdiği yetkiler dosyanın metninden sınanır, yukarıda),
yüz gizliliğinin durumları ve bulanıklaştırma sırası (R9, R18; kod okuması ve sentetik akışla elle deneme;
bu bulguların konusu olan yüz dedektörü ve çizeri daha sonra kaldırılmıştır, Bölüm 5.1.7), dağıtım
yapılandırması (R16; yayımlanan sitede başlıklar elle denetlendi). Yerine gelen çizerin çizimi tarayıcıda
sentetik bir karede ölçülmüştür (Bölüm 5.8; v4.2.0'ın çizerde ve kamera kaynağında yaptığı değişikliklerden
önce, Ek A.10); geometrisi, yedek bulanıklığı, kare boyutu yardımcısı ve kamera
kaynağının ona verdiği eklem noktaları yukarıdaki `camera_privacy.test.js` ile sınanır. Kamera
değişikliğinin Bölüm 5.7'deki yayın öncesi incelemesinde bulunan altı kusurdan (iv) ve (vi) yukarıdaki
testlerle, (iii) yalnızca kare boyutu yardımcısı yönünden sınanır; (i) gizlilik kapatılınca tuvalin
temizlenmesi, (ii) CSS korumasının kamera açılırken de uygulanması ve (v) maskenin sahne kenarında
genişletilmesi görünüm katmanında ya da tuvale çizimde olduğundan otomatik testleri yoktur.

Teorem 1'in ispatının 1., 2. ve 3. adımlarının dayanakları birer regresyon testine bağlıdır (yukarıda);
4. adımın — hakemin, YZ'nin kararında kullandığı sayıların aynısını okumasının — kendine ait bir testi yoktur
(Bölüm 4.7, 5.7). Testlere ek olarak güvence için bir saldırı bulanık sınaması vardır (`npm run fuzz`;
15 000 oturumluk koşusu Bölüm 6.9'da); v4.2.3'ten beri bu sınamanın v4.2.1'i kıran yedi oturumu ve ilk
150 oturumu test paketinde de koşar (yukarıda).

---

## Ek C — İnsan denekli doğrulama çalışması için protokol

> Bu ek bir **plandır**; uygulanmamıştır ve hiçbir sonuç içermez.

**Amaç ve sorular.** (S1) Gerçek oyunculara karşı, bütün denemeler içinde YZ'nin kazandığı ve sonuçsuz
kalan (faul + geçersiz) paylar nedir? Turnuva ön ayarında geçerli turlardaki kayıp Teorem 1'e göre sıfır
olmalıdır; gözlenen her kayıp gerçeklemede bir kusurun kanıtıdır ve ayrıca incelenir. (S2) Faul ve geçersiz
tur oranlarının oyuncular arası dağılımı nedir; dürüst ve zamanında açılmış atışların ne kadarı haksız yere
faul sayılır? (S3) Karar önceliği (kare zamanına ve duvar saatine göre), kare → mühür gecikmesi, mühür
anındaki oluşum oranı ve "hareketten önce karar" payı gerçekte nedir ve turlarla değişir mi? (S4) Hakemin
iniş ve geç hamle kararları bağımsız bir ölçümle ne kadar örtüşür? (S5) Davranış kanalının tek başına
kazancı gerçek oyuncularda nedir? (S6) Canlı tahmin göstergesi oyuncu davranışını değiştirir mi?

**Katılımcılar.** 18 yaş üstü, her iki elini de kullanabilen yetişkinler. Örneklem büyüklüğü ön
kayıtta güç analiziyle belirlenmelidir; birincil sonuç bir oran olduğundan (S1) planlanan tur sayısı, sıfır
kayıp gözlenmesi durumunda bile üst güven sınırının anlamlı olacağı büyüklükte seçilmelidir (ör. 30
katılımcı × 200 geçerli tur = 6000 tur için sıfır kayıpta %95 Wilson üst sınırı ≈ %0,06). Oyuncular arası
bağımlılık nedeniyle çıkarım oyuncu düzeyinde yapılmalıdır.

**Tasarım.** Denek içi, dengelenmiş sıra: (A) hakem ön ayarı (Turnuva / Serbest), (B) canlı tahmin (açık /
kapalı). Her koşulda 50 geçerli tur; başta 10 turluk alıştırma (analiz dışı). Ayrı bir blokta katılımcıdan
YZ'yi yenmeye çalışması açıkça istenir (aldatmaca ve geç açma serbest) — "yenilmezlik" iddiası için en zorlu
sınama budur. Kamera, ışık ve oturma düzeni sabitlenir; uygulamanın bildirdiği kare hızı kaydedilir. En az
bir alt örneklemde el, en az 240 kare/s'lik ikinci bir kamerayla eşzamanlı çekilir (S4 için altın standart).

**Ölçüler.** Tur başına: hüküm ve türü; oyuncunun ve YZ'nin hamlesi; bütün mühürler (kare zamanı, üretildiği
duvar saati anı, kare, neden, özet, yük, "iniş sonrası" işareti) ve doğrulama sonuçları; inişe (kare zamanı
ve duvar saati) ve tamamlanmaya göre öncelik; kare → mühür gecikmesi; son havadaki karenin yaşı; oluşum
oranı; açılma başlangıcı ve süresi; uçuştaki kare hızı ve izlenen kare payı; ölçüm gürültüsü; hakem
büyüklükleri; mühür anındaki önsel, kinematik olabilirlik ve sonsal; davranış mührünün karşı-olgusal sonucu;
ham izler. Oturum başına: mühür zincirinin dışa aktarımı. Bu büyüklüklerin hepsi motorun tur sonucunda
vardır ve uygulamanın JSON dışa aktarımı, ayarların, oyuncu modelinin, ölçüt özetlerinin ve mühür zincirinin
yanında, sayfa oturumunda hükme bağlanan her turun kaydını içerir (Bölüm 5.5) — **ham izler hariç**: tur
başına örnek izleri (açıklık, avuç yüksekliği, hakem büyüklükleri ve sonsal dizileri) dışa aktarım küçük
kalsın diye bırakılır. S4 için izler gerekiyorsa dışa aktarım genişletilmelidir (tek satırlık bir
değişiklik). Tur kayıtları yalnızca bellekte tutulur; oturum kapanmadan dışa aktarılmalıdır. Yalnızca
uygulama yerel geliştirme sunucusunda (`python serve_web.py`) çalıştırılırsa, v4.2.0'dan beri her gerçek
kamera turunun izler dahil tam sonucu `.local_telemetry/rounds.jsonl` dosyasına kendiliğinden yazılır
(Ek A.10); bu kayıtlar uygulamanın sürümünü taşımadığından çalışma bu yolu kullanacaksa sürüm ayrıca
kaydedilmelidir (Bölüm 5.1.8). Ek olarak kısa bir anket (adillik algısı, mührün ve "kaybetmeme" oranının
ne anlama geldiğine ilişkin anlama soruları).

**Analiz planı (ön kayıtlı).** S1: bütün denemeler üzerinde kazanılan ve sonuçsuz paylar ile geçerli turlarda
kayıp oranı; oyuncu kümelenmesini hesaba katan aralık (ör. oyuncu düzeyinde özyükleme) ve Wilson aralığı
birlikte. S2: faul ve geçersiz oranlarının oyuncu düzeyinde dağılımı; açılma başlangıcı önceliğiyle ilişkisi;
Bölüm 6.8'deki uyumsuzluk aralığıyla karşılaştırma. S3: karar önceliğinin tur bloğuna göre karma etkili
modeli; duvar saati önceliğinin dağılımı ve negatif olduğu turların payı; Bölüm 6.6'daki simülasyon
eğrisiyle karşılaştırma. S4: uygulamanın iniş zamanı ile yüksek
hızlı videodan işaretlenen iniş arasındaki fark; geç hamle kararları için karışıklık matrisi (iki bağımsız
işaretleyici, uyum katsayısı). S5: davranış mührünün karşı-olgusal net kazancı ve şansa karşı kesin binom
testi; dizi modelinin logaritmik kaybı. S6: canlı tahmin açık/kapalı koşullarında hamle dağılımı ve geçiş
olasılıkları. Kalibrasyon: güvenilirlik diyagramı ve ECE. Bütün olumsuz sonuçlar raporlanır; simülasyon
varsayımlarının (açılma tarzı dağılımı, gürültü düzeyi, yörünge biçimi) gerçek veriye uyumu ayrıca sınanır.

**Etik.** Kurumsal etik kurul onayı; yazılı bilgilendirilmiş onam; 6698 sayılı Kanun md. 10 kapsamında
aydınlatma [KVKK6698]. Uygulama kamera görüntüsü saklamaz; yüksek hızlı video çekilecekse bu ayrıca
açıklanır, yalnızca eli kadrajlar, kimliksizleştirilmiş kodla saklanır ve analizden sonra silinir. Katılım
gönüllüdür ve istenildiği an bırakılabilir; bulut eşitleme çalışma boyunca kapalı tutulur. Veri, kimlik
bilgisi içermeyen JSON dosyaları olarak, onam kapsamında paylaşılır.

---

## Ek D — Sözlük (Türkçe – İngilizce)

| Türkçe | İngilizce |
|---|---|
| açıklık / açılma | extension / opening |
| açılma başlangıcı | (opening) onset |
| aldatmaca | feint |
| algılayıcı kalibrasyonu | sensor calibration |
| arka grup (yüzük + serçe) | back group (ring + pinky) |
| ayakta kalan mühür | standing commitment |
| bağlayıcılık / gizleyicilik | binding / hiding |
| beklenen kalibrasyon hatası | expected calibration error (ECE) |
| bilgi kümesi önceliği | information-set lead |
| çekimser (uyuyan) uzman | abstaining (sleeping) expert |
| davranış kanalı | behavioural channel |
| değerlendirilen mühür | judged commitment |
| dondurma ufku | decision freeze (lead) |
| döndürme | rotation |
| duvar saati önceliği | wall-clock lead |
| ekstansör bağlantısı | extensor coupling (enslaving) |
| en küçük sarsım | minimum jerk |
| eşleşmiş simülatör | matched simulator |
| eşleşmiş süzgeç bankası | matched-filter bank |
| faul (geç hamle) | foul (late throw) |
| geçerli / geçersiz tur | valid / void round |
| güvenli hamle | safe move |
| güvenli sömürü | safe exploitation |
| hakem büyüklüğü (yönelim) | heading |
| hazırlık vuruşu | priming beat (prime) |
| ızgara kaydırma | sliding the onset grid |
| ifşa | reveal |
| iniş | landing |
| kanıtın tazeliği | evidence freshness |
| karar önceliği | decision lead |
| kare → mühür gecikmesi | seal latency |
| karşı-olgusal | counterfactual |
| kaybetmeme öncelikli (yasal küme) politika | no-loss (legal-set) policy |
| kesin uygun skorlama kuralı | strictly proper scoring rule |
| kinematik öncelik | kinematic lead |
| koşullu / koşulsuz oran | conditional / unconditional rate |
| kuşak sayacı | generation counter |
| mandal (hakem yönelimlerinde) | latch |
| model uyumsuzluğu | model mismatch |
| mühür / taahhüt | seal / commitment |
| oluşum oranı | progress (at commit) |
| ön grup (işaret + orta) | front group (index + middle) |
| önsel / sonsal | prior / posterior |
| özet zinciri | hash chain |
| sabit-paylaşım | fixed share |
| seçilim yanlılığı | selection bias |
| sonuçsuz deneme | attempt without a result |
| taban çizgisi | (fist) baseline |
| topluluk önseli | population prior |
| uçuş | flight |
| yanlış başlangıç | false start |
| yasal küme | legal set |
| yasal kütle | legal mass |
| yeniden çapalama | re-anchoring |
| yumruk tutma kuralı | rock-hold rule |
| yumuşak iniş | soft landing |
| zayıf dip | weak bottom |
