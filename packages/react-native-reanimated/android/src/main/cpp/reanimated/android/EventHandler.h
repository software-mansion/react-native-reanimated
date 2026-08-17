#pragma once

#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <fbjni/fbjni.h>
#include <react/jni/WritableNativeMap.h>

#include <utility>

namespace reanimated {

using namespace facebook;
using namespace facebook::jni;

class EventHandler : public HybridClass<EventHandler> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeProxy/EventHandler;";

  void receiveEvent(
      jni::alias_ref<JString> eventKey, // NOLINT(performance-unnecessary-value-param)
      jint emitterReactTag,
      jni::alias_ref<react::WritableMap> event, // NOLINT(performance-unnecessary-value-param)
      jboolean isInDrawPass) {
    ReanimatedSystraceSection s("EventHandler::receiveEvent");
    handler_(eventKey, emitterReactTag, event, isInDrawPass);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("receiveEvent", EventHandler::receiveEvent),
    });
  }

 private:
  friend HybridBase;

  explicit EventHandler(std::function<void(
                            jni::alias_ref<JString>,
                            jint emitterReactTag,
                            jni::alias_ref<react::WritableMap>,
                            jboolean isInDrawPass)> handler)
      : handler_(std::move(handler)) {}

  std::function<void(jni::alias_ref<JString>, jint, jni::alias_ref<react::WritableMap>, jboolean)> handler_;
};

} // namespace reanimated
