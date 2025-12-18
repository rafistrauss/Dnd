<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { character, abilityModifiers, searchFilter, collapsedStates } from '$lib/stores';
	import type { Attack } from '$lib/types';

	const dispatch = createEventDispatcher();

	function addAttack() {
		character.update(c => {
			c.attacks = [
				...c.attacks,
				{
					id: crypto.randomUUID(),
					name: '',
					bonus: 0,
					damage: '',
					damageType: '',
					notes: ''
				}
			];
			return c;
		});
	}

	function removeAttack(id: string) {
		character.update(c => {
			c.attacks = c.attacks.filter(a => a.id !== id);
			return c;
		});
	}

	function rollAttack(attack: Attack) {
		const notation = `1d20${attack.bonus >= 0 ? '+' : ''}${attack.bonus}`;
		dispatch('roll', { 
			notation, 
			damageNotation: attack.damage,
			attackName: attack.name 
		});
	}

	function rollDamage(attack: Attack) {
		if (!attack.damage) {
			alert(`${attack.name}: No damage specified`);
			return;
		}

		dispatch('roll', { notation: attack.damage });
	}

	function toggleCollapse() {
		collapsedStates.update(s => ({ ...s, attacks: !s.attacks }));
	}

	$: filteredAttacks = $character.attacks.filter((attack) => {
		if (!$searchFilter) return true;
		const filter = $searchFilter.toLowerCase();
		return attack.name.toLowerCase().includes(filter) ||
			attack.damageType.toLowerCase().includes(filter);
	});

	$: hasVisibleContent = !$searchFilter || filteredAttacks.length > 0 || 
		'attack'.includes($searchFilter.toLowerCase()) ||
		'spell'.includes($searchFilter.toLowerCase());
</script>

<section class="attacks" class:hidden={!hasVisibleContent}>
	<div class="header">
		<h2>Attacks & Spells</h2>
		<button class="collapse-btn" on:click={toggleCollapse} aria-label={$collapsedStates.attacks ? 'Expand' : 'Collapse'}>
			{$collapsedStates.attacks ? '▼' : '▲'}
		</button>
	</div>
	{#if !$collapsedStates.attacks}
	<button on:click={addAttack} class="btn btn-secondary">Add Attack</button>

	<div class="attacks-list">
		{#each filteredAttacks as attack (attack.id)}
			<div class="attack-card">
				<div class="attack-header">
					<input
						type="text"
						bind:value={attack.name}
						placeholder="Attack name"
						class="attack-name"
					/>
					<button on:click={() => removeAttack(attack.id)} class="btn-remove">×</button>
				</div>
				<div class="attack-details">
					<div class="attack-field">
						<label>Bonus</label>
						<input type="number" bind:value={attack.bonus} class="attack-bonus" />
					</div>
					<div class="attack-field">
						<label>Damage</label>
						<input
							type="text"
							bind:value={attack.damage}
							placeholder="e.g., 2d6+3"
							class="attack-damage"
						/>
					</div>
					<div class="attack-field">
						<label>Type</label>
						<input
							type="text"
							bind:value={attack.damageType}
							placeholder="e.g., slashing"
							class="attack-type"
						/>
					</div>
				</div>
				<div class="attack-notes">
					<label>Notes</label>
					<textarea
						bind:value={attack.notes}
						placeholder="e.g., DC 15 Dex save, Range 120 ft, Concentration"
						class="notes-input"
						rows="2"
					/>
				</div>
				<div class="attack-actions">
					<button on:click={() => rollAttack(attack)} class="btn btn-primary">Roll Attack</button>
					<button on:click={() => rollDamage(attack)} class="btn btn-secondary">Roll Damage</button
					>
				</div>
			</div>
		{/each}

		{#if $character.attacks.length === 0}
			<p class="no-attacks">No attacks added yet. Click "Add Attack" to create one.</p>
		{:else if filteredAttacks.length === 0}
			<p class="no-attacks">No attacks match your search.</p>
		{/if}
	</div>
	{/if}
</section>

<style>
	.attacks {
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

	.attacks-list {
		margin-top: 15px;
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.attack-card {
		background-color: #f9f9f9;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 15px;
	}

	.attack-header {
		display: flex;
		gap: 10px;
		margin-bottom: 10px;
	}

	.attack-name {
		flex: 1;
		padding: 8px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 1rem;
		font-weight: bold;
	}

	.btn-remove {
		width: 32px;
		height: 32px;
		background-color: #dc3545;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1.5rem;
		line-height: 1;
		transition: background-color 0.2s;
	}

	.btn-remove:hover {
		background-color: #c82333;
	}

	.attack-details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 10px;
		margin-bottom: 10px;
	}

	.attack-field {
		display: flex;
		flex-direction: column;
	}

	.attack-field label {
		font-size: 0.85rem;
		font-weight: bold;
		margin-bottom: 4px;
	}

	.attack-field input {
		padding: 6px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
	}

	.attack-notes {
		margin-top: 10px;
	}

	.attack-notes label {
		font-size: 0.85rem;
		font-weight: bold;
		margin-bottom: 4px;
		display: block;
	}

	.notes-input {
		width: 100%;
		padding: 6px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-family: inherit;
		resize: vertical;
		min-height: 40px;
	}

	.notes-input:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.attack-bonus {
		width: 100%;
	}

	.attack-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.no-attacks {
		text-align: center;
		color: #666;
		padding: 30px;
		font-style: italic;
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
