# Audio Directory

This directory contains all audio assets for the CEATE PQS RTN project.

## 📋 Supported Formats

- **MP3**: Most compatible, good compression
- **WAV**: Uncompressed, high quality
- **OGG**: Open source, good compression
- **AAC**: Apple devices, good quality

## 🎯 Usage Guidelines

### Audio Optimization
- **Compression**: Balance quality and file size
- **Duration**: Keep background music loops short
- **Volume**: Normalize audio levels
- **Metadata**: Include proper tags and descriptions

### Naming Convention
- Use kebab-case: `background-music.mp3`
- Include duration if relevant: `notification-2s.mp3`
- Use descriptive names: `button-click.mp3`

### File Organization
- **Background Music**: `bg-*.mp3`
- **Sound Effects**: `sfx-*.mp3`
- **Voice Overs**: `voice-*.mp3`
- **Notifications**: `notification-*.mp3`

## 🔧 Import Examples

```tsx
import bgMusic from '../assets/audio/background-music.mp3'
import buttonClick from '../assets/audio/button-click.mp3'

// Usage with HTML5 Audio
<audio src={bgMusic} controls />
<audio src={bgMusic} loop />

// Usage with JavaScript
const audio = new Audio(bgMusic)
audio.play()

// Button click sound
const handleClick = () => {
  const clickSound = new Audio(buttonClick)
  clickSound.play()
}
```

## 📊 Recommended Specifications

### Background Music
- **Format**: MP3
- **Bitrate**: 128-192 kbps
- **Duration**: 30-60 seconds (loopable)
- **Volume**: -20 to -16 dB

### Sound Effects
- **Format**: MP3 or WAV
- **Bitrate**: 128-256 kbps
- **Duration**: 0.1-3 seconds
- **Volume**: -12 to -6 dB

## 🚀 Adding New Audio Files

1. **Optimize**: Compress to appropriate size
2. **Test**: Ensure compatibility across browsers
3. **Loop**: For background music, ensure seamless looping
4. **Fallback**: Provide multiple formats if needed
5. **Accessibility**: Consider users with hearing impairments

## 🎵 Audio Categories

- **UI Sounds**: Button clicks, notifications, alerts
- **Background Music**: Ambient, relaxing, or energetic
- **Voice Overs**: Instructions, announcements, tutorials
- **Sound Effects**: Environmental, action, feedback sounds
