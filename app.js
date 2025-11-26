// Character data structure
let character = {
    name: '',
    class: '',
    level: 1,
    race: '',
    background: '',
    alignment: '',
    armorClass: 10,
    initiative: 0,
    speed: '30 ft',
    currentHP: 0,
    maxHP: 0,
    tempHP: 0,
    hitDice: { current: 3, max: 3 },
    abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
    },
    proficiencyBonus: 2,
    saveProficiencies: {
        strength: false,
        dexterity: false,
        constitution: false,
        intelligence: false,
        wisdom: false,
        charisma: false
    },
    skillProficiencies: {
        acrobatics: false,
        animalHandling: false,
        arcana: false,
        athletics: false,
        deception: false,
        history: false,
        insight: false,
        intimidation: false,
        investigation: false,
        medicine: false,
        nature: false,
        perception: false,
        performance: false,
        persuasion: false,
        religion: false,
        sleightOfHand: false,
        stealth: false,
        survival: false
    },
    attacks: [],
    features: '',
    equipment: '',
    notes: '',
    classFeatures: {
        features: {},  // Dynamic features based on class
        spellSlots: [],
        preparedSpells: ''
    }
};

// Skill to ability mapping
const skillAbilities = {
    acrobatics: 'dexterity',
    animalHandling: 'wisdom',
    arcana: 'intelligence',
    athletics: 'strength',
    deception: 'charisma',
    history: 'intelligence',
    insight: 'wisdom',
    intimidation: 'charisma',
    investigation: 'intelligence',
    medicine: 'wisdom',
    nature: 'intelligence',
    perception: 'wisdom',
    performance: 'charisma',
    persuasion: 'charisma',
    religion: 'intelligence',
    sleightOfHand: 'dexterity',
    stealth: 'dexterity',
    survival: 'wisdom'
};

// Mode state
let isEditMode = true;

// Dice box instance
let diceBox = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    setupEventListeners();
    updateAllModifiers();
    setupCollapsibleSections();
    
    // Render class features if class is set
    if (character.class && character.level) {
        renderClassFeatures(character.class, character.level);
    }
    
    // Don't initialize dice box here - wait until modal is shown
    
    // Load saved mode or default to use mode
    const savedMode = localStorage.getItem('dndMode');
    if (savedMode === 'edit' && !isEditMode) {
        toggleMode();
    } else if (savedMode !== 'edit' && isEditMode) {
        toggleMode();
    } else if (!savedMode) {
        // Start in use mode if no saved preference
        toggleMode();
    }
});

// Initialize the 3D dice box - must be called when container is visible
function initializeDiceBox() {
    const container = document.getElementById('diceContainer');
    if (!container || typeof DICE === 'undefined') {
        console.log('Cannot initialize dice box - container or DICE library not found');
        return false;
    }
    
    // Make sure container has dimensions
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        console.log('Cannot initialize dice box - container has no dimensions');
        return false;
    }
    
    try {
        diceBox = new DICE.dice_box(container);
        console.log('Dice box initialized successfully');
        return true;
    } catch (error) {
        console.log('Failed to initialize dice box:', error);
        return false;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveToLocalStorage);
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportCharacter);
    
    // Import button
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', importCharacter);
    
    // Gist buttons
    document.getElementById('saveToGistBtn').addEventListener('click', openGistModal.bind(null, 'save'));
    document.getElementById('loadFromGistBtn').addEventListener('click', openGistModal.bind(null, 'load'));
    document.getElementById('saveGistConfirm').addEventListener('click', saveToGist);
    document.getElementById('loadGistConfirm').addEventListener('click', loadFromGist);
    document.getElementById('cancelGist').addEventListener('click', closeGistModal);
    
    // Dice roller button
    document.getElementById('diceRollerBtn').addEventListener('click', openDiceRollerModal);
    
    // Character info inputs
    document.getElementById('characterName').addEventListener('change', (e) => {
        character.name = e.target.value;
    });
    
    document.getElementById('characterClass').addEventListener('change', (e) => {
        character.class = e.target.value;
        onClassOrLevelChange();
    });
    
    document.getElementById('characterLevel').addEventListener('change', (e) => {
        character.level = parseInt(e.target.value) || 1;
        updateProficiencyBonus();
        onClassOrLevelChange();
    });
    
    document.getElementById('characterRace').addEventListener('change', (e) => {
        character.race = e.target.value;
    });
    
    document.getElementById('characterBackground').addEventListener('change', (e) => {
        character.background = e.target.value;
    });
    
    document.getElementById('characterAlignment').addEventListener('change', (e) => {
        character.alignment = e.target.value;
    });
    
    // Combat stats
    document.getElementById('armorClass').addEventListener('change', (e) => {
        character.armorClass = parseInt(e.target.value) || 10;
    });
    
    document.getElementById('initiative').addEventListener('change', (e) => {
        character.initiative = parseInt(e.target.value) || 0;
    });
    
    document.getElementById('speed').addEventListener('change', (e) => {
        character.speed = e.target.value;
    });
    
    document.getElementById('currentHP').addEventListener('change', (e) => {
        character.currentHP = parseInt(e.target.value) || 0;
    });
    
    document.getElementById('maxHP').addEventListener('change', (e) => {
        character.maxHP = parseInt(e.target.value) || 0;
    });
    
    document.getElementById('tempHP').addEventListener('change', (e) => {
        character.tempHP = parseInt(e.target.value) || 0;
    });
    
    // Hit dice
    document.getElementById('hitDiceCurrent').addEventListener('change', (e) => {
        character.hitDice.current = parseInt(e.target.value) || 0;
    });
    
    document.getElementById('hitDiceMax').addEventListener('change', (e) => {
        character.hitDice.max = parseInt(e.target.value) || 1;
    });
    
    document.getElementById('hitDicePlus').addEventListener('click', adjustHitDiceCount.bind(null, 'add'));
    document.getElementById('hitDiceMinus').addEventListener('click', adjustHitDiceCount.bind(null, 'subtract'));
    document.getElementById('rollHitDice').addEventListener('click', rollHitDice);
    
    // HP adjustment buttons
    document.getElementById('hpPlus').addEventListener('click', adjustHP.bind(null, 'add'));
    document.getElementById('hpMinus').addEventListener('click', adjustHP.bind(null, 'subtract'));
    document.getElementById('hpCommit').addEventListener('click', commitHPAdjustment);
    
    // Ability scores
    ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(ability => {
        document.getElementById(ability).addEventListener('change', (e) => {
            character.abilities[ability] = parseInt(e.target.value) || 10;
            updateAllModifiers();
        });
    });
    
    // Proficiency bonus
    document.getElementById('proficiencyBonus').addEventListener('change', (e) => {
        character.proficiencyBonus = parseInt(e.target.value) || 2;
        updateAllModifiers();
    });
    
    // Save proficiencies
    ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(ability => {
        document.getElementById(`${ability.substring(0, 3)}SaveProf`).addEventListener('change', (e) => {
            character.saveProficiencies[ability] = e.target.checked;
            updateAllModifiers();
        });
    });
    
    // Skill proficiencies
    Object.keys(skillAbilities).forEach(skill => {
        document.getElementById(`${skill}Prof`).addEventListener('change', (e) => {
            character.skillProficiencies[skill] = e.target.checked;
            updateAllModifiers();
        });
    });
    
    // Notes
    document.getElementById('features').addEventListener('change', (e) => {
        character.features = e.target.value;
    });
    
    document.getElementById('equipment').addEventListener('change', (e) => {
        character.equipment = e.target.value;
    });
    
    document.getElementById('notes').addEventListener('change', (e) => {
        character.notes = e.target.value;
    });
    
    // Roll buttons for ability checks
    document.querySelectorAll('.ability-card .roll-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ability = e.target.getAttribute('data-check');
            rollAbilityCheck(ability);
        });
    });
    
    // Roll buttons for saves
    document.querySelectorAll('[data-save]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ability = e.target.getAttribute('data-save');
            rollSavingThrow(ability);
        });
    });
    
    // Roll buttons for skills
    document.querySelectorAll('[data-skill]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const skill = e.target.getAttribute('data-skill');
            rollSkillCheck(skill);
        });
    });
    
    // Mode toggle
    document.getElementById('modeToggle').addEventListener('click', toggleMode);
    
    // Header collapse
    document.getElementById('headerToggle').addEventListener('click', toggleHeader);
    
    // Mode toggle
    document.getElementById('modeToggle').addEventListener('click', toggleMode);
    
    // Header collapse
    document.getElementById('headerToggle').addEventListener('click', toggleHeader);
    
    // Add attack button
    document.getElementById('addAttackBtn').addEventListener('click', addAttack);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    document.querySelector('.close-gist').addEventListener('click', closeGistModal);
    document.querySelector('.close-dice').addEventListener('click', closeDiceRollerModal);
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('rollModal')) {
            closeModal();
        }
        if (e.target === document.getElementById('gistModal')) {
            closeGistModal();
        }
        if (e.target === document.getElementById('diceRollerModal')) {
            closeDiceRollerModal();
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const rollModal = document.getElementById('rollModal');
            const gistModal = document.getElementById('gistModal');
            const diceRollerModal = document.getElementById('diceRollerModal');
            
            if (rollModal.style.display === 'block') {
                closeModal();
            }
            if (gistModal.style.display === 'block') {
                closeGistModal();
            }
            if (diceRollerModal.style.display === 'block') {
                closeDiceRollerModal();
            }
        }
    });
    
    // Dice roller modal controls
    setupDiceRollerControls();
}

// Calculate ability modifier
function calculateModifier(score) {
    return Math.floor((score - 10) / 2);
}

// Format modifier with sign
function formatModifier(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

// Update all modifiers and bonuses
function updateAllModifiers() {
    // Update ability modifiers
    ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(ability => {
        const score = character.abilities[ability];
        const modifier = calculateModifier(score);
        const shortName = ability.substring(0, 3);
        document.getElementById(`${shortName}Mod`).textContent = formatModifier(modifier);
        
        // Update saving throws
        const saveMod = modifier + (character.saveProficiencies[ability] ? character.proficiencyBonus : 0);
        document.getElementById(`${shortName}Save`).textContent = formatModifier(saveMod);
    });
    
    // Update skills
    Object.keys(skillAbilities).forEach(skill => {
        const ability = skillAbilities[skill];
        const abilityMod = calculateModifier(character.abilities[ability]);
        const skillMod = abilityMod + (character.skillProficiencies[skill] ? character.proficiencyBonus : 0);
        document.getElementById(skill).textContent = formatModifier(skillMod);
    });
    
    // Update spell save DC
    updateSpellSaveDC();
}

// Update proficiency bonus based on level
function updateProficiencyBonus() {
    const level = character.level;
    const profBonus = Math.ceil(level / 4) + 1;
    character.proficiencyBonus = profBonus;
    document.getElementById('proficiencyBonus').value = profBonus;
    updateAllModifiers();
}

// Handler for class or level changes
function onClassOrLevelChange() {
    if (!character.class || !character.level) return;
    
    // Update hit dice based on class
    const config = getClassConfig(character.class);
    if (config) {
        character.hitDice.max = character.level;
        const hitDiceMaxInput = document.getElementById('hitDiceMax');
        if (hitDiceMaxInput) {
            hitDiceMaxInput.value = character.level;
        }
    }
    
    // Render class features dynamically
    renderClassFeatures(character.class, character.level);
    
    // Update spell save DC and other calculations
    updateAllModifiers();
}

// Dice rolling functions
function rollDice(sides, count = 1) {
    let results = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        results.push(roll);
        total += roll;
    }
    return { results, total };
}

function rollAbilityCheck(ability) {
    const modifier = calculateModifier(character.abilities[ability]);
    const abilityName = ability.charAt(0).toUpperCase() + ability.slice(1);
    
    showRollResult(
        `${abilityName} Check`,
        modifier,
        null,
        '1d20',
        modifier
    );
}

function rollSavingThrow(ability) {
    const modifier = calculateModifier(character.abilities[ability]);
    const profBonus = character.saveProficiencies[ability] ? character.proficiencyBonus : 0;
    const totalMod = modifier + profBonus;
    const abilityName = ability.charAt(0).toUpperCase() + ability.slice(1);
    
    showRollResult(
        `${abilityName} Save`,
        totalMod,
        null,
        '1d20',
        totalMod
    );
}

function rollSkillCheck(skill) {
    const ability = skillAbilities[skill];
    const abilityMod = calculateModifier(character.abilities[ability]);
    const profBonus = character.skillProficiencies[skill] ? character.proficiencyBonus : 0;
    const totalMod = abilityMod + profBonus;
    
    const skillName = skill.replace(/([A-Z])/g, ' $1').trim();
    const formattedSkillName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
    
    showRollResult(
        `${formattedSkillName} Check`,
        totalMod,
        null,
        '1d20',
        totalMod
    );
}

function rollAttack(attackIndex) {
    const attack = character.attacks[attackIndex];
    const attackBonus = parseInt(attack.attackBonus || 0);
    
    showRollResult(
        `${attack.name} Attack`,
        attackBonus,
        null,
        '1d20',
        attackBonus
    );
}

function rollDamage(attackIndex) {
    const attack = character.attacks[attackIndex];
    const damageStr = attack.damage || '1d6';
    
    // Parse damage string (e.g., "2d6+3")
    const match = damageStr.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) {
        showRollResult(`${attack.name} Damage`, 0, 'Invalid damage format');
        return;
    }
    
    // The dice library will handle the rolling
    showRollResult(
        `${attack.name} Damage`,
        0, // Not used when using dice animation
        null,
        damageStr, // Pass the damage notation directly
        0, // No additional modifier (already in notation)
        'damage' // Type of roll
    );
}

function showRollResult(title, modifier, details, diceNotation = null, bonusModifier = 0, rollType = 'd20') {
    const modal = document.getElementById('rollModal');
    const titleDiv = document.getElementById('rollTitle');
    const resultDiv = document.getElementById('rollResult');
    
    // Show the modal first
    modal.style.display = 'block';
    
    // Set the title
    titleDiv.textContent = title;
    
    // Try to use 3D dice animation if notation provided
    if (diceNotation) {
        // Initialize dice box if not already done - must be done after modal is visible
        if (!diceBox) {
            // Show rolling message
            resultDiv.innerHTML = `<p>Rolling...</p>`;
            
            // Small delay to ensure modal is fully rendered
            setTimeout(() => {
                const initialized = initializeDiceBox();
                if (initialized) {
                    rollDiceAnimation(title, modifier, diceNotation, resultDiv, rollType);
                } else {
                    // Fallback to instant result if initialization fails
                    const fallbackResult = Math.floor(Math.random() * 20) + 1 + modifier;
                    resultDiv.innerHTML = `
                        <div class="dice-roll">${fallbackResult}</div>
                        <div class="roll-details">d20: ${fallbackResult - modifier} ${formatModifier(modifier)} = ${fallbackResult}</div>
                    `;
                }
            }, 150);
        } else {
            // Dice box already initialized, use it
            rollDiceAnimation(title, modifier, diceNotation, resultDiv, rollType);
        }
    } else {
        // No dice animation, just show the result
        resultDiv.innerHTML = `
            <div class="dice-roll">${modifier}</div>
            <div class="roll-details">${details || ''}</div>
        `;
    }
}

function rollDiceAnimation(title, modifier, diceNotation, resultDiv, rollType = 'd20') {
    if (!diceBox) {
        // Fallback if dice box not available
        const fallbackResult = Math.floor(Math.random() * 20) + 1 + modifier;
        resultDiv.innerHTML = `
            <div class="dice-roll">${fallbackResult}</div>
            <div class="roll-details">d20: ${fallbackResult - modifier} ${formatModifier(modifier)} = ${fallbackResult}</div>
        `;
        return;
    }
    
    try {
        // Show rolling message
        resultDiv.innerHTML = `<p>Rolling...</p>`;
        
        diceBox.setDice(diceNotation);
        
        // Before roll callback
        function beforeRoll(notation) {
            return null; // Random result
        }
        
        // After roll callback - display the result after animation completes
        function afterRoll(notation) {
            // Add a small delay to let the dice settle visually
            setTimeout(() => {
                // Use the actual dice result from the notation
                const diceTotal = notation.resultTotal - (notation.constant || 0);
                const constant = notation.constant || 0;
                
                let finalTotal, details;
                if (rollType === 'damage') {
                    // For damage rolls, just show the dice result
                    finalTotal = notation.resultTotal;
                    details = `${notation.resultString}`;
                } else {
                    // For d20 rolls, add the modifier
                    finalTotal = diceTotal + modifier;
                    details = `d20: ${diceTotal} ${formatModifier(modifier)} = ${finalTotal}`;
                    
                    // Add critical hit/miss for d20 rolls
                    if (diceTotal === 20) {
                        details += ' (CRITICAL HIT!)';
                    } else if (diceTotal === 1) {
                        details += ' (Critical Miss)';
                    }
                }
                
                resultDiv.innerHTML = `
                    <div class="dice-roll">${finalTotal}</div>
                    <div class="roll-details">${details}</div>
                `;
            }, 500);
        }
        
        diceBox.start_throw(beforeRoll, afterRoll);
    } catch (error) {
        console.log('Failed to roll dice:', error);
        // Fall back to showing result without animation
        const fallbackResult = Math.floor(Math.random() * 20) + 1 + modifier;
        resultDiv.innerHTML = `
            <div class="dice-roll">${fallbackResult}</div>
            <div class="roll-details">d20: ${fallbackResult - modifier} ${formatModifier(modifier)} = ${fallbackResult}</div>
        `;
    }
}

function closeModal() {
    document.getElementById('rollModal').style.display = 'none';
}

// HP adjustment function - increment/decrement the adjust input
function adjustHP(operation) {
    const adjustInput = document.getElementById('hpAdjust');
    const currentValue = parseInt(adjustInput.value) || 0;
    
    if (operation === 'add') {
        adjustInput.value = Math.max(0, currentValue + 1);
    } else if (operation === 'subtract') {
        adjustInput.value = Math.max(0, currentValue - 1);
    }
}

// Commit HP adjustment
function commitHPAdjustment() {
    const adjustValue = parseInt(document.getElementById('hpAdjust').value) || 0;
    const operation = document.querySelector('input[name="hpOperation"]:checked')?.value;
    
    if (adjustValue === 0) {
        alert('Please enter an amount to adjust HP');
        return;
    }
    
    if (!operation) {
        alert('Please select Heal or Damage');
        return;
    }
    
    if (operation === 'heal') {
        // Add HP (healing)
        character.currentHP = Math.min(character.currentHP + adjustValue, character.maxHP);
    } else if (operation === 'damage') {
        // Subtract HP (damage)
        // First subtract from temp HP
        if (character.tempHP > 0) {
            if (adjustValue <= character.tempHP) {
                character.tempHP -= adjustValue;
            } else {
                const overflow = adjustValue - character.tempHP;
                character.tempHP = 0;
                character.currentHP = Math.max(0, character.currentHP - overflow);
            }
        } else {
            character.currentHP = Math.max(0, character.currentHP - adjustValue);
        }
    }
    
    // Update display
    document.getElementById('currentHP').value = character.currentHP;
    document.getElementById('tempHP').value = character.tempHP;
    
    // Clear adjustment input
    document.getElementById('hpAdjust').value = '';
    
    // Auto-save
    saveToLocalStorage(true);
}

// Gist Integration
function openGistModal(mode) {
    const modal = document.getElementById('gistModal');
    const statusDiv = document.getElementById('gistStatus');
    const gistList = document.getElementById('gistList');
    
    // Clear previous status and list
    statusDiv.style.display = 'none';
    statusDiv.className = '';
    gistList.innerHTML = '';
    
    // Load saved token if exists
    const savedToken = localStorage.getItem('githubToken');
    if (savedToken) {
        document.getElementById('githubToken').value = savedToken;
        document.getElementById('rememberToken').checked = true;
    }
    
    // Show appropriate buttons
    document.getElementById('saveGistConfirm').style.display = mode === 'save' ? 'inline-block' : 'none';
    document.getElementById('loadGistConfirm').style.display = mode === 'load' ? 'inline-block' : 'none';
    
    // If loading, fetch gists
    if (mode === 'load' && savedToken) {
        fetchGists(savedToken);
    }
    
    modal.style.display = 'block';
}

function closeGistModal() {
    document.getElementById('gistModal').style.display = 'none';
}

function showGistStatus(message, type) {
    const statusDiv = document.getElementById('gistStatus');
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
}

async function saveToGist() {
    const token = document.getElementById('githubToken').value.trim();
    const rememberToken = document.getElementById('rememberToken').checked;
    
    if (!token) {
        showGistStatus('Please enter a GitHub token', 'error');
        return;
    }
    
    if (rememberToken) {
        localStorage.setItem('githubToken', token);
    } else {
        localStorage.removeItem('githubToken');
    }
    
    showGistStatus('Saving to GitHub Gist...', 'info');
    
    const characterData = JSON.stringify(character, null, 2);
    const fileName = `${character.name || 'character'}-dnd-sheet.json`;
    
    const gistData = {
        description: `D&D Character Sheet: ${character.name || 'Unnamed'} (Level ${character.level} ${character.class})`,
        public: false,
        files: {
            [fileName]: {
                content: characterData
            }
        }
    };
    
    try {
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify(gistData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `GitHub API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Save gist ID for future updates
        character.gistId = result.id;
        localStorage.setItem('lastGistId', result.id);
        
        showGistStatus(`Successfully saved to Gist!`, 'success');
        
        setTimeout(() => {
            closeGistModal();
        }, 2000);
        
    } catch (error) {
        console.error('Gist save error:', error);
        showGistStatus(`Error: ${error.message}`, 'error');
    }
}

async function loadFromGist() {
    const token = document.getElementById('githubToken').value.trim();
    const rememberToken = document.getElementById('rememberToken').checked;
    
    if (!token) {
        showGistStatus('Please enter a GitHub token', 'error');
        return;
    }
    
    if (rememberToken) {
        localStorage.setItem('githubToken', token);
    } else {
        localStorage.removeItem('githubToken');
    }
    
    await fetchGists(token);
}

async function fetchGists(token) {
    showGistStatus('Loading your gists...', 'info');
    
    try {
        const response = await fetch('https://api.github.com/gists', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `GitHub API error: ${response.status}`);
        }
        
        const gists = await response.json();
        
        // Filter for D&D character sheets
        const characterGists = gists.filter(gist => 
            gist.description && gist.description.includes('D&D Character Sheet')
        );
        
        if (characterGists.length === 0) {
            showGistStatus('No character sheets found in your gists', 'info');
            return;
        }
        
        showGistStatus(`Found ${characterGists.length} character sheet(s)`, 'success');
        displayGistList(characterGists);
        
    } catch (error) {
        console.error('Gist fetch error:', error);
        showGistStatus(`Error: ${error.message}`, 'error');
    }
}

function displayGistList(gists) {
    const gistList = document.getElementById('gistList');
    gistList.innerHTML = '<h4>Select a character to load:</h4>';
    
    gists.forEach(gist => {
        const gistItem = document.createElement('div');
        gistItem.className = 'gist-item';
        
        const date = new Date(gist.updated_at).toLocaleString();
        
        gistItem.innerHTML = `
            <div class="gist-item-title">${gist.description}</div>
            <div class="gist-item-date">Last updated: ${date}</div>
        `;
        
        gistItem.addEventListener('click', () => {
            loadGistContent(gist.id);
        });
        
        gistList.appendChild(gistItem);
    });
}

async function loadGistContent(gistId) {
    const token = document.getElementById('githubToken').value.trim();
    
    showGistStatus('Loading character...', 'info');
    
    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `GitHub API error: ${response.status}`);
        }
        
        const gist = await response.json();
        
        // Find the character sheet file
        const files = Object.values(gist.files);
        const characterFile = files.find(file => file.filename.endsWith('.json'));
        
        if (!characterFile) {
            throw new Error('No character sheet file found in gist');
        }
        
        character = JSON.parse(characterFile.content);
        character.gistId = gistId;
        
        populateForm();
        saveToLocalStorage();
        
        showGistStatus('Character loaded successfully!', 'success');
        
        setTimeout(() => {
            closeGistModal();
        }, 1500);
        
    } catch (error) {
        console.error('Gist load error:', error);
        showGistStatus(`Error: ${error.message}`, 'error');
    }
}

// Attack management
function addAttack() {
    const attack = {
        name: 'New Attack',
        attackBonus: 0,
        damage: '1d6',
        damageType: 'slashing'
    };
    
    character.attacks.push(attack);
    renderAttacks();
}

function removeAttack(index) {
    character.attacks.splice(index, 1);
    renderAttacks();
}

function renderAttacks() {
    const container = document.getElementById('attacksList');
    container.innerHTML = '';
    
    character.attacks.forEach((attack, index) => {
        const attackDiv = document.createElement('div');
        attackDiv.className = 'attack-item';
        
        // Check if this is a melee weapon for divine smite
        const isMelee = attack.name.toLowerCase().includes('longsword') || 
                        attack.name.toLowerCase().includes('greatsword') ||
                        attack.name.toLowerCase().includes('sword') ||
                        attack.name.toLowerCase().includes('mace') ||
                        attack.damageType.toLowerCase().includes('melee');
        
        let smiteSection = '';
        if (isMelee) {
            smiteSection = `
                <div class="divine-smite-section">
                    <h4>Divine Smite</h4>
                    <div class="smite-calculator">
                        <label>Spell Slot Level:</label>
                        <select id="smiteLevel_${index}" class="smite-select">
                            <option value="1">1st Level (2d8)</option>
                            <option value="2">2nd Level (3d8)</option>
                            <option value="3">3rd Level (4d8)</option>
                            <option value="4">4th Level (5d8)</option>
                        </select>
                        <label>
                            <input type="checkbox" id="smiteUndead_${index}">
                            Target is undead/fiend (+1d8)
                        </label>
                        <button class="btn btn-primary" onclick="rollDivineSmite(${index})">Roll Smite Damage</button>
                    </div>
                </div>
            `;
        }
        
        attackDiv.innerHTML = `
            <div class="attack-header">
                <input type="text" value="${attack.name}" placeholder="Attack name" 
                    onchange="character.attacks[${index}].name = this.value">
                <button class="btn btn-danger" onclick="removeAttack(${index})">Remove</button>
            </div>
            <div class="attack-controls">
                <div class="form-group">
                    <label>Attack Bonus</label>
                    <input type="number" value="${attack.attackBonus}" 
                        onchange="character.attacks[${index}].attackBonus = this.value">
                </div>
                <div class="form-group">
                    <label>Damage</label>
                    <input type="text" value="${attack.damage}" placeholder="e.g., 2d6+3"
                        onchange="character.attacks[${index}].damage = this.value">
                </div>
                <div class="form-group">
                    <label>Damage Type</label>
                    <input type="text" value="${attack.damageType}" 
                        onchange="character.attacks[${index}].damageType = this.value">
                </div>
            </div>
            <div class="attack-actions">
                <button class="btn btn-primary" onclick="rollAttack(${index})">Roll Attack</button>
                <button class="btn btn-primary" onclick="rollDamage(${index})">Roll Damage</button>
            </div>
            ${smiteSection}
        `;
        container.appendChild(attackDiv);
    });
}

// Collapsed state storage functions
function saveCollapsedState(sectionId, isCollapsed) {
    try {
        const collapsedStates = JSON.parse(localStorage.getItem('dndCollapsedStates') || '{}');
        collapsedStates[sectionId] = isCollapsed;
        localStorage.setItem('dndCollapsedStates', JSON.stringify(collapsedStates));
    } catch (error) {
        console.error('Error saving collapsed state:', error);
    }
}

function loadCollapsedState(sectionId) {
    try {
        const collapsedStates = JSON.parse(localStorage.getItem('dndCollapsedStates') || '{}');
        return collapsedStates[sectionId] || false;
    } catch (error) {
        console.error('Error loading collapsed state:', error);
        return false;
    }
}

// Local storage functions
function saveToLocalStorage(silent = false) {
    try {
        localStorage.setItem('dndCharacter', JSON.stringify(character));
        if (!silent) {
            alert('Character saved successfully!');
        }
    } catch (error) {
        if (!silent) {
            alert('Error saving character: ' + error.message);
        }
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('dndCharacter');
        if (saved) {
            const loadedCharacter = JSON.parse(saved);
            // Merge with defaults to ensure classFeatures exists
            character = {
                ...character,
                ...loadedCharacter,
                classFeatures: {
                    ...character.classFeatures,
                    ...(loadedCharacter.classFeatures || {})
                }
            };
            populateForm();
        }
    } catch (error) {
        console.error('Error loading character:', error);
    }
}

function populateForm() {
    // Basic info
    document.getElementById('characterName').value = character.name || '';
    document.getElementById('characterClass').value = character.class || '';
    document.getElementById('characterLevel').value = character.level || 1;
    document.getElementById('characterRace').value = character.race || '';
    document.getElementById('characterBackground').value = character.background || '';
    document.getElementById('characterAlignment').value = character.alignment || '';
    
    // Combat stats
    document.getElementById('armorClass').value = character.armorClass || 10;
    document.getElementById('initiative').value = character.initiative || 0;
    document.getElementById('speed').value = character.speed || '30 ft';
    document.getElementById('currentHP').value = character.currentHP || 0;
    document.getElementById('maxHP').value = character.maxHP || 0;
    document.getElementById('tempHP').value = character.tempHP || 0;
    document.getElementById('hitDiceCurrent').value = character.hitDice?.current || 0;
    document.getElementById('hitDiceMax').value = character.hitDice?.max || 0;
    
    // Ability scores
    ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(ability => {
        document.getElementById(ability).value = character.abilities[ability] || 10;
    });
    
    // Proficiency bonus
    document.getElementById('proficiencyBonus').value = character.proficiencyBonus || 2;
    
    // Save proficiencies
    ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(ability => {
        document.getElementById(`${ability.substring(0, 3)}SaveProf`).checked = 
            character.saveProficiencies[ability] || false;
    });
    
    // Skill proficiencies
    Object.keys(skillAbilities).forEach(skill => {
        document.getElementById(`${skill}Prof`).checked = 
            character.skillProficiencies[skill] || false;
    });
    
    // Notes
    document.getElementById('features').value = character.features || '';
    document.getElementById('equipment').value = character.equipment || '';
    document.getElementById('notes').value = character.notes || '';
    
    // Attacks
    renderAttacks();
    
    // Class features
    if (character.classFeatures) {
        document.getElementById('layOnHandsPool').value = character.classFeatures.layOnHandsPool || 15;
        document.getElementById('preparedSpells').value = character.classFeatures.preparedSpells || '';
        
        // Divine Sense
        if (character.classFeatures.divineSense) {
            [1, 2, 3].forEach((num, idx) => {
                document.getElementById(`divineSense${num}`).checked = character.classFeatures.divineSense[idx] || false;
            });
        }
        
        // Spell Slots
        if (character.classFeatures.spellSlots) {
            [1, 2, 3, 4].forEach((num, idx) => {
                document.getElementById(`spellSlot1_${num}`).checked = character.classFeatures.spellSlots[idx] || false;
            });
        }
        
        // Channel Divinity
        document.getElementById('channelDivinity').checked = character.classFeatures.channelDivinity || false;
    }
    
    // Update spell save DC
    updateSpellSaveDC();
    
    // Update all calculated values
    updateAllModifiers();
}

// Import/Export functions
function exportCharacter() {
    const dataStr = JSON.stringify(character, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${character.name || 'character'}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importCharacter(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loadedCharacter = JSON.parse(e.target.result);
            // Merge with defaults to ensure classFeatures exists
            character = {
                ...character,
                ...loadedCharacter,
                classFeatures: {
                    ...character.classFeatures,
                    ...(loadedCharacter.classFeatures || {})
                }
            };
            populateForm();
            alert('Character imported successfully!');
        } catch (error) {
            alert('Error importing character: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Legacy class feature reset functions (kept for backward compatibility)
// These will be overridden by dynamic feature functions in classFeatures.js
function resetDivineSense() {
    // Legacy function - kept for any old inline handlers
    resetFeature('DivineSense', 3);
}

function resetLayOnHands() {
    // Legacy function - kept for any old inline handlers
    const maxPool = character.level * 5;
    resetFeaturePool('LayonHands', maxPool);
}

function resetChannelDivinity() {
    // Legacy function - kept for any old inline handlers
    const config = getClassConfig(character.class);
    if (config) {
        const feature = config.features.find(f => f.name === 'Channel Divinity');
        if (feature) {
            const maxUses = typeof feature.maxUses === 'function' 
                ? feature.maxUses(character.level) 
                : feature.maxUses;
            resetFeature('ChannelDivinity', maxUses);
        }
    }
}

function adjustHitDiceCount(operation) {
    const countInput = document.getElementById('hitDiceCount');
    const currentValue = parseInt(countInput.value) || 1;
    const maxAvailable = character.hitDice.current;
    
    if (operation === 'add') {
        countInput.value = Math.min(maxAvailable, currentValue + 1);
    } else if (operation === 'subtract') {
        countInput.value = Math.max(1, currentValue - 1);
    }
}

function rollHitDice() {
    const count = parseInt(document.getElementById('hitDiceCount').value) || 1;
    
    if (count > character.hitDice.current) {
        alert(`You only have ${character.hitDice.current} hit dice available!`);
        return;
    }
    
    if (character.hitDice.current <= 0) {
        alert('No hit dice available! Take a long rest to restore them.');
        return;
    }
    
    // Roll the dice
    const conMod = calculateModifier(character.abilities.constitution);
    const diceNotation = `${count}d10`;
    
    // Use the dice animation
    showRollResult(
        `Hit Dice (${count}d10 + ${count * conMod} CON)`,
        0,
        null,
        diceNotation,
        0,
        'healing'
    );
    
    // We need to handle the result differently, so let's do manual calculation
    let total = 0;
    const rolls = [];
    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * 10) + 1;
        rolls.push(roll);
        total += roll;
    }
    
    // Add constitution modifier per die
    const healing = total + (count * conMod);
    
    // Apply healing
    character.currentHP = Math.min(character.currentHP + healing, character.maxHP);
    document.getElementById('currentHP').value = character.currentHP;
    
    // Decrease hit dice
    character.hitDice.current -= count;
    document.getElementById('hitDiceCurrent').value = character.hitDice.current;
    
    // Reset count input
    document.getElementById('hitDiceCount').value = 1;
    
    // Auto-save
    saveToLocalStorage(true);
    
}

function longRest() {
    if (!confirm('Take a long rest? This will restore HP, 1/2 of the hit dice, and all class features.')) {
        return;
    }
    
    // Restore HP to max
    character.currentHP = character.maxHP;
    document.getElementById('currentHP').value = character.maxHP;
    
    // Restore hit dice (up to half of total, minimum 1)
    const restoredDice = Math.max(1, Math.floor(character.hitDice.max / 2));
    character.hitDice.current = Math.min(character.hitDice.max, character.hitDice.current + restoredDice);
    document.getElementById('hitDiceCurrent').value = character.hitDice.current;
    
    // Reset all class features by re-rendering
    if (character.class && character.level) {
        renderClassFeatures(character.class, character.level);
    }
    
    // Auto-save
    saveToLocalStorage(true);
    
    alert('Long rest completed! HP, hit dice, and class features restored.');
}

// Dice Roller Modal Functions
const diceCount = { 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 1 };

function openDiceRollerModal() {
    document.getElementById('diceRollerModal').style.display = 'block';
}

function closeDiceRollerModal() {
    document.getElementById('diceRollerModal').style.display = 'none';
}

function setupDiceRollerControls() {
    // Up/down buttons for each die type
    document.querySelectorAll('.dice-btn-up').forEach(btn => {
        btn.addEventListener('click', () => {
            const sides = parseInt(btn.getAttribute('data-sides'));
            if (diceCount[sides] < 20) {
                diceCount[sides]++;
                document.getElementById(`count-${sides}`).textContent = diceCount[sides];
            }
        });
    });
    
    document.querySelectorAll('.dice-btn-down').forEach(btn => {
        btn.addEventListener('click', () => {
            const sides = parseInt(btn.getAttribute('data-sides'));
            if (diceCount[sides] > 0) {
                diceCount[sides]--;
                document.getElementById(`count-${sides}`).textContent = diceCount[sides];
            }
        });
    });
    
    // Roll button
    document.getElementById('rollCustomDiceBtn').addEventListener('click', rollCustomDice);
    
    // Clear button
    document.getElementById('clearDiceBtn').addEventListener('click', () => {
        Object.keys(diceCount).forEach(sides => {
            diceCount[sides] = sides === '20' ? 1 : 0;
            document.getElementById(`count-${sides}`).textContent = diceCount[sides];
        });
    });
}

function rollCustomDice() {
    // Build dice notation from selected dice
    const diceParts = [];
    Object.keys(diceCount).forEach(sides => {
        if (diceCount[sides] > 0) {
            diceParts.push(`${diceCount[sides]}d${sides}`);
        }
    });
    
    if (diceParts.length === 0) {
        alert('Please select at least one die to roll!');
        return;
    }
    
    const diceNotation = diceParts.join('+');
    
    closeDiceRollerModal();
    
    showRollResult(
        `Custom Roll: ${diceNotation}`,
        0,
        null,
        diceNotation,
        0,
        'damage'
    );
}

function rollDivineSmite(attackIndex) {
    const level = parseInt(document.getElementById(`smiteLevel_${attackIndex}`).value);
    const isUndead = document.getElementById(`smiteUndead_${attackIndex}`).checked;
    
    // Find an available spell slot of the selected level
    const slotIndex = findAvailableSpellSlot(level);
    if (slotIndex === -1) {
        alert(`No available ${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'} level spell slots!`);
        return;
    }
    
    // Mark spell slot as used
    character.classFeatures.spellSlots[slotIndex] = true;
    document.getElementById(`spellSlot1_${slotIndex + 1}`).checked = true;
    saveToLocalStorage(true);
    
    // Base damage: 2d8 for 1st level, +1d8 per level above 1st
    const diceCount = 1 + level;
    
    // Build dice notation
    let diceNotation = `${diceCount}d8`;
    if (isUndead) {
        diceNotation += '+1d8';
    }
    
    showRollResult(
        `Divine Smite (${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'} Level)`,
        0, // Not used when using dice animation
        null,
        diceNotation,
        0,
        'damage'
    );
}

function findAvailableSpellSlot(level) {
    // For now, we only have 1st level slots, so just find first unused
    if (level === 1) {
        for (let i = 0; i < character.classFeatures.spellSlots.length; i++) {
            if (!character.classFeatures.spellSlots[i]) {
                return i;
            }
        }
    }
    return -1; // No available slots
}

function updateSpellSaveDC() {
    const chaMod = calculateModifier(character.abilities.charisma);
    const profBonus = character.proficiencyBonus;
    const spellSaveDC = 8 + chaMod + profBonus;
    
    document.getElementById('spellSaveDC').textContent = spellSaveDC;
    document.getElementById('spellSaveDC2').textContent = spellSaveDC;
    
    // Update prepared spells count
    const preparedCount = chaMod + 1;
    document.getElementById('preparedSpellsCount').textContent = Math.max(1, preparedCount);
}

// Mode toggle functionality
function toggleMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('modeToggle');
    const currentHPInput = document.getElementById('currentHP');
    
    if (isEditMode) {
        document.body.classList.remove('use-mode');
        btn.textContent = '📝 Edit Mode';
        btn.classList.remove('use-mode');
        currentHPInput.removeAttribute('readonly');
    } else {
        document.body.classList.add('use-mode');
        btn.textContent = '🎲 Use Mode';
        btn.classList.add('use-mode');
        currentHPInput.setAttribute('readonly', true);
    }
    
    // Save mode state to localStorage
    localStorage.setItem('dndMode', isEditMode ? 'edit' : 'use');
}

// Header collapse functionality
function toggleHeader() {
    const headerActions = document.getElementById('headerActions');
    const btn = document.getElementById('headerToggle');
    
    headerActions.classList.toggle('collapsed');
    btn.textContent = headerActions.classList.contains('collapsed') ? '▶' : '▼';
    
    // Save state to localStorage
    saveCollapsedState('headerActions', headerActions.classList.contains('collapsed'));
}

// Collapsible sections functionality
function setupCollapsibleSections() {
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            
            this.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
            
            // Set max-height for smooth animation
            if (!content.classList.contains('collapsed')) {
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                content.style.maxHeight = '0';
            }
            
            // Save state to localStorage
            saveCollapsedState(targetId, content.classList.contains('collapsed'));
        });
        
        // Initialize with proper max-height and restore saved state
        const targetId = header.getAttribute('data-target');
        const content = document.getElementById(targetId);
        
        // Restore saved collapsed state
        const isCollapsed = loadCollapsedState(targetId);
        if (isCollapsed) {
            header.classList.add('collapsed');
            content.classList.add('collapsed');
            content.style.maxHeight = '0';
        } else {
            content.style.maxHeight = content.scrollHeight + 'px';
        }
    });
    
    // Restore header actions collapsed state
    const headerActions = document.getElementById('headerActions');
    const headerBtn = document.getElementById('headerToggle');
    if (headerActions && headerBtn) {
        const isHeaderCollapsed = loadCollapsedState('headerActions');
        if (isHeaderCollapsed) {
            headerActions.classList.add('collapsed');
            headerBtn.textContent = '▶';
        }
    }
}

// Make functions globally accessible for inline event handlers
window.removeAttack = removeAttack;
window.rollAttack = rollAttack;
window.rollDamage = rollDamage;
window.resetDivineSense = resetDivineSense;
window.resetLayOnHands = resetLayOnHands;
window.resetSpellSlots = resetSpellSlots;
window.resetChannelDivinity = resetChannelDivinity;
window.rollDivineSmite = rollDivineSmite;
window.rollCustomDice = rollCustomDice;
window.commitHPAdjustment = commitHPAdjustment;
window.longRest = longRest;
window.adjustHitDiceCount = adjustHitDiceCount;
window.rollHitDice = rollHitDice;
