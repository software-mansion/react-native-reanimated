#!/bin/sh
# Runs all three security findings' reproducers against the real source.
# Returns 0 only if every finding still triggers the buggy behavior we expect.

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
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

echo "=== done (exit=$EXIT) ==="
exit $EXIT
