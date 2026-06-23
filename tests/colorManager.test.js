import { describe, it, expect } from 'vitest';
import { ColorManager } from '../js/utils/colorManager.js';

function makeManager() {
  let saved = 0;
  let rendered = 0;
  const app = {
    history: { saveState() { saved++; } },
    render() { rendered++; },
    counts: () => ({ saved, rendered }),
  };
  return { mgr: new ColorManager(app), app };
}

describe('ColorManager', () => {
  it('sets the default color when nothing is selected', () => {
    const { mgr } = makeManager();
    mgr.editingElements = [];
    mgr.setColor('red');
    expect(mgr.getColor()).toBe('#ff4444');
  });

  it('recolors every selected element (any type) and saves one undo step', () => {
    const { mgr, app } = makeManager();
    const els = [
      { type: 'box', color: '#ffffff' },
      { type: 'line', color: '#ffffff' },
      { type: 'text', color: '#ffffff' },
    ];
    mgr.editingElements = els;
    mgr.setColor('blue');
    expect(els.map(e => e.color)).toEqual(['#4444ff', '#4444ff', '#4444ff']);
    expect(app.counts().saved).toBe(1);
    // editing a selection should not change the default for new elements
    expect(mgr.getColor()).toBe('#ffffff');
  });

  it('passes through a raw hex value', () => {
    const { mgr } = makeManager();
    mgr.editingElements = [];
    mgr.setColor('#123456');
    expect(mgr.getColor()).toBe('#123456');
  });
});
