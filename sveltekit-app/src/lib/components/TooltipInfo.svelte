<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let tooltipContent: string;
  export let ariaLabel: string = 'Show information';

  let showTooltip = false;
  let tooltipContainer: HTMLElement;
  let isTouch = false;

  function detectTouch() {
    isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  }

  function show() { showTooltip = true; }
  function hide() { showTooltip = false; }

  function toggleTooltip(event: MouseEvent) {
    event.stopPropagation();
    showTooltip = !showTooltip;
  }

  function handleClickOutside(event: MouseEvent) {
    if (tooltipContainer && !tooltipContainer.contains(event.target as Node)) {
      showTooltip = false;
    }
  }

  onMount(() => {
    detectTouch();
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="tooltip-wrapper" bind:this={tooltipContainer}>
  {#if isTouch}
    <button
      class="info-icon"
      on:click={toggleTooltip}
      aria-label={ariaLabel}
      type="button"
    >
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
    <div class="tooltip-popup">
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
    position: absolute;
    background: #333;
    color: white;
    padding: 14px 16px;
    border-radius: 8px;
    font-size: 0.95rem;
    line-height: 1.7;
    white-space: normal;
    z-index: 1000;
    margin-top: 5px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 300px;
    min-width: 120px;
    animation: fadeIn 0.2s ease-in;
    bottom: 100%;
    left: 0;
    font-family: inherit, monospace;
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
