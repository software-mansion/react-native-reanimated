#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/common/transforms/TransformOp.h>
#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

#ifndef NDEBUG
#include <iostream>
#include <sstream>
#endif // NDEBUG

namespace reanimated::css {

using namespace facebook;
using namespace react;

// Base struct for TransformOperation
struct TransformOperation {
  virtual bool operator==(const TransformOperation &other) const = 0;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformOperation &operation);
  virtual std::string stringifyOperationValue() const = 0;
#endif // NDEBUG

  std::string getOperationName() const;
  virtual TransformOp type() const = 0;
  virtual bool isRelative() const;

  static std::shared_ptr<TransformOperation> fromJSIValue(
      jsi::Runtime &rt,
      const jsi::Value &value);
  static std::shared_ptr<TransformOperation> fromDynamic(
      const folly::dynamic &value);
  folly::dynamic toDynamic() const;
  virtual folly::dynamic valueToDynamic() const = 0;

  virtual bool canConvertTo(TransformOp type) const;
  virtual std::vector<std::shared_ptr<TransformOperation>> convertTo(
      TransformOp type) const;

  virtual TransformMatrix3D toMatrix() const = 0;
  void assertCanConvertTo(TransformOp type) const;
};

using TransformOperations = std::vector<std::shared_ptr<TransformOperation>>;

// Template overload to inherit from in final operation structs
template <TransformOp TOperation, typename TValue>
struct TransformOperationBase : public TransformOperation {
  const TValue value;

  explicit TransformOperationBase(const TValue &value) : value(value) {}
  virtual ~TransformOperationBase() = default;

  TransformOp type() const override {
    return TOperation;
  }

  bool operator==(const TransformOperation &other) const override {
    if (type() != other.type()) {
      return false;
    }
    const auto &otherOperation =
        static_cast<const TransformOperationBase<TOperation, TValue> &>(other);
    return value == otherOperation.value;
  }

#ifndef NDEBUG
  std::string stringifyOperationValue() const override;
#endif // NDEBUG
};

} // namespace reanimated::css
