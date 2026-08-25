#include <react/renderer/uimanager/UIManager.h>
#include <react/renderer/uimanager/UIManagerDelegate.h>

namespace facebook::react {

UIManager::UIManager(const RuntimeExecutor &runtimeExecutor, std::shared_ptr<const ContextContainer> contextContainer)
    : runtimeExecutor_(runtimeExecutor), contextContainer_(std::move(contextContainer)) {}

UIManager::~UIManager() = default;

void UIManager::setComponentDescriptorRegistry(const SharedComponentDescriptorRegistry &componentDescriptorRegistry) {
  componentDescriptorRegistry_ = componentDescriptorRegistry;
}

void UIManager::setDelegate(UIManagerDelegate *delegate) {
  delegate_ = delegate;
}

UIManagerDelegate *UIManager::getDelegate() {
  return delegate_;
}

void UIManager::startEmptySurface(ShadowTree::Unique &&shadowTree) const noexcept {
  shadowTreeRegistry_.add(std::move(shadowTree));
}

const ShadowTreeRegistry &UIManager::getShadowTreeRegistry() const {
  return shadowTreeRegistry_;
}

RootShadowNode::Unshared UIManager::shadowTreeWillCommit(
    const ShadowTree &,
    const RootShadowNode::Shared &,
    const RootShadowNode::Unshared &newRootShadowNode,
    const ShadowTree::CommitOptions &) const {
  return newRootShadowNode;
}

void UIManager::shadowTreeDidFinishTransaction(
    std::shared_ptr<const MountingCoordinator> mountingCoordinator,
    bool mountSynchronously) const {
  if (delegate_) {
    delegate_->uiManagerDidFinishTransaction(std::move(mountingCoordinator), mountSynchronously);
  }
}

void UIManager::shadowTreeDidFinishReactCommit(const ShadowTree &shadowTree) const {
  if (delegate_) {
    delegate_->uiManagerDidFinishReactCommit(shadowTree);
  }
}

void UIManager::shadowTreeDidPromoteReactRevision(const ShadowTree &shadowTree) const {
  if (delegate_) {
    delegate_->uiManagerDidPromoteReactRevision(shadowTree);
  }
}

} // namespace facebook::react
