'use strict';

export function scrollTo(animatedRef, x, y, animated) {
  const element = animatedRef();

  // This prevents crashes if ref has not been set yet
  if (element !== -1) {
    // By ScrollView we mean any scrollable component
    const scrollView = element;
    scrollView?.scrollTo({
      x,
      y,
      animated
    });
  }
}
//# sourceMappingURL=scrollTo.web.js.map