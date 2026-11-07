'use strict';
import type { HostInstance } from 'react-native';

import { logger } from '../../common';
import type { PseudoStylesConfig } from '../types';

export function setPseudoStyles(
  _instance: HostInstance,
  config: PseudoStylesConfig | null
) {
  // A release has nothing to undo on the web, so only a registration warns.
  if (config !== null) {
    logger.warnOnce(
      'setPseudoStyles() is not supported on web, where these states are styled with CSS.',
      1
    );
  }
}
