# beaTTer — masaüstü prototipi (eski)

Bu klasör projenin ilk hâlidir: OpenCV tabanlı masaüstü uygulaması ve isteğe bağlı Arduino robot kol yazılımı (`arduino/beatter_arm.ino`).
**Bakımı yapılmamaktadır**; yalnızca tarihsel başvuru için saklanır.
beaTTer v4'ün güvencelerinin (iniş öncesi taahhüt, kriptografik mühür, hakem bağımsızlığı, yalnızca ölçülen göstergeler) hiçbiri bu kodu kapsamaz.
Çalıştırmak için Python 3, bir web kamerası ve `opencv-python`, `mediapipe`, `numpy`, `pygame` paketleri gerekir.
Komut bu klasörün içinden verilmelidir: `cd legacy/desktop-prototype && python main.py` (seçenekler: `python main.py --help`).
Güncel uygulama depo kökündeki `web/` klasöründedir; bkz. kökteki [README](../../README.md) ve [tez](../../docs/tez/README.md).
