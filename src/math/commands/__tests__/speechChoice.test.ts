import { describe, expect, it } from 'vitest';
import { chooseSpokenCommand, looksIncomplete } from '../speechChoice';
import { runCommand } from '../engine';

const understands = (text: string) => runCommand(text, []).ok;

describe('chooseSpokenCommand', () => {
  it('picks the first alternative the engine understands', () => {
    const choice = chooseSpokenCommand(['üç gen çiz', 'üçgen çiz', 'üçgen çizim'], understands);
    expect(choice).toMatchObject({ understood: true, merged: false });
    expect(runCommand(choice.text, []).ok).toBe(true);
  });
  it('falls back to the most likely text when nothing is understood', () => {
    expect(chooseSpokenCommand(['bugün hava nasıl', 'bugün hava'], understands)).toEqual({ text: 'bugün hava nasıl', understood: false, merged: false });
  });
  it('merges a sentence split by a pause', () => {
    expect(understands('kenarları üç')).toBe(false);
    const choice = chooseSpokenCommand(['dört ve beş olan üçgen çiz'], understands, 'kenarları üç');
    expect(choice).toEqual({ text: 'kenarları üç dört ve beş olan üçgen çiz', understood: true, merged: true });
  });
  it('normalizes spoken letters before trying', () => {
    const scene = runCommand('A(0;0), B(4;0) ve C(0;3) noktalarını oluştur', []);
    if (!scene.ok) throw new Error(scene.message);
    const choice = chooseSpokenCommand(['a be ce üçgenini çiz'], text => runCommand(text, scene.objects).ok);
    expect(choice).toEqual({ text: 'ABC üçgenini çiz', understood: true, merged: false });
  });
  it('detects fragments without a verb', () => {
    expect(looksIncomplete('yarıçapı iki olan')).toBe(true);
    expect(looksIncomplete('kenarları üç')).toBe(true);
    expect(looksIncomplete('üçgen çiz')).toBe(false);
    expect(looksIncomplete('a = 2')).toBe(false);
  });
});
