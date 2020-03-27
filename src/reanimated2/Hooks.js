// @refresh reset
import { useEffect, useRef, useLayoutEffect } from 'react';
import SharedValue from './SharedValue';
import Worklet from './Worklet';
import WorkletEventHandler from './WorkletEventHandler';

function isShareable(obj) {
  if (obj instanceof SharedValue) {
    return true;
  }

  // We don't wrap array in SharedValue because we cannot override [] operator. 
  // We add propery instead
  if (Array.isArray(obj)) { 
    if (obj.sharedArray) {
      return true;
    }
  }

  if (obj instanceof SharedValue) {
    return true;
  }

  return false;
}

// returns [obj, release]
function makeShareable(obj) { 
  const toRelease = [];

  if (isShareable(obj)) {
    return [obj, () => {}];
  }

  if (Array.isArray(obj)) {
    let i = 0;
    for (let element of obj) {
      const [res, release] = makeShareable(element);
      obj[i] = res;
      toRelease.push(release);
      i++;
    }

    const sharedArray = SharedValue.create(obj);
    toRelease.push(() => {
      sharedArray.release();
      obj.id = undefined;
      obj.sharedArray = undefined;
    });

    obj.id = sharedArray.id;
    obj.sharedArray = sharedArray;

  } else if (typeof obj === 'object' && (!(obj instanceof Worklet))) {
    for (let property in obj) {
      const [res, release] = makeShareable(obj[property]);
      obj[property] = res;
      toRelease.push(release);
    }
    obj = SharedValue.create(obj);
    toRelease.push(() => {
      obj.release();
    });

  } else {
    let workletHolder = null;
    if (typeof obj === 'function' && obj.isWorklet == null) {
      obj = new Worklet(obj);
      workletHolder = obj;
    }
    obj = SharedValue.create(obj);
    const release = obj.release.bind(obj);
    toRelease.push(function(){
      release();
      if (workletHolder != null) {
        workletHolder.release();
      }
    });
  }

  const release = () => {
    for (let rel of toRelease) {
      rel();
    }
  }

  return [obj, release];
}

function transformArgs(args) {

  const toRelease = [];
  for (let i = 0; i < args.length; i++) {
    const [sv, release] = makeShareable(args[i]);
    args[i] = sv;
    toRelease.push(release);
  }

  return () => {
    for (let release of toRelease) {
      release();
    }
  };
}

function commonCode(body, args, createRes) {
  const res = useRef(null);
  const releaseObj = useRef(null);

  const init = function() {
    console.log('init common code');
    let argsCopy = args.slice();
    let shouldReleaseWorklet = false;
    if (typeof body === "function") {
      shouldReleaseWorklet = true;
      body = new Worklet(body);
    }
    const release = transformArgs(argsCopy);
    let releaseApplierHolder = {get:() => {}};

    res.current = createRes(releaseApplierHolder, body, argsCopy);

    res.current.start = res.current;
    res.current.startMapping = res.current;
    res.current.setListener = (fun) => { body.setListener(fun); };
    res.current.isWorklet = true;
    res.current.body = body;
    res.current.args = argsCopy;
    res.current.stop = () => { (releaseApplierHolder.get)() } ;
    return { shouldReleaseWorklet, releaseApplierHolder, release, body };
  }

  if (res.current == null) {
    releaseObj.current = init()
  }

  useEffect(() => {
    return () => {
      if (!releaseObj.current) return;
      console.log('clear common code');
      (releaseObj.current.releaseApplierHolder.get)();
      releaseObj.current.release();
      if (releaseObj.current.shouldReleaseWorklet) {
        releaseObj.current.body.release();
      }
      res.current = null;
    }
  }, []);

  return res.current;
}

export function useWorklet(body, args) {
  console.log('useWorklet');
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return () => {
      console.log('startAnimation');
      releaseApplierHolder.get = body.apply(argsCopy);
    };
  });
}

export function useMapper(body, args) {
  console.log('useMapper');
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return () => {
      releaseApplierHolder.get = body.registerAsMapper(argsCopy);
    };
  });
}

export function useEventWorklet(body, args) {
  console.log('useEventWorklet');
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return new WorkletEventHandler(body, argsCopy);
  });
}

export function useSharedValue(initial) {
  console.log("useShared"); 
  const sv = useRef(null);
  let release = () => {};

  const init = () => {
    console.log('init');
    [sv.current, release] = makeShareable(initial);
    return release;
  }

  if (sv.current == null) {
    release = init();
  }

  useEffect(() => {
    console.log('sharedValue useEffect');

    return () => {
      if (sv.current) { 
        release();
        sv.current = null;
      }
      console.log("clear");
    }
  }, []);
  
  return sv.current;
}

const styleUpdater = new Worklet(function (input, output) {
  'worklet';
  const newValues = input.body.apply(this, [input.input]);

  const assign = (left, right) => {
    if ((typeof right === 'object') && (!right.value)) {
      for (let key of Object.keys(right)) {
        if (left[key]) {
          assign(left[key], right[key]);
        }
      }

    } else if (Array.isArray(right)) {
      for (let i; i < right.length; i++) {
        assign(left[i], right[i]);
      }

    } else {
      if (left.set) {
        if (right.value) {
          left.set(right.value);
        } else {
          left.set(right);
        }
      }
    }
  }

  assign(output, newValues);
});

function unwrap(obj) {
  if (Array.isArray(obj)) {
    const res = [];
    for (let ele of obj) {
      res.push(unwrap(ele));
    }
    return res;
  }

  const initialValue = obj.initialValue;

  if (typeof initialValue === 'object') {
  
    if (initialValue.isWorklet) { 
      return {start:()=>{}, stop:()=>{}};
    }

    if (initialValue.isFunction) {
      return obj._data;
    }

    if (initialValue.isObject) {
      const res = {};
      for (let propName of initialValue.propNames) {
        res[propName] = unwrap(obj[propName]);
      }
      return res;
    }

  } 

  return { value:initialValue };
}

function copyAndUnwrap(obj) {
  if (Array.isArray(obj)) {
    const res = [];
    for (let ele of obj) {
      res.push(copyAndUnwrap(ele));
    }
    return res;
  }

  if (!obj.initialValue) {
    if (Object.keys(obj).length == 1 && obj.value) {
      return obj.value;
    }
    if (typeof obj === 'object') {
      for (let propName of Object.keys(obj)) {
        obj[propName] = copyAndUnwrap(obj[propName]);
      }  
    }
    return obj;
  }

  if (obj.initialValue.isObject) {
    const res = {};
      for (let propName of initialValue.propNames) {
        res[propName] = copyAndUnwrap(obj[propName]);
      }
      return res;
  }

  // it has to be base shared type
  return obj.initialValue;
}

export function useAnimatedStyle(body, input) {
  const sharedInput = useSharedValue(input);
  const mockInput = unwrap(sharedInput, true);
  console.log("mockInput: " + JSON.stringify(mockInput));
  const pureOutput = body.apply({log:(e)=>{}},[mockInput]);
  console.log("pureoutput: " + JSON.stringify(pureOutput));
  const unwrapedPureOutput  = copyAndUnwrap(pureOutput)
  console.log("unwrapped: " + JSON.stringify(unwrapedPureOutput));
  const output = useSharedValue(unwrapedPureOutput);
  console.log("output: " + JSON.stringify(output));
  const sharedBody = useSharedValue(body);
  const realInput = { input: sharedInput, body: sharedBody};
  const mapper = useMapper(styleUpdater, [realInput, output]);
  mapper.startMapping();
  return output;
}

export function removeSharedObjsAndArrays(obj) {
  if (Array.isArray(obj)) {
    const res = [];
    for (let element of obj) {
      res.push(removeSharedObjsAndArrays(element));
    }
    return res;
  }

  if (typeof obj === 'object') {
    if (obj instanceof SharedValue) {
      if (obj.initialValue.isObject) {

        const res = {};
        for (let propName of obj.initialValue.propNames) {
          res[propName] = removeSharedObjsAndArrays(obj[propName]);
        }
        return res;
      } 
      return obj;
    } else {
      for (let propName of Object.keys(obj)) {
        obj[propName] = removeSharedObjsAndArrays(obj[propName]);
      }
      return obj;
    }
  }

  return obj;
}