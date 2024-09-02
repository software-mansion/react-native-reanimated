#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

#include <jsi/jsi.h>
#include <memory>
#include <vector>

using namespace facebook;

namespace reanimated {

template <typename T>
struct Keyframe {
  double offset;
  T value;
};

template <typename T>
class ValueInterpolator : public Interpolator {
 public:
  ValueInterpolator() : fromKeyframeIndex_(0) {}

  void initialize(jsi::Runtime &rt, const jsi::Value &keyframeArray);

  jsi::Value update(jsi::Runtime &rt, double progress) override;

 protected:
  virtual T convertValue(jsi::Runtime &rt, const jsi::Value &value) const = 0;

  virtual T interpolate(
      double localProgress,
      const T &fromValue,
      const T &toValue) const = 0;

  std::pair<Keyframe<T>, Keyframe<T>> getKeyframePair(double progress) const;

  double calculateLocalProgress(double progress) const;

 private:
  std::shared_ptr<const std::vector<Keyframe<T>>> keyframes_;
  int fromKeyframeIndex_;

  std::shared_ptr<const std::vector<Keyframe<T>>> createKeyframes(
      jsi::Runtime &rt,
      const jsi::Array &keyframeArray) const;

  void updateFromKeyframeIndex(double progress);

  jsi::Value convertToJSIValue(jsi::Runtime &rt, const T &value) const;
};

} // namespace reanimated
