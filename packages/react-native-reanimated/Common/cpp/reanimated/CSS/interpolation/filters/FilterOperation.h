#pragma once

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/interpolation/operations/StyleOperation.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

using namespace facebook;

// Base struct for FilterOperations
struct FilterOperation : public StyleOperation {
  using StyleOperation::StyleOperation;

  virtual bool operator==(const FilterOperation &other) const = 0;

  std::string getOperationName() const override;
  virtual folly::dynamic valueToDynamic() const override = 0;

  static std::shared_ptr<FilterOperation> fromJSIValue(jsi::Runtime &rt, const jsi::Value &value);
  static std::shared_ptr<FilterOperation> fromDynamic(const folly::dynamic &value);
};

using FilterOperations = std::vector<std::shared_ptr<FilterOperation>>;

// Base implementation for filter operations
template <FilterOp TOperation, CSSValueDerived TValue>
struct FilterOperationBase : public FilterOperation {
  const TValue value;

  explicit FilterOperationBase(TValue value);
  bool operator==(const FilterOperation &other) const override;
  folly::dynamic valueToDynamic() const override;
};

} // namespace reanimated::css
