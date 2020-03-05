
function transformArgs(args) {
  const toRelease = [];
  for (i = 0; i < args.length; i++) {
    if (args[i] instanceof AnimatedSharedValue) {
      args[i] = args[i].SharedValue;
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
  const res = useRef(()=>{});
  
  useEffect(()=>{
    let argsCopy = args.slice();
    const shouldReleaseWorklet = false;
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

    return () => {
      (releaseApplierHolder.get)();
      release();
      if (shouldReleaseWorklet) {
        worklet.current.release();
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
    return new WorkletEventHandler(body, args);
  });
}

export function useSharedValue(initial) {
  const sv = React.useRef(null)
  React.useEffect(() => {
      sv.current = new AnimatedSharedValue(new SharedValue(initial))
      return () => sv.current.release()
  }, [])
  return sv.current
}
