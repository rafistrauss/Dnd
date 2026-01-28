<script lang="ts">
    import { isEditMode } from '../stores';
    export let value: string | number;
    export let type: string = 'text';

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        let val: string | number = target.value;
        if (type === 'number') {
            val = target.valueAsNumber;
        }
        value = val;
    }
</script>

{#if $isEditMode}
    <input
        bind:value
        type={type}
        class="editable-input"
        on:input={handleInput}
    />
{:else}
    <span class="editable-display">{value}</span>
{/if}

<style>
    .editable-input {
        font: inherit;
        padding: 2px 4px;
        border: 1px solid #ccc;
        border-radius: 3px;
        min-width: 2em;
    }
    .editable-display {
        padding: 2px 4px;
        min-width: 2em;
        display: inline-block;
    }
</style>

<!-- markup (zero or more items) goes here -->