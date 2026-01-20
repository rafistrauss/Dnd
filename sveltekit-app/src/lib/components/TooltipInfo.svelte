<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let tooltipContent: string;
  export let ariaLabel: string = 'Show information';

  let showTooltip = false;
  let tooltipContainer: HTMLElement;
  let isTouch = false;
  let popupEl: HTMLDivElement | null = null;
  let alignRight = false;
  let ready = false;
  let fixedStyle = '';
  // Unique ID for this tooltip instance
  const tooltipId = Math.random().toString(36).slice(2);

  // Event bus for tooltip open/close
  function emitTooltipOpen() {
    window.dispatchEvent(new CustomEvent('tooltip-open', { detail: tooltipId }));
  }
  function onTooltipOpen(e: CustomEvent) {
    if (e.detail !== tooltipId) {
      showTooltip = false;
      alignRight = false;
    }
  }

  function detectTouch() {
    isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  }

  function checkPosition() {
    if (!popupEl || !tooltipContainer) return;
    // Get the icon's position
    const iconRect = tooltipContainer.getBoundingClientRect();
    const popupRect = popupEl.getBoundingClientRect();
    let top = iconRect.bottom + 5; // 5px margin below icon
    let left = iconRect.left;
    let right = '';
    alignRight = false;

    // If it would overflow right, align to right edge
    if (left + popupRect.width > window.innerWidth - 8) {
      left = iconRect.right - popupRect.width;
      alignRight = true;
      if (left < 8) left = 8; // Prevent overflow left
    }
    // If it would overflow left, clamp
    if (left < 8) left = 8;
    // If it would overflow bottom, show above
    if (top + popupRect.height > window.innerHeight - 8) {
      top = iconRect.top - popupRect.height - 5;
    }
    fixedStyle = `position:fixed;top:${top}px;left:${left}px;z-index:1000;`;
    ready = true;
  }

  function show() {
    emitTooltipOpen();
    showTooltip = false;
    ready = false;
    requestAnimationFrame(() => {
      showTooltip = true;
      ready = false;
      setTimeout(checkPosition, 0);
    });
  }
  function hide() {
    showTooltip = false;
    alignRight = false;
  }

  function toggleTooltip(event: MouseEvent) {
    event.stopPropagation();
    if (!showTooltip) {
      emitTooltipOpen();
      showTooltip = false;
      ready = false;
      requestAnimationFrame(() => {
        showTooltip = true;
        ready = false;
        setTimeout(checkPosition, 0);
      });
    } else {
      showTooltip = false;
      alignRight = false;
      ready = false;
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (tooltipContainer && !tooltipContainer.contains(event.target as Node)) {
      showTooltip = false;
      alignRight = false;
    }
  }

  onMount(() => {
    detectTouch();
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('tooltip-open', onTooltipOpen as EventListener);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('tooltip-open', onTooltipOpen as EventListener);
  });
</script>

<div class="tooltip-wrapper" bind:this={tooltipContainer}>
  {#if isTouch}
    <button class="info-icon" on:click={toggleTooltip} aria-label={ariaLabel} type="button">
      ℹ️
    </button>
  {:else}
    <button
      class="info-icon"
      on:mouseenter={show}
      on:mouseleave={hide}
      aria-label={ariaLabel}
      type="button"
    >
      ℹ️
    </button>
  {/if}
  {#if showTooltip}
    <div
      class="tooltip-popup {alignRight ? 'right-align' : ''}"
      bind:this={popupEl}
      style={!ready ? 'opacity:0;pointer-events:none;position:fixed;top:0;left:0;z-index:1000;' : fixedStyle + 'opacity:1;pointer-events:auto;'}
    >
      <slot name="content">
        {@html tooltipContent}
      </slot>
    </div>
  {/if}
</div>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-block;
    vertical-align: middle;
  }

  .info-icon {
    background: none;
    border: none;
    font-size: 1rem;
    cursor: help;
    padding: 0;
    line-height: 1;
    filter: saturate(0);
    transition: filter 0.3s;
  }

  .info-icon:hover {
    opacity: 1;
    filter: saturate(3);
  }

  .tooltip-popup {
    /* All positioning is now handled inline via style attribute */
    background: #333;
    color: white;
    padding: 14px 16px;
    border-radius: 8px;
    font-size: 0.95rem;
    line-height: 1.7;
    white-space: pre;
    margin-top: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 300px;
    max-width: 90vw;
    min-width: 120px;
    animation: fadeIn 0.2s ease-in;
    font-family: inherit, monospace;
    pointer-events: auto;
  }
  .tooltip-popup.right-align {
    left: auto;
    right: 0;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
