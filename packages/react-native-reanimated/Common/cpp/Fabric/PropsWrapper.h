#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/uimanager/UIManager.h>
#include <memory>
#include <utility>

using namespace facebook;
using namespace react;

namespace reanimated {

class PropsWrapper {
 public:
  virtual inline RawProps getRawProps() = 0;
  virtual ~PropsWrapper() = default;
};

class JsiValuePropsWrapper : public PropsWrapper {
  jsi::Runtime &runtime;
  std::unique_ptr<jsi::Value> value;

 public:
  JsiValuePropsWrapper(
      jsi::Runtime &runtime,
      std::unique_ptr<jsi::Value> &&value)
      : runtime(runtime), value(std::move(value)) {}
  inline RawProps getRawProps() override {
    return RawProps(runtime, *value);
  }
};

struct FollyDynamicPropsWrapper : public PropsWrapper {
  const folly::dynamic &value;

 public:
  explicit FollyDynamicPropsWrapper(const folly::dynamic &value) : value(value) {}
  inline RawProps getRawProps() override {
    return RawProps(value);
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
