#pragma once

#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>
#include <reanimated/CSS/utils/interpolators.h>

#include <memory>
#include <string>

namespace reanimated::css {

class RecordPropertiesInterpolator : public GroupPropertiesInterpolator {
 public:
  RecordPropertiesInterpolator(
      const InterpolatorFactoriesRecord &factories,
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~RecordPropertiesInterpolator() = default;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  bool updateKeyframes(jsi::Runtime &rt, const jsi::Value &fromValue, const jsi::Value &toValue) override;
  /** TODO: unify folly::dynamic and jsi::value versions */
  bool updateKeyframes(const folly::dynamic &fromValue, const folly::dynamic &toValue) override;

 protected:
  PropertyInterpolatorsRecord interpolators_;

  folly::dynamic mapInterpolators(const std::function<folly::dynamic(PropertyInterpolator &)> &callback) const override;

  void maybeCreateInterpolator(const std::string &propertyName);

 private:
  const InterpolatorFactoriesRecord &factories_;
};

} // namespace reanimated::css
