import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  executeOnUIRuntimeSync,
  runOnJS,
  runOnUI,
} from 'react-native-reanimated';

type Status = 'ok' | 'not_ok' | 'error' | undefined;

export default function ShareablesExample() {
  return (
    <View style={styles.container}>
      <View style={styles.statusInfoBox}>
        <View style={styles.statusInfoRow}>
          <Text style={styles.statusInfoText}>🟢 - Ok</Text>
          <Text style={styles.statusInfoText}>🚫 - Throws</Text>
        </View>
        <View style={styles.statusInfoRow}>
          <Text style={styles.statusInfoText}>🔴 - Failed</Text>
          <Text style={styles.statusInfoText}>⚪ - Pending</Text>
        </View>
      </View>

      <View style={[styles.headerRow, styles.borderTop]}>
        <Text style={[styles.headerText, styles.columnTestCase]} />
        <Text style={[styles.headerText, styles.columnHeader]}>
          makeShareableClone
        </Text>
        <Text style={[styles.headerText, styles.columnHeader]}>
          makeShareableCloneOnUI
        </Text>
      </View>

      <View style={styles.headerRow}>
        <Text style={[styles.headerText, styles.columnTestCase]}>
          Test Case
        </Text>
        <Text style={[styles.headerText, styles.columnExpected]}>Expected</Text>
        <Text style={[styles.headerText, styles.columnActual]}>Actual</Text>
        <Text style={[styles.headerText, styles.columnExpected]}>Expected</Text>
        <Text style={[styles.headerText, styles.columnActual]}>Actual</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <StringDemo />
        {/* <BooleanDemo /> */}
        {/* <BigIntDemo /> */}
        {/* <NumberDemo /> */}
        {/* <UndefinedDemo />
        <NullDemo />
        <HostObjectDemo />
        <ArrayDemo />
        <RegExpDemo />
        <ArrayBufferDemo />
        <TypedArrayDemo />
        <BigIntTypedArrayDemo />
        <DataViewDemo />
        <ErrorDemo />
        <CyclicObjectDemo />
        <InaccessibleObjectDemo />
        <RemoteNamedFunctionSyncCallDemo />
        <RemoteAnonymousFunctionSyncCallDemo /> */}
      </ScrollView>
    </View>
  );
}

function useStatus() {
  const [statusShareableClone, setStatusShareableClone] =
    useState<Status>(undefined);
  const [statusShareableCloneOnUI, setStatusShareableCloneOnUI] =
    useState<Status>(undefined);
  return {
    statusShareableClone,
    statusShareableCloneOnUI,
    setStatusShareableClone,
    setStatusShareableCloneOnUI,
  };
}

interface DemoItemRowProps {
  title: string;
  onPress: () => void;
  statusShareableClone: Status;
  statusShareableCloneOnUI: Status;
  expectedOnWeb: Status;
  expectedShareableClone: Status;
  expectedShareableCloneOnUI: Status;
}

const DemoItemRow: React.FC<DemoItemRowProps> = ({
  title,
  onPress,
  statusShareableClone,
  statusShareableCloneOnUI,
  expectedShareableClone,
  expectedShareableCloneOnUI,
  expectedOnWeb,
}) => {
  return (
    <View style={styles.demoRow}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.clickableTitleContainer}>
        <Text style={styles.titleText}>{title}</Text>
      </TouchableOpacity>
      <View style={styles.expectedContainer}>
        <Status
          status={
            Platform.OS === 'web' ? expectedOnWeb : expectedShareableClone
          }
        />
      </View>
      <View style={styles.statusContainer}>
        <Status status={statusShareableClone} />
      </View>
      <View style={styles.expectedContainer}>
        <Status
          status={
            Platform.OS === 'web' ? expectedOnWeb : expectedShareableCloneOnUI
          }
        />
      </View>
      <View style={styles.statusContainer}>
        <Status status={statusShareableCloneOnUI} />
      </View>
    </View>
  );
};

function Status({ status }: { status: Status }) {
  const emoji =
    status === 'ok'
      ? '🟢'
      : status === 'not_ok'
        ? '🔴'
        : status === 'error'
          ? '🚫'
          : '⚪';
  return <Text style={styles.statusTextIcon}>{emoji}</Text>;
}

function StringDemo() {
  const title = 'String';
  const {
    statusShareableClone,
    statusShareableCloneOnUI,
    setStatusShareableClone,
    setStatusShareableCloneOnUI,
  } = useStatus();

  const handlePress = () => {
    const testString = 'test';

    // makeShareableCloneOnUI
    try {
      const result = executeOnUIRuntimeSync(() => {
        'worklet';
        return testString;
      })();
      if (result === 'test') {
        setStatusShareableCloneOnUI('ok');
      } else {
        setStatusShareableCloneOnUI('not_ok');
      }
    } catch (e) {
      setStatusShareableCloneOnUI('error');
    }

    // makeShareableClone
    runOnUI(() => {
      'worklet';
      try {
        if (testString === 'test') {
          runOnJS(setStatusShareableClone)('ok');
        } else {
          runOnJS(setStatusShareableClone)('not_ok');
        }
      } catch (e) {
        runOnJS(setStatusShareableClone)('error');
      }
    })();
  };

  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      statusShareableClone={statusShareableClone}
      statusShareableCloneOnUI={statusShareableCloneOnUI}
      expectedShareableClone="ok"
      expectedShareableCloneOnUI="ok"
      expectedOnWeb="ok"
    />
  );
}

// function NumberDemo() {
//   const title = 'Number';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const number = 123;
//     runOnUI(() => {
//       'worklet';
//       try {
//         if (number === 123) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function BooleanDemo() {
//   const title = 'Boolean';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const boolTrue = true;
//     const boolFalse = false;
//     runOnUI(() => {
//       'worklet';
//       try {
//         const checks = [boolTrue === true, boolFalse === false];
//         if (checks.every(Boolean)) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function UndefinedDemo() {
//   const title = 'Undefined';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const x = undefined;
//     runOnUI(() => {
//       'worklet';
//       try {
//         if (x === undefined) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function NullDemo() {
//   const title = 'Null';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const x = null;
//     runOnUI(() => {
//       'worklet';
//       try {
//         if (x === null) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function RegExpDemo() {
//   const title = 'RegExp';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const regex1 = /test/;
//     // eslint-disable-next-line prefer-regex-literals
//     const regex2 = new RegExp('test');
//     runOnUI(() => {
//       'worklet';
//       try {
//         const checks = [
//           regex1.test('test'),
//           regex2.test('test'),
//           regex1.toString() === regex2.toString(),
//         ];
//         if (checks.every(Boolean)) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function ArrayDemo() {
//   const title = 'Array';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   enum index {
//     number = 0,
//     true = 1,
//     false = 2,
//     null = 3,
//     undefined = 4,
//     string = 5,
//     bigint = 6,
//     object = 7,
//     remoteFunction = 8,
//     array = 9,
//     workletFunction = 10,
//     initializer = 11,
//     arrayBuffer = 12,
//   }

//   const handlePress = () => {
//     const arrayBuffer = new ArrayBuffer(3);
//     const uint8Array = new Uint8Array(arrayBuffer);
//     uint8Array[0] = 1;
//     uint8Array[1] = 2;
//     uint8Array[2] = 3;
//     const array: any[] = [
//       // number
//       1,
//       // boolean
//       true,
//       false,
//       // null
//       null,
//       // undefined
//       undefined,
//       // string
//       'a',
//       // bigint
//       BigInt(123),
//       // object
//       { a: 1 },
//       // remote function - not a worklet
//       () => {
//         return 1;
//       },
//       // array
//       [1],
//       // worklet function
//       () => {
//         'worklet';
//         return 1;
//       },
//       // initializer - regexp
//       /a/,
//       // array buffer
//       arrayBuffer,
//     ];
//     runOnUI(() => {
//       'worklet';
//       try {
//         const uint8ArrayUI = new Uint8Array(array[12]);
//         const checks = [
//           // number
//           array[index.number] === 1,
//           // boolean
//           array[index.true] === true,
//           array[index.false] === false,
//           // null
//           array[index.null] === null,
//           // undefined
//           array[index.undefined] === undefined,
//           // string
//           array[index.string] === 'a',
//           // bigint
//           typeof array[index.bigint] === 'bigint',
//           array[index.bigint] === BigInt(123),
//           // object
//           typeof array[index.object] === 'object',
//           array[index.object].a === 1,
//           // remote function - not worklet
//           typeof array[index.remoteFunction] === 'function',
//           __DEV__ === false ||
//             ('__remoteFunction' in array[index.remoteFunction] &&
//               !!array[index.remoteFunction].__remoteFunction),
//           // array
//           array[index.array].length === 1,
//           array[index.array][0] === 1,
//           // worklet function
//           typeof array[index.workletFunction] === 'function',
//           array[index.workletFunction]() === 1,
//           // initializer - regexp
//           array[index.initializer] instanceof RegExp,
//           array[index.initializer].test('a'),
//           // array buffer
//           array[index.arrayBuffer] instanceof ArrayBuffer,
//           array[index.arrayBuffer].byteLength === 3,
//           uint8ArrayUI[0] === 1,
//           uint8ArrayUI[1] === 2,
//           uint8ArrayUI[2] === 3,
//         ];
//         if (checks.every(Boolean)) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function CyclicObjectDemo() {
//   const title = 'Cyclic object';
//   const { status, isOk, isError } = useStatus();

//   const handlePress = () => {
//     try {
//       type RecursiveArray = (number | RecursiveArray)[];
//       const x: RecursiveArray = [];
//       x.push(1);
//       x.push(x);
//       runOnUI(() => {
//         'worklet';
//         try {
//           // eslint-disable-next-line @typescript-eslint/no-unused-vars
//           const _test = x[1];
//           runOnJS(isOk)();
//         } catch (e) {
//           runOnJS(isError)();
//         }
//       })();
//     } catch (e) {
//       runOnJS(isError)();
//     }
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="error"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function InaccessibleObjectDemo() {
//   const title = 'Inaccessible object';
//   const { status, isOk, isError } = useStatus();

//   const handlePress = () => {
//     const x = new Set();
//     runOnUI(() => {
//       'worklet';
//       try {
//         x.has(42);
//         runOnJS(isOk)();
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="error"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function HostObjectDemo() {
//   const title = 'HostObject';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     // @ts-expect-error It's ok
//     const hostObject = globalThis.__reanimatedModuleProxy;
//     const hostObjectKeys = Object.keys(hostObject);
//     runOnUI(() => {
//       'worklet';
//       try {
//         const checks = [
//           hostObjectKeys.length === Object.keys(hostObject).length,
//           ...hostObjectKeys.map((key) => hostObject[key] !== undefined),
//         ];
//         if (checks.every(Boolean)) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };

//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function RemoteNamedFunctionSyncCallDemo() {
//   const title = 'Remote named function sync call';
//   const { status, isOk, isError } = useStatus();

//   const handlePress = () => {
//     function foo() {}
//     runOnUI(() => {
//       'worklet';
//       try {
//         foo();
//         runOnJS(isOk)();
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="error"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function RemoteAnonymousFunctionSyncCallDemo() {
//   const title = 'Remote anonymous function sync call';
//   const { status, isOk, isError } = useStatus();

//   const handlePress = () => {
//     const foo = () => {};
//     runOnUI(() => {
//       'worklet';
//       try {
//         foo();
//         runOnJS(isOk)();
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="error"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function BigIntDemo() {
//   const title = 'BigInt';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const bigint = BigInt('1234567890');
//     runOnUI(() => {
//       'worklet';
//       try {
//         const checks = [
//           bigint === BigInt('1234567890'),
//           typeof bigint === 'bigint',
//         ];
//         if (checks.every(Boolean)) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function ArrayBufferDemo() {
//   const title = 'ArrayBuffer';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const ab = new ArrayBuffer(8);
//     const ta = new Uint8Array(ab);
//     ta[7] = 42;

//     runOnUI(() => {
//       'worklet';
//       try {
//         const isArrayBufferInstance = ab instanceof ArrayBuffer;
//         const taUi = new Uint8Array(ab);
//         const initialValueCheck = taUi[7] === 42;
//         taUi[7] = 123;

//         if (isArrayBufferInstance && initialValueCheck) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function TypedArrayDemo() {
//   const title = 'TypedArray';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const ta1 = new Int8Array(100);
//     const ta2 = new Uint8Array(100);
//     const ta3 = new Uint8ClampedArray(100);
//     const ta4 = new Int16Array(100);
//     const ta5 = new Uint16Array(100);
//     const ta6 = new Int32Array(100);
//     const ta7 = new Uint32Array(100);
//     const ta8 = new Float32Array(100);
//     const ta9 = new Float64Array(100);
//     ta1[99] = -123;
//     ta2[99] = 123;
//     ta3[99] = 999;
//     ta4[99] = -12345;
//     ta5[99] = 12345;
//     ta6[99] = -123456789;
//     ta7[99] = 123456789;
//     ta8[99] = 123.45;
//     ta9[99] = 12345.6789;

//     runOnUI(() => {
//       'worklet';
//       try {
//         const checks = [
//           ta1 instanceof Int8Array,
//           ta2 instanceof Uint8Array,
//           ta3 instanceof Uint8ClampedArray,
//           ta4 instanceof Int16Array,
//           ta5 instanceof Uint16Array,
//           ta6 instanceof Int32Array,
//           ta7 instanceof Uint32Array,
//           ta8 instanceof Float32Array,
//           ta9 instanceof Float64Array,
//           ta1[99] === -123,
//           ta2[99] === 123,
//           ta3[99] === 255,
//           ta4[99] === -12345,
//           ta5[99] === 12345,
//           ta6[99] === -123456789,
//           ta7[99] === 123456789,
//           Math.abs(ta8[99] - 123.45) < 1e-5,
//           Math.abs(ta9[99] - 12345.6789) < 1e-5,
//         ];
//         if (checks.every(Boolean)) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function BigIntTypedArrayDemo() {
//   const title = 'BigIntTypedArray';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const ta1 = new BigInt64Array(100);
//     const ta2 = new BigUint64Array(100);
//     ta1[99] = BigInt('-1234567890');
//     ta2[99] = BigInt('1234567890');

//     runOnUI(() => {
//       'worklet';
//       try {
//         const checks = [
//           ta1 instanceof BigInt64Array,
//           ta2 instanceof BigUint64Array,
//           ta1[99] === BigInt('-1234567890'),
//           ta2[99] === BigInt('1234567890'),
//         ];
//         if (checks.every(Boolean)) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function DataViewDemo() {
//   const title = 'DataView';
//   const { status, isOk, isNotOk, isError } = useStatus();

//   const handlePress = () => {
//     const buffer = new ArrayBuffer(16);
//     const dv = new DataView(buffer);
//     dv.setInt16(7, 12345);

//     runOnUI(() => {
//       'worklet';
//       try {
//         const checks = [dv instanceof DataView, dv.getInt16(7) === 12345];
//         if (checks.every(Boolean)) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (e) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

// function ErrorDemo() {
//   const title = 'Error';
//   const { status, isOk, isError, isNotOk } = useStatus();

//   const handlePress = () => {
//     const e = new Error('error message');
//     runOnUI(() => {
//       'worklet';
//       try {
//         const checks = [
//           e instanceof Error,
//           String(e).includes('error message'),
//           Platform.OS === 'web' ? !global._WORKLET : global._WORKLET,
//         ];
//         if (checks.every(Boolean)) {
//           runOnJS(isOk)();
//         } else {
//           runOnJS(isNotOk)();
//         }
//       } catch (err) {
//         runOnJS(isError)();
//       }
//     })();
//   };
//   return (
//     <DemoItemRow
//       title={title}
//       onPress={handlePress}
//       status={status}
//       expectedOnNative="ok"
//       expectedOnWeb="ok"
//     />
//   );
// }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  statusInfoBox: {
    justifyContent: 'center',
    gap: 5,
    flexDirection: 'column',
    padding: 10,
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 10,
    marginBottom: 20,
  },
  statusInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  statusInfoText: {
    fontSize: 16,
    textAlign: 'left',
    width: '50%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    backgroundColor: '#f0f0f0',
    marginBottom: 5,
  },
  borderTop: {
    borderTopWidth: 2,
    borderTopColor: '#333',
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  columnHeader: {
    width: '36%',
    textAlign: 'center',
  },
  columnTestCase: {
    width: '28%',
  },
  columnExpected: {
    width: '18%',
    textAlign: 'center',
  },
  columnActual: {
    width: '18%',
    textAlign: 'center',
  },
  clickableTitleContainer: {
    width: '28%',
    justifyContent: 'center',
    paddingRight: 5,
  },
  titleText: {
    fontSize: 10,
    color: '#007AFF',
    textAlign: 'left',
  },
  expectedContainer: {
    width: '18%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    width: '18%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
});
