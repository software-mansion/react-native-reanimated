#include <react/renderer/components/rnreanimated/ReanimatedViewStateData.h>

namespace facebook::react {

bool ReanimatedViewStateData::isInitialized() const {
  return initialized_;
}

void ReanimatedViewStateData::initialize(
    const std::shared_ptr<ReanimatedModuleProxy> &proxy) {
  if (!proxy) {
    return;
  }

  const auto operationsLoop = proxy->getOperationsLoop();
  const auto cssAnimationKeyframesRegistry =
      proxy->getCssAnimationKeyframesRegistry();
  const auto viewStylesRepository = proxy->getViewStylesRepository();

  cssTransitionManager = std::make_shared<CSSTransitionManager>(
      operationsLoop, viewStylesRepository);
  cssAnimationsManager = std::make_shared<CSSAnimationsManager>(
      operationsLoop, cssAnimationKeyframesRegistry, viewStylesRepository);
}

} // namespace facebook::react
