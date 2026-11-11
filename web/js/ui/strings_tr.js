// @ts-check
/**
 * beaTTer v4 — every user-visible string (Turkish) and every number format.
 *
 * Honesty rules live here too: `fmt.*` renders null / undefined / NaN as "—", and nothing in this file
 * invents a number — message functions only format the parameters they are given.
 */

export const DASH = '—';
const MINUS = '−';

const ok = (/** @type {any} */ v) => typeof v === 'number' && Number.isFinite(v);

export const fmt = {
  /** 0.381 -> "%38" @param {number|null|undefined} p @param {number} [digits] */
  pct(p, digits = 0) {
    if (!ok(p)) return DASH;
    const v = /** @type {number} */ (p) * 100;
    const body = Math.abs(v).toFixed(digits).replace('.', ',');
    return `${v < 0 && Number(Math.abs(v).toFixed(digits)) !== 0 ? MINUS : ''}%${body}`;
  },
  /** plain number with a decimal comma @param {number|null|undefined} v @param {number} [digits] */
  num(v, digits = 0) { return ok(v) ? /** @type {number} */ (v).toFixed(digits).replace('.', ',').replace('-', MINUS) : DASH; },
  /** "142 ms" @param {number|null|undefined} v */
  ms(v) { return ok(v) ? `${Math.round(/** @type {number} */ (v)).toString().replace('-', MINUS)} ms` : DASH; },
  /** value with a unit, "—" when unknown @param {number|null|undefined} v @param {string} unit @param {number} [digits] */
  unit(v, unit, digits = 0) { return ok(v) ? `${fmt.num(v, digits)} ${unit}` : DASH; },
  /** time relative to landing: lead 142 -> "−142 ms", lead −30 -> "+30 ms" @param {number|null|undefined} leadMs */
  rel(leadMs) {
    if (!ok(leadMs)) return DASH;
    const v = Math.round(/** @type {number} */ (leadMs));
    return v === 0 ? '0 ms' : v > 0 ? `${MINUS}${v} ms` : `+${-v} ms`;
  },
  /** "A3F9 C2E1" @param {string|null|undefined} short */
  hash8(short) { return short ? `${String(short).slice(0, 4)} ${String(short).slice(4, 8)}`.toUpperCase().trim() : DASH; },
  /** full hash in groups of four @param {string} hash */
  hashGroups(hash) { return (String(hash).toUpperCase().match(/.{1,4}/g) ?? []).join(' '); },
  /** "[%84–%95]" @param {number|null|undefined} lo @param {number|null|undefined} hi */
  ci(lo, hi) { return ok(lo) && ok(hi) ? `[${fmt.pct(lo)}–${fmt.pct(hi)}]` : DASH; },
  /** honest p-value @param {number|null|undefined} p */
  pValue(p) {
    if (!ok(p)) return DASH;
    const v = /** @type {number} */ (p);
    if (v < 0.001) return 'p < 0,001';
    return `p = ${v.toFixed(v < 0.1 ? 3 : 2).replace('.', ',')}`;
  },
  /** mean ± sd (n) @param {{mean:number|null, sd:number|null, n:number}|null|undefined} x @param {string} unit */
  meanSd(x, unit) {
    if (!x || !ok(x.mean)) return DASH;
    return `${fmt.num(x.mean)} ± ${fmt.num(x.sd)} ${unit}`;
  },
  /** @param {number|null|undefined} bpm */
  bpm(bpm) { return ok(bpm) ? String(Math.round(/** @type {number} */ (bpm))) : DASH; },
};

export const MOVE_NAMES = ['Taş', 'Kağıt', 'Makas'];
export const MOVE_UPPER = ['TAŞ', 'KAĞIT', 'MAKAS'];
export const FINGER_NAMES = ['Baş', 'İşaret', 'Orta', 'Yüzük', 'Serçe'];
export const FINGER_LETTERS = ['B', 'İ', 'O', 'Y', 'S'];
export const RULE_NAMES = /** @type {Record<string, string>} */ ({ serbest: 'Serbest', standart: 'Standart', turnuva: 'Turnuva' });

/** @param {number|null|undefined} m */
export const moveName = (m) => (m === 0 || m === 1 || m === 2 ? MOVE_NAMES[m] : DASH);

/** Flat string table. */
export const T = {
  appName: 'beaTTer',
  skip: 'İçeriğe geç',

  // top bar
  modesLabel: 'Oyun modu',
  modeRps: 'Taş-Kağıt-Makas',
  modeTwin: 'MindTwin',
  seriesYou: 'SEN',
  seriesAi: 'YZ',
  lab: 'Laboratuvar',
  labTitle: 'Laboratuvar (L)',
  settings: 'Ayarlar',
  settingsTitle: 'Ayarlar (S)',
  sound: 'Ses',
  soundOn: 'Ses: açık (M)',
  soundOff: 'Ses: kapalı (M)',
  privacy: 'Gizlilik',
  privacyOn: 'Gizlilik: açık, yalnızca el net (P)',
  privacyOff: 'Gizlilik: kapalı (P)',
  rulesChip: 'Hakem',
  rulesTitle: 'Kurallar ve hakem ayarı',
  statusLocal: 'Yerel hafıza',
  statusNoStorage: 'Kayıt kapalı · yalnızca bu oturum',
  statusSim: 'Simülasyon · kaydedilmez',
  statusConnecting: 'Bulut: bağlanıyor',
  statusOnline: 'Bulut: çevrimiçi',
  statusOffline: 'Bulut: çevrimdışı · yerel hafıza',

  // stages
  camTag: 'KAMERA · SEN',
  camTagShort: 'SEN',
  aiTagLong: 'YAPAY ZEKÂ',
  aiTagShort: 'YZ',
  twinTagLong: 'DİJİTAL İKİZ',
  twinTagShort: 'İKİZ',
  simLabel: 'SİMÜLASYON — sentetik el',
  poseSearching: 'EL ARANIYOR',
  poseSeen: 'EL GÖRÜLDÜ',
  poseFist: 'YUMRUK · SAYIM',
  poseArmed: 'YUMRUK · HAZIR',
  poseOpening: 'HAVADA',
  poseLanded: 'İNDİ',
  poseNoSource: 'KAMERA KAPALI',
  fps: 'FPS',
  latency: 'gecikme',
  msUnit: 'ms',
  faceOn: 'Yalnızca el net',
  faceOnTitle: 'Gizlilik açık: görüntünün tamamı bulanık, yalnızca izlenen el net. El görülmediğinde her şey bulanıktır; görüntü cihazından çıkmaz.',
  faceFailed: 'Gizlilik çizilemedi · görüntü kapatıldı',
  faceOff: 'Gizlilik kapalı',
  metersCap: 'PARMAK AÇIKLIĞI',
  metersLabel: 'Parmak açıklığı ölçerleri',
  promptFree: 'Yumruğunu göster ve ritimle salla',
  promptMetronome: 'Yumruğunu göster, sayımı başlat',
  promptTwin: 'Elini kameraya göster ve parmaklarını oynat',
  camCanvasLabel: 'Kamera görüntüsü üzerinde 21 eklemli el iskeleti',
  camCanvasDemoLabel: 'Simülasyon: sentetik elin 21 eklemli iskeleti (kamera görüntüsü değildir)',

  // camera gate
  gateIdleTitle: 'Oynamak için kamerayı aç',
  gateIdleText: 'Görüntü cihazından çıkmaz; el takibi tarayıcında çalışır. Kamera istemiyorsan sentetik bir oyuncuyla demoyu izleyebilirsin.',
  gateOpen: 'Kamerayı aç',
  gateDemo: 'Kamerasız demo',
  gateRetry: 'Yeniden dene',
  gateStartingTitle: 'Kamera hazırlanıyor',
  gateStepCamera: 'Kamera izni ve görüntü',
  gateStepModel: 'El takip modeli (yaklaşık 8 MB)',
  gateStepWaiting: 'bekleniyor',
  gateStepLoading: 'yükleniyor',
  gateStepReady: 'hazır',
  gateStepFailed: 'başarısız',
  gateDevice: 'Kamera seç',
  gateErrorDetail: 'Teknik ayrıntı',

  // AI stage
  aiHandLabelFist: 'Yapay zekânın mekanik eli, yumruk hâlinde',
  aiCapIdle: 'Hazır · ritmini bekliyor',
  aiCapPriming: 'Ritme eşlik ediyor',
  aiCapSealed: 'Hamle mühürlü · inişte açılır',
  aiCapFlight: 'El havada · karar bekliyor',
  aiCapNoSource: 'Kamera ya da demo bekleniyor',
  sealNone: 'MÜHÜRLENMEDİ',
  sealNoneNote: 'Hamle, elin inmeden önce mühürlenir.',
  sealOn: 'MÜHÜRLENDİ',
  sealHashSr: 'SHA-256 özetinin ilk 8 hanesi: ',
  sealVerified: 'doğrulandı',
  sealFailed: 'DOĞRULANAMADI',
  sealSeqSr: 'mühür ',
  beliefPrior: 'Davranış beklentisi',
  beliefLive: 'Canlı tahmin',
  beliefSub: ' · senin hamlen',
  beliefKey: 'öncül',
  beliefVeiled: 'gizli',
  beliefVeiledTitle: 'Canlı tahmin gizli',
  expertLead: 'En etkili uzman: ',
  expertNone: 'Uzman ağırlığı yok',
  aiMetaRules: 'Hakem: ',

  // MindTwin
  twinTitle: 'Öngörü becerisi (ölçülen)',
  twinSkill: 'beceri',
  twinN: 'Değerlendirilen öngörü',
  twinMaeForecast: 'Ortalama hata · öngörü',
  twinMaePersist: 'Ortalama hata · “el yerinde kalır”',
  twinAgreement: 'Açık/kapalı uyumu',
  twinHorizon: 'Öngörü ufku',
  twinNote: 'Beceri = 1 − (öngörü hatası / “el yerinde kalır” hatası). Sıfırın üstü, öngörünün bu basit varsayımı yendiği anlamına gelir; sıfır ve altı, yenmediği.',
  twinNoteShort: 'Sıfırın üstü: öngörü, “el yerinde kalır” varsayımını yeniyor.',
  twinNoData: 'Henüz değerlendirilen öngörü yok: elini göster ve parmaklarını oynat.',
  twinNow: 'şimdi',
  twinAheadSr: 'öngörü',
  twinBarsLabel: 'Parmak başına şimdiki ve öngörülen açıklık',
  twinCap: 'Dolu el: öngörü · kesikli çizgi: şimdi',

  // console
  consoleLabel: 'Ritim ve sinyal konsolu',
  beatsLabel: 'Ritim vuruşları',
  beatWords: /** @type {Record<number, string[]>} */ ({ 3: ['TAŞ', 'KAĞIT', 'MAKAS', 'VUR!'], 2: ['TAŞ', 'KAĞIT', 'VUR!'], 0: ['VUR!'] }),
  bpm: 'BPM',
  tempoNone: 'ritim bekleniyor',
  tempoNoneSr: 'tempo henüz ölçülmedi',
  scopeLabel: 'Canlı zaman şeridi: avuç yüksekliği, parmak açıklığı, vuruşlar ve mühürler',
  lgPalm: 'avuç',
  lgFront: 'ön parmak',
  lgBack: 'arka parmak',
  lgSeal: 'mühür',
  lgLand: 'iniş',
  scopeGrid: 'ızgara 100 ms',
  scopeIdle: 'sinyal bekleniyor',
  scopeLanding: 'iniş',
  scopeLandingHat: 'iniş (tahmin)',
  thoughtKey: 'DÜŞÜNCE',
  startCount: 'Sayımı başlat',
  nextRound: 'Sonraki tur',
  keySpace: 'Boşluk',
  hintFree: 'Yumruğunu göster ve ritimle salla',
  hintCounting: 'Sayım sürüyor',
  hintInRound: 'Tur sürüyor',
  hintNoSource: 'Önce kamerayı aç ya da demoyu başlat',
  hintTwin: 'MindTwin: skor yok, yalnızca öngörü',

  // report
  reportTitle: 'Tur Raporu',
  reportClose: 'Raporu kapat ve sonraki tura geç',
  reportBody: 'Rapor içeriği',
  you: 'SEN',
  winner: 'KAZANAN',
  notRecognised: 'tanınmadı',
  heroH: 'Karar zamanı',
  heroPre: 'Karar: inişten',
  heroBefore: 'önce',
  heroAfter: 'sonra',
  tlCap: 'TUR ZAMAN ÇİZELGESİ · inişe göre ms',
  tlFront: 'ön parmaklar (işaret + orta)',
  tlBack: 'arka parmaklar (yüzük + serçe)',
  tlRead: 'açılma olasılığı (YZ okuması)',
  tlPalm: 'avuç yüksekliği',
  tlSeal: 'mühür',
  tlDone: 'şekil tamamlandı',
  tlLand: 'iniş',
  whyH: 'Neden bu hamle?',
  beliefAtSeal: 'Mühür anındaki tahmin',
  beliefNone: 'Bu mühür için kayıtlı bir tahmin yok.',
  topExpert: 'En etkili davranış uzmanı:',
  weight: 'ağırlık',
  chainH: 'Mühür zinciri',
  chainAside: 'SHA-256 · bu oturumun zinciri',
  thSeq: 'Sıra',
  thTime: 'Zaman',
  thReason: 'Neden',
  thMove: 'Hamle',
  thHash: 'Özet',
  thStatus: 'Durum',
  reasons: /** @type {Record<string, string>} */ ({ BEHAVIOUR: 'Davranış', KINEMATIC: 'Kinematik', REVISION: 'Revizyon' }),
  verified: 'Doğrulandı',
  verifyFailed: 'Doğrulanamadı',
  postLanding: 'iniş sonrası · değerlendirilmedi',
  judged: 'bağlayıcı',
  verifySelf: 'Kendin doğrula',
  verifyPayload: 'MÜHÜR İÇERİĞİ (UTF-8)',
  verifyHash: 'SHA-256 ÖZETİ',
  verifyBtn: 'Tarayıcıda yeniden hesapla',
  verifyHint: 'İki bağımsız uygulamayla bu cihazda hesaplanır',
  verifyOwn: 'KENDİ SHA-256 UYGULAMAMIZ',
  verifyWeb: 'WEB CRYPTO (TARAYICI)',
  verifyNoCrypto: 'güvenli bağlam yok',
  verifyMatch: 'Eşleşiyor: içerik bu özete bağlı.',
  verifyMismatch: 'EŞLEŞMİYOR: içerik bu özeti üretmiyor.',
  verifyNote: 'İçerikteki hamle ve zaman, el inmeden önce yayımlanan bu özete bağlıdır; biri değişseydi özet de değişirdi. İçerikteki zaman, kararın dayandığı kameranın kare zamanıdır; özetin fiilen hesaplandığı an ölçümlerde “duvar saati” satırında ayrıca verilir. Zaman damgaları bu cihazın kendi saatidir.',
  metricsH: 'Bu turun ölçümleri',
  mOnsetFront: 'Açılma başlangıcı · ön parmaklar',
  mOnsetBack: 'Açılma başlangıcı · arka parmaklar',
  mOpening: 'Açılma süresi (ön)',
  mPeakVel: 'En yüksek parmak hızı',
  mVSpread: 'V açıklığı (işaret–orta)',
  mTracked: 'İzlenen kare payı (havada)',
  mFps: 'Kare hızı (havada)',
  mLandingSrc: 'İniş kaynağı',
  mHeadFront: 'Hakem okuması · ön (inişten önce)',
  mHeadBack: 'Hakem okuması · arka (inişten önce)',
  mFlight: 'Uçuş süresi',
  mToComplete: 'Mühür → şekil tamam',
  mToLanding: 'Mühür → iniş (kare zamanı)',
  mWallLead: 'Mühür → iniş (duvar saati)',
  mSealLatency: 'Kare → mühür gecikmesi',
  mLastInAir: 'Son havadaki karenin yaşı',
  mProgress: 'Mühür anında şeklin oluşma payı',
  mNoise: 'Ölçüm gürültüsü (SS)',
  mRules: 'Hakem ayarı',
  beforeLanding: 'inişten önce',
  landingSources: /** @type {Record<string, string>} */ ({ stroke: 'vuruş (avuç hareketi)', soft: 'yumuşak iniş (duraksama)', metronome: 'metronom penceresi', schedule: 'metronom penceresi' }),
  degPerS: '°/sn',
  deg: '°',

  // series
  seriesTitle: 'Seri bitti',
  seriesRounds: 'Turlar',
  seriesNew: 'Yeni seri',
  seriesAiWon: 'SERİYİ YAPAY ZEKÂ ALDI',
  seriesYouWon: 'SERİYİ SEN ALDIN',
  seriesDraw: 'SERİ BERABERE',
  thRound: 'Tur',
  thYou: 'Sen',
  thAi: 'YZ',
  thLead: 'Karar',
  thSeal: 'Mühür',
  thResult: 'Sonuç',
  resAi: 'YZ',
  resYou: 'Sen',
  resTie: 'Berabere',

  // lab
  labMetaLocal: 'tüm ölçümler bu cihazda hesaplanır',
  labBack: 'Arenaya dön',
  labCards: 'Laboratuvar kartları',
  labFoot: 'Demo modundaki veriler simülasyondur ve kaydedilmez. Önceki sürümlerin (v2/v3) kayıtları içe aktarılmaz: o turlarda YZ hamlesi mühürlenmediği için yeni istatistikleri bozardı.',
  labSimNote: 'Bu kartlardaki sayılar SİMÜLASYON verisidir: sentetik bir elin sentetik turları. Gerçek oyuncu ölçümü değildir.',
  emptyTitle: 'Henüz veri yok',
  emptyScore: 'İlk geçerli turdan sonra skor, oran ve güven aralıkları burada görünür.',
  emptyLead: 'Karar zamanı dağılımı için en az bir geçerli tur gerekir.',
  emptyPred: 'Tahmin kalitesi, mühür anındaki olasılıklar gerçek hamleyle karşılaştırılarak ölçülür; henüz karşılaştırılacak tur yok.',
  emptyBeh: 'Davranış kanalının tek başına ne yapacağı her geçerli turda ayrıca hesaplanır; henüz tur yok.',
  emptyProfile: 'Hamle sıklığın ve alışkanlıkların ilk turlardan sonra burada belirir.',
  emptyKin: 'Parmak açılma ölçümlerin ilk kağıt/makas turlarından sonra dolar.',
  cScore: 'Skor',
  cScoreMeta: 'YZ açısından',
  win: 'galibiyet', tie: 'beraberlik', loss: 'mağlubiyet',
  W: 'G', D: 'B', L: 'M',
  winRate: 'KAZANMA ORANI · %95 Wilson aralığı',
  unbeaten: 'KAYBETMEME · geçerli turlarda · %95 aralık',
  attemptWin: 'TÜM DENEMELERDE KAZANMA · %95 aralık',
  noResult: 'SONUÇSUZ DENEME (faul + geçersiz) · %95 aralık',
  condNote: 'Üstteki oranlar yalnızca geçerli turları sayar. Turnuva hakeminde bir turun geçerli olması, YZ’nin de baktığı havadaki karelere bağlıdır; bu yüzden “kaybetmeme” kuralın sonucudur, tahmin başarısının ölçüsü değildir. Sistemin gerçek başarımı alttaki iki satırdır: bütün denemeler içinde kazanılanlar ve sonuçsuz kalanlar.',
  attempts: 'deneme',
  chance: 'şans %33',
  last20: 'SON TURLAR · eskiden yeniye',
  pNote: '(H0: geçerli turlarda kazanma olasılığı ≤ 1/3 · tek yönlü kesin binom testi)',
  roundsValid: 'geçerli',
  roundsFouls: 'faul',
  roundsVoids: 'geçersiz',
  cLead: 'Karar zamanı',
  cLeadMeta: 'bağlayıcı mühür → iniş',
  median: 'MEDYAN',
  iqr: 'ÇEYREKLER ARASI',
  meanProgress: 'ORT. OLUŞMA PAYI',
  heldShare: 'HAREKETTEN ÖNCE KARAR',
  heldShareNote: 'yalnızca davranışla mühürlenip değişmeyen turlar',
  kinLead: 'EL OKUYARAK VERİLEN KARAR · medyan',
  kinLeadNote: 'davranış mührü değişmeyen turlar hariç',
  leadAxis: 'inişe kalan süre (ms)',
  leadRounds: 'tur',
  sparkLabel: 'Turlara göre karar zamanı (ms)',
  cPred: 'Tahmin kalitesi',
  accuracy: 'İSABET',
  accuracyNote: 'en olası tahmin doğru',
  brier: 'BRIER',
  brierNote: '0 kusursuz · 0,67 şans',
  logloss: 'LOG-KAYIP',
  loglossNote: 'bit · 1,58 şans',
  infoGain: 'BİLGİ KAZANCI',
  infoGainNote: 'bit/tur · en çok 1,58',
  ece: 'KALİBRASYON HATASI (ECE)',
  eceNote: '0 kusursuz',
  relX: 'öngörülen güven (%)',
  relY: 'gerçekleşen (%)',
  relNote: 'Kesikli köşegen: kusursuz kalibrasyon. Nokta alanı tur sayısıyla orantılıdır.',
  cBeh: 'Davranış kanalı',
  cBehMeta: 'yalnızca geçmiş hamleler',
  behOnlyRate: 'TEK BAŞINA KAZANMA ORANI · %95 aralık',
  behNote: 'Kinematik kanıt hiç kullanılmasaydı davranış modelinin seçeceği hamlenin sonucu (karşı-olgusal).',
  safetyLambda: 'Sömürü payı (λ)',
  safetyBudget: 'Güvenlik bütçesi',
  fusionPrior: 'Füzyon ağırlığı · davranış',
  fusionKin: 'Füzyon ağırlığı · kinematik',
  cProfile: 'Davranış profilin',
  freqH: 'HAMLE SIKLIĞI · çentik: eşit dağılım',
  respH: 'ÖNCEKİ TURDAN SONRA · çubuk: sen · çentik: literatür',
  respCaption: 'Önceki tur sonucuna göre sonraki hamle',
  respPrev: 'Önceki tur sonucu',
  stay: 'aynı', up: 'bir üst', down: 'bir alt',
  afterWin: 'kazanınca', afterTie: 'berabere', afterLoss: 'kaybedince',
  lit: 'lit.',
  litNote: 'Literatür tabanı: Forder ve Dyson (2016).',
  thinData: 'az veri',
  entropy: 'Hamle entropisi',
  entropyUnit: 'bit (en çok 1,58)',
  transitions: 'geçiş',
  cKin: 'Kinematik profilin',
  kOnsetFront: 'Açılma başlangıcı · ön',
  kOnsetBack: 'Açılma başlangıcı · arka',
  kOpening: 'Açılma süresi (medyan)',
  kGroupDelay: 'Ön → arka gecikmesi',
  kNoise: 'Ölçüm gürültüsü (SS)',
  kDescent: 'Atış inişi (ortalama)',
  kApex: 'Tepe → iniş (ortalama)',
  kBias: 'Son vuruş aralığı sapması',
  prior: 'önsel',
  kinNote: 'n = 0 olan satırlar henüz ölçülmedi; gösterilen değer başlangıç önselidir.',
  cData: 'Veri ve gizlilik',
  cDataMeta: 'bu cihazda',
  keepSr: 'Saklanır: ',
  keep1: 'Hamle ve sonuç geçmişi',
  keep2: 'Zamanlama ölçümleri: tempo, açılma başlangıcı ve süresi',
  keep3: 'Mühür zinciri ve bu oturumun tur sonuçları: mühür içeriği, SHA-256 özetleri, hükümler ve ölçümler (yalnızca bu oturum; dışa aktarılabilir)',
  keepNo: 'Saklanmaz: kamera görüntüsü, yüz, ham el noktaları',
  keepWhere: 'Yer: bu tarayıcının yerel deposu (localStorage).',
  keepWhereOff: 'Tarayıcı deposu kullanılamıyor: veriler yalnızca bu oturumda, bellekte tutuluyor.',
  keepWhereSim: 'Demo modu: simülasyon verisi hiçbir yere kaydedilmez ve gönderilmez.',
  cloudSwitch: 'Anonim istatistik eşitleme',
  cloudNote: 'Açıkken yalnızca geçerli turların hamleleri, sonucu ve ölçülen zamanlamaları gönderilir; görüntü ve el noktaları hiçbir zaman.',
  on: 'AÇIK', off: 'KAPALI',
  exportJson: 'Dışa aktar (JSON)',
  resetMemory: 'Hafızayı sıfırla',
  resetConfirm: 'Bu oyuncu hakkında öğrenilen her şey (hamle geçmişi, profil, istatistikler) silinecek. Geri alınamaz.',
  resetYes: 'Evet, sıfırla',
  cancel: 'Vazgeç',
  profilesH: 'OYUNCU PROFİLLERİ',
  profileActive: 'etkin',
  profileNew: 'Yeni profil adı (isteğe bağlı)',
  profileCreate: 'Oluştur',
  profileDelete: 'Profili sil',
  profilesDemo: 'Demo modunda profiller değiştirilemez.',

  // settings
  gReferee: 'HAKEM',
  gRhythm: 'RİTİM',
  gGame: 'OYUN',
  gDisplay: 'GÖRÜNTÜ VE SES',
  gAdvanced: 'GELİŞMİŞ',
  gKeys: 'KLAVYE KISAYOLLARI',
  sRules: 'Hakem ayarı',
  ruleDesc: /** @type {Record<string, string>} */ ({
    turnuva: 'Ön parmaklar el inmeden önce ölçülebilir biçimde açılmadıysa yalnızca taş geçerlidir; sonradan açılan hamle fauldür ve tur tekrarlanır. Bu ayarda YZ geçerli bir turu kural gereği kaybetmez; bedeli, geç açanlarda artan faul sayısıdır.',
    standart: 'Belirsiz bölge bırakır; insan meşru biçimde kazanabilir. Dengeli eşikler.',
    serbest: 'Belirsiz bölge bırakır; insan meşru biçimde kazanabilir. En geniş tolerans, en az faul.',
  }),
  sRhythm: 'Ritim',
  rhythmFree: 'Serbest',
  rhythmMetronome: 'Metronom',
  rhythmDesc: 'Serbest: ritmi sen belirlersin, yumruğunu sallarsın. Metronom: sayımı uygulama verir.',
  sPrime: 'Hazırlık vuruşu',
  primeDesc: '3: taş-kağıt-makas-VUR · 2: taş-kağıt-VUR · 0: tek atış.',
  sBpm: 'Metronom temposu',
  sSensitivity: 'Vuruş hassasiyeti',
  sensitivityDesc: '1: yalnızca belirgin sallamalar sayılır · 5: küçük hareketler de sayılır.',
  sSeries: 'Seri uzunluğu',
  seriesUnit: 'tur',
  sPrivacy: 'Gizlilik: yalnızca el net',
  sPrivacyDesc: 'Kamera görüntüsünün tamamı bulanıklaştırılır, yalnızca izlenen elin net görünür. El görülmediğinde her şey bulanıktır.',
  sSound: 'Ses',
  sVoice: 'Sesli sayım',
  sVoiceDesc: 'Vuruş sözcükleri ve sonuç sesli okunur.',
  sLive: 'Canlı tahmini göster',
  sLiveDesc: 'Kapalıyken tur sırasında olasılık çubukları gizlenir; sonuçla birlikte açılır.',
  sMotion: 'Hareketi azalt',
  motionAuto: 'Sistem', motionOn: 'Açık', motionOff: 'Kapalı',
  sFreeze: 'Karar ufku',
  freezeDesc: 'İnişe bu süreden az kaldığında mühür artık yenilenmez. 0 = sınır yok (YZ son ana kadar yenileyebilir). Turnuva hakeminde etkisizdir: orada hakem eli son havadaki kareye kadar okur, YZ daha erken bakmayı bırakırsa geçerli bir hamleye kaybedebilirdi.',
  sDemo: 'Kamerasız demo',
  demoStart: 'Demoyu başlat',
  demoStop: 'Demoyu durdur',
  demoDesc: 'Sentetik bir el aynı motorla oynar; veriler simülasyondur ve kaydedilmez.',
  sCamera: 'Kamera',
  sOnboarding: 'Tanıtımı yeniden göster',
  close: 'Kapat',
  keys: /** @type {[string[], string][]} */ ([
    [['Boşluk', 'Enter'], 'Sayımı başlat / sonraki tur'],
    [['L'], 'Laboratuvar'],
    [['S'], 'Ayarlar'],
    [['M'], 'Sesi aç/kapat'],
    [['P'], 'Gizlilik (yalnızca el net)'],
    [['D'], 'Demoyu başlat/durdur'],
    [['Esc'], 'Açık paneli ya da raporu kapat; tur sürerken turu durdur'],
  ]),

  // onboarding
  onbEyebrow: 'İLK ZİYARET',
  onbTitle: 'Hamleni havada okuyan rakip',
  onbLead: 'beaTTer, kamera önünde oynanan bir taş-kağıt-makas oyunudur: yapay zekâ hamleni elin daha havadayken okur, kendi hamlesini el inmeden mühürler ve bunu sana kanıtlar.',
  onbRulesH: 'ÜÇ KURAL',
  onbRule1: 'Yumruğunu göster, ritimle 3 kez salla',
  onbRule2: '4. vuruşta hamleni havada aç',
  onbRule3: 'El indikten sonra şekil değiştirmek fauldür (geç hamle)',
  onbPrivacy: 'Görüntü cihazından çıkmaz. Yalnızca elin net görünür; yüzün ve odanın geri kalanı bulanıklaştırılır.',
  onbOptin: 'Anonim oyun istatistiklerini paylaş (isteğe bağlı)',
  onbOptinDesc: 'Açarsan yalnızca hamleler, sonuç ve ölçülen zamanlamalar gönderilir; görüntü ya da el noktaları asla gönderilmez.',
  onbOpen: 'Kamerayı aç',
  onbDemo: 'Kamerasız demoyu izle',
  onbSkip: 'Şimdilik geç',

  // rules explainer
  rulesH: 'Kurallar',
  rules3H: 'Üç kural',
  rules3: ['Yumruğunu göster ve ritimle salla (ya da metronom sayımını bekle).', 'Son vuruşta hamleni el havadayken aç: taş, kağıt ya da makas.', 'Taş makası kırar, makas kağıdı keser, kağıt taşı sarar.'],
  rulesLateH: 'Geç hamle kuralı',
  rulesLate: 'Şekil el inmeden önce havada oluşmalıdır. El indikten sonra açılan ya da kapanan parmaklar geç hamledir: tur faul sayılır, skora işlenmez ve tekrar oynanır. Hakem yalnızca inişten önceki parmak yönüne ve inen şekle bakar; YZ’nin hamlesine bakmaz.',
  rulesPresetH: 'Hakem ayarları',
  rulesActive: 'ETKİN',
  rulesSealH: 'Mühür neyi kanıtlar, neyi kanıtlamaz?',
  rulesSealYes: 'YZ hamlesini rastgele bir tuzla birlikte SHA-256 ile özetler ve özeti el inmeden önce ekranda yayımlar. Tur bitince içerik açılır: içerik aynı özeti veriyorsa hamle sonradan değiştirilmemiştir. Her mühür bir öncekinin özetini içerir; aradan mühür çıkarılamaz.',
  rulesSealNo: 'Kanıtlamadığı şey: zaman damgaları bu cihazın kendi saatidir, bağımsız bir tanık yoktur. Mühür, hamlenin değişmediğini kanıtlar; ne zaman mühürlendiğini ise bu sayfanın kendi ölçümü söyler. Rapordaki “Kendin doğrula” ile özeti tarayıcında yeniden hesaplayabilirsin.',
  rulesChange: 'Hakem ayarını değiştir',
  rulesBody: 'Kurallar metni',
  seriesBody: 'Seri özeti',

  // misc
  liveDemoOn: 'Kamerasız demo başladı: simülasyon, sentetik el.',
  liveDemoOff: 'Demo durduruldu.',
  liveCameraOn: 'Kamera açıldı.',
  liveCameraStarting: 'Kamera hazırlanıyor.',
  dismiss: 'Bildirimi kapat',
  exportName: 'beatter-veri',
};

/** @param {string} name @param {number} [rotation] */
export function expertLabel(name, rotation = 0) {
  let base = name;
  let m;
  if (name.startsWith('freq_')) base = 'sıklık';
  else if ((m = /^markovP_(\d+)$/.exec(name))) base = `Markov-${m[1]} (kendi hamlelerin)`;
  else if (/^markovA_/.test(name)) base = 'YZ’nin son hamlesine tepki';
  else if ((m = /^markovJ_(\d+)$/.exec(name))) base = `ortak Markov-${m[1]}`;
  else if (/^shiftO(1|2|M)$/.test(name)) base = 'sonuca göre kaydırma';
  else if (/^shiftSeq_/.test(name)) base = 'rotasyon alışkanlığı';
  else if (/^ctw/.test(name)) base = 'bağlam ağacı (CTW)';
  else if (name === 'ppmP') base = 'PPM';
  else if (/^self/.test(name)) base = 'ayna (seni modelleyen sen)';
  else if (name === 'population') base = 'topluluk önseli';
  else if (name === 'uniform') base = 'Nash (rastgele)';
  const rot = rotation === 1 ? ' · +1 ikinci tahmin' : rotation === 2 ? ' · +2 ikinci tahmin' : '';
  return base + rot;
}

const BEATS_RULE = ['Taş makası kırar', 'Kağıt taşı sarar', 'Makas kağıdı keser'];

/** "Taş makası kırar" for the winning move. @param {number} winner */
export const beatsRule = (winner) => BEATS_RULE[winner] ?? '';

const toLanding = (/** @type {any} */ p) => (p && ok(p.msToLanding) ? ` · inişe ~${Math.round(p.msToLanding)} ms` : '');

/**
 * One Turkish sentence per THOUGHT_CODE (core/round_engine.js).
 * @param {{code:string, params:any}|null|undefined} thought
 * @param {{source:string, hidden:boolean}} ctx hidden = live beliefs are switched off for this phase
 */
export function thoughtText(thought, ctx) {
  if (ctx.source === 'none') return 'Kamera ya da demo bekleniyor.';
  if (!thought) return DASH;
  const p = thought.params ?? {};
  switch (thought.code) {
    case 'WAITING_HAND': return 'El bekleniyor: yumruğunu kameraya göster.';
    case 'PRIOR_READY':
      if (!p.rounds) return 'Henüz geçmiş yok: üç hamle de eşit olası; ilk kararı kinematik verecek.';
      // one line on most screens: the rotation of the expert is spelled out in the belief panel and in the report
      return `Davranış beklentisi: ${moveName(p.move)} (${fmt.pct(p.p)}) · uzman: ${expertLabel(String(p.expert))}`;
    case 'COUNTING':
      return p.beat > 0 ? `Sayım ${p.beat}/${p.primeBeats}: yumruk kapalı, davranış beklentisi hazır.` : 'Sayım başlıyor: yumruğunu ritimle salla.';
    case 'ARMED': return 'Hazır: yumruk sabit, atışını bekliyor.';
    case 'FLIGHT_WATCHING': return `El havada: parmaklar izleniyor${toLanding(p)}`;
    case 'ONSET_FRONT': return ctx.hidden ? `Parmaklar açılmaya başladı${toLanding(p)}` : `Ön parmaklar açılıyor: kağıt mı makas mı, ayrışması bekleniyor${toLanding(p)}`;
    case 'PAPER_LIKELY': return ctx.hidden ? `Parmaklar açılıyor${toLanding(p)}` : `Dört parmak birlikte açılıyor: kağıt olası${toLanding(p)}`;
    case 'SCISSORS_LIKELY': return ctx.hidden ? `Parmaklar açılıyor${toLanding(p)}` : `İşaret ve orta açılıyor, yüzük ve serçe kapalı: makas olası${toLanding(p)}`;
    case 'ROCK_BY_ABSENCE': return ctx.hidden ? `El havada: parmaklar izleniyor${toLanding(p)}` : `Açılma görülmüyor: taş olasılığı yükseliyor${toLanding(p)}`;
    case 'LANDED': return 'El indi: inen şekil doğrulanıyor.';
    case 'RESULT': return `Tur bitti: ${verdictHeadline(p.verdict).toLocaleLowerCase('tr')}. Mühürler açıldı; ayrıntılar raporda.`;
    default: return DASH;
  }
}

const HEADLINES = /** @type {Record<string, string>} */ ({
  AI: 'YAPAY ZEKÂ KAZANDI',
  PLAYER: 'SEN KAZANDIN',
  TIE: 'BERABERE',
  FOUL_LATE: 'FAUL: GEÇ HAMLE',
  VOID_NO_HAND: 'GEÇERSİZ: EL İZLENEMEDİ',
  VOID_UNKNOWN: 'GEÇERSİZ: ŞEKİL TANINMADI',
  VOID_NO_FIST: 'GEÇERSİZ: YUMRUK YOKTU',
});

/** @param {string|null|undefined} verdict */
export const verdictHeadline = (verdict) => (verdict && HEADLINES[verdict]) || DASH;

/** One sentence under the verdict headline. @param {any} r RoundResult */
export function verdictSentence(r) {
  switch (r.verdict) {
    case 'AI': return `${beatsRule(r.aiMove)}.`;
    case 'PLAYER': return `${beatsRule(r.playerMove)}.`;
    case 'TIE': return `İkiniz de ${moveName(r.playerMove).toLocaleLowerCase('tr')} oynadınız.`;
    case 'FOUL_LATE':
      return r.explanation && r.explanation.code === 'FOUL_LATE_CLOSE'
        ? 'El havada açıktı, inişten sonra kapandı. Tur sayılmadı; tekrar oynanır.'
        : 'El indikten sonra açıldı. Tur sayılmadı; tekrar oynanır.';
    case 'VOID_NO_HAND': return 'İnişten hemen önce el izlenemedi (kadraj dışı ya da bulanık). Tur sayılmadı; tekrar oynanır.';
    case 'VOID_UNKNOWN': return 'İnen şekil taş, kağıt ya da makas olarak tanınamadı. Tur sayılmadı; tekrar oynanır.';
    case 'VOID_NO_FIST': return 'Sayım sırasında el yumruk değildi; açılma ölçülemez. Tur sayılmadı; tekrar oynanır.';
    default: return DASH;
  }
}

/**
 * One Turkish sentence (or two) per EXPLANATION_CODE (core/round_engine.js) with its parameters.
 * @param {{code:string, params:any}|null|undefined} ex
 */
export function explanationText(ex) {
  if (!ex) return DASH;
  const p = ex.params ?? {};
  const ai = moveName(p.aiMove).toLocaleLowerCase('tr');
  switch (ex.code) {
    case 'HELD_BEHAVIOUR':
      return `Karar hareketten önce verildi: yalnızca geçmiş hamlelerinden öğrenilen davranış modeli kullanıldı ve hamle ${ai} olarak mühürlendi. Havadaki parmak hareketin bu kararı değiştirecek bir kanıt üretmedi.`;
    case 'ROCK_BY_ABSENCE':
      return 'El inişe yaklaşırken parmaklarında ölçülebilir bir açılma görülmedi: açılmanın yokluğu taşa işaret eder. Taşa karşı en iyi hamle kağıt.';
    case 'RESOLVED_PAPER':
      return 'Dört parmağın birlikte açıldı: bu, kağıdın imzası. Kağıda karşı en iyi hamle makas.';
    case 'RESOLVED_SCISSORS':
      return 'İşaret ve orta parmağın açılırken yüzük ve serçe parmağın kapalı kaldı: bu, makasın imzası. Makasa karşı en iyi hamle taş.';
    case 'SAFE_SCISSORS':
      return 'Ön parmakların açıldı ama kağıt mı makas mı olduğu mühür anında henüz ayrışmamıştı. Makas iki olasılığa karşı da kaybetmez (kağıdı keser, makasla berabere kalır); bu yüzden makas mühürlendi.';
    case 'REVISED_AFTER_FEINT':
      return `Hareketin sırasında kanıt yön değiştirdi (aldatma ya da tereddüt): mühür ${ok(p.revisions) ? `${p.revisions} kez ` : ''}yenilendi ve son kanıta göre ${ai} seçildi.`;
    case 'GAMBLE_AMBIGUOUS':
      return `Mühür anında kanıt hiçbir hamleyi dışlayamıyordu: beklenen kazancı en yüksek hamle (${ai}) seçildi. Bu bir tahmindi, kesinlik değil.`;
    case 'KINEMATIC':
      return `Karar, parmaklarının havadaki açılma hareketine göre verildi ve hamle ${ai} olarak mühürlendi.`;
    case 'FOUL_LATE_OPEN': return 'Faul (geç hamle): el indikten sonra açıldı. YZ’nin mühürlü hamlesi açıklandı ama tur skora işlenmedi; tekrar oynanır.';
    case 'FOUL_LATE_CLOSE': return 'Faul (geç hamle): el havada açıktı, inişten sonra kapandı. YZ’nin mühürlü hamlesi açıklandı ama tur skora işlenmedi; tekrar oynanır.';
    case 'VOID_NO_HAND': return 'Geçersiz tur: inişten hemen önce el izlenemedi. Hakem karar veremez; tur tekrar oynanır.';
    case 'VOID_UNKNOWN': return 'Geçersiz tur: inen şekil üç hamleden biri olarak tanınamadı. Tur tekrar oynanır.';
    case 'VOID_NO_FIST': return 'Geçersiz tur: sayım sırasında el yumruk değildi, bu yüzden açılma ölçülemedi. Tur tekrar oynanır.';
    default: return DASH;
  }
}

/** @param {'AI'|'PLAYER'|'TIE'|null|undefined} wouldBe */
export function counterfactualText(wouldBe) {
  if (wouldBe === 'AI') return 'Yalnızca davranış modeliyle: kazanırdı.';
  if (wouldBe === 'PLAYER') return 'Yalnızca davranış modeliyle: kaybederdi.';
  if (wouldBe === 'TIE') return 'Yalnızca davranış modeliyle: berabere.';
  return `Yalnızca davranış modeliyle: ${DASH}`;
}

const TOASTS = /** @type {Record<string, string>} */ ({
  ABORT_HAND_LOST: 'El kadrajdan çıktı: tur iptal edildi. Yumruğunu yeniden göster.',
  ABORT_RHYTHM: 'Ritim yarım kaldı: tur iptal edildi. Baştan salla.',
  ABORT_MANUAL: 'Tur durduruldu.',
  MEMORY_RESET: 'Hafıza sıfırlandı: bu oyuncu için öğrenilen her şey silindi.',
  ENGINE_ERROR: 'Beklenmeyen bir hata oluştu: tur iptal edildi, oyun sürüyor.',
});
/**
 * @param {string} code
 * @param {{seals?: number, sealOk?: boolean}|null} [params] an aborted round reports what happened to its seals
 */
export const toastText = (code, params = null) => {
  const base = TOASTS[code] ?? code;
  if (!params || !params.seals) return base;
  return `${base} ${params.sealOk === false ? 'UYARI: iptal edilen turun mührü doğrulanamadı.' : `İptal edilen turun ${params.seals > 1 ? `${params.seals} mührü` : 'mührü'} açıldı ve doğrulandı.`}`;
};

const CAMERA_ERRORS = /** @type {Record<string, {title:string, help:string}>} */ ({
  CAMERA_DENIED: { title: 'Kamera izni verilmedi', help: 'Adres çubuğundaki kamera simgesinden bu site için izni aç, sonra yeniden dene.' },
  CAMERA_BUSY: { title: 'Kamera başka bir uygulamada', help: 'Kamerayı kullanan uygulamayı ya da sekmeyi kapat (görüntülü görüşme, kamera uygulaması), sonra yeniden dene.' },
  CAMERA_MISSING: { title: 'Kamera bulunamadı', help: 'Bu cihazda kullanılabilir bir kamera görünmüyor. Kamerayı tak ya da başka bir cihaz dene.' },
  CAMERA_UNSUPPORTED: { title: 'Bu tarayıcıda kamera açılamıyor', help: 'Kamera yalnızca güvenli bağlantıda (https ya da localhost) ve güncel bir tarayıcıda çalışır.' },
  CAMERA_ERROR: { title: 'Kamera açılamadı', help: 'Beklenmeyen bir hata oluştu. Sayfayı yenileyip yeniden dene; sürerse kamerasız demoyu kullanabilirsin.' },
  TRACKER_FAILED: { title: 'El takip modeli yüklenemedi', help: 'Model dosyası indirilemedi ya da başlatılamadı. Bağlantını denetle ve yeniden dene.' },
  CAMERA_LOST: { title: 'Kamera bağlantısı kesildi', help: 'Kamera durdu, çıkarıldı ya da başka bir uygulama tarafından alındı. Bağlantıyı denetleyip yeniden dene.' },
});
/** @param {string|null|undefined} code */
export const cameraError = (code) => CAMERA_ERRORS[code ?? ''] ?? CAMERA_ERRORS.CAMERA_ERROR;

/** Turkish possessive suffix for a spoken integer ("%38’i", "%40’ı", "%50’si"). @param {number} n */
export function pctPossessive(n) {
  const v = Math.abs(Math.round(n)) % 1000;
  const ones = ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
  const tens = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
  if (v === 0) return 'ı';
  if (v % 10 !== 0) return ones[v % 10];
  if (v % 100 !== 0) return tens[(v % 100) / 10];
  return 'ü';
}

/** Messages with parameters. */
export const M = {
  /** Title of the frame-rate chip: where the hand tracker runs and what one frame costs. @param {null|'GPU'|'CPU'} delegate @param {number|null} inferMs */
  trackerTitle: (delegate, inferMs) => `El izleyici: ${delegate === 'GPU' ? 'ekran kartı (GPU)' : delegate === 'CPU' ? 'işlemci (CPU)' : 'yükleniyor'}${inferMs === null ? '' : ` · kare başına ${inferMs} ms`}`,
  /** @param {number} n */ seriesOf: (n) => `${n} TURLUK SERİ`,
  /** @param {number} i @param {number} n */ roundOf: (i, n) => `TUR ${i}/${n}`,
  /** @param {number} n */ seriesLabel: (n) => `Seri durumu, ${n} tur`,
  /** @param {number} you @param {number} ai */ scoreSr: (you, ai) => `Skor: sen ${you}, yapay zekâ ${ai}`,
  /** @param {number} i @param {string} state */ pipSr: (i, state) => `${i}. tur: ${state}`,
  pipStates: /** @type {Record<string, string>} */ ({ AI: 'yapay zekâ kazandı', PLAYER: 'sen kazandın', TIE: 'berabere', now: 'sıradaki tur', todo: 'oynanmadı' }),
  /** @param {number|null} ms */ sealToLanding: (ms) => (ms === null ? 'inişe —' : `inişe ~${Math.round(ms)} ms`),
  /** @param {number} n */ revisions: (n) => `revizyon ${n}`,
  /** @param {number|null|undefined} lead */ sealBefore: (lead) => (ok(lead) ? (/** @type {number} */ (lead) >= 0 ? `inişten ${Math.round(/** @type {number} */ (lead))} ms önce` : `inişten ${Math.round(-/** @type {number} */ (lead))} ms sonra`) : `iniş ${DASH}`),
  /** @param {number} m */ revealed: (m) => `AÇIKLANDI: ${MOVE_UPPER[m] ?? DASH}`,
  /** @param {number} m */ aiCapRevealed: (m) => `Açıklandı: ${moveName(m)}`,
  /** @param {number} m */ aiHandLabel: (m) => `Yapay zekânın mekanik eli: ${moveName(m).toLocaleLowerCase('tr')}`,
  /** @param {number} ms */ beatGap: (ms) => `vuruş arası ${Math.round(ms)} ms`,
  /** @param {number[]|null} e */
  metersSr: (e) => (e ? `Parmak açıklığı: ${e.map((v, i) => `${FINGER_NAMES[i].toLocaleLowerCase('tr')} ${fmt.pct(Math.min(1, Math.max(0, v)))}`).join(', ')}.` : 'Parmak açıklığı: el görünmüyor.'),
  /** @param {string} finger @param {number|null} v */ meterSr: (finger, v) => `${finger} parmağı açıklığı${v === null ? ': el görünmüyor' : ''}`,
  /** @param {number} round @param {number} seriesPos @param {number} seriesLen @param {number|null} bpm */
  reportMeta: (round, seriesPos, seriesLen, bpm) => `Seri ${seriesPos}/${seriesLen} · bu oturumun ${round}. turu${bpm === null ? '' : ` · ${Math.round(bpm)} BPM`}`,
  /** "hamlenin %38’i oluşmuşken" as [before, number, after] @param {number} p 0..1.2 */
  heroProgress: (p) => { const n = Math.round(Math.min(1, Math.max(0, p)) * 100); return ['hamlenin ', `%${n}`, `’${pctPossessive(n)} oluşmuşken`]; },
  /** @param {number} ms */ heroCompletion: (ms) => (ms >= 0 ? ['şekil tamamlanmadan ', `${Math.round(ms)} ms`, ' önce'] : ['şekil tamamlandıktan ', `${Math.round(-ms)} ms`, ' sonra']),
  /** @param {number} you @param {number} ai */ seriesLine: (you, ai) => `seri: SEN ${you} – ${ai} YZ`,
  /** @param {number} seq @param {number|null} lead */ beliefAtSealSub: (seq, lead) => ` · #${seq}, ${fmt.rel(lead)}`,
  /** @param {number} okN @param {number} n @param {number} judged */
  chainFoot: (okN, n, judged) => `${n} mührün ${okN}’${pctPossessive(okN)} doğrulandı. Bağlayıcı olan: #${judged}.`,
  chainBroken: 'Oturum zinciri doğrulanamadı: mühürlerden en az biri önceki özete bağlanmıyor.',
  /** @param {number} seq */ verifyHintSeq: (seq) => `mühür #${seq}`,
  /** @param {any} result */
  outcomeAnnounce: (result) => `${verdictHeadline(result.verdict)}. ${result.valid ? `Sen: ${moveName(result.playerMove)}, yapay zekâ: ${moveName(result.aiMove)}. ` : ''}${verdictSentence(result)}`,
  /** @param {number} n @param {string} tag */ labMeta: (n, tag) => `${tag} · ${n} tur`,
  /** @param {number} n */ nEq: (n) => `n = ${n}`,
  /** @param {number} valid @param {number} fouls @param {number} voids */
  roundsLine: (valid, fouls, voids) => `${valid} geçerli · ${fouls} faul · ${voids} geçersiz`,
  /** @param {number} k @param {number} n */ kOfN: (k, n) => `${k}/${n}`,
  /** @param {number} ai @param {number} tie @param {number} you */ splitLabel: (ai, tie, you) => `Dağılım: ${ai} galibiyet, ${tie} beraberlik, ${you} mağlubiyet`,
  /** @param {string} name @param {number|null} p @param {number|null} lo @param {number|null} hi */
  intervalLabel: (name, p, lo, hi) => `${name}: ${fmt.pct(p)}, %95 güven aralığı ${fmt.pct(lo)} ile ${fmt.pct(hi)} arası; şans düzeyi %33`,
  /** @param {number} n @param {number|null} median */ histLabel: (n, median) => `Histogram: kararın inişten kaç milisaniye önce verildiği, ${n} tur; medyan ${fmt.ms(median)}`,
  /** @param {number} n @param {number} first @param {number} last */ sparkLabel: (n, first, last) => `Turlara göre karar zamanı, ${n} tur: ilk ${fmt.ms(first)}, son ${fmt.ms(last)}`,
  /** @param {number} n @param {number|null} ece */ relLabel: (n, ece) => `Güvenilirlik diyagramı: öngörülen güvene karşı gerçekleşen isabet, ${n} tur; kalibrasyon hatası ${fmt.num(ece, 2)}`,
  /** @param {number} ms */ horizon: (ms) => `+${Math.round(ms)} ms`,
  /** @param {number} ms */ twinHandLabel: (ms) => `Dijital ikiz: elinin ${Math.round(ms)} ms sonraki öngörülen hâli`,
  /** @param {number} n */ last: (n) => `SON ${n} TUR · eskiden yeniye`,
  /** @param {number} ai @param {number} tie @param {number} you */ lastLabel: (ai, tie, you) => `Son turlar: ${ai} yapay zekâ galibiyeti, ${tie} beraberlik, ${you} oyuncu galibiyeti`,
  /** @param {number} n */ over300: (n) => `${n} tur 300 ms’den erken (300+ sütunu).`,
  /** @param {number} n */ profilesCount: (n) => `${n} profil`,
  /** @param {number} seq @param {string} reason @param {number|null} lead */
  tlSealSr: (seq, reason, lead) => `#${seq} ${reason.toLocaleLowerCase('tr')}, ${ok(lead) && /** @type {number} */ (lead) >= 0 ? `inişten ${Math.round(/** @type {number} */ (lead))} ms önce` : `inişten ${ok(lead) ? Math.round(-/** @type {number} */ (lead)) : DASH} ms sonra`}`,
  /** @param {string[]} seals @param {number|null} complete */
  tlLabel: (seals, complete) => `Zaman çizelgesi. Mühürler: ${seals.join('; ') || 'yok'}. ${complete === null ? 'Şeklin tamamlanma anı ölçülemedi.' : complete <= 0 ? `Şekil inişten ${Math.round(-complete)} ms önce tamamlandı.` : `Şekil inişten ${Math.round(complete)} ms sonra tamamlandı.`}`,
  /** @param {string} name */ camera: (name) => name || 'Kamera',
};
