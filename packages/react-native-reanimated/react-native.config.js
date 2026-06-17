module.exports = {
  dependency: {
    platforms: {
      android: {
        componentDescriptors: [
          'REASharedTransitionBoundaryComponentDescriptor',
        ],
        cmakeListsPath: '../Common/NativeView/CMakeLists.txt',
      },
    },
  },
};
