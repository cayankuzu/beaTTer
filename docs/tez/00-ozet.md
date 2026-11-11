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
bağlanmıştır. Gerçekleme 105 otomatik testle sınanmıştır. Sayısal sonuçların tamamı
simülasyondur. En sıkı ayarda 58 452 geçerli turda kayıp gözlenmemiştir (kuralın sonucu); metronom kipini de kapsayan
15 000 oturumluk bir saldırı bulanık sınamasında da 14 579 geçerli turda kayıp yoktur. Dedektörün
varsayımlarıyla eşleşmiş sentetik bir oyuncuya karşı yapay zekâ, parmaklarını olağan zamanda açan oyuncunun
denemelerinin %94,5'ini kazanmış, %5'i sonuçsuz kalmıştır; sonuçsuz pay açılma zamanına göre %0,2 ile %35
arasında, model bilerek bozulduğunda %1,7 ile %23 arasında değişmiştir. Daha gevşek bir ayarda kararın
inişten 40 ms önce dondurulması %2–4 kayba yol açmış; karar çoğu turda nihai şeklin yaklaşık yarısı
oluşmuşken verilmiş; sonsal olasılıklar az güvenli çıkmış (beklenen kalibrasyon hatası 0,065); yüksek eklem
gürültüsünde denemelerin %22–59'u geçersiz kalmış; davranış kanalı tek başına insan benzeri bir oyuncuya
karşı tur başına yalnızca 0,02–0,12 net kazanç sağlamış, rastgele bir oyuncuya karşı ise hiçbir şey
kazanmamıştır. Gerçek insan verisi toplanmamış, gerçek bir kamerayla ölçüm yapılmamıştır (kamera yolu
yalnızca sentetik bir video akışıyla denenmiştir); bunun için bir doğrulama protokolü sunulmuştur.

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
proof; all three were reproduced, closed and covered by regression tests. The implementation is verified
by 105 automated tests. All numerical results are simulation. No loss occurred in
58,452 valid rounds under the strictest preset (a consequence of the rule), nor in 14,579 valid rounds of
an adversarial fuzz test of 15,000 sessions that also covers metronome mode. Against a synthetic player
matched to the detector's assumptions the AI won 94.5% of the attempts of a player who opens at an ordinary
time, and 5% ended without a result; that share ranged from 0.2% to 35% depending on when the fingers start
to open, and from 1.7% to 23% when the model was deliberately mismatched. Under a looser preset, freezing
the decision 40 ms before landing caused 2–4% losses; in most rounds the decision was made when roughly
half of the final shape had formed; posterior probabilities were under-confident (expected calibration
error 0.065); under high landmark noise 22–59% of the attempts were void; and the behavioural channel alone
earned only 0.02–0.12 net wins per round against a human-like player and nothing against a random one. No
human-subject data were collected and nothing was measured with a real camera (the camera path was only
exercised with a synthetic video stream); a validation protocol is provided.

**Keywords:** rock-paper-scissors; early action recognition; hand kinematics; commitment scheme; hash
chain; prediction with expert advice; safe opponent exploitation; calibration; explainable AI; scientific
honesty.
