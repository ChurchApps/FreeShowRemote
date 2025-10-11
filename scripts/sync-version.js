const fs = require('fs');
const path = require('path');

// Read version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Read app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Update app.json version to match package.json
appJson.expo.version = packageJson.version;

// Update iOS bundle version string to match package.json
appJson.expo.ios.infoPlist['CFBundleShortVersionString'] = packageJson.version;

console.log(`Updating app version from ${appJson.expo.version} to ${packageJson.version}`);

// Write updated app.json
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log('Version sync completed successfully!');