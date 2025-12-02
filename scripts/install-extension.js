#!/usr/bin/env node

/**
 * Script zum automatischen Installieren/Updaten der Extension in Chrome
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const MANIFEST_PATH = path.join(DIST_DIR, 'manifest.json');
const SOURCE_MANIFEST_PATH = path.join(__dirname, '..', 'manifest.json');

console.log('📦 Extension wird gebaut...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Build erfolgreich!\n');
} catch (error) {
  console.error('❌ Build fehlgeschlagen:', error.message);
  process.exit(1);
}

// Chrome Extension ID aus manifest.json lesen (falls vorhanden)
let extensionId = null;
try {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  extensionId = manifest.key || null;
} catch (error) {
  console.warn('⚠️  Konnte Extension ID nicht aus manifest.json lesen');
}

console.log('🚀 Extension Installation:');
console.log('');
console.log('1. Öffne Chrome und navigiere zu: chrome://extensions/');
console.log('2. Aktiviere "Entwicklermodus" (oben rechts)');
console.log('3. Klicke auf "Entpackte Erweiterung laden"');
console.log(`4. Wähle den Ordner: ${DIST_DIR}`);
console.log('');
console.log('💡 Tipp: Du kannst auch direkt diesen Pfad kopieren:');
console.log(`   ${DIST_DIR}`);
console.log('');

// Öffne Chrome Extension-Seite
console.log('🚀 Öffne Chrome Extension-Seite...\n');

if (process.platform === 'darwin') {
  try {
    // Prüfe ob Chrome läuft
    let chromeRunning = false;
    try {
      execSync('pgrep -f "Google Chrome"', { stdio: 'ignore' });
      chromeRunning = true;
    } catch {
      chromeRunning = false;
    }

    if (chromeRunning) {
      // Chrome läuft bereits - zeige nur Anweisungen
      console.log('✅ Chrome läuft bereits.');
      console.log('\n📝 Nächste Schritte:');
      console.log('1. Öffne chrome://extensions/ (falls nötig)');
      console.log('2. Aktiviere "Entwicklermodus" (oben rechts)');
      console.log('3. Falls die Extension bereits geladen ist, klicke auf "Aktualisieren" (🔄)');
      console.log('4. Falls nicht, klicke auf "Entpackte Erweiterung laden"');
      console.log(`5. Wähle den Ordner: ${DIST_DIR}`);
    } else {
      // Chrome läuft nicht - starte es mit Extension
      console.log('📦 Chrome läuft nicht. Starte Chrome mit Extension...');
      try {
        execSync(
          `open -a "Google Chrome" --args --load-extension="${DIST_DIR}"`,
          { stdio: 'inherit' }
        );
        console.log('\n✅ Chrome wurde mit der Extension gestartet!');
        console.log('💡 Die Extension sollte jetzt aktiv sein.');
      } catch (error) {
        console.warn('⚠️  Konnte Chrome nicht automatisch starten.');
        console.log('   Starte Chrome manuell und öffne: chrome://extensions/');
      }
    }
  } catch (error) {
    console.warn('⚠️  Fehler beim Öffnen von Chrome.');
    console.log('\n📋 Manuelle Installation:');
    console.log('1. Öffne Chrome und navigiere zu: chrome://extensions/');
    console.log('2. Aktiviere "Entwicklermodus" (oben rechts)');
    console.log('3. Klicke auf "Entpackte Erweiterung laden"');
    console.log(`4. Wähle den Ordner: ${DIST_DIR}`);
  }
} else if (process.platform === 'linux') {
  try {
    // Prüfe ob Chrome läuft
    let chromeRunning = false;
    try {
      execSync('pgrep -f "google-chrome"', { stdio: 'ignore' });
      chromeRunning = true;
    } catch {
      chromeRunning = false;
    }

    if (chromeRunning) {
      console.log('✅ Chrome läuft bereits.');
      console.log('\n📝 Nächste Schritte:');
      console.log('1. Öffne chrome://extensions/ (falls nötig)');
      console.log('2. Aktiviere "Entwicklermodus"');
      console.log('3. Falls die Extension bereits geladen ist, klicke auf "Aktualisieren" (🔄)');
      console.log(`4. Falls nicht, lade die Extension aus: ${DIST_DIR}`);
    } else {
      execSync(
        `google-chrome --load-extension="${DIST_DIR}" &`,
        { stdio: 'inherit' }
      );
      console.log('\n✅ Chrome wurde mit der Extension gestartet!');
    }
  } catch (error) {
    console.warn('⚠️  Konnte Chrome nicht automatisch starten.');
    console.log('\n📋 Manuelle Installation:');
    console.log(`   chrome://extensions/ -> Entwicklermodus -> ${DIST_DIR}`);
  }
} else {
  console.log('\n📋 Manuelle Installation:');
  console.log('1. Öffne Chrome und navigiere zu: chrome://extensions/');
  console.log('2. Aktiviere "Entwicklermodus" (oben rechts)');
  console.log('3. Klicke auf "Entpackte Erweiterung laden"');
  console.log(`4. Wähle den Ordner: ${DIST_DIR}`);
}

console.log('\n✨ Extension ist bereit!');

