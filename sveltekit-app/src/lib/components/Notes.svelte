<script lang="ts">
	import { character, searchFilter, collapsedStates } from '$lib/stores';

	function toggleCollapse() {
		collapsedStates.update((s: any) => ({ ...s, notes: !s.notes }));
	}

	$: hasVisibleContent = !$searchFilter || 
		'features'.includes($searchFilter.toLowerCase()) ||
		'traits'.includes($searchFilter.toLowerCase()) ||
		'equipment'.includes($searchFilter.toLowerCase()) ||
		'notes'.includes($searchFilter.toLowerCase()) ||
		$character.features.toLowerCase().includes($searchFilter.toLowerCase()) ||
		$character.equipment.toLowerCase().includes($searchFilter.toLowerCase()) ||
		$character.notes.toLowerCase().includes($searchFilter.toLowerCase());
</script>

<section class="notes" class:hidden={!hasVisibleContent}>
	<div class="header">
		<h2>Features & Traits</h2>
		<button class="collapse-btn" on:click={toggleCollapse} aria-label={$collapsedStates.notes ? 'Expand' : 'Collapse'}>
			{$collapsedStates.notes ? '▼' : '▲'}
		</button>
	</div>
	{#if !$collapsedStates.notes}
	<textarea
		bind:value={$character.features}
		placeholder="Enter features, traits, and special abilities..."
	></textarea>

	<h3>Equipment</h3>
	<textarea bind:value={$character.equipment} placeholder="List your equipment and inventory..."></textarea>

	<h3>Notes</h3>
	<textarea bind:value={$character.notes} placeholder="Additional notes..."></textarea>
	{/if}
</section>

<style>
	.notes {
		background-color: var(--card-bg);
		padding: 20px;
		border-radius: 8px;
		box-shadow: var(--shadow);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2px solid var(--border-color);
		padding-bottom: 10px;
		margin-bottom: 15px;
	}

	h2 {
		margin: 0;
		color: var(--primary-color);
	}

	.collapse-btn {
		background: none;
		border: none;
		font-size: 1.2rem;
		cursor: pointer;
		color: var(--primary-color);
		padding: 5px 10px;
		transition: transform 0.2s ease;
	}

	.collapse-btn:hover {
		transform: scale(1.1);
	}

	.hidden {
		display: none;
	}

	h3 {
		margin-top: 20px;
		margin-bottom: 10px;
		color: var(--primary-color);
		border-bottom: 2px solid var(--border-color);
		padding-bottom: 10px;
	}

	h3:first-of-type {
		margin-top: 0;
	}

	textarea {
		width: 100%;
		min-height: 120px;
		padding: 10px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-family: inherit;
		font-size: 0.95rem;
		resize: vertical;
	}

	textarea:focus {
		outline: none;
		border-color: var(--primary-color);
	}
</style>
