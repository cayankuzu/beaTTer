# 6. Deneyler ve Sonuçlar

> **Bu bölümdeki sayıların tamamı SİMÜLASYON sonucudur.** Gerçek insanlardan toplanmış hiçbir veri
> içermez. Sayılar, sistemin *belirtilen varsayımlar altında* nasıl davrandığını gösterir; gerçek oyunculara
> karşı başarımın kanıtı değildir. Gerçek insan doğrulaması için protokol Ek C'dedir. Neyin ölçülmediği
> Bölüm 6.9'un sonunda ayrıca listelenmiştir.

## 6.0 Düzenek, varsayımlar ve tabloların okunuşu

Deneyler `node experiments/run_all.mjs` ile yinelenebilir; bütün rastgelelik tohumludur, ham sayılar
`docs/results/*.json`, şekiller `docs/figures/*.svg` dosyalarındadır. Bu bölümdeki her sayı o dosyalardan
alınmıştır; dosyalar, Bölüm 5.1.6'da anlatılan inceleme sonrası kodla yeniden üretilmiştir. Sentetik
oyuncunun ürettiği kareler gerçek kamera kareleriyle aynı motordan geçer.

**Son kodla yeniden üretim.** Sonuç dosyalarını ilk üreten koşudan sonra motorda birkaç değişiklik daha
yapılmıştır: tek atış kipinde görülmeyen vuruşun geçersiz sayılması, sayımın başlama kapısı, "inişten önce"nin
yalnızca kare sırasıyla belirlenmesi, hakem sınamasında sınır değerinin "açık" tarafına alınması,
atılamayan bir mührün turu iptal etmesi (mühürlenemeyen karelerin yok sayılması dâhil) ve kullanılmayan bir
alanın kaldırılması (Bölüm 4.4, 4.7, 5.4). Bunların simüle sonuçları değiştirmediği
varsayılmamış, denetlenmiştir: bütün deneyler bu metnin dayandığı son kodla baştan koşulmuş ve yeniden
üretilen `docs/results/E*.json` ile `docs/figures/*.svg` dosyaları depodakilerle **bayt bayt aynı**
çıkmıştır (18 dosyanın 18'i; karşılaştırma, yeniden üretilen her dosyanın git nesne özeti depodaki
sürümünkiyle eşleştirilerek yapılmıştır). Yani bu bölümdeki her sayı, bugünkü kodun aynı tohumlarla verdiği
sayıdır.

**Tabloların okunuşu.** Tam sistem deneylerinde (E2–E5, E8) iki tür oran yan yana verilir ve farklı şeyleri
ölçer (Bölüm 4.10):

- **Koşullu sütunlar** — G / B / M (YZ galibiyeti / beraberlik / YZ mağlubiyeti) ve "Kayıp %" — paydası
  **geçerli turlar** olan oranlardır. Turnuva ön ayarında bir tur ancak hakem atışı, YZ'nin de okuduğu aynı
  havadaki karelerden kabul ederse geçerlidir; bu yüzden orada M = 0 **kuralın bir özelliğidir** (Teorem 1),
  iyi tahminin kanıtı değildir.
- **Koşulsuz sütunlar** — "Kazanılan deneme %" (YZ'nin kazandığı denemelerin bütün denemelere oranı) ve
  "Sonuçsuz deneme %" (faul + geçersiz + iptal, bütün denemelere oranı) — **sistemi** ölçer: dedektörün her
  hatası buraya düşer. İkisinin toplamının 100'den eksiği beraberlik ve mağlubiyetlerdir.
- "**Açık dürüst atışlarda faul**": yalnızca Taş atışları ile açılması inişten en az 110 ms önce başlamış
  atışlar üzerindeki faul oranı. Kuralın haklı olarak reddettiği geç açılmaları dışarıda bırakır; geriye
  kalan, dedektörün dürüst ve zamanında bir atışı faul sayma oranıdır.

Oranlar %95 Wilson aralığıyla verilir. Karar önceliği sütunlarındaki medyanlar geçerli turlar üzerindendir.

**Varsayımlar** (hiçbiri gerçek oyunculardan ölçülmemiştir):

1. **Parmak açılması en küçük sarsım profilini izler**; süre $\mathrm{LogN}(\ln 130\ \text{ms},\,0{,}35)$,
   $[50,400]$ ms'ye kırpılır. Dedektör de aynı yörünge ailesini varsayar; yani model ile "gerçek" aynı
   aileden gelir. Bu, sonuçları iyimser kılan en önemli varsayımdır.
2. **Açılma tarzları varsayımdır:** başlangıcın inişe göre önceliği erken açanlarda
   $\mathcal N(260,60^2)$, normalde $\mathcal N(170,60^2)$, geç açanlarda $\mathcal N(80,35^2)$ ms (en az 10 ms).
3. **Eklem gürültüsü bağımsız Gauss'tur:** dünya koordinatlarında eksen başına 2 mm, görüntüde 0,003 görüntü
   yüksekliği; kareden kareye bağımsızdır. Hareket bulanıklığı, sistematik sapma, kapanma (oklüzyon) ve
   izleyicinin zamansal ilintili hataları modellenmemiştir.
4. **Ritim:** dönem 520 ms (değişim katsayısı 0,05), inişin dönemdeki payı 0,38, genlik 1,6 avuç boyu;
   zaman damgası titreşimi ±2 ms; kare hızı tam 30 ya da 60'tır (kare düşmesi yalnızca E4'te).
5. **Davranış modelleri:** "humanLike" oyuncusu [ForderDyson2016] tablosunun kişiye göre ±%25 oynatılmış
   hâlini %15 rastgele sapmayla izler; "wsls" tabloyu aynen izler. Sentetik oyuncular **sömürüldüklerinde
   uyum sağlamaz**; gerçek insanlar sağlar (Bölüm 2.1).
6. **Jest etiketi** oturmuş şekillerde %5 olasılıkla eksiktir; Makas'ta yüzük/serçe artık açılması
   $\mathcal N(0{,}08,0{,}04^2)$'tir.
7. **Sentetik el, çekirdeğin tam tersidir:** açık parmaklar tam genliğe açılır ve simülatörün el modeli,
   kinematik modülünün varsayılan kalibrasyonla tam tersidir.

**E1–E7'deki sentetik oyuncu bu varsayımların hepsinde dedektörle eşleşmiştir**; sayıları sistemi en iyi
hâlinde gösterir. 1, 3 ve 7 numaralı varsayımları (ve Kâğıt'taki grup gecikmesini) bilerek bozan deney
E8'dir (Bölüm 6.8).

## 6.1 E1 — Yalnızca davranış kanalı

**Soru.** Kamera hiç kullanılmadan, yalnızca geçmiş hamlelerden ne kadar üstünlük elde edilebilir?
**Düzenek.** On sentetik oyuncu; her biri için 40 tohum × 300 tur = 12 000 tur. Her tohum **iki ayrı kapalı
döngüde** koşulur: birinde YZ dizi modelinin kestirimine deterministik *en iyi yanıtı*, diğerinde Bölüm
4.6'daki bütçeli *güvenli karma* stratejiyi oynar. Her koşuda model, o politikanın gerçekten oynadığı
hamlelerden öğrenir ve sentetik oyuncu o hamlelere tepki verir. (Önceki metinde "en iyi yanıt" sütunu,
güvenli stratejinin sürdüğü tek bir koşunun üzerinde hesaplanan politika-dışı bir karşı-olgusaldı: sonuca
koşullu oyuncular, en iyi yanıtın hiç üretmeyeceği durumlarda puanlanıyordu.) Bilgi kazancı en iyi yanıt
koşusundandır.

| Oyuncu | En iyi yanıt: kazanma % [%95 GA] | Berabere % | Kayıp % | Net/tur | Güvenli karma: kazanma % | Kayıp % | Net/tur | Bilgi kazancı (bit/tur) |
|---|---|---|---|---|---|---|---|---|
| uniform (rastgele) | 33,74 [32,90–34,59] | 33,02 | 33,23 | 0,0051 | 33,33 | 33,43 | −0,0010 | −0,0112 |
| biased (0,40/0,33/0,27) | 34,06 [33,22–34,91] | 33,45 | 32,49 | 0,0157 | 33,34 | 32,67 | 0,0067 | −0,0097 |
| wsls (literatür tablosu) | 36,42 [35,56–37,28] | 34,16 | 29,43 | 0,0699 | 35,21 | 30,74 | 0,0447 | 0,0056 |
| humanLike | 35,82 [34,96–36,68] | 34,40 | 29,78 | 0,0603 | 34,02 | 31,69 | 0,0232 | 0,0051 |
| wslsStrong (karikatür) | 46,11 [45,22–47,00] | 32,84 | 21,05 | 0,2506 | 45,38 | 21,61 | 0,2377 | 0,1562 |
| markov1 | 67,81 [66,97–68,64] | 16,57 | 15,62 | 0,5219 | 67,47 | 16,04 | 0,5142 | 0,3610 |
| cycle (%10 sapma) | 92,38 [91,90–92,84] | 3,95 | 3,67 | 0,8872 | 92,21 | 3,87 | 0,8834 | 1,1102 |
| pattern (5'li örüntü) | 98,00 [97,73–98,24] | 1,00 | 1,00 | 0,9700 | 98,00 | 1,00 | 0,9700 | 1,5095 |
| switcher (40 turda bir tarz) | 51,44 [50,55–52,34] | 25,48 | 23,08 | 0,2836 | 51,19 | 23,52 | 0,2767 | 0,2675 |
| antiPredictor | 96,20 [95,84–96,53] | 2,09 | 1,71 | 0,9449 | 95,51 | 2,25 | 0,9326 | 1,4226 |

![E1](../figures/E1-behaviour-channel.svg)

**Yorum.** (i) Rastgele oyuncuya karşı kazanma oranı şansla uyumludur (%33,74; aralık %33,3'ü içerir) ve
net kazanç sıfıra yakındır (0,0051 ve −0,0010): Gözlem 1'in öngördüğü gibi davranış kanalı burada tasarım
gereği hiçbir şey kazanamaz. Bilgi kazancı hafifçe **negatiftir** (−0,011 bit/tur): öğrenen bir karışım,
öğrenecek bir şey olmadığında küçük bir bedel öder. (ii) Literatürdeki insan tablosuna karşı en iyi yanıtın
net kazancı tur başına 0,07'dir; bu, aynı tablo için Bölüm 2.1'de türetilen 0,13'lük tavanın ve gerçek
öğrencilere karşı bildirilen ≈0,12'nin [WangL2020] altındadır (farkın başlıca nedeni öğrenme maliyeti
olmalıdır). Bireysel farklı ve sapmalı "humanLike" oyuncuda 0,06'dır ve bilgi kazancı pratikte sıfırdır
(0,005 bit/tur). Bu satırlar önselin kendi kaynağına karşı sınanmasıdır (Bölüm 5.6) ve sentetik oyuncu uyum
sağlamaz; gerçek insanlarda daha düşük bir değer beklenmelidir. (iii) **Güvenli karma stratejinin bedeli
zayıf yapıda büyüktür.** "pattern" dışındaki her satırda güvenli strateji en iyi yanıttan az kazanır; güçlü
yapıda fark küçüktür (markov1: 0,522'ye karşı 0,514), insan benzeri oyuncularda ise kazancın önemli bir
bölümü gider (wsls: 0,070'ten 0,045'e; humanLike: 0,060'tan 0,023'e). Bu, Önerme 1'deki sınırın
bedelidir ve ürünle ilgili olan sütun budur: tam sistemde hareketten önce atılan davranış mührü güvenli
stratejinin hamlesidir. (iv) Yüksek satırlar (cycle, pattern, antiPredictor) insan davranışını değil, modelin
güçlü yapıyı öğrenebildiğini ve ikinci-tahmin döndürmelerinin çalıştığını gösterir. "antiPredictor" kendi
geçmişinin deterministik bir işlevidir; bu satır güvenlik mekanizmasını zorlamaz (onu zorlayan, Bölüm
4.6'daki kâhin testidir).

## 6.2 E2 — Erkenlik–doğruluk ödünleşimi

**Soru.** YZ kararını inişten ne kadar önce dondurmak zorunda kalırsa ne kaybeder?
**Düzenek.** **Serbest** ön ayarı, normal açanlar, "humanLike" davranış; dondurma ufku
$\Delta_{\text{don}}\in\{0,40,\dots,250\}$ ms; hücre başına 8 tohum × 120 = 960 deneme. Hiçbir hücrede
geçersiz ya da iptal edilen deneme yoktur; sonuçsuz denemelerin tamamı fauldür.

**Neden Serbest?** Önceki metinde bu deney Turnuva altında yapılmıştı; o gerçeklemede dondurma ufku
Turnuva'da da etkiliydi. Bağımsız inceleme bunun bir kusur olduğunu göstermiştir: hakem eli son havadaki
kareye kadar okurken daha erken bakmayı bırakan bir YZ, yasal bir hamleye kaybeder ve kullanıcıya açık bir
ayar Turnuva güvencesini sessizce geçersiz kılar (Bölüm 5.1.6). Bugün dondurma ufku kaybetmeme öncelikli ön
ayarda **yok sayılır** (regresyon testi: 200 ms'lik dondurmayla Turnuva'da 220 denemede sıfır kayıp), bu
yüzden eğri ancak risk duyarlı bir ön ayarda ölçülebilir. Sorunun anlamı değişmemiştir.

| Kare/s | $\Delta_{\text{don}}$ (ms) | Geçerli $n$ | Kazanma % | Berabere % | Kayıp % [%95 GA] | Kazanılan deneme % | Sonuçsuz deneme % | Medyan öncelik (ms) | Oluşum oranı |
|---|---|---|---|---|---|---|---|---|---|
| 30 | 0 | 924 | 99,35 | 0,43 | 0,22 [0,06–0,79] | 95,63 | 3,75 | 167 | 0,453 |
| 30 | 40 | 914 | 97,05 | 0,98 | 1,97 [1,25–3,09] | 92,40 | 4,79 | 167 | 0,405 |
| 30 | 80 | 900 | 80,44 | 6,44 | 13,11 [11,06–15,47] | 75,42 | 6,25 | 264 | 0,316 |
| 30 | 120 | 909 | 66,12 | 13,75 | 20,13 [17,65–22,86] | 62,60 | 5,31 | 434 | 0,219 |
| 30 | 160 | 907 | 47,19 | 22,16 | 30,65 [27,74–33,73] | 44,58 | 5,52 | 465 | 0,099 |
| 30 | 200 | 907 | 36,05 | 25,36 | 38,59 [35,48–41,80] | 34,06 | 5,52 | 466 | 0,041 |
| 30 | 250 | 913 | 34,06 | 28,92 | 37,02 [33,95–40,20] | 32,40 | 4,90 | 467 | 0,010 |
| 60 | 0 | 921 | 99,78 | 0,22 | 0,00 [0,00–0,42] | 95,73 | 4,06 | 151 | 0,345 |
| 60 | 40 | 914 | 94,42 | 1,86 | 3,72 [2,67–5,15] | 89,90 | 4,79 | 167 | 0,318 |
| 60 | 80 | 923 | 80,61 | 6,07 | 13,33 [11,28–15,67] | 77,50 | 3,85 | 214 | 0,247 |
| 60 | 120 | 910 | 62,64 | 14,18 | 23,19 [20,56–26,04] | 59,38 | 5,21 | 482 | 0,159 |
| 60 | 160 | 920 | 45,33 | 22,72 | 31,96 [29,02–35,04] | 43,44 | 4,17 | 484 | 0,073 |
| 60 | 200 | 926 | 35,75 | 27,43 | 36,83 [33,78–39,98] | 34,48 | 3,54 | 497 | 0,024 |
| 60 | 250 | 928 | 33,62 | 29,31 | 37,07 [34,02–40,22] | 32,50 | 3,33 | 499 | 0,012 |

![E2](../figures/E2-earliness-accuracy.svg)

**Yorum.** Bu, tezin en önemli dürüstlük sonuçlarından biridir: **kinematik kanalın değeri son
karelerdedir.** Dondurma olmadan Serbest'te kayıp %0–0,2'dir. Son 40 ms'de revizyon yasaklandığında kayıp
oranı %2,0 (30 kare/s) ve %3,7'ye (60 kare/s), 80 ms'de %13'e, 120 ms'de %20–23'e çıkar; 200–250 ms'de
sistem şans düzeyindedir (kazanma %34–36, kayıp %37–39) ve kayıp oranı kazanma oranını hafifçe aşar: erken,
zayıf kinematik kanıtla dondurulan karar davranış önselinden iyi değildir. Koşulsuz ölçü aynı şeyi söyler:
kazanılan deneme payı %96'dan %32'ye düşer. Medyan önceliğin 167/151 ms'den 465–499 ms'ye sıçraması
"daha erken karar" değildir; mührün hiç revize edilemediği, yani uçuş başındaki davranış mührünün ayakta
kaldığı anlamına gelir. Simüle oyuncuların açılması ortalama 170 ms önce başladığı için bu beklenen bir
sonuçtur: hareket başlamadan önce hareketten bilgi alınamaz. 60 kare/s aynı dondurma ufkunda 30 kare/s'den
daha iyi değildir (80 ms'de %13,3'e karşı %13,1; 40 ms'de %3,7'ye karşı %2,0).

## 6.3 E3 — Tam sistem: ön ayar × açılma tarzı × kare hızı

**Soru.** İki kanal ve hakem birlikte çalıştığında kayıp, sonuçsuz deneme payı ve karar önceliği nedir?
**Düzenek.** Üç ön ayar × üç tarz × iki kare hızı; hücre başına 8 tohum × 150 = 1200 deneme; "humanLike"
davranış. Hiçbir hücrede iptal ya da geçersiz tur olmamıştır; sonuçsuz denemelerin tamamı fauldür. Taş
atışları hiçbir hücrede faul sayılmamıştır.

*Sonuçlar — koşullu (G / B / M, Kayıp) ve koşulsuz (Kazanılan, Sonuçsuz) oranlar:*

| Ön ayar | Tarz | Kare/s | Geçerli $n$ | G / B / M | Kayıp % [%95 GA] | Kazanılan deneme % [%95 GA] | Sonuçsuz deneme % [%95 GA] |
|---|---|---|---|---|---|---|---|
| Turnuva | erken | 30 | 1198 | 1197 / 1 / 0 | 0,00 [0,00–0,32] | 99,75 [99,27–99,91] | 0,17 [0,05–0,61] |
| Turnuva | erken | 60 | 1195 | 1192 / 3 / 0 | 0,00 [0,00–0,32] | 99,33 [98,69–99,66] | 0,42 [0,18–0,97] |
| Turnuva | normal | 30 | 1137 | 1134 / 3 / 0 | 0,00 [0,00–0,34] | 94,50 [93,06–95,65] | 5,25 [4,12–6,66] |
| Turnuva | normal | 60 | 1138 | 1135 / 3 / 0 | 0,00 [0,00–0,34] | 94,58 [93,15–95,73] | 5,17 [4,05–6,57] |
| Turnuva | geç | 30 | 777 | 777 / 0 / 0 | 0,00 [0,00–0,49] | 64,75 [62,00–67,40] | 35,25 [32,60–38,00] |
| Turnuva | geç | 60 | 821 | 820 / 1 / 0 | 0,00 [0,00–0,47] | 68,33 [65,65–70,90] | 31,58 [29,02–34,27] |
| Standart | erken | 30 | 1198 | 1198 / 0 / 0 | 0,00 [0,00–0,32] | 99,83 [99,39–99,95] | 0,17 [0,05–0,61] |
| Standart | erken | 60 | 1195 | 1193 / 2 / 0 | 0,00 [0,00–0,32] | 99,42 [98,80–99,72] | 0,42 [0,18–0,97] |
| Standart | normal | 30 | 1141 | 1138 / 3 / 0 | 0,00 [0,00–0,34] | 94,83 [93,43–95,95] | 4,92 [3,83–6,29] |
| Standart | normal | 60 | 1142 | 1139 / 3 / 0 | 0,00 [0,00–0,34] | 94,92 [93,52–96,02] | 4,83 [3,76–6,20] |
| Standart | geç | 30 | 774 | 773 / 1 / 0 | 0,00 [0,00–0,49] | 64,42 [61,67–67,08] | 35,50 [32,84–38,25] |
| Standart | geç | 60 | 846 | 844 / 2 / 0 | 0,00 [0,00–0,45] | 70,33 [67,69–72,85] | 29,50 [26,99–32,14] |
| Serbest | erken | 30 | 1198 | 1198 / 0 / 0 | 0,00 [0,00–0,32] | 99,83 [99,39–99,95] | 0,17 [0,05–0,61] |
| Serbest | erken | 60 | 1195 | 1193 / 2 / 0 | 0,00 [0,00–0,32] | 99,42 [98,80–99,72] | 0,42 [0,18–0,97] |
| Serbest | normal | 30 | 1146 | 1137 / 6 / 3 | 0,26 [0,09–0,77] | 94,75 [93,34–95,88] | 4,50 [3,47–5,83] |
| Serbest | normal | 60 | 1143 | 1136 / 4 / 3 | 0,26 [0,09–0,77] | 94,67 [93,25–95,80] | 4,75 [3,68–6,10] |
| Serbest | geç | 30 | 835 | 831 / 4 / 0 | 0,00 [0,00–0,46] | 69,25 [66,58–71,80] | 30,42 [27,88–33,08] |
| Serbest | geç | 60 | 876 | 870 / 6 / 0 | 0,00 [0,00–0,44] | 72,50 [69,90–74,95] | 27,00 [24,56–29,58] |

*Zamanlama ve faullerin dökümü:*

| Ön ayar | Tarz | Kare/s | Öncelik medyanı [Ç1–Ç3] (ms) | Kinematik öncelik medyanı (ms) | Tamamlanmaya öncelik (ms) | Oluşum oranı | Revize edilmeyen % | Faul %: Kâğıt / Makas atışları | Açık dürüst atışlarda faul % |
|---|---|---|---|---|---|---|---|---|---|
| Turnuva | erken | 30 | 235 [167–435] | 232 | 34 | 0,514 | 11,77 | 0,50 / 0,00 | 0,08 |
| Turnuva | erken | 60 | 234 [168–482] | 218 | 35 | 0,398 | 11,72 | 1,22 / 0,00 | 0,17 |
| Turnuva | normal | 30 | 166 [99–465] | 134 | 34 | 0,517 | 12,05 | 10,20 / 5,73 | 0,55 |
| Turnuva | normal | 60 | 165 [98–483] | 135 | 34 | 0,391 | 13,18 | 10,32 / 5,26 | 0,47 |
| Turnuva | geç | 30 | 102 [35–469] | 67 | 34 | 0,494 | 23,17 | 57,07 / 46,42 | 2,00 |
| Turnuva | geç | 60 | 84 [36–499] | 66 | 33 | 0,382 | 17,78 | 53,05 / 38,44 | 0,88 |
| Standart | erken | 30 | 236 [168–436] | 233 | 34 | 0,478 | 11,85 | 0,50 / 0,00 | 0,08 |
| Standart | erken | 60 | 234 [169–482] | 218 | 36 | 0,373 | 11,55 | 1,22 / 0,00 | 0,17 |
| Standart | normal | 30 | 166 [99–464] | 135 | 34 | 0,473 | 12,01 | 10,75 / 4,09 | 0,46 |
| Standart | normal | 60 | 166 [99–483] | 136 | 35 | 0,366 | 13,31 | 9,56 / 4,99 | 0,37 |
| Standart | geç | 30 | 100 [35–498] | 66 | 33 | 0,476 | 23,00 | 56,74 / 44,60 | 1,33 |
| Standart | geç | 60 | 83 [35–499] | 65 | 34 | 0,353 | 16,78 | 48,89 / 37,68 | 0,18 |
| Serbest | erken | 30 | 236 [168–435] | 233 | 34 | 0,445 | 11,69 | 0,50 / 0,00 | 0,08 |
| Serbest | erken | 60 | 235 [180–482] | 219 | 47 | 0,353 | 11,55 | 1,22 / 0,00 | 0,17 |
| Serbest | normal | 30 | 166 [99–465] | 134 | 34 | 0,442 | 12,91 | 9,41 / 4,07 | 0,28 |
| Serbest | normal | 60 | 165 [92–482] | 135 | 37 | 0,348 | 13,12 | 9,05 / 5,06 | 0,37 |
| Serbest | geç | 30 | 99 [35–468] | 67 | 34 | 0,414 | 18,80 | 52,34 / 35,43 | 0,74 |
| Serbest | geç | 60 | 69 [33–485] | 65 | 35 | 0,322 | 11,87 | 45,88 / 31,54 | 0,72 |

"Revize edilmeyen": hareketten önce atılan davranış mührünün hiç değişmediği geçerli turların payı.
"Kinematik öncelik": yalnızca değerlendirilen mührü el okunarak atılmış geçerli turlardaki öncelik.
"Tamamlanmaya öncelik" yalnızca Kâğıt ve Makas turlarında tanımlıdır.

![E3 kazanılan denemeler](../figures/E3-attempts.svg)
![E3 fauller](../figures/E3-fouls.svg)
![E3 öncelik](../figures/E3-lead.svg)

**Yorum — kuralın sonucu.** Turnuva ön ayarının altı hücresinde toplam 6266 geçerli turda kayıp yoktur
(11 beraberlik; hücre başına üst güven sınırı %0,32–%0,49). Bütün mühürler ve oturum zincirleri
doğrulanmıştır. Bu satır Teorem 1'in simülasyondaki karşılığıdır; dedektörün ne kadar iyi olduğunu söylemez.

**Yorum — sistemin ölçüsü.**

1. **Bedel sonuçsuz denemelerdir ve geç açanlarda yüksektir.** Turnuva'da YZ, erken açanlara karşı
   denemelerin %99,3–99,8'ini, normal açanlara karşı %94,5–94,6'sını, geç açanlara karşı yalnızca
   **%64,8–68,3**'ünü kazanır. Geri kalanın neredeyse tamamı fauldür: açılması inişten ortalama 80 ms önce
   başlayan bir oyuncunun yaklaşık üç atışından biri (30 kare/s'de %35,25 [32,60–38,00]) tekrarlanır. Böyle
   bir oyuncu için oyun deneyimi kabul edilemez olabilir.
2. **Fauller ağırlıkla geç açılmalardır; dedektörün açık atışlardaki hatası küçüktür — eşleşmiş
   simülatörde.** Normal açanlarda Kâğıt atışlarının yaklaşık %10'u (%9,05–10,75), Makas atışlarının %4–6'sı
   (%4,07–5,73) faul sayılır (Kâğıt'ta iki grubun da açıldığının görülmesi gerekir). Açılması inişten en az
   110 ms önce başlamış dürüst atışlarda faul oranı ise normal açanlarda %0,28–0,55, geç açanlarda en çok
   %2,0'dır. Bu ayrım yalnızca sentetik el dedektörün varsayımlarına uyduğu sürece geçerlidir; uyumsuzlukta
   açık atışlardaki faulün %17,5'e kadar çıktığı Bölüm 6.8'de gösterilmiştir.
3. **Ön ayarlar simülasyonda beklenenden az ayrışır.** Serbest ön ayarı normal açanlarda sonuçsuz payı
   %5,25'ten %4,50'ye indirir (aralıklar örtüşür), geç açanlarda %35'ten %30'a. Karşılığında insana
   bıraktığı pay çok küçüktür: Serbest'te normal açanlarda 1146 ve 1143 geçerli turda 3'er kayıp (%0,26
   [0,09–0,77]); Standart'ın altı hücresinde hiç kayıp yoktur. Yani "sıkılık–faul" ödünleşimi vardır ama
   zayıftır: faullerin çoğu, her ön ayarın cezalandırdığı gerçekten geç açılmalardan gelir.
4. **Karar "hareket başlamadan önce" değil, çoğunlukla "hareket oluşurken" verilir.** Değerlendirilen mühür
   anında nihai şeklin ortalama yarıya yakını (30 kare/s'de 0,41–0,52; 60 kare/s'de 0,32–0,40) oluşmuştur ve
   mühür, şeklin tamamlanmasından medyanda yalnızca 33–37 ms (30 kare/s'de bir kare) öncedir (bir hücrede
   47 ms). Hareketten önceki mührün hiç değişmediği turların payı %12–23'tür; bunlar davranış kanalının
   haklı çıktığı turlardır.
5. **Karar önceliğini oyuncu belirler.** Medyan öncelik erken açanlarda 234–236, normalde 165–166, geç
   açanlarda 69–102 ms'dir; dağılım iki tepelidir (çeyrekler 33–499 ms): revize edilmeyen turlarda öncelik
   bütün uçuş süresidir (≈450–500 ms), revize edilenlerde son revizyonla iniş arasındaki birkaç karedir.
   İkinci tepeyi **kinematik öncelik** gösterir: el okunarak verilen kararların medyan önceliği erken
   açanlarda 218–233, normalde 134–136, geç açanlarda yalnızca **65–67 ms**'dir (30 kare/s'de iki kare).
   30 kare/s'de öncelikler 33 ms'nin katlarına kümelenir (kare nicemlemesi).
6. **60 kare/s karar önceliğini artırmaz**; mühür anındaki oluşum oranını düşürür (daha az oluşmuş şekille
   karar) ve geç açanlarda sonuçsuz payı birkaç puan azaltır (Turnuva: %35,3'ten %31,6'ya).

Bu deneyde ölçülen öncelikler **bilgi kümesi** öncelikleridir (kare zamanı). Duvar saati önceliği
simülasyonda tanımsızdır; gerçek bir kamerada kare → mühür gecikmesi kadar daha kısadır (Bölüm 4.10, 8.2).

## 6.4 E4 — Aldatmacalar, geç hamleler ve alternatif tur yapıları

**Düzenek.** On dört senaryo × iki ön ayar; hücre başına 6 tohum × 120 = 720 deneme. Aldatmaca: el havada
bir şekle açılır, inişten belirtilen süre önce başka bir şekle geçer (geçiş 90–120 ms). Son dört senaryo
bağımsız incelemeden sonra eklenmiştir: tek atış kipinde uzun bekleme, tek atış kipinde 60 kare/s,
incelemenin Turnuva'ya karşı kullandığı "önce Makas, sonra son anda yüzük ve serçe" saldırısı ve parmakları
tam açılmayan gevşek bir el.

*Turnuva:*

| Senaryo | Geçerli $n$ | G / B / M | Kayıp % [%95 GA] | Kazanılan deneme % | Sonuçsuz deneme % | Faul | Geçersiz | İptal | Öncelik medyanı (ms) | Tamamlanmaya öncelik (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| Aldatmaca Kâğıt→Taş, 150 ms önce | 633 | 633 / 0 / 0 | 0,00 [0,00–0,60] | 87,92 | 12,08 | 87 | 0 | 0 | 33 | — |
| Aldatmaca Makas→Kâğıt, 110 ms önce | 720 | 720 / 0 / 0 | 0,00 [0,00–0,53] | 100,00 | 0,00 | 0 | 0 | 0 | 67 | 33 |
| Aldatmaca Kâğıt→Makas, 150 ms önce | 510 | 508 / 2 / 0 | 0,00 [0,00–0,75] | 70,56 | 29,17 | 210 | 0 | 0 | 33 | −35 |
| Aldatmaca Makas→Kâğıt, çok geç (60 ms) | 474 | 474 / 0 / 0 | 0,00 [0,00–0,80] | 65,83 | 34,17 | 246 | 0 | 0 | 33 | 33 |
| Geç hamle: inişten 100 ms sonra açılma | 4 | 4 / 0 / 0 | 0,00 [0,00–48,99] | 0,56 | 99,44 | 716 | 0 | 0 | 516 | — |
| İzleme kayıpları (karelerin %15'i) | 254 | 254 / 0 / 0 | 0,00 [0,00–1,49] | 35,28 | 64,72 | 36 | 294 | 136 | 165 | 33 |
| Sol el | 681 | 681 / 0 / 0 | 0,00 [0,00–0,56] | 94,58 | 5,42 | 39 | 0 | 0 | 167 | 34 |
| Zayıf atış vuruşu (yumuşak iniş) | 675 | 675 / 0 / 0 | 0,00 [0,00–0,57] | 93,75 | 6,25 | 45 | 0 | 0 | 166 | 34 |
| İki hazırlık vuruşu | 679 | 679 / 0 / 0 | 0,00 [0,00–0,56] | 94,31 | 5,69 | 41 | 0 | 0 | 166 | 34 |
| Tek atış | 685 | 685 / 0 / 0 | 0,00 [0,00–0,56] | 95,14 | 4,86 | 35 | 0 | 0 | 134 | 34 |
| Tek atış, atıştan önce 3,5 s bekleme | 681 | 680 / 1 / 0 | 0,00 [0,00–0,56] | 94,44 | 5,42 | 39 | 0 | 0 | 134 | 34 |
| Tek atış, 60 kare/s | 670 | 670 / 0 / 0 | 0,00 [0,00–0,57] | 93,06 | 6,94 | 50 | 0 | 0 | 133 | 34 |
| Önce Makas, yüzük + serçe inişten 60 ms önce | 319 | 319 / 0 / 0 | 0,00 [0,00–1,19] | 44,31 | 55,69 | 401 | 0 | 0 | 33 | 34 |
| Gevşek açık el (parmaklar %75'te) | 661 | 659 / 2 / 0 | 0,00 [0,00–0,58] | 91,53 | 8,19 | 53 | 6 | 0 | 136 | 33 |

*Serbest:*

| Senaryo | Geçerli $n$ | G / B / M | Kayıp % [%95 GA] | Kazanılan deneme % | Sonuçsuz deneme % | Faul | Geçersiz | İptal | Öncelik medyanı (ms) | Tamamlanmaya öncelik (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| Aldatmaca Kâğıt→Taş, 150 ms önce | 633 | 633 / 0 / 0 | 0,00 [0,00–0,60] | 87,92 | 12,08 | 87 | 0 | 0 | 34 | — |
| Aldatmaca Makas→Kâğıt, 110 ms önce | 720 | 720 / 0 / 0 | 0,00 [0,00–0,53] | 100,00 | 0,00 | 0 | 0 | 0 | 67 | 33 |
| Aldatmaca Kâğıt→Makas, 150 ms önce | 511 | 510 / 1 / 0 | 0,00 [0,00–0,75] | 70,83 | 29,03 | 209 | 0 | 0 | 33 | −35 |
| Aldatmaca Makas→Kâğıt, çok geç (60 ms) | 532 | 532 / 0 / 0 | 0,00 [0,00–0,72] | 73,89 | 26,11 | 188 | 0 | 0 | 33 | 33 |
| Geç hamle: inişten 100 ms sonra açılma | 4 | 4 / 0 / 0 | 0,00 [0,00–48,99] | 0,56 | 99,44 | 716 | 0 | 0 | 516 | — |
| İzleme kayıpları (karelerin %15'i) | 262 | 261 / 1 / 0 | 0,00 [0,00–1,45] | 36,25 | 63,61 | 33 | 297 | 128 | 151 | 34 |
| Sol el | 689 | 688 / 0 / 1 | 0,15 [0,03–0,82] | 95,56 | 4,31 | 31 | 0 | 0 | 168 | 35 |
| Zayıf atış vuruşu (yumuşak iniş) | 686 | 684 / 2 / 0 | 0,00 [0,00–0,56] | 95,00 | 4,72 | 34 | 0 | 0 | 167 | 35 |
| İki hazırlık vuruşu | 685 | 683 / 2 / 0 | 0,00 [0,00–0,56] | 94,86 | 4,86 | 35 | 0 | 0 | 166 | 34 |
| Tek atış | 692 | 688 / 4 / 0 | 0,00 [0,00–0,55] | 95,56 | 3,89 | 28 | 0 | 0 | 134 | 34 |
| Tek atış, atıştan önce 3,5 s bekleme | 681 | 680 / 1 / 0 | 0,00 [0,00–0,56] | 94,44 | 5,42 | 39 | 0 | 0 | 134 | 34 |
| Tek atış, 60 kare/s | 684 | 678 / 3 / 3 | 0,44 [0,15–1,28] | 94,17 | 5,00 | 36 | 0 | 0 | 133 | 36 |
| Önce Makas, yüzük + serçe inişten 60 ms önce | 413 | 408 / 0 / 5 | 1,21 [0,52–2,80] | 56,67 | 42,64 | 307 | 0 | 0 | 34 | 35 |
| Gevşek açık el (parmaklar %75'te) | 671 | 663 / 8 / 0 | 0,00 [0,00–0,57] | 92,08 | 6,81 | 43 | 6 | 0 | 137 | 34 |

"Tamamlanmaya öncelik" Taş ile biten senaryolarda tanımsızdır (—).

**Yorum.** (i) Havada tamamlanan aldatmacalar Turnuva'da kayıp üretmez, ancak karar önceliğini **bir iki
kareye** (33–67 ms) indirir: aldatan bir oyuncuya karşı YZ son ana kadar bekler. Kâğıt→Makas senaryosunda
mühür, şeklin tamamlandığı andan sonradır (tamamlanmaya göre öncelik −35 ms); bu, D1'i ihlal etmez (mühür
inişten öncedir) ama "tamamlanmadan önce karar" ölçütünün aldatmaca altında sağlanmadığını gösterir. (ii)
Geç aldatmacalar yüksek faul üretir (Turnuva'da denemelerin %29–34'ü, Serbest'te %26–29'u): son havadaki
karede okunan açılma, inen şekille bağdaşmaz. Faullerin türlere göre dökümü sonuç dosyasında yoktur. (iii) İnişten sonra açılan hamlelerin 720'de 716'sı (%99,44) faul sayılmıştır; 4'ünü hakem
kaçırmıştır (bunlar geçerli sayılmış ve YZ dördünü de kazanmıştır). (iv) **Kare kayıpları kayıp üretmez ama
tur verimini çökertir:** karelerin taban olarak %15'i düştüğünde 720 denemenin yalnızca 254'ü (%35) geçerli
bir tura dönüşür; 294'ü EL YOK ile geçersiz, 136'sı iptal, 36'sı fauldür. Tazelik kuralı (Bölüm 4.4)
tutucudur: kanıt bayatsa hüküm vermez. Bu, gerçek bir izleyicinin hızlı vuruşlarda eli ne sıklıkla
kaybettiğine bağlı olarak ürünün kullanılabilirliğini belirleyebilecek bir sayıdır ve gerçekte
ölçülmemiştir. (v) **Tek atış kipi** inceleme sonrasında hazırlık vuruşlu kiplerle aynı düzeydedir: sonuçsuz
pay %4,9; atıştan önce 3,5 s beklendiğinde %5,4; 60 kare/s'de %6,9; hiçbir deneme iptal edilmemiş ya da
hükümsüz kalmamıştır. Bu kipte medyan öncelik (134 ms) kinematik önceliğin medyanına (132 ms) yakındır;
oyuncunun bekleme süresi yalnızca davranış mührünün hiç revize edilmediği turların önceliğine eklenir.
(vi) **"Önce Makas, sonra yüzük ve serçe" saldırısı** Turnuva'da tek bir kayıp üretmez; bedeli faullerdir: 720 denemenin 401'i (%55,7) geç hamle sayılır, çünkü
arka grubun açılması havada ölçülebilir hâle gelmemiştir. Serbest'te aynı saldırı insana gerçek bir pay
bırakır: 413 geçerli turda 5 kayıp (%1,21 [0,52–2,80]). (vii) Parmakları varsayılan açık okumanın %75'inde
kalan gevşek bir el okunabilir: 720 denemenin 6'sı BELİRSİZ ŞEKİL ile geçersizdir, sonuçsuz pay %8,2'dir.
Serbest ön ayarında on dört senaryonun toplam 7863 geçerli turunda 9 kayıp vardır (sol el 1, tek atış
60 kare/s 3, Makas-sonra-yüzük/serçe 5); Turnuva'da 7646 geçerli turda sıfır.

## 6.5 E5 — Algılayıcı gürültüsü

**Düzenek.** Turnuva, normal açanlar; eklem gürültüsü 1–8 mm (eksen başına SS; yalnızca dünya
koordinatlarında); hücre başına 720 deneme. Geçersiz turların tamamı BELİRSİZ ŞEKİL'dir; iptal yoktur.

| Gürültü (mm) | Kare/s | Geçerli $n$ | G / B / M | Kayıp % [%95 GA] | Kazanılan deneme % | Sonuçsuz deneme % | Faul (deneme %) | Geçersiz (deneme %) | Öncelik medyanı (ms) | Revize edilmeyen % |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 30 | 678 | 678 / 0 / 0 | 0,00 [0,00–0,56] | 94,17 | 5,83 | 5,83 | 0,00 | 165 | 11,50 |
| 1 | 60 | 694 | 692 / 2 / 0 | 0,00 [0,00–0,55] | 96,11 | 3,61 | 3,61 | 0,00 | 149 | 11,10 |
| 2 | 30 | 678 | 678 / 0 / 0 | 0,00 [0,00–0,56] | 94,17 | 5,83 | 5,83 | 0,00 | 164 | 12,24 |
| 2 | 60 | 693 | 691 / 2 / 0 | 0,00 [0,00–0,55] | 95,97 | 3,75 | 3,75 | 0,00 | 150 | 11,69 |
| 4 | 30 | 664 | 664 / 0 / 0 | 0,00 [0,00–0,58] | 92,22 | 7,78 | 7,78 | 0,00 | 165 | 12,05 |
| 4 | 60 | 682 | 680 / 2 / 0 | 0,00 [0,00–0,56] | 94,44 | 5,28 | 5,28 | 0,00 | 150 | 12,32 |
| 6 | 30 | 521 | 518 / 3 / 0 | 0,00 [0,00–0,73] | 71,94 | 27,64 | 5,69 | 21,94 | 168 | 12,28 |
| 6 | 60 | 460 | 458 / 2 / 0 | 0,00 [0,00–0,83] | 63,61 | 36,11 | 3,89 | 32,22 | 185 | 8,48 |
| 8 | 30 | 372 | 369 / 3 / 0 | 0,00 [0,00–1,02] | 51,25 | 48,33 | 6,67 | 41,67 | 399 | 10,75 |
| 8 | 60 | 281 | 280 / 1 / 0 | 0,00 [0,00–1,35] | 38,89 | 60,97 | 2,08 | 58,89 | 485 | 41,28 |

![E5](../figures/E5-sensor-noise.svg)

**Yorum.** 4 mm'ye kadar sistem bozulmadan çalışır (sonuçsuz pay %3,6–7,8, tamamı faul). 6 mm'den itibaren
**çöker, ama sessizce değil**: hakem denemelerin %22–32'sini (6 mm) ve %42–59'unu (8 mm) "şekil tanınmadı"
diye geçersiz sayar; YZ'nin kazandığı deneme payı 4 mm'ye kadarki %92–96'dan 8 mm'de %39–51'e düşer.
Geçerli kalan turlardaki "%99–100 kazanma" ise **yanıltıcıdır** ve sağlamlık kanıtı sayılmamalıdır: bu oran kuralın sonucudur ve
8 mm'de, 60 kare/s'de mühürlerin %41'i hiç revize edilmemiş, medyan öncelik neredeyse bütün uçuş süresine
(485 ms) çıkmıştır; yani kinematik kanal turların önemli bir bölümünde fiilen devre dışıdır. Geçerli
turların yalnızca hakemin tanıyabildiği şekillerden oluşması bir **seçilim yanlılığı**dır; bu, "geçerli
turlarda kazanma oranı"nın tek başına raporlanmasının neden yetersiz olduğunu gösterir. Koşulsuz sütunlar
her zaman birlikte verilmelidir.

Varsayılan 2 mm değeri bir ölçüm değildir. Üreticinin model kartı iki boyutta avuç boyunun %10'u dolayında
ortalama mutlak hata bildirir [MediaPipeHandCard2021]; bu, işaretleme farklarını da içeren bir mutlak hata
olup kareden kareye titreşimi vermez, ancak gerçek gürültünün 2 mm'den büyük olabileceğine işaret eder.
Gerçek sistemin E5'in hangi satırında çalıştığı bilinmemektedir (Bölüm 8.2).

## 6.6 E6 — Kalibrasyon ve öğrenme eğrileri

**Kalibrasyon.** Turnuva, normal açanlar, 30 kare/s; 8 tohum × 300 deneme; değerlendirilen mühür anındaki
sonsal gerçek hamleyle karşılaştırılır ($n=2257$).

| İsabet | Brier | Log-kayıp (bit) | Bilgi kazancı (bit/tur) | ECE |
|---|---|---|---|---|
| %78,33 | 0,2821 | 0,6836 | 0,9013 | 0,0649 |

| Güven kutusu | $n$ | Ortalama güven | Gözlenen isabet |
|---|---|---|---|
| 0,3–0,4 | 514 | 0,377 | 0,446 |
| 0,4–0,5 | 205 | 0,429 | 0,449 |
| 0,5–0,6 | 167 | 0,543 | 0,665 |
| 0,6–0,7 | 135 | 0,650 | 0,815 |
| 0,7–0,8 | 159 | 0,752 | 0,969 |
| 0,8–0,9 | 155 | 0,850 | 0,981 |
| 0,9–1,0 | 922 | 0,987 | 0,998 |

![E6 kalibrasyon](../figures/E6-calibration.svg)

**Yorum.** Sonsal bilgilendiricidir (şansa göre 0,90 bit/tur; tavan 1,58) ama **iyi kalibre değildir**:
her kutuda gözlenen isabet bildirilen güvenin üzerindedir; orta kutularda fark büyüktür (0,752 güvene karşı
0,969 isabet). Model sistematik olarak **az güvenlidir**; ECE 0,065'tir. Ayrıca mühür anındaki en olası
sınıf turların yalnızca %78,3'ünde doğrudur, oysa aynı düzenekte geçerli turlarda kazanma oranı %100'e
yakındır. Bunun açıklaması kararın sonsalın tepe sınıfına değil **hakemin yasal kümesine** dayanmasıdır
(Lemma 1: yasal sınıflardan biri dışlandığında kaybetmeyen bir hamle vardır) ve mühür ayakta kaldığı sürece
sonsalın sonraki keskinleşmesinin kaydedilmemesidir. Arayüzde gösterilen olasılıklar bu nedenle "kesin
sayılar" olarak değil, kalibrasyon hatasıyla birlikte sunulmalıdır.

**Öğrenme.** Her tarz için 12 tohum; geçerli turlar 15'lik bloklara ayrılır.

| Tarz | Blok medyanı: karar önceliği (ms), 1.–8. blok | Öğrenilen ön başlangıç önceliği (ms) | Simülasyondaki gerçek ortalama (ms) |
|---|---|---|---|
| erken | 233, 234, 265, 236, 232, 267, 264, 266 | 280 | 260 |
| normal | 135, 136, 198, 166, 167, 164, 168, 166 | 199 | 170 |
| geç | 400, 101, 101, 117, 117, 431, 117, 100 | 126 | 80 |

![E6 öğrenme](../figures/E6-learning.svg)

**Yorum.** (i) Oyuncuya özgü önsel öğrenilir (öğrenme öncesi 170 ms'den 280 / 199 / 126 ms'ye), ancak
öğrenilen değer simülasyondaki gerçek ortalamanın **20–46 ms üzerindedir**. İki olası neden vardır ve
ayrıştırılmamıştır: başlangıç ölçümünün yanlılığı ve seçilim (yalnızca geçerli turlardan öğrenilir; en geç
başlayan açılmalar faul olduğu için öğrenme kümesine girmez — geç açanlarda etki en büyüktür). (ii) **Karar
önceliği öğrenmeyle az büyür:** normal açanlarda ilk iki bloktaki ≈135 ms'den sonraki bloklarda ≈166 ms'ye
(yaklaşık bir kare), erken açanlarda ≈233'ten ≈265 ms'ye; geç açanlarda bir eğilim yoktur. Geç açanlardaki
400 ve 431 ms'lik blok medyanları öğrenme değil, iki tepeli dağılımda medyanın tepe değiştirmesidir (E3'te
bu tarzda, Turnuva'da, kinematik önceliğin medyanı 66–67 ms, bütün geçerli turların üst çeyreği 469–499 ms'dir).
Dolayısıyla "tur sayısı arttıkça daha erken tanır" beklentisi simülasyonda yalnızca zayıf biçimde
doğrulanmıştır; önceliği esas olarak oyuncunun parmaklarını ne zaman açmaya başladığı belirler.

## 6.7 E7 — İki kanalın ayrıştırılması

**Düzenek.** Turnuva, normal açanlar, 30 kare/s, "humanLike"; 8 tohum × 300 deneme. Aynı geçerli turlarda
($n=2260$) iki karar karşılaştırılır: hareket başlamadan atılan davranış mührü (karşı-olgusal) ve
değerlendirilen mühür.

| Karar | Kazanma % [%95 GA] | Berabere % | Kayıp % |
|---|---|---|---|
| Yalnızca davranış kanalı (hareketten önceki mühür) | 38,58 [36,60–40,61] | 35,22 | 26,19 |
| Davranış + kinematik (değerlendirilen mühür) | 99,96 [99,75–99,99] | 0,04 | 0,00 |

Davranış mührü geçerli turların %13,05'inde hiç revize edilmemiştir.

**Yorum.** Sistemin başarımının neredeyse tamamı **kinematik kanaldan** gelir. Davranış kanalı tek başına
şansın üzerindedir (aralık %33,3'ü dışlar; net ≈ +0,12/tur), ama "yenilmezlik"le ilgisi yoktur. Bu değer
E1'deki "humanLike" satırından (en iyi yanıtla 0,06, davranış mührünün gerçekte izlediği güvenli stratejiyle
0,02) yüksektir; olası bir neden E5'te görülen seçilimin hafif bir biçimidir: faul sayılan turlar yalnızca
Kâğıt/Makas atışlarıdır, bu yüzden geçerli turlarda Taş fazla temsil edilir ve davranış kanalı fazladan bir
sıklık ipucu kazanır. Bu etki ayrıştırılmamıştır. Literatürle karşılaştırma: gerçek öğrencilere karşı
bildirilen Markov topluluğu kazancı tur başına ≈ +0,12'dir [WangL2020]; insanlara karşı uyarlanır botların
300 turdaki ortalama galibiyet farkı kabaca −50 ile +50 arasındadır [BrockbankVul2024]. E7'deki davranış
değeri bu aralıkla uyumlu olmakla birlikte, uyum sağlamayan sentetik bir oyuncuya ve seçilmiş turlara
dayandığı için iyimser bir üst değer olarak okunmalıdır.

## 6.8 E8 — Model uyumsuzluğuna dayanıklılık

**Soru.** E1–E7'nin sayıları, sentetik oyuncunun dedektörün kendi varsayımlarından üretilmiş olmasına ne
kadar bağlıdır? Bağımsız incelemenin temel eleştirilerinden biri buydu: simülatör dedektörle aynı yörünge
ailesini, aynı önsel merkezlerini, tam genliği, bağımsız Gauss gürültüsünü ve çekirdeğin tam tersi olan bir
el modelini kullanıyor; sonuçlar modeli kendisine karşı ölçüyordu ve bunun ne kadar iyimser olduğu
nicelenmemişti.

**Düzenek.** Dürüst, normal açan, "humanLike" davranışlı oyuncu; koşul başına 6 tohum × 150 = 900 deneme.
İlk satır eşleşmiş tabandır; sonraki her satır **tek bir varsayımı** bozar, son satır birkaçını hafifçe
birlikte bozar. Koşullar üç blokta koşulur: Turnuva 30 kare/s, Turnuva 60 kare/s ve Serbest 30 kare/s.
Bozulmalar şunlardır:

- *Açılma profili* (2–4): en küçük sarsım yerine doğrusal; üstel (ani başlangıç, yavaş bitiş); kübik (yavaş
  başlangıç, geç hızlanma).
- *Parmak eşzamansızlığı* (5–6): her parmağın kendi başlangıç kayması (SS 30 ve 60 ms; varsayılan 5 ms).
- *Açık el genliği* (7–8): açılan parmakların son açıklığı 1 yerine $\mathcal N(0{,}80;\,0{,}10)$ ve
  $\mathcal N(0{,}65;\,0{,}10)$.
- *Yavaş açılma* (9): medyan süre 130 yerine 250 ms.
- *Yüzük/serçe gecikmesi* (10): Kâğıt'ta arka grup ön gruptan $\mathcal N(15,20)$ yerine
  $\mathcal N(100,50)$ ms sonra başlar.
- *Gürültü yapısı* (11–15): kareler arası ilintili (AR(1), $\rho=0{,}8$); avuç hızıyla büyüyen (SS, avuç
  hızı $v$ AB/s iken $1+g\cdot\min(1{,}5;\,v/8)$ ile çarpılır; $g=2$ ve $4$); karelerin %5 ve %15'inde bir
  parmak ucunun sıçraması (3 cm SS).
- *Geometri* (16–17): görünen el boyutunun kareden kareye %10 oynaması; vuruş boyunca 25° bilek eğimi.
- *Eylemsizlikle gevşeme* (18–19): kapalı parmakların vuruş hızıyla aralanması (bütün vuruşlarda 0,25;
  yalnızca atış vuruşunda 0,20).
- *Farklı kurulu bir el* (20–21): gerçek yumruk/açık bükülme açıları çekirdeğin varsaydığı ≈215°/≈25° yerine
  180°/45° ve 160°/60°.
- *Birleşik hafif uyumsuzluk* (22): doğrusal profil, 30 ms eşzamansızlık, 0,80 genlik, $\rho=0{,}8$, hıza
  bağlı gürültü ($g=2$) ve %5 aykırı değer birlikte.

**Turnuva, 30 kare/s** (faul ve geçersiz, **bütün denemelerin** yüzdesidir; G / B / M geçerli turların
yüzdesidir; hiçbir satırda iptal yoktur):

| # | Koşul | Geçerli % | G / B / M (geçerli turların %'si) | Faul (deneme %) | Geçersiz (deneme %) | Açık dürüst atışlarda faul % | Medyan öncelik (ms) |
|---|---|---|---|---|---|---|---|
| 1 | Eşleşmiş taban (en küçük sarsım, bağımsız gürültü) | 95,44 | 99,88 / 0,12 / 0,00 | 4,56 | 0,00 | 0,00 | 167 |
| 2 | Açılma profili: doğrusal | 97,22 | 99,89 / 0,11 / 0,00 | 2,78 | 0,00 | 0,00 | 167 |
| 3 | Açılma profili: üstel (ani başlangıç) | 98,33 | 99,55 / 0,45 / 0,00 | 1,67 | 0,00 | 0,00 | 199 |
| 4 | Açılma profili: kübik (yavaş başlangıç) | 84,67 | 99,74 / 0,26 / 0,00 | 15,33 | 0,00 | 7,09 | 135 |
| 5 | Parmak eşzamansızlığı, SS 30 ms | 93,89 | 100,00 / 0,00 / 0,00 | 6,11 | 0,00 | 0,98 | 168 |
| 6 | Parmak eşzamansızlığı, SS 60 ms | 92,44 | 100,00 / 0,00 / 0,00 | 7,56 | 0,00 | 2,89 | 200 |
| 7 | Açık el genliği $\mathcal N(0{,}80,\,0{,}10)$ | 94,00 | 99,29 / 0,71 / 0,00 | 5,89 | 0,11 | 1,35 | 166 |
| 8 | Açık el genliği $\mathcal N(0{,}65,\,0{,}10)$ | 92,11 | 99,64 / 0,36 / 0,00 | 5,33 | 2,56 | 1,09 | 166 |
| 9 | Yavaş açılma (medyan 250 ms) | 82,00 | 99,86 / 0,14 / 0,00 | 18,00 | 0,00 | 8,91 | 134 |
| 10 | Yüzük/serçe gecikmesi $\mathcal N(100,\,50)$ ms | 79,78 | 100,00 / 0,00 / 0,00 | 20,22 | 0,00 | 14,73 | 167 |
| 11 | İlintili gürültü, AR(1), $\rho=0{,}8$ | 94,67 | 99,88 / 0,12 / 0,00 | 5,33 | 0,00 | 0,37 | 166 |
| 12 | Hıza bağlı gürültü, $\times(1+2v/8)$ | 92,22 | 100,00 / 0,00 / 0,00 | 7,78 | 0,00 | 1,61 | 136 |
| 13 | Hıza bağlı gürültü, $\times(1+4v/8)$ | 76,56 | 99,71 / 0,29 / 0,00 | 23,44 | 0,00 | 17,49 | 67 |
| 14 | Parmak ucu aykırı değerleri, karelerin %5'i (3 cm) | 94,78 | 100,00 / 0,00 / 0,00 | 5,22 | 0,00 | 0,73 | 167 |
| 15 | Parmak ucu aykırı değerleri, karelerin %15'i (3 cm) | 92,67 | 99,88 / 0,12 / 0,00 | 7,11 | 0,22 | 1,23 | 165 |
| 16 | Görünen el boyutu titreşimi, %10 | 93,67 | 100,00 / 0,00 / 0,00 | 6,33 | 0,00 | 0,75 | 166 |
| 17 | Vuruş boyunca 25° bilek eğimi | 94,00 | 99,76 / 0,24 / 0,00 | 6,00 | 0,00 | 0,74 | 166 |
| 18 | Eylemsizlikle parmak gevşemesi 0,25 | 92,56 | 100,00 / 0,00 / 0,00 | 7,44 | 0,00 | 1,27 | 135 |
| 19 | Eylemsizlikle gevşeme 0,20, yalnızca atış vuruşunda | 95,44 | 98,37 / 1,63 / 0,00 | 4,56 | 0,00 | 0,99 | 70 |
| 20 | El: yumruk 180° / açık 45° | 95,00 | 99,88 / 0,12 / 0,00 | 5,00 | 0,00 | 0,37 | 167 |
| 21 | El: yumruk 160° / açık 60° | 93,67 | 99,88 / 0,12 / 0,00 | 5,67 | 0,67 | 0,73 | 166 |
| 22 | Birleşik hafif uyumsuzluk | 89,67 | 99,63 / 0,37 / 0,00 | 10,22 | 0,11 | 4,15 | 135 |

![E8](../figures/E8-robustness.svg)

Şekildeki çubuk numaraları tablonun satır numaralarıdır.

**Turnuva 60 kare/s ve Serbest 30 kare/s** (satır numaraları yukarıdaki tablonun koşullarıdır; Turnuva
60 kare/s'nin 13. satırında 2 deneme iptal edilmiştir, başka hiçbir satırda iptal yoktur):

| # | Turnuva 60 kare/s: faul % | geçersiz % | açık dürüst faul % | kayıp (sayı) | öncelik (ms) | Serbest 30 kare/s: faul % | geçersiz % | G / B / M (geçerli turların %'si) | kayıp (sayı / geçerli) | öncelik (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 3,89 | 0,00 | 0,37 | 0 | 150 | 3,89 | 0,00 | 99,42 / 0,58 / 0,00 | 0 / 865 | 168 |
| 2 | 2,33 | 0,00 | 0,00 | 0 | 166 | 2,00 | 0,00 | 99,66 / 0,23 / 0,11 | 1 / 882 | 169 |
| 3 | 0,78 | 0,00 | 0,00 | 0 | 183 | 1,33 | 0,00 | 99,10 / 0,79 / 0,11 | 1 / 888 | 200 |
| 4 | 10,89 | 0,00 | 5,05 | 0 | 133 | 13,22 | 0,00 | 99,87 / 0,13 / 0,00 | 0 / 781 | 135 |
| 5 | 5,67 | 0,00 | 1,00 | 0 | 167 | 5,11 | 0,00 | 99,88 / 0,12 / 0,00 | 0 / 854 | 169 |
| 6 | 6,11 | 0,00 | 1,62 | 0 | 183 | 5,78 | 0,00 | 99,53 / 0,35 / 0,12 | 1 / 848 | 200 |
| 7 | 4,78 | 0,33 | 0,25 | 0 | 152 | 5,22 | 0,11 | 99,65 / 0,35 / 0,00 | 0 / 852 | 165 |
| 8 | 6,00 | 3,22 | 0,38 | 0 | 164 | 5,44 | 2,56 | 99,52 / 0,36 / 0,12 | 1 / 828 | 167 |
| 9 | 11,89 | 0,00 | 3,73 | 0 | 133 | 10,89 | 0,00 | 99,13 / 0,62 / 0,25 | 2 / 802 | 136 |
| 10 | 15,78 | 0,00 | 11,79 | 0 | 152 | 19,00 | 0,00 | 99,86 / 0,00 / 0,14 | 1 / 729 | 167 |
| 11 | 5,11 | 0,00 | 0,37 | 0 | 150 | 4,11 | 0,00 | 99,65 / 0,23 / 0,12 | 1 / 863 | 168 |
| 12 | 7,22 | 0,00 | 0,99 | 0 | 131 | 5,44 | 0,00 | 99,18 / 0,82 / 0,00 | 0 / 851 | 165 |
| 13 | 18,89 | 0,00 | 11,18 | 0 | 35 | 14,00 | 0,00 | 97,16 / 2,33 / 0,52 | 4 / 774 | 67 |
| 14 | 4,33 | 0,00 | 0,37 | 0 | 151 | 4,89 | 0,00 | 99,77 / 0,23 / 0,00 | 0 / 856 | 167 |
| 15 | 4,33 | 0,44 | 0,37 | 0 | 166 | 6,22 | 0,11 | 99,53 / 0,12 / 0,36 | 3 / 843 | 166 |
| 16 | 4,56 | 0,00 | 0,25 | 0 | 150 | 4,78 | 0,00 | 100,00 / 0,00 / 0,00 | 0 / 857 | 167 |
| 17 | 4,89 | 0,00 | 0,37 | 0 | 151 | 4,00 | 0,00 | 99,54 / 0,46 / 0,00 | 0 / 864 | 167 |
| 18 | 7,33 | 0,00 | 1,87 | 0 | 126 | 5,22 | 0,00 | 99,88 / 0,00 / 0,12 | 1 / 853 | 100 |
| 19 | 6,78 | 0,00 | 1,26 | 0 | 50 | 3,00 | 0,00 | 96,91 / 2,63 / 0,46 | 4 / 873 | 67 |
| 20 | 4,33 | 0,00 | 0,49 | 0 | 150 | 3,67 | 0,00 | 98,96 / 0,92 / 0,12 | 1 / 867 | 167 |
| 21 | 5,67 | 1,00 | 0,98 | 0 | 150 | 5,56 | 0,67 | 99,05 / 0,83 / 0,12 | 1 / 844 | 165 |
| 22 | 5,89 | 0,22 | 1,12 | 0 | 101 | 7,78 | 0,11 | 96,26 / 3,26 / 0,48 | 4 / 829 | 163 |

**Yorum.**

1. **Turnuva'da kayıp her koşulda sıfırdır — ve bu hiçbir şey kanıtlamaz.** İki Turnuva bloğunun 44
   satırında toplam 36 557 geçerli turda tek bir kayıp yoktur. Bu, kuralın yapısından gelir (Teorem 1):
   model ne kadar yanlış olursa olsun, teoremin koşulları altında (Bölüm 4.7) geçerli bir turda kayıp olamaz. Uyumsuzluğun etkisi G / B / M
   sütununda **görünmez**; yalnızca koşullu oranlara bakan biri sistemi her koşulda kusursuz sanırdı.
2. **Bedel faul ve geçersiz turlara taşınır.** Dürüst bir oyuncunun sonuçsuz kalan deneme payı 30 kare/s'de
   eşleşmiş tabandaki %4,6'dan, koşula göre %1,7 ile **%23,4** arasına gider: en kötü durumda tabanın beş
   katı.
3. **En çok zarar veren uyumsuzluklar**, açılmanın inişten önce *ölçülebilir hâle gelmesini* geciktirenlerdir:
   avuç hızıyla büyüyen güçlü gürültü ($g=4$: vuruşun en hızlı anında SS yedi katına çıkar; faul %23,4;
   açık dürüst atışlarda %17,5; medyan öncelik 167 ms'den 67 ms'ye düşer), Kâğıt'ta yüzük ve serçenin geç
   başlaması (faul %20,2; Kâğıt atışlarının %48'i faul), yavaş açılma (%18,0) ve yavaş başlayan profil
   (%15,3). İlki özellikle önemlidir: gerçek bir
   izleyicinin hatası tam da elin en hızlı hareket ettiği, yani parmakların açılmaya başladığı anda büyür
   (hareket bulanıklığı); bu, burada sınanan en zararlı bozulmadır ve gerçekteki büyüklüğü ölçülmemiştir.
   Birkaç hafif uyumsuzluğun birleşimi faulü %10,2'ye, açık dürüst atışlardaki faulü %4,2'ye çıkarır.
4. **Az etkileyenler:** kareler arası ilintili gürültü, seyrek parmak ucu sıçramaları, el boyutu titreşimi,
   bilek eğimi ve ılımlı bir kalibrasyon farkı sonuçsuz payı tabanın en çok üç puan üzerine çıkarır
   (%5,0–7,3). Ani başlayan profiller (doğrusal, üstel) tabandan *daha az* faul üretir (%2,8 ve %1,7):
   keskin bir başlangıç, yumuşak bir başlangıçtan daha kolay saptanır.
5. **Okunamayan el.** Parmakları ortalama %65'e kadar açılan bir elde denemelerin %2,6'sı (30 kare/s) ve
   %3,2'si (60 kare/s), yumruk 160° / açık 60° kurulu bir elde %0,7'si ve %1,0'ı BELİRSİZ ŞEKİL ile
   geçersizdir. Bu oranların düşük olması, incelemeden sonra eklenen sınıfa özgü şablon sapmalarıyla ve
   geçersiz turlardan kalibrasyonla (Bölüm 4.9) tutarlıdır; E8 bu düzeltmelerin öncesini ölçmediği için
   katkıları burada ayrıştırılmamıştır. İnceleme, düzeltmeden önce gevşek açılan bir elde Kâğıt'ın yaklaşık
   100 deneme boyunca oynanamadığını ölçmüştü.
6. **Öncelik de uyumsuzluktan etkilenir.** Kapalı parmaklar yalnızca atış vuruşunda aralandığında medyan
   öncelik 70 ms'ye (60 kare/s'de 50 ms) düşer ve beraberlikler artar (%1,6): sahte bir "açılma başlıyor"
   görüntüsü YZ'yi kararını geciktirmeye zorlar. Hıza bağlı güçlü gürültüde öncelik 67 ms (60 kare/s'de
   35 ms) olur.
7. **60 kare/s** aynı örüntüyü verir; en zor koşullarda faul birkaç puan düşüktür (yavaş başlayan profil
   %10,9, yavaş açılma %11,9, yüzük/serçe gecikmesi %15,8, güçlü hıza bağlı gürültü %18,9).
8. **Serbest'te bedelin bir bölümü kayba dönüşür.** Faul oranları en zor koşullarda Turnuva'dan düşüktür
   (güçlü hıza bağlı gürültü %14,0; yavaş açılma %10,9), ama 22 koşulun toplam 18 503 geçerli turunda 26
   kayıp vardır (%0,14); en çok güçlü hıza bağlı gürültüde, yalnızca atış vuruşundaki gevşemede ve birleşik
   uyumsuzlukta (4'er kayıp, %0,46–0,52) ve bu satırlarda beraberlikler %2,3–3,3'e çıkar.

**Gerçek kameralar için anlamı.** Bölüm 6.3'ün "normal açanlarda denemelerin yaklaşık %5'i sonuçsuz kalır"
sonucu yalnızca eşleşmiş model için geçerlidir ve gerçek oyuncular için bir alt sınır olarak okunmalıdır.
Gerçek bir elin açılması en küçük sarsım profilinden sapar, parmaklar aynı anda başlamaz, izleyicinin hatası
hareketle büyür ve bunların hepsi aynı anda geçerlidir; burada sınanan tek tek bozulmalar altında dürüst bir
oyuncunun sonuçsuz denemeleri %2 ile %23 arasında değişmiştir. Turnuva'nın "geçerli turda kaybetmez"
özelliği gerçek kamerada da kuraldan gelir; değişecek olan, oyunun ne kadarının geçerli tura dönüştüğü ve
dürüst bir atışın ne sıklıkla haksız yere faul sayıldığıdır. E8 bunu **ölçmez**: belirtilen bozulmalara
duyarlılığı gösterir, gerçek dünyadaki oranları değil. Sınanmayanlar: avuç vuruşunun en küçük sarsımdan
sapması, kapanma, sistematik (sıfır ortalamalı olmayan) eklem hatası, ışık koşulları, erken ve geç açan
tarzların uyumsuzluk altındaki davranışı ve burada birleştirilenlerden daha ağır birleşimler.

## 6.9 Sonuçların özeti

| Bulgu | Dayanak | Niteliği |
|---|---|---|
| Turnuva ön ayarında E3, E4, E5, E7 ve E8'de toplam 58 452 geçerli turda kayıp yok | E3–E5, E7, E8 | Kuralın sonucu (Teorem 1); tahmin kalitesi hakkında bilgi taşımaz |
| Eşleşmiş simülatörde YZ, normal açan dürüst bir oyuncuya karşı denemelerin ≈ %94,5'ini kazanır; ≈ %5'i sonuçsuzdur | E3 | Sistemin ölçüsü; yalnızca eşleşmiş model için |
| Sonuçsuz deneme payı açılma zamanına bağlıdır: %0,2 (erken) – %35 (geç) | E3 | Olumsuz |
| Model uyumsuzluğunda kayıp sıfırda kalır, sonuçsuz pay %1,7–23,4 arasında değişir; en zararlısı hıza bağlı gürültü ve geç başlayan arka gruptur | E8 | Sınırlayıcı; iyimserliğin nicelenmesi |
| Kinematik kanalın değeri son karelerdedir: Serbest'te 40 ms dondurma %2–4, 120 ms dondurma %20–23 kayıp getirir | E2 | Sınırlayıcı |
| Ön ayarlar sonuçsuz payı az değiştirir | E3 | Beklenenden zayıf |
| Mühür anında şeklin yaklaşık yarısı oluşmuştur; tamamlanmaya öncelik medyanı ≈ bir kare; el okunarak verilen kararın önceliği geç açanlarda ≈ 66 ms | E3 | Sınırlayıcı |
| Karar önceliği öğrenmeyle en çok bir kare kadar artar | E6 | Beklenenden zayıf |
| Sonsal az güvenlidir (ECE 0,065) | E6 | Olumsuz |
| 6 mm ve üzeri gürültüde denemelerin %22–59'u geçersizdir; kazanılan deneme payı %39–72'ye düşer | E5 | Olumsuz |
| %15 kare kaybında denemelerin yalnızca %35'i geçerli tura dönüşür | E4 | Olumsuz |
| Tek atış kipi, uzun bekleme ve 60 kare/s dâhil, hazırlık vuruşlu kiplerle aynı düzeydedir (sonuçsuz %4,9–6,9) | E4 | Olumlu; inceleme sonrası |
| Davranış kanalı rastgele oyuncuya karşı hiçbir şey kazanmaz; insan benzeri oyuncuya karşı güvenli stratejiyle net ≈ 0,02–0,04/tur, en iyi yanıtla ≈ 0,06–0,07/tur | E1 | Kuramla uyumlu |

Havuzlanmış 58 452 turda sıfır kayıp için %95 Wilson üst sınırı %0,007'dir (kendi hesabımız). Bu turların
tamamı oyuncunun kendi ritmiyle oynadığı kiplerdendir (üç ya da iki hazırlık vuruşu, tek atış); metronom
kipi E1–E8'de yoktur.

**Güvencenin saldırı bulanık sınaması.** Güvence ayrıca, metronom kipini de kapsayan rastgele bir saldırı
sınamasıyla denenmiştir (`experiments/fuzz_guarantee.mjs`; sonuç `docs/results/fuzz-guarantee.json`;
tohumlar 90001–105000). Her oturumda kip (üç ya da iki hazırlık vuruşu, tek atış, üç vuruşlu ya da
vuruşsuz metronom), kare hızı (12–144 kare/s), aldatma, geç atış, zayıf vuruş, kare kaybı ve ek izleme
boşlukları, model uyumsuzluğu, dondurma ufku (Turnuva'da yok sayılır) ve davranış mührü rastgele seçilmiş;
kareler ilan edilmiş vuruş anlarının ve gerçek inişin tam üstüne ya da 0,005–0,04 ms öncesine veya
sonrasına yerleştirilmiştir — inceleme
sonrasında bulunan ilk iki delik tam bu türdendi (Bölüm 4.7; üçüncüsü, taahhüt kaydının bir mührü
reddetmesi, bu sınamanın kapsamı dışındadır ve kendi regresyon testleriyle sınanır). 15 000 oturumda 26 598 hüküm
verilmiş ve 14 579 tur geçerli sayılmıştır (metronom kiplerinde 6696); **oyuncu
galibiyeti 0**, motor hatası 0, kare sırası ya da mühür doğrulaması ihlali 0. Kalan hükümlerden 8183
faul, 3836 geçersiz turdur; 3454 deneme hükme bağlanmamıştır (iptal ya da hiç başlamayan tur).
Sınamanın koşulları bilerek uç değerlere itilmiştir; bu oranlar bir başarım ölçüsü değildir.

Bu sayılar bilerek öne çıkarılmamıştır: Turnuva'da sıfır kayıp kuralın sonucudur, örneklem büyüdükçe "daha
çok kanıtlanmaz"; sınır ve bulanık sınama yalnızca gerçeklemenin teoremle uyumlu davrandığına ilişkin
regresyon göstergeleridir ve yalnızca simülasyon dağılımları için geçerlidir.

**Ölçülmeyenler.** Bu bölüm şunların hiçbirini ölçmez: (i) gerçek insanlara karşı herhangi bir oran; (ii)
gerçek bir kamerada el izleyicinin gürültüsü, hareket bulanıklığı, kare düşme örüntüsü ve bunların sonuçsuz
deneme payına etkisi; (iii) kare → mühür gecikmesi ve duvar saati önceliği (simülasyonda tanımsızdır) ile
gösterim gecikmesi; (iv) motorun saptadığı inişin fiziksel inişe göre hatası (yalnızca simülasyondaki
"gerçek"e göre bilinir); (v) sömürüldüğünde uyum sağlayan ya da sistemi yenmeye çalışan gerçek oyuncular;
(vi) E8'de sayılanların dışındaki model uyumsuzlukları; (vii) arayüzün kullanıcılar tarafından nasıl
anlaşıldığı; (viii) metronom kipinde başarım — E1–E8'in hiçbiri bu kipi kullanmaz; metronom kipi yalnızca
güvence için, yukarıdaki saldırı bulanık sınamasında denenmiştir (o kipte sonuçsuz pay ve öncelik
ölçülmemiştir).
