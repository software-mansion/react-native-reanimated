# Hermes Runtime initialization

_Last updated_: 13/09/2022 by @Kwasow

This document describes the current way of initializing Hermes and connecting
it to the debugger. The work I did was mainly based on
(HermesExecutorFactory.cpp)[https://github.com/facebook/react-native/blob/6fcfe2e1b35e9bdf319bcdc1647c8c0d997b58c7/ReactCommon/hermes/executor/HermesExecutorFactory.cpp]
from React Native.

**TODO**