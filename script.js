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
        this.pianoSamples = null;
        this.samplesLoading = false;
        this.samplesLoaded = false;
        
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
        
        // Always load piano samples
        if (!this.samplesLoaded && !this.samplesLoading) {
            this.loadPianoSamples();
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
        
        // Wait for samples to load before playing scale
        if (!this.samplesLoaded && this.samplesLoading) {
            // Show loading message
            document.getElementById('currentScale').textContent = 'Loading piano samples...';
            
            // Check every 100ms if samples are loaded
            const checkInterval = setInterval(() => {
                if (this.samplesLoaded) {
                    clearInterval(checkInterval);
                    document.getElementById('currentScale').textContent = `${this.currentScale.rootName} ${this.currentScale.type}`;
                    this.playScale(() => {
                        setTimeout(() => this.nextNote(), 500);
                    });
                }
            }, 100);
        } else {
            // Samples already loaded or not loading, proceed normally
            this.playScale(() => {
                setTimeout(() => this.nextNote(), 500);
            });
        }
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
                const midiNote = this.currentScale.root + interval + 24;
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
        
        // Start playing the scale with a small delay to ensure audio is ready
        setTimeout(playNextNote, 200);
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
        const prevMidiNote = this.currentScale.root + prevInterval + 24;
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
        const midiNote = this.currentScale.root + interval + 24; // Start at C2 (MIDI 24)
        const frequency = this.getFrequency(midiNote);
        
        this.playBassNote(frequency, 0.8);
    }
    
    getFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }
    
    playBassNote(frequency, duration) {
        if (this.samplesLoaded) {
            this.playRealPianoNote(frequency, duration);
        } else {
            // Fall back to synthesized piano while samples are loading
            const masterGain = this.audioContext.createGain();
            this.createPiano(frequency, duration, masterGain);
            masterGain.connect(this.audioContext.destination);
        }
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
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        if (correct) {
            // Success sound - rising pitch from C5 to E5
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            
            osc.start(now);
            osc.stop(now + 0.2);
        } else {
            // Error sound - falling pitch
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc.start(now);
            osc.stop(now + 0.15);
        }
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
    
    loadPianoSamples() {
        this.samplesLoading = true;
        
        // Load the piano soundfont
        const script = document.getElementById('pianoSoundfont');
        script.src = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3.js';
        
        script.onload = () => {
            if (window.MIDI && window.MIDI.Soundfont && window.MIDI.Soundfont.acoustic_grand_piano) {
                this.pianoSamples = window.MIDI.Soundfont.acoustic_grand_piano;
                this.samplesLoaded = true;
                this.samplesLoading = false;
                
                // Preload bass range samples
                this.preloadBassRange();
            }
        };
        
        script.onerror = () => {
            console.error('Failed to load piano samples');
            this.samplesLoading = false;
        };
    }
    
    preloadBassRange() {
        // Preload bass notes from C1 to C3
        const notesToPreload = ['C1', 'Db1', 'D1', 'Eb1', 'E1', 'F1', 'Gb1', 'G1', 'Ab1', 'A1', 'Bb1', 'B1',
                               'C2', 'Db2', 'D2', 'Eb2', 'E2', 'F2', 'Gb2', 'G2', 'Ab2', 'A2', 'Bb2', 'B2',
                               'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3'];
        
        notesToPreload.forEach(note => {
            if (this.pianoSamples[note]) {
                const audio = new Audio(this.pianoSamples[note]);
                audio.volume = 0;
                audio.play().catch(() => {}); // Preload by playing at volume 0
            }
        });
    }
    
    playRealPianoNote(frequency, duration) {
        // Convert frequency to note name
        const noteData = this.frequencyToNote(frequency);
        
        if (this.pianoSamples[noteData.note]) {
            const audio = new Audio(this.pianoSamples[noteData.note]);
            audio.volume = 0.7;
            
            audio.play().catch(err => {
                console.error('Error playing piano sample:', err);
            });
            
            // Fade out by reducing volume over time
            const fadeSteps = 20;
            const fadeInterval = (duration * 1000) / fadeSteps;
            let currentStep = 0;
            
            const fadeOut = setInterval(() => {
                currentStep++;
                audio.volume = 0.7 * (1 - currentStep / fadeSteps);
                
                if (currentStep >= fadeSteps) {
                    clearInterval(fadeOut);
                    audio.pause();
                    audio.currentTime = 0;
                }
            }, fadeInterval);
        } else {
            // Fallback to synthesized piano if sample not available
            const masterGain = this.audioContext.createGain();
            this.createPiano(frequency, duration, masterGain);
            masterGain.connect(this.audioContext.destination);
        }
    }
    
    frequencyToNote(frequency) {
        // Convert frequency to MIDI note number
        const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
        
        // Convert MIDI note to note name
        const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteIndex = midiNote % 12;
        const note = noteNames[noteIndex] + octave;
        
        return { note, midiNote };
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new BassSense();
    
    // Initialize MIDI namespace if it doesn't exist
    window.MIDI = window.MIDI || {};
    window.MIDI.Soundfont = window.MIDI.Soundfont || {};
});