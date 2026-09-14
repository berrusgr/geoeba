# Çizim ekranı inceleme raporu

Tarih: 12 Eylül 2026

İnceleme: 2D serbest stüdyo, araç paneli, ikon modu, arama, açık/koyu tema, dar ekran düzeni; 3D araç simgelerinin kaynak kodu. Tarayıcı kontrolleri yerel geliştirme sunucusunda, izole Edge oturumunda yapıldı. Kullanıcının kayıtlı çizimleri kullanılmadı.

## Düzeltilen sorunlar

| Sorun | Yapılan düzeltme |
| --- | --- |
| Geometri araçlarının simgeleri kavramları doğru temsil etmiyordu: doğru/cetvel, açı/toplam, elips/yumurta; dikdörtgen ve kare aynı görünüyordu. | 18 araç eşlemesi geometriye uygun SVG simgeleriyle yenilendi. Doğru çift oklu, ışın tek oklu ve başlangıç noktalı, doğru parçası iki uç noktalı çizildi. Açı, açıölçer, elips, yay, alan, çevre, gönye ve pergel simgeleri ayrıştırıldı. |
| 3D küre, dikdörtgenler prizması ve üçgen prizma simgeleri düzlemsel şekil veya katman simgesiydi. | Küre ve iki prizma için hacim belirten SVG simgeleri eklendi. |
| Dar ikon panelinde iç boşluklar ve iki sütun, simge kutularına yetersiz alan bırakıyordu. | Panel 104 px yerine 144 px yapıldı; simgelerin küçülmesi engellendi ve SVG boyutları 20×20 px olarak eşitlendi. Masaüstü tarayıcı ölçümünde araç düğmeleri 50×50 px. |
| Arama kutusu ikon modunda gizlenirken arama filtresi uygulanmaya devam ediyordu. | İkon modunda filtre uygulanmıyor; adlar görünümüne dönünce önceki arama korunuyor. |
| Kapatılmış araç gruplarında arama sonuçları gizli kalıyordu. | Arama varken eşleşen gruplar açık gösteriliyor; arama bitince önceki grup durumu korunuyor. |
| Yan panel aç/kapa ikonları tuvalin üst menü düğmeleriyle çakışıyordu. | Aç/kapa düğmeleri üst menünün altına taşındı. |

## Açık bulgular

Bunlar bu çalışmada raporlandı; çizim motoruna ve mobil yerleşime yönelik düzeltme uygulanmadı.

### 1. Yüksek öncelik — dar ekranda tuval kayboluyor

**Tarayıcıda doğrulandı.** 390×844 px görünümde, ikon paneli ve sağ özellikler paneli açıkken SVG tuvalin ölçülen genişliği **0 px**, yüksekliği 780 px. Yan paneller yatay düzende alan tüketiyor; panel kapatma düğmeleri `hidden lg:flex` nedeniyle bu genişlikte görünmüyor. Kullanıcı çizim yapamıyor.

Kaynak: `src/components/workspace/WorkspaceView.tsx`, `src/components/workspace/PropertiesPanel.tsx:156`.

Öneri: dar ekranda panelleri açılır örtüşen panellere dönüştürmek, erişilebilir panel düğmelerini görünür tutmak ve tuvale kullanılabilir asgari alan sağlamak.

Kanıt: [Dar ekran görüntüsü](workspace-mobile.png).

### 2. Yüksek öncelik — kesişim noktalarının kaynak nesnelerle bağı kurulmamış

**Kaynak kodunda tespit edildi; uçtan uca hareket senaryosu çalıştırılmadı.** `Canvas.tsx:591` içinde kesişim noktaları yalnızca hesaplanan x/y değerleriyle kaydediliyor. `isIndependent: false` yazılsa da kaynak iki nesnenin kimliği ve kesişimin yeniden hesaplanacağı ilişki saklanmıyor. `WorkspaceContext.tsx:413` nokta bağımlılığında yalnızca `onObjectId` alanını ele alıyor.

Sonuç: kesişimi oluşturan nesne değiştiğinde kesişimin yeniden hesaplanmasını ve kaynak silindiğinde noktanın kaldırılmasını sağlayacak ilişki eksik. Ekrandaki kesişim sonucu güncelliğini kaybedebilir.

Öneri: kaynak kimliklerini ve kesişim türünü saklamak; hareket/güncelleme/silme zincirinde bu bağımlılığı işlemek. Teğetlik, kesişimin kaybolması ve geri alma senaryolarını test etmek.

### 3. Yüksek öncelik — dokunmatik sürükleyerek çizim desteği eksik

**Kaynak kodu bulgusu; fiziksel dokunmatik cihazda doğrulanmadı.** Kök tuval çizimi `onMouseDown` ve `onMouseMove` kullanıyor (`Canvas.tsx:2882`). Nesnelerdeki `onTouchMove` işleyicileri uzun basma menüsünü iptal ediyor; ana çizim hareketini yürütmüyor. Ölçüm etiketi sürüklemesinde pointer desteği mevcut, ancak bu destek tüm çizim işlemlerine yayılmamış.

Etki: fareyle çalışan serbest kalem, sürükleyerek şekil çizimi ve nesne taşıma davranışlarının parmakla aynı şekilde çalışması güvence altında değil.

Öneri: ana çizim etkileşimini pointer olaylarına taşımak; pointer capture, iptal ve çoklu dokunma davranışlarını birlikte ele almak.

### 4. Orta öncelik — 2D “Nesne ekle” penceresine araç panelinden erişilemiyor

**Kaynak kodunda doğrulandı.** `Toolbar` bileşeni `onOpenAddObjectDialog` verildiğinde “Nesne ekle” düğmesini oluşturuyor. `WorkspaceView.tsx:450` çevresindeki 2D çağrıda bu özellik aktarılmıyor; 3D çağrıda aktarılıyor. Mevcut 2D modal sekmelerine bu düğmeden ulaşılamıyor.

Öneri: 2D araç paneline modal açma bağlantısını aktarmak ve sayısal nesne girişini kontrol etmek.

## Doğrulama sonuçları

- Mevcut Vitest paketi: **10 dosya, 176 test başarılı**.
- Son kaynaklarda `tsc --noEmit --incremental false`: başarılı.
- `git diff --check`: başarılı.
- Edge: nokta ekleme, Ctrl+Z ile geri alma, Ctrl+Y ile yineleme başarılı.
- Edge: kapalı grupta arama, ikon modunda gizli filtrenin devreden çıkması ve simge ölçümleri başarılı.
- Açık ve koyu tema ekran görüntüleri incelendi.
- Çalıştırılan tarayıcı senaryolarında yakalanan JavaScript çalışma zamanı hatası: **0**.
- 3D cisim oluşturma/taşıma, tüm geometri araçları, dışa aktarım ve gerçek dokunmatik donanım bu çalışmada uçtan uca test edilmedi. Üretim derlemesi çalıştırılmadı.

## Dosyalar

- `src/components/workspace/GeometryToolIcon.tsx`: ortak geometri simgeleri.
- `src/components/workspace/Toolbar.tsx`: 2D simgeler, ikon modu ve arama düzeltmeleri.
- `src/components/workspace/Toolbar3D.tsx`: hacimli cisim simgeleri.
- `src/components/workspace/WorkspaceView.tsx`: panel düğmesi konumları.
- [Düzeltilmiş ikon modu](workspace-compact.png)
- [Koyu tema](workspace-dark.png)
- `artifacts/verify.cjs`: yerel tarayıcı kontrolü; 3005 portunda çalışan uygulama ve kurulu Edge gerektirir.
