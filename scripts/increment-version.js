#!/usr/bin/env node

/**
 * Script zum Erhöhen der Versionsnummer in manifest.json
 */

const fs = require('fs');
const path = require('path');

const SOURCE_MANIFEST_PATH = path.join(__dirname, '..', 'manifest.json');

/**
 * Erhöht die Versionsnummer (z.B. 0.0.1 -> 0.0.2)
 */
function incrementVersion(version) {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Ungültige Versionsnummer: ${version}`);
  }
  
  const patch = parseInt(parts[2], 10);
  if (isNaN(patch)) {
    throw new Error(`Ungültige Patch-Version: ${parts[2]}`);
  }
  
  parts[2] = (patch + 1).toString();
  return parts.join('.');
}

// Lese aktuelle Versionsnummer und erhöhe sie
let currentVersion = '0.0.1';
try {
  if (fs.existsSync(SOURCE_MANIFEST_PATH)) {
    const sourceManifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST_PATH, 'utf8'));
    currentVersion = sourceManifest.version || '0.0.1';
  }
} catch (error) {
  console.warn('⚠️  Konnte Versionsnummer nicht lesen, verwende 0.0.1');
}

const newVersion = incrementVersion(currentVersion);
console.log(`📦 Versionsnummer: ${currentVersion} -> ${newVersion}`);

// Aktualisiere Versionsnummer in manifest.json
try {
  const manifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST_PATH, 'utf8'));
  manifest.version = newVersion;
  fs.writeFileSync(SOURCE_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✅ Versionsnummer auf ${newVersion} aktualisiert`);
} catch (error) {
  console.error('❌ Fehler beim Aktualisieren der Versionsnummer:', error);
  process.exit(1);
}

