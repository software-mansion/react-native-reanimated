import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { runOnJS, runOnUI } from 'react-native-reanimated';

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

      <View style={styles.headerRow}>
        <Text style={[styles.headerText, styles.columnTestCase]}>
          Test Case
        </Text>
        <Text style={[styles.headerText, styles.columnExpected]}>Expected</Text>
        <Text style={[styles.headerText, styles.columnActual]}>Actual</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <StringDemo />
        <BooleanDemo />
        <BigIntDemo />
        <NumberDemo />
        <UndefinedDemo />
        <NullDemo />
        <ArrayDemo />
        <ArrayBufferDemo />
        <TypedArrayDemo />
        <BigIntTypedArrayDemo />
        <DataViewDemo />
        <ErrorDemo />
        <CyclicObjectDemo />
        <InaccessibleObjectDemo />
        <RemoteNamedFunctionSyncCallDemo />
        <RemoteAnonymousFunctionSyncCallDemo />
      </ScrollView>
    </View>
  );
}

function useStatus() {
  const [status, setStatus] = useState<Status>(undefined);
  const isOk = () => setStatus('ok');
  const isNotOk = () => setStatus('not_ok');
  const isError = () => setStatus('error');
  return { status, isOk, isNotOk, isError };
}

interface DemoItemRowProps {
  title: string;
  onPress: () => void;
  status: Status;
  expected: Status;
}

const DemoItemRow: React.FC<DemoItemRowProps> = ({
  title,
  onPress,
  status,
  expected,
}) => {
  return (
    <View style={styles.demoRow}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.clickableTitleContainer}>
        <Text style={styles.titleText}>{title}</Text>
      </TouchableOpacity>
      <View style={styles.expectedContainer}>
        <Status status={expected} />
      </View>
      <View style={styles.statusContainer}>
        <Status status={status} />
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
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const testString = 'test';
    runOnUI(() => {
      'worklet';
      try {
        if (testString === 'test') {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function NumberDemo() {
  const title = 'Number';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const number = 123;
    runOnUI(() => {
      'worklet';
      try {
        if (number === 123) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function BooleanDemo() {
  const title = 'Boolean';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const boolTrue = true;
    const boolFalse = false;
    runOnUI(() => {
      'worklet';
      try {
        const checks = [boolTrue === true, boolFalse === false];
        if (checks.every(Boolean)) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function UndefinedDemo() {
  const title = 'Undefined';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const x = undefined;
    runOnUI(() => {
      'worklet';
      try {
        if (x === undefined) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function NullDemo() {
  const title = 'Null';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const x = null;
    runOnUI(() => {
      'worklet';
      try {
        if (x === null) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function ArrayDemo() {
  const title = 'Array';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const array = [1, true, false, null, undefined, 'a', BigInt(123)];
    runOnUI(() => {
      'worklet';
      try {
        const checks = [
          array.length === 7,
          array[0] === 1,
          array[1] === true,
          array[2] === false,
          array[3] === null,
          array[4] === undefined,
          array[5] === 'a',
          array[6] === BigInt(123),
        ];
        if (checks.every(Boolean)) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function CyclicObjectDemo() {
  const title = 'Cyclic object';
  const { status, isOk, isError } = useStatus();
  const expectedStatus: Status = 'error';

  const handlePress = () => {
    try {
      type RecursiveArray = (number | RecursiveArray)[];
      const x: RecursiveArray = [];
      x.push(1);
      x.push(x);
      runOnUI(() => {
        'worklet';
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _test = x[1];
          runOnJS(isOk)();
        } catch (e) {
          runOnJS(isError)();
        }
      })();
    } catch (e) {
      runOnJS(isError)();
    }
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function InaccessibleObjectDemo() {
  const title = 'Inaccessible object';
  const { status, isOk, isError } = useStatus();
  const expectedStatus: Status = 'error';

  const handlePress = () => {
    const x = new Set();
    runOnUI(() => {
      'worklet';
      try {
        x.has(42);
        runOnJS(isOk)();
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function RemoteNamedFunctionSyncCallDemo() {
  const title = 'Remote named function sync call';
  const { status, isOk, isError } = useStatus();
  const expectedStatus: Status = 'error';

  const handlePress = () => {
    function foo() {}
    runOnUI(() => {
      'worklet';
      try {
        foo();
        runOnJS(isOk)();
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function RemoteAnonymousFunctionSyncCallDemo() {
  const title = 'Remote anonymous function sync call';
  const { status, isOk, isError } = useStatus();
  const expectedStatus: Status = 'error';

  const handlePress = () => {
    const foo = () => {};
    runOnUI(() => {
      'worklet';
      try {
        foo();
        runOnJS(isOk)();
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function BigIntDemo() {
  const title = 'BigInt';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const bigint = BigInt('1234567890');
    runOnUI(() => {
      'worklet';
      try {
        const checks = [
          bigint === BigInt('1234567890'),
          typeof bigint === 'bigint',
        ];
        if (checks.every(Boolean)) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function ArrayBufferDemo() {
  const title = 'ArrayBuffer';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const ab = new ArrayBuffer(8);
    const ta = new Uint8Array(ab);
    ta[7] = 42;

    runOnUI(() => {
      'worklet';
      try {
        const isArrayBufferInstance = ab instanceof ArrayBuffer;
        const taUi = new Uint8Array(ab);
        const initialValueCheck = taUi[7] === 42;
        taUi[7] = 123;

        if (isArrayBufferInstance && initialValueCheck) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function TypedArrayDemo() {
  const title = 'TypedArray';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const ta1 = new Int8Array(100);
    const ta2 = new Uint8Array(100);
    const ta3 = new Uint8ClampedArray(100);
    const ta4 = new Int16Array(100);
    const ta5 = new Uint16Array(100);
    const ta6 = new Int32Array(100);
    const ta7 = new Uint32Array(100);
    const ta8 = new Float32Array(100);
    const ta9 = new Float64Array(100);
    ta1[99] = -123;
    ta2[99] = 123;
    ta3[99] = 999;
    ta4[99] = -12345;
    ta5[99] = 12345;
    ta6[99] = -123456789;
    ta7[99] = 123456789;
    ta8[99] = 123.45;
    ta9[99] = 12345.6789;

    runOnUI(() => {
      'worklet';
      try {
        const checks = [
          ta1 instanceof Int8Array,
          ta2 instanceof Uint8Array,
          ta3 instanceof Uint8ClampedArray,
          ta4 instanceof Int16Array,
          ta5 instanceof Uint16Array,
          ta6 instanceof Int32Array,
          ta7 instanceof Uint32Array,
          ta8 instanceof Float32Array,
          ta9 instanceof Float64Array,
          ta1[99] === -123,
          ta2[99] === 123,
          ta3[99] === 255,
          ta4[99] === -12345,
          ta5[99] === 12345,
          ta6[99] === -123456789,
          ta7[99] === 123456789,
          Math.abs(ta8[99] - 123.45) < 1e-5,
          Math.abs(ta9[99] - 12345.6789) < 1e-5,
        ];
        if (checks.every(Boolean)) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function BigIntTypedArrayDemo() {
  const title = 'BigIntTypedArray';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const ta1 = new BigInt64Array(100);
    const ta2 = new BigUint64Array(100);
    ta1[99] = BigInt('-1234567890');
    ta2[99] = BigInt('1234567890');

    runOnUI(() => {
      'worklet';
      try {
        const checks = [
          ta1 instanceof BigInt64Array,
          ta2 instanceof BigUint64Array,
          ta1[99] === BigInt('-1234567890'),
          ta2[99] === BigInt('1234567890'),
        ];
        if (checks.every(Boolean)) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function DataViewDemo() {
  const title = 'DataView';
  const { status, isOk, isNotOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const buffer = new ArrayBuffer(16);
    const dv = new DataView(buffer);
    dv.setInt16(7, 12345);

    runOnUI(() => {
      'worklet';
      try {
        const checks = [dv instanceof DataView, dv.getInt16(7) === 12345];
        if (checks.every(Boolean)) {
          runOnJS(isOk)();
        } else {
          runOnJS(isNotOk)();
        }
      } catch (e) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

function ErrorDemo() {
  const title = 'Error';
  const { status, isOk, isError } = useStatus();
  const expectedStatus: Status = 'ok';

  const handlePress = () => {
    const e = new Error('error message');
    runOnUI(() => {
      'worklet';
      try {
        const checks = [
          e instanceof Error,
          String(e).includes('error message'),
          global._WORKLET,
        ];
        if (checks.every(Boolean)) {
          runOnJS(isOk)();
        } else {
          runOnJS(isError)();
        }
      } catch (err) {
        runOnJS(isError)();
      }
    })();
  };
  return (
    <DemoItemRow
      title={title}
      onPress={handlePress}
      status={status}
      expected={expectedStatus}
    />
  );
}

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
    fontSize: 18,
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
  headerText: {
    fontSize: 16,
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
  columnTestCase: {
    width: '60%',
    paddingRight: 5,
  },
  columnExpected: {
    width: '20%',
    textAlign: 'center',
  },
  columnActual: {
    width: '20%',
    textAlign: 'center',
  },
  clickableTitleContainer: {
    width: '60%',
    justifyContent: 'center',
    paddingRight: 5,
  },
  titleText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'left',
  },
  expectedContainer: {
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
});
