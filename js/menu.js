// =============================================================================
// MENU SYSTEM
// =============================================================================
// Handles main menu, player selection, and MIDI device connection

class MenuSystem {
    constructor() {
        this.currentScreen = 'main'; // 'main', 'playerSelect', 'game'
        this.selectedPlayers = 1;
        this.midiConnected = false;
        this.menuElement = null;
        this.gameElement = null;
    }

    /**
     * Initialize the menu system
     */
    initialize() {
        this.createMenuHTML();
        this.setupEventListeners();
        this.updateMIDIStatus();
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
                            <h2>👥 Player Selection</h2>
                            <div class="player-selector">
                                <label for="playerCount">Number of Players:</label>
                                <select id="playerCount" class="player-select">
                                    <option value="1">1 Player</option>
                                    <option value="2">2 Players</option>
                                    <option value="3">3 Players</option>
                                    <option value="4">4 Players</option>
                                    <option value="5">5 Players</option>
                                    <option value="6">6 Players</option>
                                    <option value="7">7 Players</option>
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
        
        for (let i = 0; i < this.selectedPlayers; i++) {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-assignment-item';
            playerDiv.innerHTML = `
                <div class="player-info">
                    <div class="player-color" style="background-color: ${TANK_COLORS[i]}"></div>
                    <div class="player-details">
                        <h3>Player ${i + 1}</h3>
                        <p>Octave ${i + 1} (Notes ${MIDI_CONFIG.OCTAVE_BASES[i]}-${MIDI_CONFIG.OCTAVE_BASES[i] + 6})</p>
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
        const aiCount = GAME_CONFIG.TOTAL_TANKS - this.selectedPlayers;
        if (aiCount > 0) {
            const aiDiv = document.createElement('div');
            aiDiv.className = 'player-assignment-item ai';
            aiDiv.innerHTML = `
                <div class="player-info">
                    <div class="player-color ai-color">🤖</div>
                    <div class="player-details">
                        <h3>AI Bots</h3>
                        <p>${aiCount} AI-controlled tanks</p>
                    </div>
                </div>
            `;
            assignmentElement.appendChild(aiDiv);
        }
    }

    /**
     * Start the game
     */
    async startGame() {
        // Hide menu
        this.menuElement.classList.add('hidden');
        
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
        
        // Initialize game
        window.game = new MultiTanksGame();
        await window.game.initialize(this.gameElement, this.selectedPlayers);
        
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
