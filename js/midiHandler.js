// =============================================================================
// MIDI INPUT HANDLER
// =============================================================================
// Handles MIDI input from WebMidi.js and converts to game controls

class MidiHandler {
    constructor() {
        this.isConnected = false;
        this.inputs = [];
        this.controlCallbacks = new Map(); // Map of control events to callback functions
        this.debugMode = false;
    }

    /**
     * Initialize MIDI connection
     * @param {boolean} debugMode - Enable debug logging
     * @returns {Promise<boolean>} Success status
     */
    async initialize(debugMode = false) {
        this.debugMode = debugMode;
        
        try {
            if (typeof WebMidi === 'undefined') {
                throw new Error('WebMidi.js library not loaded');
            }

            await WebMidi.enable();

            if (WebMidi.inputs.length === 0) {
                this.log('⚠️ No MIDI input devices detected');
                return false;
            }

            // Clear previous listeners
            WebMidi.removeListener();

            // Add listeners to all inputs
            WebMidi.inputs.forEach((input, index) => {
                this.log(`🔌 Connected to: ${input.name || `Input ${index + 1}`}`);
                
                input.addListener('noteon', 'all', (e) => this.handleNoteOn(e));
                input.addListener('noteoff', 'all', (e) => this.handleNoteOff(e));
            });

            this.isConnected = true;
            this.inputs = Array.from(WebMidi.inputs);
            this.log('✅ MIDI initialized successfully!');
            return true;

        } catch (error) {
            this.log(`❌ MIDI Error: ${error.message}`);
            return false;
        }
    }

    /**
     * Handle note on events
     * @param {Object} event - WebMidi note on event
     */
    handleNoteOn(event) {
        const noteNumber = event.note.number;
        const velocity = event.velocity;
        
        if (this.debugMode) {
            this.log(`🎹 Note ON: ${noteNumber} (${event.note.name}) - Velocity: ${velocity.toFixed(2)}`);
        }

        this.processControl(noteNumber, true, velocity);
    }

    /**
     * Handle note off events
     * @param {Object} event - WebMidi note off event
     */
    handleNoteOff(event) {
        const noteNumber = event.note.number;
        
        if (this.debugMode) {
            this.log(`🔇 Note OFF: ${noteNumber} (${event.note.name}) - Released`);
        }

        this.processControl(noteNumber, false, 0);
    }

    /**
     * Process MIDI control input
     * @param {number} noteNumber - MIDI note number
     * @param {boolean} isPressed - Whether the note is pressed or released
     * @param {number} velocity - Note velocity (0-1)
     */
    processControl(noteNumber, isPressed, velocity) {
        const playerIndex = getPlayerFromNote(noteNumber);
        const control = getControlFromNote(noteNumber);

        if (playerIndex === null || control === null) {
            if (this.debugMode) {
                this.log(`🎵 Unknown note: ${noteNumber}`);
            }
            return;
        }

        // Create control event
        const controlEvent = {
            playerIndex: playerIndex,
            control: control,
            isPressed: isPressed,
            velocity: velocity,
            noteNumber: noteNumber,
            timestamp: Date.now()
        };

        // Trigger callbacks
        this.triggerCallbacks(controlEvent);
    }

    /**
     * Register a callback for control events
     * @param {string} eventType - Event type ('movement', 'turret', 'all')
     * @param {Function} callback - Callback function
     */
    onControl(eventType, callback) {
        if (!this.controlCallbacks.has(eventType)) {
            this.controlCallbacks.set(eventType, []);
        }
        this.controlCallbacks.get(eventType).push(callback);
    }

    /**
     * Trigger callbacks for a control event
     * @param {Object} controlEvent - Control event object
     */
    triggerCallbacks(controlEvent) {
        const callbacks = this.controlCallbacks.get('all') || [];
        callbacks.forEach(callback => callback(controlEvent));

        // Determine control type and trigger specific callbacks
        let controlType = null;
        if (isMovementControl(controlEvent.control)) {
            controlType = 'movement';
        } else if (isTurretControl(controlEvent.control)) {
            controlType = 'turret';
        }

        if (controlType) {
            const typeCallbacks = this.controlCallbacks.get(controlType) || [];
            typeCallbacks.forEach(callback => callback(controlEvent));
        }
    }

    /**
     * Get connection status
     * @returns {boolean} Connection status
     */
    getConnectionStatus() {
        return this.isConnected;
    }

    /**
     * Get number of connected devices
     * @returns {number} Number of devices
     */
    getDeviceCount() {
        return this.inputs.length;
    }

    /**
     * Get device names
     * @returns {Array<string>} Array of device names
     */
    getDeviceNames() {
        return this.inputs.map(input => input.name || 'Unknown Device');
    }

    /**
     * Log message (only if debug mode is enabled)
     * @param {string} message - Message to log
     */
    log(message) {
        if (this.debugMode) {
            console.log(`[MIDI] ${message}`);
        }
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Debug mode status
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (typeof WebMidi !== 'undefined') {
            WebMidi.removeListener();
        }
        this.isConnected = false;
        this.inputs = [];
        this.controlCallbacks.clear();
        this.log('🔌 MIDI disconnected');
    }
}

// =============================================================================
// GLOBAL MIDI HANDLER INSTANCE
// =============================================================================
// Create a global instance that can be used throughout the application
window.midiHandler = new MidiHandler();
