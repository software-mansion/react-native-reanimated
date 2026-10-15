'use strict';
import type { HostInstance } from 'react-native';

import { logger } from '../../common';
import type { PseudoStylesConfig } from '../types';

export function setPseudoStyles(
  _instance: HostInstance,
  _config: PseudoStylesConfig | null
) {
  logger.warn(
    'setPseudoStyles() is not supported on web, where these states are styled with CSS.'
  );
}
