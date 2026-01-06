# MeetingQuick - Chrome Extension

A Chrome browser extension (Manifest V3) that helps you manage your calendar meetings efficiently.

## Features

- 📅 View today's upcoming meetings in a clean, modern popup
- 🔔 Get notifications for upcoming meetings (configurable)
- 🔄 Refresh meetings with a single click
- 📱 Clean, modern UI with gradient design
- 🔗 Quick access to join meetings

## Installation

1. **Prepare Icon Files**
   - Create an `icons` folder in the extension directory
   - Add three icon files:
     - `icon16.png` (16x16 pixels)
     - `icon48.png` (48x48 pixels)
     - `icon128.png` (128x128 pixels)
   - You can use any image editor or online tool to create these icons

2. **Load the Extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `MeetingQuick` folder

## File Structure

```
MeetingQuick/
├── manifest.json       # Extension manifest (Manifest V3)
├── popup.html         # Extension popup UI
├── popup.js           # Popup functionality and meeting display
├── background.js      # Service worker for background tasks
├── content.js         # Content script for calendar page interaction
├── styles.css         # Modern styling for the extension
├── icons/             # Extension icons (you need to add these)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```

## Usage

1. Click the extension icon in your Chrome toolbar
2. View today's meetings in the popup
3. Click the refresh button to reload meetings
4. Click the phone icon on any meeting to join (if link available)

## Permissions

The extension requires the following permissions:
- **storage**: To save and retrieve meeting data
- **notifications**: To send reminders for upcoming meetings
- **alarms**: To schedule periodic checks for meetings
- **host_permissions**: To access Google Calendar and Outlook calendar pages

## Development Notes

- The extension uses Manifest V3 (service worker instead of background page)
- Sample meeting data is generated on first load for demonstration
- Calendar sync functionality can be extended in `content.js`
- Notification settings can be configured in the background service worker

## Future Enhancements

- Direct calendar API integration (Google Calendar API, Microsoft Graph API)
- Custom notification timing settings
- Meeting notes and reminders
- Integration with more calendar providers
- Dark mode support

## License

MIT License - feel free to modify and use as needed.

