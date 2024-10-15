#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

namespace reanimated {

struct TransformKeyframe {
  double offset;
  std::optional<std::vector<TransformOperation>> fromOperations;
  std::optional<std::vector<TransformOperation>> toOperations;
};

class TransformInterpolator {
 public:
  TransformInterpolator(const PropertyPath &propertyPath)
      : propertyPath_(propertyPath) {}

 protected:
  const PropertyPath propertyPath_;
};

class TransformInterpolatorFactory {
 public:
  virtual std::shared_ptr<TransformInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const = 0;
};

using TransformsInterpolatorFactories = std::
    unordered_map<std::string, std::shared_ptr<TransformInterpolatorFactory>>;

} // namespace reanimated
