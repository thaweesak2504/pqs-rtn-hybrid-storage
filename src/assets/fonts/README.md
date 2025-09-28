# Fonts Directory

This directory contains all font assets for the CEATE PQS RTN project.

## 📁 Current Structure

```
src/assets/fonts/
├── kanit/                    # Kanit Font Family (Primary UI Font)
│   ├── Kanit-Thin.woff2      # Thin weight (100)
│   ├── Kanit-ThinItalic.woff2 # Thin Italic
│   ├── Kanit-ExtraLight.woff2 # Extra Light weight (200)
│   ├── Kanit-ExtraLightItalic.woff2 # Extra Light Italic
│   ├── kanit-Light.woff2     # Light weight (300)
│   ├── kanit-LightItalic.woff2 # Light Italic
│   ├── kanit-Regular.woff2   # Regular weight (400)
│   ├── kanit-Italic.woff2    # Italic style
│   ├── kanit-Medium.woff2    # Medium weight (500)
│   ├── kanit-MediumItalic.woff2 # Medium Italic
│   ├── Kanit-SemiBold.woff2  # SemiBold weight (600)
│   ├── Kanit-SemiBoldItalic.woff2 # SemiBold Italic
│   ├── kanit-Bold.woff2      # Bold weight (700)
│   ├── kanit-BoldItalic.woff2 # Bold Italic
│   └── kanit-local.css       # CSS for local font loading
├── th-sarabun/               # TH Sarabun Font Family (Thai Documents)
│   ├── th-sarabun-thin.woff2 # Thin weight (100)
│   ├── th-sarabun-thinitalic.woff2 # Thin Italic
│   ├── th-sarabun-regular.woff2 # Regular weight (400)
│   ├── th-sarabun-italic.woff2 # Italic style
│   ├── th-sarabun-medium.woff2 # Medium weight (500)
│   ├── th-sarabun-mediumitalic.woff2 # Medium Italic
│   ├── th-sarabun-semibold.woff2 # SemiBold weight (600)
│   ├── th-sarabun-semibolditalic.woff2 # SemiBold Italic
│   ├── th-sarabun-bold.woff2 # Bold weight (700)
│   ├── th-sarabun-bolditalic.woff2 # Bold Italic
│   └── th-sarabun-local.css  # CSS for local font loading
└── README.md                 # This file
```

## 🎯 Font Families

### Kanit Font
- **Purpose**: Primary Latin font family
- **Weights**: Thin, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black
- **Styles**: Regular, Italic
- **Format**: WOFF2 (optimized for web)

### Thai Sarabun Font
- **Purpose**: Thai language support
- **Weights**: Thin, Regular, Medium, SemiBold, Bold
- **Styles**: Regular, Italic
- **Format**: WOFF2 (optimized for web)

## 🔧 Usage Guidelines

### Loading Fonts
```css
/* Import the local CSS files */
@import url('./kanit/kanit-local.css');
@import url('./kanit/th-sarabun/th-sarabun-local.css');
```

### CSS Font-Family
```css
/* Latin text */
.latin-text {
  font-family: 'Kanit', sans-serif;
}

/* Thai text */
.thai-text {
  font-family: 'TH Sarabun', serif;
}

/* Mixed content */
.mixed-text {
  font-family: 'Kanit', 'TH Sarabun', sans-serif;
}
```

### React Component
```tsx
// Import CSS in your main component
import '../assets/fonts/kanit/kanit-local.css'
import '../assets/fonts/kanit/th-sarabun/th-sarabun-local.css'

// Usage in JSX
<div className="font-kanit">English Text</div>
<div className="font-th-sarabun">ข้อความภาษาไทย</div>
```

## 📋 Best Practices

### Font Loading
1. **Preload**: Add font preload in HTML head
2. **Fallbacks**: Always provide fallback fonts
3. **Performance**: Use WOFF2 format for better compression
4. **Display**: Use `font-display: swap` for better UX

### Font Selection
- **Latin**: Use Kanit for English text
- **Thai**: Use TH Sarabun for Thai text
- **Mixed**: Use both fonts with proper fallbacks

### File Organization
- **Family-based**: Group fonts by family name
- **Weight-based**: Organize by font weight
- **Style-based**: Separate regular and italic styles

## 🚀 Adding New Fonts

1. **Create folder**: `src/assets/fonts/[font-name]/`
2. **Add files**: Include all weights and styles
3. **Create CSS**: Generate `[font-name]-local.css`
4. **Update imports**: Add to main CSS file
5. **Test**: Verify font loading and rendering

## 📊 Font Specifications

### Kanit
- **Type**: Sans-serif
- **Weights**: 9 weights (Thin to Black)
- **Styles**: Regular, Italic
- **Languages**: Latin, Thai

### TH Sarabun
- **Type**: Serif
- **Weights**: 5 weights (Thin to Bold)
- **Styles**: Regular, Italic
- **Languages**: Thai

## 🎨 CSS Classes (Tailwind)

```css
/* Add to your Tailwind config */
.font-kanit {
  font-family: 'Kanit', sans-serif;
}

.font-th-sarabun {
  font-family: 'TH Sarabun', serif;
}
```
