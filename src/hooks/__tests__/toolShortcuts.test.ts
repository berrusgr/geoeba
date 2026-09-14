import { describe, expect, it } from 'vitest';
import { TOOL_SHORTCUTS, toolForShortcut } from '../../components/workspace/toolShortcuts';
import { TOOL_GROUPS } from '../../components/workspace/toolDefinitions';

const event = { code: 'KeyN', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, repeat: false };

describe('tool shortcuts', () => {
  it('covers every toolbar tool without duplicate bindings', () => {
    const values = Object.values(TOOL_SHORTCUTS);
    expect(new Set(values).size).toBe(values.length);
    for (const tool of TOOL_GROUPS.flatMap(group => group.tools)) {
      const binding = TOOL_SHORTCUTS[tool.id];
      expect(binding).toBeTruthy();
      expect(toolForShortcut({ ...event, code: `Key${binding.at(-1)}`, shiftKey: binding.startsWith('Shift+') })).toBe(tool.id);
    }
  });
  it('leaves browser shortcuts, IME input and held keys alone', () => {
    for (const flag of ['ctrlKey', 'metaKey', 'altKey', 'isComposing', 'repeat']) {
      expect(toolForShortcut({ ...event, [flag]: true })).toBeUndefined();
    }
    expect(toolForShortcut({ ...event, code: 'ArrowLeft' })).toBeUndefined();
    expect(toolForShortcut(event)).toBe('point');
    expect(toolForShortcut({ ...event, code: 'KeyV', shiftKey: true })).toBe('translate');
  });
});
