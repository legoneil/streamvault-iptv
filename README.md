# StreamVault IPTV Player

Advanced web-based IPTV player with Xtreme Codes API and M3U playlist support.

## Features

- ✅ Xtreme Codes API authentication
- ✅ M3U playlist support
- ✅ HLS video streaming
- ✅ Channel categories and search
- ✅ Favorites system
- ✅ EPG (Electronic Program Guide)
- ✅ Responsive design

## Deploy to Render

### Option 1: Static Site (Recommended)

1. **Create a GitHub repository** and push these files
2. **Go to Render Dashboard** (https://render.com)
3. **Click "New +"** → Select **"Static Site"**
4. **Connect your GitHub repository**
5. **Configure:**
   - **Build Command:** (leave empty)
   - **Publish Directory:** `.`
6. **Click "Create Static Site"**

Your IPTV player will be live at: `https://your-app-name.onrender.com`

### Option 2: Web Service (Alternative)

If you want more control, you can deploy as a web service using the included server configuration.

1. **Connect your GitHub repository**
2. **Select "Web Service"**
3. **Configure:**
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. **Click "Create Web Service"**

## Local Development

Simply open `iptv-player.html` in any modern web browser.

## Usage

1. Open the deployed URL
2. Choose login method (Xtreme Codes or M3U)
3. Enter your credentials/playlist URL
4. Browse and watch channels

## Browser Requirements

- Modern browser with HTML5 video support
- JavaScript enabled
- HLS.js compatible browser (Chrome, Firefox, Edge, Safari)

## Security Note

This player runs entirely in the browser. Your credentials are only sent to your IPTV provider's servers and are not stored on Render or any third-party servers.

## License

Free to use and modify for personal projects.
