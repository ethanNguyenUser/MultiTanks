// =============================================================================
// GAME RENDERER MODULE
// =============================================================================

class GameRenderer {
    constructor(game) {
        this.game = game;
    }

    render() {
        const { ctx, canvas } = this.game;
        if (!ctx) return;

        ctx.fillStyle = GAME_CONFIG.MAP_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.renderGrid();
        this.renderObstacles();
        this.renderTanks();
        this.renderBullets();
        this.renderPowerups();
        this.renderUI();
    }

    renderGrid() {
        const { ctx, canvas } = this.game;
        const gridSize = 50;
        const gridColor = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    renderObstacles() {
        const { ctx } = this.game;
        this.game.obstacles.forEach(obstacle => {
            ctx.fillStyle = obstacle.color;
            if (obstacle.type === 'rock') {
                ctx.beginPath();
                ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(
                    obstacle.x - obstacle.width / 2,
                    obstacle.y - obstacle.height / 2,
                    obstacle.width,
                    obstacle.height
                );
            }
        });
    }

    renderTanks() {
        const { ctx } = this.game;
        this.game.tanks.forEach(tank => {
            if (!tank.isAlive) return;
            ctx.save();
            ctx.translate(tank.x, tank.y);
            ctx.fillStyle = tank.color;
            ctx.beginPath();
            ctx.arc(0, 0, tank.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#808080';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(tank.turretAngle) * tank.turretLength, Math.sin(tank.turretAngle) * tank.turretLength);
            ctx.stroke();
            if (tank.health < tank.maxHealth) {
                const barWidth = tank.size;
                const barHeight = 4;
                const healthPercent = tank.health / tank.maxHealth;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-barWidth / 2, -tank.size / 2 - 10, barWidth, barHeight);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(-barWidth / 2, -tank.size / 2 - 10, barWidth * healthPercent, barHeight);
            }
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const nameY = -tank.size / 2 - 15;
            ctx.strokeText(tank.name, 0, nameY);
            ctx.fillText(tank.name, 0, nameY);
            this.renderPowerupIndicators(tank, nameY);
            ctx.restore();
        });
    }

    renderBullets() {
        const { ctx } = this.game;
        this.game.bullets.forEach(bullet => {
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    renderPowerupIndicators(tank, nameY) {
        const { ctx } = this.game;
        const activePowerups = [];
        const powerupMapping = {
            'invincibility': 'INVINCIBILITY',
            'speed': 'SPEED',
            'rapidFire': 'RAPID_FIRE',
            'spreadShot': 'SPREAD_SHOT',
            'bouncingBullets': 'BOUNCING_BULLETS'
        };
        Object.keys(tank.powerups).forEach(powerupType => {
            const powerupArray = tank.powerups[powerupType];
            if (powerupArray.length > 0) {
                const configKey = powerupMapping[powerupType];
                if (configKey && GAME_CONFIG.POWERUP_TYPES[configKey]) {
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
        const nameWidth = ctx.measureText(tank.name).width;
        const startX = nameWidth / 2 + 10;
        const indicatorY = nameY - 5;
        activePowerups.forEach((powerup, index) => {
            const indicatorX = startX + (index * 25);
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            const emoji = GAME_CONFIG.POWERUP_TYPES[powerup.type].emoji;
            ctx.strokeText(emoji, indicatorX, indicatorY);
            ctx.fillText(emoji, indicatorX, indicatorY);
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#ffff00';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            const timeText = Math.ceil(powerup.timeRemaining / 1000) + 's';
            const stackText = powerup.stacks > 1 ? ` (${powerup.stacks}x)` : '';
            ctx.strokeText(timeText + stackText, indicatorX, indicatorY + 8);
            ctx.fillText(timeText + stackText, indicatorX, indicatorY + 8);
        });
    }

    renderPowerups() {
        const { ctx } = this.game;
        this.game.powerups.forEach(powerup => {
            if (!powerup.alive) return;
            ctx.save();
            ctx.translate(powerup.x, powerup.y);
            ctx.rotate(powerup.rotation);
            ctx.fillStyle = GAME_CONFIG.POWERUP_TYPES[powerup.type].color;
            ctx.beginPath();
            ctx.arc(0, 0, powerup.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(GAME_CONFIG.POWERUP_TYPES[powerup.type].emoji, 0, 0);
            ctx.restore();
            powerup.rotation += 0.02;
        });
    }

    renderUI() {
        const { ctx } = this.game;
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        if (this.game.gameMode === GAME_MODES.TDM) {
            const redAlive = this.game.teams.red.filter(tank => tank.isAlive).length;
            const blueAlive = this.game.teams.blue.filter(tank => tank.isAlive).length;
            ctx.fillStyle = GAME_CONFIG.TEAM_COLORS.RED;
            ctx.fillText(`Red Team: ${redAlive}`, 10, 25);
            ctx.fillStyle = GAME_CONFIG.TEAM_COLORS.BLUE;
            ctx.fillText(`Blue Team: ${blueAlive}`, 10, 45);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Mode: TDM`, 10, 65);
        } else {
            ctx.fillText(`Players: ${this.game.numPlayers} | AI: ${this.game.numAIBots}`, 10, 25);
            const aliveTanks = this.game.tanks.filter(tank => tank.isAlive).length;
            ctx.fillText(`Alive: ${aliveTanks}`, 10, 45);
            ctx.fillText(`Mode: FFA`, 10, 65);
        }
    }
}

window.GameRenderer = GameRenderer;


