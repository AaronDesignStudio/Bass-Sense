class BassSense {
    constructor() {
        this.audioContext = null;
        this.currentScale = null;
        this.currentNote = null;
        this.previousNote = null;
        this.noteIndex = 0;
        this.totalNotes = 20;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.hintTimeout = null;
        this.isWaitingForAnswer = false;
        
        this.scales = {
            major: [0, 2, 4, 5, 7, 9, 11, 12],
            minor: [0, 2, 3, 5, 7, 8, 10, 12]
        };
        
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        this.init();
    }
    
    init() {
        this.setupAudio();
        this.setupEventListeners();
        this.startNewSession();
    }
    
    setupAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    setupEventListeners() {
        document.getElementById('playAgain').addEventListener('click', () => this.playCurrentNote());
        document.getElementById('newSession').addEventListener('click', () => this.startNewSession());
        
        document.addEventListener('keydown', (e) => {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 8 && this.isWaitingForAnswer) {
                this.handleAnswer(num - 1);
            }
        });
    }
    
    startNewSession() {
        this.noteIndex = 0;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.previousNote = null;
        
        document.getElementById('sessionSummary').classList.add('hidden');
        document.querySelector('.game-info').style.display = 'flex';
        document.querySelector('.piano-container').style.display = 'flex';
        document.querySelector('.controls').style.display = 'block';
        
        this.selectRandomScale();
        this.createPiano();
        
        // Play the scale before starting the exercise
        this.playScale(() => {
            // Start the first note after scale playback
            setTimeout(() => this.nextNote(), 1000);
        });
    }
    
    selectRandomScale() {
        const scaleTypes = ['major', 'minor'];
        const scaleType = scaleTypes[Math.floor(Math.random() * scaleTypes.length)];
        const rootNoteIndex = Math.floor(Math.random() * 12);
        const rootNote = this.noteNames[rootNoteIndex];
        
        this.currentScale = {
            type: scaleType,
            root: rootNoteIndex,
            rootName: rootNote,
            notes: this.scales[scaleType] // Keep the original intervals (0-12)
        };
        
        document.getElementById('currentScale').textContent = `${rootNote} ${scaleType}`;
    }
    
    createPiano() {
        const piano = document.getElementById('piano');
        piano.innerHTML = '';
        
        // Start from the root note
        const startNote = this.currentScale.root;
        
        // We need to show enough keys to include the 8th note (octave)
        // So we'll show up to 13 keys to ensure we get the octave
        const whiteKeys = [];
        const blackKeys = [];
        
        // Collect white and black keys starting from root, going up to 13 semitones
        for (let i = 0; i <= 12; i++) {
            const noteIndex = (startNote + i) % 12;
            const chromaticPosition = i;
            
            // For the octave (i=12), we treat it as the root note again
            const displayNoteIndex = i === 12 ? startNote : noteIndex;
            
            if ([1, 3, 6, 8, 10].includes(noteIndex) && i < 12) {
                blackKeys.push({ noteIndex: displayNoteIndex, chromaticPosition, isOctave: false });
            } else {
                whiteKeys.push({ noteIndex: displayNoteIndex, chromaticPosition, isOctave: i === 12 });
            }
        }
        
        // Create white keys
        whiteKeys.forEach((keyData, index) => {
            const key = this.createKey(keyData.noteIndex, 'white', keyData.chromaticPosition, keyData.isOctave);
            piano.appendChild(key);
        });
        
        // Create black keys with proper positioning
        blackKeys.forEach(keyData => {
            const key = this.createKey(keyData.noteIndex, 'black', keyData.chromaticPosition, keyData.isOctave);
            
            // Count how many white keys come before this black key
            let whiteKeysBefore = 0;
            for (let i = 0; i < keyData.chromaticPosition; i++) {
                const checkNote = (startNote + i) % 12;
                if (![1, 3, 6, 8, 10].includes(checkNote) || i === 12) {
                    whiteKeysBefore++;
                }
            }
            
            const leftOffset = whiteKeysBefore * 50 + 35;
            key.style.left = `${leftOffset}px`;
            piano.appendChild(key);
        });
    }
    
    createKey(noteIndex, color, position, isOctave = false) {
        const key = document.createElement('div');
        key.className = `key ${color}`;
        key.dataset.note = noteIndex;
        key.dataset.position = position;
        
        // Find which scale degree this note is (1-8)
        let scaleNoteIndex = -1;
        
        if (isOctave && noteIndex === this.currentScale.root) {
            // This is the octave (8th note)
            scaleNoteIndex = 7; // Index 7 = 8th note
        } else {
            // Check if this note is in the scale
            // We need to check the position relative to the root
            const relativePosition = (noteIndex - this.currentScale.root + 12) % 12;
            scaleNoteIndex = this.currentScale.notes.slice(0, 7).indexOf(relativePosition);
        }
        
        if (scaleNoteIndex === -1) {
            key.classList.add('dimmed');
        } else {
            key.dataset.scalePosition = scaleNoteIndex; // Store scale position for easier lookup
            const keyNumber = document.createElement('span');
            keyNumber.className = 'key-number';
            keyNumber.textContent = scaleNoteIndex + 1;
            key.appendChild(keyNumber);
            
            key.addEventListener('click', () => {
                if (this.isWaitingForAnswer) {
                    this.handleAnswer(scaleNoteIndex);
                }
            });
        }
        
        return key;
    }
    
    nextNote() {
        if (this.noteIndex >= this.totalNotes) {
            this.endSession();
            return;
        }
        
        this.noteIndex++;
        document.getElementById('currentNote').textContent = this.noteIndex;
        
        // Choose random scale position (0-7 for notes 1-8)
        const randomScalePosition = Math.floor(Math.random() * 8);
        const isOctave = randomScalePosition === 7;
        
        // Get the actual note index
        let noteIndex;
        if (isOctave) {
            noteIndex = this.currentScale.root; // 8th note is same as root
        } else {
            noteIndex = this.currentScale.notes[randomScalePosition];
        }
        
        this.currentNote = {
            noteIndex: noteIndex,
            scalePosition: randomScalePosition,
            isOctave: isOctave
        };
        
        this.resetKeyColors();
        this.isWaitingForAnswer = true;
        
        // If there was a previous note, play both notes (interval comparison)
        if (this.previousNote) {
            this.playInterval(() => {
                this.hintTimeout = setTimeout(() => this.showHint(), 5000);
            });
        } else {
            // First note of the session - just play the current note
            setTimeout(() => this.playCurrentNote(), 500);
            this.hintTimeout = setTimeout(() => this.showHint(), 5000);
        }
    }
    
    playInterval(callback) {
        // First play the previous note
        let previousMidiNote;
        if (this.previousNote.isOctave) {
            previousMidiNote = this.currentScale.root + 24 + 12;
        } else {
            const noteOffset = this.currentScale.notes[this.previousNote.scalePosition];
            previousMidiNote = this.currentScale.root + noteOffset + 24;
        }
        
        const previousFrequency = this.getFrequency(previousMidiNote);
        this.playBassNote(previousFrequency, 0.6);
        
        // Then play the current note after a short delay
        setTimeout(() => {
            this.playCurrentNote();
            if (callback) callback();
        }, 800);
    }
    
    playCurrentNote() {
        // Calculate the correct MIDI note based on scale position
        let midiNote;
        if (this.currentNote.isOctave) {
            // For the octave (8th note), play root + 12 semitones
            midiNote = this.currentScale.root + 24 + 12;
        } else {
            // For other notes, calculate based on their position in the scale
            // We need to ensure all notes stay within the octave range
            const noteOffset = this.currentScale.notes[this.currentNote.scalePosition];
            midiNote = this.currentScale.root + noteOffset + 24;
        }
        
        const frequency = this.getFrequency(midiNote);
        this.playBassNote(frequency, 1.0);
    }
    
    getFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }
    
    playScale(callback) {
        // Show "Playing scale..." message and disable play button
        const scalePlaybackMsg = document.getElementById('scalePlayback');
        const playAgainBtn = document.getElementById('playAgain');
        scalePlaybackMsg.classList.remove('hidden');
        playAgainBtn.disabled = true;
        
        // Visual feedback - highlight each key as it plays
        const keys = document.querySelectorAll('.key:not(.dimmed)');
        let noteIndex = 0;
        
        const playNextNote = () => {
            if (noteIndex < 8) {
                // Get the frequency for this scale degree
                let midiNote;
                if (noteIndex === 7) {
                    // Octave (8th note) - exactly 12 semitones above root
                    midiNote = this.currentScale.root + 24 + 12;
                } else {
                    // Use the interval from the scale
                    midiNote = this.currentScale.root + this.currentScale.notes[noteIndex] + 24;
                }
                
                const frequency = this.getFrequency(midiNote);
                
                // Highlight the current key
                if (keys[noteIndex]) {
                    keys[noteIndex].classList.add('correct');
                }
                
                // Play the note
                this.playBassNote(frequency, 0.4);
                
                // Remove highlight after a short delay
                setTimeout(() => {
                    if (keys[noteIndex]) {
                        keys[noteIndex].classList.remove('correct');
                    }
                    noteIndex++;
                    // Play next note after a short gap
                    setTimeout(playNextNote, 150);
                }, 350);
            } else {
                // Scale playback complete - hide message and re-enable button
                scalePlaybackMsg.classList.add('hidden');
                playAgainBtn.disabled = false;
                if (callback) callback();
            }
        };
        
        // Start playing the scale
        playNextNote();
    }
    
    playBassNote(frequency, duration) {
        // Create oscillators for grand piano-like sound
        const fundamental = this.audioContext.createOscillator();
        const harmonic2 = this.audioContext.createOscillator();
        const harmonic3 = this.audioContext.createOscillator();
        const harmonic4 = this.audioContext.createOscillator();
        const harmonic5 = this.audioContext.createOscillator();
        
        // Main output
        const masterGain = this.audioContext.createGain();
        const compressor = this.audioContext.createDynamicsCompressor();
        
        // Filters for shaping the sound
        const lowShelf = this.audioContext.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 200;
        lowShelf.gain.value = 3;
        
        const highShelf = this.audioContext.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 2000;
        highShelf.gain.value = -3;
        
        // Set up harmonics like a real piano
        fundamental.type = 'sine';
        fundamental.frequency.value = frequency;
        
        harmonic2.type = 'sine';
        harmonic2.frequency.value = frequency * 2;
        
        harmonic3.type = 'sine';
        harmonic3.frequency.value = frequency * 3;
        
        harmonic4.type = 'sine';
        harmonic4.frequency.value = frequency * 4;
        
        harmonic5.type = 'sine';
        harmonic5.frequency.value = frequency * 5;
        
        // Individual gains for realistic piano harmonics
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const gain3 = this.audioContext.createGain();
        const gain4 = this.audioContext.createGain();
        const gain5 = this.audioContext.createGain();
        
        // Piano-like harmonic balance
        gain1.gain.value = 0.8;   // Fundamental
        gain2.gain.value = 0.4;   // 2nd harmonic
        gain3.gain.value = 0.15;  // 3rd harmonic
        gain4.gain.value = 0.08;  // 4th harmonic
        gain5.gain.value = 0.04;  // 5th harmonic
        
        // Connect oscillators through gains
        fundamental.connect(gain1);
        harmonic2.connect(gain2);
        harmonic3.connect(gain3);
        harmonic4.connect(gain4);
        harmonic5.connect(gain5);
        
        // Mix all harmonics
        gain1.connect(lowShelf);
        gain2.connect(lowShelf);
        gain3.connect(lowShelf);
        gain4.connect(lowShelf);
        gain5.connect(lowShelf);
        
        lowShelf.connect(highShelf);
        highShelf.connect(compressor);
        compressor.connect(masterGain);
        masterGain.connect(this.audioContext.destination);
        
        // Piano-like envelope (quick attack, gradual decay)
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.6, now + 0.005); // Quick attack
        masterGain.gain.exponentialRampToValueAtTime(0.4, now + 0.02); // Initial decay
        masterGain.gain.exponentialRampToValueAtTime(0.2, now + 0.2); // Sustain
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release
        
        // Add slight detuning for richness
        harmonic2.detune.value = 2;
        harmonic3.detune.value = -3;
        harmonic4.detune.value = 5;
        harmonic5.detune.value = -4;
        
        // Start and stop all oscillators
        const startTime = this.audioContext.currentTime;
        const stopTime = startTime + duration + 0.1;
        
        fundamental.start(startTime);
        harmonic2.start(startTime);
        harmonic3.start(startTime);
        harmonic4.start(startTime);
        harmonic5.start(startTime);
        
        fundamental.stop(stopTime);
        harmonic2.stop(stopTime);
        harmonic3.stop(stopTime);
        harmonic4.stop(stopTime);
        harmonic5.stop(stopTime);
    }
    
    playTone(frequency, duration, type = 'sine') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    handleAnswer(scalePosition) {
        if (!this.isWaitingForAnswer) return;
        
        clearTimeout(this.hintTimeout);
        this.isWaitingForAnswer = false;
        
        const correct = scalePosition === this.currentNote.scalePosition;
        
        // Find the correct key based on whether it's the octave or not
        let key;
        if (this.currentNote.isOctave) {
            // For octave, find the key with position 12
            key = document.querySelector(`[data-position="12"]`);
        } else {
            // For other notes, find the first occurrence
            key = document.querySelector(`[data-note="${this.currentNote.noteIndex}"]`);
        }
        
        if (correct) {
            this.correctCount++;
            this.currentStreak++;
            this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
            key.classList.add('correct');
            this.playFeedbackSound(true);
            
            // Save the current note as the previous note for the next round
            this.previousNote = {...this.currentNote};
            
            setTimeout(() => this.nextNote(), 1500);
        } else {
            this.incorrectCount++;
            this.currentStreak = 0;
            // Find the clicked key by its scale position data attribute
            const clickedKey = document.querySelector(`[data-scale-position="${scalePosition}"]`);
            if (clickedKey) {
                clickedKey.classList.add('incorrect');
                setTimeout(() => clickedKey.classList.remove('incorrect'), 1000);
            }
            this.playFeedbackSound(false);
            this.isWaitingForAnswer = true;
        }
    }
    
    showHint() {
        let key;
        if (this.currentNote.isOctave) {
            // For octave, find the key with position 12
            key = document.querySelector(`[data-position="12"]`);
        } else {
            // For other notes, find the first occurrence
            key = document.querySelector(`[data-note="${this.currentNote.noteIndex}"]`);
        }
        key.classList.add('hint');
        this.isWaitingForAnswer = false;
        
        // Save the current note as previous when using hint
        this.previousNote = {...this.currentNote};
        
        setTimeout(() => this.nextNote(), 2000);
    }
    
    playFeedbackSound(correct) {
        const frequency = correct ? 523.25 : 261.63;
        const duration = correct ? 0.15 : 0.1;
        const type = correct ? 'triangle' : 'sawtooth';
        this.playTone(frequency, duration, type);
    }
    
    resetKeyColors() {
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('correct', 'incorrect', 'hint');
        });
    }
    
    endSession() {
        document.getElementById('correctCount').textContent = this.correctCount;
        document.getElementById('incorrectCount').textContent = this.incorrectCount;
        document.getElementById('bestStreak').textContent = this.bestStreak;
        
        document.querySelector('.game-info').style.display = 'none';
        document.querySelector('.piano-container').style.display = 'none';
        document.querySelector('.controls').style.display = 'none';
        document.getElementById('sessionSummary').classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BassSense();
});