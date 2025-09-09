// =============================================================================
// CAMPAIGN MODE
// =============================================================================

const CampaignMode = {
    key: GAME_MODES.CAMPAIGN,
    currentLevel: 1,
    difficulty: 'MEDIUM',
    aiAlliesEnabled: true,
    enemies: [],
    aiAllies: [],
    levelStats: {
        enemiesKilled: 0,
        playerKills: new Map(),
        aiAllyKills: new Map()
    },
    
    musicTrack(game) {
        return `level_${this.currentLevel}.mp3`;
    },
    
    assignTeams(game) {
        // No teams in campaign - all players and AI allies are on same side
        game.teams = { red: [], blue: [] };
    },
    
    calculateSpawnPositions(game) {
        const positions = [];
        const spawnConfig = CAMPAIGN_CONFIG.PLAYER_SPAWN;
        const totalTanks = game.numPlayers + game.numAIBots;
        
        console.log('🎯 Calculating spawn positions - Players:', game.numPlayers, 'AI Bots:', game.numAIBots, 'Total:', totalTanks);
        
        // Spawn all players and AI allies in top-left area
        for (let i = 0; i < totalTanks; i++) {
            const x = spawnConfig.x + (i % 4) * spawnConfig.spacing;
            const y = spawnConfig.y + Math.floor(i / 4) * spawnConfig.spacing;
            positions.push({ x, y });
            console.log('🎯 Spawn position', i, ':', x, y);
        }
        
        return positions;
    },
    
    getMaxAIAllies(game) {
        const maxTotal = CAMPAIGN_CONFIG.AI_ALLIES.maxCount;
        return Math.max(0, maxTotal - game.numPlayers);
    },
    
    initializeLevel(game) {
        console.log('🎯 Campaign Mode: Initializing Level', this.currentLevel);
        console.log('🎯 Game players:', game.numPlayers, 'AI bots:', game.numAIBots);
        
        // Clear all game objects (bullets, powerups, etc.)
        game.clearGameObjects();
        
        this.enemies = [];
        this.levelStats = {
            enemiesKilled: 0,
            playerKills: new Map(),
            aiAllyKills: new Map()
        };
        
        // Set up map size for current level
        const levelIndex = this.currentLevel - 1;
        const scaling = CAMPAIGN_CONFIG.MAP_SCALING;
        GAME_CONFIG.MAP_WIDTH = scaling.baseWidth + (levelIndex * scaling.widthGrowth);
        GAME_CONFIG.MAP_HEIGHT = scaling.baseHeight + (levelIndex * scaling.heightGrowth);
        
        console.log('🎯 Map size:', GAME_CONFIG.MAP_WIDTH, 'x', GAME_CONFIG.MAP_HEIGHT);
        
        // Initialize player tanks for campaign mode
        this.initializePlayerTanks(game);
        
        // Spawn enemies for current level
        this.spawnEnemiesForLevel(game);
        
        console.log('🎯 Enemies spawned:', this.enemies.length);
        
        // Initialize AI allies based on game's AI bot count
        if (game.numAIBots > 0) {
            this.initializeAIAllies(game);
            console.log('🎯 AI allies initialized:', this.aiAllies.length);
        }
        
        // Set up camera
        this.initializeCamera(game);
        
        // Play level-specific music
        if (window.audioSystem) {
            const track = this.musicTrack(game);
            window.audioSystem.playMusic(track, true);
        }
        
        // Start the game loop now that level is initialized
        game.gameState = GAME_STATES.PLAYING;
        game.lastTime = performance.now();
        game.gameLoop();
    },
    
    initializePlayerTanks(game) {
        // Clear existing tanks
        game.tanks = [];
        game.players = [];
        game.aiBots = [];
        
        // Calculate spawn positions
        const spawnPositions = this.calculateSpawnPositions(game);
        
        // Create human players
        for (let i = 0; i < game.numPlayers; i++) {
            const tank = this.createPlayerTank(spawnPositions[i], i, game);
            game.tanks.push(tank);
            game.players.push(tank);
        }
        
        console.log('🎯 Player tanks initialized:', game.players.length);
    },
    
    createPlayerTank(position, playerIndex, game) {
        const tank = {
            id: playerIndex,
            x: position.x,
            y: position.y,
            angle: Math.random() * Math.PI * 2, // Random initial rotation
            turretAngle: 0,
            health: GAME_CONFIG.TANK_HEALTH,
            maxHealth: GAME_CONFIG.TANK_HEALTH,
            color: CAMPAIGN_CONFIG.AI_ALLIES.color,
            isAI: false,
            isPlayer: true,
            team: null, // No teams in campaign
            name: `Player ${playerIndex + 1}`,
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
            }
        };
        
        // Initialize statistics
        game.playerStats.set(tank.id, {
            name: tank.name,
            isAI: tank.isAI,
            team: tank.team,
            shotsFired: 0,
            shotsHit: 0,
            enemyHits: 0,
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
    },
    
    spawnEnemiesForLevel(game) {
        const levelData = CAMPAIGN_CONFIG.LEVELS[this.currentLevel];
        const difficulty = CAMPAIGN_CONFIG.DIFFICULTY[this.difficulty];
        
        console.log('🎯 Level data for level', this.currentLevel, ':', levelData);
        console.log('🎯 Difficulty:', this.difficulty, difficulty);
        
        // Spawn each enemy type
        Object.entries(levelData).forEach(([enemyType, count]) => {
            console.log('🎯 Spawning', count, enemyType, 'enemies');
            for (let i = 0; i < count; i++) {
                const enemy = this.createEnemy(enemyType, game);
                if (enemy) {
                    this.enemies.push(enemy);
                    console.log('🎯 Created enemy:', enemy.type, 'at', enemy.x, enemy.y);
                } else {
                    console.log('🎯 Failed to create enemy:', enemyType);
                }
            }
        });
        
        console.log('🎯 Total enemies created:', this.enemies.length);
        
        // Enemies are stored in this.mode.enemies for campaign mode
        // No need to set game.enemies as collision detection uses this.mode.enemies
    },
    
    createEnemy(type, game) {
        console.log('🎯 Creating enemy of type:', type);
        // Map level data types to config keys
        const typeMap = {
            'chaser': 'CHASER',
            'spreadShooter': 'SPREAD_SHOOTER',
            'turret': 'TURRET',
            'boss': 'BOSS'
        };
        const typeKey = typeMap[type];
        console.log('🎯 Looking for config key:', typeKey);
        const config = CAMPAIGN_CONFIG.ENEMIES[typeKey];
        if (!config) {
            console.log('🎯 No config found for enemy type:', type, 'key:', typeKey);
            console.log('🎯 Available configs:', Object.keys(CAMPAIGN_CONFIG.ENEMIES));
            return null;
        }
        console.log('🎯 Enemy config:', config);
        
        const enemy = {
            type: type,
            x: this.getRandomSpawnPosition(game).x,
            y: this.getRandomSpawnPosition(game).y,
            size: config.size,
            health: config.health,
            maxHealth: config.health,
            speed: config.speed,
            color: config.color,
            isAlive: true,
            lastShot: 0,
            fireRate: config.fireRate,
            bulletSpeed: config.bulletSpeed,
            bulletDamage: config.bulletDamage,
            bulletColor: config.bulletColor,
            ricochet: config.ricochet || false,
            maxBounces: config.maxBounces || 0,
            spreadAngle: config.spreadAngle || 0,
            bulletCount: config.bulletCount || 1,
            isEnraged: false,
            radialBullets: config.radialBullets || 0,
            radialFireRate: config.radialFireRate || 0,
            lastRadialShot: 0,
            angle: 0, // For turret rotation
            target: null
        };
        
        // Apply difficulty multipliers
        const difficulty = CAMPAIGN_CONFIG.DIFFICULTY[this.difficulty];
        enemy.speed *= difficulty.enemySpeedMultiplier;
        enemy.fireRate /= difficulty.enemyFireRateMultiplier;
        enemy.bulletSpeed *= difficulty.enemyBulletSpeedMultiplier;
        
        return enemy;
    },
    
    getRandomSpawnPosition(game) {
        const margin = 100;
        const attempts = 50;
        
        for (let i = 0; i < attempts; i++) {
            const x = margin + Math.random() * (GAME_CONFIG.MAP_WIDTH - 2 * margin);
            const y = margin + Math.random() * (GAME_CONFIG.MAP_HEIGHT - 2 * margin);
            
            // Check if position is far enough from players
            const playerPositions = game.tanks.filter(t => t.isPlayer).map(t => ({ x: t.x, y: t.y }));
            const minDistance = 150;
            let validPosition = true;
            
            for (const pos of playerPositions) {
                const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
                if (distance < minDistance) {
                    validPosition = false;
                    break;
                }
            }
            
            if (validPosition) {
                return { x, y };
            }
        }
        
        // Fallback to center area if no valid position found
        return {
            x: GAME_CONFIG.MAP_WIDTH * 0.7 + Math.random() * GAME_CONFIG.MAP_WIDTH * 0.2,
            y: GAME_CONFIG.MAP_HEIGHT * 0.7 + Math.random() * GAME_CONFIG.MAP_HEIGHT * 0.2
        };
    },
    
    initializeAIAllies(game) {
        this.aiAllies = [];
        const maxAllies = Math.min(game.numAIBots, this.getMaxAIAllies(game));
        
        for (let i = 0; i < maxAllies; i++) {
            const ally = {
                id: `aiAlly_${i}`, // Add unique ID for AI allies
                x: CAMPAIGN_CONFIG.PLAYER_SPAWN.x + (i % 4) * CAMPAIGN_CONFIG.PLAYER_SPAWN.spacing,
                y: CAMPAIGN_CONFIG.PLAYER_SPAWN.y + Math.floor(i / 4) * CAMPAIGN_CONFIG.PLAYER_SPAWN.spacing,
                angle: Math.random() * Math.PI * 2, // Random initial rotation
                turretAngle: 0,
                health: GAME_CONFIG.TANK_HEALTH,
                maxHealth: GAME_CONFIG.TANK_HEALTH,
                color: CAMPAIGN_CONFIG.AI_ALLIES.color,
                isAlive: true,
                isAI: true, // Mark as AI so it uses proper AI behavior
                isAIAlly: true,
                isPlayer: false, // Not a human player
                team: 'player', // Same team as players
                name: `AI Ally ${i + 1}`,
                lastShot: 0,
                size: GAME_CONFIG.TANK_SIZE,
                speed: GAME_CONFIG.TANK_SPEED,
                turretLength: GAME_CONFIG.TURRET_LENGTH,
                turretRotationSpeed: GAME_CONFIG.TURRET_ROTATION_SPEED,
                
                // Statistics
                shotsFired: 0,
                shotsHit: 0,
                kills: 0,
                deaths: 0,
                timeAlive: 0,
                deathTime: 0,
                killedBy: null,
                
                // Powerups (arrays for stacking) - same as regular tanks
                powerups: {
                    invincibility: [],
                    speed: [],
                    rapidFire: [],
                    spreadShot: [],
                    bouncingBullets: []
                },
                
                // AI-specific properties (same as regular AI tanks)
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
                aiPowerupCooldownEndTime: 0, // When AI can start chasing powerups again
                
                // Campaign-specific properties
                followDistance: CAMPAIGN_CONFIG.AI_ALLIES.followDistance,
                targetRange: CAMPAIGN_CONFIG.AI_ALLIES.targetRange
            };
            
            this.aiAllies.push(ally);
            game.tanks.push(ally);
            game.aiBots.push(ally); // Add to aiBots array for proper tracking
            
            // Initialize statistics for AI ally
            game.playerStats.set(ally.id, {
                name: ally.name,
                isAI: ally.isAI,
                team: ally.team,
                shotsFired: 0,
                shotsHit: 0,
                enemyHits: 0,
                kills: 0,
                deaths: 0,
                timeAlive: 0,
                deathTime: 0,
                killedBy: null,
                killsList: [],
                killedByList: [],
                powerupsCollected: 0
            });
        }
    },
    
    initializeCamera(game) {
        game.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            followSpeed: CAMPAIGN_CONFIG.CAMERA.followSpeed,
            zoom: CAMPAIGN_CONFIG.CAMERA.zoom
        };
    },
    
    updateCamera(game) {
        if (!game.camera) return;
        
        // Calculate average position of all alive players and AI allies
        const aliveTanks = game.tanks.filter(t => t.isAlive && (t.isPlayer || t.isAIAlly));
        if (aliveTanks.length === 0) return;
        
        const avgX = aliveTanks.reduce((sum, t) => sum + t.x, 0) / aliveTanks.length;
        const avgY = aliveTanks.reduce((sum, t) => sum + t.y, 0) / aliveTanks.length;
        
        // Update camera target
        game.camera.targetX = avgX - GAME_CONFIG.MAP_WIDTH / 2;
        game.camera.targetY = avgY - GAME_CONFIG.MAP_HEIGHT / 2;
        
        // Smoothly follow target
        const followSpeed = CAMPAIGN_CONFIG.CAMERA.followSpeed;
        game.camera.x += (game.camera.targetX - game.camera.x) * followSpeed;
        game.camera.y += (game.camera.targetY - game.camera.y) * followSpeed;
        
        // Clamp camera to map bounds
        game.camera.x = Math.max(0, Math.min(game.camera.x, GAME_CONFIG.MAP_WIDTH - window.innerWidth));
        game.camera.y = Math.max(0, Math.min(game.camera.y, GAME_CONFIG.MAP_HEIGHT - window.innerHeight));
    },
    
    updateAIAllies(game, deltaTime) {
        this.aiAllies.forEach(ally => {
            if (!ally.isAlive) return;
            
            // Set the AI target to the nearest enemy for campaign mode
            const nearestEnemy = this.findNearestEnemy(ally, this.enemies);
            if (nearestEnemy) {
                ally.aiTarget = nearestEnemy;
            } else {
                ally.aiTarget = null;
            }
            
            // Use the regular AI behavior system
            if (window.aiBehavior) {
                window.aiBehavior.updateAITank(ally, deltaTime);
            } else {
                // Fallback to simple behavior if AI behavior system not available
                this.updateAIAllySimple(ally, game, deltaTime);
            }
        });
    },
    
    updateAIAllySimple(ally, game, deltaTime) {
        // Find nearest enemy
        const nearestEnemy = this.findNearestEnemy(ally, this.enemies);
        
        if (nearestEnemy) {
            // Move towards enemy
            const dx = nearestEnemy.x - ally.x;
            const dy = nearestEnemy.y - ally.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const moveX = (dx / distance) * ally.speed;
                const moveY = (dy / distance) * ally.speed;
                
                ally.x += moveX;
                ally.y += moveY;
                ally.angle = Math.atan2(dy, dx);
            }
            
            // Shoot at enemy using regular shooting mechanism
            const now = Date.now();
            if (now - ally.lastShot > ally.fireRate * 1000) {
                // Use the regular game shooting mechanism
                if (game.shootBullet) {
                    game.shootBullet(ally);
                } else {
                    // Fallback to custom shooting
                    this.shootAIAlly(ally, nearestEnemy, game);
                }
                ally.lastShot = now;
            }
        } else {
            // No enemies, follow players
            this.followPlayers(ally, game);
        }
        
        // Keep AI allies within follow distance of players
        this.keepAIAllyInRange(ally, game);
    },
    
    findNearestEnemy(ally, enemies) {
        let nearest = null;
        let minDistance = ally.targetRange;
        
        enemies.forEach(enemy => {
            if (!enemy.isAlive) return;
            
            const distance = Math.sqrt((enemy.x - ally.x) ** 2 + (enemy.y - ally.y) ** 2);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = enemy;
            }
        });
        
        return nearest;
    },
    
    followPlayers(ally, game) {
        const players = game.tanks.filter(t => t.isAlive && t.isPlayer);
        if (players.length === 0) return;
        
        const avgX = players.reduce((sum, p) => sum + p.x, 0) / players.length;
        const avgY = players.reduce((sum, p) => sum + p.y, 0) / players.length;
        
        const dx = avgX - ally.x;
        const dy = avgY - ally.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > ally.followDistance) {
            const moveX = (dx / distance) * ally.speed;
            const moveY = (dy / distance) * ally.speed;
            
            ally.x += moveX;
            ally.y += moveY;
        }
    },
    
    keepAIAllyInRange(ally, game) {
        const players = game.tanks.filter(t => t.isAlive && t.isPlayer);
        if (players.length === 0) return;
        
        const avgX = players.reduce((sum, p) => sum + p.x, 0) / players.length;
        const avgY = players.reduce((sum, p) => sum + p.y, 0) / players.length;
        
        const dx = ally.x - avgX;
        const dy = ally.y - avgY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > ally.followDistance) {
            ally.x = avgX + (dx / distance) * ally.followDistance;
            ally.y = avgY + (dy / distance) * ally.followDistance;
        }
    },
    
    shootAIAlly(ally, target, game) {
        const dx = target.x - ally.x;
        const dy = target.y - ally.y;
        const angle = Math.atan2(dy, dx);
        
        const bullet = {
            x: ally.x + Math.cos(angle) * (ally.size / 2 + 5),
            y: ally.y + Math.sin(angle) * (ally.size / 2 + 5),
            angle: angle,
            speed: ally.bulletSpeed,
            size: GAME_CONFIG.BULLET_SIZE,
            damage: ally.bulletDamage,
            owner: 'aiAlly',
            ownerId: ally.id || 'aiAlly', // Add ownerId for proper identification
            isAlive: true,
            color: '#2196f3', // Blue like players
            bounces: 0 // No bouncing by default
        };
        
        game.bullets.push(bullet);
    },
    
    updateEnemies(game, deltaTime) {
        this.enemies.forEach(enemy => {
            if (!enemy.isAlive) return;
            
            this.updateEnemyAI(enemy, game, deltaTime);
        });
    },
    
    updateEnemyAI(enemy, game, deltaTime) {
        const now = Date.now();
        
        // Find nearest player or AI ally
        const targets = game.tanks.filter(t => t.isAlive && (t.isPlayer || t.isAIAlly));
        if (targets.length === 0) return;
        
        const nearestTarget = this.findNearestTarget(enemy, targets);
        if (!nearestTarget) return;
        
        // Update enemy behavior based on type
        switch (enemy.type) {
            case 'chaser':
                this.updateChaserEnemy(enemy, nearestTarget, game, deltaTime);
                break;
            case 'spreadShooter':
                this.updateSpreadShooterEnemy(enemy, nearestTarget, game, deltaTime);
                break;
            case 'turret':
                this.updateTurretEnemy(enemy, nearestTarget, game, deltaTime);
                break;
            case 'boss':
                this.updateBossEnemy(enemy, nearestTarget, game, deltaTime);
                break;
        }
    },
    
    findNearestTarget(enemy, targets) {
        let nearest = null;
        let minDistance = Infinity;
        
        targets.forEach(target => {
            const distance = Math.sqrt((target.x - enemy.x) ** 2 + (target.y - enemy.y) ** 2);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = target;
            }
        });
        
        return nearest;
    },
    
    updateChaserEnemy(enemy, target, game, deltaTime) {
        // Move towards target
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveX = (dx / distance) * enemy.speed;
            const moveY = (dy / distance) * enemy.speed;
            
            enemy.x += moveX;
            enemy.y += moveY;
        }
        
        // Always rotate turret to face target
        enemy.angle = Math.atan2(dy, dx);
        
        // Shoot at target
        this.shootEnemy(enemy, target, game);
    },
    
    updateSpreadShooterEnemy(enemy, target, game, deltaTime) {
        // Move randomly but generally towards target
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveX = (dx / distance) * enemy.speed * 0.5;
            const moveY = (dy / distance) * enemy.speed * 0.5;
            
            // Add some randomness
            const randomX = (Math.random() - 0.5) * enemy.speed * 0.3;
            const randomY = (Math.random() - 0.5) * enemy.speed * 0.3;
            
            enemy.x += moveX + randomX;
            enemy.y += moveY + randomY;
        }
        
        // Always rotate turret to face target
        enemy.angle = Math.atan2(dy, dx);
        
        // Shoot spread pattern
        this.shootSpreadEnemy(enemy, target, game);
    },
    
    updateTurretEnemy(enemy, target, game, deltaTime) {
        // Stationary, just rotate to face target
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        enemy.angle = Math.atan2(dy, dx);
        
        // Shoot at target
        this.shootEnemy(enemy, target, game);
    },
    
    updateBossEnemy(enemy, target, game, deltaTime) {
        // Check for enrage
        if (enemy.health <= enemy.maxHealth / 2 && !enemy.isEnraged) {
            enemy.isEnraged = true;
            enemy.fireRate = enemy.fireRate * 0.5; // Double fire rate
            enemy.speed = enemy.speed * 1.3; // Boss should move faster when enraged
        }
        
        // Move towards target
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveX = (dx / distance) * enemy.speed;
            const moveY = (dy / distance) * enemy.speed;
            
            enemy.x += moveX;
            enemy.y += moveY;
        }
        
        // Always rotate turret to face target
        enemy.angle = Math.atan2(dy, dx);
        
        // Shoot at target
        this.shootEnemy(enemy, target, game);
        
        // Radial attack
        this.shootBossRadial(enemy, game);
    },
    
    shootEnemy(enemy, target, game) {
        const now = Date.now();
        if (now - enemy.lastShot < enemy.fireRate * 1000) return;
        
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const angle = Math.atan2(dy, dx);
        
        const bullet = {
            x: enemy.x + Math.cos(angle) * (enemy.size / 2 + 5),
            y: enemy.y + Math.sin(angle) * (enemy.size / 2 + 5),
            angle: angle,
            speed: enemy.bulletSpeed,
            size: GAME_CONFIG.BULLET_SIZE,
            damage: enemy.bulletDamage,
            owner: 'enemy',
            isAlive: true,
            color: enemy.bulletColor,
            ricochet: enemy.ricochet,
            bounces: enemy.maxBounces || 0
        };
        
        game.bullets.push(bullet);
        enemy.lastShot = now;
    },
    
    shootSpreadEnemy(enemy, target, game) {
        const now = Date.now();
        if (now - enemy.lastShot < enemy.fireRate * 1000) return;
        
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const baseAngle = Math.atan2(dy, dx);
        
        for (let i = 0; i < enemy.bulletCount; i++) {
            const angle = baseAngle + (i - (enemy.bulletCount - 1) / 2) * enemy.spreadAngle;
            
            const bullet = {
                x: enemy.x + Math.cos(angle) * (enemy.size / 2 + 5),
                y: enemy.y + Math.sin(angle) * (enemy.size / 2 + 5),
                angle: angle,
                speed: enemy.bulletSpeed,
                size: GAME_CONFIG.BULLET_SIZE,
                damage: enemy.bulletDamage,
                owner: 'enemy',
                isAlive: true,
                color: enemy.bulletColor,
                bounces: 0
            };
            
            game.bullets.push(bullet);
        }
        
        enemy.lastShot = now;
    },
    
    shootBossRadial(enemy, game) {
        const now = Date.now();
        if (now - enemy.lastRadialShot < enemy.radialFireRate * 1000) return;
        
        for (let i = 0; i < enemy.radialBullets; i++) {
            const angle = (i / enemy.radialBullets) * Math.PI * 2;
            
            const bullet = {
                x: enemy.x + Math.cos(angle) * (enemy.size / 2 + 5),
                y: enemy.y + Math.sin(angle) * (enemy.size / 2 + 5),
                angle: angle,
                speed: enemy.bulletSpeed,
                size: GAME_CONFIG.BULLET_SIZE * 1.5,
                damage: enemy.bulletDamage,
                owner: 'enemy',
                isAlive: true,
                color: enemy.bulletColor,
                bounces: 0
            };
            
            game.bullets.push(bullet);
        }
        
        enemy.lastRadialShot = now;
    },
    
    checkGameEnd(game) {
        const aliveEnemies = this.enemies.filter(e => e.isAlive);
        const alivePlayers = game.tanks.filter(t => t.isAlive && t.isPlayer);
        const aliveAllies = game.tanks.filter(t => t.isAlive && t.isAIAlly);
        
        // In campaign mode, treat AI allies as "players" for game end logic
        const totalAlivePlayers = alivePlayers.length + aliveAllies.length;
        
        console.log('🎯 Game end check - Alive enemies:', aliveEnemies.length, 'Alive players:', alivePlayers.length, 'Alive allies:', aliveAllies.length, 'Total alive:', totalAlivePlayers);
        
        if (aliveEnemies.length === 0) {
            console.log('🎯 Level completed - no enemies left');
            // Level completed
            this.showLevelComplete(game);
        } else if (totalAlivePlayers === 0) {
            console.log('🎯 Level failed - no players or allies left');
            // Players and allies defeated
            this.showLevelFailed(game);
        }
    },
    
    showLevelComplete(game) {
        game.gameState = GAME_STATES.PAUSED;
        
        // Play victory song on every level completion
        if (window.audioSystem) {
            window.audioSystem.stopMusic();
            window.audioSystem.playMusic('victory.mp3', false);
        }
        
        this.showLevelStats(game, true);
    },
    
    showLevelFailed(game) {
        game.gameState = GAME_STATES.PAUSED;
        this.showLevelStats(game, false);
    },
    
    showLevelStats(game, success) {
        // Create level completion overlay
        const overlay = document.createElement('div');
        overlay.id = 'levelCompleteOverlay';
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
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: #2a2a2a;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            max-width: 1000px;
            border: 2px solid ${success ? '#4caf50' : '#f44336'};
        `;
        
        const title = document.createElement('h2');
        title.textContent = success ? `Level ${this.currentLevel} Complete!` : `Level ${this.currentLevel} Failed!`;
        title.style.color = success ? '#4caf50' : '#f44336';
        title.style.marginBottom = '20px';
        
        const statsDiv = document.createElement('div');
        statsDiv.style.textAlign = 'left';
        statsDiv.style.marginBottom = '20px';
        
        // Show richer statistics (similar to FFA/TDM but relevant to campaign)
        const totalKills = this.levelStats.enemiesKilled;
        let tableRows = '';
        game.playerStats.forEach((stats, id) => {
            const tank = game.tanks.find(t => t.id === id);
            if (!tank) return;
            const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
            const timeAliveSec = Math.round((stats.timeAlive || (tank.isAlive ? (Date.now() - game.gameStartTime) : (tank.deathTime - game.gameStartTime))) / 1000);
            const role = tank.isPlayer ? 'Player' : (tank.isAIAlly ? 'AI Ally' : '');
            if (!role) return; // show only players and allies
            tableRows += `
                <tr>
                    <td style="padding: 6px; border-bottom: 1px solid #444;">${stats.name}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #444;">${stats.kills}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #444;">${stats.shotsFired}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #444;">${stats.shotsHit}</td>
                    <td style=\"padding: 6px; border-bottom: 1px solid #444;\">${stats.enemyHits || 0}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #444;">${accuracy}%</td>
                    <td style="padding: 6px; border-bottom: 1px solid #444;">${timeAliveSec}s</td>
                    <td style="padding: 6px; border-bottom: 1px solid #444;">${stats.deaths}</td>
                </tr>`;
        });
        statsDiv.innerHTML = `
            <h3 style="color: #2196f3; margin-bottom: 10px;">Statistics</h3>
            <p><strong>Total Enemies Killed:</strong> ${totalKills}</p>
            <p><strong>Level:</strong> ${this.currentLevel}/${CAMPAIGN_CONFIG.TOTAL_LEVELS}</p>
            <p><strong>Difficulty:</strong> ${this.difficulty}</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background: #444;">
                        <th style="padding: 6px; text-align: left;">Name</th>
                        <th style="padding: 6px; text-align: left;">Kills</th>
                        <th style="padding: 6px; text-align: left;">Shots Fired</th>
                        <th style=\"padding: 6px; text-align: left;\">Shots Hit</th>
                        <th style=\"padding: 6px; text-align: left;\">Enemy Hits</th>
                        <th style="padding: 6px; text-align: left;">Accuracy</th>
                        <th style="padding: 6px; text-align: left;">Time Alive</th>
                        <th style="padding: 6px; text-align: left;">Deaths</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || '<tr><td colspan="8" style="padding: 8px;">No data</td></tr>'}
                </tbody>
            </table>
        `;
        
        // (Removed redundant Player Kills section; covered in table above)
        
        const buttonDiv = document.createElement('div');
        buttonDiv.style.marginTop = '20px';
        
        if (success) {
            if (this.currentLevel < CAMPAIGN_CONFIG.TOTAL_LEVELS) {
                const nextLevelBtn = document.createElement('button');
                nextLevelBtn.textContent = 'Next Level';
                nextLevelBtn.style.cssText = `
                    background: #4caf50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    margin: 0 10px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                `;
                nextLevelBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    this.nextLevel(game);
                };
                buttonDiv.appendChild(nextLevelBtn);
            } else {
                const completeBtn = document.createElement('button');
                completeBtn.textContent = 'Campaign Complete!';
                completeBtn.style.cssText = `
                    background: #ff9800;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    margin: 0 10px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                `;
                completeBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    this.showCampaignComplete(game);
                };
                buttonDiv.appendChild(completeBtn);
            }
        }
        
        const restartBtn = document.createElement('button');
        restartBtn.textContent = 'Restart Level';
        restartBtn.style.cssText = `
            background: #2196f3;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 0 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        `;
        restartBtn.onclick = () => {
            document.body.removeChild(overlay);
            this.restartLevel(game);
        };
        buttonDiv.appendChild(restartBtn);
        
        const menuBtn = document.createElement('button');
        menuBtn.textContent = 'Main Menu';
        menuBtn.style.cssText = `
            background: #666;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 0 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        `;
        menuBtn.onclick = () => {
            document.body.removeChild(overlay);
            if (window.menu) {
                window.menu.returnToMenu();
            }
        };
        buttonDiv.appendChild(menuBtn);
        
        content.appendChild(title);
        content.appendChild(statsDiv);
        content.appendChild(buttonDiv);
        overlay.appendChild(content);
        
        document.body.appendChild(overlay);
    },
    
    nextLevel(game) {
        if (this.currentLevel < CAMPAIGN_CONFIG.TOTAL_LEVELS) {
            this.currentLevel++;
            this.initializeLevel(game);
            game.gameState = GAME_STATES.PLAYING;
        } else {
            // Campaign completed
            this.showCampaignComplete(game);
        }
    },
    
    showCampaignComplete(game) {
        game.gameState = GAME_STATES.PAUSED;
        
        // Play campaign completion music
        if (window.audioSystem) {
            window.audioSystem.playMusic('victory.mp3', true);
        }
        
        // Create campaign completion overlay
        const overlay = document.createElement('div');
        overlay.id = 'campaignCompleteOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            max-width: 700px;
            border: 3px solid #ff9800;
            box-shadow: 0 0 30px rgba(255, 152, 0, 0.3);
        `;
        
        const title = document.createElement('h1');
        title.textContent = '🎉 CAMPAIGN COMPLETE! 🎉';
        title.style.color = '#ff9800';
        title.style.marginBottom = '20px';
        title.style.fontSize = '2.5em';
        title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        
        const subtitle = document.createElement('h2');
        subtitle.textContent = 'Congratulations! You have conquered all 5 levels!';
        subtitle.style.color = '#4caf50';
        subtitle.style.marginBottom = '30px';
        subtitle.style.fontSize = '1.5em';
        
        const statsDiv = document.createElement('div');
        statsDiv.style.textAlign = 'left';
        statsDiv.style.marginBottom = '30px';
        statsDiv.style.background = 'rgba(0,0,0,0.3)';
        statsDiv.style.padding = '20px';
        statsDiv.style.borderRadius = '10px';
        
        // Calculate total campaign statistics
        let totalEnemiesKilled = 0;
        let totalPlayerKills = 0;
        let totalAIAllyKills = 0;
        
        // This would need to be tracked across all levels in a real implementation
        statsDiv.innerHTML = `
            <h3 style="color: #2196f3; margin-bottom: 15px; text-align: center;">Final Campaign Statistics</h3>
            <p style="font-size: 1.2em;"><strong>🎯 Total Enemies Defeated:</strong> ${totalEnemiesKilled}</p>
            <p style="font-size: 1.2em;"><strong>🏆 Levels Completed:</strong> ${CAMPAIGN_CONFIG.TOTAL_LEVELS}/5</p>
            <p style="font-size: 1.2em;"><strong>⚔️ Difficulty:</strong> ${this.difficulty}</p>
            <p style="font-size: 1.2em;"><strong>🤖 AI Allies Used:</strong> ${this.aiAlliesEnabled ? 'Yes' : 'No'}</p>
        `;
        
        const buttonDiv = document.createElement('div');
        buttonDiv.style.marginTop = '30px';
        
        const playAgainBtn = document.createElement('button');
        playAgainBtn.textContent = '🎮 Play Again';
        playAgainBtn.style.cssText = `
            background: linear-gradient(45deg, #4caf50, #45a049);
            color: white;
            border: none;
            padding: 15px 30px;
            margin: 0 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        `;
        playAgainBtn.onmouseover = () => playAgainBtn.style.transform = 'scale(1.05)';
        playAgainBtn.onmouseout = () => playAgainBtn.style.transform = 'scale(1)';
        playAgainBtn.onclick = () => {
            document.body.removeChild(overlay);
            this.currentLevel = 1;
            this.initializeLevel(game);
            game.gameState = GAME_STATES.PLAYING;
        };
        buttonDiv.appendChild(playAgainBtn);
        
        const menuBtn = document.createElement('button');
        menuBtn.textContent = '🏠 Main Menu';
        menuBtn.style.cssText = `
            background: linear-gradient(45deg, #2196f3, #1976d2);
            color: white;
            border: none;
            padding: 15px 30px;
            margin: 0 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        `;
        menuBtn.onmouseover = () => menuBtn.style.transform = 'scale(1.05)';
        menuBtn.onmouseout = () => menuBtn.style.transform = 'scale(1)';
        menuBtn.onclick = () => {
            document.body.removeChild(overlay);
            if (window.menu) {
                window.menu.returnToMenu();
            }
        };
        buttonDiv.appendChild(menuBtn);
        
        content.appendChild(title);
        content.appendChild(subtitle);
        content.appendChild(statsDiv);
        content.appendChild(buttonDiv);
        overlay.appendChild(content);
        
        document.body.appendChild(overlay);
    },
    
    restartLevel(game) {
        this.initializeLevel(game);
        game.gameState = GAME_STATES.PLAYING;
    },
    
    hudInfo(game) {
        const aliveEnemies = this.enemies.filter(e => e.isAlive).length;
        const alivePlayers = game.tanks.filter(t => t.isAlive && t.isPlayer).length;
        const aliveAllies = this.aiAllies.filter(a => a.isAlive).length;
        const totalAlive = alivePlayers + aliveAllies;
        
        return {
            lines: [
                `Level: ${this.currentLevel}/${CAMPAIGN_CONFIG.TOTAL_LEVELS}`,
                `Enemies: ${aliveEnemies}`,
                `Players: ${alivePlayers}`,
                `AI Allies: ${aliveAllies}`,
                `Total: ${totalAlive}`,
                `Mode: Campaign (${this.difficulty})`
            ]
        };
    }
};

window.modeManager.register(GAME_MODES.CAMPAIGN, CampaignMode);
