#!/usr/bin/env node

/**
 * Script zum Erhöhen der Versionsnummer in manifest.json und package.json
 */

const fs = require('fs');
const path = require('path');

const SOURCE_MANIFEST_PATH = path.join(__dirname, '..', 'manifest.json');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

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

/**
 * Aktualisiert die Versionsnummer in einer JSON-Datei
 */
function updateVersionInFile(filePath, newVersion) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    content.version = newVersion;
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    return true;
  } catch (error) {
    console.error(`❌ Fehler beim Aktualisieren von ${filePath}:`, error);
    return false;
  }
}

// Lese aktuelle Versionsnummer und erhöhe sie
let currentVersion = '0.0.1';
try {
  if (fs.existsSync(SOURCE_MANIFEST_PATH)) {
    const sourceManifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST_PATH, 'utf8'));
    currentVersion = sourceManifest.version || '0.0.1';
  } else if (fs.existsSync(PACKAGE_JSON_PATH)) {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    currentVersion = packageJson.version || '0.0.1';
  }
} catch (error) {
  console.warn('⚠️  Konnte Versionsnummer nicht lesen, verwende 0.0.1');
}

const newVersion = incrementVersion(currentVersion);
console.log(`📦 Versionsnummer: ${currentVersion} -> ${newVersion}`);

// Aktualisiere Versionsnummer in manifest.json
let success = true;
if (fs.existsSync(SOURCE_MANIFEST_PATH)) {
  if (updateVersionInFile(SOURCE_MANIFEST_PATH, newVersion)) {
    console.log(`✅ manifest.json auf ${newVersion} aktualisiert`);
  } else {
    success = false;
  }
} else {
  console.warn('⚠️  manifest.json nicht gefunden');
}

// Aktualisiere Versionsnummer in package.json
if (fs.existsSync(PACKAGE_JSON_PATH)) {
  if (updateVersionInFile(PACKAGE_JSON_PATH, newVersion)) {
    console.log(`✅ package.json auf ${newVersion} aktualisiert`);
  } else {
    success = false;
  }
} else {
  console.warn('⚠️  package.json nicht gefunden');
}

if (!success) {
  process.exit(1);
}

