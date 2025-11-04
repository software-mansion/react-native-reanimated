#include <reanimated/CSS/interpolation/filters/operations/blur.h>

#include <string>

namespace reanimated::css {
    template <FilterOp TOperation>
    BlurOperationBase<TOperation>::BlurOperationBase(const std::string &value)
        : FilterOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

    template <FilterOp TOperation>
    folly::dynamic BlurOperationBase<TOperation>::valueToDynamic() const {
        return this->value.toDynamic();
    }

    template struct BlurOperationBase<FilterOp::blur>;

} // namespace reanimated::css
