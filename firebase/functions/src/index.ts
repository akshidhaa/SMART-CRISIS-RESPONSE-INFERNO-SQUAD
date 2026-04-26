// firebase-functions-scr-mesh — Cloud Functions entry point
//
// Triggers live in sibling files; this module just re-exports them so the
// Functions runtime discovers them via `main: dist/index.js`.

import * as admin from 'firebase-admin';

admin.initializeApp();

export { onUserCreate } from './auth/onUserCreate.js';
export { setUserRole } from './auth/setUserRole.js';
export { helloWorld } from './debug/helloWorld.js';
export { onIncidentCreate } from './incidents/onIncidentCreate.js';
export { escalateStaleIncidents } from './incidents/escalateStaleIncidents.js';
export { dispatchAlerts } from './alerts/dispatchAlerts.js';
export { onCriticalIncident } from './mesh/onCriticalIncident.js';
export { simulateMeshRelay } from './mesh/simulateMeshRelay.js';
