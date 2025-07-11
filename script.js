class BassSense {
    constructor() {
        this.audioContext = null;
        this.currentScale = null;
        this.currentDegree = null;
        this.previousDegree = null;
        this.noteIndex = 0;
        this.totalNotes = 20;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.incorrectAttempts = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.hintTimeout = null;
        this.isWaitingForAnswer = false;
        this.lastClickTime = 0;
        this.selectedSound = 'deepBass';
        
        this.scales = {
            major: [0, 2, 4, 5, 7, 9, 11, 12],
            minor: [0, 2, 3, 5, 7, 8, 10, 12]
        };
        
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume audio context if it's suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    setupEventListeners() {
        // Start button
        document.getElementById('startButton').addEventListener('click', () => {
            if (!this.audioContext) {
                this.setupAudio();
            }
            this.startNewSession();
        });
        
        // Number button clicks
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const degree = parseInt(e.target.dataset.degree);
                const now = Date.now();
                
                // Check for double-click (within 300ms)
                if (now - this.lastClickTime < 300 && this.currentDegree !== null) {
                    this.playCurrentNote();
                } else {
                    if (this.isWaitingForAnswer) {
                        this.handleAnswer(degree);
                    }
                }
                
                this.lastClickTime = now;
            });
        });
        
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 8 && this.isWaitingForAnswer) {
                this.handleAnswer(num);
            }
        });
        
        
        // Bass sound selector
        document.getElementById('bassSound').addEventListener('change', (e) => {
            this.selectedSound = e.target.value;
        });
    }
    
    startNewSession() {
        this.noteIndex = 0;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.previousDegree = null;
        
        // Hide session summary and show start button text change
        document.getElementById('sessionSummary').classList.add('hidden');
        document.getElementById('startButton').textContent = 'Start New Game';
        document.getElementById('startButton').style.display = 'none';
        
        this.selectRandomScale();
        
        // Play the scale before starting
        this.playScale(() => {
            // Start the game after scale playback
            setTimeout(() => this.nextNote(), 500);
        });
    }
    
    selectRandomScale() {
        const scaleType = 'major'; // Only use major scales
        const rootNoteIndex = Math.floor(Math.random() * 12);
        const rootNote = this.noteNames[rootNoteIndex];
        
        this.currentScale = {
            type: scaleType,
            root: rootNoteIndex,
            rootName: rootNote,
            intervals: this.scales[scaleType]
        };
        
        document.getElementById('currentScale').textContent = `${rootNote} ${scaleType}`;
    }
    
    playScale(callback) {
        // Show "Playing scale..." message
        const scalePlaybackMsg = document.getElementById('scalePlayback');
        scalePlaybackMsg.classList.remove('hidden');
        
        // Disable number buttons during scale playback
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.style.pointerEvents = 'none';
        });
        
        let degree = 1;
        
        const playNextNote = () => {
            if (degree <= 8) {
                // Highlight the current number
                const button = document.querySelector(`[data-degree="${degree}"]`);
                button.classList.add('correct');
                
                // Play the note
                const interval = this.scales[this.currentScale.type][degree - 1];
                const midiNote = this.currentScale.root + interval + 36;
                const frequency = this.getFrequency(midiNote);
                this.playBassNote(frequency, 0.4);
                
                // Remove highlight and play next note
                setTimeout(() => {
                    button.classList.remove('correct');
                    degree++;
                    setTimeout(playNextNote, 150);
                }, 400);
            } else {
                // Scale playback complete
                scalePlaybackMsg.classList.add('hidden');
                
                // Re-enable number buttons
                document.querySelectorAll('.number-btn').forEach(btn => {
                    btn.style.pointerEvents = 'auto';
                });
                
                if (callback) callback();
            }
        };
        
        // Start playing the scale
        playNextNote();
    }
    
    nextNote() {
        if (this.noteIndex >= this.totalNotes) {
            this.endSession();
            return;
        }
        
        this.noteIndex++;
        document.getElementById('currentNote').textContent = this.noteIndex;
        
        // Reset button states
        this.resetButtonStates();
        
        // Choose random scale degree (1-8)
        this.currentDegree = Math.floor(Math.random() * 8) + 1;
        this.incorrectAttempts = 0;
        this.isWaitingForAnswer = true;
        
        // If there was a previous correct answer, play both notes
        if (this.previousDegree !== null) {
            this.playInterval(() => {
                // Set hint timeout after interval playback
                this.hintTimeout = setTimeout(() => this.showHint(), 5000);
            });
        } else {
            // First note - just play the current note
            setTimeout(() => this.playCurrentNote(), 500);
            this.hintTimeout = setTimeout(() => this.showHint(), 5000);
        }
    }
    
    playInterval(callback) {
        // First play the previous note
        const prevInterval = this.scales[this.currentScale.type][this.previousDegree - 1];
        const prevMidiNote = this.currentScale.root + prevInterval + 36;
        const prevFrequency = this.getFrequency(prevMidiNote);
        
        this.playBassNote(prevFrequency, 0.6);
        
        // Then play the current note after a short gap
        setTimeout(() => {
            this.playCurrentNote();
            if (callback) callback();
        }, 700);
    }
    
    playCurrentNote() {
        // Calculate the actual note based on scale degree
        const interval = this.scales[this.currentScale.type][this.currentDegree - 1];
        const midiNote = this.currentScale.root + interval + 36; // Start at C3 (MIDI 36)
        const frequency = this.getFrequency(midiNote);
        
        this.playBassNote(frequency, 0.8);
    }
    
    getFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }
    
    playBassNote(frequency, duration) {
        const now = this.audioContext.currentTime;
        const masterGain = this.audioContext.createGain();
        
        switch (this.selectedSound) {
            case 'deepBass':
                this.createDeepBass(frequency, duration, masterGain);
                break;
            case 'piano':
                this.createPiano(frequency, duration, masterGain);
                break;
            case 'synth':
                this.createSynthBass(frequency, duration, masterGain);
                break;
            case 'electric':
                this.createElectricBass(frequency, duration, masterGain);
                break;
            case 'sub':
                this.createSubBass(frequency, duration, masterGain);
                break;
            case 'warm':
                this.createWarmPad(frequency, duration, masterGain);
                break;
            case 'pluck':
                this.createPluckBass(frequency, duration, masterGain);
                break;
            case 'organ':
                this.createOrganBass(frequency, duration, masterGain);
                break;
            case 'mellow':
                this.createMellowBass(frequency, duration, masterGain);
                break;
            case 'vintage':
                this.createVintageSynth(frequency, duration, masterGain);
                break;
            default:
                this.createDeepBass(frequency, duration, masterGain);
        }
        
        masterGain.connect(this.audioContext.destination);
    }
    
    createDeepBass(frequency, duration, masterGain) {
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        
        osc1.type = 'sine';
        osc1.frequency.value = frequency;
        osc2.type = 'sine';
        osc2.frequency.value = frequency * 0.5;
        
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        gain1.gain.value = 0.7;
        gain2.gain.value = 0.3;
        
        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(filter);
        gain2.connect(filter);
        filter.connect(masterGain);
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.5, now + 0.01);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }
    
    createPiano(frequency, duration, masterGain) {
        const oscillators = [];
        const gains = [];
        const harmonics = [1, 2, 3, 4, 5, 6];
        const amplitudes = [0.8, 0.4, 0.2, 0.1, 0.05, 0.02];
        
        harmonics.forEach((harmonic, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = frequency * harmonic;
            osc.detune.value = Math.random() * 5 - 2.5;
            
            gain.gain.value = amplitudes[i];
            
            osc.connect(gain);
            gain.connect(masterGain);
            
            oscillators.push(osc);
            gains.push(gain);
        });
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.5, now + 0.005);
        masterGain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        oscillators.forEach(osc => {
            osc.start(now);
            osc.stop(now + duration);
        });
    }
    
    createSynthBass(frequency, duration, masterGain) {
        const osc = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.value = frequency;
        
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 2;
        filter.Q.value = 5;
        
        osc.connect(filter);
        filter.connect(masterGain);
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
        filter.frequency.linearRampToValueAtTime(frequency * 4, now + 0.02);
        filter.frequency.exponentialRampToValueAtTime(frequency, now + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.start(now);
        osc.stop(now + duration);
    }
    
    createElectricBass(frequency, duration, masterGain) {
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        osc2.type = 'sine';
        osc2.frequency.value = frequency * 2;
        
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        gain1.gain.value = 0.8;
        gain2.gain.value = 0.2;
        
        osc.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(masterGain);
        gain2.connect(masterGain);
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.4, now + 0.002);
        masterGain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + duration);
        osc2.stop(now + duration);
    }
    
    createSubBass(frequency, duration, masterGain) {
        const osc = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.value = frequency * 0.5;
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        osc.connect(filter);
        filter.connect(masterGain);
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.6, now + 0.05);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.start(now);
        osc.stop(now + duration);
    }
    
    createWarmPad(frequency, duration, masterGain) {
        const oscillators = [];
        for (let i = 0; i < 3; i++) {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency * (1 + i * 0.01);
            osc.detune.value = i * 10;
            oscillators.push(osc);
        }
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        
        oscillators.forEach(osc => osc.connect(filter));
        filter.connect(masterGain);
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        oscillators.forEach(osc => {
            osc.start(now);
            osc.stop(now + duration);
        });
    }
    
    createPluckBass(frequency, duration, masterGain) {
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        osc2.type = 'sine';
        osc2.frequency.value = frequency * 2;
        
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 8;
        filter.Q.value = 2;
        
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        gain1.gain.value = 0.7;
        gain2.gain.value = 0.3;
        
        osc.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(filter);
        gain2.connect(filter);
        filter.connect(masterGain);
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.5, now + 0.001);
        filter.frequency.exponentialRampToValueAtTime(frequency * 2, now + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.5);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + duration);
        osc2.stop(now + duration);
    }
    
    createOrganBass(frequency, duration, masterGain) {
        const drawbars = [0.5, 1, 1.5, 2, 3, 4, 5, 6];
        const levels = [0.8, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1, 0.05];
        
        drawbars.forEach((multiplier, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = frequency * multiplier;
            gain.gain.value = levels[i];
            
            osc.connect(gain);
            gain.connect(masterGain);
            
            const now = this.audioContext.currentTime;
            osc.start(now);
            osc.stop(now + duration);
        });
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    }
    
    createMellowBass(frequency, duration, masterGain) {
        const osc = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        filter.Q.value = 0.5;
        
        osc.connect(filter);
        filter.connect(masterGain);
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.4, now + 0.05);
        masterGain.gain.exponentialRampToValueAtTime(0.2, now + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.start(now);
        osc.stop(now + duration);
    }
    
    createVintageSynth(frequency, duration, masterGain) {
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        
        osc1.type = 'square';
        osc1.frequency.value = frequency;
        osc2.type = 'square';
        osc2.frequency.value = frequency * 1.01;
        osc2.detune.value = 5;
        
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 3;
        filter.Q.value = 8;
        
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        gain1.gain.value = 0.5;
        gain2.gain.value = 0.5;
        
        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(filter);
        gain2.connect(filter);
        filter.connect(masterGain);
        
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
        filter.frequency.exponentialRampToValueAtTime(frequency, now + 0.2);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }
    
    handleAnswer(degree) {
        if (!this.isWaitingForAnswer) return;
        
        clearTimeout(this.hintTimeout);
        
        const button = document.querySelector(`[data-degree="${degree}"]`);
        const correct = degree === this.currentDegree;
        
        if (correct) {
            this.correctCount++;
            this.currentStreak++;
            this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
            this.isWaitingForAnswer = false;
            
            // Save the current degree as previous for next round
            this.previousDegree = this.currentDegree;
            
            // Show correct feedback
            button.classList.add('correct');
            this.playFeedbackSound(true);
            
            // Move to next note after delay
            setTimeout(() => this.nextNote(), 1500);
        } else {
            this.incorrectCount++;
            this.incorrectAttempts++;
            this.currentStreak = 0;
            
            // Show incorrect feedback
            button.classList.add('incorrect');
            this.playFeedbackSound(false);
            
            // Remove incorrect class after 1 second
            setTimeout(() => button.classList.remove('incorrect'), 1000);
            
            // Check if we need to show hint after 3 incorrect attempts
            if (this.incorrectAttempts >= 3) {
                this.showHint();
            }
        }
    }
    
    showHint() {
        clearTimeout(this.hintTimeout);
        this.isWaitingForAnswer = false;
        
        // Save the current degree as previous when using hint
        this.previousDegree = this.currentDegree;
        
        const correctButton = document.querySelector(`[data-degree="${this.currentDegree}"]`);
        correctButton.classList.add('hint');
        
        // Move to next note after showing hint
        setTimeout(() => this.nextNote(), 2000);
    }
    
    playFeedbackSound(correct) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        if (correct) {
            oscillator.frequency.value = 523.25; // C5
            oscillator.type = 'triangle';
            gainNode.gain.value = 0.2;
        } else {
            oscillator.frequency.value = 196; // G3
            oscillator.type = 'sawtooth';
            gainNode.gain.value = 0.1;
        }
        
        const now = this.audioContext.currentTime;
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }
    
    resetButtonStates() {
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.remove('correct', 'incorrect', 'hint');
        });
    }
    
    endSession() {
        document.getElementById('correctCount').textContent = this.correctCount;
        document.getElementById('incorrectCount').textContent = this.incorrectCount;
        document.getElementById('bestStreak').textContent = this.bestStreak;
        
        // Show session summary and update button
        document.getElementById('sessionSummary').classList.remove('hidden');
        document.getElementById('startButton').style.display = 'block';
        document.getElementById('startButton').textContent = 'Start New Game';
        document.getElementById('currentScale').textContent = 'Press Start to begin';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new BassSense();
});