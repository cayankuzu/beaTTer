# beaTTer // Yenilmez Biyomekanik & Yapay Zeka Taş-Kağıt-Makas Arenası 🦾⚡

> **"İnsan beyni rastgele seçim yapamaz; gözün kırpılma süresi 250ms, yapay zekanın tendon hareketini okuyup hamleyi çözmesi 20ms'dir."**

**beaTTer**, Tokyo Üniversitesi'nin *Janken Robot* konsepti, Zhejiang Üniversitesi RPS oyun teorisi araştırmaları ve insan biyomekaniğinden (Wang et al., Nature Scientific Reports) ilham alan, **insanlara karşı asla kaybetmeyecek şekilde tasarlanmış büyük usta (Grandmaster) bir yapay zeka sistemidir**.

---

## 🌐 Canlı Web Arenası & Demo

- **Vercel Canlı Oyun:** [https://beatter.vercel.app](https://beatter.vercel.app)
- **Fikkis Portfolyo:** [https://fikkis.vercel.app](https://fikkis.vercel.app)
- **GitHub Kaynak Kodu:** [https://github.com/cayankuzu/beaTTer](https://github.com/cayankuzu/beaTTer)

---

## ⚡ Temel Yetenekler & Teknolojik Altyapı

1. **360° Koordinatsız 3D Kinematik Motoru:**
   - 3D Öklid Kiriş Oranları ($R_{chord}$), Bilek Göreceli Mesafesi ve 3D Eklem Açı Kosinüsleri ile çalışır.
   - Eksen izdüşümü kullanmadığı için eliniz kameraya doğru bükük, yana yatık, baş aşağı (180°), ters veya 360 derece hangi açıda durursa dursun Taş, Kağıt ve Makas sıfır hata ile algılanır.

2. **Parmaklar Arası V-Açısı (V-Spread) & Tendon Hızı Takibi:**
   - İşaret ve orta parmak arasındaki açısal ayrılma ($\theta_V$) anlık hesaplanır.
   - Parmakların açılma ivmesi ($\omega_{ext}$ rad/s) 60 FPS hızında sürekli türetilir.

3. **3'ten 4'e Geçerken Erken Tendon Tahmini (Early Anticipation):**
   - Eliniz 3. vuruştan 4. vuruşa doğru inerken, parmaklarınızın yumruktan ayrılma ivmesi vuruş tamamlanmadan 40-90 ms önce okunur.

4. **Bilişsel Markov Olasılık Matrisi (Win-Stay, Lose-Shift):**
   - İnsanların yenilgi veya zafer sonrası hamle değiştirme eğilimlerini modelleyen Markov zincirleri, anlık biyomekanik verilerle Bayesyen füzyona girer.

5. **5 Turluk Seri Formatı (Best of 5 Series):**
   - Her maç 5 turdan oluşur (`Tur 1/5 ... Tur 5/5`).
   - Tur geçmişi pip göstergelerinde tutulur ve 5. turun sonunda kapsamlı analiz dökümü sunulur.

6. **Donanımsal Robot Kol Entegrasyonu (Arduino):**
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
