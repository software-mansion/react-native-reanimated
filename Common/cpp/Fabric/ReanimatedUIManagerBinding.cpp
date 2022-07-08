#ifdef RCT_NEW_ARCH_ENABLED

#include "ReanimatedUIManagerBinding.h"
#include "FabricUtils.h"
#include "PropsRegistry.h"

using namespace facebook;
using namespace react;

namespace reanimated {

void ReanimatedUIManagerBinding::createAndInstallIfNeeded(
    jsi::Runtime &runtime,
    RuntimeExecutor const &runtimeExecutor,
    std::shared_ptr<UIManager> const &uiManager,
    std::shared_ptr<PropsRegistry> const &propsRegistry) {
  // adapted from UIManagerBinding.cpp
  auto uiManagerModuleName = "nativeFabricUIManager";
  auto uiManagerBinding = std::make_shared<ReanimatedUIManagerBinding>(
      uiManager, runtimeExecutor, propsRegistry);
  auto object = jsi::Object::createFromHostObject(runtime, uiManagerBinding);
  runtime.global().setProperty(runtime, uiManagerModuleName, std::move(object));
}

ReanimatedUIManagerBinding::ReanimatedUIManagerBinding(
    std::shared_ptr<UIManager> uiManager,
    RuntimeExecutor runtimeExecutor,
    std::shared_ptr<PropsRegistry> propsRegistry)
    : UIManagerBinding(uiManager, runtimeExecutor),
      uiManager_(std::move(uiManager)),
      propsRegistry_(propsRegistry) {}

ReanimatedUIManagerBinding::~ReanimatedUIManagerBinding() {}

void ReanimatedUIManagerBinding::invalidate() const {
  uiManager_->setDelegate(nullptr);
}

static inline ShadowNode::Shared cloneNode(
    UIManager *uiManager,
    PropsRegistry *propsRegistry,
    const ShadowNode::Shared &shadowNode,
    const SharedShadowNodeSharedList &children = nullptr,
    const RawProps *rawProps = nullptr) {
  auto tag = shadowNode->getTag();

  ShadowNode::Shared source = shadowNode;
  bool found = false;
  folly::dynamic dynProps;

  {
    auto lock = propsRegistry->createLock();

    if (propsRegistry->has(tag)) {
      found = true;
      dynProps = propsRegistry->get(tag);
      propsRegistry->remove(tag);
    }
  } // release lock since we don't need registry anymore

  RawProps rawProps2{dynProps};
  if (found) {
    source = UIManager_cloneNode(
        uiManager,
        source,
        ShadowNodeFragment::childrenPlaceholder(),
        &rawProps2);
  }

  return UIManager_cloneNode(uiManager, source, children, rawProps);
}

jsi::Value ReanimatedUIManagerBinding::get(
    jsi::Runtime &runtime,
    jsi::PropNameID const &name) {
  // Currently, we need to overwrite all variants of `cloneNode` as well as
  // `appendChild` to prevent React from overwriting layout props animated using
  // Reanimated. However, this may degrade performance due to using locks.
  // We already have an idea how this can be done better without locks
  // (i.e. by overwriting `completeRoot` and using UIManagerCommitHooks).

  // based on implementation from UIManagerBinding.cpp
  auto methodName = name.utf8(runtime);
  UIManager *uiManager = uiManager_.get();
  PropsRegistry *propsRegistry = propsRegistry_.get();

  // Semantic: Clones the node with *same* props and *same* children.
  if (methodName == "cloneNode") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        1,
        [uiManager, propsRegistry](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          return valueFromShadowNode(
              runtime,
              cloneNode(
                  uiManager,
                  propsRegistry,
                  shadowNodeFromValue(runtime, arguments[0])));
        });
  }

  // Semantic: Clones the node with *same* props and *empty* children.
  if (methodName == "cloneNodeWithNewChildren") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        1,
        [uiManager, propsRegistry](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          return valueFromShadowNode(
              runtime,
              cloneNode(
                  uiManager,
                  propsRegistry,
                  shadowNodeFromValue(runtime, arguments[0]),
                  ShadowNode::emptySharedShadowNodeSharedList()));
        });
  }

  // Semantic: Clones the node with *given* props and *same* children.
  if (methodName == "cloneNodeWithNewProps") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        2,
        [uiManager, propsRegistry](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          auto const &rawProps = RawProps(runtime, arguments[1]);
          return valueFromShadowNode(
              runtime,
              cloneNode(
                  uiManager,
                  propsRegistry,
                  shadowNodeFromValue(runtime, arguments[0]),
                  nullptr,
                  &rawProps));
        });
  }

  // Semantic: Clones the node with *given* props and *empty* children.
  if (methodName == "cloneNodeWithNewChildrenAndProps") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        2,
        [uiManager, propsRegistry](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          auto const &rawProps = RawProps(runtime, arguments[1]);
          return valueFromShadowNode(
              runtime,
              cloneNode(
                  uiManager,
                  propsRegistry,
                  shadowNodeFromValue(runtime, arguments[0]),
                  ShadowNode::emptySharedShadowNodeSharedList(),
                  &rawProps));
        });
  }

  //  if (methodName == "appendChild") {
  //    return jsi::Function::createFromHostFunction(
  //        runtime,
  //        name,
  //        2,
  //        [propsRegistry](
  //            jsi::Runtime &runtime,
  //            jsi::Value const &thisValue,
  //            jsi::Value const *arguments,
  //            size_t count) noexcept -> jsi::Value {
  //          auto parent = shadowNodeFromValue(runtime, arguments[0]);
  //          auto child = shadowNodeFromValue(runtime, arguments[1]);
  //          {
  //            auto lock = propsRegistry->createLock();
  //            auto newest = propsRegistry->get(child->getTag());
  //            if (newest != nullptr) {
  //              child = newest;
  //            }
  //          }
  //          UIManager_appendChild(parent, child);
  //          return jsi::Value::undefined();
  //        });
  //  }

  // Methods like "findNodeAtPoint", "getRelativeLayoutMetrics", "measure" etc.
  // use `UIManager::getNewestCloneOfShadowNode` or
  // `ShadowTree::getCurrentRevision` under the hood,
  // so there's no need to overwrite them.

  return UIManagerBinding::get(runtime, name);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
