import { Logger } from '../shared/utils/logger';

// Statische Imports statt dynamische (wegen CSP)
import '../modules/freelancermap/content-script';
import '../modules/kleinanzeigen/content-script';
import '../modules/linkedin/content-script';

/**
 * Content Script Router
 * Module werden beide geladen, aber nur das passende wird initialisiert
 */
Logger.info('[ContentRouter] Modules loaded statically');

