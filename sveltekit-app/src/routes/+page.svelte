<script lang="ts">
	import { onMount } from 'svelte';
	import { character, isEditMode, exportCharacter, importCharacter } from '$lib/stores';
	import CharacterInfo from '$lib/components/CharacterInfo.svelte';
	import AbilityScores from '$lib/components/AbilityScores.svelte';
	import CombatStats from '$lib/components/CombatStats.svelte';
	import Skills from '$lib/components/Skills.svelte';
	import Attacks from '$lib/components/Attacks.svelte';
	import ClassFeatures from '$lib/components/ClassFeatures.svelte';
	import Notes from '$lib/components/Notes.svelte';
	import DiceRoller from '$lib/components/DiceRoller.svelte';
	import GistModal from '$lib/components/GistModal.svelte';

	let showDiceRoller = false;
	let showGistModal = false;
	let gistMode: 'save' | 'load' = 'save';
	let fileInput: HTMLInputElement | undefined = undefined;
	let diceNotation = '';
	let diceDamageNotation = '';
	let diceAttackName = '';
	let diceRollerComponent: any;

	function openDiceRoller(detail: string | { notation: string, damageNotation?: string, attackName?: string }) {
		// Reset notation first to ensure Svelte sees a change even if same value
		diceNotation = '';
		
		if (typeof detail === 'string') {
			// Use nextTick to ensure reset is processed first
			setTimeout(() => {
				diceNotation = detail;
				diceDamageNotation = '';
				diceAttackName = '';
			}, 0);
		} else {
			setTimeout(() => {
				diceNotation = detail.notation;
				diceDamageNotation = detail.damageNotation || '';
				diceAttackName = detail.attackName || '';
			}, 0);
		}
		showDiceRoller = true;
	}

	function toggleMode() {
		console.log('toggleMode called, current isEditMode:', $isEditMode);
		isEditMode.update(v => {
			console.log('Updating isEditMode from', v, 'to', !v);
			return !v;
		});
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

		return unsubscribe;
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
</svelte:head>

<div class="container">
	<header>
		<div class="header-top">
			<h1>D&D Character Sheet</h1>
			<div class="mode-toggle">
				<button on:click={toggleMode} class="btn btn-mode" class:use-mode={!$isEditMode}>
					{$isEditMode ? '📝 Edit Mode' : '🎲 Use Mode'}
				</button>
			</div>
		</div>
		<div class="header-actions">
			<button on:click={() => showDiceRoller = true} class="btn btn-secondary">
				🎲 Roll Dice
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
		<CombatStats />
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
	on:close={() => showDiceRoller = false} 
/>

{#if showGistModal}
	<GistModal mode={gistMode} on:close={() => showGistModal = false} />
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
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
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
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	@media (max-width: 768px) {
		h1 {
			font-size: 1.2rem;
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
