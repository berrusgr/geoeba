// Türkiye Yüzyılı Maarif Modeli (TYMM) 2026 — Ortaokul (5-8) ve Lise (9-12) Resmî Müfredatı
import { CurriculumData } from '@/types/curriculum';
import { ilkokulLevel } from './ilkokulData';
import { liseLevel } from './liseData';

export const curriculumData: CurriculumData = {
  levels: {
    ilkokul: ilkokulLevel,
    ortaokul: {
  "id": "ortaokul",
  "title": "Ortaokul",
  "subtitle": "5, 6, 7 ve 8. Sınıf",
  "gradeRange": "5-8. Sınıf",
  "description": "T.C. Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli (TYMM) Öğretim Programı.",
  "grades": [
    {
      "gradeNumber": 5,
      "title": "5. Sınıf",
      "subtitle": "Etkileşimli Matematik",
      "description": "Geometrik Şekiller, Sayılar ve Nicelikler, Geometrik Nicelikler, İstatistiksel Araştırma, Cebirsel Düşünme ve Olasılık.",
      "themes": [
        {
          "id": "tymm-5-geo-sekiller",
          "code": "MAT.5.3",
          "orderNumber": 1,
          "themeName": "Geometrik Şekiller",
          "fullTitle": "MAT.5.3. Geometrik Şekiller",
          "lessonHours": 38,
          "outcomeCount": 7,
          "description": "Temel geometrik çizimler, açı ölçme (90°, 180°, 360°), çokgenler, çember ve pergel inşaları, koordinat bölgeleri.",
          "colorTheme": "#ef4444",
          "topics": [
            {
              "id": "5-geo-cizim-insa",
              "title": "Temel Çizimler ve İnşalar",
              "code": "MAT.5.3.1",
              "category": "geometri",
              "badge": "Geometrik Şekiller",
              "description": "Nokta, doğru, doğru parçası, ışın, dikme ve pergel ile çember çizimleri.",
              "learningOutcomes": [
                "Temel geometrik çizimler için araç ve teknoloji kullanır."
              ],
              "activities": [
                {
                  "id": "act-5-geo-cizim-insa-ornek",
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
            },
            {
              "id": "5-geo-acilar",
              "title": "Açılar ve Açı Ölçümü",
              "code": "MAT.5.3.2",
              "category": "geometri",
              "badge": "Geometrik Şekiller",
              "description": "Dar, dik, geniş, doğru ve tam açıların iletki (açıölçer) ile ölçülmesi.",
              "learningOutcomes": [
                "Açıları ölçer ve derecelerine göre sınıflandırır."
              ],
              "activities": [
                {
                  "id": "act-5-geo-acilar-ornek",
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
            },
            {
              "id": "5-geo-cokgen-koordinat",
              "title": "Çokgenler ve Koordinat Bölgeleri",
              "code": "MAT.5.3.3",
              "category": "geometri",
              "badge": "Geometrik Şekiller",
              "description": "Üçgen, dörtgen çeşitleri ve analitik düzlemde 4 bölge.",
              "learningOutcomes": [
                "Çokgenleri ve koordinat bölgelerini modeller."
              ],
              "activities": [
                {
                  "id": "act-5-geo-cokgen-koordinat-ornek",
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
          "id": "tymm-5-sayilar-1",
          "code": "MAT.5.1",
          "orderNumber": 2,
          "themeName": "Sayılar ve Nicelikler (1)",
          "fullTitle": "MAT.5.1. Sayılar ve Nicelikler (1)",
          "lessonHours": 28,
          "outcomeCount": 2,
          "description": "Milyonlu sayılar, basamak değerleri, dört işlem stratejileri ve zihinden işlemler.",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "5-sayi-basamak",
              "title": "Basamak Değeri ve Milyonlar",
              "code": "MAT.5.1.1",
              "category": "sayi",
              "badge": "Sayılar ve Nicelikler",
              "description": "Bölükler, basamak değerleri ve 9 basamaklı sayıların çözümlenmesi.",
              "learningOutcomes": [
                "Milyonlu sayıları okur, yazar ve çözümler."
              ],
              "activities": [
                {
                  "id": "act-5-sayi-basamak-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
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
          "id": "tymm-5-geo-nicelikler",
          "code": "MAT.5.2",
          "orderNumber": 3,
          "themeName": "Geometrik Nicelikler",
          "fullTitle": "MAT.5.2. Geometrik Nicelikler",
          "lessonHours": 20,
          "outcomeCount": 4,
          "description": "Dikdörtgenler prizmasının hacmi, birim küpler, katman sayımı, akvaryum sıvı modeli ve yüzey alanı.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "5-geo-prizma-hacim",
              "title": "Dikdörtgenler Prizmasının Hacmi",
              "code": "MAT.5.2.1",
              "category": "olcme",
              "badge": "Geometrik Nicelikler",
              "description": "Birim küplerle hacim oluşturma ve V = a × b × c bağıntısı.",
              "learningOutcomes": [
                "Dikdörtgenler prizmasının hacim bağıntısını modeller."
              ],
              "activities": [
                {
                  "id": "act-5-geo-prizma-hacim-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "olcme",
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
          "id": "tymm-5-sayilar-2",
          "code": "MAT.5.1",
          "orderNumber": 4,
          "themeName": "Sayılar ve Nicelikler (2)",
          "fullTitle": "MAT.5.1. Sayılar ve Nicelikler (2)",
          "lessonHours": 33,
          "outcomeCount": 2,
          "description": "Kesirlerin farklı gösterimleri, denk kesirler, sayı doğrusunda sıralama, ondalık ve yüzde gösterimleri.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "sayi-kesirler",
              "title": "Kesirler, Ondalık ve Yüzdeler",
              "code": "MAT.5.1.3",
              "category": "sayi",
              "badge": "Sayılar ve Nicelikler",
              "description": "Eşdeğer parçaları, ondalık basamakları ve yüzde gösterimlerini karşılaştırın.",
              "learningOutcomes": [
                "Denk kesirleri, ondalık ve yüzdeleri modellerle ifade eder."
              ],
              "activities": [
                {
                  "id": "act-sayi-kesirler-ornek",
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
          "id": "tymm-5-istatistik",
          "code": "MAT.5.4",
          "orderNumber": 5,
          "themeName": "İstatistiksel Araştırma",
          "fullTitle": "MAT.5.4. İstatistiksel Araştırma",
          "lessonHours": 18,
          "outcomeCount": 4,
          "description": "Veri toplama, sıklık tablosu, çetele ve sütun grafiği oluşturma.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "5-veri-grafik",
              "title": "Veri Toplama ve Sütun Grafiği",
              "code": "MAT.5.4.1",
              "category": "veri",
              "badge": "İstatistiksel Araştırma",
              "description": "Sıklık tablolarından etkileşimli sütun grafiklerine veri aktarımı.",
              "learningOutcomes": [
                "Verileri toplar, sıklık tablosu ve sütun grafiğinde gösterir."
              ],
              "activities": [
                {
                  "id": "act-5-veri-grafik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "veri",
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
          "id": "tymm-5-cebir-olasilik",
          "code": "MAT.5.5",
          "orderNumber": 6,
          "themeName": "Cebirsel Düşünme ve Olasılık",
          "fullTitle": "MAT.5.5. Cebirsel Düşünme ve Olasılık",
          "lessonHours": 15,
          "outcomeCount": 3,
          "description": "Sayı örüntüleri, terazi denge modeli, eşitlik ve olasılık spektrumu.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "5-cebir-oruntu-olasilik",
              "title": "Örüntüler, Terazi ve Olasılık Spektrumu",
              "code": "MAT.5.5.1",
              "category": "cebir",
              "badge": "Cebirsel Düşünme",
              "description": "Artan örüntüler, kefeli terazi ile eşitlik ve 0-1 olasılık çarkı.",
              "learningOutcomes": [
                "Örüntü kurallarını bulur ve olasılık değerlerini sıralar."
              ],
              "activities": [
                {
                  "id": "act-5-cebir-oruntu-olasilik-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "cebir",
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
      "gradeNumber": 6,
      "title": "6. Sınıf",
      "subtitle": "Etkileşimli Matematik",
      "description": "Çarpanlar ve Katlar, Kümeler ve Tam Sayılar, Kesirlerle İşlemler, Oran-Orantı, Açılar, Alan ve Hacim Ölçme.",
      "themes": [
        {
          "id": "tymm-6-sayilar-1",
          "code": "MAT.6.1",
          "orderNumber": 1,
          "themeName": "Sayılar ve Nicelikler (1) — Çarpanlar ve Katlar",
          "fullTitle": "MAT.6.1. Sayılar ve Nicelikler (1) — Çarpanlar ve Katlar",
          "lessonHours": 20,
          "outcomeCount": 4,
          "description": "Çarpanlar ve katlar, bölünebilme kuralları, asal sayılar, asal çarpan ağacı, ortak bölen ve kat.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "6-sayi-carpanlar",
              "title": "Çarpanlar, Katlar ve Asallık",
              "code": "MAT.6.1.1",
              "category": "sayi",
              "badge": "Çarpanlar ve Katlar",
              "description": "Doğal sayıların çarpanları, Eratosthenes kalburu ve asal çarpan ağacı.",
              "learningOutcomes": [
                "Çarpan ve kat ilişkilerini çözümler."
              ],
              "activities": [
                {
                  "id": "act-6-sayi-carpanlar-ornek",
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
          "id": "tymm-6-kumeler-tamsayilar",
          "code": "MAT.6.1b",
          "orderNumber": 2,
          "themeName": "Kümeler ve Tam Sayılar",
          "fullTitle": "MAT.6.1b. Kümeler ve Tam Sayılar",
          "lessonHours": 18,
          "outcomeCount": 4,
          "description": "Kümeler, kesişim ve birleşim, tam sayılar, negatif yön, mutlak değer ve karşılaştırma.",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "6-kumeler-tam",
              "title": "Kümeler ve Negatif Sayılar",
              "code": "MAT.6.1.2",
              "category": "sayi",
              "badge": "Kümeler & Tam Sayılar",
              "description": "Venn şeması, kesişim (∩), birleşim (∪), termometre ve zemin kat modelleri.",
              "learningOutcomes": [
                "Kümelerle işlem yapar ve tam sayıları yönlü modeller."
              ],
              "activities": [
                {
                  "id": "act-6-kumeler-tam-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
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
          "id": "tymm-6-kesir-ondalik",
          "code": "MAT.6.1c",
          "orderNumber": 3,
          "themeName": "Kesirlerle İşlemler ve Ondalık Gösterim",
          "fullTitle": "MAT.6.1c. Kesirlerle İşlemler ve Ondalık Gösterim",
          "lessonHours": 24,
          "outcomeCount": 5,
          "description": "Kesirlerle toplama, çıkarma, çarpma, bölme, ondalık yuvarlama ve çarpma-bölme.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "6-kesir-islemler",
              "title": "Kesir Dört İşlem ve Ondalık",
              "code": "MAT.6.1.3",
              "category": "sayi",
              "badge": "Kesir & Ondalık",
              "description": "Alan modelleriyle kesir çarpması, ters çevirip çarpma bölme kuralı.",
              "learningOutcomes": [
                "Kesirlerle ve ondalık sayılarla dört işlem yapar."
              ],
              "activities": [
                {
                  "id": "act-6-kesir-islemler-ornek",
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
          "id": "tymm-6-oran",
          "code": "MAT.6.2",
          "orderNumber": 4,
          "themeName": "Oran ve Karşılaştırma",
          "fullTitle": "MAT.6.2. Oran ve Karşılaştırma",
          "lessonHours": 12,
          "outcomeCount": 2,
          "description": "İki çokluğun birbirine oranı, birimli ve birimsiz oran, hız ve yoğunluk modelleri.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "6-oran-kavram",
              "title": "Oran ve Birimli Oran",
              "code": "MAT.6.2.1",
              "category": "cebir",
              "badge": "Oran",
              "description": "a/b oran yazımı, sadeleştirme ve km/saat birimli oran dönüşümü.",
              "learningOutcomes": [
                "Oran kavramını ifade eder, birimli ve birimsiz oranı ayırt eder."
              ],
              "activities": [
                {
                  "id": "act-6-oran-kavram-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "cebir",
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
          "id": "tymm-6-geo-sekiller",
          "code": "MAT.6.3",
          "orderNumber": 5,
          "themeName": "Geometrik Şekiller ve Açılar",
          "fullTitle": "MAT.6.3. Geometrik Şekiller ve Açılar",
          "lessonHours": 20,
          "outcomeCount": 4,
          "description": "İki paralel doğrunun bir kesenle yaptığı açılar, Z/U/M kuralları, üçgen ve dörtgen iç açıları.",
          "colorTheme": "#ef4444",
          "topics": [
            {
              "id": "6-geo-paralel-aci",
              "title": "Paralel Doğrular ve Açı İlişkileri",
              "code": "MAT.6.3.1",
              "category": "geometri",
              "badge": "Açılar & Geometri",
              "description": "Yöndeş, iç ters, dış ters açılar ve üçgenin iç açıları toplamı (180°).",
              "learningOutcomes": [
                "Paralel doğruların oluşturduğu açıları sınıflandırır ve modeller."
              ],
              "activities": [
                {
                  "id": "act-6-geo-paralel-aci-ornek",
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
          "id": "tymm-6-alan-olçme",
          "code": "MAT.6.4",
          "orderNumber": 6,
          "themeName": "Geometrik Nicelikler — Alan ve Arazi Ölçme",
          "fullTitle": "MAT.6.4. Geometrik Nicelikler — Alan ve Arazi Ölçme",
          "lessonHours": 18,
          "outcomeCount": 4,
          "description": "Üçgende yükseklik ve alan, paralelkenar alanı, m², cm², ar, dekar (dönüm), hektar dönüşümleri.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "6-alan-ucgen-paralel",
              "title": "Üçgen ve Paralelkenar Alanı",
              "code": "MAT.6.4.1",
              "category": "olcme",
              "badge": "Alan Ölçme",
              "description": "A = (taban × yükseklik) / 2 ve paralelkenar kesme-yapıştırma modelleri.",
              "learningOutcomes": [
                "Üçgenin ve paralelkenarın alan bağıntılarını oluşturur."
              ],
              "activities": [
                {
                  "id": "act-6-alan-ucgen-paralel-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "olcme",
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
          "id": "tymm-6-cebir-veri",
          "code": "MAT.6.5",
          "orderNumber": 7,
          "themeName": "Cebirsel İfadeler, Çember ve Veri Analizi",
          "fullTitle": "MAT.6.5. Cebirsel İfadeler, Çember ve Veri Analizi",
          "lessonHours": 16,
          "outcomeCount": 4,
          "description": "Cebirsel ifadeler, sözel ifadenin cebirsel karşılığı, çemberin çevresi (2πr), aritmetik ortalama ve açıklık.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "6-cebir-cember-veri",
              "title": "Cebir, Çember ve İstatistik",
              "code": "MAT.6.5.1",
              "category": "cebir",
              "badge": "Cebir & İstatistik",
              "description": "Değişkenler, çember çevre formülü ve merkezi eğilim ölçüleri.",
              "learningOutcomes": [
                "Cebirsel ifadeleri yazar, çember çevresini ve ortalamayı hesaplar."
              ],
              "activities": [
                {
                  "id": "act-6-cebir-cember-veri-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "cebir",
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
      "gradeNumber": 7,
      "title": "7. Sınıf",
      "subtitle": "Etkileşimli Matematik",
      "description": "Tam Sayılarla İşlemler, Rasyonel Sayılar, Cebirsel İfadeler ve Denklemler, Oran-Orantı ve Yüzdeler, Çokgenler ve Daire.",
      "themes": [
        {
          "id": "tymm-7-tamsayi-islemler",
          "code": "MAT.7.1",
          "orderNumber": 1,
          "themeName": "Tam Sayılarla İşlemler",
          "fullTitle": "MAT.7.1. Tam Sayılarla İşlemler",
          "lessonHours": 25,
          "outcomeCount": 4,
          "description": "Sayma pulları ve sayı doğrusunda toplama, çıkarma, çarpma, bölme ve negatif üsler.",
          "colorTheme": "#ef4444",
          "topics": [
            {
              "id": "7-tam-islemler",
              "title": "Tam Sayılarda Dört İşlem",
              "code": "MAT.7.1.1",
              "category": "sayi",
              "badge": "Tam Sayılar",
              "description": "Pullarla sıfır çifti oluşturma, işaret kuralları ve üslü sayılar.",
              "learningOutcomes": [
                "Tam sayılarla dört işlem yapar ve modeller."
              ],
              "activities": [
                {
                  "id": "act-7-tam-islemler-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
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
          "id": "tymm-7-rasyonel-sayilar",
          "code": "MAT.7.2",
          "orderNumber": 2,
          "themeName": "Rasyonel Sayılar ve İşlemler",
          "fullTitle": "MAT.7.2. Rasyonel Sayılar ve İşlemler",
          "lessonHours": 25,
          "outcomeCount": 4,
          "description": "a/b rasyonel sayı gösterimi, devirli ondalık sayılar, sayı doğrusu, dört işlem ve çok adımlı merdiven işlemler.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "7-rasyonel-islemler",
              "title": "Rasyonel Sayılar ve Merdivenli İşlemler",
              "code": "MAT.7.2.1",
              "category": "sayi",
              "badge": "Rasyonel Sayılar",
              "description": "Devirli sayıyı rasyonel yapma, rasyonel dört işlem ve zincirleme kesirler.",
              "learningOutcomes": [
                "Rasyonel sayılarla çok adımlı işlemleri yapar."
              ],
              "activities": [
                {
                  "id": "act-7-rasyonel-islemler-ornek",
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
          "id": "tymm-7-cebir-denklem",
          "code": "MAT.7.3",
          "orderNumber": 3,
          "themeName": "Cebirsel İfadeler, Eşitlik ve Denklemler",
          "fullTitle": "MAT.7.3. Cebirsel İfadeler, Eşitlik ve Denklemler",
          "lessonHours": 30,
          "outcomeCount": 5,
          "description": "Cebirsel ifadelerle toplama-çıkarma, parantezi dağıtma, birinci dereceden bir bilinmeyenli denklemler ve terazi denge modeli.",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "7-cebir-denklem-coz",
              "title": "Cebirsel İfadeler ve Denklem Çözme",
              "code": "MAT.7.3.1",
              "category": "cebir",
              "badge": "Cebir & Denklemler",
              "description": "Benzer terimler, dağılma özelliği, 2x + 4 = 10 terazi modeli ve x i yalnız bırakma.",
              "learningOutcomes": [
                "Cebirsel ifadeleri sadeleştirir ve birinci dereceden denklemleri çözer."
              ],
              "activities": [
                {
                  "id": "act-7-cebir-denklem-coz-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "cebir",
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
          "id": "tymm-7-oran-yuzdeler",
          "code": "MAT.7.4",
          "orderNumber": 4,
          "themeName": "Oran, Orantı ve Yüzdeler",
          "fullTitle": "MAT.7.4. Oran, Orantı ve Yüzdeler",
          "lessonHours": 24,
          "outcomeCount": 5,
          "description": "Doğru orantı, ters orantı, orantı sabiti k, yüzde hesapları, kâr-zarar, indirim ve KDV.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "7-oranti-yuzde",
              "title": "Doğru / Ters Orantı ve Yüzdeler",
              "code": "MAT.7.4.1",
              "category": "cebir",
              "badge": "Orantı & Yüzdeler",
              "description": "Çapraz çarpım, yan yana çarpım, orantı sabiti k ve yüzde problemleri.",
              "learningOutcomes": [
                "Doğru ve ters orantıyı modeller, yüzde hesaplamalarını yapar."
              ],
              "activities": [
                {
                  "id": "act-7-oranti-yuzde-ornek",
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
          "id": "tymm-7-dogru-cokgen",
          "code": "MAT.7.5",
          "orderNumber": 5,
          "themeName": "Doğrular, Açılar ve Çokgenler",
          "fullTitle": "MAT.7.5. Doğrular, Açılar ve Çokgenler",
          "lessonHours": 24,
          "outcomeCount": 4,
          "description": "Açıortay, paralel doğrularda açılar, n kenarlı çokgende iç açılar toplamı (n-2)·180°, düzgün çokgenler ve eşkenar dörtgen / yamuk alanı.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "7-cokgen-alanlar",
              "title": "Düzgün Çokgenler ve Alanlar",
              "code": "MAT.7.5.1",
              "category": "geometri",
              "badge": "Çokgenler & Alan",
              "description": "Düzgün beşgen, altıgen, yamuk alanı: ((a+c)·h)/2 ve eşkenar dörtgen alanı: (e·f)/2.",
              "learningOutcomes": [
                "Çokgenlerin açı bağıntılarını ve özel dörtgenlerin alanlarını hesaplar."
              ],
              "activities": [
                {
                  "id": "act-7-cokgen-alanlar-ornek",
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
          "id": "tymm-7-cember-veri",
          "code": "MAT.7.6",
          "orderNumber": 6,
          "themeName": "Çember, Daire ve Daire Grafiği",
          "fullTitle": "MAT.7.6. Çember, Daire ve Daire Grafiği",
          "lessonHours": 18,
          "outcomeCount": 4,
          "description": "Merkez açı ve gördüğü yay, yay uzunluğu, dairenin alanı (π·r²), daire diliminin alanı ve daire grafiği (360° dağılımı).",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "7-cember-daire-grafik",
              "title": "Daire Alanı ve Daire Grafiği",
              "code": "MAT.7.6.1",
              "category": "geometri",
              "badge": "Daire & Veri",
              "description": "Yay uzunluğu (2πr·α/360), daire dilimi alanı (πr²·α/360) ve 360° daire grafiği dönüşümü.",
              "learningOutcomes": [
                "Daire dilimi alanını hesaplar ve verileri daire grafiğinde gösterir."
              ],
              "activities": [
                {
                  "id": "act-7-cember-daire-grafik-ornek",
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
        }
      ],
      "topics": []
    },
    {
      "gradeNumber": 8,
      "title": "8. Sınıf",
      "subtitle": "Etkileşimli Matematik",
      "description": "Çarpanlar ve Katlar, Üslü ve Kareköklü İfadeler, Olasılık ve Cebirsel Özdeşlikler, Doğrusal Denklemler ve Eğim, Pisagor ve Geometrik Cisimler.",
      "themes": [
        {
          "id": "tymm-8-carpan-uslu",
          "code": "MAT.8.1",
          "orderNumber": 1,
          "themeName": "Çarpanlar ve Katlar / Üslü İfadeler",
          "fullTitle": "MAT.8.1. Çarpanlar ve Katlar / Üslü İfadeler",
          "lessonHours": 32,
          "outcomeCount": 6,
          "description": "EBOB-EKOK modelleri, aralarında asallık, tam sayı kuvvetleri, üslü sayılarda çarpma-bölme, çok büyük/küçük sayılar ve bilimsel gösterim.",
          "colorTheme": "#f59e0b",
          "topics": [
            {
              "id": "8-carpan-ebob-ekok",
              "title": "EBOB, EKOK ve Üslü İfadeler",
              "code": "MAT.8.1.1",
              "category": "sayi",
              "badge": "EBOB & Üslü",
              "description": "Ortak bölenlerin en büyüğü, ortak katların en küçüğü ve bilimsel gösterim (a × 10ⁿ).",
              "learningOutcomes": [
                "EBOB-EKOK problemlerini çözer, üslü ifadelerle işlem yapar ve bilimsel gösterimi kullanır."
              ],
              "activities": [
                {
                  "id": "act-8-carpan-ebob-ekok-ornek",
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
          "id": "tymm-8-karekok-veri",
          "code": "MAT.8.2",
          "orderNumber": 2,
          "themeName": "Kareköklü İfadeler ve Veri Analizi",
          "fullTitle": "MAT.8.2. Kareköklü İfadeler ve Veri Analizi",
          "lessonHours": 32,
          "outcomeCount": 6,
          "description": "Tam kare sayılar ve alan, karekök tahmini, a√b yazımı, kareköklerde 4 işlem, ondalık karekökler, gerçek sayılar ve veri dönüşümü.",
          "colorTheme": "#ef4444",
          "topics": [
            {
              "id": "8-karekok-gercek-sayi",
              "title": "Kareköklü Sayılar ve Gerçek Sayılar",
              "code": "MAT.8.2.1",
              "category": "sayi",
              "badge": "Kareköklü Sayılar",
              "description": "Alanı verilen karenin kenarını bulma, √20 = 2√5 ve İrrasyonel Sayılar (π, √2).",
              "learningOutcomes": [
                "Kareköklü ifadelerle işlem yapar ve gerçek sayı sistemini sınıflandırır."
              ],
              "activities": [
                {
                  "id": "act-8-karekok-gercek-sayi-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "sayi",
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
          "id": "tymm-8-olasilik-ozdeslik",
          "code": "MAT.8.3",
          "orderNumber": 3,
          "themeName": "Basit Olayların Olasılığı ve Cebirsel Özdeşlikler",
          "fullTitle": "MAT.8.3. Basit Olayların Olasılığı ve Cebirsel Özdeşlikler",
          "lessonHours": 32,
          "outcomeCount": 6,
          "description": "Basit olayların olasılığı P(A) = İstenen/Tüm, cebir karoları, özdeşlikler: (a+b)², (a-b)², a²-b² ve ortak çarpan parantezi.",
          "colorTheme": "#ec4899",
          "topics": [
            {
              "id": "8-olasilik-ozdeslik-tema",
              "title": "Olasılık ve Cebirsel Özdeşlikler",
              "code": "MAT.8.3.1",
              "category": "cebir",
              "badge": "Olasılık & Özdeşlikler",
              "description": "Zar ve torba olasılıkları, geometrik alan modelleriyle (a+b)² = a² + 2ab + b² ispatı.",
              "learningOutcomes": [
                "Olasılık hesaplar, cebir karolarıyla özdeşlikleri modeller ve çarpanlara ayırır."
              ],
              "activities": [
                {
                  "id": "act-8-olasilik-ozdeslik-tema-ornek",
                  "title": "Örnek Görev Kartı",
                  "category": "cebir",
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
          "id": "tymm-8-dogrusal-denklem-egim",
          "code": "MAT.8.4",
          "orderNumber": 4,
          "themeName": "Doğrusal Denklemler, Eğim ve Eşitsizlikler",
          "fullTitle": "MAT.8.4. Doğrusal Denklemler, Eğim ve Eşitsizlikler",
          "lessonHours": 36,
          "outcomeCount": 7,
          "description": "Koordinat sistemi, doğrusal ilişki tablosu, y = mx + n grafik çizimi, doğrunun eğimi m = dikey/yatay ve eşitsizlikler.",
          "colorTheme": "#3b82f6",
          "topics": [
            {
              "id": "8-dogrusal-egim-esitsizlik",
              "title": "Doğru Grafiği, Eğim ve Eşitsizlik",
              "code": "MAT.8.4.1",
              "category": "geometri",
              "badge": "Doğrusal & Eğim",
              "description": "Doğrunun eğimi m, dik doğrular, eşitsizlik çözümü ve sayı doğrusu aralığı.",
              "learningOutcomes": [
                "Doğrusal denklemleri grafiklendirir, eğimi yorumlar ve eşitsizlikleri çözer."
              ],
              "activities": [
                {
                  "id": "act-8-dogrusal-egim-esitsizlik-ornek",
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
          "id": "tymm-8-ucgen-pisagor",
          "code": "MAT.8.5",
          "orderNumber": 5,
          "themeName": "Üçgenler, Pisagor Teoremi ve Benzerlik",
          "fullTitle": "MAT.8.5. Üçgenler, Pisagor Teoremi ve Benzerlik",
          "lessonHours": 32,
          "outcomeCount": 6,
          "description": "Üçgen eşitsizliği, açı-kenar bağıntıları, kenarortay/açıortay/yükseklik inşaları, Pisagor bağıntısı (a²+b²=c²) ve benzerlik oranı.",
          "colorTheme": "#10b981",
          "topics": [
            {
              "id": "8-ucgen-pisagor-benzer",
              "title": "Pisagor Teoremi ve Eşlik-Benzerlik",
              "code": "MAT.8.5.1",
              "category": "geometri",
              "badge": "Pisagor & Benzerlik",
              "description": "3-4-5, 5-12-13 özel üçgenleri, hipotenüs alanı ve Thales benzerlik teoremi.",
              "learningOutcomes": [
                "Üçgen bağıntılarını kurar, Pisagor teoremini uygular ve benzerlik oranını kullanır."
              ],
              "activities": [
                {
                  "id": "act-8-ucgen-pisagor-benzer-ornek",
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
          "id": "tymm-8-donusum-cisimler",
          "code": "MAT.8.6",
          "orderNumber": 6,
          "themeName": "Dönüşüm Geometrisi ve Geometrik Cisimler",
          "fullTitle": "MAT.8.6. Dönüşüm Geometrisi ve Geometrik Cisimler",
          "lessonHours": 20,
          "outcomeCount": 4,
          "description": "Öteleme, yansıma ve koordinat değişimi, dik prizmalar, silindir açınımı ve yüzey alanı, piramit ve koni.",
          "colorTheme": "#8b5cf6",
          "topics": [
            {
              "id": "8-donusum-cisim-tema",
              "title": "Öteleme, Yansıma ve Dik Silindir",
              "code": "MAT.8.6.1",
              "category": "geometri",
              "badge": "Dönüşüm & Cisimler",
              "description": "Koordinatta öteleme (x+a, y+b), ayna yansıması, silindir açınımı ve hacmi (V = π·r²·h).",
              "learningOutcomes": [
                "Öteleme ve yansımayı uygular, geometrik cisimlerin açınım ve hacimlerini hesaplar."
              ],
              "activities": [
                {
                  "id": "act-8-donusum-cisim-tema-ornek",
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
        }
      ],
      "topics": []
    }
  ]
},
    lise: liseLevel,
  },
};
