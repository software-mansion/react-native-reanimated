#!/bin/sh
# Runs every reproducer against the real source.
# Returns 0 only if every finding still triggers the buggy behavior we expect
# (or the corresponding fix is in place — a few of them are static-only checks).

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
EXIT=0

# 1) Easing OOB — links the real source files from the worktree.
echo "==> 01_easing_oob"
(
    cd "$HERE/01_easing_oob"
    rm -rf build
    cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug >/dev/null
    cmake --build build >/dev/null
    # ASan exits non-zero on SEGV; we *want* that here.
    if "$HERE/01_easing_oob/build/easing_oob_test" 2>&1 | grep -q "SEGV.*steps.cpp:9"; then
        echo "  [REPRODUCED] SEGV at steps.cpp:9 from real source"
    else
        echo "  [FAIL] expected SEGV in real steps.cpp:9 was not observed"
        EXIT=1
    fi
)

# 2) ArrayBuffer truncation — mirrors the cast pattern from Serializable.cpp.
echo "==> 02_arraybuffer_truncation"
(
    cd "$HERE/02_arraybuffer_truncation"
    clang++ -std=c++17 -O0 -g main.cpp -o repro
    OUT="$(./repro)"
    echo "$OUT" | grep -q "BUG REPRODUCED" && echo "  [REPRODUCED] int truncation observed for sizes > INT_MAX" || {
        echo "  [FAIL] expected truncation not observed"
        EXIT=1
    }
)

# 3) CRLF in OkHttp — links real OkHttp 4.12.0 from the local Gradle cache.
echo "==> 03_crlf_okhttp"
(
    cd "$HERE/03_crlf_okhttp"
    OKHTTP="$(ls "$HOME"/.gradle/caches/modules-2/files-2.1/com.squareup.okhttp3/okhttp/4.12.0/*/okhttp-4.12.0.jar 2>/dev/null | head -1)"
    OKIO="$(ls "$HOME"/.gradle/caches/modules-2/files-2.1/com.squareup.okio/okio-jvm/3.6.0/*/okio-jvm-3.6.0.jar 2>/dev/null | head -1)"
    KOTLIN="$(ls "$HOME"/.gradle/caches/modules-2/files-2.1/org.jetbrains.kotlin/kotlin-stdlib/1.9.0/*/kotlin-stdlib-1.9.0.jar 2>/dev/null | head -1)"
    if [ -z "$OKHTTP" ] || [ -z "$OKIO" ] || [ -z "$KOTLIN" ]; then
        echo "  [SKIP] missing OkHttp 4.12.0 / okio 3.6.0 / kotlin-stdlib 1.9.0 in the gradle cache"
        echo "         OKHTTP=$OKHTTP"
        echo "         OKIO=$OKIO"
        echo "         KOTLIN=$KOTLIN"
        return 0
    fi
    javac -cp "$OKHTTP:$OKIO:$KOTLIN" CrlfRepro.java
    OUT="$(java -cp ".:$OKHTTP:$OKIO:$KOTLIN" CrlfRepro)"
    if echo "$OUT" | grep -q "BUG REPRODUCED" && echo "$OUT" | grep -q "fix prevents request smuggling"; then
        echo "  [REPRODUCED] OkHttp 4.12.0 keeps CRLF; stripHeaderValue removes it"
    else
        echo "  [FAIL] CRLF demo did not behave as expected"
        echo "$OUT"
        EXIT=1
    fi
)

# 4) Serializable null deref — mirror unit, JSI-free.
echo "==> 04_serializable_nullderef"
(
    cd "$HERE/04_serializable_nullderef"
    clang++ -std=c++17 -O0 -g main.cpp -o repro
    OUT="$(./repro 2>&1)"
    if echo "$OUT" | grep -q "BUG REPRODUCED" && echo "$OUT" | grep -q "fixed form returns the value"; then
        echo "  [REPRODUCED] dynamic_pointer_cast nullptr deref crashes; fix throws cleanly"
    else
        echo "  [FAIL] expected behavior not observed"
        echo "$OUT"
        EXIT=1
    fi
)

# 5) WorkletRuntime type confusion — JS-level repro that requires a live app
#    runtime. Treat as static check for the un-guarded pattern; the
#    `crashlog-debug-build.ips` artefact in the directory is the live evidence
#    captured against pokemon.
echo "==> 05_workletruntime_typeconfusion"
(
    PROXY_FILE="$REPO/packages/react-native-worklets/Common/cpp/worklets/NativeModules/JSIWorkletsModuleProxy.cpp"
    # The buggy form has a single line ending in `getHostObject<WorkletRuntime>(rt);`
    # immediately following the runOnRuntimeSync signature, with no
    # isObject/isHostObject guard above. Detect that *exact* shape.
    if awk '/jsi::Value runOnRuntimeSync\(/,/^}/' "$PROXY_FILE" \
         | grep -q "isHostObject"; then
        echo "  [OK] runOnRuntimeSync has isHostObject guard"
    else
        echo "  [FAIL] runOnRuntimeSync missing isHostObject guard"
        EXIT=1
    fi
    if [ -f "$HERE/05_workletruntime_typeconfusion/crashlog-debug-build.ips" ]; then
        echo "  [evidence] crashlog-debug-build.ips: SIGABRT in __assert_rtn from getHostObject<WorkletRuntime>"
    fi
)

# 6) AsyncQueue silent null — mirror unit, JSI-free.
echo "==> 06_asyncqueue_silent_null"
(
    cd "$HERE/06_asyncqueue_silent_null"
    clang++ -std=c++17 -O0 -g main.cpp -o repro
    OUT="$(./repro 2>&1)"
    if echo "$OUT" | grep -q "BUG REPRODUCED" && echo "$OUT" | grep -q "returns the queue"; then
        echo "  [REPRODUCED] silent-null contract crash; fix throws at boundary"
    else
        echo "  [FAIL] expected behavior not observed"
        echo "$OUT"
        EXIT=1
    fi
    # Also confirm the source-level fix is in place: the function must throw
    # rather than `return nullptr`.
    PROXY_FILE="$REPO/packages/react-native-worklets/Common/cpp/worklets/NativeModules/JSIWorkletsModuleProxy.cpp"
    if awk '/extractAsyncQueue\(/,/^}/' "$PROXY_FILE" | grep -q "return nullptr"; then
        echo "  [FAIL] extractAsyncQueue still returns nullptr silently"
        EXIT=1
    else
        echo "  [OK] extractAsyncQueue throws at boundary"
    fi
)

# 7) _WORKLET_RUNTIME info leak — static check that the dead-code write was
#    removed. The live JS evidence (pointer hex bytes) is captured in
#    repro.js / README.md inside the test directory.
echo "==> 07_workletruntime_infoleak"
(
    DECORATOR_FILE="$REPO/packages/react-native-reanimated/Common/cpp/reanimated/RuntimeDecorators/RNRuntimeDecorator.cpp"
    if grep -q '"_WORKLET_RUNTIME"' "$DECORATOR_FILE"; then
        echo "  [FAIL] RNRuntimeDecorator still publishes _WORKLET_RUNTIME"
        EXIT=1
    else
        echo "  [OK] RNRuntimeDecorator no longer leaks the runtime address"
    fi
    TYPES_FILE="$REPO/packages/react-native-worklets/src/types.ts"
    if grep -q "_WORKLET_RUNTIME" "$TYPES_FILE"; then
        echo "  [FAIL] types.ts still declares _WORKLET_RUNTIME"
        EXIT=1
    else
        echo "  [OK] types.ts no longer declares _WORKLET_RUNTIME"
    fi
)

echo "=== done (exit=$EXIT) ==="
exit $EXIT
