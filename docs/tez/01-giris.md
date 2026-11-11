# 1. Giriş

## 1.1 Motivasyon

Taş–Kâğıt–Makas (TKM), kuralları herkesin bildiği ama iki açıdan teknik olarak ilginç bir oyundur. Oyun
kuramı açısından tek dengesi düzgün rastgele oyundur ve bu dengeyi oynayan birine karşı hiçbir strateji
beklenen değerde kazanamaz [vonNeumann1928; Nash1951]. İnsan davranışı açısından ise oyuncular ne tam
rastgele oynayabilir [Wagenaar1972] ne de hamlelerini tam eşzamanlı gösterebilir: el havadayken şekil
almaya başlar. Tokyo Üniversitesi'nin janken robotu ikinci olguyu, oluşan şekli 2 ms'lik çevrimle tanıyıp
insanın fark edemeyeceği kadar hızlı tepki vererek kullanır [Katsuki2015].

beaTTer bir web kamerası ve tarayıcıyla çalışan bir TKM rakibidir. Önceki sürümü "%100 yenilmez" olduğunu
ilan ediyor, kararını "hamleden önce kilitlediğini" ve bunu "kriptografik olarak mühürlediğini" söylüyordu.
Bu tezin çıkış noktası, o sürümün kod düzeyindeki denetimidir (Bölüm 5.1): sistem gerçekte vuruş anında
görünen pozu okuyup karşılığını oynuyor; "kilitlenme süresi" ölçülmüyor, bir formülle üretiliyor; mühür
doğrulaması her zaman "doğru" dönüyordu. Yani ürünün en çekici iddiaları doğrulanamaz ya da yanlıştı.

Bu durum daha genel bir soruyu gündeme getirir: **etkileşimli bir yapay zekâ sisteminin "senden önce karar
verdim" iddiası nasıl tanımlanır, nasıl zorlanır ve kullanıcıya nasıl kanıtlanır?** TKM bu soru için iyi bir
laboratuvardır: kural basittir, zaman ölçeği milisaniyedir ve "hile" sezgisel olarak anlaşılır.

## 1.2 Araştırma soruları

- **AS1.** "Hamle tamamlanmadan önce karar" ölçülebilir ve sınanabilir biçimde nasıl tanımlanır?
- **AS2.** Sıradan bir web kamerasıyla (30–60 kare/s), parmak açılmasının *başlangıcından* nihai hamle
  hakkında iniş öncesinde ne kadar bilgi çıkarılabilir ve bu, kararın ne kadar erken verilmesine izin verir?
- **AS3.** Geçmiş hamlelerden öğrenen bir davranış modeli, insanın rastgele olmamasından ne kadar üstünlük
  sağlayabilir ve en kötü durumdaki kaybı sınırlanabilir mi?
- **AS4.** Hangi açık kural altında "geçerli hiçbir turu kaybetmeme" kanıtlanabilir ve bu kuralın bedeli
  nedir?
- **AS5.** Sistem iddialarını kullanıcıya abartmadan, ölçülen sayılarla ve denetlenebilir biçimde nasıl
  iletir?

## 1.3 Dürüstlük değişmezleri

Tasarımın omurgası altı değişmezdir (Bölüm 3.3). YZ'nin değerlendirilen kararı, iniş karesinden önceki bir
kamera karesinde yapılmış son taahhüttür ("önce" yalnızca kare sırasıyla belirlenir); iniş karesinde ya da
sonrasında üretilmiş taahhütler kayıtta kalır ama asla değerlendirilmez (D1); her taahhüt, hamleyi ve 128 bitlik
rastgele bir nonce'u içeren bir yükün SHA-256 özetidir ve hamle açıklanmadan önce yayımlanır (D2); bir turun
bütün taahhüt ve revizyonları özet zinciriyle bağlı olarak saklanır, ifşada — tur iptal edilse bile —
açılır ve doğrulanır (D3); arayüze ya da kalıcı belleğe ulaşan her sayı ölçülmüştür, bilinmeyen değer boş
gösterilir (D4); turun geçerli mi faul mü olduğuna karar veren hakem YZ'nin neyi mühürlediğine bakmaz ve
atışa ait taze kanıt yoksa turu faul değil geçersiz sayar (D5); oyun hakkındaki her şey yalnızca geçerli
turlardan öğrenilir, yalnızca algılayıcı kalibrasyonu belirli geçersiz turlardan da uyarlanabilir (D6). Bu
altı kural kodda yapısal olarak zorlanmış ve otomatik testlerle sınanmıştır; tezin bütün sonuçları bunların
üzerine kuruludur. Bu cümlenin ilk v4 gerçeklemesi için fazla iyimser olduğunu bağımsız bir inceleme
göstermiştir (Bölüm 5.1.6); değişmezlerin bugünkü ifadeleri o incelemenin bulduğu kenar durumlarını içerir.
Bugün de son söz değildir: inceleme ve düzeltmeleri bittikten sonra, Teorem 1'in ispatı kodla adım adım
karşılaştırılırken iki delik daha bulunmuştur (biri metin yazılırken, biri metnin olgu denetiminde); son
doğrulamadaki bir saldırı denetimi de motorun programlama arayüzü düzeyinde üçüncü bir delik bulmuştur.
Üçü de kapatılmış ve teste bağlanmıştır (Bölüm 4.7); ikinci bir bağımsız inceleme ise yapılmamıştır.

## 1.4 Katkılar

1. **İki denetim.** Önceki sürümün 199 özelliğini envantere alan ve 197 kusur kaydı açan, "yenilmezliğin"
   bir totoloji olduğunu kod çalıştırılarak gösteren denetim (Bölüm 5.1.1–5.1.5); ve aynı yöntemin yeniden
   tasarımın kendisine uygulanması: v4'ün 45 bulgulu bağımsız incelemesi, bulguların giderilmesi ya da açık sınır olarak belgelenmesi ve
   yeniden üretilebilen bulgular için regresyon testleri (Bölüm 5.1.6).
2. **Bir tanım.** "Hamleden önce karar"ın üç ölçülebilir büyüklüğe (inişe göre öncelik, tamamlanmaya göre
   öncelik, mühür anındaki oluşum oranı) ve altı sınanabilir değişmeze çevrilmesi (Bölüm 3).
3. **Açılma başlangıcı dedektörü.** Ham eklem açılarından, en küçük sarsım yörünge ailesi üzerinde üstel
   unutmalı ve yeniden çapalamalı bir Bayesyen eşleşmiş süzgeç bankası; "hareket yok" gözlemini oyuncunun
   öğrenilmiş zamanlamasına göre nicel kanıta çeviren yapı (Bölüm 4.3).
4. **Nicel bir "geç hamle" kuralı ve Teorem 1.** YZ ile hakemin aynı sayıyı hesapladığı, YZ'nin taahhüdünden
   bağımsız bir hakem büyüklüğü; kararı YZ'nin inancına değil hakemin yasal kümesine bağlayan bir politika;
   en sıkı ön ayarda geçerli turların kural gereği kaybedilmediğini söyleyen, turun geçerliliği dışında
   önkoşulu olmayan teorem, ispatı, ispat kodla karşılaştırılırken bulunup kapatılan delikler ve teoremin
   neyi iddia etmediğinin açık beyanı (Bölüm 4.4, 4.7).
5. **Davranış kanalı.** Yalnızca yayımlanmış sayılardan kurulan bir topluluk önseli; 26 uzman, üç döndürme
   ve bir Nash uzmanından oluşan, unutmalı ve sabit-paylaşımlı bir Bayesyen karışım; her rakibe karşı toplam
   beklenen kaybı sınırlayan bütçeli karma strateji ve ispatı (Bölüm 4.5, 4.6).
6. **Denetlenebilir taahhüt protokolü.** Nonce'lu, özet zincirli, bütün revizyonları açan ve iki bağımsız
   gerçeklemeyle doğrulanan taahhüt–ifşa kaydı; neyi kanıtlamadığının açık beyanı (Bölüm 4.8).
7. **Gerçekleme ve testler.** Derleme adımı olmayan, saf çekirdekli bir tarayıcı uygulaması; 105 otomatik
   test; değişmezlerin somut savlarla eşlemesi (Bölüm 5).
8. **Yinelenebilir simülasyon deneyleri ve olumsuz sonuçların raporlanması.** Sekiz deney; koşullu (geçerli
   turlar) ve koşulsuz (bütün denemeler) oranların ayrılması; sonuçsuz deneme payının, erkenlik–doğruluk
   ödünleşiminin, kalibrasyon hatasının, yüksek gürültüdeki seçilim yanlılığının ve — simülatörün dedektörle
   eşleşmesinden gelen iyimserliği niceleyen — model uyumsuzluğuna duyarlılığın açıkça raporlanması (Bölüm 6).
9. **Dürüst arayüz tasarımı.** Her kararın literatüre bağlandığı, yalnızca ölçülen değerleri gösteren,
   simülasyonu etiketleyen ve erişilebilirlik ölçütlerini gözeten bir arayüz belirtimi (Bölüm 7).
10. **İnsan denekli doğrulama protokolü** ve bunu destekleyen, tur sonuçlarını da içeren veri dışa aktarımı
    (Ek C).

Katkıların sınırı baştan söylenmelidir: sayısal sonuçların tamamı simülasyondur; gerçek insan verisi
toplanmamış, gerçek bir kamerayla ölçüm yapılmamıştır.

## 1.5 Tezin düzeni

Bölüm 2 ilgili çalışmaları altı başlıkta tarar ve her birinden tasarım sonucu çıkarır. Bölüm 3 problemi ve
değişmezleri tanımlar. Bölüm 4 matematiksel yöntemi verir. Bölüm 5 önceki sürümün denetimini, v4'ün
bağımsız incelemesini, mimariyi, uygulama yaşam döngüsünü, veri modelini, testleri, güvenlik ve gizliliği
anlatır. Bölüm 6 simülasyon deneylerini ve sonuçlarını,
Bölüm 7 arayüz tasarımının gerekçesini sunar. Bölüm 8 "yenilmezlik" kavramını, geçerlilik tehditlerini,
etik boyutu ve janken robotuyla karşılaştırmayı tartışır. Bölüm 9 sonuçları ve gelecek çalışmaları toplar.
Ekler sabitlerin tam listesini, test listesini, insan denekli çalışma protokolünü ve sözlüğü içerir.
