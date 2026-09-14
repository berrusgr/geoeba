# Sağ tık ve ölçüm kontrolü

## Düzeltmeler

- Doğru ve ışın menüsüne tanım noktaları arasındaki sonlu mesafe eklendi. Bu sonuç sonsuz nesnenin toplam uzunluğu olarak sunulmuyor. Doğru denklemi menüden açılıp kapatılabiliyor.
- Yay ve daire diliminde yay uzunluğu, yarıçap ve kiriş/çap ölçümleri açılıp kapatılabiliyor.
- Daire diliminin çevresi yay uzunluğu + iki yarıçap olarak hesaplanıp gösteriliyor; alan ve çevre bağımsız etiketler.
- Etiketler şeklin dışına doğru sıralanıyor, sürüklenebiliyor ve gizlenebiliyor. Geometri değiştiğinde yeniden hesaplanıyor.
- Sağ tık menüsünden ölçüm istendiğinde ayrıntılı görünüm ve ölçüm görünürlüğü açılıyor.
- Uzunluk aracı yay/dilim ve doğru/ışın; alan/çevre araçları elips/dilim üzerinde de ilgili işlemi çağırıyor.
- İnce doğru, ışın ve doğru parçalarına geniş görünmez tutma alanı eklendi.
- Fonksiyon grafiği ve bağımsız ölçüm etiketlerine eksik sağ tık bağlantısı eklendi. Metin menüsüne düzenleme eklendi.
- Menü, açıldığı andaki eski kopya yerine güncel nesne durumunu kullanıyor.

## Doğrulananlar

20 farklı 2D nesne türünde menü açma, silme ve Ctrl+Z ile geri alma başarılı: nokta, doğru parçası, doğru, ışın, çember, elips, yay, daire dilimi, çokgen, açı, fonksiyon, kaydırıcı, kesir, kalem çizimi, metin, görsel, işaret kutusu, düğme, girdi kutusu, ölçüm etiketi.

Bu genel matris DOM contextmenu olaylarıyla yürütüldü. Doğru, ışın, yay ve daire diliminde ayrıca gerçek fare sağ tıklaması başarılı. Tanım noktası ok tuşuyla taşındığında doğru/ışın mesafesi 4'ten 5 birime; yay uzunluğu 6,28'den 9,42 birime güncellendi.

Yarıçapı 2 birim olan yarım daire: yay 6,28 br, çap 4 br, alan 6,28 br², çevre 10,28 br olarak doğrulandı. İlgili menü seçenekleri etkin ve çalışır durumda.

Mevcut 176 Vitest testi, TypeScript denetimi ve diff boşluk denetimi başarılı. Tarayıcı testlerinde JavaScript çalışma zamanı hatası görülmedi. Testler izole yerel çizimlerle yapıldı.

Kapsam: 2D nesne menüleri ve yukarıda belirtilen işlemler. Her menüdeki bütün sayısal düzenleme/bölme seçeneklerinin tüm olası geometrilerde doğrulandığı anlamına gelmez. 3D ve fiziksel dokunmatik cihazlar bu kontrolün kapsamında değil.

Tekrar çalıştırma: `node artifacts/verify-context-menus.cjs` (yerel 3005 sunucusu ve Edge gerekir). Yalnızca gerçek fare/ölçüm senaryoları: `node artifacts/verify-context-menus.cjs line,ray,arc,sector`.
