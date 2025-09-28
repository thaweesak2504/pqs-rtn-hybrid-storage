# Assets Directory

This directory contains all static assets for the CEATE PQS RTN project.

## 📁 Directory Structure

```
src/assets/
├── images/          # Image files (PNG, JPG, SVG, WebP)
├── icons/           # Icon files (SVG, PNG)
├── audio/           # Audio files (MP3, WAV, OGG)
├── videos/          # Video files (MP4, WebM, MOV)
├── fonts/           # Font files (TTF, WOFF, WOFF2)
└── documents/       # Document files (PDF, DOC, TXT)
```

## 🎯 Usage Guidelines

### Images
- **Formats**: PNG, JPG, SVG, WebP
- **Optimization**: Compress images before adding
- **Naming**: Use kebab-case (e.g., `hero-banner.png`)

### Icons
- **Formats**: SVG (preferred), PNG
- **Size**: Standard sizes (16x16, 24x24, 32x32, 48x48)
- **Naming**: Use descriptive names (e.g., `menu-hamburger.svg`)

### Audio
- **Formats**: MP3, WAV, OGG
- **Quality**: Balance between quality and file size
- **Naming**: Use descriptive names (e.g., `background-music.mp3`)

### Videos
- **Formats**: MP4, WebM, MOV
- **Compression**: Optimize for web delivery
- **Naming**: Use descriptive names (e.g., `product-demo.mp4`)

### Fonts
- **Formats**: TTF, WOFF, WOFF2
- **Licensing**: Ensure proper licensing
- **Naming**: Use font family names (e.g., `roboto-regular.woff2`)

### Documents
- **Formats**: PDF, DOC, TXT
- **Organization**: Group by category
- **Naming**: Use descriptive names (e.g., `user-manual.pdf`)

## 🔧 Import Examples

### React Component
```tsx
import heroImage from '../assets/images/hero-banner.png'
import menuIcon from '../assets/icons/menu-hamburger.svg'
import bgMusic from '../assets/audio/background-music.mp3'

// Usage
<img src={heroImage} alt="Hero Banner" />
<img src={menuIcon} alt="Menu" />
<audio src={bgMusic} controls />
```

### CSS
```css
@font-face {
  font-family: 'Roboto';
  src: url('../assets/fonts/roboto-regular.woff2') format('woff2');
}
```

## 📋 Best Practices

1. **File Organization**: Keep files organized by type and purpose
2. **Naming Convention**: Use consistent naming (kebab-case)
3. **Optimization**: Compress files for better performance
4. **Version Control**: Track large files appropriately
5. **Documentation**: Update this README when adding new asset types

## 🚀 Adding New Assets

1. Place files in the appropriate subdirectory
2. Follow naming conventions
3. Optimize files for web use
4. Update this README if needed
5. Commit changes with descriptive messages
