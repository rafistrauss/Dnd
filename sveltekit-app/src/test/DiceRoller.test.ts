/**
 * Tests for DiceRoller modal button behaviour.
 *
 * The core regression being guarded here is that touch-event handling on the
 * modal overlay must NOT prevent buttons inside the modal from receiving click
 * (or synthesised-from-touch) events.  Earlier fixes used
 *   on:touchmove|nonpassive|preventDefault
 * on the overlay which caused Android Chrome to stop synthesising click events
 * for child elements whenever there was any slight finger movement during a tap.
 *
 * The current fix uses pure CSS (overscroll-behavior: none on the overlay)
 * which never intercepts touch events, so button taps always complete normally.
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

/** Simulate a complete touch-tap sequence on an element. */
function simulateTap(element: Element) {
  const touch = new Touch({ identifier: 1, target: element, clientX: 0, clientY: 0 });
  fireEvent(element, new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch] }));
  fireEvent(element, new TouchEvent('touchend', { bubbles: true, cancelable: true, changedTouches: [touch] }));
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

  it('clicking the backdrop (overlay) fires the close event', async () => {
    const closeSpy = vi.fn();
    const { container } = render(DiceRoller, {
      props: { visible: true, notation: '' },
      events: { close: closeSpy }
    });

    const overlay = container.querySelector('.modal-overlay') as HTMLElement;
    await fireEvent.click(overlay);

    expect(closeSpy).toHaveBeenCalledTimes(1);
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
