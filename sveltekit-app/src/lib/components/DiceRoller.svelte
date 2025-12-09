<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { base } from '$app/paths';

	const dispatch = createEventDispatcher();

	export let notation = '';
	export let visible = false;
	export let damageNotation = ''; // Optional damage notation for attacks
	export let attackName = ''; // Optional attack name for context

	let diceBox: any = null;
	let diceContainer: HTMLDivElement | undefined = undefined;
	let isInitialized = false;
	let lastRolledNotation = '';
	let rollResult: any = null;
	
	// Export function to get last roll total
	export function getLastRollTotal(): number | null {
		return rollResult?.resultTotal ?? null;
	}
	
	// Custom dice selector
	let d4Count = 0;
	let d6Count = 0;
	let d8Count = 0;
	let d10Count = 0;
	let d12Count = 0;
	let d20Count = 0;
	let modifier = 0;

	// Follow-up actions for multi-step rolls
	let followUpActions: Array<{label: string, notation: string}> = [];
	let isCritical = false;
	let rollType: 'attack' | 'damage' | 'check' | 'save' | 'other' = 'other';

	// Reactive notation that updates when any dice count changes
	$: currentNotation = (() => {
		const parts: string[] = [];
		if (d4Count > 0) parts.push(`${d4Count}d4`);
		if (d6Count > 0) parts.push(`${d6Count}d6`);
		if (d8Count > 0) parts.push(`${d8Count}d8`);
		if (d10Count > 0) parts.push(`${d10Count}d10`);
		if (d12Count > 0) parts.push(`${d12Count}d12`);
		if (d20Count > 0) parts.push(`${d20Count}d20`);
		
		let notation = parts.join('+') || '1d20';
		if (modifier !== 0) {
			notation += modifier >= 0 ? `+${modifier}` : `${modifier}`;
		}
		return notation;
	})();

	function initializeDiceBox() {
		if ((window as any).DICE && diceContainer) {
			try {
				// Clear existing canvas if any
				if (diceBox && diceContainer) {
					diceContainer.innerHTML = '';
				}
				
				// Get actual container dimensions
				const width = diceContainer.clientWidth || 500;
				const height = diceContainer.clientHeight || 300;
				
				diceBox = new (window as any).DICE.dice_box(diceContainer, {
					w: width,
					h: height
				});
				isInitialized = true;
				console.log(`Dice box initialized with dimensions: ${width}x${height}`);
			} catch (e) {
				console.error('Error initializing dice box:', e);
			}
		}
	}

	onMount(() => {
		// Load dice libraries dynamically in sequence (dice.js depends on THREE and CANNON)
		const loadScript = (src: string) => {
			return new Promise((resolve, reject) => {
				// Check if already loaded
				const existing = document.querySelector(`script[src="${src}"]`);
				if (existing) {
					console.log(`Script already loaded: ${src}`);
					resolve(null);
					return;
				}
				
				const script = document.createElement('script');
				script.src = src;
				script.onload = () => {
					console.log(`Loaded: ${src}`);
					resolve(null);
				};
				script.onerror = () => {
					console.error(`Failed to load: ${src}`);
					reject(new Error(`Failed to load ${src}`));
				};
				document.head.appendChild(script);
			});
		};

		// Wait a bit for the container to be ready
		setTimeout(() => {
			// Load in sequence: THREE and CANNON first, then teal, then dice.js
			// Use base path for GitHub Pages deployment
			loadScript(`${base}/libs/three.min.js`)
				.then(() => loadScript(`${base}/libs/cannon.min.js`))
				.then(() => loadScript(`${base}/libs/teal.js`))
				.then(() => loadScript(`${base}/dice.js`))
				.then(() => {
					console.log('All scripts loaded, initializing dice box...');
					console.log('DICE available:', !!(window as any).DICE);
					console.log('Container available:', !!diceContainer);
					
					// Initialize dice box
					initializeDiceBox();
				})
				.catch((error) => {
					console.error('Failed to load dice libraries:', error);
				});
		}, 100);

		// Reinitialize on window resize
		const handleResize = () => {
			if (isInitialized) {
				console.log('Window resized, reinitializing dice box...');
				initializeDiceBox();
			}
		};

		// Handle Escape key globally when modal is visible
		const handleEscape = (e: KeyboardEvent) => {
			if (visible && e.key === 'Escape') {
				close();
			}
		};

		window.addEventListener('resize', handleResize);
		window.addEventListener('keydown', handleEscape);

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('keydown', handleEscape);
		};
	});

	function rollDice(notation: string, type: 'attack' | 'damage' | 'check' | 'save' | 'other' = 'other') {
		if (!diceBox || !isInitialized) {
			return;
		}

		console.log('Rolling dice:', notation, 'type:', type);
		rollType = type;
		
		// Set the dice notation before throwing
		diceBox.diceToRoll = notation;
		
		// before_roll callback - return null for random results
		const beforeRoll = (notationObj: any) => {
			console.log('Before roll:', notationObj);
			return null; // Let dice roll randomly
		};
		
		// after_roll callback - handle the result
		const afterRoll = (notationObj: any) => {
			console.log('After roll:', notationObj);
			console.log('Result:', notationObj.resultTotal);
			rollResult = notationObj;
			
			// Detect critical hits/fails on d20 rolls
			if (type === 'attack' || type === 'check' || type === 'save') {
				const d20Rolls = notationObj.results?.filter((r: any) => r.sides === 20) || [];
				if (d20Rolls.length > 0) {
					const d20Value = d20Rolls[0].value;
					isCritical = d20Value === 20;
				}
			}
			
			// Set up follow-up actions based on roll type
			followUpActions = [];
			if (type === 'attack') {
				// If damage notation is provided, offer to roll damage
				if (damageNotation) {
					if (isCritical) {
						// Double dice for critical hits (5e rules)
						const critDamage = doubleDiceNotation(damageNotation);
						followUpActions.push({ 
							label: `Roll Critical Damage (${critDamage})`, 
							notation: critDamage 
						});
					} else {
						followUpActions.push({ 
							label: `Roll Damage (${damageNotation})`, 
							notation: damageNotation 
						});
					}
				}
			}
		};
		
		diceBox.start_throw(beforeRoll, afterRoll);
	}
	
	function buildNotation(): string {
		const parts: string[] = [];
		if (d4Count > 0) parts.push(`${d4Count}d4`);
		if (d6Count > 0) parts.push(`${d6Count}d6`);
		if (d8Count > 0) parts.push(`${d8Count}d8`);
		if (d10Count > 0) parts.push(`${d10Count}d10`);
		if (d12Count > 0) parts.push(`${d12Count}d12`);
		if (d20Count > 0) parts.push(`${d20Count}d20`);
		
		let notation = parts.join('+') || '1d20';
		if (modifier !== 0) {
			notation += modifier >= 0 ? `+${modifier}` : `${modifier}`;
		}
		return notation;
	}
	
	function rollCustom() {
		const notation = buildNotation();
		rollDice(notation);
	}
	
	// Helper function to double dice for critical hits
	function doubleDiceNotation(notation: string): string {
		// Parse notation like "2d6+3" or "1d8+2d4+5"
		return notation.replace(/(\d+)d(\d+)/g, (match, count, sides) => {
			const doubledCount = parseInt(count) * 2;
			return `${doubledCount}d${sides}`;
		});
	}
	
	function resetDice() {
		d4Count = 0;
		d6Count = 0;
		d8Count = 0;
		d10Count = 0;
		d12Count = 0;
		d20Count = 0;
		modifier = 0;
		rollResult = null;
		followUpActions = [];
		isCritical = false;
		rollType = 'other';
	}
	
	// Auto-roll when notation is set and modal is visible
	$: if (notation && isInitialized && visible) {
		lastRolledNotation = notation;
		rollResult = null;
		followUpActions = [];
		isCritical = false;
		// Detect roll type from notation pattern (simple heuristic)
		const detectedType = notation.includes('1d20') ? 'attack' : 'other';
		setTimeout(() => rollDice(notation, detectedType), 200);
	}

	function close() {
		dispatch('close');
		// Reset state when closing (clear lastRolledNotation to force re-roll)
		notation = '';
		damageNotation = '';
		attackName = '';
		lastRolledNotation = '';
		rollResult = null;
		resetDice();
	}
</script>

<div class="modal-overlay" class:hidden={!visible} on:click={close} on:keydown={(e) => e.key === 'Escape' && close()} role="button" tabindex="-1">
	<div class="modal-content" on:click|stopPropagation on:keydown role="dialog" tabindex="0">
		<div class="modal-header">
			<h2>Dice Roller</h2>
			<button class="close-btn" on:click={close}>×</button>
		</div>

		{#if !isInitialized}
			<div class="loading">
				<p>Loading 3D dice...</p>
			</div>
		{/if}

		<div class="dice-main-area">
			<div class="dice-container" bind:this={diceContainer}></div>

			{#if !notation}
				<!-- Custom dice selector when not auto-rolling -->
				<div class="custom-dice-selector">
					<h3>Choose Dice to Roll</h3>
					<div class="dice-inputs">
						<div class="dice-input-group">
							<label for="d4">d4</label>
							<input class="use-enabled" type="number" id="d4" bind:value={d4Count} min="0" max="10" />
						</div>
						<div class="dice-input-group">
							<label for="d6">d6</label>
							<input class="use-enabled" type="number" id="d6" bind:value={d6Count} min="0" max="10" />
						</div>
						<div class="dice-input-group">
							<label for="d8">d8</label>
							<input class="use-enabled" type="number" id="d8" bind:value={d8Count} min="0" max="10" />
						</div>
						<div class="dice-input-group">
							<label for="d10">d10</label>
							<input class="use-enabled" type="number" id="d10" bind:value={d10Count} min="0" max="10" />
						</div>
						<div class="dice-input-group">
							<label for="d12">d12</label>
							<input class="use-enabled" type="number" id="d12" bind:value={d12Count} min="0" max="10" />
						</div>
						<div class="dice-input-group">
							<label for="d20">d20</label>
							<input class="use-enabled" type="number" id="d20" bind:value={d20Count} min="0" max="10" />
						</div>
					</div>
					<div class="dice-controls">
						<button on:click={rollCustom} class="btn btn-primary use-enabled" disabled={!isInitialized}>
							Roll {currentNotation}
						</button>
						<button on:click={resetDice} class="btn btn-secondary use-enabled">Reset</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="roll-result" class:has-result={rollResult}>
			{#if rollResult}
				<div class="result-header">
					<h3>{attackName ? `${attackName} - Result` : 'Result'}</h3>
					{#if isCritical}
						<span class="crit-badge">CRITICAL!</span>
					{/if}
				</div>
				<div class="result-total">{rollResult.resultTotal}</div>
				<div class="result-details">
					{#if rollResult.resultString}
						<p>{rollResult.resultString}</p>
					{/if}
					{#if rollResult.constant}
						<p class="modifier-text">Modifier: {rollResult.constant >= 0 ? '+' : ''}{rollResult.constant}</p>
					{/if}
				</div>
				{#if followUpActions.length > 0}
					<div class="follow-up-actions">
						{#each followUpActions as action}
							<button class="btn btn-follow-up" on:click={() => rollDice(action.notation, 'damage')}>
								{action.label}
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		visibility: visible;
		opacity: 1;
		transition: opacity 0.2s, visibility 0.2s;
	}
	
	.modal-overlay.hidden {
		visibility: hidden;
		opacity: 0;
		pointer-events: none;
	}

	.modal-content {
		background-color: white;
		border-radius: 8px;
		padding: 20px;
		width: 900px;
		max-width: 95vw;
		height: 700px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
	}

	.modal-header h2 {
		margin: 0;
		color: var(--primary-color);
	}

	.close-btn {
		width: 32px;
		height: 32px;
		background-color: transparent;
		border: none;
		font-size: 2rem;
		cursor: pointer;
		color: #666;
		line-height: 1;
	}

	.close-btn:hover {
		color: #000;
	}

	.dice-main-area {
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex: 1;
		min-height: 0;
	}

	.dice-container {
		width: 100%;
		height: 400px;
		background-color: #2a1810;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.dice-controls {
		display: flex;
		gap: 10px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		font-size: 1.2rem;
		color: #666;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.custom-dice-selector {
		margin: 0;
		padding: 12px;
		background: #f9f9f9;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.custom-dice-selector h3 {
		margin: 0 0 8px 0;
		color: #8b0000;
		text-align: center;
		font-size: 1rem;
	}

	.dice-inputs {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-bottom: 10px;
	}

	.dice-input-group {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dice-input-group label {
		font-weight: bold;
		margin-bottom: 3px;
		color: #333;
		font-size: 0.9rem;
	}

	.dice-input-group input {
		width: 100%;
		max-width: 70px;
		padding: 5px;
		border: 2px solid #ccc;
		border-radius: 4px;
		text-align: center;
		font-size: 0.95rem;
	}

	.dice-input-group input:focus {
		outline: none;
		border-color: #8b0000;
	}

	.roll-result {
		margin-top: 8px;
		padding: 12px;
		border-radius: 8px;
		text-align: center;
		flex-shrink: 0;
		min-height: 120px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		background: transparent;
		border: 3px solid transparent;
		transition: all 0.2s ease;
	}

	.roll-result.has-result {
		background: #e8f5e9;
		border-color: #4caf50;
	}

	.roll-result h3 {
		margin: 0 0 6px 0;
		color: #2e7d32;
		font-size: 1rem;
	}

	.result-total {
		font-size: 2.2rem;
		font-weight: bold;
		color: #1b5e20;
		margin: 6px 0;
		line-height: 1;
	}

	.result-details {
		margin-top: 8px;
		color: #333;
		font-size: 0.95rem;
	}

	.result-details p {
		margin: 3px 0;
	}

	.modifier-text {
		font-style: italic;
		color: #666;
		font-size: 0.9rem;
	}

	.result-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		margin-bottom: 6px;
	}

	.crit-badge {
		background: linear-gradient(135deg, #ffd700, #ffed4e);
		color: #8b0000;
		padding: 4px 12px;
		border-radius: 12px;
		font-weight: bold;
		font-size: 0.85rem;
		box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
		animation: pulse 0.5s ease-in-out;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	.follow-up-actions {
		margin-top: 12px;
		display: flex;
		gap: 8px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-follow-up {
		background: linear-gradient(135deg, #2196f3, #1976d2);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
	}

	.btn-follow-up:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(33, 150, 243, 0.4);
	}

	/* Side-by-side layout for wider screens */
	@media (min-width: 769px) {
		.dice-main-area {
			flex-direction: row;
		}

		.dice-container {
			flex: 1;
			min-width: 0;
			margin-bottom: 0;
		}

		.custom-dice-selector {
			width: 280px;
			flex-shrink: 0;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
		}

		.dice-inputs {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.modal-content {
			width: 95vw;
			height: 90vh;
			padding: 15px;
		}

		.dice-container {
			width: 100%;
			height: 300px;
		}

		.dice-inputs {
			grid-template-columns: repeat(3, 1fr);
			gap: 6px;
		}

		.result-total {
			font-size: 1.8rem;
		}

		.custom-dice-selector {
			padding: 8px;
		}
	}
</style>
