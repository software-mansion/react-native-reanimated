'use strict';
import type { IJSPropsUpdater } from './commonTypes';
import { JSPropsUpdaterWeb } from './JSPropsUpdaterBase';

const jsPropsUpdater: IJSPropsUpdater = new JSPropsUpdaterWeb();

export default jsPropsUpdater;
