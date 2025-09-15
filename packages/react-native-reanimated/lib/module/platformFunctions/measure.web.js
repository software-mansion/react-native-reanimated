'use strict';

import { logger } from '../common';
export function measure(animatedRef) {
  const element = animatedRef();
  if (!element) {
    logger.warn(`The view with tag ${element} is not a valid argument for measure(). This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`);
    return null;
  }
  const viewportOffset = element.getBoundingClientRect();
  return {
    width: element.offsetWidth,
    height: element.offsetHeight,
    x: element.offsetLeft,
    y: element.offsetTop,
    pageX: viewportOffset.left,
    pageY: viewportOffset.top
  };
}
//# sourceMappingURL=measure.web.js.map