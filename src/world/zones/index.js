// All travel destinations, in the order they appear in the travel menu.

import { SUNNY_ISLE } from './sunnyIsle.js';
import { PINE_LAKE } from './pineLake.js';

export const ZONES = [SUNNY_ISLE, PINE_LAKE];
export const ZONES_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));
