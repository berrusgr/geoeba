import type { CommandHandler } from '../../types';
import type { Clause } from '../../text';
import { fold } from '../../text';
import { fail, type CommandScene, trNum } from '../../scene';
import type { MathObject, PointObject, SliderObject, AngleObject } from '@/types/math';
import { evaluateValue, findSlider } from './shared';

function findSceneTarget(scene: CommandScene, label: string): MathObject | undefined {
  const clean = label.trim();
  const k = fold(clean);
  // 1. Önce tam eşleşme (büyük/küçük harf duyarlı: "a" kaydırıcı, "A" nokta)
  const exact = scene.objects.find(
    (o) =>
      o.id === clean ||
      o.label === clean ||
      (o.type === 'slider' && (o as SliderObject).variableName === clean)
  );
  if (exact) return exact;

  // 2. Küçük harfse önce kaydırıcı ara
  if (clean === clean.toLowerCase()) {
    const s = findSlider(scene, clean);
    if (s) return s;
  }

  // 3. Büyük harfse önce nokta ara
  const pt = scene.findPoint(clean);
  if (pt) return pt;

  // 4. Gevşek eşleşme
  return (
    findSlider(scene, clean) ??
    scene.objects.find(
      (o) =>
        fold(o.id) === k ||
        fold(o.label) === k ||
        (o.type === 'slider' && fold((o as SliderObject).variableName) === k)
    )
  );
}

function extractBracketArgs(raw: string): string[] | null {
  const openIdx = raw.indexOf('[');
  const closeIdx = raw.lastIndexOf(']');
  if (openIdx !== -1 && closeIdx > openIdx) {
    const inner = raw.slice(openIdx + 1, closeIdx).trim();
    return inner ? inner.split(',').map((s) => s.trim()) : [];
  }
  const openParen = raw.indexOf('(');
  const closeParen = raw.lastIndexOf(')');
  if (openParen !== -1 && closeParen > openParen) {
    const inner = raw.slice(openParen + 1, closeParen).trim();
    return inner ? inner.split(',').map((s) => s.trim()) : [];
  }
  return null;
}

/**
 * GeoGebra komutu: CanlandırmayıBaşlat[...] / StartAnimation[...]
 * Örnekler:
 * - CanlandırmayıBaşlat[true]
 * - StartAnimation[false]
 * - CanlandırmayıBaşlat[A, true]
 * - StartAnimation[a, false]
 */
export const scriptAnimationHandler: CommandHandler = {
  id: 'algebra.script.animation',
  examples: [
    'CanlandırmayıBaşlat[true]',
    'StartAnimation[false]',
    'CanlandırmayıBaşlat[A, true]',
    'StartAnimation[a, false]',
    'A noktasının animasyonunu başlat',
    'A noktasını canlandır',
  ],
  match(c, scene) {
    const foldedRaw = fold(c.raw.trim());
    if (/^(?:canlandirmayibaslat|startanimation)\s*(?:\[|\()/.test(foldedRaw)) return 100;
    const f = fold(c.text);
    if (
      /\b(?:canlandir\w*|animasyon\w*)/.test(f) &&
      (c.labels.length > 0 || /\bnokta/.test(f))
    ) {
      const obj = c.labels[0] ? scene.resolveLabel(c.labels[0].text)[0] : undefined;
      if (!obj || obj.type === 'point' || /\bnokta/.test(f)) return 95;
    }
    return 0;
  },
  run(c, scene) {
    const raw = c.raw.trim();
    const foldedRaw = fold(raw);

    if (/^(?:canlandirmayibaslat|startanimation)\s*(?:\[|\()/.test(foldedRaw)) {
      const parts = extractBracketArgs(raw) ?? [];

      if (
        parts.length === 0 ||
        (parts.length === 1 &&
          (parts[0].toLowerCase() === 'true' ||
            parts[0] === '1' ||
            fold(parts[0]) === 'dogru'))
      ) {
        scene.act({ kind: 'playback', mode: 'play' });
        scene.say('Canlandırma başlatıldı.');
        return;
      }
      if (
        parts.length === 1 &&
        (parts[0].toLowerCase() === 'false' ||
          parts[0] === '0' ||
          fold(parts[0]) === 'yanlis')
      ) {
        scene.act({ kind: 'playback', mode: 'stop' });
        scene.say('Canlandırma durduruldu.');
        return;
      }

      const targetLabel = parts[0];
      const boolVal = parts[1]
        ? parts[1].toLowerCase() === 'true' ||
          parts[1] === '1' ||
          fold(parts[1]) === 'dogru'
        : true;

      const obj = findSceneTarget(scene, targetLabel);
      if (!obj) fail(`“${targetLabel}” adlı nesne ya da kaydırıcı bulunamadı.`);

      if (obj.type === 'point') {
        const pt = obj as PointObject;
        scene.update(pt.id, { animating: boolVal });
        scene.act({ kind: 'playback', mode: boolVal ? 'play' : 'stop', targetId: pt.id });
        scene.say(`${pt.label} noktası için canlandırma ${boolVal ? 'başlatıldı' : 'durduruldu'}.`);
        return;
      }

      if (obj.type === 'slider') {
        scene.act({ kind: 'playback', mode: boolVal ? 'play' : 'stop', targetId: obj.id });
        scene.say(
          `${(obj as SliderObject).variableName} kaydırıcısı için canlandırma ${
            boolVal ? 'başlatıldı' : 'durduruldu'
          }.`
        );
        return;
      }

      if (obj.type === 'angle') {
        const ang = obj as AngleObject;
        const p3 = scene.objects.find((o) => o.id === ang.point3Id) as PointObject | undefined;
        if (p3?.construction?.kind === 'rotate' && p3.construction.sliderId) {
          scene.act({ kind: 'playback', mode: boolVal ? 'play' : 'stop', targetId: p3.construction.sliderId });
          scene.say(`${ang.label || 'Açı'} için canlandırma ${boolVal ? 'başlatıldı' : 'durduruldu'}.`);
          return;
        }
      }

      fail(`${targetLabel} canlandırılabilir bir nesne (nokta, açı veya sürgü) değil.`);
      return;
    }

    // Doğal dil eşleşmesi: "A noktasının animasyonunu başlat"
    const isStop = /\b(?:durdur|kapat|bitir)\b/.test(fold(c.text));
    const targetLabel = c.labels[0]?.text;
    if (!targetLabel) fail('Canlandırılacak nesneyi belirtin.');

    const obj = findSceneTarget(scene, targetLabel);
    if (!obj) fail(`“${targetLabel}” bulunamadı.`);

    if (obj.type === 'point') {
      const pt = obj as PointObject;
      scene.update(pt.id, { animating: !isStop });
      scene.act({ kind: 'playback', mode: isStop ? 'stop' : 'play', targetId: pt.id });
      scene.say(`${pt.label} noktasının animasyonu ${isStop ? 'durduruldu' : 'başlatıldı'}.`);
    } else if (obj.type === 'slider') {
      scene.act({ kind: 'playback', mode: isStop ? 'stop' : 'play', targetId: obj.id });
      scene.say(
        `${(obj as SliderObject).variableName} kaydırıcısının animasyonu ${
          isStop ? 'durduruldu' : 'başlatıldı'
        }.`
      );
    }
  },
};

/**
 * GeoGebra komutu: DeğerAta[nesne, değer] / SetValue[object, value]
 */
export const scriptSetValueHandler: CommandHandler = {
  id: 'algebra.script.setValue',
  examples: [
    'DeğerAta[a, 5]',
    'SetValue[a, 2]',
    'DeğerAta[b, -1.5]',
    'SetValue[k, 0]',
    'DeğerAta[a, 10]',
    'SetValue[b, 4]',
  ],
  match(c) {
    const foldedRaw = fold(c.raw.trim());
    if (/^(?:degerata|setvalue)\s*(?:\[|\()/.test(foldedRaw)) return 100;
    return 0;
  },
  run(c, scene) {
    const raw = c.raw.trim();
    const parts = extractBracketArgs(raw);
    if (!parts || parts.length < 2) {
      fail('DeğerAta komutunu “DeğerAta[nesne, değer]” biçiminde yazın (ör. “DeğerAta[a, 5]”).');
    }

    const targetLabel = parts[0];
    const valExpr = parts.slice(1).join(',');

    const obj = findSceneTarget(scene, targetLabel);
    if (obj && obj.type === 'slider') {
      const evaluated = evaluateValue(valExpr, scene);
      if (!evaluated.ok) fail(`“${valExpr}” geçerli bir sayısal değer değil.`);
      scene.update(obj.id, { value: evaluated.value });
      scene.say(`${(obj as SliderObject).variableName} = ${trNum(evaluated.value)} olarak ayarlandı.`);
      return;
    }

    fail(`“${targetLabel}” adlı kaydırıcı bulunamadı.`);
  },
};

/**
 * GeoGebra komutu: İzBırak[nesne, true/false] / ShowTrace[object, true/false] / İzleriTemizle[]
 */
export const scriptTraceHandler: CommandHandler = {
  id: 'algebra.script.trace',
  examples: [
    'İzBırak[A, true]',
    'ShowTrace[A, true]',
    'İzBırak[A, false]',
    'İziGöster[A]',
    'İzleriTemizle[]',
    'ClearTrace[]',
    'izleri temizle',
    'A noktasının izini aç',
  ],
  match(c) {
    const foldedRaw = fold(c.raw.trim());
    if (/^(?:izbirak|izigoster|showtrace|izleritemizle|cleartrace|cleartraces)\s*(?:\[|\()/.test(foldedRaw)) return 100;
    if (/^(?:izleritemizle|cleartrace|cleartraces)$/.test(foldedRaw)) return 100;
    const f = fold(c.text);
    if (/\biz(?:ler)?i?\s*(?:temizle|sil)\b/.test(f)) return 95;
    if (/\biz\w*\s*(?:birak|goster|ac|kapat|gizle)\b/.test(f) && c.labels.length > 0) return 92;
    return 0;
  },
  run(c, scene) {
    const raw = c.raw.trim();
    const foldedRaw = fold(raw);

    if (
      /^(?:izleritemizle|cleartrace|cleartraces)/.test(foldedRaw) ||
      /\biz(?:ler)?i?\s*(?:temizle|sil)\b/.test(fold(c.text))
    ) {
      scene.act({ kind: 'clearTraces' });
      scene.say('Tüm izler temizlendi.');
      return;
    }

    const parts = extractBracketArgs(raw);
    if (parts) {
      if (parts.length === 0) fail('İz bırakılacak nesneyi belirtin (ör. “İzBırak[A, true]”).');

      const targetLabel = parts[0];
      const boolVal = parts[1]
        ? parts[1].toLowerCase() === 'true' ||
          parts[1] === '1' ||
          fold(parts[1]) === 'dogru'
        : true;

      const obj = findSceneTarget(scene, targetLabel);
      if (!obj) fail(`“${targetLabel}” adlı nesne bulunamadı.`);

      scene.update(obj.id, { showTrace: boolVal });
      scene.say(`${obj.label} için iz bırakma ${boolVal ? 'açıldı' : 'kapatıldı'}.`);
      return;
    }

    // Doğal dil: "A noktasının izini aç"
    const targetLabel = c.labels[0]?.text;
    if (!targetLabel) fail('İzi açılacak nesneyi belirtin.');
    const isClose = /\b(?:kapat|gizle|sil)\b/.test(fold(c.text));
    const obj = findSceneTarget(scene, targetLabel);
    if (!obj) fail(`“${targetLabel}” adlı nesne bulunamadı.`);

    scene.update(obj.id, { showTrace: !isClose });
    scene.say(`${obj.label} için iz bırakma ${!isClose ? 'açıldı' : 'kapatıldı'}.`);
  },
};
