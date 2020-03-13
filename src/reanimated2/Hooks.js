// @refresh reset
import { useEffect, useRef, useLayoutEffect } from 'react';
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

export function useEventWorklet(body, args) {
  console.log('useEventWorklet');
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return new WorkletEventHandler(body, argsCopy);
  });
}

export function useSharedValue(initial) {
  console.log("useShared"); 
  const sv = useRef(null);

  const init = () => {
    console.log('init');
    sv.current = new AnimatedSharedValue(new SharedValue(initial));
  }

  if (sv.current == null) {
    init();
  }

  useEffect(() => {
    console.log('sharedValue useEffect');

    return () => {
      if (sv.current) { 
        sv.current.sharedValue.release();
        sv.current = null;
      }
      console.log("clear");
    }
  }, []);
  
  return sv.current;
}