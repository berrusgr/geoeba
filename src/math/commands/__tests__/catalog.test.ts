import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { MathObject } from '@/types/math';
import { runCommand } from '../engine';
import { ALL_OPERATIONS, TOOLBAR_OPERATIONS } from '../catalog';

const toolbarIds = [...readFileSync(path.resolve(__dirname, '../../../components/workspace/toolDefinitions.tsx'), 'utf8')
  .matchAll(/\{\s*id:\s*'([a-z_0-9]+)'/g)].map(m => m[1]);

function run(text: string, scene: MathObject[] = []) {
  const result = runCommand(text, scene);
  if (!result.ok) throw new Error(`“${text}” başarısız: ${result.message}`);
  return result;
}

describe('toolbar operation catalog', () => {
  it('lists every toolbar tool exactly once', () => {
    expect(toolbarIds.length).toBeGreaterThan(40);
    const listed = TOOLBAR_OPERATIONS.map(o => o.tool);
    for (const id of toolbarIds) expect(listed, `araç listede yok: ${id}`).toContain(id);
    expect(new Set(listed).size).toBe(listed.length);
  });

  const cases = ALL_OPERATIONS.flatMap(op => op.examples.map(example => [op.name, op.setup ?? '', example] as const));
  it.each(cases)('%s: “%s” sonra “%s”', (_name, setup, example) => {
    const scene = setup ? run(setup).objects : [];
    const result = run(example, scene);
    expect(result.message.length).toBeGreaterThan(0);
  });
});
