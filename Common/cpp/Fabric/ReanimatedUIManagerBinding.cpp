#include "ReanimatedUIManagerBinding.h"
#include "FabricUtils.h"
#include "NewestShadowNodesRegistry.h"

using namespace facebook;
using namespace react;

namespace reanimated {

// TODO: remove this function and create new registry during initialization
std::shared_ptr<NewestShadowNodesRegistry> getNewestShadowNodesRegistry() {
  static std::shared_ptr<NewestShadowNodesRegistry> registry =
      std::make_shared<NewestShadowNodesRegistry>();
  return registry;
}

void ReanimatedUIManagerBinding::createAndInstallIfNeeded(
    jsi::Runtime &runtime,
    RuntimeExecutor const &runtimeExecutor,
    std::shared_ptr<UIManager> const &uiManager,
    std::shared_ptr<NewestShadowNodesRegistry> const
        &newestShadowNodesRegistry) {
  // adapted from UIManagerBinding.cpp
  auto uiManagerModuleName = "nativeFabricUIManager";
  auto uiManagerValue =
      runtime.global().getProperty(runtime, uiManagerModuleName);
  auto uiManagerBinding = std::make_shared<ReanimatedUIManagerBinding>(
      uiManager, runtimeExecutor, newestShadowNodesRegistry);
  auto object = jsi::Object::createFromHostObject(runtime, uiManagerBinding);
  runtime.global().setProperty(runtime, uiManagerModuleName, std::move(object));
}

ReanimatedUIManagerBinding::ReanimatedUIManagerBinding(
    std::shared_ptr<UIManager> uiManager,
    RuntimeExecutor runtimeExecutor,
    std::shared_ptr<NewestShadowNodesRegistry> newestShadowNodesRegistry)
    : UIManagerBinding(uiManager, runtimeExecutor),
      uiManager_(std::move(uiManager)),
      newestShadowNodesRegistry_(newestShadowNodesRegistry) {}

ReanimatedUIManagerBinding::~ReanimatedUIManagerBinding() {}

void ReanimatedUIManagerBinding::invalidate() const {
  uiManager_->setDelegate(nullptr);
}

jsi::Value ReanimatedUIManagerBinding::get(
    jsi::Runtime &runtime,
    jsi::PropNameID const &name) {
  // based on implementation from UIManagerBinding.cpp
  auto methodName = name.utf8(runtime);
  UIManager *uiManager = uiManager_.get();
  NewestShadowNodesRegistry *newestShadowNodesRegistry =
      newestShadowNodesRegistry_.get();

  // Semantic: Clones the node with *same* props and *same* children.
  if (methodName == "cloneNode") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        1,
        [uiManager, newestShadowNodesRegistry](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          auto lock = newestShadowNodesRegistry->createLock();
          return valueFromShadowNode(
              runtime,
              newestShadowNodesRegistry->set(UIManager_cloneNode(
                  uiManager,
                  newestShadowNodesRegistry->get(
                      shadowNodeFromValue(runtime, arguments[0])))));
        });
  }

  // Semantic: Clones the node with *same* props and *empty* children.
  if (methodName == "cloneNodeWithNewChildren") {
    return jsi::Function::createFromHostFunction(
        runtime,
        name,
        1,
        [uiManager, newestShadowNodesRegistry](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          auto lock = newestShadowNodesRegistry->createLock();
          return valueFromShadowNode(
              runtime,
              newestShadowNodesRegistry->set(UIManager_cloneNode(
                  uiManager,
                  newestShadowNodesRegistry->get(
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
        [uiManager, newestShadowNodesRegistry](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          auto const &rawProps = RawProps(runtime, arguments[1]);
          auto lock = newestShadowNodesRegistry->createLock();
          return valueFromShadowNode(
              runtime,
              newestShadowNodesRegistry->set(UIManager_cloneNode(
                  uiManager,
                  newestShadowNodesRegistry->get(
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
        [uiManager, newestShadowNodesRegistry](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          auto const &rawProps = RawProps(runtime, arguments[1]);
          auto lock = newestShadowNodesRegistry->createLock();
          return valueFromShadowNode(
              runtime,
              newestShadowNodesRegistry->set(UIManager_cloneNode(
                  uiManager,
                  newestShadowNodesRegistry->get(
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
        [newestShadowNodesRegistry](
            jsi::Runtime &runtime,
            jsi::Value const &thisValue,
            jsi::Value const *arguments,
            size_t count) noexcept -> jsi::Value {
          auto lock = newestShadowNodesRegistry->createLock();
          UIManager_appendChild(
              shadowNodeFromValue(runtime, arguments[0]),
              newestShadowNodesRegistry->get(
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
