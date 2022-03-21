#pragma once

#include <react/renderer/uimanager/UIManager.h>

#include <unistd.h>
#include <memory>
#include <string>
#include <vector>

#include "ErrorHandler.h"
#include "LayoutAnimationsProxy.h"
#include "NativeReanimatedModuleSpec.h"
#include "PlatformDepMethodsHolder.h"
#include "RuntimeDecorator.h"
#include "RuntimeManager.h"
#include "Scheduler.h"

namespace reanimated {

using FrameCallback = std::function<void(double)>;

class ShareableValue;
class MutableValue;
class MapperRegistry;
class EventHandlerRegistry;

class NativeReanimatedModule : public NativeReanimatedModuleSpec,
                               public RuntimeManager {
  friend ShareableValue;
  friend MutableValue;

 public:
  NativeReanimatedModule(
      std::shared_ptr<CallInvoker> jsInvoker,
      std::shared_ptr<Scheduler> scheduler,
      std::shared_ptr<jsi::Runtime> rt,
      std::shared_ptr<ErrorHandler> errorHandler,
      std::function<jsi::Value(jsi::Runtime &, const int, const jsi::String &)>
          propObtainer,
      std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy,
      PlatformDepMethodsHolder platformDepMethodsHolder);

  void installCoreFunctions(jsi::Runtime &rt, const jsi::Value &valueSetter)
      override;

  jsi::Value makeShareable(jsi::Runtime &rt, const jsi::Value &value) override;
  jsi::Value makeMutable(jsi::Runtime &rt, const jsi::Value &value) override;
  jsi::Value makeRemote(jsi::Runtime &rt, const jsi::Value &value) override;

  jsi::Value startMapper(
      jsi::Runtime &rt,
      const jsi::Value &worklet,
      const jsi::Value &inputs,
      const jsi::Value &outputs,
      const jsi::Value &updater,
      const jsi::Value &viewDescriptors) override;
  void stopMapper(jsi::Runtime &rt, const jsi::Value &mapperId) override;

  jsi::Value registerEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &eventHash,
      const jsi::Value &worklet) override;
  void unregisterEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &registrationId) override;

  jsi::Value getViewProp(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &propName,
      const jsi::Value &callback) override;

  jsi::Value enableLayoutAnimations(jsi::Runtime &rt, const jsi::Value &config)
      override;

  jsi::Value initializeForFabric(jsi::Runtime &rt) override;

  void onRender(double timestampMs);
  void onEvent(std::string eventName, jsi::Value &&eventAsString);
  bool isAnyHandlerWaitingForEvent(std::string eventName);

  void maybeRequestRender();

  void updateProps(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeValue,
      const jsi::Value &props);
  void performOperations();

  std::shared_ptr<UIManager> getUIManager() const {
    react_native_assert(
        uiManager_ !=
        nullptr); // make sure you have called initializeForFabric() before
    return uiManager_;
  }

 private:
  std::shared_ptr<MapperRegistry> mapperRegistry;
  std::shared_ptr<EventHandlerRegistry> eventHandlerRegistry;
  std::function<void(FrameCallback &, jsi::Runtime &)> requestRender;
  std::shared_ptr<jsi::Value> dummyEvent;
  std::vector<FrameCallback> frameCallbacks;
  bool renderRequested = false;
  std::function<jsi::Value(jsi::Runtime &, const int, const jsi::String &)>
      propObtainer;
  std::function<void(double)> onRenderCallback;
  SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction;
  std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy;
  std::shared_ptr<UIManager> uiManager_;
  std::vector<std::pair<ShadowNode::Shared, std::unique_ptr<RawProps>>>
      operationsInBatch_; // TODO: refactor std::pair to custom struct

  std::unordered_set<std::string> nativePropNames_ = {
      "backgroundColor",
      "borderRightColor",
      "borderBottomColor",
      "borderColor",
      "borderEndColor",
      "borderLeftColor",
      "borderStartColor",
      "borderTopColor",
      "borderBottomWidth",
      "borderEndWidth",
      "borderLeftWidth",
      "borderRightWidth",
      "borderStartWidth",
      "borderTopWidth",
      "borderWidth",
      "bottom",
      "flex",
      "flexGrow",
      "flexShrink",
      "height",
      "left",
      "margin",
      "marginBottom",
      "marginEnd",
      "marginHorizontal",
      "marginLeft",
      "marginRight",
      "marginStart",
      "marginTop",
      "marginVertical",
      "maxHeight",
      "maxWidth",
      "minHeight",
      "minWidth",
      "padding",
      "paddingBottom",
      "paddingEnd",
      "paddingHorizontal",
      "paddingLeft",
      "paddingRight",
      "paddingStart",
      "paddingTop",
      "paddingVertical",
      "right",
      "start",
      "top",
      "width",
      "zIndex",
      "borderBottomEndRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius",
      "borderBottomStartRadius",
      "borderRadius",
      "borderTopEndRadius",
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderTopStartRadius",
      "opacity",
      "elevation",
      "fontSize",
      "lineHeight",
      "textShadowRadius",
      "letterSpacing",
      "display",
      "backfaceVisibility",
      "overflow",
      "resizeMode",
      "fontStyle",
      "fontWeight",
      "textAlign",
      "textDecorationLine",
      "fontFamily",
      "textAlignVertical",
      "fontVariant",
      "textDecorationStyle",
      "textTransform",
      "writingDirection",
      "color",
      "tintColor",
      "shadowColor",
      "placeholderTextColor",
      "text"}; // TODO: refactor configureProps
};

} // namespace reanimated
