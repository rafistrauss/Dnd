<script lang="ts">
	import { onMount } from 'svelte';
	import { character, isEditMode, exportCharacter, importCharacter, searchFilter } from '$lib/stores';
	import { getClassConfig, getAvailableFeatures } from '$lib/classConfig';
	import CharacterInfo from '$lib/components/CharacterInfo.svelte';
	import AbilityScores from '$lib/components/AbilityScores.svelte';
	import CombatStats from '$lib/components/CombatStats.svelte';
	import Skills from '$lib/components/Skills.svelte';
	import Attacks from '$lib/components/Attacks.svelte';
	import ClassFeatures from '$lib/components/ClassFeatures.svelte';
	import Notes from '$lib/components/Notes.svelte';
	import DiceRoller from '$lib/components/DiceRoller.svelte';
	import GistModal from '$lib/components/GistModal.svelte';
	import WikidotImport from '$lib/components/WikidotImport.svelte';
	import type { Character } from '$lib/types';

	function getAllSpellSlots(): { level: number; available: number; total: number }[] {
		const result: { level: number; available: number; total: number }[] = [];
		const spellSlots = $character.classFeatures.spellSlotsByLevel || {};
		
		for (let level = 1; level <= 9; level++) {
			const slots = spellSlots[level];
			if (slots && slots.length > 0) {
				const total = slots.length;
				const used = slots.filter(s => s).length;
				result.push({ level, available: total - used, total });
			}
		}
		
		return result;
	}

	let showDiceRoller = false;
	let showGistModal = false;
	let showWikidotImport = false;
	let gistMode: 'save' | 'load' = 'save';
	let fileInput: HTMLInputElement | undefined = undefined;
	let diceNotation = '';
	let diceDamageNotation = '';
	let diceAttackName = '';
	let diceRollerComponent: any;
	let isHitDiceRoll = false;
	let showRestMenu = false;

	function takeShortRest() {
		character.update(c => {
			// Restore hit dice (up to half of max)
			c.hitDice.current = Math.min(c.hitDice.max, c.hitDice.current + Math.max(1, Math.floor(c.hitDice.max / 2)));
			
			// Reset features that recharge on short rest
			if (c.classFeatures.features) {
				Object.keys(c.classFeatures.features).forEach(key => {
					const featureConfig = getFeatureConfig(key);
					if (featureConfig?.resetOn === 'short') {
						if (Array.isArray(c.classFeatures.features[key])) {
							const maxUses = featureConfig.maxUses;
							const uses = typeof maxUses === 'function' ? maxUses(c.level) : maxUses;
							c.classFeatures.features[key] = Array(uses).fill(false);
						} else if (typeof c.classFeatures.features[key] === 'number') {
							const maxPool = featureConfig.maxPool;
						const poolValue = typeof maxPool === 'function' ? maxPool(c.level) : maxPool;
						if (poolValue !== undefined) {
							c.classFeatures.features[key] = poolValue;
						}
						}
					}
				});
			}
			
			return c;
		});
		showRestMenu = false;
	}

	function takeLongRest() {
		character.update(c => {
			// Restore all HP
			c.currentHP = c.maxHP;
			c.tempHP = 0;
			
			// Restore all hit dice
			c.hitDice.current = c.hitDice.max;
			
			// Reset all spell slots
			if (c.classFeatures.spellSlotsByLevel) {
				Object.keys(c.classFeatures.spellSlotsByLevel).forEach(level => {
					const slots = c.classFeatures.spellSlotsByLevel![parseInt(level)];
					if (slots) {
						c.classFeatures.spellSlotsByLevel![parseInt(level)] = Array(slots.length).fill(false);
					}
				});
			}
			
			// Reset all class features
			if (c.classFeatures.features) {
				Object.keys(c.classFeatures.features).forEach(key => {
					const featureConfig = getFeatureConfig(key);
					if (featureConfig) {
						if (Array.isArray(c.classFeatures.features[key])) {
							const maxUses = featureConfig.maxUses;
							const uses = typeof maxUses === 'function' ? maxUses(c.level) : maxUses;
							c.classFeatures.features[key] = Array(uses).fill(false);
						} else if (typeof c.classFeatures.features[key] === 'number') {
							const maxPool = featureConfig.maxPool;
							const poolValue = typeof maxPool === 'function' ? maxPool(c.level) : maxPool;
							if (poolValue !== undefined) {
								c.classFeatures.features[key] = poolValue;
							}
						}
					}
				});
			}
			
			return c;
		});
		showRestMenu = false;
	}

	function getFeatureConfig(key: string) {
		// Import from classConfig to get feature definitions
		const classConfig = $character.class ? getClassConfig($character.class) : null;
		if (!classConfig) return null;
		
		const features = getAvailableFeatures($character.class, $character.level, $character.subclass);
		// The key is stored without spaces, so we need to match it
		return features.find(f => f.name.replace(/\s+/g, '') === key);
	}

	function openDiceRoller(detail: string | { notation: string, damageNotation?: string, attackName?: string }) {
		// Reset notation first to ensure Svelte sees a change even if same value
		diceNotation = '';
		diceDamageNotation = '';
		diceAttackName = '';
		isHitDiceRoll = false;
		
		// Set all values together to ensure they update simultaneously
		if (typeof detail === 'string') {
			diceNotation = detail;
		} else {
			diceNotation = detail.notation;
			diceDamageNotation = detail.damageNotation || '';
			diceAttackName = detail.attackName || '';
		}
		showDiceRoller = true;
	}

	function handleHitDiceRoll(event: CustomEvent) {
		const { notation } = event.detail;
		diceNotation = '';
		isHitDiceRoll = true;
		
		setTimeout(() => {
			diceNotation = notation;
			diceDamageNotation = '';
			diceAttackName = 'Hit Die';
		}, 0);
		
		showDiceRoller = true;
	}

	function handleDiceRollerClose() {
		showDiceRoller = false;
		
		// If this was a hit dice roll, decrement the hit dice and add HP
		if (isHitDiceRoll && diceRollerComponent) {
			const rollTotal = diceRollerComponent.getLastRollTotal();
			
			if (rollTotal !== null) {
				const healing = Math.max(1, rollTotal);
				
				character.update((c: Character) => {
					c.hitDice.current = Math.max(0, c.hitDice.current - 1);
					c.currentHP = Math.min(c.maxHP, c.currentHP + healing);
					return c;
				});
			}
			
			isHitDiceRoll = false;
		}
	}

	function toggleMode() {
		console.log('toggleMode called, current isEditMode:', $isEditMode);
		isEditMode.update(v => {
			console.log('Updating isEditMode from', v, 'to', !v);
			return !v;
		});
	}

	// Close rest menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.rest-button-container')) {
			showRestMenu = false;
		}
	}

	// Apply use-mode class to body when mode changes
	onMount(() => {
		console.log('onMount - initial isEditMode:', $isEditMode);
		console.log('onMount - body classes:', document.body.className);
		
		const unsubscribe = isEditMode.subscribe(value => {
			console.log('isEditMode subscription triggered, value:', value);
			console.log('Body classes before:', document.body.className);
			
			if (value) {
				document.body.classList.remove('use-mode');
				console.log('Removed use-mode class (Edit Mode)');
			} else {
				document.body.classList.add('use-mode');
				console.log('Added use-mode class (Use Mode)');
			}
			
			console.log('Body classes after:', document.body.className);
		});

		// Add click listener for closing rest menu
		document.addEventListener('click', handleClickOutside);

		return () => {
			unsubscribe();
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function handleExport() {
		exportCharacter($character);
	}

	function handleImport() {
		fileInput?.click();
	}

	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		try {
			const imported = await importCharacter(file);
			character.set(imported);
			alert('Character imported successfully!');
		} catch {
			alert('Failed to import character file');
		}
	}
</script>

<svelte:head>
	<title>D&D Character Sheet</title>
	<link rel="icon" type="image/png" href="/favicon.png">
	<meta name="viewport" content="width=device-width, initial-scale=1">
</svelte:head>

<div class="container">
	<header>
		<div class="header-top">
			<div class="header-title">
				<div class="title-row">
					<h1>D&D Character Sheet</h1>
					{#if $character.name}
						<span class="character-name">{$character.name}</span>
					{/if}
				</div>
				{#if getAllSpellSlots().length > 0}
					<div class="spell-slots-header">
						{#each getAllSpellSlots() as slotInfo}
							<span class="slot-badge" class:depleted={slotInfo.available === 0}>
								Lv{slotInfo.level}: {slotInfo.available}/{slotInfo.total}
							</span>
						{/each}
					</div>
				{/if}
			</div>
			<div class="header-right">
				<div class="header-controls">
					<button on:click={() => showDiceRoller = true} class="btn btn-secondary use-enabled">
						<span class="btn-icon">🎲</span><span class="btn-text"> Roll Dice</span>
					</button>
					<div class="rest-button-container">
						<button 
							on:click={() => showRestMenu = !showRestMenu} 
							class="btn btn-secondary use-enabled"
						>
							<span class="btn-icon">😴</span><span class="btn-text"> Rest</span>
						</button>
					{#if showRestMenu}
						<div class="rest-menu">
							<button on:click={takeShortRest} class="rest-option">☕ Short Rest</button>
							<button on:click={takeLongRest} class="rest-option">🛏️ Long Rest</button>
						</div>
					{/if}
				</div>
					<div class="mode-toggle">
						<button on:click={toggleMode} class="btn btn-mode" class:use-mode={!$isEditMode}>
							<span class="btn-icon">{$isEditMode ? '📝' : '🎲'}</span><span class="btn-text"> {$isEditMode ? 'Edit Mode' : 'Use Mode'}</span>
						</button>
					</div>
				</div>
				<div class="header-search">
					<input 
						type="text" 
						bind:value={$searchFilter} 
						placeholder="🔍 Search..." 
						class="search-input use-enabled"
					/>
				</div>
			</div>
		</div>
		<div class="header-actions">
			<button on:click={() => showWikidotImport = true} class="btn btn-mode">
				📚 Browse Spells & Feats
			</button>
			<button on:click={() => { gistMode = 'save'; showGistModal = true; }} class="btn btn-secondary">
				Save to Gist
			</button>
			<button on:click={() => { gistMode = 'load'; showGistModal = true; }} class="btn btn-secondary">
				Load from Gist
			</button>
			<button on:click={handleExport} class="btn btn-secondary">Export JSON</button>
			<button on:click={handleImport} class="btn btn-secondary">Import JSON</button>
			<input
				type="file"
				bind:this={fileInput}
				on:change={handleFileChange}
				accept=".json"
				style="display: none;"
			/>
		</div>
	</header>

	<main>
		<CharacterInfo />
		<CombatStats on:rollHitDice={handleHitDiceRoll} />
		<AbilityScores on:roll={(e) => openDiceRoller(e.detail)} />
		<Skills on:roll={(e) => openDiceRoller(e.detail)} />
		<Attacks on:roll={(e) => openDiceRoller(e.detail)} />
		<ClassFeatures />
		<Notes />
	</main>
</div>

<DiceRoller 
	bind:this={diceRollerComponent}
	notation={diceNotation}
	damageNotation={diceDamageNotation}
	attackName={diceAttackName}
	visible={showDiceRoller}
	on:close={handleDiceRollerClose} 
/>

{#if showGistModal}
	<GistModal mode={gistMode} on:close={() => showGistModal = false} />
{/if}

{#if showWikidotImport}
	<WikidotImport onClose={() => showWikidotImport = false} />
{/if}

<style>
	:global(body) {
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		background-color: #f5f5dc;
		color: #2c1810;
		line-height: 1.6;
		margin: 0;
		padding: 0;
		padding-top: 120px;
	}

	:global(:root) {
		--primary-color: #8b0000;
		--primary-color-hover: #a50000;
		--secondary-color: #c8a882;
		--bg-color: #f5f5dc;
		--card-bg: #ffffff;
		--text-color: #2c1810;
		--border-color: #8b7355;
		--shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		--hover-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 10px;
	}

	header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		background-color: var(--primary-color);
		color: white;
		padding: 15px 20px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.header-top {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 10px;
		gap: 10px;
	}

	.header-title {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		min-width: 0;
	}

	.header-right {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: flex-end;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.header-search {
		min-width: 200px;
		overflow-x: hidden;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0;
	}

	.character-name {
		font-size: 1rem;
		font-weight: normal;
		opacity: 0.9;
		font-style: italic;
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: nowrap;
	}

	.header-search {
		min-width: 200px;
	}

	.rest-button-container {
		position: relative;
	}

	.rest-menu {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 5px;
		background: white;
		border-radius: 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		z-index: 1001;
		min-width: 150px;
	}

	.rest-option {
		display: block;
		width: 100%;
		padding: 10px 15px;
		border: none;
		background: white;
		text-align: left;
		cursor: pointer;
		color: var(--text-color);
		font-size: 0.9rem;
		transition: background-color 0.2s;
	}

	.rest-option:hover {
		background-color: var(--bg-color);
	}

	.search-input {
		width: 100%;
		min-width: 200px;
		padding: 8px 12px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		background-color: rgba(255, 255, 255, 0.9);
		font-size: 0.9rem;
	}

	.search-input:focus {
		outline: none;
		background-color: white;
		border-color: var(--secondary-color);
	}

	.spell-slots-header {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.slot-badge {
		background-color: rgba(255, 255, 255, 0.95);
		color: #007bff;
		padding: 4px 10px;
		border-radius: 4px;
		font-weight: bold;
		font-size: 0.85rem;
		border: 1px solid rgba(179, 217, 255, 0.8);
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	}

	.slot-badge.depleted {
		background-color: rgba(248, 215, 218, 0.95);
		color: #721c24;
		border: 1px solid rgba(245, 198, 203, 0.8);
	}

	.header-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	:global(body.use-mode) .header-actions {
		display: none;
	}

	:global(.btn) {
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	:global(.btn-primary) {
		background-color: var(--primary-color);
		color: white;
		border: 1px solid var(--primary-color);
	}

	:global(.btn-primary:hover) {
		background-color: var(--primary-color-hover);
	}

	:global(.btn-secondary) {
		background-color: var(--secondary-color);
		color: var(--text-color);
	}

	:global(.btn-secondary:hover) {
		background-color: #b89872;
	}

	.btn-mode {
		background-color: rgba(255, 255, 255, 0.2);
		color: white;
	}

	.btn-mode:hover {
		background-color: rgba(255, 255, 255, 0.3);
	}

	main {
		margin-top: 80px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	:global(body.use-mode) main {
		margin-top: 40px;
	}

	@media (max-width: 768px) {
		h1 {
			display: none;
		}

		.character-name {
			font-size: 1.1rem;
			font-weight: bold;
			opacity: 1;
		}

		.header-top {
			gap: 8px;
		}

		.header-right {
			align-items: stretch;
		}

		.header-controls {
			flex-wrap: nowrap;
			gap: 6px;
		}

		.header-search {
			min-width: 150px;
		}

		.search-input {
			font-size: 0.85rem;
			padding: 6px 10px;
			min-width: 150px;
		}

		.btn-text {
			display: none;
		}

		.btn-icon {
			display: inline;
		}

		.spell-slots-header {
			gap: 4px;
		}

		.slot-badge {
			padding: 3px 8px;
			font-size: 0.75rem;
		}

		.header-actions {
			gap: 5px;
		}

		:global(.btn) {
			padding: 6px 12px;
			font-size: 0.85rem;
		}
	}
</style>
