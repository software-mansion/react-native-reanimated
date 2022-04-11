#include "ReanimatedUIManagerBinding.h"
#include "FabricUtils.h"

using namespace facebook;
using namespace react;

namespace reanimated {

void ReanimatedUIManagerBinding::createAndInstallIfNeeded(
    jsi::Runtime &runtime,
    RuntimeExecutor const &runtimeExecutor,
    std::shared_ptr<UIManager> const &uiManager) {
  // adapted from UIManagerBinding.cpp
  auto uiManagerModuleName = "nativeFabricUIManager";
  auto uiManagerValue =
      runtime.global().getProperty(runtime, uiManagerModuleName);
  auto uiManagerBinding =
      std::make_shared<ReanimatedUIManagerBinding>(uiManager, runtimeExecutor);
  auto object = jsi::Object::createFromHostObject(runtime, uiManagerBinding);
  runtime.global().setProperty(runtime, uiManagerModuleName, std::move(object));
}

ReanimatedUIManagerBinding::ReanimatedUIManagerBinding(
    std::shared_ptr<UIManager> uiManager,
    RuntimeExecutor runtimeExecutor)
    : UIManagerBinding(uiManager, runtimeExecutor),
      uiManager_(std::move(uiManager)) {}

ReanimatedUIManagerBinding::~ReanimatedUIManagerBinding() {}

void ReanimatedUIManagerBinding::invalidate() const {
  uiManager_->setDelegate(nullptr);
}

std::map<Tag, ShadowNode::Shared> newestClonesFromReanimated;
// TODO: move to NativeReanimatedModule
// TODO: synchronize access

ShadowNode::Shared setNewestCloneOfShadowNodeFromReanimated(
    ShadowNode::Shared shadowNode) {
  newestClonesFromReanimated[shadowNode->getTag()] = shadowNode;
  return shadowNode; // for convenience
}

void deleteNewestCloneOfShadowNodeFromReanimated(
    ShadowNode::Shared shadowNode) {
  newestClonesFromReanimated.erase(shadowNode->getTag());
}

ShadowNode::Shared getNewestCloneOfShadowNodeFromReanimated(
    ShadowNode::Shared shadowNode) {
  const auto it = newestClonesFromReanimated.find(shadowNode->getTag());
  return it == newestClonesFromReanimated.cend() ? shadowNode : it->second;
}

jsi::Value ReanimatedUIManagerBinding::get(
    jsi::Runtime &runtime,
    jsi::PropNameID const &name) {
  // based on implementation from UIManagerBinding.cpp
  auto methodName = name.utf8(runtime);
  UIManager *uiManager = uiManager_.get();

  // Semantic: Clones the node with *same* props and *same* children.
  if (methodName == "cloneNode") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        1,
        [uiManager](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          return valueFromShadowNode(
              runtime,
              setNewestCloneOfShadowNodeFromReanimated(UIManager_cloneNode(
                  uiManager,
                  getNewestCloneOfShadowNodeFromReanimated(
                      shadowNodeFromValue(runtime, arguments[0])))));
        });
  }

  // Semantic: Clones the node with *same* props and *empty* children.
  if (methodName == "cloneNodeWithNewChildren") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        1,
        [uiManager](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          return valueFromShadowNode(
              runtime,
              setNewestCloneOfShadowNodeFromReanimated(UIManager_cloneNode(
                  uiManager,
                  getNewestCloneOfShadowNodeFromReanimated(
                      shadowNodeFromValue(runtime, arguments[0])),
                  ShadowNode::emptySharedShadowNodeSharedList())));
        });
  }

  // Semantic: Clones the node with *given* props and *same* children.
  if (methodName == "cloneNodeWithNewProps") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        2,
        [uiManager](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          auto const &rawProps = RawProps(runtime, arguments[1]);
          return valueFromShadowNode(
              runtime,
              setNewestCloneOfShadowNodeFromReanimated(UIManager_cloneNode(
                  uiManager,
                  getNewestCloneOfShadowNodeFromReanimated(
                      shadowNodeFromValue(runtime, arguments[0])),
                  nullptr,
                  &rawProps)));
        });
  }

  // Semantic: Clones the node with *given* props and *empty* children.
  if (methodName == "cloneNodeWithNewChildrenAndProps") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        2,
        [uiManager](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          auto const &rawProps = RawProps(runtime, arguments[1]);
          return valueFromShadowNode(
              runtime,
              setNewestCloneOfShadowNodeFromReanimated(UIManager_cloneNode(
                  uiManager,
                  getNewestCloneOfShadowNodeFromReanimated(
                      shadowNodeFromValue(runtime, arguments[0])),
                  ShadowNode::emptySharedShadowNodeSharedList(),
                  &rawProps)));
        });
  }

  if (methodName == "appendChild") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        2,
        [](jsi::Runtime &runtime,
           jsi::Value const &thisValue,
           jsi::Value const *arguments,
           size_t count) noexcept -> jsi::Value {
          UIManager_appendChild(
              shadowNodeFromValue(runtime, arguments[0]),
              getNewestCloneOfShadowNodeFromReanimated(
                  shadowNodeFromValue(runtime, arguments[1])));
          return jsi::Value::undefined();
        });
  }

  // Methods like "findNodeAtPoint", "getRelativeLayoutMetrics", "measure" etc.
  // use `UIManager::getNewestCloneOfShadowNode` or
  // `ShadowTree::getCurrentRevision` under the hood,
  // so there's no need to overwrite them.

  return UIManagerBinding::get(runtime, name);
}

} // namespace reanimated
