# Native registry tests

Run `yarn workspace react-native-reanimated test:native` on macOS after you install the Fabric example's Pods. Set `REANIMATED_TEST_PODS_DIR` to use another Pod installation.

The tests compile the actual `UpdatesRegistryManager.cpp` with the macOS Folly library from `ReactNativeDependencies`. Small test substitutes supply React tree and registry objects. The tests check pending prop values, commit acknowledgment, and surface isolation. They do not test native view mounting or layout animation frames.

Build files go in `.tmp/reanimated-native-tests` in the repository root.
