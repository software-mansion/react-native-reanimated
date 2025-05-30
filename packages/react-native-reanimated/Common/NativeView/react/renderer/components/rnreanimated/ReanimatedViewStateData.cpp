#include <react/renderer/components/rnreanimated/ReanimatedViewStateData.h>

namespace facebook::react {

ReanimatedViewStateData::ReanimatedViewStateData() {
  // We throw an error here, because we cannot create ReanimatedViewStateData
  // without proxy. React Native requires this constructor to be present.
  throw std::runtime_error(
      "[Reanimated] Cannot create ReanimatedViewStateData without proxy");
}

ReanimatedViewStateData::ReanimatedViewStateData(
    const std::shared_ptr<ReanimatedModuleProxy> &proxy) {
  initialize(proxy);
}

void ReanimatedViewStateData::initialize(
    const std::shared_ptr<ReanimatedModuleProxy> &proxy) {
  const auto operationsLoop = proxy->getOperationsLoop();
  const auto cssAnimationKeyframesRegistry =
      proxy->getCssAnimationKeyframesRegistry();
  const auto viewStylesRepository = proxy->getViewStylesRepository();

  cssTransitionManager = std::make_shared<CSSTransitionManager>(viewStylesRepository);
  cssAnimationsManager = std::make_shared<CSSAnimationsManager>(
      operationsLoop, cssAnimationKeyframesRegistry, viewStylesRepository);
}

} // namespace facebook::react
