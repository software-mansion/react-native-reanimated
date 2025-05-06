#include <react/renderer/components/rnreanimated/ReanimatedViewStateData.h>

namespace facebook::react {

void ReanimatedViewStateData::initialize(
    const std::shared_ptr<OperationsLoop> &operationsLoop,
    const std::shared_ptr<CSSKeyframesRegistry> &cssAnimationKeyframesRegistry,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  cssTransitionManager = std::make_shared<CSSTransitionManager>(
      operationsLoop, viewStylesRepository);
  cssAnimationsManager = std::make_shared<CSSAnimationsManager>(
      operationsLoop, cssAnimationKeyframesRegistry, viewStylesRepository);
}

} // namespace facebook::react
