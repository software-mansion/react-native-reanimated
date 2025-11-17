#pragma once

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/common/values/complex/CSSDropShadow.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <utility>
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

// FilterOperationBase implementation
template <FilterOp TOperation, CSSValueDerived TValue>
FilterOperationBase<TOperation, TValue>::FilterOperationBase(TValue value)
    : FilterOperation(TOperation), value(std::move(value)) {}

template <FilterOp TOperation, CSSValueDerived TValue>
bool FilterOperationBase<TOperation, TValue>::operator==(const FilterOperation &other) const {
  if (type != other.type) {
    return false;
  }
  const auto &otherOperation = static_cast<const FilterOperationBase<TOperation, TValue> &>(other);
  return value == otherOperation.value;
}

template <FilterOp TOperation, CSSValueDerived TValue>
folly::dynamic FilterOperationBase<TOperation, TValue>::valueToDynamic() const {
  return value.toDynamic();
}

template struct FilterOperationBase<FilterOp::Blur, CSSDouble>;
template struct FilterOperationBase<FilterOp::Brightness, CSSDouble>;
template struct FilterOperationBase<FilterOp::Contrast, CSSDouble>;
template struct FilterOperationBase<FilterOp::DropShadow, CSSDropShadow>;
template struct FilterOperationBase<FilterOp::Grayscale, CSSDouble>;
template struct FilterOperationBase<FilterOp::HueRotate, CSSAngle>;
template struct FilterOperationBase<FilterOp::Invert, CSSDouble>;
template struct FilterOperationBase<FilterOp::Opacity, CSSDouble>;
template struct FilterOperationBase<FilterOp::Saturate, CSSDouble>;
template struct FilterOperationBase<FilterOp::Sepia, CSSDouble>;

} // namespace reanimated::css
