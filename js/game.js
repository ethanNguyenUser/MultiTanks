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
        this.lastTime = 0;
        this.animationId = null;
        
        // Game settings
        this.numPlayers = 1;
        this.isPaused = false;
        
        // Input tracking
        this.activeControls = new Map(); // Track which controls are currently pressed
    }

    /**
     * Initialize the game
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {number} numPlayers - Number of human players (1-7)
     */
    async initialize(canvas, numPlayers = 1) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.numPlayers = Math.max(GAME_CONFIG.MIN_PLAYERS, Math.min(GAME_CONFIG.MAX_PLAYERS, numPlayers));
        
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
        
        // Start game loop
        this.gameState = GAME_STATES.PLAYING;
        this.lastTime = performance.now();
        this.gameLoop();
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
        for (let i = this.numPlayers; i < GAME_CONFIG.TOTAL_TANKS; i++) {
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
        
        // 8 positions: 4 corners + 4 midpoints
        const cornerPositions = [
            { x: edge, y: edge }, // Top-left
            { x: width - edge, y: edge }, // Top-right
            { x: width - edge, y: height - edge }, // Bottom-right
            { x: edge, y: height - edge }, // Bottom-left
        ];
        
        const midpointPositions = [
            { x: width / 2, y: edge }, // Top
            { x: width - edge, y: height / 2 }, // Right
            { x: width / 2, y: height - edge }, // Bottom
            { x: edge, y: height / 2 }, // Left
        ];
        
        // Combine and shuffle positions
        const allPositions = [...cornerPositions, ...midpointPositions];
        return this.shuffleArray(allPositions);
    }

    /**
     * Create a tank object
     * @param {Object} position - Spawn position
     * @param {number} playerIndex - Player index (0-7)
     * @param {boolean} isAI - Whether this is an AI bot
     * @returns {Object} Tank object
     */
    createTank(position, playerIndex, isAI) {
        return {
            id: playerIndex,
            x: position.x,
            y: position.y,
            angle: Math.random() * Math.PI * 2, // Random initial rotation
            turretAngle: 0,
            health: GAME_CONFIG.TANK_HEALTH,
            maxHealth: GAME_CONFIG.TANK_HEALTH,
            color: TANK_COLORS[playerIndex % TANK_COLORS.length],
            isAI: isAI,
            lastShot: 0,
            size: GAME_CONFIG.TANK_SIZE,
            speed: GAME_CONFIG.TANK_SPEED,
            turretLength: GAME_CONFIG.TURRET_LENGTH,
            turretRotationSpeed: GAME_CONFIG.TURRET_ROTATION_SPEED,
            isAlive: true,
            
            // AI-specific properties
            aiTarget: null,
            aiState: 'patrol', // 'patrol', 'chase', 'attack'
            aiTimer: 0,
            aiDirection: Math.random() * Math.PI * 2
        };
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
            const maxAttempts = 100;
            
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
        this.checkCollisions();
        this.updateAI(deltaTime);
    }

    /**
     * Update all tanks
     * @param {number} deltaTime - Time since last frame
     */
    updateTanks(deltaTime) {
        this.tanks.forEach(tank => {
            if (!tank.isAlive) return;
            
            if (tank.isAI) {
                this.updateAITank(tank, deltaTime);
            } else {
                this.updatePlayerTank(tank, deltaTime);
            }
            
            // Keep tank within map bounds
            this.constrainTankToMap(tank);
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
            tank.angle = Math.atan2(moveY, moveX);
            
            // Move tank
            const newX = tank.x + moveX * tank.speed;
            const newY = tank.y + moveY * tank.speed;
            
            // Check collision with obstacles before moving
            if (!this.checkTankObstacleCollision(tank, newX, newY)) {
                tank.x = newX;
                tank.y = newY;
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
        if (shoot && Date.now() - tank.lastShot > GAME_CONFIG.SHOOT_COOLDOWN) {
            this.shootBullet(tank);
            tank.lastShot = Date.now();
        }
    }

    /**
     * Update AI tank behavior
     * @param {Object} tank - AI tank to update
     * @param {number} deltaTime - Time since last frame
     */
    updateAITank(tank, deltaTime) {
        tank.aiTimer += deltaTime;
        
        // Simple AI behavior
        if (tank.aiState === 'patrol') {
            // Move in random direction
            tank.x += Math.cos(tank.aiDirection) * tank.speed * 0.5;
            tank.y += Math.sin(tank.aiDirection) * tank.speed * 0.5;
            
            // Change direction occasionally
            if (tank.aiTimer > 2000) {
                tank.aiDirection = Math.random() * Math.PI * 2;
                tank.aiTimer = 0;
            }
        }
        
        // Keep turret rotating
        tank.turretAngle += tank.turretRotationSpeed * 0.5;
        
        // Shoot occasionally
        if (Date.now() - tank.lastShot > GAME_CONFIG.SHOOT_COOLDOWN * 2) {
            this.shootBullet(tank);
            tank.lastShot = Date.now();
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
            
            // Remove bullets that are off-screen
            return bullet.x >= 0 && bullet.x <= GAME_CONFIG.MAP_WIDTH &&
                   bullet.y >= 0 && bullet.y <= GAME_CONFIG.MAP_HEIGHT;
        });
    }

    /**
     * Check for collisions
     */
    checkCollisions() {
        // Bullet vs Tank collisions
        this.bullets.forEach((bullet, bulletIndex) => {
            this.tanks.forEach(tank => {
                if (!tank.isAlive || tank.id === bullet.ownerId) return;
                
                const distance = Math.sqrt((bullet.x - tank.x) ** 2 + (bullet.y - tank.y) ** 2);
                if (distance < tank.size / 2 + bullet.size / 2) {
                    // Hit!
                    tank.health -= GAME_CONFIG.BULLET_DAMAGE;
                    this.bullets.splice(bulletIndex, 1);
                    
                    if (tank.health <= 0) {
                        tank.isAlive = false;
                        console.log(`💥 Tank ${tank.id} destroyed!`);
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
                    this.bullets.splice(bulletIndex, 1);
                }
            });
        });
    }

    /**
     * Shoot a bullet from a tank
     * @param {Object} tank - Tank shooting the bullet
     */
    shootBullet(tank) {
        const bullet = {
            x: tank.x + Math.cos(tank.turretAngle) * tank.turretLength,
            y: tank.y + Math.sin(tank.turretAngle) * tank.turretLength,
            angle: tank.turretAngle,
            speed: GAME_CONFIG.BULLET_SPEED,
            size: GAME_CONFIG.BULLET_SIZE,
            ownerId: tank.id,
            color: tank.color
        };
        
        this.bullets.push(bullet);
    }

    /**
     * Check if tank collides with obstacles
     * @param {Object} tank - Tank to check
     * @param {number} newX - New X position
     * @param {number} newY - New Y position
     * @returns {boolean} True if collision detected
     */
    checkTankObstacleCollision(tank, newX, newY) {
        return this.obstacles.some(obstacle => {
            if (obstacle.type === 'rock') {
                const distance = Math.sqrt((newX - obstacle.x) ** 2 + (newY - obstacle.y) ** 2);
                return distance < obstacle.radius + tank.size / 2;
            } else {
                const dx = Math.abs(newX - obstacle.x);
                const dy = Math.abs(newY - obstacle.y);
                return dx < (obstacle.width / 2 + tank.size / 2) && dy < (obstacle.height / 2 + tank.size / 2);
            }
        });
    }

    /**
     * Keep tank within map bounds
     * @param {Object} tank - Tank to constrain
     */
    constrainTankToMap(tank) {
        tank.x = Math.max(tank.size / 2, Math.min(GAME_CONFIG.MAP_WIDTH - tank.size / 2, tank.x));
        tank.y = Math.max(tank.size / 2, Math.min(GAME_CONFIG.MAP_HEIGHT - tank.size / 2, tank.y));
    }

    /**
     * Render the game
     */
    render() {
        if (!this.ctx) {
            return;
        }
        
        // Clear canvas with map color
        this.ctx.fillStyle = GAME_CONFIG.MAP_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render obstacles
        this.renderObstacles();
        
        // Render tanks
        this.renderTanks();
        
        // Render bullets
        this.renderBullets();
        
        // Render UI
        this.renderUI();
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
            
            // Draw tank direction indicator (black)
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(tank.angle) * tank.size / 2, Math.sin(tank.angle) * tank.size / 2);
            this.ctx.stroke();
            
            // Draw turret (red)
            this.ctx.strokeStyle = '#ff0000';
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
     * Render UI elements
     */
    renderUI() {
        // Render player info
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Players: ${this.numPlayers} | AI: ${GAME_CONFIG.TOTAL_TANKS - this.numPlayers}`, 10, 25);
        
        // Render alive tanks count
        const aliveTanks = this.tanks.filter(tank => tank.isAlive).length;
        this.ctx.fillText(`Alive: ${aliveTanks}`, 10, 45);
        
        // Check for game over
        if (aliveTanks <= 1) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.textAlign = 'left';
        }
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
