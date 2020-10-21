declare module 'react-native-reanimated' {
  function makeRemote<T>(value: T): T;

  function useEvent<T>(
    handler: T,
    events: string[],
    rebuild: boolean,
  ): T;
}
