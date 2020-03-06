import { useEffect, useRef } from 'react';
import AnimatedSharedValue from '../core/AnimatedSharedValue';
import SharedValue from './SharedValue';
import Worklet from './Worklet';
import WorkletEventHandler from './WorkletEventHandler';

function transformArgs(args) {
  const toRelease = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] instanceof AnimatedSharedValue) {
      args[i] = args[i].sharedValue;
    } else if (args[i].isWorklet || (!(args[i] instanceof SharedValue))) {
      args[i] = new SharedValue(args[i]);
      const sv = args[i];
      toRelease.push(() => {
        sv.release();
      });
    }
  }
  return () => {
    for (let release of toRelease) {
      release();
    }
  };
}

function commonCode(body, args, deps, createRes) {
  const res = useRef(null);
  const firstEffect = useRef(true);

  const init = function() {
    let argsCopy = args.slice();
    let shouldReleaseWorklet = false;
    if (typeof body === "function") {
      shouldReleaseWorklet = true;
      body = new Worklet(body);
    }
    const release = transformArgs(argsCopy);
    let releaseApplierHolder = {get:() => {}};

    res.current = createRes(releaseApplierHolder, body, argsCopy);

    res.current.setListener = (fun) => { body.setListener(fun); };
    res.current.isWorklet = true;
    res.current.body = body;
    res.current.args = argsCopy;
    return { shouldReleaseWorklet, releaseApplierHolder, release, body };
  }

  let releaseObj = null;

  if (res.current == null) {
    releaseObj = init()
  }

  useEffect(()=>{
    if (firstEffect.current) {
      firstEffect.current = false;
      releaseObj = init();
    }

    return () => {
      (releaseObj.releaseApplierHolder.get)();
      releaseObj.release();
      if (releaseObj.shouldReleaseWorklet) {
        releaseObj.body.release();
      }
    }
  }, deps);

  return res.current;
}

export function useWorklet(body, args, deps) {
  return commonCode(body, args, deps, (releaseApplierHolder, body, argsCopy) => {
    return () => {
      releaseApplierHolder.get = body.apply(argsCopy);
    };
  });
}

export function useEventWorklet(body, args, deps) {
  return commonCode(body, args, deps, (releaseApplierHolder, body, argsCopy) => {
    return new WorkletEventHandler(body, argsCopy);
  });
}

export function useSharedValue(initial) {
  const sv = useRef(null);
  if (sv.current === null) {
    sv.current = new AnimatedSharedValue(new SharedValue(initial))
  }
  useEffect(() => {
      return () => sv.current.sharedValue.release();
  }, []);
  return sv.current;
}