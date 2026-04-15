#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

#include <memory>
#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
TranslateOperationBase<TOperation>::TranslateOperationBase(double value)
    : TransformOperationBase<TOperation, CSSLength>(CSSLength(value)) {}

template <TransformOp TOperation>
TranslateOperationBase<TOperation>::TranslateOperationBase(const std::string &value)
    : TransformOperationBase<TOperation, CSSLength>(CSSLength(value)) {}

template <TransformOp TOperation>
bool TranslateOperationBase<TOperation>::shouldResolve() const {
  return this->value.isRelative;
}

template <TransformOp TOperation>
TransformMatrix::Shared TranslateOperationBase<TOperation>::toMatrix(bool force3D) const {
  if (shouldResolve()) {
    throw std::runtime_error(
        "[Reanimated] Cannot convert unresolved relative translate value to matrix: " + this->value.toString());
  }

  if (force3D) {
    return std::make_shared<TransformMatrix3D>(TransformMatrix3D::create<TOperation>(this->value.value));
  }
  return std::make_shared<TransformMatrix2D>(TransformMatrix2D::create<TOperation>(this->value.value));
}

template struct TranslateOperationBase<TransformOp::TranslateX>;
template struct TranslateOperationBase<TransformOp::TranslateY>;

} // namespace reanimated::css
