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
        
        // Check all tanks except the current AI tank
        this.game.tanks.forEach(tank => {
            if (!tank.isAlive || tank.id === aiTank.id) return;
            
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
     * Update AI tank behavior
     * @param {Object} tank - AI tank to update
     * @param {number} deltaTime - Time since last frame
     */
    updateAITank(tank, deltaTime) {
        // Find nearest enemy (player or other AI)
        const nearestEnemy = this.findNearestEnemy(tank);
        if (!nearestEnemy) return;
        
        const distanceToEnemy = Math.sqrt((nearestEnemy.x - tank.x) ** 2 + (nearestEnemy.y - tank.y) ** 2);
        
        // Simple movement: approach until close enough, then orbit
        if (distanceToEnemy > GAME_CONFIG.AI_APPROACH_DISTANCE) {
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
        
        // Simple turret behavior: aim at target with shot leading and randomness
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
        
        // Add some randomness to the target angle
        const randomOffset = (Math.random() - 0.5) * GAME_CONFIG.AI_AIMING_RANDOMNESS;
        const targetAngle = angleToTarget + randomOffset;
        
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
            if (Date.now() - tank.lastShot > GAME_CONFIG.SHOOT_COOLDOWN) {
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

// =============================================================================
// GLOBAL AI BEHAVIOR INSTANCE
// =============================================================================
window.aiBehavior = null;
