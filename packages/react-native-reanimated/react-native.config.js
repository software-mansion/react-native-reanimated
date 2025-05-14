module.exports = {
  dependency: {
    platforms: {
      android: {
        componentDescriptors: [
          "ReanimatedViewComponentDescriptor",
        ],
        cmakeListsPath: "../Common/NativeView/CMakeLists.txt",
      },
    },
  },
}
