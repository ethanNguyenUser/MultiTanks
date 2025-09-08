// =============================================================================
// TDM MODE
// =============================================================================

const TDMMode = {
    key: GAME_MODES.TDM,
    musicTrack(game) {
        return 'tdm.mp3';
    },
    assignTeams(game) {
        game.teams = { red: [], blue: [] };
        // Players
        for (let i = 0; i < game.numPlayers; i++) {
            const team = game.teamAssignments[i] || (i % 2 === 0 ? 'red' : 'blue');
            game.teams[team].push(i);
        }
        // AIs (respect provided distribution if any)
        let redRemain = 0, blueRemain = 0;
        if (game.aiTeamDistribution) {
            redRemain = game.aiTeamDistribution.red;
            blueRemain = game.aiTeamDistribution.blue;
        }
        for (let i = 0; i < game.numAIBots; i++) {
            const idx = game.numPlayers + i;
            let team;
            if (game.aiTeamDistribution) {
                if (redRemain > 0) { team = 'red'; redRemain--; }
                else if (blueRemain > 0) { team = 'blue'; blueRemain--; }
                else { team = i % 2 === 0 ? 'red' : 'blue'; }
            } else {
                team = i % 2 === 0 ? 'red' : 'blue';
            }
            game.teams[team].push(idx);
        }
    },
    calculateSpawnPositions(game) {
        const positions = [];
        const edge = GAME_CONFIG.SPAWN_DISTANCE_FROM_EDGE;
        const width = GAME_CONFIG.MAP_WIDTH;
        const height = GAME_CONFIG.MAP_HEIGHT;
        const leftPositions = this._sidePositions('left', game.teams.red.length, edge, width, height);
        const rightPositions = this._sidePositions('right', game.teams.blue.length, edge, width, height);
        game.teams.red.forEach((tankIndex, i) => { positions[tankIndex] = leftPositions[i]; });
        game.teams.blue.forEach((tankIndex, i) => { positions[tankIndex] = rightPositions[i]; });
        return positions;
    },
    _sidePositions(side, count, edge, width, height) {
        const positions = [];
        const x = side === 'left' ? edge : width - edge;
        const spacing = (height - 2 * edge) / Math.max(1, count - 1);
        for (let i = 0; i < count; i++) positions.push({ x, y: edge + (i * spacing) });
        return positions;
    },
    checkGameEnd(game) {
        const redAlive = game.tanks.filter(t => t.isAlive && t.team === 'red').length;
        const blueAlive = game.tanks.filter(t => t.isAlive && t.team === 'blue').length;
        if (redAlive === 0 || blueAlive === 0) game.endGame();
    },
    hudInfo(game) {
        const redAlive = game.tanks.filter(t => t.isAlive && t.team === 'red').length;
        const blueAlive = game.tanks.filter(t => t.isAlive && t.team === 'blue').length;
        return { lines: [`Red Team: ${redAlive}`, `Blue Team: ${blueAlive}`, 'Mode: TDM'] };
    }
};

window.modeManager.register(GAME_MODES.TDM, TDMMode);


