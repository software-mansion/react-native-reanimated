// @refresh reset
import { useEffect, useRef, useLayoutEffect } from 'react';
import AnimatedSharedValue from '../core/AnimatedSharedValue';
import SharedValue from './SharedValue';
import Worklet from './Worklet';
import WorkletEventHandler from './WorkletEventHandler';

// returns [obj, release]
function makeShareable(obj, wrap) { // reimplement when adding SharedObject, SharedArray 
  const toRelease = [];

  if ((!(obj instanceof SharedValue)) && (!(obj instanceof AnimatedSharedValue))) {
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
  
  if (obj instanceof AnimatedSharedValue || obj instanceof SharedValue) {
    if (wrap && obj instanceof SharedValue) {
      obj = new AnimatedSharedValue(obj);          
    } 
    if ((!wrap) && obj instanceof AnimatedSharedValue) {
      obj = obj.sharedValue;
    }
  } 

  const release = () => {
    for (let rel of toRelease) {
      rel();
    }
  }

  return [obj, release];
}

function transformArgs(args, wrap) {
  if (!wrap) {
    wrap = false;
  }

  const toRelease = [];
  for (let i = 0; i < args.length; i++) {
    const [sv, release] = makeShareable(args[i], wrap);
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
  let release = () => {};

  const init = () => {
    console.log('init');
    [sv.current, release] = makeShareable(initial, true);
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