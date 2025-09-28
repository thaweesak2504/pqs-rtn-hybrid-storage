# Images Directory

This directory contains all image assets for the CEATE PQS RTN project.

## 📋 Supported Formats

- **PNG**: For images with transparency
- **JPG/JPEG**: For photographs and complex images
- **SVG**: For scalable graphics and icons
- **WebP**: For optimized web images (with fallbacks)

## 🎯 Usage Guidelines

### Image Optimization
- **Compress**: Use tools like TinyPNG, ImageOptim, or Squoosh
- **Responsive**: Provide multiple sizes for different screen sizes
- **Alt Text**: Always include descriptive alt text for accessibility

### Naming Convention
- Use kebab-case: `hero-banner.png`
- Include size if multiple versions: `logo-32x32.png`, `logo-64x64.png`
- Use descriptive names: `product-screenshot.png`

### File Organization
- **Hero Images**: `hero-*.png`
- **Product Images**: `product-*.png`
- **Background Images**: `bg-*.png`
- **Logo Variations**: `logo-*.png`

## 🔧 Import Examples

```tsx
import heroImage from '../assets/images/hero-banner.png'
import productImage from '../assets/images/product-screenshot.png'

// Usage
<img src={heroImage} alt="Hero Banner" className="w-full h-auto" />
<img src={productImage} alt="Product Screenshot" className="rounded-lg" />
```

## 📏 Recommended Sizes

- **Hero Images**: 1920x1080px (16:9 ratio)
- **Product Images**: 800x600px (4:3 ratio)
- **Thumbnails**: 300x200px
- **Icons**: 32x32px, 64x64px

## 🚀 Adding New Images

1. Optimize the image for web use
2. Use appropriate format (PNG for transparency, JPG for photos)
3. Follow naming conventions
4. Add descriptive alt text when using
5. Consider responsive images for different screen sizes
