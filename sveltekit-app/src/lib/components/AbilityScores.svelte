<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { character, abilityModifiers, searchFilter, collapsedStates, updateProficiencyBonus } from '$lib/stores';
	import type { AbilityName } from '$lib/types';

	const dispatch = createEventDispatcher();

	const abilities: { key: AbilityName; label: string }[] = [
		{ key: 'strength', label: 'Strength' },
		{ key: 'dexterity', label: 'Dexterity' },
		{ key: 'constitution', label: 'Constitution' },
		{ key: 'intelligence', label: 'Intelligence' },
		{ key: 'wisdom', label: 'Wisdom' },
		{ key: 'charisma', label: 'Charisma' }
	];

	function handleAbilityChange() {
		updateProficiencyBonus();
	}

	function rollAbilityCheck(ability: AbilityName) {
		const modifier = $abilityModifiers[ability];
		const notation = `1d20${modifier >= 0 ? '+' : ''}${modifier}`;
		dispatch('roll', notation);
	}

	function rollSave(ability: AbilityName) {
		const modifier = $abilityModifiers[ability];
		const profBonus = $character.saveProficiencies[ability] ? $character.proficiencyBonus : 0;
		const totalMod = modifier + profBonus;
		const notation = `1d20${totalMod >= 0 ? '+' : ''}${totalMod}`;
		dispatch('roll', notation);
	}

	function toggleCollapse() {
		collapsedStates.update(s => ({ ...s, abilityScores: !s.abilityScores }));
	}

	$: filteredAbilities = abilities.filter(({ label }) => {
		if (!$searchFilter) return true;
		return label.toLowerCase().includes($searchFilter.toLowerCase());
	});

	$: hasVisibleContent = filteredAbilities.length > 0 || !$searchFilter || $searchFilter.toLowerCase().includes('proficiency');
</script>

<section class="ability-scores" class:hidden={!hasVisibleContent}>
	<div class="header">
		<h2>Ability Scores</h2>
		<button class="collapse-btn" on:click={toggleCollapse} aria-label={$collapsedStates.abilityScores ? 'Expand' : 'Collapse'}>
			{$collapsedStates.abilityScores ? '▼' : '▲'}
		</button>
	</div>
	{#if !$collapsedStates.abilityScores}
	<div class="proficiency-bonus">
		<label for="profBonus">Proficiency Bonus</label>
		<input
			type="number"
			id="profBonus"
			bind:value={$character.proficiencyBonus}
			class="prof-input"
		/>
	</div>

	<div class="abilities-grid">
		{#each filteredAbilities as { key, label }}
			<div class="ability-card">
				<h3>{label.substring(0, 3).toUpperCase()}</h3>
				<input
					type="number"
					bind:value={$character.abilities[key]}
					on:change={handleAbilityChange}
					class="ability-score"
					min="1"
					max="30"
				/>
				<div class="ability-modifier">
					{$abilityModifiers[key] >= 0 ? '+' : ''}{$abilityModifiers[key]}
				</div>
				<button class="roll-btn" on:click={() => rollAbilityCheck(key)}>Check</button>
				<div class="save-row">
					<input
						type="checkbox"
						bind:checked={$character.saveProficiencies[key]}
						id={`${key}-save`}
					/>
					<label for={`${key}-save`}>Save</label>
					<button class="roll-btn-small" on:click={() => rollSave(key)}>Roll</button>
				</div>
			</div>
		{/each}
	</div>
	{/if}
</section>

<style>
	.ability-scores {
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

	.proficiency-bonus {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		padding: 10px;
		background-color: #f9f9f9;
		border-radius: 6px;
	}

	.prof-input {
		width: 60px;
		padding: 6px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		text-align: center;
		font-weight: bold;
	}

	.abilities-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 15px;
	}

	.ability-card {
		background-color: #f9f9f9;
		border: 2px solid var(--border-color);
		border-radius: 8px;
		padding: 15px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.ability-card h3 {
		margin: 0;
		font-size: 0.9rem;
		color: var(--primary-color);
	}

	.ability-score {
		width: 60px;
		padding: 8px;
		border: 2px solid var(--border-color);
		border-radius: 4px;
		text-align: center;
		font-size: 1.2rem;
		font-weight: bold;
	}

	.ability-modifier {
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--primary-color);
	}

	.roll-btn {
		width: 100%;
		padding: 6px;
		background-color: var(--primary-color);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: background-color 0.2s;
	}

	.roll-btn:hover {
		background-color: var(--primary-color-hover);
	}

	.save-row {
		display: flex;
		align-items: center;
		gap: 5px;
		width: 100%;
		font-size: 0.85rem;
	}

	.save-row label {
		flex: 1;
	}

	.roll-btn-small {
		padding: 4px 8px;
		background-color: var(--secondary-color);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.75rem;
	}

	.roll-btn-small:hover {
		background-color: #b89872;
	}

	input:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.roll-notification {
		background: #4caf50;
		color: white;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 15px;
		font-weight: bold;
		text-align: center;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
