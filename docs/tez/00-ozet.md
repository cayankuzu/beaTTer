# Özet

**beaTTer: Hamle Tamamlanmadan Önce Karar Veren, Kriptografik Olarak Taahhüt Eden ve Çevrimiçi Öğrenen Bir
Taş-Kâğıt-Makas Sistemi**

Bu tez, web kamerasıyla oynanan bir taş-kâğıt-makas rakibinin "insandan önce karar verme" ve "yenilmezlik"
iddialarını sınanabilir hâle getirir. Önceki sürümün kod düzeyindeki denetimi, sistemin gerçekte vuruş
anında görünen poza tepki verdiğini ve gösterdiği zamanlama, güven ve mühür bilgilerinin ölçüm olmadığını
ortaya koymuştur. Yeniden tasarım altı dürüstlük değişmezine dayanır: değerlendirilen karar el inmeden
önceki bir kareye dayanır; her karar 128 bitlik nonce içeren, özet zincirine bağlı bir SHA-256 taahhüdüdür;
bütün revizyonlar saklanır, açılır ve doğrulanır; gösterilen her sayı ölçümdür; hakem yapay zekânın
taahhüdünden bağımsızdır ve taze kanıt yoksa hüküm vermez; oyun hakkındaki her şey yalnızca geçerli
turlardan öğrenilir. Sistem iki kanıt kanalını birleştirir: geçmiş hamlelerden öğrenen, 26 uzmanlı Bayesyen
bir dizi modeli (en kötü durumdaki beklenen kaybı kanıtlanmış biçimde sınırlı) ve parmak açılmasının
başlangıcını el havadayken sezen, en küçük sarsım yörüngelerine dayalı Bayesyen bir eşleşmiş süzgeç
bankası. Aynı dedektörden türeyen nicel bir "geç hamle" kuralı tanımlanmış ve en sıkı ayarında yapay zekânın
geçerli bir turu **kural gereği** kaybetmediği kanıtlanmıştır: karar yapay zekânın inancına değil hakemin
yasal kümesine göre verilir ve "inişten önce" yalnızca kare sırasıyla belirlenir. Bu bir tahmin başarısı
değildir; bedeli, geç açılan ya da okunamayan atışların
faul ya da geçersiz sayılıp tekrarlanmasıdır ve sistemin ölçüsü geçerli turlardaki oran değil, bütün
denemeler içinde kazanılan ve sonuçsuz kalan paylardır. Yeniden tasarımın kendisi de bağımsız bir
incelemeden geçirilmiştir; 45 bulgu arasında ilk gerçeklemede bu güvencenin delinebildiği, bir ayar
değişikliğinin oyunu durdurduğu ve yayımlanan sayıların dedektörle eşleşmiş bir simülatöre dayandığı
vardır. Bulgular giderilmiş ya da açık sınır olarak belgelenmiştir. İncelemeden sonra, teoremin ispatı kodla
adım adım karşılaştırılırken iki delik, ispatı kırmaya yönelik son bir saldırı denetiminde de motorun
programlama arayüzü düzeyinde bir üçüncüsü bulunmuş; üçü de yeniden üretilmiş, kapatılmış ve teste
bağlanmıştır. Bu çalışmanın dışında yayımlanan v4.2 de aynı yöntemle denetlenmiştir: v4.2.1'in hakeme
eklediği kurallar bu güvenceyi kırmıştı (bir saldırı bulanık sınamasında 16 911 geçerli turda 7 kayıp),
Makas'taki parmak bağlantısını telafi eden bir düzeltme, yüzük ve serçe parmağı geride kalan dürüst Kâğıt
atışlarını faule çeviriyordu ve istatistik paylaşımı anahtarına dokunulmadan açılıyordu; üçü de v4.2.3'te
giderilmiş ve teste bağlanmıştır. Gerçekleme 126 otomatik testle sınanmıştır. Deney sonuçlarının tamamı
simülasyondur. En sıkı ayarda 59 684 geçerli turda kayıp gözlenmemiştir (kuralın sonucu); metronom kipini de kapsayan
aynı bulanık sınamanın 15 000 oturumunda da 17 404 geçerli turda kayıp yoktur. Dedektörün
varsayımlarıyla eşleşmiş sentetik bir oyuncuya karşı yapay zekâ, parmaklarını olağan zamanda açan oyuncunun
denemelerinin %94,8'ini kazanmış, %5'i sonuçsuz kalmıştır; sonuçsuz pay açılma zamanına göre %0,2 ile
%35,5 arasında, model bilerek bozulduğunda (30 kare/s) %1,9 ile %20,2 arasında değişmiştir. Daha gevşek bir ayarda kararın
inişten 40 ms önce dondurulması %2,8–3,2 kayba yol açmış; mühür anında nihai şeklin ortalama en çok yarısı
oluşmuştu (30 kare/s'de 0,38–0,51; 60 kare/s'de 0,29–0,39); sonsal olasılıklar az güvenli çıkmış (beklenen kalibrasyon hatası 0,056); yüksek eklem
gürültüsünde denemelerin %17–42'si geçersiz kalmış; davranış kanalı tek başına insan benzeri bir oyuncuya
karşı tur başına yalnızca 0,02–0,10 net kazanç sağlamış, rastgele bir oyuncuya karşı ise hiçbir şey
kazanmamıştır. İnsan denekli bir çalışma yapılmamıştır. Proje sahibinin
gerçek kamerayla yaptığı ilk deneme başarısız olmuştur: hareket gecikmeli izlenmiş, el hızlı vuruşlarda
kaybolmuş, bulanıklık elin üzerine kaymıştır. En olası nedenleri belirlenip giderilmiştir (aynı bilgisayarda
sentetik karelerle iki kez ölçüldüğünde el izleme ekran kartında 2,5–2,9 kat hızlıdır; gizlilik artık elden
başka her şeyi bulanıklaştırır). Gerçek kameradan elde edilen tek veri, proje sahibinin bundan sonra en sıkı
ayarda oynadığı turların yerel kayıtlarıdır (tek oyuncu, 79 kayıt; hüküm verilen 46 turun 26'sı geçerlidir
ve hepsini yapay zekâ kazanmıştır); v4.2.3 gerçek kamerayla denenmemiştir. Bir doğrulama protokolü
sunulmuştur.

**Anahtar kelimeler:** taş-kâğıt-makas; erken hareket tanıma; el kinematiği; taahhüt şeması; özet zinciri;
uzman tavsiyesiyle kestirim; güvenli sömürü; kalibrasyon; açıklanabilir yapay zekâ; bilimsel dürüstlük.

---

# Abstract

**beaTTer: A Rock-Paper-Scissors System that Decides Before the Throw Is Complete, Commits
Cryptographically and Learns Online**

This thesis makes the claims of a webcam-based rock-paper-scissors opponent — that it "decides before the
human" and is "unbeatable" — testable. A code-level audit of the previous version showed that it actually
reacted to the pose visible at the strike, and that the timings, confidences and seals it displayed were
not measurements. The redesign rests on six honesty invariants: the judged decision is based on a camera
frame before the hand lands; every decision is a SHA-256 commitment with a 128-bit nonce, linked in a hash
chain; all revisions are kept, opened and verified; every displayed number is measured; the referee is
independent of the AI's commitment and does not rule without fresh evidence; and everything about the game
is learned from valid rounds only. The system fuses two channels of evidence: a Bayesian sequence model
with 26 experts that learns from past throws, with a proven bound on its worst-case expected loss, and a
Bayesian matched-filter bank over minimum-jerk trajectories that detects the onset of finger opening while
the hand is still in the air. A quantitative "late throw" rule is derived from the same detector, and under
its strictest preset it is proved that the AI cannot lose a valid round **by rule**: the decision follows the
referee's legal set, not the AI's own belief, and "before the landing" is decided by frame order alone. This
is not a prediction result; its price is that
late-opening or unreadable throws become fouls or void rounds and are replayed, and the system is measured
not by the rate among valid rounds but by the shares of all attempts that are won and that end without a
result. The redesign itself was subjected to an independent review; among its 45 findings were that the
first implementation's guarantee could be broken, that a settings change stopped the game, and that the
published numbers rested on a simulator matched to the detector. The findings were fixed or documented as open limits. After
the review, two further holes were found while the proof of the theorem was being checked against the code
step by step, and a third, at the level of the engine's programming interface, in a final attack on the
proof; all three were reproduced, closed and covered by regression tests. Version 4.2, released outside
this work, was audited with the same method: rules that v4.2.1 added to the referee had broken this
guarantee (an adversarial fuzz test found 7 losses in 16,911 valid rounds), a correction for finger
coupling in Scissors turned honest Paper throws whose ring and little fingers lag behind into fouls, and
statistics sharing was switched on without its switch being touched; all three were fixed in v4.2.3 and
covered by regression tests. The implementation is verified by 126 automated tests. All experimental
results are simulation. No loss occurred in
59,684 valid rounds under the strictest preset (a consequence of the rule), nor in 17,404 valid rounds in
15,000 sessions of the same fuzz test, which also covers metronome mode. Against a synthetic player
matched to the detector's assumptions the AI won 94.8% of the attempts of a player who opens at an ordinary
time, and 5% ended without a result; that share ranged from 0.2% to 35.5% depending on when the fingers start
to open, and from 1.9% to 20.2% (at 30 fps) when the model was deliberately mismatched. Under a looser preset, freezing
the decision 40 ms before landing caused 2.8–3.2% losses; on average at most half of the final shape had formed
when the move was sealed (0.38–0.51 at 30 fps, 0.29–0.39 at 60 fps); posterior probabilities were under-confident (expected calibration
error 0.056); under high landmark noise 17–42% of the attempts were void; and the behavioural channel alone
earned only 0.02–0.10 net wins per round against a human-like player and nothing against a random one. No
human-subject study was conducted. The project owner's first
real-camera test failed: motion was tracked with a lag, the hand was lost on fast strokes and the
blur drifted onto the hand. The most likely causes were identified and fixed (measured twice with synthetic
frames on the same computer, hand tracking runs 2.5–2.9 times faster on the GPU; privacy now defocuses
everything but the hand). The only real-camera data are the local records of the rounds the owner played
afterwards under the strictest preset (one player, 79 records; 26 of the 46 judged rounds were valid and
the AI won all of them); v4.2.3 has not been tried with a real camera. A validation
protocol is provided.

**Keywords:** rock-paper-scissors; early action recognition; hand kinematics; commitment scheme; hash
chain; prediction with expert advice; safe opponent exploitation; calibration; explainable AI; scientific
honesty.
