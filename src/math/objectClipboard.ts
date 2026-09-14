import { MathObject, Point2D } from '@/types/math';
import { createId } from '@/state/ids';
import { generateNextPointLabel } from './geometry';
import { functionLabel, functionNameOf, nextFunctionName } from './functionNames';

export type ObjectClipboard = { objects: MathObject[]; selectedIds: string[] };

function references(value: unknown, key = ''): string[] {
  // releasedRadiusPointId yalnızca "kilit çözülünce yarıçapı geri ver" hatırlatmasıdır, bağımlılık değildir:
  // izlenseydi çemberi (ya da dönüşüm görüntüsünü) kopyalamak başka noktaları da panoya taşırdı.
  if (key === 'releasedRadiusPointId') return [];
  if (typeof value === 'string') return /Ids?$/.test(key) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(v => references(v, key));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => references(v, k));
  return [];
}

export function copyObjects(scene: MathObject[], selectedIds: string[]): ObjectClipboard {
  const ids = new Set(selectedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const object of scene.filter(o => ids.has(o.id))) {
      const deps = references(object);
      if (object.type === 'function') for (const slider of scene) {
        const tokens: string[] = object.expression.match(/[a-zA-Z_][a-zA-Z_0-9]*/g) ?? [];
        if (slider.type === 'slider' && tokens.includes(slider.variableName)) deps.push(slider.id);
      }
      for (const id of deps) if (!ids.has(id) && scene.some(o => o.id === id)) { ids.add(id); changed = true; }
    }
  }
  return structuredClone({ objects: scene.filter(o => ids.has(o.id)), selectedIds });
}

export function pasteObjects(clipboard: ObjectClipboard, scene: MathObject[], location: Point2D): ObjectClipboard {
  const pasted: MathObject[] = [];
  const idMap = new Map(clipboard.objects.map(o => [o.id, createId('paste')]));
  const names = scene.map(o => o.label);
  const variables = new Set(scene.flatMap(o => o.type === 'slider' ? [o.variableName] : []));
  const variableMap = new Map<string, string>();
  for (const object of clipboard.objects) if (object.type === 'slider') {
    let name = object.variableName, suffix = 2;
    while (variables.has(name)) name = object.variableName + suffix++;
    variables.add(name); variableMap.set(object.variableName, name);
  }
  const positions = clipboard.objects.flatMap(o => 'x' in o && 'y' in o && typeof o.x === 'number' && typeof o.y === 'number' ? [{ x: o.x, y: o.y }] : o.type === 'pen' ? o.points : []);
  const center = positions.length ? { x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length, y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length } : location;
  const offset = { x: location.x - center.x, y: location.y - center.y };
  function remap(value: unknown, key = ''): unknown {
    if (typeof value === 'string') return key === 'id' || /Ids?$/.test(key) ? idMap.get(value) ?? value : value;
    if (Array.isArray(value)) return value.map(v => remap(v, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v, k)]));
    return value;
  }
  const objects = clipboard.objects.map(source => {
    const object = remap(source) as MathObject;
    // Yarıçapı bırakan nokta panoda yoksa hatırlatma yeni çemberde anlamsızdır
    if (object.type === 'circle' && source.type === 'circle' && source.releasedRadiusPointId && !idMap.has(source.releasedRadiusPointId)) delete object.releasedRadiusPointId;
    let label = object.type === 'point' ? generateNextPointLabel(names) : object.label;
    while (names.includes(label)) label += '′';
    object.label = label; names.push(label); object.createdAt = Date.now();
    if ('x' in object && 'y' in object && typeof object.x === 'number' && typeof object.y === 'number') { object.x += offset.x; object.y += offset.y; }
    if (object.type === 'pen') object.points = object.points.map(p => ({ x: p.x + offset.x, y: p.y + offset.y }));
    if (object.type === 'slider') object.variableName = variableMap.get(object.variableName)!;
    if (object.type === 'function') {
      object.expression = object.expression.replace(/[a-zA-Z_][a-zA-Z_0-9]*/g, token => variableMap.get(token) ?? token);
      // Yapıştırılan fonksiyon aynı adı taşımasın: f(x) = … → g(x) = … ("f(2)" çağrıları karışmasın).
      const name = functionNameOf(object), taken = [...scene, ...pasted];
      if (name && taken.some(o => o.type === 'function' && functionNameOf(o) === name)) object.label = functionLabel(nextFunctionName(taken), object.expression);
    }
    pasted.push(object);
    return object;
  });
  return { objects, selectedIds: clipboard.selectedIds.flatMap(id => idMap.has(id) ? [idMap.get(id)!] : []) };
}
