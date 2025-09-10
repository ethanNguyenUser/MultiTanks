// =============================================================================
// AI BEHAVIOR SYSTEM
// =============================================================================
// Handles AI tank behavior, movement, and targeting

class AIBehavior {
    constructor(game) {
        this.game = game;
    }

    /**
     * Find the nearest enemy to an AI tank (players or other AIs)
     * @param {Object} aiTank - AI tank looking for target
     * @returns {Object|null} Nearest enemy tank or null
     */
    findNearestEnemy(aiTank) {
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        
        // In campaign mode, AI allies should target enemies from the campaign mode
        if (this.game.gameMode === GAME_MODES.CAMPAIGN && aiTank.isAIAlly) {
            // Use the pre-set target from campaign mode
            return aiTank.aiTarget;
        }
        
        // Check all tanks except the current AI tank
        this.game.tanks.forEach(tank => {
            if (!tank.isAlive || tank.id === aiTank.id) return;
            
            // In TDM mode, only target enemies (different team)
            if (this.game.gameMode === GAME_MODES.TDM) {
                if (aiTank.team === tank.team) {
                    return; // Skip same team
                }
            }
            
            // In campaign mode, regular AI tanks should target enemies (not players or AI allies)
            if (this.game.gameMode === GAME_MODES.CAMPAIGN) {
                if (tank.isPlayer || tank.isAIAlly) {
                    return; // Skip players and AI allies
                }
            }
            
            const distance = Math.sqrt((tank.x - aiTank.x) ** 2 + (tank.y - aiTank.y) ** 2);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = tank;
            }
        });
        
        return nearestEnemy;
    }

    /**
     * Normalize angle to [-π, π] range
     * @param {number} angle - Angle to normalize
     * @returns {number} Normalized angle
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    /**
     * Follow players in campaign mode when no enemies are nearby
     * @param {Object} tank - AI ally tank
     */
    followPlayersInCampaign(tank) {
        const players = this.game.tanks.filter(t => t.isAlive && t.isPlayer);
        if (players.length === 0) return;
        
        const avgX = players.reduce((sum, p) => sum + p.x, 0) / players.length;
        const avgY = players.reduce((sum, p) => sum + p.y, 0) / players.length;
        
        const dx = avgX - tank.x;
        const dy = avgY - tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only move if we're not already close to players
        if (distance > tank.followDistance) {
            const moveX = (dx / distance) * tank.speed;
            const moveY = (dy / distance) * tank.speed;
            
            const newX = tank.x + moveX;
            const newY = tank.y + moveY;
            const moveAngle = Math.atan2(dy, dx);
            
            this.game.moveTankWithSliding(tank, newX, newY, moveAngle);
        }
    }

    /**
     * Find the nearest powerup to an AI tank
     * @param {Object} aiTank - AI tank looking for powerup
     * @returns {Object|null} Nearest powerup or null
     */
    findNearestPowerup(aiTank) {
        let nearestPowerup = null;
        let nearestDistance = Infinity;
        
        this.game.powerups.forEach(powerup => {
            if (!powerup.alive) return;
            
            const distance = Math.sqrt((powerup.x - aiTank.x) ** 2 + (powerup.y - aiTank.y) ** 2);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPowerup = powerup;
            }
        });
        
        return nearestPowerup;
    }

    /**
     * Update AI tank behavior
     * @param {Object} tank - AI tank to update
     * @param {number} deltaTime - Time since last frame
     */
    updateAITank(tank, deltaTime) {
        const currentTime = Date.now();
        
        // Check if AI is in powerup cooldown period
        const isInPowerupCooldown = currentTime < tank.aiPowerupCooldownEndTime;
        
        // Check for nearby powerups first (within 500 pixels) - but only if not in cooldown
        const nearestPowerup = !isInPowerupCooldown ? this.findNearestPowerup(tank) : null;
        let targetPowerup = null;
        
        if (nearestPowerup) {
            const distanceToPowerup = Math.sqrt((nearestPowerup.x - tank.x) ** 2 + (nearestPowerup.y - tank.y) ** 2);
            if (distanceToPowerup <= GAME_CONFIG.POWERUP_CHASE_DISTANCE) {
                // Check if this is a new powerup to chase
                if (tank.aiCurrentPowerupId !== nearestPowerup.id) {
                    // Start chasing new powerup
                    tank.aiCurrentPowerupId = nearestPowerup.id;
                    tank.aiPowerupChaseStartTime = currentTime;
                }
                
                // Check if we've been chasing this powerup too long
                const chaseDuration = currentTime - tank.aiPowerupChaseStartTime;
                if (chaseDuration > GAME_CONFIG.AI_POWERUP_CHASE_TIMEOUT) {
                    // Give up on this powerup and enter cooldown
                    tank.aiCurrentPowerupId = null;
                    tank.aiPowerupChaseStartTime = 0;
                    tank.aiPowerupCooldownEndTime = currentTime + GAME_CONFIG.AI_POWERUP_COOLDOWN;
                } else {
                    // Continue chasing this powerup
                    targetPowerup = nearestPowerup;
                }
            } else {
                // Powerup is too far, reset chase tracking
                tank.aiCurrentPowerupId = null;
                tank.aiPowerupChaseStartTime = 0;
            }
        } else {
            // No powerup found, reset chase tracking
            tank.aiCurrentPowerupId = null;
            tank.aiPowerupChaseStartTime = 0;
        }
        
        // Find nearest enemy (player or other AI)
        let nearestEnemy = this.findNearestEnemy(tank);

        // In FFA/TDM, enforce target stickiness: keep current target for at least 1s before switching
        if (this.game.gameMode !== GAME_MODES.CAMPAIGN) {
            const nowTs = Date.now();
            let lockedTarget = null;
            if (tank.aiLockedTargetId !== undefined && tank.aiLockedTargetId !== null) {
                lockedTarget = this.game.tanks.find(t => t.id === tank.aiLockedTargetId && t.isAlive);
                // In TDM, ensure locked target is still an enemy
                if (this.game.gameMode === GAME_MODES.TDM && lockedTarget && tank.team === lockedTarget.team) {
                    lockedTarget = null;
                }
            }
            const lockUntil = tank.aiTargetLockUntil || 0;
            if (lockedTarget && nowTs < lockUntil) {
                // Stick to locked target during lock window
                nearestEnemy = lockedTarget;
            } else if (nearestEnemy) {
                // Acquire/refresh lock for new target
                if (!lockedTarget || nearestEnemy.id !== lockedTarget.id || nowTs >= lockUntil) {
                    tank.aiLockedTargetId = nearestEnemy.id;
                    tank.aiTargetLockUntil = nowTs + (GAME_CONFIG.AI_TARGET_LOCK_DURATION_MS || 1000);
                }
            } else {
                // No enemy; clear lock
                tank.aiLockedTargetId = null;
                tank.aiTargetLockUntil = 0;
            }
        }
        
        // Determine primary target (powerup takes priority if within range)
        let primaryTarget = targetPowerup || nearestEnemy;
        if (!primaryTarget) {
            // For AI allies in campaign mode, follow players when no enemies are nearby
            if (this.game.gameMode === GAME_MODES.CAMPAIGN && tank.isAIAlly) {
                this.followPlayersInCampaign(tank);
            }
            return;
        }
        
        const distanceToTarget = Math.sqrt((primaryTarget.x - tank.x) ** 2 + (primaryTarget.y - tank.y) ** 2);
        
        // Handle movement based on target type
        if (targetPowerup) {
            // Chasing powerup - move directly toward it
            const angleToPowerup = Math.atan2(primaryTarget.y - tank.y, primaryTarget.x - tank.x);
            const newX = tank.x + Math.cos(angleToPowerup) * tank.speed;
            const newY = tank.y + Math.sin(angleToPowerup) * tank.speed;
            
            this.game.moveTankWithSliding(tank, newX, newY, angleToPowerup);
        } else if (nearestEnemy) {
            // Chasing enemy - use original behavior
            const distanceToEnemy = Math.sqrt((nearestEnemy.x - tank.x) ** 2 + (nearestEnemy.y - tank.y) ** 2);
            
            // In campaign mode, AI allies should approach enemies more aggressively
            const approachDistance = (this.game.gameMode === GAME_MODES.CAMPAIGN && tank.isAIAlly) 
                ? GAME_CONFIG.AI_APPROACH_DISTANCE * 1.5 
                : GAME_CONFIG.AI_APPROACH_DISTANCE;
            
            if (distanceToEnemy > approachDistance) {
                // Approach the target
                const angleToEnemy = Math.atan2(nearestEnemy.y - tank.y, nearestEnemy.x - tank.x);
                const newX = tank.x + Math.cos(angleToEnemy) * tank.speed;
                const newY = tank.y + Math.sin(angleToEnemy) * tank.speed;
                
                this.game.moveTankWithSliding(tank, newX, newY, angleToEnemy);
            } else if (distanceToEnemy < GAME_CONFIG.AI_MIN_ORBIT_DISTANCE || Date.now() < tank.aiRetreatEndTime) {
                // Too close or still in retreat mode! Move away from target
                if (distanceToEnemy < GAME_CONFIG.AI_MIN_ORBIT_DISTANCE) {
                    // Start retreat timer
                    tank.aiRetreatEndTime = Date.now() + GAME_CONFIG.AI_RETREAT_DURATION;
                }
                
                const angleToEnemy = Math.atan2(nearestEnemy.y - tank.y, nearestEnemy.x - tank.x);
                const angleAway = angleToEnemy + Math.PI; // Opposite direction
                const newX = tank.x + Math.cos(angleAway) * tank.speed;
                const newY = tank.y + Math.sin(angleAway) * tank.speed;
                
                this.game.moveTankWithSliding(tank, newX, newY, angleAway);
            } else {
                // Good distance for orbiting
                const angleToEnemy = Math.atan2(nearestEnemy.y - tank.y, nearestEnemy.x - tank.x);
                
                // Randomly change orbit direction occasionally
                if (Math.random() < GAME_CONFIG.AI_ORBIT_DIRECTION_CHANGE_CHANCE) {
                    tank.aiOrbitDirection *= -1; // Switch direction
                }
                
                // Update orbit angle
                tank.aiOrbitAngle += tank.aiOrbitDirection * GAME_CONFIG.AI_ORBIT_SPEED;
                
                // Calculate orbit position (perpendicular to line to enemy)
                const orbitAngle = angleToEnemy + Math.PI / 2 + tank.aiOrbitAngle;
                const orbitDistance = GAME_CONFIG.AI_ORBIT_DISTANCE;
                
                const targetX = nearestEnemy.x + Math.cos(orbitAngle) * orbitDistance;
                const targetY = nearestEnemy.y + Math.sin(orbitAngle) * orbitDistance;
                
                // Move toward orbit position
                const moveAngle = Math.atan2(targetY - tank.y, targetX - tank.x);
                const newX = tank.x + Math.cos(moveAngle) * tank.speed;
                const newY = tank.y + Math.sin(moveAngle) * tank.speed;
                
                this.game.moveTankWithSliding(tank, newX, newY, moveAngle);
            }
        }
        
        // Turret behavior: always aim at nearest enemy (even when chasing powerups)
        if (nearestEnemy) {
            let targetX = nearestEnemy.x;
            let targetY = nearestEnemy.y;
            
            // Calculate shot leading if enabled
            if (GAME_CONFIG.AI_SHOT_LEADING_ENABLED) {
                // Calculate target velocity from position changes
                const frameTime = deltaTime || 16; // Default to 16ms (60fps)
                tank.aiTargetVelocityX = (nearestEnemy.x - tank.aiLastTargetX) / frameTime;
                tank.aiTargetVelocityY = (nearestEnemy.y - tank.aiLastTargetY) / frameTime;
                
                // Calculate time for bullet to reach target
                const distanceToTarget = Math.sqrt((nearestEnemy.x - tank.x) ** 2 + (nearestEnemy.y - tank.y) ** 2);
                const bulletTravelTime = distanceToTarget / GAME_CONFIG.BULLET_SPEED;
                
                // Predict target position when bullet arrives
                const leadFactor = GAME_CONFIG.AI_SHOT_LEADING_FACTOR;
                targetX = nearestEnemy.x + tank.aiTargetVelocityX * bulletTravelTime * leadFactor;
                targetY = nearestEnemy.y + tank.aiTargetVelocityY * bulletTravelTime * leadFactor;
                
                // Update last known positions
                tank.aiLastTargetX = nearestEnemy.x;
                tank.aiLastTargetY = nearestEnemy.y;
            }
            
            const angleToTarget = Math.atan2(targetY - tank.y, targetX - tank.x);
            
            // Aim directly at target (randomness disabled)
            const targetAngle = angleToTarget;
            
            const angleDiff = this.normalizeAngle(targetAngle - tank.turretAngle);
            
            // Rotate turret toward target (with randomness)
            if (Math.abs(angleDiff) > 0.1) {
                if (angleDiff > 0) {
                    tank.turretAngle += tank.turretRotationSpeed;
                } else {
                    tank.turretAngle -= tank.turretRotationSpeed;
                }
            }
            
            // Shoot when aimed (within 0.2 radians)
            if (Math.abs(angleDiff) < 0.2) {
                // Apply rapid fire powerup (stacking) for AI
                const rapidFireStacks = tank.powerups.rapidFire.length;
                const fireRateMultiplier = rapidFireStacks > 0 ? Math.pow(GAME_CONFIG.POWERUP_FIRE_RATE_MULTIPLIER, rapidFireStacks) : 1;
                const cooldown = GAME_CONFIG.SHOOT_COOLDOWN / fireRateMultiplier;
                
                if (Date.now() - tank.lastShot > cooldown) {
                    this.game.shootBullet(tank);
                    tank.lastShot = Date.now();
                    
                    // Play shoot sound for AI
                    if (window.audioSystem) {
                        window.audioSystem.shoot();
                    }
                }
            }
        }
    }
}

// =============================================================================
// GLOBAL AI BEHAVIOR INSTANCE
// =============================================================================
window.aiBehavior = null;
