// Application State
const state = {
    contestants: [],
    heats: [],
    currentHeatIndex: 0,
    results: [],
    finalsMode: false,
    championship: {
        active: false,
        finalists: [],
        bracket: {
            quarterfinals: [],
            semifinals: [],
            finals: null,
            champion: null
        }
    }
};

// LocalStorage Functions
function saveState() {
    try {
        localStorage.setItem('pinewoodDerbyState', JSON.stringify(state));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('pinewoodDerbyState');
        if (saved) {
            const loaded = JSON.parse(saved);
            state.contestants = loaded.contestants || [];

            // Ensure all contestants have finishes property for backwards compatibility
            state.contestants.forEach(c => {
                if (!c.finishes) {
                    c.finishes = { first: 0, second: 0, third: 0 };
                }
            });

            state.heats = loaded.heats || [];
            state.currentHeatIndex = loaded.currentHeatIndex || 0;
            state.results = loaded.results || [];
            state.finalsMode = loaded.finalsMode || false;
            state.championship = loaded.championship || {
                active: false,
                finalists: [],
                bracket: {
                    quarterfinals: [],
                    semifinals: [],
                    finals: null,
                    champion: null
                }
            };

            // Re-render everything
            renderContestantsList();
            renderCurrentRace();
            renderUpcomingHeats();
            updateLeaderboards();

            // Show championship tab if active
            if (state.championship.active) {
                document.getElementById('championshipTab').style.display = 'inline-block';
                renderBracket();
            }

            return true;
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
    return false;
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This will delete all contestants, heats, and race results.')) {
        localStorage.removeItem('pinewoodDerbyState');
        state.contestants = [];
        state.heats = [];
        state.currentHeatIndex = 0;
        state.results = [];
        state.finalsMode = false;
        state.championship = {
            active: false,
            finalists: [],
            bracket: {
                quarterfinals: [],
                semifinals: [],
                finals: null,
                champion: null
            }
        };

        renderContestantsList();
        renderCurrentRace();
        renderUpcomingHeats();
        updateLeaderboards();
        document.getElementById('championshipTab').style.display = 'none';

    }
}

// DOM Elements
const contestantForm = document.getElementById('contestantForm');
const contestantName = document.getElementById('contestantName');
const contestantQuorum = document.getElementById('contestantQuorum');
const contestantsList = document.getElementById('contestantsList');
const generateHeatsBtn = document.getElementById('generateHeats');
const loadTestDataBtn = document.getElementById('loadTestData');
const clearAllDataBtn = document.getElementById('clearAllData');
const startChampionshipBtn = document.getElementById('startChampionshipBtn');
const currentRaceDiv = document.getElementById('currentRace');
const upcomingHeatsDiv = document.getElementById('upcomingHeats');

// Event Listeners
contestantForm.addEventListener('submit', addContestant);
generateHeatsBtn.addEventListener('click', generateHeats);
loadTestDataBtn.addEventListener('click', loadTestData);
clearAllDataBtn.addEventListener('click', clearAllData);
startChampionshipBtn.addEventListener('click', startChampionship);

// Add Contestant
function addContestant(e) {
    e.preventDefault();

    const name = contestantName.value.trim();
    const quorum = contestantQuorum.value;

    if (!name || !quorum) return;

    const contestant = {
        id: Date.now(),
        name: name,
        quorum: quorum,
        score: 0,
        races: 0,
        trackSlots: { 1: 0, 2: 0, 3: 0 },
        finishes: { first: 0, second: 0, third: 0 }
    };

    state.contestants.push(contestant);
    contestantName.value = '';
    contestantQuorum.value = '';

    renderContestantsList();
    saveState();
}

// Load Test Data
function loadTestData() {
    const firstNames = ['James', 'Noah', 'Oliver', 'Elijah', 'William', 'Benjamin', 'Lucas', 'Henry', 'Alexander', 'Mason', 'Michael', 'Ethan', 'Daniel', 'Jacob', 'Logan'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

    state.contestants = [];

    const quorums = ['deacon', 'teacher', 'priest'];

    quorums.forEach(quorum => {
        for (let i = 0; i < 5; i++) {
            const name = firstNames[Math.floor(Math.random() * firstNames.length)];


            const contestant = {
                id: Date.now() + Math.random(),
                name: name,
                quorum: quorum,
                score: 0,
                races: 0,
                trackSlots: { 1: 0, 2: 0, 3: 0 },
                finishes: { first: 0, second: 0, third: 0 }
            };

            state.contestants.push(contestant);
        }
    });

    renderContestantsList();
    saveState();
}

// Remove Contestant
function removeContestant(id) {
    state.contestants = state.contestants.filter(c => c.id !== id);
    renderContestantsList();
    saveState();
}

// Render Contestants List
function renderContestantsList() {
    if (state.contestants.length === 0) {
        contestantsList.innerHTML = '<p style="color: #999;">No racers registered yet.</p>';
        return;
    }

    contestantsList.innerHTML = state.contestants.map(c => `
        <div class="contestant-chip ${c.quorum}">
            ${c.name} (${capitalizeFirst(c.quorum)})
            <span class="remove" onclick="removeContestant(${c.id})">×</span>
        </div>
    `).join('');
}

// Generate Heats
function generateHeats() {
    if (state.contestants.length < 3) {
        alert('Need at least 3 contestants to generate heats!');
        return;
    }

    state.heats = [];
    const quorums = ['deacon', 'teacher', 'priest'];

    // Generate heats for each quorum separately
    const quorumHeatsMap = {};
    quorums.forEach(quorum => {
        const quorumContestants = state.contestants.filter(c => c.quorum === quorum);
        if (quorumContestants.length >= 3) {
            quorumHeatsMap[quorum] = generateQuorumHeats(quorumContestants, quorum);
        } else {
            quorumHeatsMap[quorum] = [];
        }
    });

    // Interleave heats in round-robin order: deacon 1, teacher 1, priest 1, deacon 2, teacher 2, etc.
    const maxHeats = Math.max(
        quorumHeatsMap['deacon'].length,
        quorumHeatsMap['teacher'].length,
        quorumHeatsMap['priest'].length
    );

    for (let i = 0; i < maxHeats; i++) {
        if (i < quorumHeatsMap['deacon'].length) {
            state.heats.push(quorumHeatsMap['deacon'][i]);
        }
        if (i < quorumHeatsMap['teacher'].length) {
            state.heats.push(quorumHeatsMap['teacher'][i]);
        }
        if (i < quorumHeatsMap['priest'].length) {
            state.heats.push(quorumHeatsMap['priest'][i]);
        }
    }

    state.currentHeatIndex = 0;



    renderCurrentRace();
    renderUpcomingHeats();
    updateLeaderboards();

    // Switch to scoreboard tab
    switchTab('scoreboard');

    saveState();
}

// Generate heats for a specific quorum
function generateQuorumHeats(contestants, quorum) {
    const heats = [];
    const n = contestants.length;

    // Reset track slot counts
    contestants.forEach(c => {
        c.trackSlots = { 1: 0, 2: 0, 3: 0 };
    });

    // Create heats ensuring each car races in each slot twice
    const targetRacesPerSlot = 2;
    let heatNumber = 1;

    // Generate heats until each contestant has raced in each slot twice
    while (!allContestantsComplete(contestants)) {
        const heat = createBalancedHeat(contestants, quorum, heatNumber);
        if (heat) {
            heats.push(heat);
            heatNumber++;
        } else {
            break;
        }
    }

    return heats;
}

// Check if all contestants have completed their slot requirements
function allContestantsComplete(contestants) {
    return contestants.every(c =>
        c.trackSlots[1] >= 2 && c.trackSlots[2] >= 2 && c.trackSlots[3] >= 2
    );
}

// Create a balanced heat
function createBalancedHeat(contestants, quorum, heatNumber) {
    // Find contestants who still need races
    const needsRaces = contestants.filter(c =>
        c.trackSlots[1] < 2 || c.trackSlots[2] < 2 || c.trackSlots[3] < 2
    );

    if (needsRaces.length < 3) return null;

    // Try to assign 3 different contestants to 3 different slots
    const slots = { 1: null, 2: null, 3: null };
    const usedContestants = new Set();

    // For each slot, find a contestant who needs that slot
    for (let slot = 1; slot <= 3; slot++) {
        const available = needsRaces.filter(c =>
            !usedContestants.has(c.id) && c.trackSlots[slot] < 2
        );

        if (available.length > 0) {
            // Prefer contestants with fewer total races
            available.sort((a, b) => a.races - b.races);
            const selected = available[0];
            slots[slot] = selected;
            usedContestants.add(selected.id);
        }
    }

    // If we couldn't fill all slots, fill with any available contestant
    for (let slot = 1; slot <= 3; slot++) {
        if (!slots[slot]) {
            const available = contestants.filter(c => !usedContestants.has(c.id));
            if (available.length > 0) {
                const selected = available[0];
                slots[slot] = selected;
                usedContestants.add(selected.id);
            }
        }
    }

    if (!slots[1] || !slots[2] || !slots[3]) return null;

    // Verify that all three slots have different contestants
    if (slots[1].id === slots[2].id || slots[1].id === slots[3].id || slots[2].id === slots[3].id) {
        console.error('Error: Same contestant assigned to multiple slots in heat', heatNumber);
        return null;
    }

    // Only update contestant stats after we've verified the heat is valid
    slots[1].trackSlots[1]++;
    slots[1].races++;
    slots[2].trackSlots[2]++;
    slots[2].races++;
    slots[3].trackSlots[3]++;
    slots[3].races++;

    return {
        id: Date.now() + Math.random(),
        heatNumber: heatNumber,
        quorum: quorum,
        slots: slots,
        completed: false,
        results: null
    };
}

// Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Render Current Race
function renderCurrentRace() {
    if (state.currentHeatIndex >= state.heats.length) {
        currentRaceDiv.innerHTML = '<p class="no-race">All heats completed!</p>';
        return;
    }

    const heat = state.heats[state.currentHeatIndex];

    currentRaceDiv.innerHTML = `
        <div class="race-info" style="margin-bottom: 15px; text-align: center;">
            <strong style="color: #667eea; font-size: 1.2rem;">
                ${capitalizeFirst(heat.quorum)} Quorum - Heat ${heat.heatNumber}
            </strong>
        </div>
        <div class="race-slots">
            <div class="race-slot">
                <div class="track-label">Track 1:</div>
                <button class="racer-btn ${heat.slots[1].quorum}"
                        onclick="selectPosition(1, 'first')"
                        id="slot1">
                    ${heat.slots[1].name}
                </button>
            </div>
            <div class="race-slot">
                <div class="track-label">Track 2:</div>
                <button class="racer-btn ${heat.slots[2].quorum}"
                        onclick="selectPosition(2, 'first')"
                        id="slot2">
                    ${heat.slots[2].name}
                </button>
            </div>
            <div class="race-slot">
                <div class="track-label">Track 3:</div>
                <button class="racer-btn ${heat.slots[3].quorum}"
                        onclick="selectPosition(3, 'first')"
                        id="slot3">
                    ${heat.slots[3].name}
                </button>
            </div>
        </div>
        <div style="margin-top: 15px; text-align: center; color: #666; font-size: 0.9rem;">
            Click 1st place, then 2nd place. 3rd place will be automatic.
        </div>
    `;
}

// Select Position
let firstPlace = null;

function selectPosition(slot, position) {
    if (firstPlace === null) {
        // Selecting first place
        firstPlace = slot;
        document.querySelectorAll('.racer-btn').forEach(btn => {
            btn.classList.remove('selected-first', 'selected-second', 'selected-third');
        });
        document.getElementById(`slot${slot}`).classList.add('selected-first');

        // Update click handlers to select second place
        for (let i = 1; i <= 3; i++) {
            if (i !== slot) {
                document.getElementById(`slot${i}`).onclick = () => selectSecondPlace(i);
            }
        }
    }
}

function selectSecondPlace(slot) {
    if (firstPlace === slot) return;

    const secondPlace = slot;
    document.getElementById(`slot${slot}`).classList.add('selected-second');

    // Determine third place
    const thirdPlace = [1, 2, 3].find(s => s !== firstPlace && s !== secondPlace);
    document.getElementById(`slot${thirdPlace}`).classList.add('selected-third');

    // Record results after a brief delay
    setTimeout(() => {
        recordResults(firstPlace, secondPlace, thirdPlace);
        firstPlace = null;
    }, 800);
}

// Record Results
function recordResults(first, second, third) {
    const heat = state.heats[state.currentHeatIndex];

    // Award points to the actual contestants in state.contestants by finding them by ID
    // Don't update heat.slots because those might be the same object references
    const firstContestant = state.contestants.find(c => c.id === heat.slots[first].id);
    const secondContestant = state.contestants.find(c => c.id === heat.slots[second].id);
    const thirdContestant = state.contestants.find(c => c.id === heat.slots[third].id);

    if (firstContestant) {
        firstContestant.score += 3;
        firstContestant.finishes.first++;
    }
    if (secondContestant) {
        secondContestant.score += 2;
        secondContestant.finishes.second++;
    }
    if (thirdContestant) {
        thirdContestant.score += 1;
        thirdContestant.finishes.third++;
    }

    heat.completed = true;
    heat.results = { first, second, third };

    state.results.push({
        heat: state.currentHeatIndex,
        first: heat.slots[first].name,
        second: heat.slots[second].name,
        third: heat.slots[third].name
    });

    // Move to next heat
    state.currentHeatIndex++;

    renderCurrentRace();
    renderUpcomingHeats();
    updateLeaderboards();

    saveState();
}

// Render Upcoming Heats
function renderUpcomingHeats() {
    const upcoming = state.heats.slice(state.currentHeatIndex + 1);
    const upcomingHeatsTitle = document.getElementById('upcomingHeatsTitle');

    if (upcoming.length === 0) {
        upcomingHeatsDiv.innerHTML = '<p class="no-heats">No more heats.</p>';
        upcomingHeatsTitle.textContent = 'Upcoming Heats';
        return;
    }

    upcomingHeatsTitle.textContent = `Upcoming Heats (${upcoming.length})`;

    upcomingHeatsDiv.innerHTML = upcoming.map(heat => `
        <div class="upcoming-heat">
            <div class="upcoming-racers">
                <div class="upcoming-racer ${heat.slots[1].quorum}">${heat.slots[1].name}</div>
                <div class="upcoming-racer ${heat.slots[2].quorum}">${heat.slots[2].name}</div>
                <div class="upcoming-racer ${heat.slots[3].quorum}">${heat.slots[3].name}</div>
            </div>
        </div>
    `).join('');
}

// Update Leaderboards
function updateLeaderboards() {
    const leaderboardContainer = document.getElementById('leaderboardContainer');

    // Determine current racing quorum
    let currentQuorum = null;
    if (state.currentHeatIndex < state.heats.length) {
        const currentHeat = state.heats[state.currentHeatIndex];
        currentQuorum = currentHeat.quorum;
    }

    // Calculate top 2 from each quorum (these get gold borders)
    const top2Ids = new Set();

    // Get top 2 from each quorum
    const quorums = ['deacon', 'teacher', 'priest'];
    quorums.forEach(quorum => {
        const top2 = state.contestants
            .filter(c => c.quorum === quorum)
            .sort((a, b) => {
                // Primary sort: by score
                if (b.score !== a.score) return b.score - a.score;

                // Tiebreaker 1: by first place finishes
                if (b.finishes.first !== a.finishes.first) return b.finishes.first - a.finishes.first;

                // Tiebreaker 2: by second place finishes
                return b.finishes.second - a.finishes.second;
            })
            .slice(0, 2);
        top2.forEach(c => top2Ids.add(c.id));
    });

    // Render quorum leaderboards
    const quorumLeaderboards = quorums.map(quorum => {
        const quorumContestants = state.contestants
            .filter(c => c.quorum === quorum)
            .sort((a, b) => {
                // Primary sort: by score
                if (b.score !== a.score) return b.score - a.score;

                // Tiebreaker 1: by first place finishes
                if (b.finishes.first !== a.finishes.first) return b.finishes.first - a.finishes.first;

                // Tiebreaker 2: by second place finishes
                return b.finishes.second - a.finishes.second;
            });

        const isCurrentlyRacing = quorum === currentQuorum;

        let content;
        if (quorumContestants.length === 0) {
            content = '<div class="leaderboard-empty">No racers in this quorum</div>';
        } else {
            content = quorumContestants.map((c, index) => {
                const advancingClass = (index < 2 && top2Ids.has(c.id)) ? ' advancing' : '';
                return `
                    <div class="leaderboard-row ${c.quorum}${advancingClass}">
                        <div class="leaderboard-rank">#${index + 1}</div>
                        <div class="leaderboard-name">${c.name}</div>
                        <div class="leaderboard-score">${c.score} pts</div>
                    </div>
                `;
            }).join('');
        }

        return `
            <div class="quorum-leaderboard">
                <h3>
                    ${capitalizeFirst(quorum)} Quorum
                    <span class="racing-badge${isCurrentlyRacing ? '' : ' hidden'}">RACING NOW</span>
                </h3>
                <div class="leaderboard-table">
                    ${content}
                </div>
            </div>
        `;
    }).join('');

    // Get top 5 contestants not in top 2 of their quorum, sorted by score with tiebreakers
    const wildCardContestants = state.contestants
        .filter(c => !top2Ids.has(c.id))
        .sort((a, b) => {
            // Primary sort: by score
            if (b.score !== a.score) return b.score - a.score;

            // Tiebreaker 1: by first place finishes
            if (b.finishes.first !== a.finishes.first) return b.finishes.first - a.finishes.first;

            // Tiebreaker 2: by second place finishes
            return b.finishes.second - a.finishes.second;
        })
        .slice(0, 5);

    let wildCardContent;
    if (wildCardContestants.length === 0) {
        wildCardContent = '<div class="leaderboard-empty">No contestants</div>';
    } else {
        wildCardContent = wildCardContestants.map((c, index) => {
            const advancingClass = index < 2 ? ' advancing' : '';
            return `
                <div class="leaderboard-row ${c.quorum}${advancingClass}">
                    <div class="leaderboard-rank">#${index + 1}</div>
                    <div class="leaderboard-name">${c.name}</div>
                    <div class="leaderboard-score">${c.score} pts</div>
                </div>
            `;
        }).join('');
    }

    const wildCardLeaderboard = `
        <div class="quorum-leaderboard">
            <h3>
                Wild Card
                <span class="racing-badge hidden">RACING NOW</span>
            </h3>
            <div class="leaderboard-table">
                ${wildCardContent}
            </div>
            <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; font-size: 0.85rem; color: #666; text-align: center;">
                Wild card chosen by:<br>1. Total points<br>2. # of 1st place finishes<br>3. # of 2nd place finishes
            </div>
        </div>
    `;

    leaderboardContainer.innerHTML = quorumLeaderboards + wildCardLeaderboard;
}

// Utility Functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Tab Switching
function switchTab(tabName) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    if (tabName === 'scoreboard') {
        document.getElementById('scoreboardTab').classList.add('active');
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
    } else if (tabName === 'setup') {
        document.getElementById('setupTab').classList.add('active');
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
    } else if (tabName === 'championship') {
        document.getElementById('championshipTabContent').classList.add('active');
        document.querySelector('.tab-btn:nth-child(3)').classList.add('active');
    }
}

// Championship Functions
function startChampionship() {
    // Select finalists: top 2 from each quorum + 2 wild cards
    const finalists = [];

    // Get top 2 from each quorum
    const quorums = ['deacon', 'teacher', 'priest'];
    quorums.forEach(quorum => {
        const top2 = state.contestants
            .filter(c => c.quorum === quorum)
            .sort((a, b) => {
                // Primary sort: by score
                if (b.score !== a.score) return b.score - a.score;

                // Tiebreaker 1: by first place finishes
                if (b.finishes.first !== a.finishes.first) return b.finishes.first - a.finishes.first;

                // Tiebreaker 2: by second place finishes
                return b.finishes.second - a.finishes.second;
            })
            .slice(0, 2);
        finalists.push(...top2);
    });

    // Get wild cards (next 2 highest scores not already in finalists, with tiebreakers)
    const finalistIds = new Set(finalists.map(f => f.id));
    const wildcards = state.contestants
        .filter(c => !finalistIds.has(c.id))
        .sort((a, b) => {
            // Primary sort: by score
            if (b.score !== a.score) return b.score - a.score;

            // Tiebreaker 1: by first place finishes
            if (b.finishes.first !== a.finishes.first) return b.finishes.first - a.finishes.first;

            // Tiebreaker 2: by second place finishes
            return b.finishes.second - a.finishes.second;
        })
        .slice(0, 2);
    finalists.push(...wildcards);

    // Initialize championship bracket
    state.championship.active = true;
    state.championship.finalists = finalists;
    state.championship.bracket.quarterfinals = [
        { racer1: finalists[0], racer2: finalists[7], winner: null },
        { racer1: finalists[3], racer2: finalists[4], winner: null },
        { racer1: finalists[2], racer2: finalists[5], winner: null },
        { racer1: finalists[1], racer2: finalists[6], winner: null }
    ];
    state.championship.bracket.semifinals = [
        { racer1: null, racer2: null, winner: null },
        { racer1: null, racer2: null, winner: null }
    ];
    state.championship.bracket.finals = { racer1: null, racer2: null, winner: null };
    state.championship.bracket.champion = null;

    // Show championship tab
    document.getElementById('championshipTab').style.display = 'inline-block';

    renderBracket();
    switchTab('championship');
    saveState();
}

function renderBracket() {
    renderQuarterfinals();
    renderSemifinals();
    renderFinals();
    renderChampion();
}

function renderQuarterfinals() {
    const container = document.getElementById('quarterfinals');
    container.innerHTML = state.championship.bracket.quarterfinals.map((matchup, index) => `
        <div class="bracket-matchup">
            <div class="bracket-racer ${matchup.racer1.quorum} ${matchup.winner === matchup.racer1 ? 'winner' : matchup.winner ? 'loser' : 'clickable'}"
                 onclick="selectWinner('quarterfinals', ${index}, 1)">
                ${matchup.racer1.name} (${matchup.racer1.score} pts)
            </div>
            <div class="bracket-racer ${matchup.racer2.quorum} ${matchup.winner === matchup.racer2 ? 'winner' : matchup.winner ? 'loser' : 'clickable'}"
                 onclick="selectWinner('quarterfinals', ${index}, 2)">
                ${matchup.racer2.name} (${matchup.racer2.score} pts)
            </div>
        </div>
    `).join('');
}

function renderSemifinals() {
    const container = document.getElementById('semifinals');
    container.innerHTML = state.championship.bracket.semifinals.map((matchup, index) => {
        if (!matchup.racer1 && !matchup.racer2) {
            return '<div class="bracket-matchup"><div style="text-align: center; color: #999;">Awaiting winners...</div></div>';
        }

        let racer1Html = matchup.racer1
            ? `<div class="bracket-racer ${matchup.racer1.quorum} ${matchup.winner === matchup.racer1 ? 'winner' : matchup.winner ? 'loser' : 'clickable'}"
                     onclick="selectWinner('semifinals', ${index}, 1)">
                    ${matchup.racer1.name}
                </div>`
            : '<div style="padding: 12px; margin: 5px 0; background: #e9ecef; border-radius: 8px; text-align: center; color: #999;">TBD</div>';

        let racer2Html = matchup.racer2
            ? `<div class="bracket-racer ${matchup.racer2.quorum} ${matchup.winner === matchup.racer2 ? 'winner' : matchup.winner ? 'loser' : 'clickable'}"
                     onclick="selectWinner('semifinals', ${index}, 2)">
                    ${matchup.racer2.name}
                </div>`
            : '<div style="padding: 12px; margin: 5px 0; background: #e9ecef; border-radius: 8px; text-align: center; color: #999;">TBD</div>';

        return `
            <div class="bracket-matchup">
                ${racer1Html}
                ${racer2Html}
            </div>
        `;
    }).join('');
}

function renderFinals() {
    const container = document.getElementById('finals');
    const matchup = state.championship.bracket.finals;

    if (!matchup.racer1 && !matchup.racer2) {
        container.innerHTML = '<div class="bracket-matchup"><div style="text-align: center; color: #999;">Awaiting finalists...</div></div>';
        return;
    }

    let racer1Html = matchup.racer1
        ? `<div class="bracket-racer ${matchup.racer1.quorum} ${matchup.winner === matchup.racer1 ? 'winner' : matchup.winner ? 'loser' : 'clickable'}"
                 onclick="selectWinner('finals', 0, 1)">
                ${matchup.racer1.name}
            </div>`
        : '<div style="padding: 12px; margin: 5px 0; background: #e9ecef; border-radius: 8px; text-align: center; color: #999;">TBD</div>';

    let racer2Html = matchup.racer2
        ? `<div class="bracket-racer ${matchup.racer2.quorum} ${matchup.winner === matchup.racer2 ? 'winner' : matchup.winner ? 'loser' : 'clickable'}"
                 onclick="selectWinner('finals', 0, 2)">
                ${matchup.racer2.name}
            </div>`
        : '<div style="padding: 12px; margin: 5px 0; background: #e9ecef; border-radius: 8px; text-align: center; color: #999;">TBD</div>';

    container.innerHTML = `
        <div class="bracket-matchup">
            ${racer1Html}
            ${racer2Html}
        </div>
    `;
}

function renderChampion() {
    const container = document.getElementById('champion');

    if (!state.championship.bracket.champion) {
        container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Awaiting champion...</div>';
        return;
    }

    const champion = state.championship.bracket.champion;
    container.innerHTML = `
        <div class="champion-display">
            🏆 ${champion.name} 🏆
        </div>
    `;
}

function selectWinner(round, matchupIndex, racerNumber) {
    let matchup;

    if (round === 'quarterfinals') {
        matchup = state.championship.bracket.quarterfinals[matchupIndex];
    } else if (round === 'semifinals') {
        matchup = state.championship.bracket.semifinals[matchupIndex];
    } else if (round === 'finals') {
        matchup = state.championship.bracket.finals;
    }

    // Can't change once winner is selected
    if (matchup.winner) return;

    // Set winner
    matchup.winner = racerNumber === 1 ? matchup.racer1 : matchup.racer2;

    // Advance winner to next round
    if (round === 'quarterfinals') {
        const semiIndex = Math.floor(matchupIndex / 2);
        const position = matchupIndex % 2 === 0 ? 'racer1' : 'racer2';
        state.championship.bracket.semifinals[semiIndex][position] = matchup.winner;
    } else if (round === 'semifinals') {
        const position = matchupIndex === 0 ? 'racer1' : 'racer2';
        state.championship.bracket.finals[position] = matchup.winner;
    } else if (round === 'finals') {
        state.championship.bracket.champion = matchup.winner;
    }

    renderBracket();
    saveState();
}

// Initialize
loadState();
renderContestantsList();
updateLeaderboards();
