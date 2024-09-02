#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

#include <worklets/Tools/JSISerializer.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

using namespace facebook;

namespace reanimated {

using namespace worklets;

template <typename T>
struct Keyframe {
  double offset;
  T value;
};

template <typename T>
class ValueInterpolator : public Interpolator {
 public:
  ValueInterpolator() : keyframeAfterIndex_(0) {}

  void initialize(jsi::Runtime &rt, const jsi::Value &keyframeArray);

  jsi::Value update(const InterpolationUpdateContext context) override;

 protected:
  virtual T convertValue(jsi::Runtime &rt, const jsi::Value &value) const = 0;
  virtual jsi::Value convertToJSIValue(jsi::Runtime &rt, const T &value)
      const = 0;

  virtual T interpolate(
      double localProgress,
      const T &fromValue,
      const T &toValue,
      const InterpolationUpdateContext context) const = 0;

 private:
  std::shared_ptr<const std::vector<Keyframe<T>>> keyframes_;
  size_t keyframeAfterIndex_;
  Keyframe<T> keyframeBefore_;
  Keyframe<T> keyframeAfter_;
  T previousValue_;

  std::shared_ptr<const std::vector<Keyframe<T>>> createKeyframes(
      jsi::Runtime &rt,
      const jsi::Array &keyframeArray) const;

  void updateCurrentKeyframes(const InterpolationUpdateContext context);
};

} // namespace reanimated
