// Demonstrates the int truncation bug in
//   packages/react-native-worklets/Common/cpp/worklets/SharedItems/Serializable.cpp
// (pre-fix line 124):
//
//   jsi::Value SerializableArrayBuffer::toJSValue(jsi::Runtime &rt) {
//     auto size = static_cast<int>(data_.size());                    // (A)
//     auto arrayBuffer = ... callAsConstructor(rt, size) ...
//     memcpy(arrayBuffer.data(rt), data_.data(), size);              // (B)
//   }
//
// Compiling Serializable.cpp itself requires a real <jsi/jsi.h> + folly +
// worklets internal headers, so this repro extracts (A) + (B) into a tiny
// translation unit that uses identical C++ constructs (auto / static_cast<int>
// / memcpy with the int passed where a size_t is expected) and demonstrates:
//
//   1. The cast at (A) wraps for sizes > INT_MAX
//   2. The truncated int implicitly widens back to size_t at memcpy's third
//      argument, producing a near-16-EiB length
//
// The fix replaces (A) with `auto size = data_.size();` (size_t end-to-end),
// passes it as a double for the JSI constructor, and feeds the unchanged
// size_t into memcpy.
//
// Verify the buggy line still exists in the source pre-fix and that the fix
// is applied post-fix:
//   git -C ../../.. log -p -- packages/react-native-worklets/Common/cpp/worklets/SharedItems/Serializable.cpp | grep -A1 'SerializableArrayBuffer::toJSValue'

#include <cinttypes>
#include <climits>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <vector>

// Mirror of the buggy sequence. NOTE: uses identical types and operators
// to the real source, just with std::vector<char> standing in for data_.
static size_t buggyMemcpySizeFor(size_t dataSize) {
    auto size = static_cast<int>(dataSize);    // line 124 of Serializable.cpp pre-fix
    return static_cast<size_t>(size);          // implicit widening at memcpy's 3rd arg
}

// Mirror of the fix. size_t kept end-to-end.
static size_t fixedMemcpySizeFor(size_t dataSize) {
    auto size = dataSize;
    return size;
}

int main() {
    std::printf("[02_arraybuffer_truncation] proving static_cast<int> truncates beyond INT_MAX\n");

    struct Case {
        const char *label;
        size_t input;
        size_t expectedBuggy;     // what memcpy actually sees pre-fix
    };

    Case cases[] = {
        {"empty",        0,                                     0},
        {"one MiB",      1u << 20,                              1u << 20},
        {"INT_MAX",      static_cast<size_t>(INT_MAX),          static_cast<size_t>(INT_MAX)},
        {"INT_MAX + 1",  static_cast<size_t>(INT_MAX) + 1u,     static_cast<size_t>(static_cast<int>(static_cast<size_t>(INT_MAX) + 1u))},
        {"4 GiB",        1ull << 32,                            static_cast<size_t>(static_cast<int>(1ull << 32))},
        {"6 GiB",        6ull << 30,                            static_cast<size_t>(static_cast<int>(6ull << 30))},
    };

    int failed = 0;
    for (const auto &c : cases) {
        size_t buggy = buggyMemcpySizeFor(c.input);
        size_t fixed = fixedMemcpySizeFor(c.input);
        std::printf("  input=%-12zu (%-11s)  buggy=0x%016zx  fixed=0x%016zx",
                    c.input, c.label, buggy, fixed);
        bool wraps = (c.input > static_cast<size_t>(INT_MAX)) && (buggy != c.input);
        if (c.input > static_cast<size_t>(INT_MAX) && !wraps) {
            std::printf("  [FAIL: expected truncation]\n");
            failed++;
        } else if (wraps) {
            std::printf("  [BUG REPRODUCED — memcpy would copy 0x%zx bytes]\n", buggy);
        } else {
            std::printf("  [OK]\n");
        }
        if (fixed != c.input) {
            std::printf("    [FAIL: fixed path lost data]\n");
            failed++;
        }
    }

    std::printf("\nNote: heap budgets on a current mobile device cannot allocate >2 GiB,\n"
                "so this is hardening today. The next Hermes / 64-bit allocator change\n"
                "that lifts the ceiling makes this exploitable as a memcpy of attacker\n"
                "data over an arbitrary heap range.\n");

    return failed == 0 ? 0 : 1;
}
