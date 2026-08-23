/**
 * Tests for DiceRoller modal button behaviour.
 *
 * The core regression being guarded here is that a pointer interaction that
 * begins inside modal-content (for example tapping the Roll button) must never
 * close the modal, even if Android Chrome's viewport resize (URL bar hide/show)
 * causes the synthesised click event to resolve to the overlay backdrop.
 *
 * The fix uses a `pointerdown` listener on the overlay to record whether the
 * pointer went down on the backdrop (`pointerDownOnOverlay`). `pointerdown`
 * fires at the true physical location *before* any viewport resize, so it stays
 * correct regardless of URL bar movement. The click handler on the overlay only
 * calls `close()` when both:
 *   1. `e.target === e.currentTarget` (click landed on the overlay itself), AND
 *   2. `pointerDownOnOverlay` is true (the pointer went down on the backdrop).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DiceRoller from '../lib/components/DiceRoller.svelte';

// ---------------------------------------------------------------------------
// Module mocks – must be declared before imports are resolved by vitest
// ---------------------------------------------------------------------------

vi.mock('$lib/stores', () => {
  const { writable, derived } = require('svelte/store') as typeof import('svelte/store');

  const character = writable({
    name: 'Test Character',
    class: 'Fighter',
    subclass: '',
    level: 1,
    proficiencyBonus: 2,
    inspiration: false,
    features: '',
    classFeatures: {
      features: { ChannelDivinity: 0 },
      spellSlotsByLevel: {}
    }
  });

  const rollHistory = writable([]);

  const abilityModifiers = derived(character, () => ({
    strength: 3,
    dexterity: 2,
    constitution: 1,
    intelligence: 0,
    wisdom: 1,
    charisma: 0
  }));

  return { character, rollHistory, abilityModifiers };
});

vi.mock('$lib/classConfig', () => ({
  getAvailableFeatures: () => []
}));

vi.mock('$lib/weaponMastery', () => ({
  MASTERY_MAP: {}
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate a complete tap sequence (pointer + touch + click) on an element. */
function simulateTap(element: Element) {
  const touch = new Touch({ identifier: 1, target: element, clientX: 0, clientY: 0 });
  fireEvent(element, new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  fireEvent(
    element,
    new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch] })
  );
  fireEvent(
    element,
    new TouchEvent('touchend', { bubbles: true, cancelable: true, changedTouches: [touch] })
  );
  fireEvent(element, new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  // happy-dom / jsdom don't auto-synthesise click from touch, so fire it manually
  // (this mirrors what a real mobile browser does after a successful tap)
  fireEvent.click(element);
}

/** Simulate a touchmove on an element and return whether preventDefault was called. */
function simulateTouchmoveAndCheckPreventDefault(element: Element): boolean {
  const touch = new Touch({ identifier: 1, target: element, clientX: 0, clientY: 0 });
  const event = new TouchEvent('touchmove', {
    bubbles: true,
    cancelable: true,
    touches: [touch]
  });
  const spy = vi.spyOn(event, 'preventDefault');
  fireEvent(element, event);
  return spy.mock.calls.length > 0;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DiceRoller modal buttons', () => {
  beforeEach(() => {
    // Prevent script injection from running in tests
    const originalQuerySelector = document.querySelector.bind(document);
    vi.spyOn(document, 'querySelector').mockImplementation((sel) => {
      if (typeof sel === 'string' && sel.startsWith('script[src=')) return {} as Element;
      return originalQuerySelector(sel);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the close button when visible', () => {
    const { container } = render(DiceRoller, { props: { visible: true, notation: '' } });
    const closeBtn = container.querySelector('.close-btn');
    expect(closeBtn).not.toBeNull();
  });

  it('close button fires the close event on click', async () => {
    const closeSpy = vi.fn();
    const { container } = render(DiceRoller, {
      props: { visible: true, notation: '' },
      events: { close: closeSpy }
    });

    const closeBtn = container.querySelector('.close-btn') as HTMLElement;
    expect(closeBtn).not.toBeNull();
    await fireEvent.click(closeBtn);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('close button fires the close event on touch-tap (no touchmove)', async () => {
    const closeSpy = vi.fn();
    const { container } = render(DiceRoller, {
      props: { visible: true, notation: '' },
      events: { close: closeSpy }
    });

    const closeBtn = container.querySelector('.close-btn') as HTMLElement;
    simulateTap(closeBtn);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop (overlay) fires the close event (mouse)', async () => {
    const closeSpy = vi.fn();
    const { container } = render(DiceRoller, {
      props: { visible: true, notation: '' },
      events: { close: closeSpy }
    });

    // Mouse press + release both on the overlay backdrop — should close
    const overlay = container.querySelector('.modal-overlay') as HTMLElement;
    fireEvent(overlay, new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    await fireEvent.click(overlay);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('tapping the backdrop (overlay) fires the close event (touch)', async () => {
    const closeSpy = vi.fn();
    const { container } = render(DiceRoller, {
      props: { visible: true, notation: '' },
      events: { close: closeSpy }
    });

    // Touch tap that starts and ends on the overlay — should close
    const overlay = container.querySelector('.modal-overlay') as HTMLElement;
    simulateTap(overlay);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('Android Chrome regression: pointerdown on modal-content + click on overlay does NOT close (pointer guard)', async () => {
    const closeSpy = vi.fn();
    const { container } = render(DiceRoller, {
      props: { visible: true, notation: '' },
      events: { close: closeSpy }
    });

    const content = container.querySelector('.modal-content') as HTMLElement;
    const overlay = container.querySelector('.modal-overlay') as HTMLElement;

    // Simulate pointer going down inside modal-content (sets pointerDownOnOverlay = false)
    fireEvent(content, new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

    // Synthesised click resolves to overlay (Android Chrome viewport-shift scenario)
    await fireEvent.click(overlay);

    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('Android Chrome regression: misrouted overlay click is replayed on the tapped control (Roll button still fires)', async () => {
    const closeSpy = vi.fn();
    const { container } = render(DiceRoller, {
      props: { visible: true, notation: '' },
      events: { close: closeSpy }
    });

    const overlay = container.querySelector('.modal-overlay') as HTMLElement;
    // The Reset button is always enabled (the Roll button is disabled until the 3D dice
    // engine initialises, which doesn't happen in the test DOM), so use it to observe
    // that a misrouted overlay click is replayed on the physically-tapped control.
    const resetBtn = container.querySelector('.dice-controls button.btn-secondary') as HTMLElement;
    expect(resetBtn).not.toBeNull();

    const resetClickSpy = vi.fn();
    resetBtn.addEventListener('click', resetClickSpy);

    // Pointer physically goes down on the button...
    fireEvent(resetBtn, new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    // ...but a mid-gesture viewport resize misroutes the synthesized click to the overlay.
    await fireEvent.click(overlay);

    // The tap must be recovered by replaying it on the tapped control, and must NOT close.
    expect(resetClickSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('clicking modal content does NOT fire the close event (target guard)', async () => {
    const closeSpy = vi.fn();
    const { container } = render(DiceRoller, {
      props: { visible: true, notation: '' },
      events: { close: closeSpy }
    });

    const content = container.querySelector('.modal-content') as HTMLElement;
    await fireEvent.click(content);

    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('touchmove on the overlay backdrop does NOT call preventDefault (CSS-only scroll lock)', () => {
    const { container } = render(DiceRoller, { props: { visible: true, notation: '' } });
    const overlay = container.querySelector('.modal-overlay') as HTMLElement;

    // The current implementation uses CSS overscroll-behavior, not JS preventDefault.
    // This test confirms no preventDefault is called, ensuring button taps are never blocked.
    const calledPreventDefault = simulateTouchmoveAndCheckPreventDefault(overlay);
    expect(calledPreventDefault).toBe(false);
  });

  it('close button remains clickable after a touchmove on the overlay', async () => {
    const closeSpy = vi.fn();
    const { container } = render(DiceRoller, {
      props: { visible: true, notation: '' },
      events: { close: closeSpy }
    });

    const overlay = container.querySelector('.modal-overlay') as HTMLElement;
    const closeBtn = container.querySelector('.close-btn') as HTMLElement;

    // Simulate user scrolling outside the modal first
    simulateTouchmoveAndCheckPreventDefault(overlay);

    // Then tap the close button — must still work
    await fireEvent.click(closeBtn);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('modal is hidden when visible=false', () => {
    const { container } = render(DiceRoller, { props: { visible: false, notation: '' } });
    const overlay = container.querySelector('.modal-overlay');
    expect(overlay?.classList.contains('hidden')).toBe(true);
  });
});
