const fs = require('fs');
const https = require('https');
const path = require('path');

// Configuration
const VERSION_URLS = {
  'korea2': 'https://htkrydpatch1.wmupd.com/clientRes/TestPC_KRNew/Version/Windows/config.xml',
  'korea1': 'https://htkrydpatch1.wmupd.com/clientRes/TestPC_KR2New/Version/Windows/config.xml',
  'taiwan2': 'https://patchht1.iwplay.com.tw/clientRes/TestPC_IW_2_5_0/Version/Windows/config.xml',
  'taiwan1': 'https://patchht1.iwplay.com.tw/clientRes/TestPC_IW_3_0_0/Version/Windows/config.xml',
  'global': 'https://htkrydpatch1.wmupd.com/clientRes/OBPC_Xianqian/Version/Windows/config.xml',
  'cn': 'https://htcdn1.wmupd.com/clientRes/AdvLaunch52/Version/Windows/config.xml'
};

const HISTORY_FILE = path.join(__dirname, 'version-history.txt');
const CURRENT_FILE = path.join(__dirname, 'version-current.json');

// Fetch version from URL
function fetchVersion(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Extract version from XML - try AppVersion first, then Version
        const appVersionMatch = data.match(/<ResVersion>([\d.]+)<\/ResVersion>/);
        const versionMatch = data.match(/<Version>([\d.]+)<\/Version>/);
        
        if (appVersionMatch) {
          resolve(appVersionMatch[1]);
        } else if (versionMatch) {
          resolve(versionMatch[1]);
        } else {
          console.log(data); // Debug: print the XML to see structure
          reject(new Error('Version not found in XML'));
        }
      });
    }).on('error', reject);
  });
}

// Load current versions
function loadCurrentVersions() {
  if (fs.existsSync(CURRENT_FILE)) {
    return JSON.parse(fs.readFileSync(CURRENT_FILE, 'utf8'));
  }
  return {};
}

// Save current versions
function saveCurrentVersions(versions) {
  fs.writeFileSync(CURRENT_FILE, JSON.stringify(versions, null, 2));
}

// Append to history
function appendToHistory(client, version, date) {
  const line = `${date} | ${client} | ${version}\n`;
  fs.appendFileSync(HISTORY_FILE, line);
}

// Format date as DD.MM.YYYY
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Main check function
async function checkVersions() {
  console.log(`[${new Date().toISOString()}] Checking versions...`);
  
  const currentVersions = loadCurrentVersions();
  const now = new Date().toISOString();
  const formattedDate = formatDate(now);
  
  for (const [client, url] of Object.entries(VERSION_URLS)) {
    try {
      const version = await fetchVersion(url);
      
      // Check if version changed
      if (!currentVersions[client] || currentVersions[client].version !== version) {
        console.log(`[${client}] Version changed: ${(currentVersions[client] ? currentVersions[client].version : 'N/A')} -> ${version}`);
        
        // Update current version
        currentVersions[client] = {
          version: version,
          lastChanged: now,
          lastChangedFormatted: formattedDate
        };
        
        // Append to history
        appendToHistory(client, version, formattedDate);
      } else {
        console.log(`[${client}] Version unchanged: ${version}`);
      }
    } catch (error) {
      console.error(`[${client}] Error fetching version:`, error.message);
    }
  }
  
  // Save updated versions
  saveCurrentVersions(currentVersions);
  console.log('Check complete.\n');
}

// Run immediately
checkVersions();
