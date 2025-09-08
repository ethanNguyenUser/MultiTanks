// =============================================================================
// COLLISIONS & MOVEMENT MODULE
// =============================================================================

class GameCollisions {
    constructor(game) {
        this.game = game;
    }

    moveTankWithSliding(tank, newX, newY, moveAngle) {
        if (!this.checkTankObstacleCollision(tank, newX, newY)) {
            tank.x = newX; tank.y = newY; tank.angle = moveAngle; return;
        }
        if (!this.checkTankObstacleCollision(tank, newX, tank.y)) {
            tank.x = newX; tank.angle = moveAngle; return;
        }
        if (!this.checkTankObstacleCollision(tank, tank.x, newY)) {
            tank.y = newY; tank.angle = moveAngle; return;
        }
        const perpendicularAngle = moveAngle + Math.PI / 2;
        const slideX = tank.x + Math.cos(perpendicularAngle) * tank.speed * GAME_CONFIG.AI_SLIDE_SPEED_MULTIPLIER;
        const slideY = tank.y + Math.sin(perpendicularAngle) * tank.speed * GAME_CONFIG.AI_SLIDE_SPEED_MULTIPLIER;
        if (!this.checkTankObstacleCollision(tank, slideX, slideY)) {
            tank.x = slideX; tank.y = slideY; tank.angle = perpendicularAngle; return;
        }
        const oppositePerpendicularAngle = moveAngle - Math.PI / 2;
        const slideX2 = tank.x + Math.cos(oppositePerpendicularAngle) * tank.speed * GAME_CONFIG.AI_SLIDE_SPEED_MULTIPLIER;
        const slideY2 = tank.y + Math.sin(oppositePerpendicularAngle) * tank.speed * GAME_CONFIG.AI_SLIDE_SPEED_MULTIPLIER;
        if (!this.checkTankObstacleCollision(tank, slideX2, slideY2)) {
            tank.x = slideX2; tank.y = slideY2; tank.angle = oppositePerpendicularAngle;
        }
    }

    checkTankObstacleCollision(tank, newX, newY) {
        return this.game.obstacles.some(obstacle => {
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

    constrainTankToMap(tank) {
        tank.x = Math.max(tank.size / 2, Math.min(GAME_CONFIG.MAP_WIDTH - tank.size / 2, tank.x));
        tank.y = Math.max(tank.size / 2, Math.min(GAME_CONFIG.MAP_HEIGHT - tank.size / 2, tank.y));
    }
}

window.GameCollisions = GameCollisions;


