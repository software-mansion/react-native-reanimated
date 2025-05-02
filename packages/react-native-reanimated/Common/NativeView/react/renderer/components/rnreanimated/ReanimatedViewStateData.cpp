#include <react/renderer/components/rnreanimated/ReanimatedViewStateData.h>

namespace facebook::react {

void ReanimatedViewStateData::initialize(
    const std::shared_ptr<OperationsLoop> &operationsLoop,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  cssTransitionManager = std::make_unique<CSSTransitionManager>(
      operationsLoop, viewStylesRepository);
}

} // namespace facebook::react
