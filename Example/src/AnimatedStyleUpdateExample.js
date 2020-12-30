import {
  useAnimatedStyle,
  runOnJS,
  makeShareable,
  useSharedValue,
  UASMinimal,
} from 'react-native-reanimated';
import { View, Text, Button } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';

function Zerooo() {
  makeShareable(0);

  return <Text>Zerooo</Text>;
}

export function OneMakeShareable() {
  function sth() {}

  class Temp1 {
    constructor(fun) {
      this.fun = fun;
    }
  }

  const ctx = useRef(null);
  if (ctx.current === null) {
    const temp = new Temp1(sth);
    ctx.current = {
      t: makeShareable(temp),
    };
  }

  useEffect(() => {
    return () => {
      ctx.current = undefined;
    };
  }, []);

  return <Text>ONE</Text>;
}

function TwoUAS() {
  function sth() {}

  class Temp2 {
    constructor(fun) {
      this.fun = fun;
    }
  }

  const temp = new Temp2(sth);

  UASMinimal(() => {
    'worklet';
    const x = temp;
  });
  /** /
  useAnimatedStyle(() => {
    runOnJS(temp.fun)();
    return {
      width: 100,
    };
  });
  /**/
  return <Text>Two</Text>;
}

// leak
const ThreeTest = () => {
  function sth() {}
  class Temp31 {
    constructor(fun) {
      this.fun = fun;
    }
  }
  class Temp32 {
    constructor(fun) {
      this.fun = fun;
    }
  }
  const tempc = new Temp31(sth);
  useEffect(() => {
    return () => {
      // tempc.fun = null;
      // tempc = null;
    };
  }, []);
  const wrk = () => {
    'worklet';
    const t = tempc; // leak
    // const o = new Temp32(sth); // no leak
  };

  /**
   * z wyczyszczeniem tego RN czeka na zwolnienie referencji w c++
   * a referencja w c++ jest zwalniana w destruktorze(ktory czeka na wyczyszczenie po stronie js)
   */
  makeShareable(wrk);
  // let x = makeShareable(wrk);
  // x = null;
  return <Text>Three</Text>;
};

// no leak
const FourTest = () => {
  function sth() {}

  class Temp4 {
    constructor(fun) {
      this.fun = fun;
    }
  }

  let shrb = makeShareable(() => {
    'worklet';
    const temp = new Temp4(sth);
  });

  shrb = null;

  return <Text>Four</Text>;
};

export default function App() {
  const [state, setState] = useState(0);

  const states = [0, 2];
  console.log('running example', state);

  return (
    <View>
      <Button
        title="change example"
        onPress={() => {
          const currentIndex = states.indexOf(state);
          const newIndex = (currentIndex + 1) % states.length;
          setState(states[newIndex]);
        }}
      />
      {states.map((item, index) => {
        return (
          <Button
            key={index}
            title={`set example to ${item}`}
            onPress={() => {
              setState(item);
            }}
          />
        );
      })}
      {state === 0 ? (
        <>
          <Text>EMPTY</Text>
        </>
      ) : (
        <></>
      )}
      {state === 1 ? <OneMakeShareable /> : <></>}
      {state === 2 ? <TwoUAS /> : <></>}
      {state === 3 ? <ThreeTest /> : <></>}
      {state === 4 ? <FourTest /> : <></>}
    </View>
  );
}
