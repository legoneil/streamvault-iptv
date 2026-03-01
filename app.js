// Global State
let appState = {
    loginType: 'xtreme',
    credentials: null,
    channels: [],
    categories: [],
    favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
    currentChannel: null,
    epgData: {},
    hls: null
};

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    checkSavedCredentials();
});

// Check for saved credentials
function checkSavedCredentials() {
    const savedCreds = localStorage.getItem('iptvCredentials');
    
    if (savedCreds) {
        const creds = JSON.parse(savedCreds);
        displaySavedPlaylist(creds);
    }
}

// Display saved playlist option
function displaySavedPlaylist(creds) {
    const section = document.getElementById('savedPlaylistSection');
    section.style.display = 'block';
    
    const displayName = creds.type === 'xtreme' 
        ? creds.username || 'Xtreme Codes' 
        : 'M3U Playlist';
    
    const displayDetail = creds.type === 'xtreme'
        ? creds.server || ''
        : creds.url ? new URL(creds.url).hostname : '';
    
    section.innerHTML = `
        <div class="saved-playlist">
            <div class="saved-playlist-header">
                <div class="saved-icon">📺</div>
                <div class="saved-info">
                    <h3>${displayName}</h3>
                    <p>${displayDetail}</p>
                </div>
            </div>
            <div class="saved-actions">
                <button class="btn-primary" onclick="loadSavedPlaylist()">
                    ▶️ Continue Watching
                </button>
                <button class="btn-danger" onclick="clearSavedPlaylist()">
                    🗑️ Remove
                </button>
            </div>
        </div>
    `;
}

// Load saved playlist
function loadSavedPlaylist() {
    const savedCreds = localStorage.getItem('iptvCredentials');
    if (savedCreds) {
        const creds = JSON.parse(savedCreds);
        appState.credentials = creds;
        
        showLoading();
        
        if (creds.type === 'xtreme') {
            loadXtremeChannels(creds.server, creds.username, creds.password);
        } else {
            loadM3UPlaylist(creds.url);
        }
    }
}

// Clear saved playlist
function clearSavedPlaylist() {
    if (confirm('Are you sure you want to remove this saved playlist?')) {
        localStorage.removeItem('iptvCredentials');
        document.getElementById('savedPlaylistSection').style.display = 'none';
    }
}

// Show login screen
function showLoginScreen() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('active');
}

// Show welcome screen
function showWelcomeScreen() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('welcomeScreen').classList.remove('hidden');
}

// Login Tab Switching
function switchLoginTab(type) {
    appState.loginType = type;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(type === 'xtreme' ? 'xtremeForm' : 'm3uForm').classList.add('active');
}

// Xtreme Codes Login
async function loginXtreme(event) {
    event.preventDefault();
    
    const server = document.getElementById('xtremeServer').value.trim();
    const username = document.getElementById('xtremeUsername').value.trim();
    const password = document.getElementById('xtremePassword').value.trim();
    const remember = document.getElementById('rememberXtreme').checked;

    appState.credentials = { server, username, password, type: 'xtreme' };
    
    if (remember) {
        localStorage.setItem('iptvCredentials', JSON.stringify(appState.credentials));
    }
    
    showLoading();
    await loadXtremeChannels(server, username, password);
}

// Load Xtreme Codes channels
async function loadXtremeChannels(server, username, password) {
    try {
        const liveUrl = `${server}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
        const response = await fetch(liveUrl);
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
            console.log('=== RAW API RESPONSE ===');
            console.log('First channel from API:', data[0]);
            
            appState.channels = data.map(channel => ({
                id: channel.stream_id,
                name: channel.name,
                // Keep ALL category-related fields
                category_id: channel.category_id,
                category: channel.category_id,
                category_name: channel.category_name,
                categoryName: channel.category_name || 'Uncategorized',
                logo: channel.stream_icon || '',
                url: `${server}/live/${username}/${password}/${channel.stream_id}.m3u8`,
                epgChannelId: channel.epg_channel_id || null
            }));
            
            extractCategories();
            initializeApp();
        } else {
            alert('Invalid credentials or no channels available');
            hideLoading();
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to connect. Please check your credentials and try again.');
        hideLoading();
    }
}

// M3U Playlist Login
async function loginM3U(event) {
    event.preventDefault();
    
    const m3uUrl = document.getElementById('m3uUrl').value.trim();
    const remember = document.getElementById('rememberM3U').checked;
    
    appState.credentials = { url: m3uUrl, type: 'm3u' };
    
    if (remember) {
        localStorage.setItem('iptvCredentials', JSON.stringify(appState.credentials));
    }
    
    showLoading();
    await loadM3UPlaylist(m3uUrl);
}

// Load M3U Playlist
async function loadM3UPlaylist(m3uUrl) {
    try {
        const response = await fetch(m3uUrl);
        const m3uText = await response.text();
        
        appState.channels = parseM3U(m3uText);
        
        if (appState.channels.length > 0) {
            extractCategories();
            initializeApp();
        } else {
            alert('No channels found in playlist');
            hideLoading();
        }
    } catch (error) {
        console.error('M3U load error:', error);
        alert('Failed to load playlist. Please check the URL and try again.');
        hideLoading();
    }
}

// Parse M3U Playlist
function parseM3U(m3uText) {
    const lines = m3uText.split('\n');
    const channels = [];
    let currentChannel = null;
    
    lines.forEach(line => {
        line = line.trim();
        
        if (line.startsWith('#EXTINF:')) {
            const nameMatch = line.match(/,(.+)$/);
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const groupMatch = line.match(/group-title="([^"]+)"/);
            
            currentChannel = {
                id: Date.now() + Math.random(),
                name: nameMatch ? nameMatch[1].trim() : 'Unknown Channel',
                logo: logoMatch ? logoMatch[1] : '',
                categoryName: groupMatch ? groupMatch[1] : 'Uncategorized',
                category: groupMatch ? groupMatch[1] : 'Uncategorized'
            };
        } else if (line && !line.startsWith('#') && currentChannel) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = null;
        }
    });
    
    return channels;
}

// Extract categories from channels
function extractCategories() {
    const categoryMap = new Map();
    
    // Debug: log first few channels to see structure
    console.log('=== EXTRACTING CATEGORIES ===');
    console.log('Total channels:', appState.channels.length);
    console.log('First 5 channels:', appState.channels.slice(0, 5));
    
    appState.channels.forEach((channel, index) => {
        const catKey = channel.category_id || channel.category || channel.categoryName || 'Uncategorized';
        const catName = channel.category_name || channel.categoryName || 'Uncategorized';
        
        // Debug first few
        if (index < 5) {
            console.log(`Channel ${index}:`, {
                name: channel.name,
                category_id: channel.category_id,
                category: channel.category,
                category_name: channel.category_name,
                categoryName: channel.categoryName,
                computed_key: catKey,
                computed_name: catName
            });
        }
        
        if (!categoryMap.has(catKey)) {
            categoryMap.set(catKey, {
                id: catKey,
                name: catName
            });
        }
    });
    
    appState.categories = Array.from(categoryMap.values());
    console.log('Extracted categories:', appState.categories);
}

// Initialize App
function initializeApp() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('active');
    
    setTimeout(() => {
        document.getElementById('appContainer').classList.add('active');
        renderCategories();
        renderChannels();
        hideLoading();
    }, 300);
}

// Render Categories
function renderCategories() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    
    console.log('=== RENDERING CATEGORIES ===');
    console.log('Total categories:', appState.categories.length);
    
    // Add "All Channels" option
    const allItem = document.createElement('li');
    allItem.className = 'channel-item active';
    allItem.innerHTML = `
        <div class="channel-logo">ALL</div>
        <div class="channel-info">
            <div class="channel-name">All Channels</div>
            <div class="channel-category">${appState.channels.length} channels</div>
        </div>
    `;
    allItem.onclick = () => {
        document.querySelectorAll('#categoryList .channel-item').forEach(el => el.classList.remove('active'));
        allItem.classList.add('active');
        renderChannels(null);
    };
    categoryList.appendChild(allItem);
    
    // Add categories
    appState.categories.forEach(category => {
        const item = document.createElement('li');
        item.className = 'channel-item';
        
        // Count channels with comprehensive field checking
        const filterStr = String(category.id);
        const channelCount = appState.channels.filter(ch => {
            return String(ch.category_id) === filterStr ||
                   String(ch.category) === filterStr ||
                   String(ch.category_name) === filterStr ||
                   String(ch.categoryName) === filterStr;
        }).length;
        
        console.log(`Category "${category.name}" (ID: ${category.id}): ${channelCount} channels`);
        
        item.innerHTML = `
            <div class="channel-logo">${category.name.substring(0, 2).toUpperCase()}</div>
            <div class="channel-info">
                <div class="channel-name">${category.name}</div>
                <div class="channel-category">${channelCount} channels</div>
            </div>
        `;
        
        // Store the category ID for filtering
        item.onclick = () => {
            console.log('Clicked category:', category.name, 'with ID:', category.id);
            document.querySelectorAll('#categoryList .channel-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            renderChannels(category.id);
        };
        
        categoryList.appendChild(item);
    });
}

// Render Channels
function renderChannels(categoryFilter = null) {
    const channelList = document.getElementById('channelList');
    channelList.innerHTML = '';
    
    let filteredChannels = appState.channels;
    
    if (categoryFilter !== null) {
        console.log('=== FILTERING CHANNELS ===');
        console.log('Filter value:', categoryFilter);
        console.log('Filter type:', typeof categoryFilter);
        
        // Convert to string for comparison
        const filterStr = String(categoryFilter);
        
        filteredChannels = appState.channels.filter(ch => {
            // Check ALL possible category fields
            const match1 = String(ch.category_id) === filterStr;
            const match2 = String(ch.category) === filterStr;
            const match3 = String(ch.category_name) === filterStr;
            const match4 = String(ch.categoryName) === filterStr;
            
            const matches = match1 || match2 || match3 || match4;
            
            // Debug first match
            if (matches) {
                console.log('Matched channel:', {
                    name: ch.name,
                    category_id: ch.category_id,
                    category: ch.category,
                    category_name: ch.category_name,
                    categoryName: ch.categoryName
                });
            }
            
            return matches;
        });
        
        console.log(`Found ${filteredChannels.length} channels for filter "${filterStr}"`);
    }
    
    if (filteredChannels.length === 0) {
        channelList.innerHTML = '<li style="padding: 20px; color: var(--text-secondary); text-align: center;">No channels in this category</li>';
        return;
    }
    
    filteredChannels.forEach(channel => {
        const item = document.createElement('li');
        item.className = 'channel-item';
        
        const isFavorite = appState.favorites.includes(channel.id);
        
        item.innerHTML = `
            <div class="channel-logo">${channel.logo ? `<img src="${channel.logo}" style="width:100%;height:100%;border-radius:6px;object-fit:cover;">` : channel.name.substring(0, 2).toUpperCase()}</div>
            <div class="channel-info">
                <div class="channel-name">${channel.name}</div>
                <div class="channel-category">${channel.categoryName}</div>
            </div>
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(event, '${channel.id}')">
                ${isFavorite ? '★' : '☆'}
            </button>
        `;
        
        item.onclick = (e) => {
            if (!e.target.classList.contains('favorite-btn')) {
                playChannel(channel);
            }
        };
        
        channelList.appendChild(item);
    });
}

// Play Channel
function playChannel(channel) {
    appState.currentChannel = channel;
    
    document.querySelectorAll('#channelList .channel-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.getElementById('currentChannelName').textContent = channel.name;
    document.getElementById('currentProgramInfo').textContent = channel.categoryName;
    
    showLoading();
    
    const video = document.getElementById('videoPlayer');
    
    // Destroy existing HLS instance
    if (appState.hls) {
        appState.hls.destroy();
    }
    
    // Check if HLS is supported
    if (channel.url.includes('.m3u8')) {
        if (Hls.isSupported()) {
            appState.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true
            });
            appState.hls.loadSource(channel.url);
            appState.hls.attachMedia(video);
            
            appState.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play();
                hideLoading();
            });
            
            appState.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                    hideLoading();
                    alert('Failed to load channel stream');
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = channel.url;
            video.addEventListener('loadedmetadata', () => {
                video.play();
                hideLoading();
            });
        }
    } else {
        video.src = channel.url;
        video.addEventListener('loadedmetadata', () => {
            video.play();
            hideLoading();
        });
    }
    
    loadEPGForChannel(channel);
    
    // Close mobile menu on mobile devices
    if (window.innerWidth <= 768) {
        closeMobileMenu();
    }
}

// Load EPG for Channel
function loadEPGForChannel(channel) {
    const epgContent = document.getElementById('epgContent');
    
    // Mock EPG data
    const mockEPG = [
        {
            time: '20:00 - 21:00',
            title: 'Evening News',
            description: 'Latest news and updates from around the world',
            nowPlaying: true
        },
        {
            time: '21:00 - 22:30',
            title: 'Prime Time Show',
            description: 'Tonight\'s featured entertainment program',
            nowPlaying: false
        },
        {
            time: '22:30 - 23:00',
            title: 'Late Night Talk Show',
            description: 'Interviews and comedy sketches',
            nowPlaying: false
        }
    ];
    
    epgContent.innerHTML = mockEPG.map(program => `
        <div class="epg-item ${program.nowPlaying ? 'now-playing' : ''}">
            <div class="epg-time">${program.time}</div>
            <div class="epg-title">${program.title}</div>
            <div class="epg-description">${program.description}</div>
        </div>
    `).join('');
}

// Search Channels
function searchChannels() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const channelItems = document.querySelectorAll('#channelList .channel-item');
    
    channelItems.forEach(item => {
        const channelName = item.querySelector('.channel-name').textContent.toLowerCase();
        if (channelName.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Toggle Favorite
function toggleFavorite(event, channelId) {
    event.stopPropagation();
    
    // Convert to string for comparison
    channelId = String(channelId);
    const stringFavorites = appState.favorites.map(String);
    const index = stringFavorites.indexOf(channelId);
    
    if (index > -1) {
        appState.favorites.splice(index, 1);
    } else {
        appState.favorites.push(channelId);
    }
    
    localStorage.setItem('favorites', JSON.stringify(appState.favorites));
    renderChannels();
}

// Toggle Favorites View
function toggleFavorites() {
    const favoriteChannels = appState.channels.filter(ch => 
        appState.favorites.map(String).includes(String(ch.id))
    );
    
    if (favoriteChannels.length === 0) {
        alert('No favorite channels yet. Add some by clicking the star icon!');
        return;
    }
    
    const channelList = document.getElementById('channelList');
    channelList.innerHTML = '';
    
    favoriteChannels.forEach(channel => {
        const item = document.createElement('li');
        item.className = 'channel-item';
        
        item.innerHTML = `
            <div class="channel-logo">${channel.logo ? `<img src="${channel.logo}" style="width:100%;height:100%;border-radius:6px;object-fit:cover;">` : channel.name.substring(0, 2).toUpperCase()}</div>
            <div class="channel-info">
                <div class="channel-name">${channel.name}</div>
                <div class="channel-category">${channel.categoryName}</div>
            </div>
            <button class="favorite-btn active" onclick="toggleFavorite(event, '${channel.id}')">★</button>
        `;
        
        item.onclick = (e) => {
            if (!e.target.classList.contains('favorite-btn')) {
                playChannel(channel);
            }
        };
        
        channelList.appendChild(item);
    });
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        if (appState.hls) {
            appState.hls.destroy();
        }
        
        appState = {
            loginType: 'xtreme',
            credentials: null,
            channels: [],
            categories: [],
            favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
            currentChannel: null,
            epgData: {},
            hls: null
        };
        
        document.getElementById('appContainer').classList.remove('active');
        setTimeout(() => {
            showWelcomeScreen();
        }, 300);
    }
}

// Loading Functions
function showLoading() {
    document.getElementById('loadingSpinner').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.remove('active');
}

// Mobile Menu Functions
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    const isOpen = sidebar.classList.contains('mobile-open');
    
    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

function openMobileMenu() {
    document.getElementById('sidebar').classList.add('mobile-open');
    document.getElementById('mobileOverlay').classList.add('active');
    document.getElementById('mobileMenuToggle').textContent = '✕';
}

function closeMobileMenu() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('mobileOverlay').classList.remove('active');
    document.getElementById('mobileMenuToggle').textContent = '☰';
}
