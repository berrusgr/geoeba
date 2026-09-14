import { expect } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import { runCommand } from '../engine';
import { CommandScene } from '../scene';
import type { CommandHandler, CommandResult, CommandSuccess, EngineOptions } from '../types';

/** Yalnızca verilen işleyicilerle komut çalıştırır (aileler birbirinden bağımsız sınanabilsin). */
export function runWith(handlers: CommandHandler[], text: string, scene: MathObject[] = [], selection: string[] = [], options: EngineOptions = {}): CommandResult {
  return runCommand(text, scene, selection, options, handlers);
}

/** Başarılı olmalı; kimlikler benzersiz olmalı ve girdi sahnesi değişmemeli. */
export function expectOk(handlers: CommandHandler[], text: string, scene: MathObject[] = [], selection: string[] = [], options: EngineOptions = {}): CommandSuccess {
  const before = JSON.stringify(scene);
  const result = runWith(handlers, text, scene, selection, options);
  if (!result.ok) throw new Error(`“${text}” başarısız: ${result.message}`);
  expect(new Set(result.objects.map(o => o.id)).size).toBe(result.objects.length);
  expect(JSON.stringify(scene)).toBe(before);
  return result;
}

/** Başarısız olmalı; mesaj Türkçe ve boş olmamalı. */
export function expectFail(handlers: CommandHandler[], text: string, scene: MathObject[] = [], selection: string[] = []): string {
  const result = runWith(handlers, text, scene, selection);
  if (result.ok) throw new Error(`“${text}” başarısız olmalıydı ama uygulandı: ${result.message}`);
  expect(result.message.length).toBeGreaterThan(5);
  return result.message;
}

/** Sahne kurmak için: new CommandScene üzerinde üreticileri çağırın. */
export function build(fn: (scene: CommandScene) => void, initial: MathObject[] = []): MathObject[] {
  const scene = new CommandScene(initial);
  fn(scene);
  scene.resolve();
  return scene.objects;
}

export const point = (objects: MathObject[], label: string) => {
  const found = objects.find((o): o is PointObject => o.type === 'point' && o.label === label);
  if (!found) throw new Error(`${label} noktası yok`);
  return found;
};
export const byType = <T extends MathObject['type']>(objects: MathObject[], type: T) => objects.filter(o => o.type === type) as Extract<MathObject, { type: T }>[];
export const byLabel = (objects: MathObject[], label: string) => objects.find(o => o.label === label);
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
