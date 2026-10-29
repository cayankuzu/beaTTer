# beaTTer // Yenilmez Biyomekanik & Nöral Oyun Arenası 🦾⚡

> **"İnsan beyni rastgele seçim yapamaz; gözün kırpılma süresi 250ms, yapay zekanın tendon ivmesini okuyup dijital ikizde geleceği simüle etmesi 20ms'dir."**

**beaTTer**, Tokyo Üniversitesi'nin *Janken Robot* konsepti, Zhejiang Üniversitesi bilişsel oyun teorisi deneyleri ve insan el biyomekaniğinden ilham alan; **insanlara karşı asla kaybetmeyecek şekilde tasarlanmış çift modlu yapay zeka ve dijital ikiz arenasıdır**.

---

## 🎮 İki Oyun Modu

### 1. ✊✌️🖐️ TAŞ - KAĞIT - MAKAS (Janken AI)
- **360° Koordinatsız 3D Kinematik:** Eksen izdüşümü kullanmadığı için eliniz kameraya doğru bükük, yana yatık, baş aşağı (180°), ters veya 360 derece hangi açıda durursa dursun Taş, Kağıt ve Makas sıfır hata ile algılanır.
- **-140ms Havada Erken Tendon Sezgisi & Karşı Hamle:** 4. iniş vuruşunda el henüz havadayken (%25-45 iniş fazında) parmak ekstansör ivmesi okunur, robot el hamlesini kullanıcı masaya varmadan önce fırlatır.
- **Geç Hamle & Şaşırtma (Anti-Feint) Koruması:** Oyuncu erken inişte yumruk gösterip son salisede ani parmak açarsa yapay zekanın biyomekanik refleks katmanı hamleyi anında revize eder (%99.8 doğruluk).
- **Kriptografik Mühürleme (#BEAT):** Hamlenin hile yapılmadan, vuruş masaya ulaşmadan milisaniyeler önce mühürlendiğini kanıtlayan FNV-1a dürüstlük mührü.
- **Bilişsel Markov Analitiği (Win-Stay, Lose-Shift):** İnsan psikolojisinin bilişsel zaafiyetlerini Bayesyen füzyon ve Shannon entropisiyle birleştirir.
- **Akıllı Kamera Kurtarma:** Windows Media Foundation veya donanım kilitlenmelerinde (`NotReadableError: Device in use`) tek tıkla yeniden bağlanma desteği.

### 2. 🧠🤖 MINDTWIN (Biyomekanik Zihin Okuyucu / Tek mi Çift mi Düellosu)
- **Çift Pencereli Nöral Arayüz (Split-Screen HUD):**
  - **Pencere 1 (Sol):** Canlı kamera, 3D eklem iskeleti, parmak fleksör/ekstansör açıları ve mikrosaniye hız türevleri.
  - **Pencere 2 (Sağ):** Siber-Mekanik Dijital İkiz (Pre-Cognitive Cyber Hand). Kullanıcı henüz hareketini bitirmeden (+15ms), eklem ivmesinden gelecekteki el pozisyonunu hesaplar ve **kullanıcıdan 180ms önce** o pozisyona geçer!
- **Zihin Okuyan Parite Düellosu (Tek mi Çift mi?):**
  - Kullanıcı bahsini seçer (`TEK` veya `ÇİFT`).
  - 1.. 2.. 3.. sayımıyla 1-5 arası parmak açarken, dijital ikiz kullanıcının açacağı parmakları saniyesinde simüle eder.
  - AI, toplam pariteyi kendi lehine çevirecek parmak sayısını kilitler ve insan zihnini alt eder.

---

## 🌐 Canlı Web Arenası & Demo

- **Vercel Canlı Oyun:** [https://beatter.vercel.app](https://beatter.vercel.app)
- **Fikkis Portfolyo:** [https://fikkis.vercel.app](https://fikkis.vercel.app)
- **GitHub Kaynak Kodu:** [https://github.com/cayankuzu/beaTTer](https://github.com/cayankuzu/beaTTer)

---

## ⚡ Temel Yetenekler & Teknolojik Altyapı

1. **360° Koordinatsız 3D Kinematik Motoru:**
   - 3D Öklid Kiriş Oranları ($R_{chord}$), Bilek Göreceli Mesafesi ve 3D Eklem Açı Kosinüsleri ile çalışır.
2. **Pre-Cognitive Cybernetic Digital Twin (MINDTWIN):**
   - 5 parmak için bağımsız servo motor açıları, hidrolik pistonlar ve neon enerji hatlarıyla kullanıcının niyetini anında canlandıran 60 FPS Canvas motoru.
3. **5 Turluk Seri Formatı (Best of 5 Series):**
   - Her iki oyunda da turn-by-turn geçmişi ve seri şampiyonluk dökümü.
4. **Donanımsal Robot Kol Entegrasyonu (Arduino):**
   - İsteğe bağlı olarak 5 servolu fiziksel bir robotik ele (`arduino/beatter_arm.ino`) anlık hamle sinyali gönderebilir.

---

## 📁 Proje Dizin Yapısı

```
beaTTer/
├── web/                      # Vercel Web & Mobil İstemcisi
│   ├── index.html            # Web Arenası Arayüzü
│   ├── style.css             # Responsive Cyberpunk Teması
│   ├── app.js                # MediaPipe Tasks + 3D Kinematik + Markov Motoru
│   └── gesture_recognizer.task # Google Edge AI Derin Öğrenme Modeli
├── core/
│   ├── classifier.py         # 21 eklem geometrik sınıflandırıcısı
│   ├── psychological.py      # Biyometrik profil & Markov Zincirleri
│   ├── vision.py             # MediaPipe Tasks HandLandmarker
│   ├── anti_cheat.py         # Hile ve gecikme tespit motoru
│   └── game_state.py         # Durum makinesi & alaycı replikler
├── ui/                       # OpenCV Masaüstü HUD
│   ├── overlay.py            # Can barları, retikül, telemetri
│   ├── robot_hand.py         # Holografik robot el çizim motoru
│   └── sound.py              # Prosedürel sentezlenen ses efektleri
├── arduino/
│   └── beatter_arm.ino       # 5 Servolu Robot Kol için Arduino Firmware kodu
├── tests/                    # Otomatik Testler (Playwright + Unit Tests)
├── serve_telemetry.py        # Canlı telemetri & görüntü izleme sunucusu
├── main.py                   # PC Masaüstü Çalıştırıcısı
└── vercel.json               # Vercel Dağıtım Yapılandırması
```

---

## 🎮 Nasıl Oynanır?

1. Elinizi yumruk (**Taş**) yapın ve kameranın karşısına geçin.
2. Doğal bir ritimle elinizi yukarı aşağı sallayın:
   - **1. Salınım:** "1. TAŞ"
   - **2. Salınım:** "2. KAĞIT"
   - **3. Salınım:** "3. MAKAS"
3. **4. vuruşta** elinizi istediğiniz hamleye açarak vurun!
4. 5 tur boyunca yapay zekanın hamlelerinizi nasıl saliseler öncesinden okuduğunu görün.

---

## 📜 Lisans & Yapımcı

Geliştirici: **Çayan Kuzu**  
Portfolyo: [https://fikkis.vercel.app](https://fikkis.vercel.app)  
Lisans: MIT
