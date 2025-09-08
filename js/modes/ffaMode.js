// =============================================================================
// FFA MODE
// =============================================================================

const FFAMode = {
    key: GAME_MODES.FFA,
    musicTrack(game) {
        return 'ffa.mp3';
    },
    assignTeams(game) {
        // No teams in FFA
        game.teams = { red: [], blue: [] };
    },
    calculateSpawnPositions(game) {
        const positions = [];
        const edge = GAME_CONFIG.SPAWN_DISTANCE_FROM_EDGE;
        const width = GAME_CONFIG.MAP_WIDTH;
        const height = GAME_CONFIG.MAP_HEIGHT;
        const totalTanks = game.numPlayers + game.numAIBots;
        if (totalTanks <= 4) {
            const cornerPositions = [
                { x: edge, y: edge },
                { x: width - edge, y: edge },
                { x: width - edge, y: height - edge },
                { x: edge, y: height - edge },
            ];
            for (let i = 0; i < totalTanks; i++) positions.push(cornerPositions[i]);
            return positions;
        }
        const perimeterPoints = [];
        for (let x = edge; x <= width - edge; x += 20) perimeterPoints.push({ x, y: edge });
        for (let y = edge; y <= height - edge; y += 20) perimeterPoints.push({ x: width - edge, y });
        for (let x = width - edge; x >= edge; x -= 20) perimeterPoints.push({ x, y: height - edge });
        for (let y = height - edge; y >= edge; y -= 20) perimeterPoints.push({ x: edge, y });
        const step = Math.floor(perimeterPoints.length / totalTanks);
        for (let i = 0; i < totalTanks; i++) positions.push(perimeterPoints[(i * step) % perimeterPoints.length]);
        return positions;
    },
    checkGameEnd(game) {
        const aliveTanks = game.tanks.filter(t => t.isAlive);
        if (aliveTanks.length <= 1) game.endGame();
    },
    hudInfo(game) {
        const aliveTanks = game.tanks.filter(t => t.isAlive).length;
        return { lines: [`Players: ${game.numPlayers} | AI: ${game.numAIBots}`, `Alive: ${aliveTanks}`, 'Mode: FFA'] };
    }
};

window.modeManager.register(GAME_MODES.FFA, FFAMode);


