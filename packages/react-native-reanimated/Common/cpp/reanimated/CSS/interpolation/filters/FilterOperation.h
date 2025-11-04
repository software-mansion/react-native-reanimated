#pragma once

#include <reanimated/CSS/common/transforms/TransformMatrix.h>
#include <reanimated/CSS/common/filters/FilterOp.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

using namespace facebook;

// Base struct for FilterOperations
struct FilterOperation {
  const FilterOp type;

  explicit FilterOperation(FilterOp value);
  virtual ~FilterOperation() = default;

  virtual bool operator==(const FilterOperation &other) const = 0;

  std::string getOperationName() const;
  virtual bool shouldResolve() const;

  static std::shared_ptr<FilterOperation> fromJSIValue(jsi::Runtime &rt, const jsi::Value &value);
  static std::shared_ptr<FilterOperation> fromDynamic(const folly::dynamic &value);
  folly::dynamic toDynamic() const;
  virtual folly::dynamic valueToDynamic() const = 0;

  virtual bool canConvertTo(FilterOp type) const;
  virtual std::vector<std::shared_ptr<FilterOperation>> convertTo(FilterOp type) const;
  void assertCanConvertTo(FilterOp type) const;

};

using FilterOperations = std::vector<std::shared_ptr<FilterOperation>>;

// Base implementation for filter operations
template <FilterOp TOperation, typename TValue>
struct FilterOperationBase : public FilterOperation {
  const TValue value;

  explicit FilterOperationBase(TValue value);
  bool operator==(const FilterOperation &other) const override;

};

} // namespace reanimated::css
