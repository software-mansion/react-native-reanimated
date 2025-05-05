#include <react/renderer/components/rnreanimated/managers/CSSAnimationsManager.h>

namespace facebook::react {

CSSAnimationsManager::CSSAnimationsManager(
    std::shared_ptr<OperationsLoop> operationsLoop,
    std::shared_ptr<ViewStylesRepository> viewStylesRepository)
    : operationsLoop_(std::move(operationsLoop)),
      viewStylesRepository_(std::move(viewStylesRepository)) {}

CSSAnimationsManager::~CSSAnimationsManager() {
  // TODO - cleanup
}

folly::dynamic CSSAnimationsManager::getCurrentFrameProps(
    const ShadowNode::Shared &shadowNode) {
  // TODO - implement
  return folly::dynamic::object();
}

void CSSAnimationsManager::update(
    const ReanimatedViewProps &oldProps,
    const ReanimatedViewProps &newProps) {
  // TODO - implement
  if (oldProps.cssAnimations != newProps.cssAnimations) {
    LOG(INFO) << "CSSAnimationsManager::update: " << oldProps.cssAnimations
              << " " << newProps.cssAnimations;
  }
}

} // namespace facebook::react
