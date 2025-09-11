# Custom Backgrounds

This directory is for storing custom background images for the OutDecked application.

## How to Add Custom Backgrounds

1. **Add your image files** to this directory (e.g., `custom1.jpg`, `custom2.jpg`, etc.)
2. **Update the background options** in `src/components/BackgroundSwitcher.tsx`
3. **Add new entries** to the `backgroundOptions` array:

```typescript
{
  id: 'custom-3',
  name: 'My Custom Background',
  url: '/backgrounds/my-custom-bg.jpg',
}
```

## Supported Formats

- **Images**: JPG, PNG, WebP, GIF
- **Gradients**: CSS linear-gradient strings
- **External URLs**: Any publicly accessible image URL

## File Naming Convention

- Use descriptive names: `forest-theme.jpg`, `space-background.png`
- Keep file sizes reasonable (< 2MB recommended)
- Use lowercase with hyphens for consistency

## Future Features

- User profile backgrounds
- Background categories
- Background previews
- Upload interface
