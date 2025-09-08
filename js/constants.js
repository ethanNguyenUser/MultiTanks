// =============================================================================
// MULTITANKS GAME CONSTANTS
// =============================================================================
// All game parameters that can be easily modified by the user

// =============================================================================
// GAME MODES
// =============================================================================
const GAME_MODES = {
    FFA: 'ffa',
    TDM: 'tdm'
};

// =============================================================================
// GAME CONFIGURATION
// =============================================================================
const GAME_CONFIG = {
    // Player settings
    MIN_PLAYERS: 1,
    MAX_PLAYERS: 4,
    MIN_AI_BOTS: 0,
    MAX_AI_BOTS: 6,
    MAX_TOTAL_TANKS: 8, // Maximum total tanks (players + AI)
    
    // Map settings
    MAP_COLOR: '#2d5016', // Dark green
    MAP_WIDTH: window.innerWidth,
    MAP_HEIGHT: window.innerHeight,
    
    // Tank settings
    TANK_SIZE: 30,
    TANK_SPEED: 2,
    TANK_HEALTH: 30,
    TURRET_LENGTH: 40,
    TURRET_ROTATION_SPEED: 0.04, // radians per frame
    
    // Shooting settings
    SHOOT_COOLDOWN: 700, // milliseconds
    BULLET_SPEED: 6,
    BULLET_SIZE: 4,
    BULLET_DAMAGE: 1,
    
    // Obstacle settings
    MIN_OBSTACLES: 15,
    MAX_OBSTACLES: 25,
    ROCK_SIZE_MIN: 20,
    ROCK_SIZE_MAX: 40,
    RECTANGLE_WIDTH_MIN: 30,
    RECTANGLE_WIDTH_MAX: 60,
    RECTANGLE_HEIGHT_MIN: 20,
    RECTANGLE_HEIGHT_MAX: 50,
    
    // Spawn settings
    SPAWN_DISTANCE_FROM_EDGE: 50, // Distance from map edge for tank spawning
    
    // Team settings
    TEAM_COLORS: {
        RED: '#ff4444',
        BLUE: '#6666ff'
    },
    
    // Powerup settings
    POWERUP_DURATION: 10000, // 10 seconds in milliseconds
    POWERUP_SPAWN_INTERVAL_MIN: 1000, // 1 seconds
    POWERUP_SPAWN_INTERVAL_MAX: 3000, // 3 seconds
    POWERUP_CHASE_DISTANCE: 300, // Distance AIs will chase powerups
    POWERUP_SIZE: 15,
    POWERUP_HEALTH_BOOST: 10,
    POWERUP_SPEED_MULTIPLIER: 1.5,
    POWERUP_FIRE_RATE_MULTIPLIER: 2.0,
    POWERUP_SPREAD_ANGLE: 0.2, // radians
    POWERUP_BOUNCE_BOUNCES: 3,
    
    // Powerup types and emojis
    POWERUP_TYPES: {
        HEALTH: { emoji: '❤️', color: '#ff0000', name: 'Health Boost' },
        INVINCIBILITY: { emoji: '🛡️', color: '#ff69b4', name: 'Invincibility' },
        SPEED: { emoji: '🏃', color: '#32cd32', name: 'Speed Boost' },
        RAPID_FIRE: { emoji: '🔥', color: '#4169e1', name: 'Rapid Fire' },
        SPREAD_SHOT: { emoji: '🎯', color: '#9370db', name: 'Spread Shot' },
        BOUNCING_BULLETS: { emoji: '⚡', color: '#ff8c42', name: 'Bouncing Bullets' }
    },
    
    // AI behavior settings
    AI_APPROACH_DISTANCE: 600, // Distance to approach target to
    AI_ORBIT_SPEED: 0.02, // Speed of orbiting around enemy
    AI_ORBIT_DIRECTION_CHANGE_CHANCE: 0.02, // Chance per frame to change orbit direction (2%)
    AI_ORBIT_DISTANCE: 300, // Distance to maintain from enemy when orbiting
    AI_MIN_ORBIT_DISTANCE: 100, // Minimum distance before attempting to orbit
    AI_RETREAT_DURATION: 800, // How long to retreat when too close (milliseconds)
    AI_AIMING_RANDOMNESS: 0.1, // Randomness in aiming (radians)
    AI_SHOT_LEADING_ENABLED: true, // Whether AI should lead shots
    AI_SHOT_LEADING_FACTOR: 20, // How much to lead shots (0-1, higher = more leading)
    AI_SLIDE_SPEED_MULTIPLIER: 0.5, // Speed multiplier for obstacle sliding
    AI_OBSTACLE_GENERATION_MAX_ATTEMPTS: 100, // Max attempts to place obstacles
    AI_POWERUP_CHASE_TIMEOUT: 2000, // How long AI will chase a powerup before giving up (milliseconds)
    AI_POWERUP_COOLDOWN: 5000, // How long AI will ignore powerups after giving up (milliseconds)
};

// =============================================================================
// MIDI NOTE MAPPINGS
// =============================================================================
// Based on your keyboard: A=21, A=33, A=45, A=57, A=69, A=81, A=93
// Each octave has 12 semitones, so we map each octave to a player (1-4)

const MIDI_CONFIG = {
    // Base note numbers for each octave (A notes) - only 4 players now
    OCTAVE_BASES: [21, 45, 69, 93],
    
    // Note offsets from A for each control
    NOTE_OFFSETS: {
        A_SHARP: 1,  // A# - Move Up
        A: 0,        // A - Move Left  
        B: 2,        // B - Move Down
        C: 3,        // C - Move Right
        C_SHARP: 4,  // C# - Aim Left
        D: 5,        // D - Shoot
        D_SHARP: 6   // D# - Aim Right
    },
    
    // Control types
    CONTROL_TYPES: {
        MOVEMENT: 'movement',
        TURRET: 'turret'
    }
};

// =============================================================================
// TANK COLORS (for visual distinction)
// =============================================================================
const TANK_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F'  // Gold
];

// =============================================================================
// GAME STATES
// =============================================================================
const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the note number for a specific player and control
 * @param {number} playerIndex - Player index (0-3)
 * @param {string} control - Control type ('A_SHARP', 'A', 'B', 'C', 'C_SHARP', 'D', 'D_SHARP')
 * @returns {number} MIDI note number
 */
function getNoteForPlayer(playerIndex, control) {
    if (playerIndex < 0 || playerIndex >= MIDI_CONFIG.OCTAVE_BASES.length) {
        throw new Error(`Invalid player index: ${playerIndex}`);
    }
    
    const baseNote = MIDI_CONFIG.OCTAVE_BASES[playerIndex];
    const offset = MIDI_CONFIG.NOTE_OFFSETS[control];
    
    if (offset === undefined) {
        throw new Error(`Invalid control: ${control}`);
    }
    
    return baseNote + offset;
}

/**
 * Get player index from MIDI note number
 * @param {number} noteNumber - MIDI note number
 * @returns {number|null} Player index (0-3) or null if not a valid player note
 */
function getPlayerFromNote(noteNumber) {
    for (let i = 0; i < MIDI_CONFIG.OCTAVE_BASES.length; i++) {
        const baseNote = MIDI_CONFIG.OCTAVE_BASES[i];
        const noteRange = Object.values(MIDI_CONFIG.NOTE_OFFSETS);
        const minNote = baseNote + Math.min(...noteRange);
        const maxNote = baseNote + Math.max(...noteRange);
        
        if (noteNumber >= minNote && noteNumber <= maxNote) {
            return i;
        }
    }
    return null;
}

/**
 * Get control type from MIDI note number
 * @param {number} noteNumber - MIDI note number
 * @returns {string|null} Control type or null if not a valid control note
 */
function getControlFromNote(noteNumber) {
    const playerIndex = getPlayerFromNote(noteNumber);
    if (playerIndex === null) return null;
    
    const baseNote = MIDI_CONFIG.OCTAVE_BASES[playerIndex];
    const offset = noteNumber - baseNote;
    
    // Find the control that matches this offset
    for (const [control, controlOffset] of Object.entries(MIDI_CONFIG.NOTE_OFFSETS)) {
        if (controlOffset === offset) {
            return control;
        }
    }
    
    return null;
}

/**
 * Check if a control is a movement control
 * @param {string} control - Control type
 * @returns {boolean} True if movement control
 */
function isMovementControl(control) {
    return ['A_SHARP', 'A', 'B', 'C'].includes(control);
}

/**
 * Check if a control is a turret control
 * @param {string} control - Control type
 * @returns {boolean} True if turret control
 */
function isTurretControl(control) {
    return ['C_SHARP', 'D', 'D_SHARP'].includes(control);
}
