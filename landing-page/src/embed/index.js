/**
 * @hertzai/hart-embed — entry.
 *
 * Loading this script (UMD global `HartEmbed`, or the ES module) registers
 * the <hart-agent> custom element.  See HartAgentElement.js for the host
 * contract and public/embed-host-demo.html for a working host page.
 */

import {normalizeFragment, routeFragment} from './a2uiAdapter';
import {HartAgentElement, SURFACES, defineHartAgent} from './HartAgentElement';
import {ACTION_KINDS, HOST_EVENTS, createHostBridge} from './hostBridge';

import {
  FLOATING_TYPES, INLINE_TYPES, NAVIGATE_TYPES, fragmentMode, getComponentSummary,
} from '../constants/liquidFragments';

export const VERSION = '1.0.0';

defineHartAgent();

export {
  ACTION_KINDS,
  FLOATING_TYPES,
  HOST_EVENTS,
  HartAgentElement,
  INLINE_TYPES,
  NAVIGATE_TYPES,
  SURFACES,
  createHostBridge,
  defineHartAgent,
  fragmentMode,
  getComponentSummary,
  normalizeFragment,
  routeFragment,
};
