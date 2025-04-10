module.exports = {
  dependency: {
    platforms: {
      android: {
        componentDescriptors: [
          "ReanimatedViewComponentDescriptor",
        ],
        cmakeListsPath: "./src/main/cpp/reanimated/android/view/CMakeLists.txt",      },
    },
  },
}
