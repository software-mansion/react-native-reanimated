#include <reanimated/CSS/interpolation/filters/operations/brightness.h>

#include <string>

namespace reanimated::css {
    template <FilterOp TOperation>
    BrightnessOperationBase<TOperation>::BrightnessOperationBase(const std::string &value)
        : FilterOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

    template <FilterOp TOperation>
    folly::dynamic BrightnessOperationBase<TOperation>::valueToDynamic() const {
        return this->value.toDynamic();
    }

    template struct BrightnessOperationBase<FilterOp::brightness>;

} // namespace reanimated::css
