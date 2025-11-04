#include <reanimated/CSS/interpolation/filters/operations/contrast.h>

#include <string>

namespace reanimated::css {
    template <FilterOp TOperation>
    ContrastOperationBase<TOperation>::ContrastOperationBase(const std::string &value)
        : FilterOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

    template <FilterOp TOperation>
    folly::dynamic ContrastOperationBase<TOperation>::valueToDynamic() const {
        return this->value.toDynamic();
    }

    template struct ContrastOperationBase<FilterOp::contrast>;

} // namespace reanimated::css
