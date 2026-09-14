import { describe, expect, it } from 'vitest';
import { contextMenuSelection } from '../contextMenuSelection';

describe('sağ tık / uzun basma seçimi', () => {
  it('çoklu seçimin içindeki nesneye sağ tıklamak seçimi ve sırasını korur', () => {
    const secim = ['A', 'B', 'C'];
    expect(contextMenuSelection(secim, 'A')).toBe(secim);
    expect(contextMenuSelection(secim, 'C')).toBe(secim);
  });

  it('seçim dışındaki nesneye sağ tıklamak seçimi o nesneye indirir', () => {
    expect(contextMenuSelection(['A', 'B'], 'C')).toEqual(['C']);
    expect(contextMenuSelection([], 'C')).toEqual(['C']);
  });

  it('tek nesnelik seçimde tıklanan nesne seçili kalır', () => {
    expect(contextMenuSelection(['A'], 'A')).toEqual(['A']);
    expect(contextMenuSelection(['A'], 'B')).toEqual(['B']);
  });
});
