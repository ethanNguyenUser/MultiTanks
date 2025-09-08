// =============================================================================
// MENU SYSTEM
// =============================================================================
// Handles main menu, player selection, and MIDI device connection

class MenuSystem {
    constructor() {
        this.currentScreen = 'main'; // 'main', 'playerSelect', 'game'
        this.selectedGameMode = GAME_MODES.FFA;
        this.selectedPlayers = 1;
        this.selectedAIBots = 3;
        this.midiConnected = false;
        this.menuElement = null;
        this.gameElement = null;
        this.teamAssignments = {}; // Store team assignments for TDM
    }

    /**
     * Initialize the menu system
     */
    initialize() {
        this.createMenuHTML();
        this.setupEventListeners();
        this.updateMIDIStatus();
        // Defer menu music until first user gesture (autoplay policy)
        const startMenuMusicOnce = async () => {
            if (!window.audioSystem) return;
            await window.audioSystem.resume();
            window.audioSystem.playMusic('menu.mp3');
            window.removeEventListener('pointerdown', startMenuMusicOnce);
            window.removeEventListener('keydown', startMenuMusicOnce);
        };
        window.addEventListener('pointerdown', startMenuMusicOnce, { once: true });
        window.addEventListener('keydown', startMenuMusicOnce, { once: true });
    }

    /**
     * Create the menu HTML structure
     */
    createMenuHTML() {
        const body = document.body;
        body.innerHTML = `
            <div id="menuContainer" class="menu-container">
                <div class="menu-content">
                    <h1 class="game-title">🎮 MultiTanks</h1>
                    <p class="game-subtitle">MIDI-Controlled Tank Battle</p>
                    
                    <!-- Main Menu -->
                    <div id="mainMenu" class="menu-screen active">
                        <div class="menu-section">
                            <h2>🎹 MIDI Device</h2>
                            <div class="midi-status" id="midiStatus">
                                <p>Checking MIDI support...</p>
                            </div>
                            <button id="connectMidiBtn" class="menu-btn primary">Connect MIDI Device</button>
                        </div>
                        
                        <div class="menu-section">
                            <h2>🎮 Game Mode</h2>
                            <div class="game-mode-selector">
                                <label for="gameMode">Select Game Mode:</label>
                                <select id="gameMode" class="player-select">
                                    <option value="${GAME_MODES.FFA}">Free For All (FFA)</option>
                                    <option value="${GAME_MODES.TDM}">Team Deathmatch (TDM)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="menu-section" id="playerSelectionSection">
                            <h2>👥 Player Selection</h2>
                            <div class="player-selector">
                                <label for="playerCount">Number of Players:</label>
                                <select id="playerCount" class="player-select">
                                    <option value="1">1 Player</option>
                                    <option value="2">2 Players</option>
                                    <option value="3">3 Players</option>
                                    <option value="4">4 Players</option>
                                </select>
                            </div>
                            
                            <div class="player-selector">
                                <label for="aiBotCount">Number of AI Bots:</label>
                                <select id="aiBotCount" class="player-select">
                                    <option value="0">0 AI Bots</option>
                                    <option value="1">1 AI Bot</option>
                                    <option value="2">2 AI Bots</option>
                                    <option value="3" selected>3 AI Bots</option>
                                    <option value="4">4 AI Bots</option>
                                    <option value="5">5 AI Bots</option>
                                    <option value="6">6 AI Bots</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="menu-section">
                            <h2>🎮 Controls</h2>
                            <div class="controls-info">
                                <div class="control-group">
                                    <h3>Left Hand (Movement)</h3>
                                    <div class="control-item">A# - Move Up</div>
                                    <div class="control-item">A - Move Left</div>
                                    <div class="control-item">B - Move Down</div>
                                    <div class="control-item">C - Move Right</div>
                                </div>
                                <div class="control-group">
                                    <h3>Right Hand (Turret)</h3>
                                    <div class="control-item">C# - Aim Left</div>
                                    <div class="control-item">D# - Aim Right</div>
                                    <div class="control-item">D - Shoot</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="menu-section">
                            <button id="startGameBtn" class="menu-btn start" disabled>Start Game</button>
                            <button id="audioToggleBtn" class="menu-btn secondary">🔊 Audio: ON</button>
                        </div>
                    </div>
                    
                    <!-- Player Select Screen -->
                    <div id="playerSelectScreen" class="menu-screen">
                        <h2>Player Assignment</h2>
                        <div id="playerAssignment" class="player-assignment">
                            <!-- Player assignments will be generated here -->
                        </div>
                        <button id="confirmPlayersBtn" class="menu-btn primary">Confirm & Start</button>
                        <button id="backToMainBtn" class="menu-btn secondary">Back to Main Menu</button>
                    </div>
                </div>
                
                <!-- Game Canvas (hidden initially) -->
                <canvas id="gameCanvas" class="game-canvas hidden"></canvas>
            </div>
        `;
        
        this.menuElement = document.getElementById('menuContainer');
        this.gameElement = document.getElementById('gameCanvas');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // MIDI connection
        document.getElementById('connectMidiBtn').addEventListener('click', () => {
            this.connectMIDI();
        });
        
        // Player count selection
        document.getElementById('playerCount').addEventListener('change', (e) => {
            this.selectedPlayers = parseInt(e.target.value);
            this.updateStartButton();
        });
        
        // AI bot count selection
        document.getElementById('aiBotCount').addEventListener('change', (e) => {
            this.selectedAIBots = parseInt(e.target.value);
            this.updateStartButton();
        });
        
        // Game mode selection
        document.getElementById('gameMode').addEventListener('change', (e) => {
            this.selectedGameMode = e.target.value;
            this.updatePlayerSelectionUI();
            this.updateStartButton();
        });
        
        // Start game
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.showPlayerAssignment();
        });
        
        // Confirm players
        document.getElementById('confirmPlayersBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Back to main menu
        document.getElementById('backToMainBtn').addEventListener('click', () => {
            this.showMainMenu();
        });
        
        // Audio toggle
        document.getElementById('audioToggleBtn').addEventListener('click', () => {
            this.toggleAudio();
        });
    }

    /**
     * Connect to MIDI device
     */
    async connectMIDI() {
        const statusElement = document.getElementById('midiStatus');
        const connectBtn = document.getElementById('connectMidiBtn');
        
        try {
            statusElement.innerHTML = '<p>Connecting to MIDI device...</p>';
            connectBtn.disabled = true;
            
            const success = await window.midiHandler.initialize(false); // Disable debug mode
            
            if (success) {
                this.midiConnected = true;
                statusElement.innerHTML = `
                    <p style="color: #4CAF50;">✅ Connected to ${window.midiHandler.getDeviceCount()} device(s)</p>
                    <p style="font-size: 12px; color: #ccc;">${window.midiHandler.getDeviceNames().join(', ')}</p>
                `;
                connectBtn.textContent = 'MIDI Connected';
                connectBtn.disabled = true;
                this.updateStartButton();
            } else {
                throw new Error('Failed to connect to MIDI device');
            }
        } catch (error) {
            this.midiConnected = false;
            statusElement.innerHTML = `<p style="color: #ff4444;">❌ Error: ${error.message}</p>`;
            connectBtn.disabled = false;
            this.updateStartButton();
        }
    }

    /**
     * Update MIDI status on page load
     */
    updateMIDIStatus() {
        const statusElement = document.getElementById('midiStatus');
        
        if (typeof WebMidi === 'undefined') {
            statusElement.innerHTML = '<p style="color: #ff4444;">❌ WebMidi.js not loaded</p>';
        } else {
            statusElement.innerHTML = '<p>Ready to connect MIDI device</p>';
        }
    }

    /**
     * Update start button state
     */
    updateStartButton() {
        const startBtn = document.getElementById('startGameBtn');
        startBtn.disabled = !this.midiConnected;
    }
    
    /**
     * Update player selection UI based on game mode
     */
    updatePlayerSelectionUI() {
        const playerSection = document.getElementById('playerSelectionSection');
        const playerCountSelect = document.getElementById('playerCount');
        const aiBotCountSelect = document.getElementById('aiBotCount');
        
        if (this.selectedGameMode === GAME_MODES.TDM) {
            // For TDM, ensure even number of players for balanced teams
            playerCountSelect.innerHTML = `
                <option value="2">2 Players</option>
                <option value="4">4 Players</option>
            `;
            playerCountSelect.value = this.selectedPlayers >= 2 ? this.selectedPlayers : '2';
            this.selectedPlayers = parseInt(playerCountSelect.value);
            
            // Adjust AI bot options for TDM
            aiBotCountSelect.innerHTML = `
                <option value="0">0 AI Bots</option>
                <option value="2">2 AI Bots</option>
                <option value="4">4 AI Bots</option>
                <option value="6">6 AI Bots</option>
            `;
            if (this.selectedAIBots % 2 !== 0) {
                this.selectedAIBots = Math.max(0, this.selectedAIBots - 1);
            }
            aiBotCountSelect.value = this.selectedAIBots;
        } else {
            // For FFA, restore normal options
            playerCountSelect.innerHTML = `
                <option value="1">1 Player</option>
                <option value="2">2 Players</option>
                <option value="3">3 Players</option>
                <option value="4">4 Players</option>
            `;
            playerCountSelect.value = this.selectedPlayers;
            
            aiBotCountSelect.innerHTML = `
                <option value="0">0 AI Bots</option>
                <option value="1">1 AI Bot</option>
                <option value="2">2 AI Bots</option>
                <option value="3" selected>3 AI Bots</option>
                <option value="4">4 AI Bots</option>
                <option value="5">5 AI Bots</option>
                <option value="6">6 AI Bots</option>
            `;
            aiBotCountSelect.value = this.selectedAIBots;
        }
    }

    /**
     * Show player assignment screen
     */
    showPlayerAssignment() {
        document.getElementById('mainMenu').classList.remove('active');
        document.getElementById('playerSelectScreen').classList.add('active');
        
        this.generatePlayerAssignment();
    }

    /**
     * Generate player assignment display
     */
    generatePlayerAssignment() {
        const assignmentElement = document.getElementById('playerAssignment');
        assignmentElement.innerHTML = '';
        
        // Initialize team assignments
        this.teamAssignments = {};
        
        for (let i = 0; i < this.selectedPlayers; i++) {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-assignment-item';
            
            // Default team assignment for TDM
            if (this.selectedGameMode === GAME_MODES.TDM) {
                this.teamAssignments[i] = i % 2 === 0 ? 'red' : 'blue';
            }
            
            const teamSelectHTML = this.selectedGameMode === GAME_MODES.TDM ? `
                <div class="team-selection">
                    <label>Team:</label>
                    <select class="team-select" data-player="${i}">
                        <option value="red" ${this.teamAssignments[i] === 'red' ? 'selected' : ''}>Red Team</option>
                        <option value="blue" ${this.teamAssignments[i] === 'blue' ? 'selected' : ''}>Blue Team</option>
                    </select>
                </div>
            ` : '';
            
            playerDiv.innerHTML = `
                <div class="player-info">
                    <div class="player-color" style="background-color: ${this.selectedGameMode === GAME_MODES.TDM ? GAME_CONFIG.TEAM_COLORS[this.teamAssignments[i].toUpperCase()] : TANK_COLORS[i]}"></div>
                    <div class="player-details">
                        <h3>Player ${i + 1}</h3>
                        <p>Octave ${i + 1} (Notes ${MIDI_CONFIG.OCTAVE_BASES[i]}-${MIDI_CONFIG.OCTAVE_BASES[i] + 6})</p>
                        ${teamSelectHTML}
                        <div class="player-controls">
                            <div class="control-note">A# (${getNoteForPlayer(i, 'A_SHARP')}) - Up</div>
                            <div class="control-note">A (${getNoteForPlayer(i, 'A')}) - Left</div>
                            <div class="control-note">B (${getNoteForPlayer(i, 'B')}) - Down</div>
                            <div class="control-note">C (${getNoteForPlayer(i, 'C')}) - Right</div>
                            <div class="control-note">C# (${getNoteForPlayer(i, 'C_SHARP')}) - Aim Left</div>
                            <div class="control-note">D# (${getNoteForPlayer(i, 'D_SHARP')}) - Aim Right</div>
                            <div class="control-note">D (${getNoteForPlayer(i, 'D')}) - Shoot</div>
                        </div>
                    </div>
                </div>
            `;
            assignmentElement.appendChild(playerDiv);
        }
        
        // Show AI info
        if (this.selectedAIBots > 0) {
            const aiDiv = document.createElement('div');
            aiDiv.className = 'player-assignment-item ai';
            
            const aiTeamSelectHTML = this.selectedGameMode === GAME_MODES.TDM ? `
                <div class="ai-team-selection">
                    <label>AI Team Distribution:</label>
                    <div class="ai-team-distribution">
                        <div class="team-dist">
                            <label>Red Team AIs:</label>
                            <input type="number" id="redAICount" min="0" max="${this.selectedAIBots}" value="${Math.floor(this.selectedAIBots / 2)}" class="ai-count-input">
                        </div>
                        <div class="team-dist">
                            <label>Blue Team AIs:</label>
                            <input type="number" id="blueAICount" min="0" max="${this.selectedAIBots}" value="${Math.ceil(this.selectedAIBots / 2)}" class="ai-count-input">
                        </div>
                    </div>
                </div>
            ` : '';
            
            aiDiv.innerHTML = `
                <div class="player-info">
                    <div class="player-color ai-color">🤖</div>
                    <div class="player-details">
                        <h3>AI Bots</h3>
                        <p>${this.selectedAIBots} AI-controlled tanks</p>
                        ${aiTeamSelectHTML}
                    </div>
                </div>
            `;
            assignmentElement.appendChild(aiDiv);
        }
        
        // Add event listeners for team selection
        if (this.selectedGameMode === GAME_MODES.TDM) {
            this.setupTeamSelectionListeners();
        }
    }
    
    /**
     * Setup team selection event listeners
     */
    setupTeamSelectionListeners() {
        // Player team selection
        document.querySelectorAll('.team-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const playerIndex = parseInt(e.target.dataset.player);
                this.teamAssignments[playerIndex] = e.target.value;
                
                // Update player color
                const playerDiv = e.target.closest('.player-assignment-item');
                const colorDiv = playerDiv.querySelector('.player-color');
                colorDiv.style.backgroundColor = GAME_CONFIG.TEAM_COLORS[e.target.value.toUpperCase()];
            });
        });
        
        // AI team distribution
        const redAICount = document.getElementById('redAICount');
        const blueAICount = document.getElementById('blueAICount');
        
        if (redAICount && blueAICount) {
            const updateAIDistribution = () => {
                const redCount = parseInt(redAICount.value) || 0;
                const blueCount = parseInt(blueAICount.value) || 0;
                const total = redCount + blueCount;
                
                if (total > this.selectedAIBots) {
                    // Adjust to not exceed total
                    if (redCount > blueCount) {
                        redAICount.value = this.selectedAIBots - blueCount;
                    } else {
                        blueAICount.value = this.selectedAIBots - redCount;
                    }
                }
            };
            
            redAICount.addEventListener('input', updateAIDistribution);
            blueAICount.addEventListener('input', updateAIDistribution);
        }
    }

    /**
     * Start the game
     */
    async startGame() {
        // Hide menu
        this.menuElement.classList.add('hidden');
        // Stop menu music before starting game
        if (window.audioSystem) {
            window.audioSystem.stopMusic();
        }
        
        // Create a new canvas element dynamically to ensure it's properly rendered
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'gameCanvas';
        newCanvas.className = 'game-canvas';
        newCanvas.width = window.innerWidth;
        newCanvas.height = window.innerHeight;
        newCanvas.style.width = window.innerWidth + 'px';
        newCanvas.style.height = window.innerHeight + 'px';
        
        // Remove old canvas if it exists
        const oldCanvas = document.getElementById('gameCanvas');
        if (oldCanvas) {
            oldCanvas.remove();
        }
        
        // Add new canvas to body
        document.body.appendChild(newCanvas);
        this.gameElement = newCanvas;
        
        // Force a reflow
        newCanvas.offsetHeight;
        
        // Get AI team distribution for TDM
        let aiTeamDistribution = null;
        if (this.selectedGameMode === GAME_MODES.TDM) {
            const redAICount = document.getElementById('redAICount');
            const blueAICount = document.getElementById('blueAICount');
            if (redAICount && blueAICount) {
                aiTeamDistribution = {
                    red: parseInt(redAICount.value) || 0,
                    blue: parseInt(blueAICount.value) || 0
                };
            }
        }
        
        // Initialize game
        window.game = new MultiTanksGame();
        await window.game.initialize(this.gameElement, this.selectedPlayers, this.selectedAIBots, this.selectedGameMode, this.teamAssignments, aiTeamDistribution);
        
        this.currentScreen = 'game';
    }

    /**
     * Show main menu
     */
    showMainMenu() {
        document.getElementById('playerSelectScreen').classList.remove('active');
        document.getElementById('mainMenu').classList.add('active');
        this.currentScreen = 'main';
    }

    /**
     * Toggle audio on/off
     */
    toggleAudio() {
        if (window.audioSystem) {
            const enabled = window.audioSystem.toggle();
            const button = document.getElementById('audioToggleBtn');
            button.textContent = enabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
        }
    }

    /**
     * Return to menu from game
     */
    returnToMenu() {
        if (window.game) {
            window.game.stop();
            window.game = null;
        }
        
        // Remove the canvas element
        if (this.gameElement) {
            this.gameElement.remove();
        }
        
        this.menuElement.classList.remove('hidden');
        this.showMainMenu();
    }
}

// =============================================================================
// CSS STYLES
// =============================================================================
const menuStyles = `
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: #ffffff;
            overflow: hidden;
            margin: 0;
            padding: 0;
        }
        
        .menu-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999;
        }
        
        .menu-content {
            background: rgba(0, 0, 0, 0.8);
            border-radius: 20px;
            padding: 40px;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        
        .game-title {
            font-size: 3em;
            color: #4CAF50;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .game-subtitle {
            font-size: 1.2em;
            color: #ccc;
            margin-bottom: 30px;
        }
        
        .menu-screen {
            display: none;
        }
        
        .menu-screen.active {
            display: block;
        }
        
        .menu-section {
            margin: 30px 0;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .menu-section h2 {
            color: #4CAF50;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        
        .midi-status {
            margin: 15px 0;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
        }
        
        .menu-btn {
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
            min-width: 150px;
        }
        
        .menu-btn.primary {
            background: #4CAF50;
            color: white;
        }
        
        .menu-btn.primary:hover:not(:disabled) {
            background: #45a049;
            transform: translateY(-2px);
        }
        
        .menu-btn.secondary {
            background: #666;
            color: white;
        }
        
        .menu-btn.secondary:hover {
            background: #777;
        }
        
        .menu-btn.start {
            background: #FF6B6B;
            color: white;
            font-size: 18px;
            padding: 20px 40px;
        }
        
        .menu-btn.start:hover:not(:disabled) {
            background: #ff5252;
            transform: translateY(-2px);
        }
        
        .menu-btn:disabled {
            background: #333;
            color: #666;
            cursor: not-allowed;
        }
        
        .player-selector {
            margin: 15px 0;
        }
        
        .player-selector label {
            display: block;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .player-select {
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #666;
            background: #333;
            color: white;
            font-size: 16px;
        }
        
        .controls-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        
        .control-group h3 {
            color: #4CAF50;
            margin-bottom: 10px;
        }
        
        .control-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 8px;
            margin: 5px 0;
            border-radius: 5px;
            font-family: monospace;
        }
        
        .player-assignment {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .player-assignment-item {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .player-assignment-item.ai {
            border-color: #FF9800;
        }
        
        .player-info {
            display: flex;
            align-items: flex-start;
            gap: 15px;
        }
        
        .player-color {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
        .ai-color {
            background: #FF9800;
        }
        
        .player-details h3 {
            color: #4CAF50;
            margin-bottom: 5px;
        }
        
        .player-details p {
            color: #ccc;
            margin-bottom: 10px;
        }
        
        .player-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
        }
        
        .control-note {
            background: rgba(0, 0, 0, 0.3);
            padding: 5px;
            border-radius: 3px;
            font-size: 12px;
            font-family: monospace;
        }
        
        .game-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw !important;
            height: 100vh !important;
            display: block !important;
            background-color: #2d5016;
            z-index: 1000;
            border: none;
            outline: none;
        }
        
        .hidden {
            display: none !important;
        }
        
        @media (max-width: 768px) {
            .menu-content {
                padding: 20px;
                width: 95%;
            }
            
            .game-title {
                font-size: 2em;
            }
            
            .controls-info {
                grid-template-columns: 1fr;
            }
            
            .player-assignment {
                grid-template-columns: 1fr;
            }
        }
    </style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', menuStyles);

// =============================================================================
// GLOBAL MENU INSTANCE
// =============================================================================
window.menu = new MenuSystem();
