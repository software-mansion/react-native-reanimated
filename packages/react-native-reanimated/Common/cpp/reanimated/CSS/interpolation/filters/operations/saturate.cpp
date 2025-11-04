#include <reanimated/CSS/interpolation/filters/operations/saturate.h>

#include <string>

namespace reanimated::css {
    template <FilterOp TOperation>
    SaturateOperationBase<TOperation>::SaturateOperationBase(const std::string &value)
        : FilterOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

    template <FilterOp TOperation>
    folly::dynamic SaturateOperationBase<TOperation>::valueToDynamic() const {
        return this->value.toDynamic();
    }

    template struct SaturateOperationBase<FilterOp::saturate>;

} // namespace reanimated::css
