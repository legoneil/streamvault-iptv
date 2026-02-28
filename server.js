const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Route all requests to the IPTV player
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'iptv-player.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`StreamVault IPTV Player running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
});
