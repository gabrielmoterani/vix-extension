# VisiAble AI Browser Extension

A comprehensive browser accessibility extension that helps improve web accessibility by providing automated alt text generation, WCAG compliance checking, DOM processing, and ad blocking capabilities.

## 🚀 Features

- **Automated Alt Text Generation**: Generates descriptive alt text for images using AI
- **WCAG Compliance Checking**: Identifies accessibility issues and provides fixing suggestions
- **Ad Blocking**: Removes advertisements before DOM processing for better accessibility analysis
- **Content Summarization**: Provides page summaries using Mozilla Readability
- **Real-time DOM Processing**: Monitors and processes dynamic content changes
- **Multilingual Support**: Available in English and Portuguese

## 🛠️ Technologies

- **Framework**: [Plasmo Extension Framework](https://docs.plasmo.com/)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: TailwindCSS
- **Testing**: Vitest + jsdom
- **Ad Blocking**: @ghostery/adblocker-webextension
- **Content Processing**: @mozilla/readability
- **Accessibility**: axe-core

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **pnpm**: Recommended package manager (or npm)
- **Chrome/Chromium**: For development and testing

## 🏃‍♂️ Getting Started

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd vix-extension-v2/extension

# Install dependencies using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your backend URL:

```bash
# Copy the environment template
cp .env.example .env

# Edit the .env file with your backend configuration
# Default: http://localhost:8080/api
```

**Environment Variables:**

- `PLASMO_PUBLIC_BACKEND_URL`: Backend API URL
- `PLASMO_PUBLIC_BACKEND_TIMEOUT`: Request timeout in milliseconds

**For Production:**
```bash
# Use production environment
cp .env.production .env
```

### 3. Development Mode

Start the development server:

```bash
# Using pnpm
pnpm dev

# Or using npm
npm run dev
```

This will create a development build in the `build/chrome-mv3-dev` directory.

### 4. Load Extension in Browser

#### For Chrome/Chromium:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in the top right)
3. Click **"Load unpacked"**
4. Select the `build/chrome-mv3-dev` directory from your project
5. The VIX extension should now appear in your extensions list

#### For Firefox (if supported):

1. Open Firefox and navigate to `about:debugging`
2. Click **"This Firefox"**
3. Click **"Load Temporary Add-on"**
4. Select the `manifest.json` file from `build/firefox-mv2-dev` directory

### 5. Using the Extension

1. **Side Panel**: Click the VisiAble AI extension icon to open the side panel
2. **Navigate to any website**: The extension will automatically:
   - Remove advertisements
   - Process the DOM for accessibility
   - Generate image alt texts
   - Check for WCAG compliance issues
   - Provide content summaries

## 🔧 Development

### Available Scripts

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Package for distribution
pnpm package

# Run tests
pnpm test

# Build for Chrome development
pnpm run dev:chrome
```

### Project Structure

```
src/
├── background/           # Service worker files
├── contents/            # Content script (main functionality)
├── sidepanel/           # Side panel UI components
├── lib/
│   ├── api/            # Backend communication
│   ├── services/       # Core services
│   │   ├── adBlockService.ts      # Ad blocking functionality
│   │   ├── domProcessingService.ts # DOM analysis
│   │   ├── imageAltService.ts     # Alt text generation
│   │   ├── wcagCheckService.ts    # Accessibility checking
│   │   └── readabilityService.ts  # Content processing
│   ├── config/         # Configuration files
│   └── types/          # TypeScript definitions
└── locales/            # Internationalization
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test src/lib/services/__tests__/adBlockService.test.ts

# Run tests with coverage
pnpm test --coverage
```

## 🏗️ Building for Production

### 1. Create Production Build

```bash
pnpm build
```

This creates optimized builds in:
- `build/chrome-mv3-prod/` - Chrome/Chromium production build
- `build/firefox-mv2-prod/` - Firefox production build (if configured)

### 2. Package for Distribution

```bash
pnpm package
```

This creates zip files ready for store submission in the `build/` directory.

## 🔧 Configuration

### Permissions

The extension requires these permissions (defined in `package.json`):

```json
{
  "manifest": {
    "host_permissions": ["https://*/*"],
    "permissions": [
      "activeTab",
      "storage", 
      "scripting",
      "tabs",
      "sidePanel"
    ]
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Extension not loading**: 
   - Ensure development mode is enabled
   - Check console for errors
   - Rebuild the project: `pnpm build`

2. **TypeScript errors**:
   - Check types: `npx tsc --noEmit`
   - Update dependencies: `pnpm update`

3. **Content script not working**:
   - Check website permissions
   - Verify manifest permissions
   - Reload the extension

4. **Ad blocking not working**:
   - Check browser console for errors
   - Verify @ghostery/adblocker-webextension is installed
   - Test on sites with known ads

### Browser Console

Monitor the browser console for VIX logs:
- `VIX: Content script inicializado` - Extension loaded
- `VIX: Anúncios removidos: X elementos` - Ads removed
- `VIX: Estatísticas básicas` - DOM processing stats

## 📝 Development Notes

### Key Services

1. **AdBlockService**: Removes ads before DOM processing
2. **DomProcessingService**: Analyzes page structure and content  
3. **ImageAltService**: Generates AI-powered alt text
4. **WcagCheckService**: Identifies accessibility violations
5. **ReadabilityService**: Extracts clean content for summarization

### Content Script Flow

1. Initialize services
2. **Remove ads** (AdBlockService)
3. Process DOM (DomProcessingService)
4. Generate image alt texts (ImageAltService)
5. Check WCAG compliance (WcagCheckService)
6. Create content summary (ReadabilityService)
7. Monitor DOM changes

## 📄 License

Vix Accessibility 