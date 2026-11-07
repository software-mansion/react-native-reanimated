# Battery benchmark

Measures the energy used by the scenarios of the "Battery benchmark" example (`apps/common-app/src/apps/reanimated/examples/BatteryBenchmark`) on an Android phone.

For every scenario, the harness cold-starts the app with a deep link, waits 8 seconds, checks in logcat that the app renders the requested scenario and count, and records 20 seconds of:

- energy of every power rail (CPU clusters, GPU, display, memory) from the On-Device Power Monitor through Perfetto `android.power` (Pixel 6 or newer),
- CPU time of every thread of the app, and of the SurfaceFlinger and composer processes,
- frames rendered (`dumpsys gfxinfo`) and temperatures (`dumpsys thermalservice`).

## Requirements

- A release build of fabric-example (`./gradlew assembleRelease` in `apps/fabric-example/android`). The app is `profileable`, so `simpleperf` can profile it too.
- Python 3 with the `perfetto` package (`pip install perfetto`).
- `adb` on `PATH` and `ANDROID_SERIAL` set to the phone.

## Usage

Run scenarios on the installed app:

```sh
python bench.py results.jsonl 100 static uas-transform css-anim-transform
```

Compare APKs, alternating their order in each round:

```sh
python ab.py ab.jsonl 3 100 "base=base.apk,change=change.apk" uas-transform css-anim-transform
python summarize.py ab.jsonl
```

A single scenario can be opened manually with:

```sh
adb shell am start -a android.intent.action.VIEW \
  -d 'fabricexample://Reanimated/BatteryBenchmarkExample?scenario=uas-transform&count=100'
```

Battery current reported by the fuel gauge is not usable on a phone powered by a cable, which is why the harness relies on the power rails.
