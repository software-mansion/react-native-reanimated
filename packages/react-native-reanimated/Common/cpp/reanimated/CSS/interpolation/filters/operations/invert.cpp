#include <reanimated/CSS/interpolation/filters/operations/invert.h>

#include <string>

namespace reanimated::css {
    template <FilterOp TOperation>
    InvertOperationBase<TOperation>::InvertOperationBase(const std::string &value)
        : FilterOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

    template <FilterOp TOperation>
    folly::dynamic InvertOperationBase<TOperation>::valueToDynamic() const {
        return this->value.toDynamic();
    }

    template struct InvertOperationBase<FilterOp::invert>;

} // namespace reanimated::css
