#pragma once

#include <reanimated/CSS/common/transforms/TransformMatrix.h>
#include <reanimated/CSS/common/transforms/TransformOp.h>
#include <reanimated/CSS/interpolation/operations/StyleOperation.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

using namespace facebook;

// Base struct for TransformOperation
struct TransformOperation : public StyleOperation {
  explicit TransformOperation(TransformOp type);

  // Tells if the transform operations is 3D-only (cannot be represented in 2D)
  virtual bool is3D() const;

  std::string getOperationName() const override;

  static std::shared_ptr<TransformOperation> fromJSIValue(jsi::Runtime &rt, const jsi::Value &value);
  static std::shared_ptr<TransformOperation> fromDynamic(const folly::dynamic &value);

  virtual bool canConvertTo(TransformOp type) const;
  virtual std::vector<std::shared_ptr<TransformOperation>> convertTo(TransformOp type) const;
  void assertCanConvertTo(TransformOp type) const;

  virtual TransformMatrix::Shared toMatrix(bool force3D) const = 0;
};

using TransformOperations = std::vector<std::shared_ptr<TransformOperation>>;

// Base implementation for transform operations (except for MatrixOperation)
template <TransformOp TOperation, typename TValue>
struct TransformOperationBase : public TransformOperation {
  const TValue value;

  explicit TransformOperationBase(TValue value);
  TransformMatrix::Shared toMatrix(bool force3D) const override;

 protected:
  mutable TransformMatrix::Shared cachedMatrix_;

  folly::dynamic valueToDynamic() const override;
  bool areValuesEqual(const StyleOperation &other) const override;
};

} // namespace reanimated::css
