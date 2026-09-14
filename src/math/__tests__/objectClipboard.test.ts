import { describe, expect, it } from 'vitest';
import { copyObjects, pasteObjects } from '../objectClipboard';
import { executeTurkishCommand } from '../turkishCommands';
import { objectDependencies } from '@/state/WorkspaceContext';

describe('object clipboard', () => {
  it('copies a polygon with its points and creates independent identities', () => {
    const original = executeTurkishCommand('3 4 5 üçgen çiz', []);
    if (!original.ok) throw Error('fixture');
    const snapshot = JSON.stringify(original.objects);
    const clipboard = copyObjects(original.objects, original.selectedIds);
    expect(clipboard.objects).toHaveLength(4);
    const pasted = pasteObjects(clipboard, original.objects, { x: 10, y: 8 });
    expect(pasted.objects).toHaveLength(4);
    expect(pasted.selectedIds).toHaveLength(1);
    for (const object of pasted.objects) {
      expect(original.objects.some(o => o.id === object.id || o.label === object.label)).toBe(false);
      for (const dependency of objectDependencies(object)) expect(pasted.objects.some(o => o.id === dependency)).toBe(true);
    }
    expect(JSON.stringify(original.objects)).toBe(snapshot);
    expect(pasteObjects(clipboard, [...original.objects, ...pasted.objects], { x: 20, y: 8 }).objects.every(o => !pasted.objects.some(p => p.id === o.id))).toBe(true);
  });
  it('preserves bound triangles with new slider variables and references', () => {
    const initial = executeTurkishCommand('3 4 5 üçgen çiz', []);
    if (!initial.ok) throw Error('fixture');
    const bound = executeTurkishCommand('Üçgen uzunluklarını kaydırıcıya bağla', initial.objects);
    if (!bound.ok) throw Error('fixture');
    const pasted = pasteObjects(copyObjects(bound.objects, bound.selectedIds), bound.objects, { x: 10, y: 10 });
    expect(pasted.objects.filter(o => o.type === 'slider')).toHaveLength(3);
    for (const object of pasted.objects) for (const dependency of objectDependencies(object)) expect(pasted.objects.some(o => o.id === dependency)).toBe(true);
    const names = [...bound.objects, ...pasted.objects].flatMap(o => o.type === 'slider' ? [o.variableName] : []);
    expect(new Set(names).size).toBe(names.length);
  });
  it('snapshots copied content even when source objects change', () => {
    const initial = executeTurkishCommand('Üçgen çiz', []);
    if (!initial.ok) throw Error('fixture');
    const clipboard = copyObjects(initial.objects, initial.selectedIds);
    const label = clipboard.objects[0].label;
    initial.objects[0].label = 'changed';
    expect(clipboard.objects[0].label).toBe(label);
  });
});
