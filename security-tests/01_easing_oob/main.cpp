// Hits the real linear() / steps() factories from
//   packages/react-native-reanimated/Common/cpp/reanimated/CSS/easing/{linear,steps}.cpp
// and the real firstSmallerOrEqual from
//   packages/react-native-reanimated/Common/cpp/reanimated/CSS/utils/algorithms.cpp
//
// These files are added to the cmake target verbatim (see CMakeLists.txt);
// no copy-paste is involved. The only trimmed dependency is the JSI-side
// parser in EasingFunctions.cpp, which is the layer we proved must reject
// empty `points` before the lambdas are constructed.
//
// Expected: ASan reports SEGV on the read of pointsY[0] / pointsX[0] for the
// `linear({}, {})` and `steps({}, {})` lambdas. With the parser-level guard
// merged in commit 2f347e3357, the parser throws before the lambda is ever
// produced — so the lambdas themselves remain unsafe (defense-in-depth wants
// them robust too) but they are unreachable from JS.

#include <cstdio>
#include <reanimated/CSS/easing/linear.h>
#include <reanimated/CSS/easing/steps.h>

int main() {
    std::printf("[01_easing_oob] exercising real linear()/steps() with empty points\n");

    // Case 1: steps lambda OOB
    {
        auto fn = reanimated::css::steps({}, {});
        double v = fn(0.5); // pointsY[0] on empty vector → UB / SEGV
        std::printf("    steps({},{})(0.5) = %g (should not reach here)\n", v);
    }

    // Case 2: linear lambda OOB (also: pointsX.size() - 1 underflow)
    {
        auto fn = reanimated::css::linear({}, {});
        double v = fn(0.3);
        std::printf("    linear({},{})(0.3) = %g (should not reach here)\n", v);
    }

    return 0;
}
