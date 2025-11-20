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
    notes: ''
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    setupEventListeners();
    updateAllModifiers();
});

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
    
    // Character info inputs
    document.getElementById('characterName').addEventListener('change', (e) => {
        character.name = e.target.value;
    });
    
    document.getElementById('characterClass').addEventListener('change', (e) => {
        character.class = e.target.value;
    });
    
    document.getElementById('characterLevel').addEventListener('change', (e) => {
        character.level = parseInt(e.target.value) || 1;
        updateProficiencyBonus();
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
    
    // Add attack button
    document.getElementById('addAttackBtn').addEventListener('click', addAttack);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('rollModal')) {
            closeModal();
        }
    });
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
}

// Update proficiency bonus based on level
function updateProficiencyBonus() {
    const level = character.level;
    const profBonus = Math.ceil(level / 4) + 1;
    character.proficiencyBonus = profBonus;
    document.getElementById('proficiencyBonus').value = profBonus;
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
    const d20 = rollDice(20);
    const total = d20.total + modifier;
    
    const abilityName = ability.charAt(0).toUpperCase() + ability.slice(1);
    
    showRollResult(
        `${abilityName} Check`,
        total,
        `d20: ${d20.total} ${formatModifier(modifier)} = ${total}`
    );
}

function rollSavingThrow(ability) {
    const modifier = calculateModifier(character.abilities[ability]);
    const profBonus = character.saveProficiencies[ability] ? character.proficiencyBonus : 0;
    const totalMod = modifier + profBonus;
    const d20 = rollDice(20);
    const total = d20.total + totalMod;
    
    const abilityName = ability.charAt(0).toUpperCase() + ability.slice(1);
    
    showRollResult(
        `${abilityName} Save`,
        total,
        `d20: ${d20.total} ${formatModifier(totalMod)} = ${total}`
    );
}

function rollSkillCheck(skill) {
    const ability = skillAbilities[skill];
    const abilityMod = calculateModifier(character.abilities[ability]);
    const profBonus = character.skillProficiencies[skill] ? character.proficiencyBonus : 0;
    const totalMod = abilityMod + profBonus;
    const d20 = rollDice(20);
    const total = d20.total + totalMod;
    
    const skillName = skill.replace(/([A-Z])/g, ' $1').trim();
    const formattedSkillName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
    
    showRollResult(
        `${formattedSkillName} Check`,
        total,
        `d20: ${d20.total} ${formatModifier(totalMod)} = ${total}`
    );
}

function rollAttack(attackIndex) {
    const attack = character.attacks[attackIndex];
    const d20 = rollDice(20);
    const total = d20.total + parseInt(attack.attackBonus || 0);
    
    showRollResult(
        `${attack.name} Attack`,
        total,
        `d20: ${d20.total} + ${attack.attackBonus} = ${total}${d20.total === 20 ? ' (CRITICAL HIT!)' : ''}${d20.total === 1 ? ' (Critical Miss)' : ''}`
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
    
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const bonus = parseInt(match[3] || 0);
    
    const dice = rollDice(sides, count);
    const total = dice.total + bonus;
    
    showRollResult(
        `${attack.name} Damage`,
        total,
        `${count}d${sides}: [${dice.results.join(', ')}] ${bonus !== 0 ? formatModifier(bonus) : ''} = ${total}`
    );
}

function showRollResult(title, result, details) {
    const modal = document.getElementById('rollModal');
    const resultDiv = document.getElementById('rollResult');
    
    resultDiv.innerHTML = `
        <h3>${title}</h3>
        <div class="dice-roll">${result}</div>
        <div class="roll-details">${details}</div>
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('rollModal').style.display = 'none';
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
        `;
        container.appendChild(attackDiv);
    });
}

// Local storage functions
function saveToLocalStorage() {
    try {
        localStorage.setItem('dndCharacter', JSON.stringify(character));
        alert('Character saved successfully!');
    } catch (error) {
        alert('Error saving character: ' + error.message);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('dndCharacter');
        if (saved) {
            character = JSON.parse(saved);
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
            character = JSON.parse(e.target.result);
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

// Make functions globally accessible for inline event handlers
window.removeAttack = removeAttack;
window.rollAttack = rollAttack;
window.rollDamage = rollDamage;
