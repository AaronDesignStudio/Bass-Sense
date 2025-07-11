# Bass Sense

Bass Sense is a web-based ear training application designed to help musicians develop their ability to recognize bass notes within a given scale. The app plays single bass notes from a randomly selected scale, and users must identify them by clicking the correct piano key or pressing the corresponding number (1-8).

## Features

- **Scale Recognition**: Practice with randomly selected major and minor scales
- **Interactive Piano**: Visual piano keyboard with numbered keys (1-8) for scale degrees
- **Multiple Input Methods**: Click piano keys or use keyboard numbers 1-8
- **Interval Training**: Hear the interval between consecutive notes for better relative pitch development
- **Visual Feedback**: Immediate visual feedback with color-coded correct/incorrect responses
- **Audio Feedback**: Success and failure sounds to reinforce learning
- **Hint System**: After 5 seconds, the correct key blinks to help guide learning
- **Session Tracking**: 20-note sessions with performance statistics
- **Grand Piano Sound**: Rich, authentic piano bass tones using Web Audio API

## How to Use

1. Open `index.html` in a modern web browser
2. The app will play the complete scale (1-8) at the start of each session
3. Listen to the bass note played
4. Identify the note by:
   - Clicking the corresponding piano key, or
   - Pressing the number key (1-8) on your keyboard
5. Get immediate feedback:
   - ✅ Green highlight for correct answers
   - ❌ Red flash for incorrect attempts
   - 💡 Blinking green hint after 5 seconds
6. Complete 20 notes per session
7. Review your performance statistics at the end

## Technology Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Web Audio API for sound synthesis

## Browser Compatibility

Works best in modern browsers that support Web Audio API:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Local Development

Simply open `index.html` in your browser. No build process or server required.

## License

This project is open source and available for educational purposes.