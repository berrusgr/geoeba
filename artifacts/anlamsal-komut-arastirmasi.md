# Türkçe anlamsal komut araması — 12 Eylül 2026

## Araştırma ve seçim

- [Elasticsearch](https://github.com/elastic/elasticsearch) bir arama sunucusu ve vektör veritabanıdır. [Elastic'in anlamsal arama belgesi](https://www.elastic.co/docs/solutions/search/semantic-search) metinleri temsil eden vektörler ve model çıkarımıyla aramayı anlatır. Mevcut statik, çevrimdışı çizim uygulamasının küçük komut dizini için ayrı sunucu kurmak gerekli görülmedi.
- [Hugging Face Transformers.js](https://github.com/huggingface/transformers.js) ONNX modellerini tarayıcıda çalıştırabilir. Yerel model ve WASM yolları ayarlanıp uzak model erişimi kapatılabilir. Projede 3.8.1 sürümü sabitlendi.
- [Çok dilli MiniLM ONNX modeli](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2), cümleleri vektörlere dönüştürmek için seçildi. Model sürümü: `2c4055b12046f11709e9df2c122e59ffbdc2f900`. Quantized ağırlık yaklaşık 118 MB; tokenizer ve çalışma zamanı ayrıca yer kaplar.

## Uygulama

1. Komut alanına odaklanınca yerel Web Worker açılır. Model ayrı iş parçacığında yüklenir; yüklenirken kelime araması çalışmaya devam eder.
2. 15 işlem ailesinin Türkçe örnekleri ortalama havuzlama ve normalize edilmiş vektörlerle indekslenir. Kullanıcı metni 350 ms beklemeden sonra aynı modelle kodlanır.
3. Kosinüs benzerliği; çevre/alan, kaydırıcı/kenar ölçümü gibi ayrımlarda geometri terimleriyle yeniden sıralanır. Puan bir doğruluk olasılığı değildir.
4. Nokta adları, ölçüler ve seçili şekil mevcut sahneden/metinden alınır. Eksik nokta veya hedef için açıklama gösterilir.
5. Sonuç “Anlam eşleşmesi” olarak gösterilir. Kullanıcı öneriyi metne alır ve Enter ile uygular. Geometri doğrulaması ve tek adımlı geri alma mevcut komut motorunda kalır.
6. Eski sorgunun geç dönen sonucu yeni metnin üzerine yazılmaz. Model açılamazsa kelime araması kullanılabilir.

Desteklenen anlamsal aileler: üçgen, çember, kare, dikdörtgen, yükseklik, köşe açısı, teğet, kenar–kaydırıcı bağlantısı, alan, çevre, kenar ölçüleri, orta nokta, doğru parçası, doğru ve ışın. Bu kapsam sınırsız Türkçe anlama veya her geometri inşasını üretme iddiası taşımaz. Birden fazla işlem içeren cümleler ayrı komutlara bölünmelidir.

## Kurulum ve dağıtım

`npm run semantic:prepare` sabit model sürümünü ve paket çalışma zamanını `public/semantic/` altına hazırlar. Eksik model dosyaları yalnızca geliştirme/derleme hazırlığı sırasında internetten indirilir. `dev`, `matematik` ve `build` öncesinde otomatik çalışır. Model dosyaları Git'e eklenmez; temiz kurulumda hazırlama adımının ağ erişimi gerekir. Uygulama çalışırken model isteği kendi sunucusuna yapılır; dış çıkarım servisi yoktur. Tarayıcı ilk kullanımda dosyaları yerel sunucudan yükler ve modeli başlatır.

Uygulamanın mevcut Google Fonts istekleri ayrı bir özelliktir; anlam modeline veri göndermez. Harici istekler engellenerek anlam araması ayrıca sınandı.

## Kontroller

- 217 birim testi geçti; TypeScript kontrolü uygulandı.
- Gerçek model puanları `semantic-model-results.json` içinde kayıtlı. Saf modelin bazı karışıklıkları bu ölçümde bulundu ve hibrit sıralama testlerine eklendi.
- `verify-semantic-ui.cjs`: altı Türkçe ifade, öneriden gerçek yükseklik çizimi, ilgisiz sorgu ve dış bağlantıları engelleme senaryoları.
- Örnekler: “B köşesinden tabana yükseklik çek”, “A köşesi kaç derecedir”, “üçgenin kenarlarını sürgülerle kontrol edeyim”, “şeklin etrafının toplamı ne kadar”, “A ile B arasını birleştir”, “yarıçapı 7 olan yuvarlak oluştur”. Bu örnekler genel doğruluk oranı değildir.
