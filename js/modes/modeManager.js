// =============================================================================
// MODE MANAGER
// =============================================================================

class ModeManager {
    constructor() {
        this.modes = {};
    }

    register(key, modeObj) {
        this.modes[key] = modeObj;
    }

    getMode(key) {
        return this.modes[key];
    }
}

window.modeManager = new ModeManager();


