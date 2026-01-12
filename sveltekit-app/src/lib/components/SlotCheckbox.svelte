<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { isEditMode } from '$lib/stores';
  export let checked: boolean = false;
  export let disabled: boolean = false;
  export let className: string = "";

  // Optional: index for array-based checkboxes
  export let index: number | undefined = undefined;

  // Optional: aria-label for accessibility
  export let ariaLabel: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  function handleChange(e: Event) {
    dispatch("change", {
      checked: (e.currentTarget as HTMLInputElement).checked,
      index,
    });
  }
</script>

<label class={"slot-checkbox-label " + className + (!$isEditMode ? ' not-editable' : '')}>
  <input
    type="checkbox"
    class="slot-checkbox-input"
    checked={checked}
    disabled={disabled || !$isEditMode}
    aria-label={ariaLabel}
    on:change={handleChange}
    tabindex={$isEditMode ? 0 : -1}
  />
  <span class="slot-checkbox-custom {checked ? 'used' : ''} {$isEditMode ? '' : 'readonly'}">
    {#if checked}
      <span class="slot-checkbox-x">&#8212;</span> <!-- em-dash -->
    {/if}
  </span>
</label>

<style>
  .slot-checkbox-label {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    position: relative;
    user-select: none;
    opacity: 1;
    transition: opacity 0.2s;
  }
  .slot-checkbox-label.not-editable {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .slot-checkbox-input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
    left: 0;
    top: 0;
    margin: 0;
    z-index: 1;
  }

  .slot-checkbox-custom {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: 2px solid var(--primary-color, #b89872);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: var(--primary-color, #b89872);
    transition: background 0.2s, color 0.2s, opacity 0.2s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }

  .slot-checkbox-custom.used {
    background: var(--primary-color, #e0e0e0);
    color: #fff;
    border-color: var(--primary-color, #e0e0e0);
  }
  .slot-checkbox-custom.readonly {
    filter: grayscale(0.5);
    opacity: 0.7;
    cursor: not-allowed;
  }

  .slot-checkbox-x {
    font-size: 1.3rem;
    font-weight: bold;
    color: inherit;
    pointer-events: none;
    line-height: 1;
  }
</style>
