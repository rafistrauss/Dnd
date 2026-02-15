/**
 * Dynamic Class Features Renderer
 * Generates HTML for class-specific features based on character class and level
 */

// Main function to render class features
function renderClassFeatures(className, level) {
    const container = document.getElementById('classFeaturesContent');
    if (!container) return;
    
    const config = getClassConfig(className);
    if (!config) {
        container.innerHTML = '<p class="no-features">Select a class to see available features</p>';
        return;
    }
    
    const features = getAvailableFeatures(className, level);
    
    if (features.length === 0) {
        container.innerHTML = '<p class="no-features">No class features available yet</p>';
        return;
    }
    
    let html = '<div class="class-features-grid">';
    
    // Add spellcasting section if applicable
    if (config.spellcaster) {
        html += renderSpellcastingSection(className, level, config);
    }
    
    // Render each feature
    features.forEach(feature => {
        html += renderFeature(feature, className, level, config);
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Restore saved feature states
    restoreFeatureStates();
    
    // Add event listeners for new elements
    attachFeatureEventListeners();
}

// Render spellcasting section
function renderSpellcastingSection(className, level, config) {
    const abilityMod = calculateModifier(character.abilities[config.spellcastingAbility]);
    const profBonus = character.proficiencyBonus;
    const spellSaveDC = getSpellSaveDC(className, abilityMod, profBonus);
    const spellSlotCount = getSpellSlots(className, level);
    const preparedCount = getPreparedSpellsCount(className, level, abilityMod);
    
    const abilityName = config.spellcastingAbility.charAt(0).toUpperCase() + 
                       config.spellcastingAbility.slice(1);
    
    let html = `
        <div class="feature-box spellcasting-box">
            <h4>Spellcasting (${abilityName})</h4>
            <div class="spell-stats">
                <div class="spell-stat">
                    <label>Spell Save DC</label>
                    <div class="spell-value" id="spellSaveDC">${spellSaveDC}</div>
                </div>
                <div class="spell-stat">
                    <label>Spell Attack</label>
                    <div class="spell-value">+${abilityMod + profBonus}</div>
                </div>
                <div class="spell-stat">
                    <label>Prepared Spells</label>
                    <div class="spell-value" id="preparedSpellsCount">${preparedCount}</div>
                </div>
            </div>
    `;
    
    if (spellSlotCount > 0) {
        html += '<div class="spell-slots-section"><label>1st Level Spell Slots</label><div class="spell-slots">';
        for (let i = 0; i < spellSlotCount; i++) {
            html += `<input type="checkbox" id="spellSlot1_${i + 1}" class="use-checkbox spell-slot-checkbox" data-slot-index="${i}">`;
        }
        html += `<button class="btn-small btn-secondary" onclick="resetSpellSlots()">Long Rest</button></div></div>`;
    }
    
    html += `
            <div class="prepared-spells-section">
                <label>Prepared Spells</label>
                <textarea id="preparedSpells" placeholder="List your prepared spells...">${character.classFeatures.preparedSpells || ''}</textarea>
            </div>
        </div>
    `;
    
    return html;
}

// Render individual feature
function renderFeature(feature, className, level, config) {
    const description = typeof feature.description === 'function' 
        ? feature.description(level) 
        : feature.description;
    
    let html = `<div class="feature-box" data-feature="${feature.name}">
        <h4>${feature.name}</h4>
        <p class="feature-description">${description}</p>`;
    
    switch (feature.type) {
        case 'uses':
            html += renderUsesFeature(feature, level, config);
            break;
        case 'pool':
            html += renderPoolFeature(feature, level);
            break;
        case 'spellSlot':
            html += renderSpellSlotFeature(feature);
            break;
        case 'info':
            // Just description, optionally rollable
            if (feature.rollable) {
                html += `<button class="btn-small btn-primary" onclick="rollFeature('${feature.name}', '${className}')">Roll</button>`;
            }
            break;
    }
    
    html += '</div>';
    return html;
}

// Render uses-based feature (e.g., Divine Sense, Action Surge)
function renderUsesFeature(feature, level, config) {
    let maxUses;
    if (typeof feature.maxUses === 'function') {
        // For features that need ability modifier
        if (feature.name === 'Divine Sense') {
            const chaMod = calculateModifier(character.abilities.charisma);
            maxUses = feature.maxUses(level, chaMod);
        } else {
            maxUses = feature.maxUses(level);
        }
    } else {
        maxUses = feature.maxUses;
    }
    
    const featureKey = feature.name.replace(/\s+/g, '');
    const resetType = feature.resetOn === 'short' ? 'Short Rest' : 'Long Rest';
    
    let html = '<div class="feature-uses">';
    
    if (maxUses === Infinity) {
        html += '<p class="unlimited-uses">Unlimited Uses</p>';
    } else {
        for (let i = 0; i < maxUses; i++) {
            html += `<input type="checkbox" id="${featureKey}_${i + 1}" class="use-checkbox" data-feature-key="${featureKey}">`;
        }
        html += `<button class="btn-small btn-secondary" onclick="resetFeature('${featureKey}', ${maxUses})">${resetType}</button>`;
    }
    
    html += '</div>';
    
    if (feature.rollable) {
        const rollFormula = typeof feature.rollFormula === 'function' 
            ? feature.rollFormula(level) 
            : '';
        html += `<button class="btn-small btn-primary" onclick="rollFeature('${feature.name}', '${rollFormula}')">Roll</button>`;
    }
    
    return html;
}

// Render pool-based feature (e.g., Lay on Hands)
function renderPoolFeature(feature, level) {
    const maxPool = typeof feature.maxPool === 'function' 
        ? feature.maxPool(level) 
        : feature.maxPool;
    
    const featureKey = feature.name.replace(/\s+/g, '');
    const resetType = feature.resetOn === 'short' ? 'Short Rest' : 'Long Rest';
    
    return `
        <div class="feature-pool">
            <input type="number" id="${featureKey}Pool" value="${maxPool}" min="0" max="${maxPool}" class="pool-input">
            <span>/ ${maxPool} HP</span>
            <button class="btn-small btn-secondary" onclick="resetFeaturePool('${featureKey}', ${maxPool})">${resetType}</button>
        </div>
    `;
}

// Render spell slot feature (e.g., Divine Smite)
function renderSpellSlotFeature(feature) {
    return `
        <div class="divine-smite-controls">
            <label>Spell Level: <select id="smiteLevel">
                <option value="1">1st</option>
                <option value="2">2nd</option>
                <option value="3">3rd</option>
                <option value="4">4th</option>
                <option value="5">5th</option>
            </select></label>
            <label><input type="checkbox" id="smiteUndead"> vs Undead/Fiend</label>
            <button class="btn-small btn-primary" onclick="rollDivineSmite()">Roll Smite</button>
        </div>
    `;
}

// Restore feature states from character data
function restoreFeatureStates() {
    if (!character.classFeatures || !character.classFeatures.features) return;
    
    Object.keys(character.classFeatures.features).forEach(featureKey => {
        const featureData = character.classFeatures.features[featureKey];
        
        if (Array.isArray(featureData)) {
            // Uses-based feature
            featureData.forEach((used, index) => {
                const checkbox = document.getElementById(`${featureKey}_${index + 1}`);
                if (checkbox) checkbox.checked = used;
            });
        } else if (typeof featureData === 'number') {
            // Pool-based feature
            const input = document.getElementById(`${featureKey}Pool`);
            if (input) input.value = featureData;
        }
    });
    
    // Restore spell slots
    if (character.classFeatures.spellSlots) {
        character.classFeatures.spellSlots.forEach((used, index) => {
            const checkbox = document.getElementById(`spellSlot1_${index + 1}`);
            if (checkbox) checkbox.checked = used;
        });
    }
}

// Attach event listeners to feature elements
function attachFeatureEventListeners() {
    // Uses checkboxes
    document.querySelectorAll('.use-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            saveFeatureState(this);
        });
    });
    
    // Pool inputs
    document.querySelectorAll('.pool-input').forEach(input => {
        input.addEventListener('change', function() {
            const featureKey = this.id.replace('Pool', '');
            if (!character.classFeatures.features) {
                character.classFeatures.features = {};
            }
            character.classFeatures.features[featureKey] = parseInt(this.value) || 0;
            saveToLocalStorage(true);
        });
    });
    
    // Spell slot checkboxes
    document.querySelectorAll('.spell-slot-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const index = parseInt(this.dataset.slotIndex);
            if (!character.classFeatures.spellSlots) {
                character.classFeatures.spellSlots = [];
            }
            character.classFeatures.spellSlots[index] = this.checked;
            saveToLocalStorage(true);
        });
    });
    
    // Prepared spells textarea
    const preparedSpellsTextarea = document.getElementById('preparedSpells');
    if (preparedSpellsTextarea) {
        preparedSpellsTextarea.addEventListener('change', function() {
            character.classFeatures.preparedSpells = this.value;
            saveToLocalStorage(true);
        });
    }
}

// Save individual feature state
function saveFeatureState(checkbox) {
    const featureKey = checkbox.dataset.featureKey;
    if (!featureKey) return;
    
    const match = checkbox.id.match(/_(\d+)$/);
    if (!match) return;
    
    const index = parseInt(match[1]) - 1;
    
    if (!character.classFeatures.features) {
        character.classFeatures.features = {};
    }
    
    if (!character.classFeatures.features[featureKey]) {
        character.classFeatures.features[featureKey] = [];
    }
    
    character.classFeatures.features[featureKey][index] = checkbox.checked;
    saveToLocalStorage(true);
}

// Reset functions for features
function resetFeature(featureKey, maxUses) {
    for (let i = 1; i <= maxUses; i++) {
        const checkbox = document.getElementById(`${featureKey}_${i}`);
        if (checkbox) checkbox.checked = false;
    }
    
    if (character.classFeatures.features) {
        character.classFeatures.features[featureKey] = Array(maxUses).fill(false);
    }
    
    saveToLocalStorage(true);
}

function resetFeaturePool(featureKey, maxPool) {
    const input = document.getElementById(`${featureKey}Pool`);
    if (input) input.value = maxPool;
    
    if (!character.classFeatures.features) {
        character.classFeatures.features = {};
    }
    character.classFeatures.features[featureKey] = maxPool;
    
    saveToLocalStorage(true);
}

function resetSpellSlots() {
    const config = getClassConfig(character.class);
    if (!config || !config.spellcaster) return;
    
    const slotCount = getSpellSlots(character.class, character.level);
    
    for (let i = 1; i <= slotCount; i++) {
        const checkbox = document.getElementById(`spellSlot1_${i}`);
        if (checkbox) checkbox.checked = false;
    }
    
    character.classFeatures.spellSlots = Array(slotCount).fill(false);
    saveToLocalStorage(true);
}

// Roll feature (for rollable features)
function rollFeature(featureName, formula) {
    if (!formula) return;
    
    showRollResult(
        featureName,
        0,
        null,
        formula,
        0,
        'damage'
    );
}

// Make functions globally accessible
window.resetFeature = resetFeature;
window.resetFeaturePool = resetFeaturePool;
window.resetSpellSlots = resetSpellSlots;
window.rollFeature = rollFeature;
