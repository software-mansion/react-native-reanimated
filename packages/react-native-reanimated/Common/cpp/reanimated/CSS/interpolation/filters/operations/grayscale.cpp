#include <reanimated/CSS/interpolation/filters/operations/grayscale.h>

#include <string>

namespace reanimated::css {
    template <FilterOp TOperation>
    GrayscaleOperationBase<TOperation>::GrayscaleOperationBase(const std::string &value)
        : FilterOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

    template <FilterOp TOperation>
    folly::dynamic GrayscaleOperationBase<TOperation>::valueToDynamic() const {
        return this->value.toDynamic();
    }

    template struct GrayscaleOperationBase<FilterOp::grayscale>;

} // namespace reanimated::css
