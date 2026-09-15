import { Level } from '@/types/curriculum';

export const liseLevel: Level = {
  "id": "lise",
  "title": "Lise",
  "subtitle": "Hazırlık, 9, 10, 11 ve 12. Sınıf",
  "gradeRange": "Hazırlık - 12. Sınıf",
  "description": "T.C. Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli (TYMM) 2026 Ortaöğretim Matematik Dersi Öğretim Programı.",
  "grades": [
    {
      "gradeNumber": 0,
      "title": "Hazırlık Sınıfı",
      "subtitle": "Doğrusal İlişkiler, Mantıksal Çıkarım, Kriptoloji ve Geometrik İnşalar",
      "description": "T.C. Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli Hazırlık Sınıfı Matematik Programı: Doğrusal ilişkiler, mantıksal çıkarım stratejileri, sayı örüntüleri ve kriptoloji, pergel-cetvel geometrik inşaları, fraktallar, süsleme-kaplamalar ve istatistiksel eleştirel değerlendirme.",
      "themes": [
        {
          "id": "tymm-h-nicelikler",
          "code": "MAT.H.1",
          "orderNumber": 1,
          "themeName": "Nicelikler ve Değişimler",
          "fullTitle": "MAT.H.1. Nicelikler ve Değişimler",
          "category": "fonksiyon",
          "lessonHours": 20,
          "outcomeCount": 1,
          "description": "Doğrusal ilişkiler içeren problemlerin matematiksel araç ve teknolojilerden yararlanılarak modellenmesi ve çözülmesi.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "h-dogrusal-iliski-modelleri",
              "title": "Doğrusal İlişkiler ve Grafiksel Modeller",
              "code": "MAT.H.1.1",
              "category": "fonksiyon",
              "badge": "Doğrusal İlişkiler",
              "description": "Doğrusal ilişki içeren problemlerin tablo, cebirsel ve grafik temsilleri ile incelenmesi, eğim ve öteleme dinamikleri.",
              "learningOutcomes": [
                "Doğrusal ilişkiler içeren problemlerin çözümlerinde matematiksel araç ve teknolojilerden yararlanabilme.",
                "Doğrusal ilişkilerin grafik ve cebirsel temsillerindeki katsayıları (eğim ve y-kesen) yorumlayabilme."
              ],
              "activities": [
                {
                  "id": "act-h-dogrusal-iliski-modelleri-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "fonksiyon",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#8b5cf6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-h-mantik",
          "code": "MAT.H.2",
          "orderNumber": 2,
          "themeName": "Mantıksal Çıkarım",
          "fullTitle": "MAT.H.2. Mantıksal Çıkarım",
          "category": "sayi",
          "lessonHours": 20,
          "outcomeCount": 1,
          "description": "Mantıksal çıkarım gerektiren problemlerin ağaç şeması, sistematik listeleme, diyagram ve tablo temsilleriyle çözülmesi.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "h-mantiksal-cikarim-stratejileri",
              "title": "Mantıksal Çıkarım ve Çözüm Stratejileri",
              "code": "MAT.H.2.1",
              "category": "sayi",
              "badge": "Mantıksal Çıkarım",
              "description": "Zekâ problemleri, eşleştirme bulmacaları, ağaç şeması ve sistematik listeleme yöntemleriyle mantıksal çıkarım yapma.",
              "learningOutcomes": [
                "Mantıksal çıkarım gerektiren problemleri farklı stratejiler kullanarak çözebilme.",
                "Ağaç şeması, diyagram ve tablo temsillerini etkin problem çözme aracı olarak kullanabilme."
              ],
              "activities": [
                {
                  "id": "act-h-mantiksal-cikarim-stratejileri-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#ec4899",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-h-algoritma",
          "code": "MAT.H.3",
          "orderNumber": 3,
          "themeName": "Algoritma ve Bilişim",
          "fullTitle": "MAT.H.3. Algoritma ve Bilişim",
          "category": "cebir",
          "lessonHours": 26,
          "outcomeCount": 3,
          "description": "Sonlu sayı örüntülerine yönelik tümevarımsal akıl yürütme, şifreli metinlerin çözümü, Sezar çarkı ve kriptoloji algoritmaları.",
          "colorTheme": "#06b6d4",
          "topics": [
            {
              "id": "h-oruntu-kriptoloji",
              "title": "Sayı Örüntüleri, Şifreleme ve Kriptoloji",
              "code": "MAT.H.3.1-3",
              "category": "cebir",
              "badge": "Algoritma & Şifreleme",
              "description": "Sayı örüntülerinin genel terimleri, şifreleme kuralları, Sezar çarkı ve modüler şifreleme mantığı.",
              "learningOutcomes": [
                "Sonlu sayı örüntülerine yönelik tümevarımsal akıl yürütebilme.",
                "Şifreli metinleri çözebilmek için tümevarımsal akıl yürütebilme.",
                "Şifreli metinler oluşturabilmek için analojik akıl yürütebilme."
              ],
              "activities": [
                {
                  "id": "act-h-oruntu-kriptoloji-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "cebir",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#06b6d4",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-h-geometri",
          "code": "MAT.H.4",
          "orderNumber": 4,
          "themeName": "Geometrik Şekiller",
          "fullTitle": "MAT.H.4. Geometrik Şekiller",
          "category": "geometri",
          "lessonHours": 32,
          "outcomeCount": 5,
          "description": "Pergel ve cetvel ile geometrik inşalar, özel dörtgenlerin çıkarımı, fraktallar (Koch kar tanesi, Sierpinski üçgeni), Türk-İslam süsleme ve kaplama sanatı.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "h-geometrik-insa-ve-fraktal",
              "title": "Geometrik İnşa, Özel Dörtgenler ve Fraktallar",
              "code": "MAT.H.4.1-5",
              "category": "geometri",
              "badge": "İnşa & Fraktal",
              "description": "Pergel-cetvel inşaları (dikme, açıortay, paralel, eşkenar üçgen, düzgün altıgen), özel dörtgenler, fraktal yapıları ve düzlem kaplamaları.",
              "learningOutcomes": [
                "Farklı geometrik kavram ve şekillerin inşa çalışmalarında matematiksel araç ve teknolojilerden yararlanabilme.",
                "İnşa edilen özel dörtgenlerin (yamuk, paralelkenar, dikdörtgen, eşkenar dörtgen, kare) özellikleri ile ilgili çıkarım yapabilme.",
                "Fraktalları ve geometrik süslemeleri çözümleyebilme, özgün kaplamalar sentezleyebilme."
              ],
              "activities": [
                {
                  "id": "act-h-geometrik-insa-ve-fraktal-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#10b981",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-h-istatistik",
          "code": "MAT.H.5",
          "orderNumber": 5,
          "themeName": "İstatistiksel Araştırma Süreci",
          "fullTitle": "MAT.H.5. İstatistiksel Araştırma Süreci",
          "category": "istatistik",
          "lessonHours": 6,
          "outcomeCount": 1,
          "description": "Başkaları tarafından oluşturulan istatistiksel görsel, özet, sonuç, yorum ve tahminlerin eleştirel bir bakış açısıyla tartışılması ve değerlendirilmesi.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "h-istatistiksel-elestirel-bakis",
              "title": "İstatistiksel Sonuç ve Yorumları Eleştirel Değerlendirme",
              "code": "MAT.H.5.1",
              "category": "istatistik",
              "badge": "Eleştirel İstatistik",
              "description": "Yanıltıcı grafikler, eksik ölçekler, yanlı örneklemler ve istatistiksel çıkarımların doğrulanması.",
              "learningOutcomes": [
                "Başkaları tarafından oluşturulan istatistiksel sonuç veya yorumları tartışabilme.",
                "İstatistiksel temellendirme yaparak hataları ya da yanlılıkları tespit edebilme."
              ],
              "activities": [
                {
                  "id": "act-h-istatistiksel-elestirel-bakis-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "istatistik",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#f59e0b",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        }
      ],
      "topics": []
    },
    {
      "gradeNumber": 9,
      "title": "9. Sınıf",
      "subtitle": "Sayılar, Fonksiyonlar, Geometrik İspat ve Algoritmalar",
      "description": "Gerçek sayılar, doğrusal referans fonksiyonlar ve mutlak değer, üçgende açılar ve eşitsizlik, dönüşümler ve benzerlik (Tales, Öklid, Pisagor), algoritma ve mantık, tek nicel değişkenli istatistik ve deneysel olasılık.",
      "themes": [
        {
          "id": "tymm-9-sayilar",
          "code": "MAT.9.1",
          "orderNumber": 1,
          "themeName": "Sayılar",
          "fullTitle": "MAT.9.1. Sayılar",
          "lessonHours": 38,
          "outcomeCount": 4,
          "description": "Gerçek sayıların üslü ve köklü gösterimleri, sayı aralıkları, sayı kümelerinin özellikleri (sıralı olma, arada olma, kapalılık), cebirsel özdeşlikler ve geometrik modelleme.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "9-sayilar-us-kok",
              "title": "Üslü ve Köklü Gösterimlerle Muhakeme",
              "code": "MAT.9.1.1",
              "category": "sayi",
              "badge": "Gerçek Sayılar",
              "description": "Gerçek sayıların üslü ve köklü gösterimleriyle yapılan işlemler, bilimsel gösterim ve yaklaşık değer hesabı.",
              "learningOutcomes": [
                "Gerçek sayıların üslü ve köklü gösterimleriyle yapılan işlemlere dair muhakeme yapabilme.",
                "İrrasyonel sayıların yaklaşık değerlerini ve hata payını modelleyebilme."
              ],
              "activities": [
                {
                  "id": "act-9-sayilar-us-kok-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#8b5cf6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            },
            {
              "id": "9-sayi-kumeleri-aralik",
              "title": "Sayı Aralıkları ve Küme Gösterimleri",
              "code": "MAT.9.1.2",
              "category": "sayi",
              "badge": "Kümeler & Aralıklar",
              "description": "Gerçek sayı aralıkları ([a, b], (a, b)), mutlak değer eşitsizlikleri (|x - a| < r) ve küme işlemleri.",
              "learningOutcomes": [
                "Gerçek sayı aralıklarının gösteriminde ve işlemlerinde küme sembollerinden yararlanabilme.",
                "Mutlak değer gösterimi ile mesafe ve aralık ilişkisini modelleyebilme."
              ],
              "activities": [
                {
                  "id": "act-9-sayi-kumeleri-aralik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#8b5cf6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-9-nicelik-degisim",
          "code": "MAT.9.2",
          "orderNumber": 2,
          "themeName": "Nicelikler ve Değişimler",
          "fullTitle": "MAT.9.2. Nicelikler ve Değişimler",
          "lessonHours": 38,
          "outcomeCount": 3,
          "description": "Doğrusal referans fonksiyon f(x)=x ve grafik dönüşümleri g(x)=a·f(x±r)±k, mutlak değer fonksiyonu m(x)=±|ax±b|±c, parçalı fonksiyonlar, doğrusal denklem ve eşitsizlikler, arz-talep modelleri.",
          "colorTheme": "#06b6d4",
          "topics": [
            {
              "id": "9-fonk-dogrusal-donusum",
              "title": "Doğrusal Referans Fonksiyon ve Dönüşümleri",
              "code": "MAT.9.2.1",
              "category": "fonksiyon",
              "badge": "Fonksiyonlar",
              "description": "f(x) = x fonksiyonuna uygulanan öteleme, eğim katsayısı ve simetri dönüşümlerinin nitel özellikleri.",
              "learningOutcomes": [
                "Gerçek sayılarda f(x)=x referans fonksiyonundan türetilen g(x)=a·f(x±r)±k doğrusal fonksiyonların nitel özelliklerini muhakeme edebilme.",
                "Artanlık, azalanlık, sıfırları ve birebirliği grafik üzerinden analiz edebilme."
              ],
              "activities": [
                {
                  "id": "act-9-fonk-dogrusal-donusum-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "fonksiyon",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#06b6d4",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            },
            {
              "id": "9-fonk-isaret-esitsizlik",
              "title": "İşaret Tablosu ve Doğrusal Eşitsizlikler",
              "code": "MAT.9.2.3",
              "category": "cebir",
              "badge": "Denklem & Eşitsizlik",
              "description": "f(x) < 0 ve f(x) ≥ g(x) eşitsizliklerinin grafiksel kesişim ve işaret tablosu yöntemiyle çözümü, piyasa arz-talep dengesi.",
              "learningOutcomes": [
                "Doğrusal fonksiyonlarla ifade edilen denklem ve eşitsizlikler içeren problemleri çözebilme.",
                "İki doğrunun kesişim noktasını sistem çözümü olarak yorumlayabilme."
              ],
              "activities": [
                {
                  "id": "act-9-fonk-isaret-esitsizlik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "cebir",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#06b6d4",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-9-geo-sekiller",
          "code": "MAT.9.3",
          "orderNumber": 3,
          "themeName": "Geometrik Şekiller",
          "fullTitle": "MAT.9.3. Geometrik Şekiller",
          "lessonHours": 12,
          "outcomeCount": 1,
          "description": "Üçgende iç açılar toplamı (180°) ve dış açılar toplamı (360°) ispatları, açı-kenar bağıntıları, üçgen eşitsizliği (|b-c| < a < b+c).",
          "colorTheme": "#ef4444",
          "topics": [
            {
              "id": "9-geo-ucgen-bagintilari",
              "title": "Üçgende Açılar ve Üçgen Eşitsizliği",
              "code": "MAT.9.3.1",
              "category": "geometri",
              "badge": "Üçgenler",
              "description": "Büyük açı karşısında büyük kenar bağıntısı, üçgenin kenar oluşturma şartı ve aksiyomatik ispatlar.",
              "learningOutcomes": [
                "Üçgende açı ve kenarla ilgili özellikleri ve ilişkileri doğrulayabilme veya ispatlayabilme.",
                "Üçgen eşitsizliğini dinamik geometrik yapılarla test edebilme."
              ],
              "activities": [
                {
                  "id": "act-9-geo-ucgen-bagintilari-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#ef4444",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-9-eslik-benzerlik",
          "code": "MAT.9.4",
          "orderNumber": 4,
          "themeName": "Eşlik ve Benzerlik",
          "fullTitle": "MAT.9.4. Eşlik ve Benzerlik",
          "lessonHours": 36,
          "outcomeCount": 5,
          "description": "Geometrik dönüşümler (öteleme, yansıma, dönme), üçgenlerde eşlik ve benzerlik koşulları (K-K-K, A-A, A-K-A), Tales, Öklid ve Pisagor teoremlerinin ispatı.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "9-geo-donusumler",
              "title": "Geometrik Dönüşümler ve Eşlik",
              "code": "MAT.9.4.1",
              "category": "geometri",
              "badge": "Dönüşüm Geometrisi",
              "description": "Düzlemde öteleme, doğruya göre yansıma ve dönme merkezi etrafında dönme dönüşümleri.",
              "learningOutcomes": [
                "Geometrik dönüşümlerle (yansıma, öteleme, dönme) ilgili çıkarım yapabilme.",
                "Dönüşümler altındaki görüntünün baştaki şekille eş olduğunu kavrayabilme."
              ],
              "activities": [
                {
                  "id": "act-9-geo-donusumler-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#f59e0b",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            },
            {
              "id": "9-geo-tales-oklid-pisagor",
              "title": "Tales, Öklid ve Pisagor Teoremleri",
              "code": "MAT.9.4.4",
              "category": "geometri",
              "badge": "Klasik Teoremler",
              "description": "Paralel doğruların ayırdığı orantılı parçalar (Tales), dik üçgende hipotenüs yüksekliği bağıntıları (Öklid) ve Pisagor teoremi.",
              "learningOutcomes": [
                "Tales, Öklid ve Pisagor teoremlerini benzer üçgenler yardımıyla ispatlayabilme.",
                "Teoremleri gerçek yaşam ve mimari mühendislik problemlerine uyarlayabilme."
              ],
              "activities": [
                {
                  "id": "act-9-geo-tales-oklid-pisagor-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#f59e0b",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-9-algoritma-bilisim",
          "code": "MAT.9.5",
          "orderNumber": 5,
          "themeName": "Algoritma ve Bilişim",
          "fullTitle": "MAT.9.5. Algoritma ve Bilişim",
          "lessonHours": 30,
          "outcomeCount": 3,
          "description": "Algoritma temelli problem çözme, Eratosthenes asal kalburu, ikili arama, akış şemaları, sözde kod, ikili sistem binary, Königsberg köprüsü ve çizge (graf) kuramı.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "9-bilisim-algoritma-cizge",
              "title": "Algoritmik Düşünme ve Çizge Kuramı",
              "code": "MAT.9.5.1",
              "category": "cebir",
              "badge": "Bilişim & Mantık",
              "description": "Königsberg 7 köprü problemi, düğüm ve ayrıtlar, en kısa yol algoritmaları ve mantık bağlaçları.",
              "learningOutcomes": [
                "Algoritma temelli yaklaşımlarla problem çözebilme (akış şeması, sözde kod, çizge).",
                "Mantık bağlaçları (ve, veya, ya da, ise) ve niceleyicilerin (her, bazı) algoritmik yapılarını çözümleyebilme."
              ],
              "activities": [
                {
                  "id": "act-9-bilisim-algoritma-cizge-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "cebir",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#10b981",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-9-istatistik",
          "code": "MAT.9.6",
          "orderNumber": 6,
          "themeName": "İstatistiksel Araştırma Süreci",
          "fullTitle": "MAT.9.6. İstatistiksel Araştırma Süreci",
          "lessonHours": 34,
          "outcomeCount": 2,
          "description": "Tek nicel değişkenli veri dağılımları, nokta grafiği, histogram, kutu grafiği, standart sapma, çeyrekler açıklığı ve değişebilirlik türleri.",
          "colorTheme": "#6366f1",
          "topics": [
            {
              "id": "9-ist-nicel-veri",
              "title": "Tek Nicel Değişkenli Veri Dağılımları",
              "code": "MAT.9.6.1",
              "category": "istatistik",
              "badge": "Veri Analizi",
              "description": "Kutu grafiğinde çeyrekler (Q1, Q2, Q3), aykırı değerler ve standart sapmanın dağılım yayılımındaki rolü.",
              "learningOutcomes": [
                "Tek nicel değişkenli veri dağılımları ile çalışabilme ve veriye dayalı karar verebilme.",
                "Histogram ve kutu grafiği kullanarak verilerin simetrisini ve yayılımını yorumlayabilme."
              ],
              "activities": [
                {
                  "id": "act-9-ist-nicel-veri-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "istatistik",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#6366f1",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-9-olasilik",
          "code": "MAT.9.7",
          "orderNumber": 7,
          "themeName": "Veriden Olasılığa",
          "fullTitle": "MAT.9.7. Veriden Olasılığa",
          "lessonHours": 18,
          "outcomeCount": 2,
          "description": "2-3 olaylı deneyler, deneysel ve teorik olasılık, Büyük Sayılar Yasası simülasyonu, ayrık ve ayrık olmayan olaylar.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "9-olas-deneysel-teorik",
              "title": "Deneysel ve Teorik Olasılık",
              "code": "MAT.9.7.1",
              "category": "olasilik",
              "badge": "Büyük Sayılar Yasası",
              "description": "Deney tekrar sayısı arttıkça göreli sıklıkların teorik olasılığa yaklaşması (Büyük Sayılar Yasası).",
              "learningOutcomes": [
                "Olayların olasılığını deney yaparak tahmin edebilme ve teorik olasılıkla karşılaştırabilme.",
                "Ayrık ve ayrık olmayan olayların birleşim olasılığını P(A∪B)=P(A)+P(B)-P(A∩B) ile hesaplayabilme."
              ],
              "activities": [
                {
                  "id": "act-9-olas-deneysel-teorik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "olasilik",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#ec4899",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        }
      ],
      "topics": []
    },
    {
      "gradeNumber": 10,
      "title": "10. Sınıf",
      "subtitle": "Trigonometri, Karesel Fonksiyonlar, Sayma ve Analitik Geometri",
      "description": "Dik üçgende trigonometri ve sinüs/kosinüs teoremleri, iki kategorik değişkenli istatistik, asal çarpanlar ve EBOB/EKOK, paraboller ve karekök fonksiyonları, faktöriyel-kombinasyon ve Pascal üçgeni, doğrunun analitiği ve Bayes olasılık teoremi.",
      "themes": [
        {
          "id": "tymm-10-geo-sekiller",
          "code": "MAT.10.1",
          "orderNumber": 1,
          "themeName": "Geometrik Şekiller",
          "fullTitle": "MAT.10.1. Geometrik Şekiller (Trigonometri & Teoremler)",
          "lessonHours": 36,
          "outcomeCount": 4,
          "description": "Dik üçgende trigonometrik oranlar, birim çember, üçgenin yardımcı elemanları (açıortay, kenarortay/ağırlık merkezi G, kenar orta dikme/çevrel çember, yükseklik/diklik merkezi), sinüs ve kosinüs teoremleri.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "10-trig-oran-birim-cember",
              "title": "Birim Çember ve Trigonometrik Oranlar",
              "code": "MAT.10.1.1",
              "category": "trigonometri",
              "badge": "Trigonometri",
              "description": "Birim çember üzerinde yönlü açılar, (cos θ, sin θ) koordinatları, tanjant-kotanjant eksenleri ve sin²θ + cos²θ = 1 özdeşliği.",
              "learningOutcomes": [
                "Dik üçgende trigonometrik oranlara ve temel trigonometrik özdeşliklere ilişkin çıkarım yapabilme.",
                "Geniş açıların trigonometrik oranlarını birim çember üzerinden modelleyebilme."
              ],
              "activities": [
                {
                  "id": "act-10-trig-oran-birim-cember-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "trigonometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#8b5cf6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            },
            {
              "id": "10-geo-yardimci-elemanlar",
              "title": "Üçgenin Yardımcı Elemanları ve Merkezleri",
              "code": "MAT.10.1.2",
              "category": "geometri",
              "badge": "Üçgen Merkezleri",
              "description": "İç açıortaylar (İç teğet çember merkezi), Kenarortaylar (Ağırlık merkezi G, 2:1 oranı), Kenar orta dikmeler (Çevrel çember merkezi), Yükseklikler (Diklik merkezi).",
              "learningOutcomes": [
                "Üçgenin yardımcı elemanlarının özelliklerine ve kesim noktalarına dair çıkarım yapabilme.",
                "Ağırlık merkezinin kenarortayı 2:1 oranında böldüğünü geometrik olarak doğrulayabilme."
              ],
              "activities": [
                {
                  "id": "act-10-geo-yardimci-elemanlar-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#8b5cf6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            },
            {
              "id": "10-geo-sin-cos-teoremleri",
              "title": "Sinüs ve Kosinüs Teoremleri",
              "code": "MAT.10.1.4",
              "category": "trigonometri",
              "badge": "Teoremler",
              "description": "a² = b² + c² - 2bc·cos(A) kosinüs teoremi ve a/sin(A) = b/sin(B) = c/sin(C) = 2R sinüs teoremi.",
              "learningOutcomes": [
                "Sinüs ve kosinüs teoremlerini doğrulayabilme veya ispatlayabilme.",
                "Rastgele üçgenlerde bilinmeyen kenar ve açıları trigonometrik teoremlerle hesaplayabilme."
              ],
              "activities": [
                {
                  "id": "act-10-geo-sin-cos-teoremleri-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "trigonometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#8b5cf6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-10-istatistik",
          "code": "MAT.10.2",
          "orderNumber": 2,
          "themeName": "İstatistiksel Araştırma Süreci",
          "fullTitle": "MAT.10.2. İstatistiksel Araştırma Süreci (İki Kategorik Değişken)",
          "lessonHours": 24,
          "outcomeCount": 2,
          "description": "İki kategorik değişkenli veriler, iki yönlü çapraz tablo, koşullu göreli sıklıklar, kümeli sütun grafikleri, ilişkililik ve neden-sonuç ayrımı.",
          "colorTheme": "#06b6d4",
          "topics": [
            {
              "id": "10-ist-iki-kategorik",
              "title": "İki Yönlü Tablolar ve Koşullu Göreli Sıklıklar",
              "code": "MAT.10.2.1",
              "category": "istatistik",
              "badge": "Çapraz Tablo",
              "description": "İki kategorik değişken arasındaki ilişkililiğin satır ve sütun yüzdeleri ile analizi.",
              "learningOutcomes": [
                "İki kategorik değişkenli veri ile çalışabilme ve ilişkililiğe dayalı karar verebilme.",
                "Korelasyon ile neden-sonuç ilişkisinin farklı olduğunu kavrayabilme."
              ],
              "activities": [
                {
                  "id": "act-10-ist-iki-kategorik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "istatistik",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#06b6d4",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-10-sayilar",
          "code": "MAT.10.3",
          "orderNumber": 3,
          "themeName": "Sayılar",
          "fullTitle": "MAT.10.3. Sayılar (Asal Çarpanlar, EBOB-EKOK ve Bölünebilme)",
          "lessonHours": 20,
          "outcomeCount": 3,
          "description": "Doğal sayıların asal çarpanları, pozitif bölen sayısı, EBOB-EKOK özellikleri (a·b = EBOB·EKOK), basamak çözümlemesiyle bölünebilme kuralları ve kalan algoritmaları.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "10-sayilar-ebob-ekok",
              "title": "EBOB, EKOK ve Asal Çarpanlar",
              "code": "MAT.10.3.2",
              "category": "sayi",
              "badge": "Sayılar Teorisi",
              "description": "Aralarında asal sayılar, ortak bölen ve ortak kat özellikleri, en küçük ortak kat ile periyodik durumlar.",
              "learningOutcomes": [
                "Birden çok doğal sayının ortak bölenleri ve ortak katları arasındaki ilişkilere dair muhakeme yapabilme.",
                "Bölünebilme kurallarını basamak çözümlemesiyle ispatlayabilme."
              ],
              "activities": [
                {
                  "id": "act-10-sayilar-ebob-ekok-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#10b981",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-10-nicelik-degisim",
          "code": "MAT.10.4",
          "orderNumber": 4,
          "themeName": "Nicelikler ve Değişimler",
          "fullTitle": "MAT.10.4. Nicelikler ve Değişimler (Karesel, Karekök, Rasyonel Fonksiyonlar & Parabol)",
          "lessonHours": 58,
          "outcomeCount": 6,
          "description": "Fonksiyon olma şartları, karesel referans fonksiyon f(x)=x² ve parabol dönüşümleri g(x)=a(x±r)²±k, tepe noktası T(-b/2a, k), simetri ekseni, karekök f(x)=√x, rasyonel f(x)=1/x, ters fonksiyon ve optimizasyon problemleri.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "10-fonk-parabol-donusum",
              "title": "Karesel Fonksiyonlar ve Parabolün Geometrisi",
              "code": "MAT.10.4.2",
              "category": "fonksiyon",
              "badge": "Parabol",
              "description": "g(x) = a(x - r)² + k tepe noktası T(r, k), simetri ekseni x = r, kolların yönü ve maksimum/minimum değerler.",
              "learningOutcomes": [
                "Gerçek sayılarda f(x)=x² karesel referans fonksiyondan türetilen fonksiyonların nitel özelliklerini muhakeme edebilme.",
                "Parabolün tepe noktasını ve simetri eksenini tamkareye tamamlama yöntemiyle belirleyebilme."
              ],
              "activities": [
                {
                  "id": "act-10-fonk-parabol-donusum-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "fonksiyon",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#ec4899",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-10-sayma-algoritma",
          "code": "MAT.10.5",
          "orderNumber": 5,
          "themeName": "Sayma, Algoritma ve Bilişim",
          "fullTitle": "MAT.10.5. Sayma, Algoritma ve Bilişim (Kombinatorik & Pascal Üçgeni)",
          "lessonHours": 28,
          "outcomeCount": 2,
          "description": "Eşleştirme, toplama ve çarpma yoluyla sayma, faktöriyel (n!), sıralama sayısı (permütasyon), seçme sayısı (kombinasyon C(n,r)), Pascal üçgeni (Ömer Hayyam), Güvercin Yuvası İlkesi, fonksiyon sıfırlarını bulma algoritmaları.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "10-sayma-kombinasyon-pascal",
              "title": "Seçme Sayısı (Kombinasyon) ve Pascal Üçgeni",
              "code": "MAT.10.5.1",
              "category": "cebir",
              "badge": "Kombinatorik",
              "description": "C(n, r) kombinasyon hesabı, Pascal üçgenindeki simetriler, satır toplamları (2ⁿ) ve Ömer Hayyam bağlantısı.",
              "learningOutcomes": [
                "Sayma stratejileri (sıralama ve seçme) kullanarak problem çözebilme.",
                "Pascal üçgenindeki cebirsel ve sayısal örüntüleri modelleyebilme."
              ],
              "activities": [
                {
                  "id": "act-10-sayma-kombinasyon-pascal-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "cebir",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#f59e0b",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-10-analitik",
          "code": "MAT.10.6",
          "orderNumber": 6,
          "themeName": "Analitik İnceleme",
          "fullTitle": "MAT.10.6. Analitik İnceleme (Nokta ve Doğrunun Analitiği)",
          "lessonHours": 22,
          "outcomeCount": 2,
          "description": "İki nokta arası uzaklık formülü, doğru parçasını belli oranda içten/dıştan bölen nokta, orta nokta ve ağırlık merkezi, doğrunun eğim açısı α, eğim m=tanα, paralel doğrular (m₁=m₂), dik kesişen doğrular (m₁·m₂=-1).",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "10-analitik-nokta-dogru",
              "title": "Noktanın ve Doğrunun Analitik İncelenmesi",
              "code": "MAT.10.6.1",
              "category": "geometri",
              "badge": "Analitik Geometri",
              "description": "İki nokta arası uzaklık d = √((x₂-x₁)² + (y₂-y₁)²), eğim m = (y₂-y₁)/(x₂-x₁) ve dik doğruların eğim çarpımı.",
              "learningOutcomes": [
                "Dik koordinat sisteminde iki nokta arasındaki uzaklık ve doğru parçasını bölen noktalarla ilgili çıkarım yapabilme.",
                "Dik kesişen doğruların eğimleri çarpımının -1 olduğunu ispatlayabilme."
              ],
              "activities": [
                {
                  "id": "act-10-analitik-nokta-dogru-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#3b82f6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-10-olasilik-bayes",
          "code": "MAT.10.7",
          "orderNumber": 7,
          "themeName": "Veriden Olasılığa",
          "fullTitle": "MAT.10.7. Veriden Olasılığa (Koşullu Olasılık & Bayes Teoremi)",
          "lessonHours": 18,
          "outcomeCount": 2,
          "description": "Bağımlı ve bağımsız olaylar, koşullu olasılık P(A|B) = P(A∩B)/P(B), Bayes Teoremi, tıbbi test doğruluk oranları, risk analizleri, ağaç şeması ve alan modeli.",
          "colorTheme": "#ef4444",
          "topics": [
            {
              "id": "10-olas-kosullu-bayes",
              "title": "Koşullu Olasılık ve Bayes Teoremi",
              "code": "MAT.10.7.2",
              "category": "olasilik",
              "badge": "Bayes Teoremi",
              "description": "Tıbbi tanı testlerinde yalancı pozitiflik oranları ve Bayes formülüyle güncellenen olasılıklar.",
              "learningOutcomes": [
                "Bir olayın gerçekleşmesinin diğer bir olaya bağlı olduğu koşullu olasılık durumlarını modelleyebilme.",
                "Bayes teoremini kullanarak tıbbi tarama ve risk analizlerinde ileriye yönelik yargıda bulunabilme."
              ],
              "activities": [
                {
                  "id": "act-10-olas-kosullu-bayes-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "olasilik",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#ef4444",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        }
      ],
      "topics": []
    },
    {
      "gradeNumber": 11,
      "title": "11. Sınıf",
      "subtitle": "İki Değişkenli İstatistik, Çokgenler, Trigonometri, Üstel-Logaritma ve Bileşke",
      "description": "İki nicel değişkenli istatistik (korelasyon), çokgenler ve özel dörtgenler (yamuk, paralelkenar, eşkenar dörtgen, dikdörtgen, kare, deltoid), trigonometrik fonksiyonlar ve periyot, üstel ve logaritmik fonksiyonlar (doğal taban e, pH, deprem Richter), fonksiyonların bileşkesi ve dört işlem.",
      "themes": [
        {
          "id": "tymm-11-istatistik",
          "code": "MAT.11.1",
          "orderNumber": 1,
          "themeName": "İstatistiksel Araştırma Süreci",
          "fullTitle": "MAT.11.1. İstatistiksel Araştırma Süreci (İki Nicel Değişken & Korelasyon)",
          "lessonHours": 24,
          "outcomeCount": 2,
          "description": "İki nicel değişkenli veri dağılımları, serpme diyagramı (saçılım grafiği), bölgelere göre sayım oranı, korelasyon katsayısı (yön ve güç: pozitif/negatif, zayıf/orta/güçlü), aykırı değerler.",
          "colorTheme": "#6366f1",
          "topics": [
            {
              "id": "11-ist-sacilim-korelasyon",
              "title": "Serpme Diyagramı ve Korelasyon Katsayısı",
              "code": "MAT.11.1.1",
              "category": "istatistik",
              "badge": "Korelasyon",
              "description": "İki değişken arasındaki doğrusal ilişkinin yönü (pozitif/negatif) ve gücü (r değeri).",
              "learningOutcomes": [
                "İki nicel değişkenli veri ile çalışabilme ve korelasyon katsayısına dayalı karar verebilme.",
                "Korelasyonun neden-sonuç ilişkisi anlamına gelmediğini örneklerle değerlendirebilme."
              ],
              "activities": [
                {
                  "id": "act-11-ist-sacilim-korelasyon-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "istatistik",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#6366f1",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-11-geo-cokgen-dortgen",
          "code": "MAT.11.2",
          "orderNumber": 2,
          "themeName": "Geometrik Şekiller",
          "fullTitle": "MAT.11.2. Geometrik Şekiller (Çokgenler & Özel Dörtgenler)",
          "lessonHours": 62,
          "outcomeCount": 5,
          "description": "Dışbükey ve içbükey çokgenler, iç açılar toplamı (n-2)·180°, dış açılar toplamı 360°, köşegen sayısı, düzgün çokgenler (beşgen, altıgen, sekizgen, onikigen), özel dörtgenler (yamuk, paralelkenar, eşkenar dörtgen, dikdörtgen, kare, deltoid) ve alan bağıntıları.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "11-geo-dortgen-ozel",
              "title": "Özel Dörtgenler Hiyerarşisi ve Alan Bağıntıları",
              "code": "MAT.11.2.2",
              "category": "geometri",
              "badge": "Özel Dörtgenler",
              "description": "Yamuk, paralelkenar, eşkenar dörtgen, dikdörtgen, kare ve deltoid arasındaki hiyerarşik ilişkiler ve köşegen özellikleri.",
              "learningOutcomes": [
                "Özel dörtgenlerin kenar, açı, köşegen ve simetri özelliklerinden hareketle aralarındaki ilişkileri yapılandırabilme.",
                "Dörtgenin alanının köşegen uzunlukları ve aradaki açının sinüsüyle A = 1/2·e·f·sin(θ) bağıntısını ispatlayabilme."
              ],
              "activities": [
                {
                  "id": "act-11-geo-dortgen-ozel-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#10b981",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            },
            {
              "id": "11-geo-duzgun-cokgen",
              "title": "Düzgün Çokgenler ve Simetri Eksenleri",
              "code": "MAT.11.2.4",
              "category": "geometri",
              "badge": "Düzgün Çokgenler",
              "description": "Düzgün beşgen, altıgen ve sekizgende bir iç açı (n-2)·180°/n, bir dış açı 360°/n, simetri eksenleri ve alan formülleri.",
              "learningOutcomes": [
                "Dışbükey çokgenlerin kenar, açı, köşegen, simetri ve alan özelliklerine dair çıkarım yapabilme.",
                "Düzgün altıgenin 6 eşkenar üçgenden oluştuğunu ve alanını modelleyebilme."
              ],
              "activities": [
                {
                  "id": "act-11-geo-duzgun-cokgen-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#10b981",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-11-trigonometrik-fonk",
          "code": "MAT.11.3.1",
          "orderNumber": 3,
          "themeName": "Nicelikler ve Değişimler (1) — Trigonometrik Fonksiyonlar",
          "fullTitle": "MAT.11.3 (1). Trigonometrik Fonksiyonlar ve Denklemler",
          "lessonHours": 42,
          "outcomeCount": 2,
          "description": "Trigonometrik referans fonksiyonlar (sin, cos, tan, cot), periyot T, teklik-çiftlik, grafik dönüşümleri g(x)=k·f(mx±r)±s, trigonometrik denklemler ve harmonik hareket/salınım modellemeleri.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "11-trig-fonk-grafik",
              "title": "Trigonometrik Fonksiyon Grafikleri ve Periyot",
              "code": "MAT.11.3.1",
              "category": "trigonometri",
              "badge": "Periyodik Değişim",
              "description": "y = sin(x) ve y = cos(x) dalgaları, periyot T = 2π/|m|, genlik k ve faz kayması.",
              "learningOutcomes": [
                "Trigonometrik referans fonksiyonların nitel özelliklerini (tanım/görüntü kümesi, artanlık/azalanlık, periyot) belirleyebilme.",
                "Trigonometrik denklemlerle basit harmonik hareket ve dönme dolap problemlerini çözebilme."
              ],
              "activities": [
                {
                  "id": "act-11-trig-fonk-grafik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "trigonometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#8b5cf6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-11-ustel-logaritma",
          "code": "MAT.11.3.2",
          "orderNumber": 4,
          "themeName": "Nicelikler ve Değişimler (2) — Üstel ve Logaritmik Fonksiyonlar",
          "fullTitle": "MAT.11.3 (2). Üstel ve Logaritmik Fonksiyonlar",
          "lessonHours": 42,
          "outcomeCount": 4,
          "description": "Üstel referans fonksiyon f(x)=aˣ, doğal taban e ve f(x)=eˣ, logaritmik fonksiyon f(x)=logₐ(x), doğal logaritma ln(x), y=x doğrusuna göre simetri ve ters fonksiyon ilişkisi, Richter deprem ölçeği, desibel ses seviyesi, pH değeri ve karbon-14 yaş tayini.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "11-ustel-log-ters",
              "title": "Üstel Fonksiyon, e Sayısı ve Logaritma",
              "code": "MAT.11.3.4",
              "category": "fonksiyon",
              "badge": "Logaritma",
              "description": "y = aˣ ile y = logₐ(x) arasındaki ters fonksiyon ilişkisi, log(x·y) = log(x) + log(y) ve taban değiştirme.",
              "learningOutcomes": [
                "Üstel fonksiyonların ters fonksiyonlarını inceleyerek logaritmik fonksiyona dair çıkarım yapabilme.",
                "Gerçek yaşam durumlarında üstel ve logaritmik denklem ve eşitsizlikleri çözebilme."
              ],
              "activities": [
                {
                  "id": "act-11-ustel-log-ters-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "fonksiyon",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#ec4899",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-11-bileske-dort-islem",
          "code": "MAT.11.3.3",
          "orderNumber": 5,
          "themeName": "Nicelikler ve Değişimler (3) — Fonksiyonlarda Bileşke ve Dört İşlem",
          "fullTitle": "MAT.11.3 (3). Fonksiyonların Bileşkesi ve Dört İşlem",
          "lessonHours": 36,
          "outcomeCount": 2,
          "description": "İki fonksiyonun bileşkesi (f ∘ g)(x) = f(g(x)), tanım ve değer kümeleri, fonksiyonlarda toplama, çıkarma, çarpma, bölme ve grafik temsilleri.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "11-fonk-bileske-islem",
              "title": "Bileşke Fonksiyon ve Fonksiyonel İşlemler",
              "code": "MAT.11.3.7",
              "category": "fonksiyon",
              "badge": "Bileşke Fonksiyon",
              "description": "(f ∘ g)(x) ve (g ∘ f)(x) bileşke sıralamasının etkisi, (f ∘ f⁻¹)(x) = x birim fonksiyonu ve çok aşamalı modellemeler.",
              "learningOutcomes": [
                "Fonksiyonların bileşkelerine ilişkin muhakeme yapabilme.",
                "Fonksiyonlarda dört işlem özelliklerini uygun cebirsel ve grafik temsillerle yorumlayabilme."
              ],
              "activities": [
                {
                  "id": "act-11-fonk-bileske-islem-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "fonksiyon",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#f59e0b",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        }
      ],
      "topics": []
    },
    {
      "gradeNumber": 12,
      "title": "12. Sınıf",
      "subtitle": "Diziler, Polinomlar, Çember ve Katı Cisimler, Değişimin Matematiği (Limit & Türev)",
      "description": "Aritmetik ve geometrik diziler, yüksek dereceli polinom fonksiyonlar, çemberin analitik ve geometrik elemanları, katı cisimler (prizma, silindir, piramit, koni, küre), limit ve süreklilik (0/0 belirsizliği), anlık değişim ve türev kuralları, türevin geometrik yorumu (teğet eğimi) ve ekstremum optimizasyon problemleri.",
      "themes": [
        {
          "id": "tymm-12-diziler",
          "code": "MAT.12.1.1",
          "orderNumber": 1,
          "themeName": "Nicelikler ve Değişimler (1) — Diziler",
          "fullTitle": "MAT.12.1 (1). Aritmetik ve Geometrik Diziler",
          "lessonHours": 14,
          "outcomeCount": 2,
          "description": "Aritmetik diziler (an = a1 + (n-1)d, Sn = n/2(a1+an)), geometrik diziler (an = a1·r^(n-1), Sn = a1(1-r^n)/(1-r)), gerçek sayı dizileri ile fonksiyonların karşılaştırılması.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "12-dizi-aritmetik-geometrik",
              "title": "Aritmetik ve Geometrik Dizi Toplamları",
              "code": "MAT.12.1.1",
              "category": "sayi",
              "badge": "Diziler",
              "description": "Sabit fark (d) ve sabit oran (r) ile ilerleyen dizilerin genel terimi ve ilk n terim toplamı (Sn).",
              "learningOutcomes": [
                "Aritmetik ve geometrik dizilerin özelliklerine ilişkin muhakeme yapabilme.",
                "Dizileri tanım kümesi pozitif tam sayılar olan fonksiyonlar olarak modelleyebilme."
              ],
              "activities": [
                {
                  "id": "act-12-dizi-aritmetik-geometrik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#8b5cf6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-12-polinom-fonk",
          "code": "MAT.12.1.2",
          "orderNumber": 2,
          "themeName": "Nicelikler ve Değişimler (2) — Polinom ve Rasyonel Fonksiyonlar",
          "fullTitle": "MAT.12.1 (2). Polinom Fonksiyonlar ve Eşitsizlikler",
          "lessonHours": 22,
          "outcomeCount": 3,
          "description": "Yüksek dereceli polinom fonksiyonlar p(x)=an·xⁿ+...+a0, derecesi, başkatsayısı, sıfırları, sonsuzdaki davranışı, teklik-çiftlik, rasyonel eşitsizlikler ve işaret tabloları.",
          "colorTheme": "#06b6d4",
          "topics": [
            {
              "id": "12-polinom-nitel-grafik",
              "title": "Polinom Fonksiyonların Nitel Özellikleri ve Kökleri",
              "code": "MAT.12.1.4",
              "category": "fonksiyon",
              "badge": "Polinomlar",
              "description": "3. ve 4. dereceden polinom grafiklerinin kıvrımları, x eksenini kestiği noktalar (sıfırları) ve sonsuzdaki asimptotik yönü.",
              "learningOutcomes": [
                "Gerçek katsayılı tek değişkenli polinom fonksiyonların nitel özelliklerine dair çıkarım yapabilme.",
                "Polinom ve rasyonel fonksiyonlarla ifade edilen eşitsizlikleri işaret tablosuyla çözebilme."
              ],
              "activities": [
                {
                  "id": "act-12-polinom-nitel-grafik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "fonksiyon",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#06b6d4",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-12-cember-daire",
          "code": "MAT.12.2",
          "orderNumber": 3,
          "themeName": "Geometrik Şekiller — Çember ve Daire",
          "fullTitle": "MAT.12.2. Çemberin Elemanları, Açıları ve Dairenin Alanı",
          "lessonHours": 26,
          "outcomeCount": 3,
          "description": "Kesen, kiriş, teğet, çap ve yay elemanları, merkez açı, çevre açı, teğet-kiriş açı, iç ve dış açı özellikleri, kirişler dörtgeni, teğetler dörtgeni, dairenin alanı ve daire dilimi.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "12-geo-cember-acilar",
              "title": "Çemberde Açılar ve Teğet-Kiriş Özellikleri",
              "code": "MAT.12.2.2",
              "category": "geometri",
              "badge": "Çember Geometrisi",
              "description": "Aynı yayı gören çevre açının ölçüsünün merkez açının yarısı olması (θ = 2α), çapı gören çevre açının 90° olması, teğetin yarıçapa dikliği.",
              "learningOutcomes": [
                "Çemberde açı, kiriş ve teğet özellikleri ile ilgili çıkarım yapabilme.",
                "Çemberin açı, kiriş, teğet özelliklerini ve dairenin alanını kullanarak problem çözebilme."
              ],
              "activities": [
                {
                  "id": "act-12-geo-cember-acilar-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#10b981",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-12-kati-cisimler",
          "code": "MAT.12.3",
          "orderNumber": 4,
          "themeName": "Geometrik Cisimler (Katı Cisimler)",
          "fullTitle": "MAT.12.3. Prizma, Silindir, Piramit, Koni ve Küre",
          "lessonHours": 30,
          "outcomeCount": 3,
          "description": "Dik prizma ve dik dairesel silindirin elemanları, cisim köşegeni, dik piramit, dik dairesel koni ve kürenin yüzey alanı ve hacim bağıntıları (Vpiramit = 1/3·B·h, Vkoni = 1/3·πr²h, Vküre = 4/3·πr³, Aküre = 4πr²).",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "12-geo-kati-cisim-hacim",
              "title": "Katı Cisimlerin Açınımları, Alan ve Hacimleri",
              "code": "MAT.12.3.2",
              "category": "geometri",
              "badge": "Katı Cisimler",
              "description": "Silindir ile koni (1/3 oranı), prizma ile piramit ve Arşimet'in silindir-küre hacim ilişkisi.",
              "learningOutcomes": [
                "Dik prizma ile silindirden yararlanarak piramit, koni ve kürenin hacim bağıntılarına analojik akıl yürütebilme.",
                "Katı cisimlerin alan ve hacim bağıntılarını mimari ve mühendislik problemlerinde kullanabilme."
              ],
              "activities": [
                {
                  "id": "act-12-geo-kati-cisim-hacim-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#f59e0b",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-12-degisim-limit",
          "code": "MAT.12.4.1",
          "orderNumber": 5,
          "themeName": "Değişimin Matematiği (1) — Limit ve Süreklilik",
          "fullTitle": "MAT.12.4 (1). Fonksiyonlarda Limit ve Süreklilik",
          "lessonHours": 28,
          "outcomeCount": 4,
          "description": "Bir noktaya sağdan ve soldan yaklaşma, limit tanımı, sonsuzdaki limit ve asimptotlar, 0/0 belirsizliğinin çarpanlara ayırma ile giderilmesi, bir noktada süreklilik şartı (lim f(x) = f(a)).",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "12-kalkulus-limit-tanimi",
              "title": "Yaklaşım Fikri, Limit ve 0/0 Belirsizliği",
              "code": "MAT.12.4.1",
              "category": "fonksiyon",
              "badge": "Limit",
              "description": "Sağdan limit lim(x→a⁺)f(x) ve soldan limit lim(x→a⁻)f(x) eşitliği, tanımsızlık ile belirsizlik farkı ve çarpanlara ayırma ile belirsizlik giderme.",
              "learningOutcomes": [
                "Fonksiyonların belirli bir nokta civarındaki veya sonsuzdaki davranışını limit kavramıyla grafikler üzerinden yorumlayabilme.",
                "0/0 belirsizliğini cebirsel sadeleştirme ile ortadan kaldırabilme.",
                "Bir fonksiyonun tanımlı olduğu noktadaki sürekliliğini limit eşitliğiyle değerlendirebilme."
              ],
              "activities": [
                {
                  "id": "act-12-kalkulus-limit-tanimi-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "fonksiyon",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#ec4899",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-12-degisim-turev-tanim",
          "code": "MAT.12.4.2",
          "orderNumber": 6,
          "themeName": "Değişimin Matematiği (2) — Türev Kavramı ve Kuralları",
          "fullTitle": "MAT.12.4 (2). Anlık Değişim Oranı ve Türev Kuralları",
          "lessonHours": 28,
          "outcomeCount": 3,
          "description": "Ortalama değişim oranından anlık değişim oranına geçiş (kesen doğrusundan teğet doğrusuna), türevin limit tanımı f'(x)=lim(h→0)[f(x+h)-f(x)]/h, diferansiyel dy=f'(x)dx, türev alma kuralları (xⁿ, √x, 1/x, toplam, fark, çarpım, bölüm, bileşke), türevlenemeyen köşe ve kırılma noktaları.",
          "colorTheme": "#06b6d4",
          "topics": [
            {
              "id": "12-kalkulus-anlik-degisim-turev",
              "title": "Anlık Değişim Oranı ve Türevin Limit Tanımı",
              "code": "MAT.12.4.5",
              "category": "fonksiyon",
              "badge": "Türev Tanımı",
              "description": "Kesen doğrusunun eğiminin h→0 limitinde teğet doğrusunun eğimine dönüşmesi ve f'(x) türev alma kuralları.",
              "learningOutcomes": [
                "Bir fonksiyonun belirli bir nokta civarındaki değişim oranından anlık değişim oranı ve türev kavramına ulaşabilme.",
                "Türev kurallarını (toplam, çarpım, bölüm, zincir kuralı) limit tanımıyla ispatlayabilme.",
                "Fonksiyonların köşe ve süreksizlik noktalarında neden türevinin olmadığını açıklayabilme."
              ],
              "activities": [
                {
                  "id": "act-12-kalkulus-anlik-degisim-turev-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "fonksiyon",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#06b6d4",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-12-degisim-turev-geometri",
          "code": "MAT.12.4.3",
          "orderNumber": 7,
          "themeName": "Değişimin Matematiği (3) — Türevin Geometrik Yorumu ve Optimizasyon",
          "fullTitle": "MAT.12.4 (3). Teğet Eğimi, Ekstremum ve Maksimum-Minimum Problemleri",
          "lessonHours": 28,
          "outcomeCount": 2,
          "description": "Teğet doğrusunun eğimi mt = f'(x0), artanlık-azalanlık aralıkları (f' > 0, f' < 0), yerel ve mutlak ekstremum noktaları (1. türev tablosu), Rolle ve Ortalama Değer Teoremleri, maksimum-minimum (optimizasyon) modellemeleri.",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "12-kalkulus-teget-ekstremum-optimizasyon",
              "title": "Teğet Eğimi, Ekstremum Noktalar ve Optimizasyon",
              "code": "MAT.12.4.8",
              "category": "fonksiyon",
              "badge": "Optimizasyon",
              "description": "Türevin sıfır olduğu tepe/çukur noktalar f'(x) = 0, en büyük alan, en küçük maliyet ve en yüksek kâr problemleri.",
              "learningOutcomes": [
                "Bir fonksiyonun ve türev fonksiyonunun grafik temsilleri arasındaki ilişkiyi çözümleyebilme.",
                "Gerçek yaşam durumlarında türevi kullanarak maksimum-minimum (optimizasyon) problemlerini çözebilme."
              ],
              "activities": [
                {
                  "id": "act-12-kalkulus-teget-ekstremum-optimizasyon-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "fonksiyon",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#3b82f6",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        },
        {
          "id": "tymm-12-hazir-veriler",
          "code": "MAT.12.5",
          "orderNumber": 8,
          "themeName": "Hazır Veriler Üzerinde Çalışma",
          "fullTitle": "MAT.12.5. Hazır Veriler Üzerinde İstatistiksel Çalışma",
          "lessonHours": 30,
          "outcomeCount": 1,
          "description": "Toplumsal ve bilimsel gerçek veri setleri (küresel iklim değişikliği, nüfus artışı, sağlık verileri) üzerinden istatistiksel araştırma tasarımları, çok değişkenli analizler ve veriye dayalı karar verme.",
          "colorTheme": "#6366f1",
          "topics": [
            {
              "id": "12-ist-hazir-veri-analiz",
              "title": "Hazır Veriye Dayalı İstatistiksel Araştırma",
              "code": "MAT.12.5.1",
              "category": "veri",
              "badge": "Büyük Veri & Karar",
              "description": "Resmî kurumlardan elde edilen gerçek verilerle çok değişkenli dağılımların analizi ve raporlaştırılması.",
              "learningOutcomes": [
                "Toplumsal ve bilimsel durumlara ilişkin hazır veri ile çalışabilme ve hazır veriye dayalı karar verebilme.",
                "İstatistiksel sonuçları eleştirel gözle değerlendirip bilimsel rapor sunabilme."
              ],
              "activities": [
                {
                  "id": "act-12-ist-hazir-veri-analiz-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "veri",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#6366f1",
                  "initialObjects": [],
                  "steps": [],
                  "validationRules": [],
                  "completedMessage": ""
                }
              ]
            }
          ]
        }
      ],
      "topics": []
    }
  ]
};
