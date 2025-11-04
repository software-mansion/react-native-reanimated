#include <reanimated/CSS/interpolation/filters/operations/opacity.h>

#include <string>

namespace reanimated::css {
    template <FilterOp TOperation>
    OpacityOperationBase<TOperation>::OpacityOperationBase(const std::string &value)
        : FilterOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

    template <FilterOp TOperation>
    folly::dynamic OpacityOperationBase<TOperation>::valueToDynamic() const {
        return this->value.toDynamic();
    }

    template struct OpacityOperationBase<FilterOp::opacity>;

} // namespace reanimated::css
