# Overview

Bundle Mode is a feature that gives worklets access to your whole JavaScript bundle - meaning that any code that's present in the bundle can be executed in any worklet and on any runtime. This means that third party libraries can be used in worklets without the need to patch them. It's also a performance improvement as worklets' code can benefit from all the optimizations that pre-compiled bytecode offers.

**Bundle Mode is considered stable as of version 0.10.0.**

**Bundle Mode will be the default way of using worklets in the future.**

Instructions on how to enable it can be found [here](/docs/bundleMode/setup).

## Legacy Eval Mode

The former way of using worklets - where each worklet is serialized as a string and evaluated individually on the Worklet Runtime - is referred to as **Legacy Eval Mode**. It's still the default mode of running worklets, but we strongly recommend opting out of it with the Bundle Mode.
