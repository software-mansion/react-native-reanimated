const COLLAPSED_STACK_REGEX = new RegExp(
  [
    // For internal usage in the example app
    "/packages/react-native-reanimated/.+\\.(t|j)sx?$",
    // When reanimated is installed as a dependency (node_modules)
    "/node_modules/react-native-reanimated/.+\\.(t|j)sx?$",
  ]
    // Make patterns work with both Windows and POSIX paths.
    .map((pathPattern) => pathPattern.replaceAll("/", "[/\\\\]"))
    .join("|")
);

function withReanimated(config) {
  return {
    ...config,
    symbolicator: {
      customizeFrame: (frame) => {
        const collapse = Boolean(
          config?.symbolicator?.customizeFrame?.(frame).collapse || (frame.file !== null && COLLAPSED_STACK_REGEX.test(frame.file))
        );
        console.log(
          frame.file, 
          collapse
        )
        return {
          collapse
        };
      },
    },
  };
}

module.exports = {
  withReanimated
}
