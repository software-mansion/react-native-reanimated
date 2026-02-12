#pragma once

#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

#include <memory>

namespace reanimated::css {

// Base implementation for simple operations
template <typename TOperation>
class TransformOperationInterpolator : public StyleOperationInterpolator {
 public:
  explicit TransformOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, TOperation &)> addToPropsBuilder);
  using StyleOperationInterpolator::StyleOperationInterpolator;

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context,
      const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const override;
    
  void addDiscreteStyleOperationToPropsBuilder(
        const std::shared_ptr<StyleOperation> &operation,
        const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const override;


 private:
  std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, TOperation &)> addToPropsBuilder_;
};

// Specialization for PerspectiveOperation
template <>
class TransformOperationInterpolator<PerspectiveOperation> : public StyleOperationInterpolator {
 public:
  explicit TransformOperationInterpolator(
      const std::shared_ptr<PerspectiveOperation> &defaultOperation,
      std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, PerspectiveOperation &)> addToPropsBuilder);

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context,
      const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const override;

 private:
  std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, PerspectiveOperation &)> addToPropsBuilder_;
};

// Specialization for MatrixOperation
template <>
class TransformOperationInterpolator<MatrixOperation> : public StyleOperationInterpolator {
 public:
  explicit TransformOperationInterpolator(
      const std::shared_ptr<MatrixOperation> &defaultOperation,
      std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, MatrixOperation &)> addToPropsBuilder);

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context,
      const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const override;

 protected:
  template <typename MatrixType>
  MatrixType interpolateMatrix(double progress, const TransformMatrix::Shared &from, const TransformMatrix::Shared &to)
      const;

  TransformMatrix::Shared matrixFromOperation(
      const std::shared_ptr<TransformOperation> &operation,
      bool shouldBe3D,
      const StyleOperationsInterpolationContext &context) const;

 private:
  std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, MatrixOperation &)> addToPropsBuilder_;
};

// Specialization for resolvable operations
template <ResolvableOp TOperation>
class TransformOperationInterpolator<TOperation> : public StyleOperationInterpolator {
 public:
  TransformOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config,
      std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, TOperation &)> addToPropsBuilder);

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context,
      const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const override;

  std::shared_ptr<StyleOperation> resolveOperation(
      const std::shared_ptr<StyleOperation> &operation,
      const StyleOperationsInterpolationContext &context) const override;

 protected:
  const ResolvableValueInterpolatorConfig config_;

  ResolvableValueInterpolationContext getResolvableValueContext(
      const StyleOperationsInterpolationContext &context) const;

 private:
  std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, TOperation &)> addToPropsBuilder_;
};

} // namespace reanimated::css
