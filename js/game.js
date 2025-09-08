// =============================================================================
// MULTITANKS GAME ENGINE
// =============================================================================
// Main game logic, rendering, and state management

class MultiTanksGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = GAME_STATES.MENU;
        this.tanks = [];
        this.bullets = [];
        this.obstacles = [];
        this.players = [];
        this.aiBots = [];
        this.powerups = [];
        this.lastTime = 0;
        this.animationId = null;
        this.powerupSpawnTimer = 0;
        
        // Game settings
        this.numPlayers = 1;
        this.numAIBots = 3;
        this.gameMode = GAME_MODES.FFA;
        this.isPaused = false;
        this.gameStartTime = 0;
        this.gameEndTime = 0;
        
        // Team settings
        this.teams = {
            red: [],
            blue: []
        };
        
        // Statistics tracking
        this.playerStats = new Map();
        
        // Input tracking
        this.activeControls = new Map(); // Track which controls are currently pressed
        
        // Helper modules
        this.renderer = null;
        this.powerupsManager = null;
        this.collisions = null;
    }

    /**
     * Initialize the game
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {number} numPlayers - Number of human players (1-4)
     * @param {number} numAIBots - Number of AI bots (0-6)
     * @param {string} gameMode - Game mode (FFA or TDM)
     * @param {Object} teamAssignments - Player team assignments for TDM
     * @param {Object} aiTeamDistribution - AI team distribution for TDM
     */
    async initialize(canvas, numPlayers = 1, numAIBots = 3, gameMode = GAME_MODES.FFA, teamAssignments = {}, aiTeamDistribution = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.numPlayers = Math.max(GAME_CONFIG.MIN_PLAYERS, Math.min(GAME_CONFIG.MAX_PLAYERS, numPlayers));
        this.numAIBots = Math.max(GAME_CONFIG.MIN_AI_BOTS, Math.min(GAME_CONFIG.MAX_AI_BOTS, numAIBots));
        this.gameMode = gameMode;
        this.teamAssignments = teamAssignments;
        this.aiTeamDistribution = aiTeamDistribution;
        this.gameStartTime = Date.now();
        
        // Ensure total doesn't exceed maximum
        const totalTanks = this.numPlayers + this.numAIBots;
        if (totalTanks > GAME_CONFIG.MAX_TOTAL_TANKS) {
            this.numAIBots = GAME_CONFIG.MAX_TOTAL_TANKS - this.numPlayers;
        }
        
        // Set canvas size - use actual window dimensions
        const actualWidth = window.innerWidth;
        const actualHeight = window.innerHeight;
        
        this.canvas.width = actualWidth;
        this.canvas.height = actualHeight;
        
        // Update game config with actual dimensions
        GAME_CONFIG.MAP_WIDTH = actualWidth;
        GAME_CONFIG.MAP_HEIGHT = actualHeight;
        
        // Initialize game objects
        this.initializeTanks();
        this.generateObstacles();
        this.setupMIDIInput();
        
        // Initialize AI behavior system
        window.aiBehavior = new AIBehavior(this);
        
        // Initialize helper modules
        this.renderer = new GameRenderer(this);
        this.powerupsManager = new GamePowerups(this);
        this.collisions = new GameCollisions(this);
        
        // Start game loop
        this.gameState = GAME_STATES.PLAYING;
        this.lastTime = performance.now();
        this.gameLoop();
        
        // Start background music based on mode
        if (window.audioSystem) {
            const track = this.gameMode === GAME_MODES.TDM ? 'tdm.mp3' : 'ffa.mp3';
            window.audioSystem.playMusic(track, true);
            window.audioSystem.gameStart();
        }
    }

    /**
     * Initialize tanks (players + AI bots)
     */
    initializeTanks() {
        this.tanks = [];
        this.players = [];
        this.aiBots = [];
        
        // Calculate spawn positions around the map edges
        const spawnPositions = this.calculateSpawnPositions();
        
        // Create human players
        for (let i = 0; i < this.numPlayers; i++) {
            const tank = this.createTank(spawnPositions[i], i, false); // false = human player
            this.tanks.push(tank);
            this.players.push(tank);
        }
        
        // Create AI bots
        for (let i = this.numPlayers; i < this.numPlayers + this.numAIBots; i++) {
            const tank = this.createTank(spawnPositions[i], i, true); // true = AI bot
            this.tanks.push(tank);
            this.aiBots.push(tank);
        }
    }

    /**
     * Calculate spawn positions around map edges
     * @returns {Array<Object>} Array of spawn positions
     */
    calculateSpawnPositions() {
        const positions = [];
        const edge = GAME_CONFIG.SPAWN_DISTANCE_FROM_EDGE;
        const width = GAME_CONFIG.MAP_WIDTH;
        const height = GAME_CONFIG.MAP_HEIGHT;
        const totalTanks = this.numPlayers + this.numAIBots;
        
        if (this.gameMode === GAME_MODES.TDM) {
            // TDM mode: Red team on left, Blue team on right
            const redTanks = [];
            const blueTanks = [];
            
            // Collect team assignments
            for (let i = 0; i < this.numPlayers; i++) {
                const team = this.teamAssignments[i] || (i % 2 === 0 ? 'red' : 'blue');
                if (team === 'red') {
                    redTanks.push(i);
                } else {
                    blueTanks.push(i);
                }
            }
            
            // Add AI tanks to teams
            if (this.aiTeamDistribution) {
                for (let i = 0; i < this.aiTeamDistribution.red; i++) {
                    redTanks.push(this.numPlayers + i);
                }
                for (let i = 0; i < this.aiTeamDistribution.blue; i++) {
                    blueTanks.push(this.numPlayers + this.aiTeamDistribution.red + i);
                }
            } else {
                // Default AI distribution
                const redAICount = Math.floor(this.numAIBots / 2);
                const blueAICount = Math.ceil(this.numAIBots / 2);
                for (let i = 0; i < redAICount; i++) {
                    redTanks.push(this.numPlayers + i);
                }
                for (let i = 0; i < blueAICount; i++) {
                    blueTanks.push(this.numPlayers + redAICount + i);
                }
            }
            
            // Generate positions for red team (left side)
            const leftPositions = this.generateSidePositions('left', redTanks.length, edge, width, height);
            redTanks.forEach((tankIndex, i) => {
                positions[tankIndex] = leftPositions[i];
            });
            
            // Generate positions for blue team (right side)
            const rightPositions = this.generateSidePositions('right', blueTanks.length, edge, width, height);
            blueTanks.forEach((tankIndex, i) => {
                positions[tankIndex] = rightPositions[i];
            });
            
            return positions;
        } else {
            // FFA mode: Use original logic
            if (totalTanks <= 4) {
                const cornerPositions = [
                    { x: edge, y: edge }, // Top-left
                    { x: width - edge, y: edge }, // Top-right
                    { x: width - edge, y: height - edge }, // Bottom-right
                    { x: edge, y: height - edge }, // Bottom-left
                ];
                
                for (let i = 0; i < totalTanks; i++) {
                    positions.push(cornerPositions[i]);
                }
                
                return positions;
            }
            
            // For more tanks, distribute around perimeter
            const perimeterPoints = [];
            
            // Top edge (left to right)
            for (let x = edge; x <= width - edge; x += 20) {
                perimeterPoints.push({ x, y: edge });
            }
            
            // Right edge (top to bottom)
            for (let y = edge; y <= height - edge; y += 20) {
                perimeterPoints.push({ x: width - edge, y });
            }
            
            // Bottom edge (right to left)
            for (let x = width - edge; x >= edge; x -= 20) {
                perimeterPoints.push({ x, y: height - edge });
            }
            
            // Left edge (bottom to top)
            for (let y = height - edge; y >= edge; y -= 20) {
                perimeterPoints.push({ x: edge, y });
            }
            
            // Select equidistant points from the perimeter
            const step = Math.floor(perimeterPoints.length / totalTanks);
            for (let i = 0; i < totalTanks; i++) {
                const index = (i * step) % perimeterPoints.length;
                positions.push(perimeterPoints[index]);
            }
            
            return positions;
        }
    }
    
    /**
     * Generate spawn positions for one side of the map
     * @param {string} side - 'left' or 'right'
     * @param {number} count - Number of tanks for this side
     * @param {number} edge - Distance from edge
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {Array<Object>} Array of positions
     */
    generateSidePositions(side, count, edge, width, height) {
        const positions = [];
        
        if (side === 'left') {
            // Left side positions
            const leftX = edge;
            const spacing = (height - 2 * edge) / Math.max(1, count - 1);
            
            for (let i = 0; i < count; i++) {
                positions.push({
                    x: leftX,
                    y: edge + (i * spacing)
                });
            }
        } else {
            // Right side positions
            const rightX = width - edge;
            const spacing = (height - 2 * edge) / Math.max(1, count - 1);
            
            for (let i = 0; i < count; i++) {
                positions.push({
                    x: rightX,
                    y: edge + (i * spacing)
                });
            }
        }
        
        return positions;
    }

    /**
     * Create a tank object
     * @param {Object} position - Spawn position
     * @param {number} playerIndex - Player index (0-7)
     * @param {boolean} isAI - Whether this is an AI bot
     * @returns {Object} Tank object
     */
    createTank(position, playerIndex, isAI, team = null) {
        // Determine team for TDM mode
        let tankTeam = null;
        let tankColor = TANK_COLORS[playerIndex % TANK_COLORS.length];
        let name = isAI ? `Bot ${playerIndex - this.numPlayers + 1}` : `Player ${playerIndex + 1}`;
        
        if (this.gameMode === GAME_MODES.TDM) {
            if (isAI) {
                // For AI, determine team based on distribution
                const aiIndex = playerIndex - this.numPlayers;
                let redAICount = 0;
                let blueAICount = 0;
                
                if (this.aiTeamDistribution) {
                    redAICount = this.aiTeamDistribution.red;
                    blueAICount = this.aiTeamDistribution.blue;
                } else {
                    // Default distribution
                    redAICount = Math.floor(this.numAIBots / 2);
                    blueAICount = Math.ceil(this.numAIBots / 2);
                }
                
                tankTeam = aiIndex < redAICount ? 'red' : 'blue';
            } else {
                // For players, use custom assignment or default
                tankTeam = this.teamAssignments[playerIndex] || (playerIndex % 2 === 0 ? 'red' : 'blue');
            }
            tankColor = GAME_CONFIG.TEAM_COLORS[tankTeam.toUpperCase()];
        }
        
        const tank = {
            id: playerIndex,
            x: position.x,
            y: position.y,
            angle: Math.random() * Math.PI * 2, // Random initial rotation
            turretAngle: 0,
            health: GAME_CONFIG.TANK_HEALTH,
            maxHealth: GAME_CONFIG.TANK_HEALTH,
            color: tankColor,
            isAI: isAI,
            team: tankTeam,
            name: name,
            lastShot: 0,
            size: GAME_CONFIG.TANK_SIZE,
            speed: GAME_CONFIG.TANK_SPEED,
            turretLength: GAME_CONFIG.TURRET_LENGTH,
            turretRotationSpeed: GAME_CONFIG.TURRET_ROTATION_SPEED,
            isAlive: true,
            
            // Statistics
            shotsFired: 0,
            shotsHit: 0,
            kills: 0,
            deaths: 0,
            timeAlive: 0,
            deathTime: 0,
            killedBy: null,
            
            // Powerups (arrays for stacking)
            powerups: {
                invincibility: [],
                speed: [],
                rapidFire: [],
                spreadShot: [],
                bouncingBullets: []
            },
            
            // AI-specific properties
            aiTarget: null,
            aiState: 'patrol', // 'patrol', 'chase', 'attack'
            aiTimer: 0,
            aiDirection: Math.random() * Math.PI * 2,
            aiOrbitDirection: Math.random() < 0.5 ? 1 : -1, // 1 for clockwise, -1 for counterclockwise
            aiOrbitAngle: 0, // Current orbit angle around target
            aiRetreatEndTime: 0, // When to stop retreating
            aiLastTargetX: 0, // Last known target X position for movement tracking
            aiLastTargetY: 0, // Last known target Y position for movement tracking
            aiTargetVelocityX: 0, // Target's X velocity
            aiTargetVelocityY: 0, // Target's Y velocity
            aiPowerupChaseStartTime: 0, // When AI started chasing current powerup
            aiCurrentPowerupId: null, // ID of powerup currently being chased
            aiPowerupCooldownEndTime: 0 // When AI can start chasing powerups again
        };
        
        // Add to team if TDM
        if (tankTeam) {
            this.teams[tankTeam].push(tank);
        }
        
        // Initialize statistics
        this.playerStats.set(tank.id, {
            name: tank.name,
            isAI: tank.isAI,
            team: tank.team,
            shotsFired: 0,
            shotsHit: 0,
            kills: 0,
            deaths: 0,
            timeAlive: 0,
            deathTime: 0,
            killedBy: null,
            killsList: [],
            killedByList: [],
            powerupsCollected: 0
        });
        
        return tank;
    }

    /**
     * Generate random obstacles on the map
     */
    generateObstacles() {
        this.obstacles = [];
        const numObstacles = Math.floor(Math.random() * (GAME_CONFIG.MAX_OBSTACLES - GAME_CONFIG.MIN_OBSTACLES + 1)) + GAME_CONFIG.MIN_OBSTACLES;
        
        for (let i = 0; i < numObstacles; i++) {
            let obstacle;
            let attempts = 0;
            const maxAttempts = GAME_CONFIG.AI_OBSTACLE_GENERATION_MAX_ATTEMPTS;
            
            do {
                obstacle = this.generateRandomObstacle();
                attempts++;
            } while (this.obstacleCollidesWithTanks(obstacle) && attempts < maxAttempts);
            
            if (attempts < maxAttempts) {
                this.obstacles.push(obstacle);
            }
        }
    }

    /**
     * Generate a random obstacle
     * @returns {Object} Obstacle object
     */
    generateRandomObstacle() {
        const isRock = Math.random() < 0.6; // 60% chance for rock
        const grayColor = '#696969'; // Same gray color for all obstacles
        
        if (isRock) {
            const size = Math.random() * (GAME_CONFIG.ROCK_SIZE_MAX - GAME_CONFIG.ROCK_SIZE_MIN) + GAME_CONFIG.ROCK_SIZE_MIN;
            return {
                type: 'rock',
                x: Math.random() * (GAME_CONFIG.MAP_WIDTH - size) + size / 2,
                y: Math.random() * (GAME_CONFIG.MAP_HEIGHT - size) + size / 2,
                radius: size / 2,
                color: grayColor
            };
        } else {
            const width = Math.random() * (GAME_CONFIG.RECTANGLE_WIDTH_MAX - GAME_CONFIG.RECTANGLE_WIDTH_MIN) + GAME_CONFIG.RECTANGLE_WIDTH_MIN;
            const height = Math.random() * (GAME_CONFIG.RECTANGLE_HEIGHT_MAX - GAME_CONFIG.RECTANGLE_HEIGHT_MIN) + GAME_CONFIG.RECTANGLE_HEIGHT_MIN;
            return {
                type: 'rectangle',
                x: Math.random() * (GAME_CONFIG.MAP_WIDTH - width) + width / 2,
                y: Math.random() * (GAME_CONFIG.MAP_HEIGHT - height) + height / 2,
                width: width,
                height: height,
                color: grayColor
            };
        }
    }

    /**
     * Check if obstacle collides with any tank spawn positions
     * @param {Object} obstacle - Obstacle to check
     * @returns {boolean} True if collision detected
     */
    obstacleCollidesWithTanks(obstacle) {
        const spawnPositions = this.calculateSpawnPositions();
        const minDistance = GAME_CONFIG.TANK_SIZE * 2;
        
        for (const pos of spawnPositions) {
            let distance;
            
            if (obstacle.type === 'rock') {
                distance = Math.sqrt((pos.x - obstacle.x) ** 2 + (pos.y - obstacle.y) ** 2);
                if (distance < obstacle.radius + minDistance) {
                    return true;
                }
            } else {
                // Rectangle collision check
                const dx = Math.abs(pos.x - obstacle.x);
                const dy = Math.abs(pos.y - obstacle.y);
                if (dx < (obstacle.width / 2 + minDistance) && dy < (obstacle.height / 2 + minDistance)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Setup MIDI input handling
     */
    setupMIDIInput() {
        if (window.midiHandler) {
            // Listen for all control events
            window.midiHandler.onControl('all', (controlEvent) => {
                this.handleMIDIControl(controlEvent);
            });
        }
    }

    /**
     * Handle MIDI control input
     * @param {Object} controlEvent - Control event from MIDI handler
     */
    handleMIDIControl(controlEvent) {
        const { playerIndex, control, isPressed } = controlEvent;
        
        // Only handle controls for human players
        if (playerIndex >= this.numPlayers) {
            return;
        }
        
        const tank = this.players[playerIndex];
        if (!tank || !tank.isAlive) {
            return;
        }
        
        // Track active controls
        const controlKey = `${playerIndex}-${control}`;
        if (isPressed) {
            this.activeControls.set(controlKey, controlEvent);
        } else {
            this.activeControls.delete(controlKey);
        }
    }

    /**
     * Update game state
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (this.isPaused) return;
        
        this.updateTanks(deltaTime);
        this.updateBullets(deltaTime);
        this.updatePowerups(deltaTime);
        this.checkCollisions();
        this.updateAI(deltaTime);
        this.checkGameEnd();
    }

    /**
     * Update powerups
     * @param {number} deltaTime - Time since last frame
     */
    updatePowerups(deltaTime) {
        if (this.powerupsManager) {
            this.powerupsManager.update(deltaTime);
        }
    }
    
    /**
     * Spawn a new powerup
     */
    spawnPowerup() {
        const powerupTypes = Object.keys(GAME_CONFIG.POWERUP_TYPES);
        const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        
        // Find a valid spawn position
        let attempts = 0;
        let position = null;
        
        while (attempts < 50) {
            const x = GAME_CONFIG.SPAWN_DISTANCE_FROM_EDGE + 
                Math.random() * (GAME_CONFIG.MAP_WIDTH - 2 * GAME_CONFIG.SPAWN_DISTANCE_FROM_EDGE);
            const y = GAME_CONFIG.SPAWN_DISTANCE_FROM_EDGE + 
                Math.random() * (GAME_CONFIG.MAP_HEIGHT - 2 * GAME_CONFIG.SPAWN_DISTANCE_FROM_EDGE);
            
            // Check if position is clear of obstacles and tanks
            let valid = true;
            
            // Check obstacles
            for (const obstacle of this.obstacles) {
                if (obstacle.type === 'rock') {
                    // Circular obstacle
                    const distance = Math.sqrt((x - obstacle.x) ** 2 + (y - obstacle.y) ** 2);
                    if (distance < obstacle.size + GAME_CONFIG.POWERUP_SIZE) {
                        valid = false;
                        break;
                    }
                } else {
                    // Rectangular obstacle
                    const powerupLeft = x - GAME_CONFIG.POWERUP_SIZE;
                    const powerupRight = x + GAME_CONFIG.POWERUP_SIZE;
                    const powerupTop = y - GAME_CONFIG.POWERUP_SIZE;
                    const powerupBottom = y + GAME_CONFIG.POWERUP_SIZE;
                    
                    const obstacleLeft = obstacle.x;
                    const obstacleRight = obstacle.x + obstacle.width;
                    const obstacleTop = obstacle.y;
                    const obstacleBottom = obstacle.y + obstacle.height;
                    
                    // Check if powerup rectangle overlaps with obstacle rectangle
                    if (powerupLeft < obstacleRight && powerupRight > obstacleLeft &&
                        powerupTop < obstacleBottom && powerupBottom > obstacleTop) {
                        valid = false;
                        break;
                    }
                }
            }
            
            // Check tanks
            if (valid) {
                for (const tank of this.tanks) {
                    const distance = Math.sqrt((x - tank.x) ** 2 + (y - tank.y) ** 2);
                    if (distance < tank.size + GAME_CONFIG.POWERUP_SIZE) {
                        valid = false;
                        break;
                    }
                }
            }
            
            if (valid) {
                position = { x, y };
                break;
            }
            
            attempts++;
        }
        
        if (position) {
            this.powerups.push({
                id: Date.now() + Math.random(), // Unique ID for tracking
                x: position.x,
                y: position.y,
                type: randomType,
                size: GAME_CONFIG.POWERUP_SIZE,
                alive: true,
                rotation: 0
            });
        }
    }
    
    /**
     * Apply a powerup to a tank
     * @param {Object} tank - Tank to apply powerup to
     * @param {string} powerupType - Type of powerup to apply
     */
    applyPowerup(tank, powerupType) {
        switch (powerupType) {
            case 'HEALTH':
                tank.health = Math.min(tank.maxHealth, tank.health + GAME_CONFIG.POWERUP_HEALTH_BOOST);
                break;
            case 'INVINCIBILITY':
                // Add 10 seconds to invincibility timer
                tank.powerups.invincibility.push(GAME_CONFIG.POWERUP_DURATION);
                break;
            case 'SPEED':
                // Add 10 seconds to speed timer
                tank.powerups.speed.push(GAME_CONFIG.POWERUP_DURATION);
                break;
            case 'RAPID_FIRE':
                // Add 10 seconds to rapid fire timer
                tank.powerups.rapidFire.push(GAME_CONFIG.POWERUP_DURATION);
                break;
            case 'SPREAD_SHOT':
                // Add 10 seconds to spread shot timer
                tank.powerups.spreadShot.push(GAME_CONFIG.POWERUP_DURATION);
                break;
            case 'BOUNCING_BULLETS':
                // Add 10 seconds to bouncing bullets timer
                tank.powerups.bouncingBullets.push(GAME_CONFIG.POWERUP_DURATION);
                break;
        }
        
        // Play powerup sound
        if (window.audioSystem) {
            window.audioSystem.powerUp();
        }
    }

    /**
     * Update all tanks
     * @param {number} deltaTime - Time since last frame
     */
    updateTanks(deltaTime) {
        this.tanks.forEach(tank => {
            if (!tank.isAlive) return;
            
            // Apply speed powerup (stacking)
            const speedStacks = tank.powerups.speed.length;
            const speedMultiplier = speedStacks > 0 ? Math.pow(GAME_CONFIG.POWERUP_SPEED_MULTIPLIER, speedStacks) : 1;
            const originalSpeed = tank.speed;
            tank.speed = originalSpeed * speedMultiplier;
            
            if (tank.isAI) {
                window.aiBehavior.updateAITank(tank, deltaTime);
            } else {
                this.updatePlayerTank(tank, deltaTime);
            }
            
            // Restore original speed
            tank.speed = originalSpeed;
            
            // Keep tank within map bounds
            if (this.collisions) {
                this.collisions.constrainTankToMap(tank);
            } else {
                this.constrainTankToMap(tank);
            }
        });
    }

    /**
     * Update player tank based on active controls
     * @param {Object} tank - Tank to update
     * @param {number} deltaTime - Time since last frame
     */
    updatePlayerTank(tank, deltaTime) {
        const playerIndex = tank.id;
        
        // Check for movement controls
        const moveUp = this.activeControls.has(`${playerIndex}-A_SHARP`);
        const moveLeft = this.activeControls.has(`${playerIndex}-A`);
        const moveDown = this.activeControls.has(`${playerIndex}-B`);
        const moveRight = this.activeControls.has(`${playerIndex}-C`);
        
        // Check for turret controls
        const aimLeft = this.activeControls.has(`${playerIndex}-C_SHARP`);
        const aimRight = this.activeControls.has(`${playerIndex}-D_SHARP`);
        const shoot = this.activeControls.has(`${playerIndex}-D`);
        
        // Handle movement with diagonal support
        let moveX = 0;
        let moveY = 0;
        
        if (moveUp) moveY -= 1;
        if (moveDown) moveY += 1;
        if (moveLeft) moveX -= 1;
        if (moveRight) moveX += 1;
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
        }
        
        // Update tank angle based on movement direction
        if (moveX !== 0 || moveY !== 0) {
            const moveAngle = Math.atan2(moveY, moveX);
            
            // Move tank with sliding
            const newX = tank.x + moveX * tank.speed;
            const newY = tank.y + moveY * tank.speed;
            
            // Use sliding movement system
            if (this.collisions) {
                this.collisions.moveTankWithSliding(tank, newX, newY, moveAngle);
            } else {
                this.moveTankWithSliding(tank, newX, newY, moveAngle);
            }
        }
        
        // Handle turret rotation
        if (aimLeft) {
            tank.turretAngle -= tank.turretRotationSpeed;
        }
        if (aimRight) {
            tank.turretAngle += tank.turretRotationSpeed;
        }
        
        // Handle shooting
        if (shoot) {
            // Apply rapid fire powerup (stacking) for player
            const rapidFireStacks = tank.powerups.rapidFire.length;
            const fireRateMultiplier = rapidFireStacks > 0 ? Math.pow(GAME_CONFIG.POWERUP_FIRE_RATE_MULTIPLIER, rapidFireStacks) : 1;
            const cooldown = GAME_CONFIG.SHOOT_COOLDOWN / fireRateMultiplier;
            
            if (Date.now() - tank.lastShot > cooldown) {
                this.shootBullet(tank);
                tank.lastShot = Date.now();
                
                // Play shoot sound
                if (window.audioSystem) {
                    window.audioSystem.shoot();
                }
            }
        }
    }



    /**
     * Move tank with obstacle sliding
     * @param {Object} tank - Tank to move
     * @param {number} newX - Desired X position
     * @param {number} newY - Desired Y position
     * @param {number} moveAngle - Movement angle
     */
    moveTankWithSliding(tank, newX, newY, moveAngle) {
        if (this.collisions) {
            this.collisions.moveTankWithSliding(tank, newX, newY, moveAngle);
        }
    }


    /**
     * Update AI behavior
     * @param {number} deltaTime - Time since last frame
     */
    updateAI(deltaTime) {
        // AI logic can be expanded here
        // For now, basic behavior is handled in updateAITank
    }

    /**
     * Update all bullets
     * @param {number} deltaTime - Time since last frame
     */
    updateBullets(deltaTime) {
        this.bullets = this.bullets.filter(bullet => {
            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;

            let bounced = false;
            const radius = bullet.size / 2;

            // Left or right walls
            if (bullet.x < radius || bullet.x > GAME_CONFIG.MAP_WIDTH - radius) {
                if (bullet.bounces > 0) {
                    bullet.angle = Math.PI - bullet.angle;
                    bullet.bounces--;
                    bounced = true;
                    bullet.x = Math.max(radius, Math.min(GAME_CONFIG.MAP_WIDTH - radius, bullet.x));
                } else {
                    return false; // remove
                }
            }

            // Top or bottom walls
            if (bullet.y < radius || bullet.y > GAME_CONFIG.MAP_HEIGHT - radius) {
                if (bullet.bounces > 0 || bounced) { // allow bounce if already bounced this step on X
                    if (!bounced) bullet.bounces--;
                    bullet.angle = -bullet.angle;
                    bullet.y = Math.max(radius, Math.min(GAME_CONFIG.MAP_HEIGHT - radius, bullet.y));
                } else {
                    return false; // remove
                }
            }

            return true;
        });
    }

    /**
     * Check if game should end
     */
    checkGameEnd() {
        if (this.gameMode === GAME_MODES.FFA) {
            // FFA: Game ends when only one tank is alive
            const aliveTanks = this.tanks.filter(tank => tank.isAlive);
            if (aliveTanks.length <= 1) {
                this.endGame();
            }
        } else if (this.gameMode === GAME_MODES.TDM) {
            // TDM: Game ends when one team is eliminated
            const redAlive = this.teams.red.filter(tank => tank.isAlive);
            const blueAlive = this.teams.blue.filter(tank => tank.isAlive);
            
            if (redAlive.length === 0 || blueAlive.length === 0) {
                this.endGame();
            }
        }
    }
    
    /**
     * End the game and show statistics
     */
    endGame() {
        this.gameEndTime = Date.now();
        this.gameState = GAME_STATES.GAME_OVER;
        // Play victory music once
        if (window.audioSystem) {
            window.audioSystem.stopMusic();
            window.audioSystem.playMusic('victory.mp3', false);
        }
        this.showEndGameStats();
    }
    
    /**
     * Show end game statistics screen
     */
    showEndGameStats() {
        // Calculate final statistics
        const gameDuration = this.gameEndTime - this.gameStartTime;
        
        // Update time alive for all players
        this.tanks.forEach(tank => {
            const tankStats = this.playerStats.get(tank.id);
            if (tankStats) {
                if (tank.isAlive) {
                    tankStats.timeAlive = gameDuration;
                } else {
                    tankStats.timeAlive = tank.deathTime - this.gameStartTime;
                }
            }
        });
        
        // Create statistics HTML
        const statsHTML = this.generateStatsHTML(gameDuration);
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        overlay.innerHTML = `
            <div style="background: #333; padding: 30px; border-radius: 10px; max-width: 1200px; max-height: 80vh; overflow-y: auto;">
                <h2 style="text-align: center; margin-bottom: 20px;">Game Statistics</h2>
                ${statsHTML}
                <div style="text-align: center; margin-top: 20px;">
                    <button id="playAgainBtn" style="padding: 10px 20px; margin: 5px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Play Again</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.restartGame();
        });
    }
    
    /**
     * Generate statistics HTML
     */
    generateStatsHTML(gameDuration) {
        let html = `
            <div style="margin-bottom: 20px;">
                <strong>Game Duration:</strong> ${Math.round(gameDuration / 1000)}s
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #555;">
                        <th style="padding: 10px; border: 1px solid #666;">Player</th>
                        <th style="padding: 10px; border: 1px solid #666;">Team</th>
                        <th style="padding: 10px; border: 1px solid #666;">Time Alive</th>
                        <th style="padding: 10px; border: 1px solid #666;">Kills</th>
                        <th style="padding: 10px; border: 1px solid #666;">Shots Fired</th>
                        <th style="padding: 10px; border: 1px solid #666;">Shots Hit</th>
                        <th style="padding: 10px; border: 1px solid #666;">Accuracy</th>
                        <th style="padding: 10px; border: 1px solid #666;">Players Killed</th>
                        <th style="padding: 10px; border: 1px solid #666;">Killed By</th>
                        <th style="padding: 10px; border: 1px solid #666;">Final Health</th>
                        <th style="padding: 10px; border: 1px solid #666;">Powerups</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.playerStats.forEach((stats, playerId) => {
            const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
            const timeAlivePercent = Math.round((stats.timeAlive / gameDuration) * 100);
            
            const tank = this.tanks.find(t => t.id === playerId);
            html += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #666;">${stats.name}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${stats.team || 'N/A'}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${timeAlivePercent}%</td>
                    <td style="padding: 8px; border: 1px solid #666;">${stats.kills}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${stats.shotsFired}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${stats.shotsHit}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${accuracy}%</td>
                    <td style="padding: 8px; border: 1px solid #666;">${(stats.killsList || []).join(', ') || '—'}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${stats.killedBy || '—'}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${tank ? tank.health : 0}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${stats.powerupsCollected || 0}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        return html;
    }
    
    /**
     * Restart the game
     */
    restartGame() {
        // Reset game state
        this.gameState = GAME_STATES.PLAYING;
        this.tanks = [];
        this.bullets = [];
        this.obstacles = [];
        this.players = [];
        this.aiBots = [];
        this.teams = { red: [], blue: [] };
        this.playerStats.clear();
        
        // Reinitialize with preserved settings
        this.initialize(this.canvas, this.numPlayers, this.numAIBots, this.gameMode, this.teamAssignments, this.aiTeamDistribution);
    }
    

    /**
     * Check for collisions
     */
    checkCollisions() {
        // Bullet vs Tank collisions
        this.bullets.forEach((bullet, bulletIndex) => {
            this.tanks.forEach(tank => {
                if (!tank.isAlive || tank.id === bullet.ownerId) return;
                
                // Prevent friendly fire in TDM mode
                if (this.gameMode === GAME_MODES.TDM) {
                    const bulletOwner = this.tanks.find(t => t.id === bullet.ownerId);
                    if (bulletOwner && bulletOwner.team === tank.team) {
                        return; // Skip collision - same team
                    }
                }
                
                const distance = Math.sqrt((bullet.x - tank.x) ** 2 + (bullet.y - tank.y) ** 2);
                if (distance < tank.size / 2 + bullet.size / 2) {
                    // Check invincibility powerup
                    if (tank.powerups.invincibility.length > 0) {
                        // Tank is invincible, don't take damage
                        this.bullets.splice(bulletIndex, 1);
                        return;
                    }
                    
                    // Hit!
                    tank.health -= GAME_CONFIG.BULLET_DAMAGE;
                    this.bullets.splice(bulletIndex, 1);
                    
                    // Update statistics
                    const bulletOwner = this.tanks.find(t => t.id === bullet.ownerId);
                    if (bulletOwner) {
                        bulletOwner.shotsHit++;
                        const bulletOwnerStats = this.playerStats.get(bulletOwner.id);
                        if (bulletOwnerStats) {
                            bulletOwnerStats.shotsHit++;
                        }
                    }
                    
                    // Play hit sound
                    if (window.audioSystem) {
                        window.audioSystem.hit();
                    }
                    
                    if (tank.health <= 0) {
                        tank.isAlive = false;
                        tank.deathTime = Date.now();
                        tank.killedBy = bulletOwner ? bulletOwner.name : 'Unknown';
                        
                        // Update kill/death statistics
                        if (bulletOwner) {
                            bulletOwner.kills++;
                            const bulletOwnerStats = this.playerStats.get(bulletOwner.id);
                            if (bulletOwnerStats) {
                                bulletOwnerStats.kills++;
                                bulletOwnerStats.killsList.push(tank.name);
                            }
                        }
                        
                        const tankStats = this.playerStats.get(tank.id);
                        if (tankStats) {
                            tankStats.deaths++;
                            tankStats.deathTime = tank.deathTime;
                            tankStats.killedBy = tank.killedBy;
                            tankStats.killedByList.push(tank.killedBy);
                        }
                        
                        // Play death sound
                        if (window.audioSystem) {
                            if (tank.isAI) {
                                window.audioSystem.enemyDeath();
                            } else {
                                window.audioSystem.death();
                            }
                        }
                    }
                }
            });
        });
        
        // Bullet vs Obstacle collisions
        this.bullets.forEach((bullet, bulletIndex) => {
            this.obstacles.forEach(obstacle => {
                let hit = false;
                
                if (obstacle.type === 'rock') {
                    const distance = Math.sqrt((bullet.x - obstacle.x) ** 2 + (bullet.y - obstacle.y) ** 2);
                    hit = distance < obstacle.radius;
                } else {
                    const dx = Math.abs(bullet.x - obstacle.x);
                    const dy = Math.abs(bullet.y - obstacle.y);
                    hit = dx < obstacle.width / 2 && dy < obstacle.height / 2;
                }
                
                if (hit) {
                    // Check for bouncing bullets powerup
                    if (bullet.bounces > 0) {
                        // Bounce the bullet
                        bullet.bounces--;
                        
                        // Calculate bounce direction
                        if (obstacle.type === 'rock') {
                            // Circular obstacle bounce - reflect off the surface normal
                            const dx = bullet.x - obstacle.x;
                            const dy = bullet.y - obstacle.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance > 0) {
                                // Normal vector pointing from obstacle center to bullet
                                const nx = dx / distance;
                                const ny = dy / distance;
                                
                                // Bullet velocity components
                                const vx = Math.cos(bullet.angle);
                                const vy = Math.sin(bullet.angle);
                                
                                // Calculate reflection: v' = v - 2(v·n)n
                                const dot = vx * nx + vy * ny;
                                const newVx = vx - 2 * dot * nx;
                                const newVy = vy - 2 * dot * ny;
                                
                                // Update bullet angle
                                bullet.angle = Math.atan2(newVy, newVx);
                            }
                        } else {
                            // Rectangular obstacle bounce - simple wall reflection
                            // Determine which wall was hit and reflect accordingly
                            const bulletCenterX = bullet.x;
                            const bulletCenterY = bullet.y;
                            const obstacleLeft = obstacle.x;
                            const obstacleRight = obstacle.x + obstacle.width;
                            const obstacleTop = obstacle.y;
                            const obstacleBottom = obstacle.y + obstacle.height;
                            
                            // Calculate which edge is closest
                            const distToLeft = Math.abs(bulletCenterX - obstacleLeft);
                            const distToRight = Math.abs(bulletCenterX - obstacleRight);
                            const distToTop = Math.abs(bulletCenterY - obstacleTop);
                            const distToBottom = Math.abs(bulletCenterY - obstacleBottom);
                            
                            const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
                            
                            if (minDist === distToLeft || minDist === distToRight) {
                                // Hit left or right wall - reflect X component
                                bullet.angle = Math.PI - bullet.angle;
                            } else {
                                // Hit top or bottom wall - reflect Y component
                                bullet.angle = -bullet.angle;
                            }
                        }
                    } else {
                        this.bullets.splice(bulletIndex, 1);
                    }
                }
            });
        });
    }

    /**
     * Shoot a bullet from a tank
     * @param {Object} tank - Tank shooting the bullet
     */
    shootBullet(tank) {
        
        // Apply spread shot powerup (stacking)
        const spreadShotStacks = tank.powerups.spreadShot.length;
        if (spreadShotStacks > 0) {
            // Calculate number of bullets based on stacks (3^stacks)
            const bulletCount = Math.pow(3, spreadShotStacks);
            const spreadAngle = GAME_CONFIG.POWERUP_SPREAD_ANGLE;
            const baseAngle = tank.turretAngle;
            
            if (bulletCount === 1) {
                // Single bullet
                const bullet = {
                    x: tank.x + Math.cos(baseAngle) * tank.turretLength,
                    y: tank.y + Math.sin(baseAngle) * tank.turretLength,
                    angle: baseAngle,
                    speed: GAME_CONFIG.BULLET_SPEED,
                    size: GAME_CONFIG.BULLET_SIZE,
                    ownerId: tank.id,
                    color: tank.color,
                    bounces: tank.powerups.bouncingBullets.length > 0 ? GAME_CONFIG.POWERUP_BOUNCE_BOUNCES : 0
                };
                this.bullets.push(bullet);
            } else {
                // Multiple bullets in spread pattern
                const totalSpread = (bulletCount - 1) * spreadAngle;
                const startAngle = baseAngle - totalSpread / 2;
                
                for (let i = 0; i < bulletCount; i++) {
                    const angle = startAngle + (i * totalSpread / (bulletCount - 1));
                    const bullet = {
                        x: tank.x + Math.cos(angle) * tank.turretLength,
                        y: tank.y + Math.sin(angle) * tank.turretLength,
                        angle: angle,
                        speed: GAME_CONFIG.BULLET_SPEED,
                        size: GAME_CONFIG.BULLET_SIZE,
                        ownerId: tank.id,
                        color: tank.color,
                        bounces: tank.powerups.bouncingBullets.length > 0 ? GAME_CONFIG.POWERUP_BOUNCE_BOUNCES : 0
                    };
                    this.bullets.push(bullet);
                }
            }
        } else {
            // Single bullet
            const bullet = {
                x: tank.x + Math.cos(tank.turretAngle) * tank.turretLength,
                y: tank.y + Math.sin(tank.turretAngle) * tank.turretLength,
                angle: tank.turretAngle,
                speed: GAME_CONFIG.BULLET_SPEED,
                size: GAME_CONFIG.BULLET_SIZE,
                ownerId: tank.id,
                color: tank.color,
                bounces: tank.powerups.bouncingBullets.length > 0 ? GAME_CONFIG.POWERUP_BOUNCE_BOUNCES : 0
            };
            
            this.bullets.push(bullet);
        }
        
        // Update statistics
        tank.shotsFired++;
        const tankStats = this.playerStats.get(tank.id);
        if (tankStats) {
            tankStats.shotsFired++;
        }
    }

    /**
     * Check if tank collides with obstacles
     * @param {Object} tank - Tank to check
     * @param {number} newX - New X position
     * @param {number} newY - New Y position
     * @returns {boolean} True if collision detected
     */
    checkTankObstacleCollision(tank, newX, newY) {
        if (this.collisions) {
            return this.collisions.checkTankObstacleCollision(tank, newX, newY);
        }
        return false;
    }

    /**
     * Keep tank within map bounds
     * @param {Object} tank - Tank to constrain
     */
    constrainTankToMap(tank) {
        if (this.collisions) {
            this.collisions.constrainTankToMap(tank);
        }
    }

    /**
     * Render the game
     */
    render() {
        if (this.renderer) {
            this.renderer.render();
        }
    }

    /**
     * Render grid background
     */
    renderGrid() {
        const gridSize = 50; // Grid cell size
        const gridColor = 'rgba(255, 255, 255, 0.1)'; // Semi-transparent white
        
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    /**
     * Render obstacles
     */
    renderObstacles() {
        this.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = obstacle.color;
            
            if (obstacle.type === 'rock') {
                this.ctx.beginPath();
                this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(
                    obstacle.x - obstacle.width / 2,
                    obstacle.y - obstacle.height / 2,
                    obstacle.width,
                    obstacle.height
                );
            }
        });
    }

    /**
     * Render tanks
     */
    renderTanks() {
        this.tanks.forEach(tank => {
            if (!tank.isAlive) return;
            
            this.ctx.save();
            this.ctx.translate(tank.x, tank.y);
            
            // Draw tank body
            this.ctx.fillStyle = tank.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, tank.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw turret (gray)
            this.ctx.strokeStyle = '#808080';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(tank.turretAngle) * tank.turretLength, Math.sin(tank.turretAngle) * tank.turretLength);
            this.ctx.stroke();
            
            // Draw health bar
            if (tank.health < tank.maxHealth) {
                const barWidth = tank.size;
                const barHeight = 4;
                const healthPercent = tank.health / tank.maxHealth;
                
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(-barWidth / 2, -tank.size / 2 - 10, barWidth, barHeight);
                
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillRect(-barWidth / 2, -tank.size / 2 - 10, barWidth * healthPercent, barHeight);
            }
            
            // Draw nametag with powerup indicators
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'bottom';
            
            const nameY = -tank.size / 2 - 15;
            this.ctx.strokeText(tank.name, 0, nameY);
            this.ctx.fillText(tank.name, 0, nameY);
            
            // Draw powerup indicators
            this.renderPowerupIndicators(tank, nameY);
            
            this.ctx.restore();
        });
    }

    /**
     * Render bullets
     */
    renderBullets() {
        this.bullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.color;
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    /**
     * Render powerup indicators next to tank nametag
     * @param {Object} tank - Tank to render indicators for
     * @param {number} nameY - Y position of the nametag
     */
    renderPowerupIndicators(tank, nameY) {
        const activePowerups = [];
        
        // Map tank powerup property names to GAME_CONFIG keys
        const powerupMapping = {
            'invincibility': 'INVINCIBILITY',
            'speed': 'SPEED',
            'rapidFire': 'RAPID_FIRE',
            'spreadShot': 'SPREAD_SHOT',
            'bouncingBullets': 'BOUNCING_BULLETS'
        };
        
        // Collect active powerups
        Object.keys(tank.powerups).forEach(powerupType => {
            const powerupArray = tank.powerups[powerupType];
            if (powerupArray.length > 0) {
                const configKey = powerupMapping[powerupType];
                if (configKey && GAME_CONFIG.POWERUP_TYPES[configKey]) {
                    // Get the longest remaining time from all stacks
                    const maxTimeRemaining = Math.max(...powerupArray);
                    activePowerups.push({
                        type: configKey,
                        timeRemaining: maxTimeRemaining,
                        stacks: powerupArray.length
                    });
                }
            }
        });
        
        if (activePowerups.length === 0) return;
        
        // Calculate starting position (to the right of nametag)
        const nameWidth = this.ctx.measureText(tank.name).width;
        const startX = nameWidth / 2 + 10;
        const indicatorY = nameY - 5;
        
        // Draw each powerup indicator
        activePowerups.forEach((powerup, index) => {
            const indicatorX = startX + (index * 25);
            
            // Draw powerup emoji
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            
            const emoji = GAME_CONFIG.POWERUP_TYPES[powerup.type].emoji;
            this.ctx.strokeText(emoji, indicatorX, indicatorY);
            this.ctx.fillText(emoji, indicatorX, indicatorY);
            
            // Draw time remaining below emoji
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillStyle = '#ffff00';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            
            const timeText = Math.ceil(powerup.timeRemaining / 1000) + 's';
            const stackText = powerup.stacks > 1 ? ` (${powerup.stacks}x)` : '';
            this.ctx.strokeText(timeText + stackText, indicatorX, indicatorY + 8);
            this.ctx.fillText(timeText + stackText, indicatorX, indicatorY + 8);
        });
    }
    
    /**
     * Render powerups
     */
    renderPowerups() {
        this.powerups.forEach(powerup => {
            if (!powerup.alive) return;
            
            this.ctx.save();
            this.ctx.translate(powerup.x, powerup.y);
            this.ctx.rotate(powerup.rotation);
            
            // Draw powerup background
            this.ctx.fillStyle = GAME_CONFIG.POWERUP_TYPES[powerup.type].color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, powerup.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw powerup emoji
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(GAME_CONFIG.POWERUP_TYPES[powerup.type].emoji, 0, 0);
            
            this.ctx.restore();
            
            // Update rotation
            powerup.rotation += 0.02;
        });
    }

    /**
     * Render UI elements
     */
    renderUI() {
        // Render player info
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        
        if (this.gameMode === GAME_MODES.TDM) {
            // TDM mode - show team information
            const redAlive = this.teams.red.filter(tank => tank.isAlive).length;
            const blueAlive = this.teams.blue.filter(tank => tank.isAlive).length;
            
            this.ctx.fillStyle = GAME_CONFIG.TEAM_COLORS.RED;
            this.ctx.fillText(`Red Team: ${redAlive}`, 10, 25);
            
            this.ctx.fillStyle = GAME_CONFIG.TEAM_COLORS.BLUE;
            this.ctx.fillText(`Blue Team: ${blueAlive}`, 10, 45);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(`Mode: TDM`, 10, 65);
        } else {
            // FFA mode - show standard info
            this.ctx.fillText(`Players: ${this.numPlayers} | AI: ${this.numAIBots}`, 10, 25);
            
            // Render alive tanks count
            const aliveTanks = this.tanks.filter(tank => tank.isAlive).length;
            this.ctx.fillText(`Alive: ${aliveTanks}`, 10, 45);
            
            this.ctx.fillText(`Mode: FFA`, 10, 65);
        }
        
        // Game over check is now handled by checkGameEnd()
    }

    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp
     */
    gameLoop(currentTime = performance.now()) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        if (this.gameState === GAME_STATES.PLAYING) {
            this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
        }
    }

    /**
     * Pause/unpause the game
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused && this.gameState === GAME_STATES.PLAYING) {
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }

    /**
     * Stop the game
     */
    stop() {
        this.gameState = GAME_STATES.MENU;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Stop background music
        if (window.audioSystem) {
            window.audioSystem.stopMusic();
        }
    }

    /**
     * Utility function to shuffle array
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// =============================================================================
// GLOBAL GAME INSTANCE
// =============================================================================
window.game = null;
