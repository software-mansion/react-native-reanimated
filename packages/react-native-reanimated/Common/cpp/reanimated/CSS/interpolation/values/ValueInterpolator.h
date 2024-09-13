#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

#include <worklets/Tools/JSISerializer.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <type_traits>
#include <vector>

using namespace facebook;

namespace reanimated {

using namespace worklets;

template <typename T>
struct Keyframe {
  double offset;
  T value;
};

using ColorArray = std::array<uint8_t, 4>;

template <typename T, typename U = T>
class ValueInterpolator : public Interpolator {
 public:
  ValueInterpolator() : keyframeAfterIndex_(0) {}

  void initialize(jsi::Runtime &rt, const jsi::Value &keyframeArray);

  jsi::Value update(const InterpolationUpdateContext context) override;

 protected:
  virtual T prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const = 0;

  virtual jsi::Value convertResultToJSI(jsi::Runtime &rt, const U &value)
      const = 0;

  virtual U resolveKeyframeValue(
      const InterpolationUpdateContext context,
      const T &value) const;

  virtual U interpolateBetweenKeyframes(
      double localProgress,
      const U &fromValue,
      const U &toValue,
      const InterpolationUpdateContext context) const = 0;

 private:
  std::shared_ptr<const std::vector<Keyframe<T>>> keyframes_;
  size_t keyframeAfterIndex_;
  Keyframe<T> keyframeBefore_;
  Keyframe<T> keyframeAfter_;
  U previousValue_;

  std::shared_ptr<const std::vector<Keyframe<T>>> createKeyframes(
      jsi::Runtime &rt,
      const jsi::Array &keyframeArray) const;

  Keyframe<T> getKeyframeAtIndex(size_t index) const;

  void updateCurrentKeyframes(const InterpolationUpdateContext context);
};

} // namespace reanimated
