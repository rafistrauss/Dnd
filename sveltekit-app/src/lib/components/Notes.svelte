<script lang="ts">
	import { character } from '$lib/stores';
</script>

<section class="notes">
	<h2>Features & Traits</h2>
	<textarea
		bind:value={$character.features}
		placeholder="Enter features, traits, and special abilities..."
	></textarea>

	<h2>Equipment</h2>
	<textarea bind:value={$character.equipment} placeholder="List your equipment and inventory..."></textarea>

	<h2>Notes</h2>
	<textarea bind:value={$character.notes} placeholder="Additional notes..."></textarea>
</section>

<style>
	.notes {
		background-color: var(--card-bg);
		padding: 20px;
		border-radius: 8px;
		box-shadow: var(--shadow);
	}

	h2 {
		margin-top: 0;
		margin-bottom: 10px;
		color: var(--primary-color);
		border-bottom: 2px solid var(--border-color);
		padding-bottom: 10px;
	}

	h2:not(:first-child) {
		margin-top: 20px;
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
