import { describe, expect, it } from 'vitest';
import { executeTurkishCommand } from '../turkishCommands';
import { resolveCommandBindings, triangleCoordinates } from '../commandBindings';
import { calculateDistance } from '../geometry';
import { MathObject, PointObject, PolygonObject, SliderObject } from '@/types/math';
import { collectDependentIds } from '@/state/WorkspaceContext';

function run(text: string, objects: MathObject[] = [], selected: string[] = []) {
  const r = executeTurkishCommand(text, objects, selected);
  if (!r.ok) throw new Error(r.message);
  expect(new Set(r.objects.map(o => o.id)).size).toBe(r.objects.length);
  return r;
}
const point = (objects: MathObject[], name: string) => objects.find(o => o.type === 'point' && o.label === name) as PointObject;

describe('offline Turkish geometry commands', () => {
  it('creates a 3-4-5 triangle and preserves prior input immutably', () => {
    const scene: MathObject[] = [];
    const r = run('3 4 5 üçgeni olsun', scene);
    const [a,b,c] = ['A','B','C'].map(n => point(r.objects,n));
    expect(calculateDistance(a,b)).toBeCloseTo(3);
    expect(calculateDistance(b,c)).toBeCloseTo(4);
    expect(calculateDistance(c,a)).toBeCloseTo(5);
    expect(scene).toEqual([]);
  });
  it('updates the existing triangle for olsun without creating another', () => {
    const a = run('üçgen çiz');
    const b = run('3 4 5 üçgeni olsun', a.objects);
    expect(b.objects.length).toBe(a.objects.length);
    expect(point(a.objects,'B').x).not.toBe(point(b.objects,'B').x);
  });
  it.each(['1 2 3 üçgen çiz','1 1 5 üçgen çiz','3 3 3 dik üçgen çiz','üçgen çizme','bir ejderha çiz','yarıçapı -2 olan çember çiz','3 4 5 eşkenar üçgen çiz','3 4 5 ikizkenar üçgen çiz'])('rejects invalid/unsupported command: %s', text => {
    expect(executeTurkishCommand(text,[]).ok).toBe(false);
  });
  it('asks which triangle when multiple targets exist', () => {
    const a = run('üçgen çiz');
    const b = run('üçgen çiz', a.objects);
    expect(executeTurkishCommand('üçgenin alanını yaz', b.objects).ok).toBe(false);
    expect(run('üçgenin alanını yaz', b.objects, a.selectedIds).ok).toBe(true);
  });
  it('does not duplicate an angle when asked twice', () => {
    const a = run('3 4 5 üçgen çiz');
    const b = run('A noktasının açısını yaz', a.objects);
    const c = run('A noktasının açısını yaz', b.objects);
    expect(c.objects.filter(o=>o.type==='angle')).toHaveLength(1);
  });
  it('creates a perpendicular altitude and updates it after moving a corner', () => {
    const a = run('3 4 5 üçgen çiz');
    const r = run('C noktasından dik indir', a.objects);
    const h = r.objects.find(o=>o.type==='point'&&o.construction?.kind==='foot') as PointObject;
    expect(h.y).toBeCloseTo(point(r.objects,'A').y);
    const moved = resolveCommandBindings(r.objects.map(o=>o.id===point(r.objects,'C').id?{...o,x:4} as MathObject:o));
    expect((moved.find(o=>o.id===h.id) as PointObject).x).toBeCloseTo(4);
  });
  it('binds all three sides and recomputes a dependent altitude', () => {
    const a = run('3 4 5 üçgen çiz');
    const altitude = run('C noktasından dik indir', a.objects);
    const r = run('üçgen uzunluklarını kaydırıcıya bağla', altitude.objects);
    const sliders = r.objects.filter(o=>o.type==='slider') as SliderObject[];
    expect(sliders).toHaveLength(3);
    const next=resolveCommandBindings(r.objects.map(o=>o.id===sliders[0].id?{...o,value:4} as MathObject:o));
    expect(calculateDistance(point(next,'A'),point(next,'B'))).toBeCloseTo(4);
    expect(calculateDistance(point(next,'B'),point(next,'C'))).toBeCloseTo(4);
    expect(calculateDistance(point(next,'C'),point(next,'A'))).toBeCloseTo(5);
    expect(()=>resolveCommandBindings(r.objects.map(o=>o.id===sliders[0].id?{...o,value:20} as MathObject:o))).toThrow('üçgen');
    expect(sliders[0].value).toBe(3);
    const reloaded = resolveCommandBindings(JSON.parse(JSON.stringify(next)));
    expect(point(reloaded,'C')).toEqual(point(next,'C'));
    const removed = collectDependentIds(r.objects,[sliders[0].id]);
    expect(removed.has((r.objects.find(o=>o.type==='polygon') as PolygonObject).id)).toBe(true);
  });
  it('requires a tangent source and produces two orthogonal tangents outside a circle', () => {
    const circle = run('yarıçapı 2 olan çember çiz');
    expect(executeTurkishCommand('çembere teyet doğru çiz',circle.objects).ok).toBe(false);
    const outside = run('P (4; 0) noktası oluştur',circle.objects);
    const r = run('P noktasından çembere teğet doğru çiz',outside.objects);
    const p=point(r.objects,'P'), center=point(r.objects,'A');
    const contacts=r.objects.filter(o=>o.type==='point'&&o.construction?.kind==='tangent') as PointObject[];
    expect(contacts).toHaveLength(2);
    for(const q of contacts){expect(calculateDistance(center,q)).toBeCloseTo(2);expect((p.x-q.x)*(q.x-center.x)+(p.y-q.y)*(q.y-center.y)).toBeCloseTo(0);}
  });
  it('creates one tangent on circle; rejects interior point', () => {
    const c=run('çember çiz');
    const p=run('P (2; 0) noktası oluştur',c.objects);
    expect(run('P noktasından çembere teğet çiz',p.objects).objects.filter(o=>o.type==='line')).toHaveLength(1);
    expect(executeTurkishCommand('A noktasından çembere teğet çiz',p.objects).ok).toBe(false);
  });
  it.each(['kare çiz','3 5 dikdörtgen çiz','6 kenarlı düzgün çokgen çiz','yarıçapı 3 olan çember çiz','f(x) = x^2'])('supports %s',text=>expect(run(text).objects.length).toBeGreaterThan(0));
  it('parses decimal-comma coordinates and rejects duplicate names', () => {
    const r=run('P (2,5; -3,2) noktası oluştur');
    expect(point(r.objects,'P').x).toBe(2.5);
    expect(point(r.objects,'P').y).toBe(-3.2);
    expect(executeTurkishCommand('P (1; 2) noktası oluştur',r.objects).ok).toBe(false);
  });
  it('validates scale-independent triangle geometry',()=>{
    expect(triangleCoordinates(3,4,5)).toEqual({x:3,y:4});
    expect(()=>triangleCoordinates(NaN,4,5)).toThrow();
  });
  it('assigns bound sliders transactionally and keeps bindings after detaching independent vertices', () => {
    const a=run('3 4 5 üçgen çiz');
    const b=run('üçgen uzunluklarını kaydırıcıya bağla',a.objects);
    const c=run('ab = 4',b.objects);
    expect(calculateDistance(point(c.objects,'A'),point(c.objects,'B'))).toBeCloseTo(4);
    expect(executeTurkishCommand('ab = 10',c.objects).ok).toBe(false);
    const d=run('üçgenin kaydırıcı bağını kaldır',c.objects);
    expect(point(d.objects,'B').construction).toBeUndefined();
    expect(point(d.objects,'B').x).toBe(point(c.objects,'B').x);
  });
  it('resolves circumcircle tangents from the three defining points', () => {
    let scene=run('A (2; 0) noktası oluştur').objects;
    scene=run('B (0; 2) noktası oluştur',scene).objects;
    scene=run('C (-2; 0) noktası oluştur',scene).objects;
    scene=run('P (4; 0) noktası oluştur',scene).objects;
    scene.push({id:'circle',type:'circle',label:'c1',visible:true,showLabel:true,color:'#2563eb',createdAt:1,centerPointId:'unused',throughPointIds:['A','B','C'].map(n=>point(scene,n).id)});
    const result=run('P noktasından çembere teğet çiz',scene);
    for(const q of result.objects.filter(o=>o.type==='point'&&o.construction?.kind==='tangent') as PointObject[]){expect(Math.hypot(q.x,q.y)).toBeCloseTo(2);}
  });
});
