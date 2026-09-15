import { Level } from '@/types/curriculum';

export const ilkokulLevel: Level = {
  "id": "ilkokul",
  "title": "İlkokul",
  "subtitle": "1, 2, 3 ve 4. Sınıf",
  "gradeRange": "1-4. Sınıf",
  "description": "T.C. Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli (TYMM) İlkokul Matematik Öğretim Programı.",
  "grades": [
    {
      "gradeNumber": 1,
      "title": "1. Sınıf",
      "subtitle": "Oyunlu & Görsel Görev Dünyası",
      "description": "Okuma yazma gerektirmeyen meyve-hayvan saymaca oyunları, labirent yön bulma, paralarımız, şekiller ve nesne grafiği.",
      "themes": [
        {
          "id": "tymm-1-geo-1",
          "code": "MAT.1.3",
          "orderNumber": 1,
          "themeName": "Nesnelerin Geometrisi (1)",
          "fullTitle": "MAT.1.3. Nesnelerin Geometrisi (1)",
          "lessonHours": 15,
          "outcomeCount": 2,
          "description": "Yer, yön, konum bildiren kavramlar (altında, üstünde, sağında, solunda) ve eş nesneler.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "1-geo-yon-konum",
              "title": "Yer, Yön ve Konum Bulmaca",
              "code": "MAT.1.3.1",
              "category": "geometri",
              "badge": "Konum & Yön",
              "description": "Sevimli tavşanı havuç hedefine ulaştırmak için yön yönergelerini takip edin.",
              "learningOutcomes": [
                "Hedefe ulaşmak için mesafeleri ve yönleri içeren yönergeleri çözümler."
              ],
              "activities": [
                {
                  "id": "act-1-geo-yon-konum-ornek",
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
          "id": "tymm-1-sayilar-1",
          "code": "MAT.1.1",
          "orderNumber": 2,
          "themeName": "Sayılar ve Nicelikler (1)",
          "fullTitle": "MAT.1.1. Sayılar ve Nicelikler (1)",
          "lessonHours": 57,
          "outcomeCount": 7,
          "description": "20’ye kadar olan sayılar, kardinal değer, ritmik sayma, azalan-artan örüntüler ve tahmin.",
          "colorTheme": "#f43f5e",
          "topics": [
            {
              "id": "1-sayi-sayma-20",
              "title": "20’ye Kadar Nesne Sayma & Örüntüler",
              "code": "MAT.1.1.1",
              "category": "sayi",
              "badge": "Sayılar",
              "description": "Elmalar, yıldızlar ve renkli toplarla 20’ye kadar sayma ve örüntü tamamlama.",
              "learningOutcomes": [
                "Rakamları ve 20’ye kadar olan sayıları nicelikleri temsil etmek için kullanır."
              ],
              "activities": [
                {
                  "id": "act-1-sayi-sayma-20-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#f43f5e",
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
          "id": "tymm-1-olcme-1",
          "code": "MAT.1.1",
          "orderNumber": 3,
          "themeName": "Sayılar ve Nicelikler (2) — Ölçme",
          "fullTitle": "MAT.1.1. Sayılar ve Nicelikler (2) — Standart Olmayan Ölçme",
          "lessonHours": 18,
          "outcomeCount": 1,
          "description": "Parmak, karış, ayak, adım ile uzunluk ölçme; tahterevalli ile ağır-hafif kütle karşılaştırması.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "1-olcme-karis-adim",
              "title": "Karış, Adım ve Tahterevalli Dengesi",
              "code": "MAT.1.1.8",
              "category": "olcme",
              "badge": "Ölçme & Tartma",
              "description": "Masayı karışla, sınıfı adımla ölçme; tahterevallide fil ve kuşu dengeleme.",
              "learningOutcomes": [
                "Standart olmayan ölçme araçları ile uzunluk ve kütleyi tahmin eder."
              ],
              "activities": [
                {
                  "id": "act-1-olcme-karis-adim-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "olcme",
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
          "id": "tymm-1-cebir-1",
          "code": "MAT.1.2",
          "orderNumber": 4,
          "themeName": "İşlemlerden Cebirsel Düşünmeye",
          "fullTitle": "MAT.1.2. İşlemlerden Cebirsel Düşünmeye",
          "lessonHours": 50,
          "outcomeCount": 4,
          "description": "20’ye kadar toplama ve çıkarma, terazi eşitlik modeli, zihinden işlem stratejileri.",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "1-cebir-toplama-cikarma",
              "title": "Resimli Toplama, Çıkarma & Terazi Eşitliği",
              "code": "MAT.1.2.1",
              "category": "islemler",
              "badge": "Dört İşlem",
              "description": "Meyveleri bir araya getirme (+), sepetten meyve eksiltme (-) ve terazide eşitlik sağlama.",
              "learningOutcomes": [
                "Günlük yaşamın içerdiği toplama ve çıkarma işlemlerini çözümler."
              ],
              "activities": [
                {
                  "id": "act-1-cebir-toplama-cikarma-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "islemler",
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
          "id": "tymm-1-para-1",
          "code": "MAT.1.1",
          "orderNumber": 5,
          "themeName": "Sayılar ve Nicelikler (3) — Paralarımız",
          "fullTitle": "MAT.1.1. Sayılar ve Nicelikler (3) — Paralarımız",
          "lessonHours": 7,
          "outcomeCount": 1,
          "description": "1 TL, 5 TL, 10 TL, 20 TL, 50 TL, 100 TL ve 200 TL madeni ve kâğıt paralarımızın tanıtımı.",
          "colorTheme": "#eab308",
          "topics": [
            {
              "id": "1-para-tanima",
              "title": "Paralarımızı Tanıyalım & Alışveriş İstasyonu",
              "code": "MAT.1.1.9",
              "category": "sayi",
              "badge": "Paralarımız",
              "description": "Türk lirasını tanıma, kumbarada para biriktirme ve manavdan alışveriş yapma.",
              "learningOutcomes": [
                "Paraların temsil ettiği büyüklükleri tanır."
              ],
              "activities": [
                {
                  "id": "act-1-para-tanima-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
                  "description": "",
                  "learningGoal": "",
                  "folderColor": "#eab308",
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
          "id": "tymm-1-geo-2",
          "code": "MAT.1.3",
          "orderNumber": 6,
          "themeName": "Nesnelerin Geometrisi (2)",
          "fullTitle": "MAT.1.3. Nesnelerin Geometrisi (2) — Şekiller",
          "lessonHours": 15,
          "outcomeCount": 3,
          "description": "Yuvarlak ve köşeli nesneler; üçgen, kare, dikdörtgen ve çemberin biçimsel özellikleri.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "1-geo-sekil-kose",
              "title": "Üçgen, Kare, Dikdörtgen & Çember",
              "code": "MAT.1.3.3",
              "category": "geometri",
              "badge": "Geometrik Şekiller",
              "description": "Köşesi olan ve olmayan nesneleri ayırma, şekillerden ev ve robot tasarlama.",
              "learningOutcomes": [
                "Biçimsel özelliklerine göre geometrik şekilleri sınıflandırır."
              ],
              "activities": [
                {
                  "id": "act-1-geo-sekil-kose-ornek",
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
            }
          ]
        },
        {
          "id": "tymm-1-veri-1",
          "code": "MAT.1.4",
          "orderNumber": 7,
          "themeName": "Veriye Dayalı Araştırma",
          "fullTitle": "MAT.1.4. Veriye Dayalı Araştırma — Nesne Grafiği",
          "lessonHours": 10,
          "outcomeCount": 1,
          "description": "Kategorik veriye dayalı tek veri grubuna yönelik çetele, sıklık tablosu ve nesne grafiği.",
          "colorTheme": "#06b6d4",
          "topics": [
            {
              "id": "1-veri-nesne-grafigi",
              "title": "Çetele & Nesne Grafiği Oluşturma",
              "code": "MAT.1.4.1",
              "category": "istatistik",
              "badge": "Veri & Grafik",
              "description": "Sınıfımızdaki en sevilen meyveleri sayarak nesne grafiğine yerleştirelim.",
              "learningOutcomes": [
                "Kategorik veriye dayalı temel veri grubu ile çalışır ve nesne grafiği çizer."
              ],
              "activities": [
                {
                  "id": "act-1-veri-nesne-grafigi-ornek",
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
        }
      ],
      "topics": []
    },
    {
      "gradeNumber": 2,
      "title": "2. Sınıf",
      "subtitle": "Etkileşimli Matematik",
      "description": "100’e kadar sayılar, basamak değeri, bütün-yarım-çeyrek, çarpma ve bölmeye giriş, saatler ve simetri.",
      "themes": [
        {
          "id": "tymm-2-geo-1",
          "code": "MAT.2.3",
          "orderNumber": 1,
          "themeName": "Nesnelerin Geometrisi (1)",
          "fullTitle": "MAT.2.3. Nesnelerin Geometrisi (1) — 3D Cisimler",
          "lessonHours": 25,
          "outcomeCount": 5,
          "description": "Küp, kare prizma, dikdörtgen prizma, üçgen prizma, küre, silindir ve sıvı ölçme.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "2-geo-cisimler",
              "title": "Geometrik Cisimler & Sıvı Ölçme",
              "code": "MAT.2.3.1",
              "category": "geometri",
              "badge": "3D Cisimler",
              "description": "Günlük nesneleri küp, silindir, küre olarak tanıma ve kaplarla sıvı miktarını tahmin etme.",
              "learningOutcomes": [
                "Geometrik cisimleri sınıflandırır ve sıvı miktarını tahmin eder."
              ],
              "activities": [
                {
                  "id": "act-2-geo-cisimler-ornek",
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
          "id": "tymm-2-sayilar-1",
          "code": "MAT.2.1",
          "orderNumber": 2,
          "themeName": "Sayılar ve Nicelikler (1)",
          "fullTitle": "MAT.2.1. Sayılar ve Nicelikler (1) — 100’e Kadar Sayılar",
          "lessonHours": 41,
          "outcomeCount": 6,
          "description": "100’e kadar sayılar, basamak değeri (onluk-birlik), 2-3-4-5 ritmik sayma, sayı doğrusu ve yuvarlama.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "2-sayi-onluk-birlik",
              "title": "Onluk-Birlik Basamak & Ritmik Sayma",
              "code": "MAT.2.1.1",
              "category": "sayi",
              "badge": "Basamak Değeri",
              "description": "Onluk taban blokları, yüzlük tablo, sayı doğrusu ve en yakın onluğa yuvarlama.",
              "learningOutcomes": [
                "100’e kadar olan niceliklerin sembolik temsillerinden yararlanır ve sayıları çözümler."
              ],
              "activities": [
                {
                  "id": "act-2-sayi-onluk-birlik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
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
          "id": "tymm-2-cebir-1",
          "code": "MAT.2.2",
          "orderNumber": 3,
          "themeName": "İşlemlerden Cebirsel Düşünmeye",
          "fullTitle": "MAT.2.2. İşlemlerden Cebirsel Düşünmeye",
          "lessonHours": 55,
          "outcomeCount": 6,
          "description": "Eldeli toplama, onluk bozarak çıkarma, çarpma (tekrarlı toplama) ve bölme (ardışık çıkarma).",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "2-cebir-dortislem",
              "title": "Toplama, Çıkarma, Çarpma & Bölme",
              "code": "MAT.2.2.1",
              "category": "islemler",
              "badge": "Dört İşlem",
              "description": "Problem çözme, eldeli toplama, çarpım tablosuna giriş (1-5) ve eşit paylaştırma.",
              "learningOutcomes": [
                "Toplama, çıkarma, çarpma ve bölme işlemlerini anlamlandırır ve problem çözer."
              ],
              "activities": [
                {
                  "id": "act-2-cebir-dortislem-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "islemler",
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
          "id": "tymm-2-sayilar-2",
          "code": "MAT.2.1",
          "orderNumber": 4,
          "themeName": "Sayılar ve Nicelikler (2)",
          "fullTitle": "MAT.2.1. Sayılar ve Nicelikler (2) — Kesirler, Para & Zaman",
          "lessonHours": 30,
          "outcomeCount": 5,
          "description": "Bütün-yarım-çeyrek, paralarımız (TL-Kuruş dönüşümü), analog ve dijital saat okuma, metre/cm, kg/g.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "2-kesir-para-zaman",
              "title": "Kesirler, Saatler, Paralarımız & Metre",
              "code": "MAT.2.1.7",
              "category": "olcme",
              "badge": "Kesir & Zaman",
              "description": "Pizzada bütün/yarım/çeyrek, analog saat akrep-yelkovan, kuruş-TL ve metre cetveli.",
              "learningOutcomes": [
                "Bütün, yarım ve çeyreği çözümler; saatleri ve paraları okur."
              ],
              "activities": [
                {
                  "id": "act-2-kesir-para-zaman-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "olcme",
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
          "id": "tymm-2-geo-2",
          "code": "MAT.2.3",
          "orderNumber": 5,
          "themeName": "Nesnelerin Geometrisi (2)",
          "fullTitle": "MAT.2.3. Nesnelerin Geometrisi (2) — Harita & Simetri",
          "lessonHours": 11,
          "outcomeCount": 2,
          "description": "Mesafe ve yönlerle hedefe ulaşma haritası, katlama çizgisi ile ayna simetrisi.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "2-geo-simetri-harita",
              "title": "Harita ile Yön Bulma & Simetri Doğrusu",
              "code": "MAT.2.3.6",
              "category": "geometri",
              "badge": "Simetri & Harita",
              "description": "Kroki üzerinde okul yolunu bulma ve kelebek kanadında simetri doğrusunu katlama.",
              "learningOutcomes": [
                "Hedefe ulaşmak için strateji seçer ve simetrik şekilleri ayırt eder."
              ],
              "activities": [
                {
                  "id": "act-2-geo-simetri-harita-ornek",
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
            }
          ]
        },
        {
          "id": "tymm-2-veri-1",
          "code": "MAT.2.4",
          "orderNumber": 6,
          "themeName": "Veriye Dayalı Araştırma",
          "fullTitle": "MAT.2.4. Veriye Dayalı Araştırma — Şekil Grafiği",
          "lessonHours": 10,
          "outcomeCount": 1,
          "description": "İki veri grubuna yönelik çetele, sıklık tablosu ve şekil grafiği oluşturma ve yorumlama.",
          "colorTheme": "#06b6d4",
          "topics": [
            {
              "id": "2-veri-sekil-grafigi",
              "title": "İki Veri Grubu & Şekil Grafiği",
              "code": "MAT.2.4.1",
              "category": "istatistik",
              "badge": "Şekil Grafiği",
              "description": "Kız ve erkek öğrencilerin sevdikleri mevsimleri şekil grafiğinde karşılaştıralım.",
              "learningOutcomes": [
                "Kategorik veriye dayalı iki veri grubu ile çalışır ve şekil grafiği çizer."
              ],
              "activities": [
                {
                  "id": "act-2-veri-sekil-grafigi-ornek",
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
        }
      ],
      "topics": []
    },
    {
      "gradeNumber": 3,
      "title": "3. Sınıf",
      "subtitle": "Etkileşimli Matematik",
      "description": "1000’e kadar sayılar, birim kesirler, tek/çift sayılar, geometrik cisimlerin köşe-yüz-ayrıtları, çevre uzunluğu ve nokta grafiği.",
      "themes": [
        {
          "id": "tymm-3-sayilar-1",
          "code": "MAT.3.1",
          "orderNumber": 1,
          "themeName": "Sayılar ve Nicelikler (1)",
          "fullTitle": "MAT.3.1. Sayılar ve Nicelikler (1) — 1000’e Kadar Sayılar",
          "lessonHours": 26,
          "outcomeCount": 8,
          "description": "3 basamaklı sayılar, basamak değeri, tek-çift sayıların toplamı, 6-7-8-9 ritmik sayma.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "3-sayi-1000",
              "title": "3 Basamaklı Sayılar, Tek/Çift & Ritmik Sayma",
              "code": "MAT.3.1.1",
              "category": "sayi",
              "badge": "3 Basamaklı Sayılar",
              "description": "Yüzlük bloklar, tek-çift sayı genellemeleri ve 1000 içinde yüzer ritmik sayma.",
              "learningOutcomes": [
                "1000’e kadar olan sayıları çözümler, tek-çift ilişkisini açıklar."
              ],
              "activities": [
                {
                  "id": "act-3-sayi-1000-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
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
          "id": "tymm-3-sayilar-2",
          "code": "MAT.3.1",
          "orderNumber": 2,
          "themeName": "Sayılar ve Nicelikler (2) — Kesirler & Ölçme",
          "fullTitle": "MAT.3.1. Sayılar ve Nicelikler (2) — Birim Kesir & Zaman/Ölçme",
          "lessonHours": 45,
          "outcomeCount": 8,
          "description": "Birim kesirler (1/n), pay-payda ilişkisi, saat-dakika-saniye, kilometre, ton ve para dönüşümleri.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "3-kesir-birim",
              "title": "Birim Kesirler & Pay-Payda İlişkisi",
              "code": "MAT.3.1.9",
              "category": "sayi",
              "badge": "Birim Kesir",
              "description": "Bir bütünü 4 eş parçaya bölüp 1/4 birim kesrini sayı doğrusunda ve modelde gösterme.",
              "learningOutcomes": [
                "Birim kesirleri modeller ve pay-payda ilişkisini çözümler."
              ],
              "activities": [
                {
                  "id": "act-3-kesir-birim-ornek",
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
          "id": "tymm-3-cebir-1",
          "code": "MAT.3.2",
          "orderNumber": 3,
          "themeName": "İşlemlerden Cebirsel Düşünmeye",
          "fullTitle": "MAT.3.2. İşlemlerden Cebirsel Düşünmeye",
          "lessonHours": 55,
          "outcomeCount": 8,
          "description": "3 basamaklı 4 işlem, zihinden işlem stratejileri, kısa yoldan 10 ve 100 ile çarpma/bölme, yönergeler.",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "3-cebir-dortislem",
              "title": "3 Basamaklı Dört İşlem & Kısa Yollar",
              "code": "MAT.3.2.1",
              "category": "islemler",
              "badge": "Dört İşlem",
              "description": "Eldeli toplama, onluk bozarak çıkarma, 10/100 ile kısa yoldan çarpma ve problem kurma.",
              "learningOutcomes": [
                "3 basamaklı sayılarla dört işlem yapar ve problem durumlarını yapılandırır."
              ],
              "activities": [
                {
                  "id": "act-3-cebir-dortislem-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "islemler",
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
          "id": "tymm-3-geo-1",
          "code": "MAT.3.3",
          "orderNumber": 4,
          "themeName": "Nesnelerin Geometrisi (1)",
          "fullTitle": "MAT.3.3. Nesnelerin Geometrisi (1) — Şekil ve Çevre",
          "lessonHours": 21,
          "outcomeCount": 5,
          "description": "Geometrik cisimlerin köşe-yüz-ayrıtları; çokgenler (üçgen, dörtgen, beşgen, altıgen, sekizgen), köşegenler, çevre uzunluğu ve litre.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "3-geo-kose-yuz-ayrit",
              "title": "Köşe, Yüz, Ayrıt, Çokgenler & Çevre",
              "code": "MAT.3.3.1",
              "category": "geometri",
              "badge": "Çokgenler & Çevre",
              "description": "Küpün 6 yüzü, 8 köşesi, 12 ayrıtı; çokgenlerin kenar sayıları, köşegenler ve çevre uzunluğu.",
              "learningOutcomes": [
                "Geometrik cisimlerin özelliklerini yorumlar ve şekillerin çevre uzunluğunu hesaplar."
              ],
              "activities": [
                {
                  "id": "act-3-geo-kose-yuz-ayrit-ornek",
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
          "id": "tymm-3-geo-2",
          "code": "MAT.3.3",
          "orderNumber": 5,
          "themeName": "Nesnelerin Geometrisi (2) — Simetri & Kodlama",
          "fullTitle": "MAT.3.3. Nesnelerin Geometrisi (2) — Simetri ve Kodlama",
          "lessonHours": 10,
          "outcomeCount": 3,
          "description": "Birden fazla simetri doğrusu olan şekiller, simetrik şekli tamamlama, yönergelerle kodlama.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "3-geo-simetri-kodlama",
              "title": "Çoklu Simetri Doğruları & Şekil Kodlama",
              "code": "MAT.3.3.6",
              "category": "geometri",
              "badge": "Simetri & Kodlama",
              "description": "Karenin 4, dikdörtgenin 2, dairenin sonsuz simetri doğrusu; yarım şekli simetriğine tamamlama.",
              "learningOutcomes": [
                "Birden fazla simetri doğrusunu çözümler ve kodlama ile simetrik şekil oluşturur."
              ],
              "activities": [
                {
                  "id": "act-3-geo-simetri-kodlama-ornek",
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
            }
          ]
        },
        {
          "id": "tymm-3-veri-1",
          "code": "MAT.3.4",
          "orderNumber": 6,
          "themeName": "Veriye Dayalı Araştırma",
          "fullTitle": "MAT.3.4. Veriye Dayalı Araştırma — Nokta Grafiği",
          "lessonHours": 15,
          "outcomeCount": 1,
          "description": "Kategorik ve sayma ile elde edilen nicel veriye dayalı tek veri grubuna yönelik nokta grafiği.",
          "colorTheme": "#06b6d4",
          "topics": [
            {
              "id": "3-veri-nokta-grafigi",
              "title": "Nokta Grafiği ile Veri Analizi",
              "code": "MAT.3.4.1",
              "category": "istatistik",
              "badge": "Nokta Grafiği",
              "description": "Öğrencilerin kardeş sayılarını ve kitap okuma miktarlarını nokta grafiğiyle gösterelim.",
              "learningOutcomes": [
                "Nokta grafiğini seçer, verileri analiz eder ve yorumlar."
              ],
              "activities": [
                {
                  "id": "act-3-veri-nokta-grafigi-ornek",
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
        }
      ],
      "topics": []
    },
    {
      "gradeNumber": 4,
      "title": "4. Sınıf",
      "subtitle": "Etkileşimli Matematik",
      "description": "6 basamaklı sayılar, basit/bileşik/denk kesirler, 4 basamaklı dört işlem, açılar dönme miktarı, açınımlar, ayna simetrisi ve olasılık.",
      "themes": [
        {
          "id": "tymm-4-sayilar-1",
          "code": "MAT.4.1",
          "orderNumber": 1,
          "themeName": "Sayılar ve Nicelikler (1)",
          "fullTitle": "MAT.4.1. Sayılar ve Nicelikler (1) — 6 Basamaklı Sayılar",
          "lessonHours": 23,
          "outcomeCount": 5,
          "description": "6 basamaklı sayılar, bölükler (Birler ve Binler bölüğü), 1.000.000, yüzer ve biner ritmik sayma.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "4-sayi-6basamak",
              "title": "6 Basamaklı Sayılar, Bölükler & Ritmik Sayma",
              "code": "MAT.4.1.1",
              "category": "sayi",
              "badge": "Bölükler & Milyon",
              "description": "Basamak ve bölük tablosu (Birler ve Binler bölüğü), yüzer/biner sayma ve örüntüler.",
              "learningOutcomes": [
                "En fazla altı basamaklı sayıları okur, yazar, basamak ve bölüklerini belirler."
              ],
              "activities": [
                {
                  "id": "act-4-sayi-6basamak-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
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
          "id": "tymm-4-sayilar-2",
          "code": "MAT.4.1",
          "orderNumber": 2,
          "themeName": "Sayılar ve Nicelikler (2) — Kesirler & Ölçme",
          "fullTitle": "MAT.4.1. Sayılar ve Nicelikler (2) — Kesir Çeşitleri & Denk Kesirler",
          "lessonHours": 43,
          "outcomeCount": 8,
          "description": "Basit, bileşik, tam sayılı kesirler, denk kesirler, paydaları eşit kesirlerle toplama/çıkarma, mm/km/ton/g dönüşümleri.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "4-kesir-cesitleri-denk",
              "title": "Basit, Bileşik, Tam Sayılı & Denk Kesirler",
              "code": "MAT.4.1.6",
              "category": "sayi",
              "badge": "Kesirler",
              "description": "Kesir şeritleri, denk kesir katlama, paydaları eşit kesirlerle toplama ve çıkarma.",
              "learningOutcomes": [
                "Basit, bileşik, tam sayılı ve denk kesirleri modeller; paydaları eşit kesirlerle işlem yapar."
              ],
              "activities": [
                {
                  "id": "act-4-kesir-cesitleri-denk-ornek",
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
          "id": "tymm-4-cebir-1",
          "code": "MAT.4.2",
          "orderNumber": 3,
          "themeName": "İşlemlerden Cebirsel Düşünmeye",
          "fullTitle": "MAT.4.2. İşlemlerden Cebirsel Düşünmeye",
          "lessonHours": 50,
          "outcomeCount": 9,
          "description": "4 basamaklı 4 işlem, kısa yoldan 10/100/1000 çarpma ve bölme, 5 adımlı algoritmik yönergeler, eşitlik.",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "4-cebir-dortislem-kisa",
              "title": "4 Basamaklı Dört İşlem & Kısa Yollar",
              "code": "MAT.4.2.1",
              "category": "islemler",
              "badge": "Dört İşlem",
              "description": "4 basamaklı sayılarla işlemler, kısa yoldan 10/100/1000 çarpma/bölme ve eşitlik analizi.",
              "learningOutcomes": [
                "En çok dört basamaklı sayılarla dört işlem yapar ve eşitlik kavramını yorumlar."
              ],
              "activities": [
                {
                  "id": "act-4-cebir-dortislem-kisa-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "islemler",
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
          "id": "tymm-4-geo-1",
          "code": "MAT.4.3",
          "orderNumber": 4,
          "themeName": "Nesnelerin Geometrisi (1)",
          "fullTitle": "MAT.4.3. Nesnelerin Geometrisi (1) — Açınımlar, Üçgenler & Alan",
          "lessonHours": 17,
          "outcomeCount": 4,
          "description": "Geometrik cisim açınımları, kenarlarına göre üçgen çeşitleri (çeşitkenar, ikizkenar, eşkenar), çevre ve birim kare alan.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "4-geo-acınım-ucgen-alan",
              "title": "Cisim Açınımları, Üçgen Çeşitleri & Birim Kare Alan",
              "code": "MAT.4.3.1",
              "category": "geometri",
              "badge": "Açınım & Alan",
              "description": "Küp ve prizma açınımı katlama, üçgen çeşitleri ve birim karelerle alan kaplama.",
              "learningOutcomes": [
                "Geometrik cisimlerin açınımlarını yapılandırır ve şekillerin alanını tahmin eder."
              ],
              "activities": [
                {
                  "id": "act-4-geo-acınım-ucgen-alan-ornek",
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
          "id": "tymm-4-geo-2",
          "code": "MAT.4.3",
          "orderNumber": 5,
          "themeName": "Nesnelerin Geometrisi (2) — Açı",
          "fullTitle": "MAT.4.3. Nesnelerin Geometrisi (2) — Açılar Bir Dönme Miktarıdır",
          "lessonHours": 11,
          "outcomeCount": 3,
          "description": "Açı kavramı bir dönme miktarıdır; dik açı (90° referans), dar açı (<90°), geniş açı (>90°), gönye kullanımı.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "4-geo-aci-donme",
              "title": "Açı Bir Dönme Miktarıdır: Dik, Dar, Geniş Açı",
              "code": "MAT.4.3.5",
              "category": "geometri",
              "badge": "Açılar",
              "description": "Kapı menteşesi ve saat yelkovanının dönme miktarı, dik açı referansı ve gönye ile sınıflandırma.",
              "learningOutcomes": [
                "Açıyı bir dönme miktarı olarak yorumlar; dik açıyı referans alarak açıları dar ve geniş olarak sınıflandırır."
              ],
              "activities": [
                {
                  "id": "act-4-geo-aci-donme-ornek",
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
            }
          ]
        },
        {
          "id": "tymm-4-geo-3",
          "code": "MAT.4.3",
          "orderNumber": 6,
          "themeName": "Nesnelerin Geometrisi (3) — Ayna Simetrisi & FeTeMM",
          "fullTitle": "MAT.4.3. Nesnelerin Geometrisi (3) — Ayna Simetrisi ve Kodlama",
          "lessonHours": 13,
          "outcomeCount": 3,
          "description": "Ayna simetrisi (doğruya göre yansıma), noktalı kâğıtta simetri çizimi, FeTeMM köprü tasarımı.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "4-geo-ayna-simetrisi",
              "title": "Ayna Simetrisi & FeTeMM Köprü Tasarımı",
              "code": "MAT.4.3.8",
              "category": "geometri",
              "badge": "Ayna Simetrisi",
              "description": "Aynadaki görüntü ile doğruya göre simetri ilişkisi, kilim motifleri ve dayanıklı köprü modeli.",
              "learningOutcomes": [
                "Aynaya göre simetriyi yorumlar ve FeTeMM kapsamında simetrik yapılar tasarlar."
              ],
              "activities": [
                {
                  "id": "act-4-geo-ayna-simetrisi-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "geometri",
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
          "id": "tymm-4-olasilik-veri",
          "code": "MAT.4.4",
          "orderNumber": 7,
          "themeName": "Olayların Olasılığı ve Veriye Dayalı Araştırma",
          "fullTitle": "MAT.4.4. Olayların Olasılığı ve Veriye Dayalı Araştırma",
          "lessonHours": 15,
          "outcomeCount": 2,
          "description": "İmkânsız, olabilir, kesin olasılık kavramları; kategorik ve nicel 2 veri grubu grafikleri (nesne, şekil, nokta, çetele).",
          "colorTheme": "#06b6d4",
          "topics": [
            {
              "id": "4-olasilik-veri-analizi",
              "title": "İmkânsız, Olabilir, Kesin & 2 Veri Grubu Grafiği",
              "code": "MAT.4.4.1",
              "category": "olasilik",
              "badge": "Olasılık & Veri",
              "description": "Olasılık çarkı, şeffaf torbadan bilye çekme ve iki sınıfın boy/kilo verilerini karşılaştırma.",
              "learningOutcomes": [
                "Olayların olma olasılığını imkânsız, olabilir, kesin olarak belirler ve iki veri grubu grafiği çizer."
              ],
              "activities": [
                {
                  "id": "act-4-olasilik-veri-analizi-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "olasilik",
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
        }
      ],
      "topics": []
    }
  ]
};
