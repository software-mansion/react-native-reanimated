module.exports = {
  dependency: {
    platforms: {
      android: {
        componentDescriptors: [
          "ReanimatedViewComponentDescriptor",
        ],
        cmakeListsPath: "./android/src/main/cpp/reanimated/android/view/CMakeLists.txt"
      },
    },
  },
}
