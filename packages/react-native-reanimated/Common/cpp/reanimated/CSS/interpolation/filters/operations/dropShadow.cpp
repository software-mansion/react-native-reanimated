#include <reanimated/CSS/interpolation/filters/operations/dropShadow.h>

#include <string>

namespace reanimated::css {

    template <FilterOp TOperation>
    DropShadowBase<TOperation>::DropShadowBase(const std::string &value)
        : FilterOperationBase<TOperation, CSSDropShadow>(CSSDropShadow(value)) {}

    template <FilterOp TOperation>
    folly::dynamic DropShadowBase<TOperation>::valueToDynamic() const {
        return this->value.toDynamic();
    }

    template struct DropShadowBase<FilterOp::dropShadow>;

} // namespace reanimated::css