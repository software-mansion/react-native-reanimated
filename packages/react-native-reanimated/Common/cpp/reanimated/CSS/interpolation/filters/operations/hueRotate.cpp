#include <reanimated/CSS/interpolation/filters/operations/hueRotate.h>

#include <string>

namespace reanimated::css {
    template <FilterOp TOperation>
    HueRotateOperationBase<TOperation>::HueRotateOperationBase(const std::string &value)
        : FilterOperationBase<TOperation, CSSAngle>(CSSAngle(value)) {}

    template <FilterOp TOperation>
    folly::dynamic HueRotateOperationBase<TOperation>::valueToDynamic() const {
        return this->value.toDynamic();
    }

    template struct HueRotateOperationBase<FilterOp::hueRotate>;

} // namespace reanimated::css