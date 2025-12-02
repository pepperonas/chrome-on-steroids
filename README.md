# Chrome On Steroids 🚀

**AI-powered browser automation for freelancermap.de and kleinanzeigen.de**

Supercharge your Chrome browser with intelligent automation powered by ChatGPT and Claude AI.

---

## 🎯 Features

### 💼 FreelancerMap Integration
- **Auto-generate cover letters** for freelance projects
- **Smart skill matching** between your profile and project requirements
- **Anti-hallucination AI** - only uses real information from your profile
- **Portfolio integration** - automatically include your project links
- **One-click application** - generate and insert directly into the form

### 🛒 Kleinanzeigen Integration

#### Purchase Inquiries
- **Automated purchase messages** with price suggestions
- **Configurable discount** (percentage or fixed amount, default: 15%)
- **Smart message generation** based on product details
- **One-click insertion** into contact form

#### Listing Optimization
- **AI-powered description optimizer** for your own listings
- **Extracts all form data**: category, attributes, condition, shipping, price type
- **Seller settings**: name, address, shipping options
- **Automatic warranty disclaimer** for private sales
- **"Direct Buy" integration** - mentions secure payment when enabled
- **Supports both "Offer" and "Wanted" listings**

### 🤖 AI Integration
- ✅ **ChatGPT** (OpenAI) and **Claude** (Anthropic) support
- ✅ Separate API keys for both providers
- ✅ Automatic model fallback on API errors
- ✅ Optimized prompts with anti-hallucination rules
- ✅ Smart context-aware generation

### 📊 Logging & Analytics
- ✅ Automatic logging of all generations
- ✅ **Dynamic Export/Import** - all storage keys automatically included
- ✅ **Future-proof** - new settings exported without code changes
- ✅ Export generation logs with full details
- ✅ Live statistics (success rate, average time)
- ✅ **Accordion UI** for better settings organization

### 🛠️ Technical
- ✅ TypeScript with SOLID principles
- ✅ Modular architecture (FreelancerMap, Kleinanzeigen, Shared)
- ✅ Webpack for optimal bundling
- ✅ Automatic versioning (patch increment on build)
- ✅ Chrome Storage API for settings
- ✅ **Dynamic export/import** (future-proof)
- ✅ Comprehensive error handling
- ✅ MutationObserver for dynamic content
- ✅ **Accordion UI** for better UX

---

## 📦 Installation

### Development

1. **Clone repository:**

```bash
git clone https://github.com/pepperonas/chrome-on-steroids.git
cd chrome-on-steroids
```

2. **Install dependencies:**

```bash
npm install
```

3. **Build extension:**

```bash
npm run build
```

4. **Load in Chrome:**

   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Production

```bash
npm run build
```

The extension is ready in the `dist` folder for distribution.

---

## 🚀 Usage

### 1. Configuration

The popup uses an **accordion UI** to organize settings by platform:

#### 💼 FreelancerMap Einstellungen (Accordion)

**Setup AI Provider:**
1. Click the extension icon in Chrome toolbar
2. Expand **"FreelancerMap Einstellungen"** accordion (open by default)
3. **Select provider tab** (ChatGPT or Claude)
4. Enter your API key
5. Click **"Validate"** to test the key
6. Select desired **model** from dropdown
7. Click **"Save"**

**Important:** The **active provider** (shown top right as "Active: ...") switches only after **saving**!

#### Setup Profile (for FreelancerMap):
1. Fill in your profile:
   - **Name** (required)
   - **Email** (required)
   - **Phone** (optional)
   - **Skills** - comma-separated (required)
     - Example: `Java, Spring Boot, React, TypeScript, MySQL`
   - **Work Experience** (required)
     - Detailed description of your experience
     - Companies, roles, technologies, time periods
   - **Custom Intro** (optional)
     - Personal writing style
   - **Portfolio Projects** (optional)
     - Links to your projects
     - Will be inserted before closing

#### 🛒 Kleinanzeigen Einstellungen (Accordion)

**Setup Purchase Settings:**
1. Expand **"Kleinanzeigen Einstellungen"** accordion
2. Configure discount:
   - **Discount Type:** Percentage (%) or Fixed Amount (€)
   - **Discount Value:** Default 15%
   - **Custom Message Template** (optional)

**Setup Seller Settings (for Listing Optimization):**
1. Fill in seller information:
   - **Name** (required)
   - **Street & Number**
   - **Postal Code** (required)
   - **City** (required)
   - **Phone** (optional)
   - **Shipping Options:**
     - ☑️ Pickup available
     - ☑️ Shipping available (with optional cost)
   - **Warranty Disclaimer** (enabled by default)

---

### 2. FreelancerMap: Generate Cover Letters

1. **Navigate to freelancermap.de**
2. **Open a project** (detail page or from list)
3. **Click "Apply"** to open the application form
4. **Look for the "💎 Chrome On Steroids" button** next to "Generate Text"
5. **Click the button** - cover letter will be generated and inserted
6. **Review and submit** your application

**Features:**
- ✅ Automatic skill matching
- ✅ Uses only real information from your profile
- ✅ Structured format (greeting, hook, experience, value, CTA, portfolio, closing)
- ✅ Portfolio projects included (if configured)
- ✅ No hallucinations - validates against your profile

---

### 3. Kleinanzeigen: Purchase Inquiries

1. **Navigate to kleinanzeigen.de**
2. **Open a product** you want to buy
3. **Click "Send Message"** to open contact modal
4. **Look for the "💎 Anfrage generieren" button** next to "Send Message"
5. **Click the button** - purchase inquiry will be generated with price suggestion
6. **Review and send** your message

**Example Message:**
```
Hallo,

ich interessiere mich für "Vintage Kommode".

Würden Sie 339€ akzeptieren?

Ich könnte das Produkt zeitnah abholen bzw. würde es direkt bezahlen.

Viele Grüße
```

**Price Calculation:**
- Product Price: 399€
- Discount: 15%
- Suggested Price: 339€ (399 - 15%)

---

### 4. Kleinanzeigen: Optimize Your Listings

1. **Navigate to kleinanzeigen.de**
2. **Click "Create Listing"**
3. **Fill in the form:**
   - Title
   - Category
   - Attributes (Type, Condition, etc.)
   - Price & Price Type
   - Shipping options
   - Description (can be brief)
4. **Look for the "💎 Mit AI optimieren" button** next to "Description"
5. **Click the button** - AI will optimize your description
6. **Review the optimized text** and publish

**AI will include:**
- ✅ All form attributes (type, condition, shipping, etc.)
- ✅ Professional structure
- ✅ Seller information (location, shipping options)
- ✅ Warranty disclaimer (if enabled)
- ✅ "Direct Buy" mention (if enabled)
- ✅ Selling tips for better conversion

**Example Optimized Description:**
```
Verkaufe hochwertiges Damen-Mountainbike in sehr gutem Zustand.
Ideal für Touren und Stadtfahrten.

Details:
• Art: Damen
• Typ: Mountainbike
• Zustand: Sehr Gut - kaum Gebrauchsspuren
• Rahmenhöhe: 48cm
• 21-Gang Shimano Schaltung

Versand möglich (versichert) oder Abholung in 12345 Berlin.

✓ Sicherer Kauf mit "Direkt kaufen" - ohne Verhandlung zum Festpreis!

Bei Interesse einfach melden!

Da ich privat verkaufe, kann ich leider keine Garantie oder 
Rücknahme anbieten.
```

---

## 🔧 Configuration Files

### API Keys
- Stored securely in Chrome Storage
- Separate keys for ChatGPT and Claude
- Never exposed in logs or exports

### User Profile
- Name, Email, Phone
- Skills (comma-separated)
- Work Experience (detailed text)
- Custom Intro (optional)
- Portfolio Projects (optional)

### Seller Settings
- Name, Address (Street, Postal Code, City)
- Phone (optional)
- Shipping Options (Pickup, Shipping, Both)
- Shipping Cost (optional)
- Warranty Disclaimer (enabled/disabled)

### Kleinanzeigen Settings
- Discount Type (Percentage or Fixed Amount)
- Discount Value (default: 15)
- Custom Message Template (optional)

---

## 📊 Export & Import

### Export Settings (v2.0 - Future-Proof)
1. Click extension icon
2. Scroll to bottom
3. Click **"Einstellungen exportieren"** button
4. Save JSON file

**What's exported:**
- ✅ **All storage keys dynamically** (no manual updates needed)
- ✅ API configuration (both ChatGPT and Claude)
- ✅ User profile (FreelancerMap)
- ✅ Kleinanzeigen settings (discount, message template)
- ✅ Seller settings (name, address, shipping)
- ✅ **Future settings automatically included** (custom prompts, themes, etc.)

**Export format v2.0:**
```json
{
  "version": "2.0",
  "exportDate": "2025-12-02T10:30:00.000Z",
  "extensionVersion": "0.0.79",
  "storageKeys": ["api_config", "user_profile", "kleinanzeigen_settings", ...],
  "data": {
    "api_config": { ... },
    "user_profile": { ... },
    "kleinanzeigen_settings": { ... },
    "seller_settings": { ... }
  }
}
```

### Import Settings
1. Click extension icon
2. Scroll to bottom
3. Click **"Einstellungen importieren"** button
4. Select JSON file
5. Confirm import dialog (shows number of keys)

**Supports:**
- ✅ **v2.0 format** (dynamic, all keys)
- ✅ **v1.0 format** (legacy, backward compatible)

### Export Logs
1. Click extension icon
2. Scroll to "Generierungs-Logs"
3. Click **"Logs exportieren"** button
4. Save JSON file with all generation data

---

## 🏗️ Architecture

```
chrome-on-steroids/
├── src/
│   ├── modules/
│   │   ├── freelancermap/          # FreelancerMap module
│   │   │   ├── content-script.ts   # Button injection & handling
│   │   │   ├── controllers/        # Application logic
│   │   │   ├── services/           # DOM & data extraction
│   │   │   └── models/             # Data interfaces
│   │   ├── kleinanzeigen/          # Kleinanzeigen module
│   │   │   ├── content-script.ts   # Button injection & handling
│   │   │   ├── services/           # DOM, message gen, optimizer
│   │   │   └── models/             # Product & seller interfaces
│   │   └── shared/                 # Shared code
│   │       ├── services/           # AI, Storage, Logging
│   │       ├── models/             # Common interfaces
│   │       └── utils/              # Logger, Constants
│   ├── content/
│   │   └── content-router.ts       # Routes to correct module
│   ├── background/
│   │   └── service-worker.ts       # Background tasks
│   ├── popup/
│   │   ├── popup.html              # Settings UI
│   │   ├── popup.ts                # Settings logic
│   │   └── popup-extended.ts       # Kleinanzeigen settings
│   └── overlay/
│       └── overlay.ts              # Loading overlay
├── dist/                           # Built extension
├── icons/                          # Extension icons
├── manifest.json                   # Chrome extension manifest
├── package.json                    # Node dependencies
├── webpack.config.js               # Build configuration
└── tsconfig.json                   # TypeScript configuration
```

---

## 🧪 Development

### Build Commands

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Testing
npm run test
npm run test:watch
npm run test:coverage

# Clean dist folder
npm run clean
```

### Auto-Install Extension

```bash
npm run install-extension
```

This will:
1. Build the extension
2. Auto-increment version number
3. Attempt to open Chrome with the extension loaded

---

## 📝 Logging

All generations are automatically logged with:
- Project/Product details
- User profile used
- AI provider & model
- Full prompt sent to AI
- Generated text
- Generation time
- Success/Error status

**Access logs:**
1. Click extension icon
2. Scroll to "Generation Logs"
3. View statistics
4. Export logs as JSON

---

## 🔒 Privacy & Security

- ✅ **API keys stored locally** in Chrome Storage (encrypted by Chrome)
- ✅ **No data sent to external servers** (except AI providers)
- ✅ **No tracking or analytics**
- ✅ **All processing happens locally** in your browser
- ✅ **Open source** - audit the code yourself

---

## 🐛 Troubleshooting

### Button doesn't appear
- **Refresh the page** (F5)
- **Check if extension is enabled** (chrome://extensions/)
- **Check console for errors** (F12)
- **Try reloading the extension**

### API Key invalid
- **Check key format:**
  - ChatGPT: `sk-...` (OpenAI format)
  - Claude: `sk-ant-...` (Anthropic format)
- **Verify key is active** in your provider dashboard
- **Check for extra spaces** when pasting

### Generation fails
- **Check API key** is valid and has credits
- **Check internet connection**
- **Check console logs** (F12) for detailed error
- **Try different AI model** from dropdown

### Button disappears after form update
- This is fixed with **MutationObserver** and **interval checks**
- Button should **auto-recreate** within 2 seconds
- If not, **refresh the page**

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👨‍💻 Author

**Martin Pfeffer** | [celox.io](https://celox.io)

- GitHub: [@pepperonas](https://github.com/pepperonas)
- LinkedIn: [Martin Pfeffer](https://linkedin.com/in/martin-pfeffer)

---

## 🙏 Acknowledgments

- OpenAI for ChatGPT API
- Anthropic for Claude API
- Chrome Extensions API
- TypeScript & Webpack communities

---

## 📈 Roadmap

- [ ] Support for more job platforms
- [ ] Support for more marketplace platforms
- [ ] Custom AI prompt templates
- [ ] Multi-language support
- [ ] Browser sync across devices
- [ ] Advanced analytics dashboard

---

## 💡 Tips & Tricks

### FreelancerMap
- **Keep your profile updated** for best results
- **Add portfolio projects** to stand out
- **Review generated text** before sending
- **Customize the intro** for your writing style

### Kleinanzeigen Purchase
- **Adjust discount** based on item condition
- **Be polite** - AI generates friendly messages
- **Mention pickup** if you can collect locally

### Kleinanzeigen Listings
- **Fill all form fields** for best optimization
- **Add photos** before optimizing description
- **Enable "Direct Buy"** for faster sales
- **Use warranty disclaimer** for legal protection

---

**Made with ❤️ and ☕ in Berlin**
