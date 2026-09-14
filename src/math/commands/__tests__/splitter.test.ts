import { describe, expect, it } from 'vitest';
import { parseClause, splitClauses } from '../text';
import { runCommand } from '../engine';

describe('splitClauses: spoken and converb forms', () => {
  it.each([
    ['çember çiz kare çiz', ['çember çiz', 'kare çiz']],
    ['üçgen çiz alanını hesapla', ['üçgen çiz', 'alanını hesapla']],
    ['a noktasını sil be noktasını sil', ['a noktasını sil', 'be noktasını sil']],
    ['bir çember çiz bir de kare çiz', ['bir çember çiz', 'bir de kare çiz']],
    ['geri al geri al', ['geri al', 'geri al']],
    ['kare çizip 45 derece döndür', ['kare çiz', '45 derece döndür']],
    ['A noktasını seçip (2;3) konumuna taşı', ['A noktasını seç', '(2;3) konumuna taşı']],
    ['ABC üçgenini kırmızıya boyayıp gizle', ['ABC üçgenini kırmızıya boya', 'gizle']],
    ['üçgen çizdikten sonra alanını göster', ['üçgen çiz', 'alanını göster']],
    ['üçgen çiz, sonra alanını göster', ['üçgen çiz', 'alanını göster']],
    ['Alanı Bul aracını seç', ['Alanı Bul aracını seç']],
    ['Açı Oluştur aracını seç', ['Açı Oluştur aracını seç']],
    ['üçgen çizer misin', ['üçgen çizer misin']],
    ['yarıçapı 3 olan çember çiz', ['yarıçapı 3 olan çember çiz']],
    ['A noktası (2; 3)', ['A noktası (2; 3)']],
    ['ABC üçgenini gösterip gizleyen onay kutusu ekle', ['ABC üçgenini gösterip gizleyen onay kutusu ekle']],
    // Büyük harfli etiket "AC" fiil ("aç") sayılmaz
    ['B den AC ye dikme indir', ['B den AC ye dikme indir']],
    ['AC köşegenini çiz', ['AC köşegenini çiz']],
    ['AB nin ve AC nin orta dikmelerini çiz', ['AB nin ve AC nin orta dikmelerini çiz']],
    ['dosyayı aç çember çiz', ['dosyayı aç', 'çember çiz']],
  ])('%s', (input, expected) => {
    expect(splitClauses(input)).toEqual(expected);
  });
});

describe('splitClauses: sweep 2 (geç, doldur, bağlaçsız emirler, dağıtım, rol öbekleri)', () => {
  it.each([
    // "geç" fiildir
    ['kareli düzleme geç ve A noktası çiz', ['kareli düzleme geç', 'A noktası çiz']],
    ['elips aracına geç ve A noktası koy', ['elips aracına geç', 'A noktası koy']],
    ['kareli düzleme geçelim ve A noktası çiz', ['kareli düzleme geçelim', 'A noktası çiz']],
    ['kareli düzleme geçer misin ve A noktası çiz', ['kareli düzleme geçer misin', 'A noktası çiz']],
    ['kareli düzleme geçiver ve A noktası çiz', ['kareli düzleme geçiver', 'A noktası çiz']],
    ['kareli düzleme geçsin ve A noktası çiz', ['kareli düzleme geçsin', 'A noktası çiz']],
    ['kareli düzleme geç A noktası çiz', ['kareli düzleme geç', 'A noktası çiz']],
    // "-den geçsin" ilişkidir, bölünmez
    ['merkezi A olan çember çiz ve B noktasından geçsin', ['merkezi A olan çember çiz ve B noktasından geçsin']],
    ['A noktasından geçen ve BC doğrusuna paralel doğru çiz', ['A noktasından geçen ve BC doğrusuna paralel doğru çiz']],
    // "doldur" fiildir
    ['üçgen çizip içini doldur', ['üçgen çiz', 'içini doldur']],
    ['kare çiz ve içini doldur', ['kare çiz', 'içini doldur']],
    ['kare çiz içini doldur', ['kare çiz', 'içini doldur']],
    ['içi doldurulmuş kare çiz', ['içi doldurulmuş kare çiz']],
    // bağlaçsız art arda emirler ve atamalar
    ['ızgarayı gizle yakınlaştır', ['ızgarayı gizle', 'yakınlaştır']],
    ['yakınlaştır yakınlaştır', ['yakınlaştır yakınlaştır']],
    ['a = 1 b = 2', ['a = 1', 'b = 2']],
    ['a = 2,5 b = -1', ['a = 2,5', 'b = -1']],
    ['x = 2 y = 3 olan nokta', ['x = 2 y = 3 olan nokta']],
    ['y = 2x + 1', ['y = 2x + 1']],
    // yüklem dağıtımında iki sözcüklü ad öbeği
    ['AB doğrusunu ve CD doğru parçasını çiz', ['AB doğrusunu çiz', 'CD doğru parçasını çiz']],
    ['AB doğru parçasını ve CD doğrusunu çiz', ['AB doğru parçasını çiz', 'CD doğrusunu çiz']],
    ['bir üçgen ve bir kare çiz', ['bir üçgen çiz', 'bir kare çiz']],
    // yalnızca rol bildiren sol parça sonraki şekle aittir
    ['merkezi A noktası, yarıçapı 3 olan çember çiz', ['merkezi A noktası, yarıçapı 3 olan çember çiz']],
    ['merkezi A noktası ve yarıçapı 3 olan çember çiz', ['merkezi A noktası ve yarıçapı 3 olan çember çiz']],
    ['merkez noktası (1;2), yarıçapı 3 olan çember çiz', ['merkez noktası (1;2), yarıçapı 3 olan çember çiz']],
    // ölçmeden sonra yalın "göster" ayrı işlem değildir
    ['üçgenin alanını hesaplayıp göster', ['üçgenin alanını hesapla ve göster']],
    ['üçgenin alanını hesapla ve göster', ['üçgenin alanını hesapla ve göster']],
    ['üçgenin alanını hesapla göster', ['üçgenin alanını hesapla göster']],
    ['alanını hesapla ve çevresini göster', ['alanını hesapla', 'çevresini göster']],
    ['üçgen çiz ve alanını göster', ['üçgen çiz', 'alanını göster']],
    // pergel ucunu batırmak ayrı işlemdir; yüklem dağıtılmaz
    ['Pergelin ucunu A noktasına batır ve 90 derecelik yay çiz', ['Pergelin ucunu A noktasına batır', '90 derecelik yay çiz']],
  ])('%s', (input, expected) => {
    expect(splitClauses(input)).toEqual(expected);
  });

  it('detects the new verbs without catching participles or relations', () => {
    expect(parseClause('kareli düzleme geç').verbs.has('switch')).toBe(true);
    expect(parseClause('B noktasından geçsin').verbs.has('switch')).toBe(false);
    expect(parseClause("A'dan geçen doğru").verbs.has('switch')).toBe(false);
    expect(parseClause('içini doldur').verbs.has('color')).toBe(true);
    expect(parseClause('içi doldurulmuş kare çiz').verbs.has('color')).toBe(false);
    expect(parseClause('pergelin ucunu A noktasına batır', { points: ['A', 'B'], names: [] }).labels.map(l => l.text)).toEqual(['A']);
  });

  it('reads settings phrased with a negated verb as requests, but keeps real negations', () => {
    for (const text of ['ızgara olmasın', 'eksenler olmasın', 'eksenleri görmek istemiyorum', 'hiçbir şey seçili olmasın', 'koordinatlar olmasın']) {
      expect(parseClause(text).negated, text).toBe(false);
    }
    for (const text of ['üçgen çizme', 'A noktasını silme', 'çember olmasın', 'üçgen istemiyorum', 'A noktasının koordinatları olmasın', "ABC'nin içini doldurma"]) {
      expect(parseClause(text).negated, text).toBe(true);
    }
  });
});

describe('parseClause: coordinates and labels', () => {
  it('reads two bare numbers before konum/koordinat/vektör as a coordinate', () => {
    expect(parseClause('A noktasını 1 1 konumuna taşı').coords).toEqual([{ x: 1, y: 1 }]);
    expect(parseClause('ABC üçgenini 3 2 vektörüyle ötele').coords).toEqual([{ x: 3, y: 2 }]);
    expect(parseClause('A noktasını -2 ve 3 koordinatlarında oluştur').coords).toEqual([{ x: -2, y: 3 }]);
    expect(parseClause('kenarları 3 4 5 olan üçgen').coords).toEqual([]);
  });
  it('keeps uppercase O before a coordinate as a label', () => {
    const c = parseClause('O(0;0) noktası oluştur');
    expect(c.labels.map(l => l.text)).toEqual(['O']);
    expect(c.coords).toEqual([{ x: 0, y: 0 }]);
  });
  it('runs back-to-back spoken commands through the engine', () => {
    const r = runCommand('çember çiz kare çiz', []);
    if (!r.ok) throw new Error(r.message);
    expect(r.objects.some(o => o.type === 'circle')).toBe(true);
    expect(r.objects.some(o => o.type === 'polygon')).toBe(true);
  });
});

describe('splitClauses: sweep 2 repair', () => {
  const same = (text: string): [string, string[]] => [text, [text]];
  it.each([
    // olumsuz fiille söylenmiş ayar da tam bir işlemdir
    ['ızgara olmasın ve üçgen çiz', ['ızgara olmasın', 'üçgen çiz']],
    ['ızgarayı istemiyorum, kare çiz', ['ızgarayı istemiyorum', 'kare çiz']],
    ['eksenleri görmek istemiyorum ve bir çember çiz', ['eksenleri görmek istemiyorum', 'bir çember çiz']],
    ['eksenler olmasın üçgen çiz', ['eksenler olmasın', 'üçgen çiz']],
    ['ızgara olmasın, a = 2', ['ızgara olmasın', 'a = 2']],
    ['üçgen çiz ızgara olmasın', ['üçgen çiz', 'ızgara olmasın']],
    // "-den geçip", "-den de geçsin" içinden geçme ilişkisidir
    same('A noktasından geçip BC doğrusuna paralel olan doğruyu çiz'),
    same('A noktasının üzerinden geçip BC ye paralel doğru çiz'),
    same('(1;2) noktasından geçip eğimi 3 olan doğruyu çiz'),
    same('A noktasından geçip B noktasına giden doğruyu çiz'),
    same('merkezi A olan bir çember çiz, B noktasından da geçsin'),
    same('merkezi A olan çember çiz ve B noktasından da geçsin'),
    ['kareli düzleme geçip A noktası çiz', ['kareli düzleme geç', 'A noktası çiz']],
    // bağlaçsız atamalar yalnızca her parça yalın "ad = sayı" ise bölünür
    same('AB = 3 BC = 4 AC = 5 üçgen çiz'),
    same('üçgen çiz AB = 3 BC = 4 AC = 5'),
    same('kenar = 4 açı = 60 eşkenar dörtgen çiz'),
    same('r = 3 merkez = (1;2) çember çiz'),
    same('en = 6 boy = 4 dikdörtgen çiz'),
    same("A'yı x = 2 y = 3 konumuna taşı"),
    ['a = 1 olsun b = 2 olsun', ['a = 1 olsun', 'b = 2 olsun']],
    ['a = 1 b = 2 c = 3', ['a = 1', 'b = 2', 'c = 3']],
    // noktanın x, y çifti tek işlemdir; nokta anılmadıysa iki denklemdir
    same('A noktası x=2, y=3 olsun'),
    same('A noktasını x = 2 ve y = 3 yap'),
    same('B noktası x = -1, y = 2,5 olsun'),
    ['x = 2, y = 3', ['x = 2', 'y = 3']],
    // yüklem dağıtımında yalnızca gerçek birleşik adlar birlikte kalır
    ['ABC üçgeninin ve DEF üçgeninin açılarını ölç', ['ABC üçgeninin açılarını ölç', 'DEF üçgeninin açılarını ölç']],
    ['üçgenin ve karenin açılarını ölç', ['üçgenin açılarını ölç', 'karenin açılarını ölç']],
    ['ABC üçgeninin ve DEF üçgeninin açı ölçülerini göster', ['ABC üçgeninin açı ölçülerini göster', 'DEF üçgeninin açı ölçülerini göster']],
    ['ABC üçgeninin ve DEF üçgeninin açılarını ölçer misin', ['ABC üçgeninin açılarını ölçer misin', 'DEF üçgeninin açılarını ölçer misin']],
    // parantezli koordinat ve bulunma ekli rol öbekleri
    same('merkezi (1; 2) noktası, yarıçapı 3 olan çember çiz'),
    same('merkezi A noktasında, yarıçapı 3 olan çember çiz'),
    same('merkez A noktası, yarıçapı 3 olan çember çiz'),
    // ölçmeden sonra "yaz", "sonucu göster", "tuvalde göster"
    ['üçgenin alanını hesaplayıp yaz', ['üçgenin alanını hesapla ve yaz']],
    same('üçgenin alanını hesapla ve sonucu göster'),
    same('üçgenin alanını hesapla ve tuvalde göster'),
    ['üçgen çiz ve adını yaz', ['üçgen çiz', 'adını yaz']],
    // fiilden sonraki "lütfen" önceki emre aittir
    ['yakınlaştır lütfen ızgarayı gizle', ['yakınlaştır lütfen', 'ızgarayı gizle']],
    ['ızgarayı gizle lütfen yakınlaştır', ['ızgarayı gizle lütfen', 'yakınlaştır']],
    ['kareli düzleme geç lütfen A noktası çiz', ['kareli düzleme geç lütfen', 'A noktası çiz']],
    same('üçgen çiz lütfen'),
    // "içi doldurulsun" dolgu emridir
    ['kare çiz ve içi doldurulsun', ['kare çiz', 'içi doldurulsun']],
  ])('%s', (input, expected) => {
    expect(splitClauses(input)).toEqual(expected);
  });

  it('keeps negations about a particular object and the new negated verbs', () => {
    for (const text of ['ızgara çizgileri olmasın', 'ızgarayı göstermek istemiyorum', 'hiçbir şekil seçili olmasın', 'hiçbir nokta seçili olmasın',
      'eksenlerin görünmesini istemiyorum', 'şu anda ızgara olmasın', 'noktaların koordinatları olmasın', 'bütün eksenler olmasın']) {
      expect(parseClause(text).negated, text).toBe(false);
    }
    for (const text of ['seçili noktanın koordinatları olmasın', 'seçili noktanın koordinatlarını görmek istemiyorum', 'bu noktanın koordinatları olmasın',
      'üçgenin koordinatları olmasın', 'kareli düzleme geçme', 'pergeli A noktasına batırma', 'pergelin ucunu A noktasına batırmayın', 'f(x) = x^2 çizme']) {
      expect(parseClause(text).negated, text).toBe(true);
    }
    expect(parseClause('f(x) = x^2').negated).toBe(false);
    expect(parseClause('B noktasından da geçsin').verbs.has('switch')).toBe(false);
    expect(parseClause('içi doldurulsun').verbs.has('color')).toBe(true);
  });
});
