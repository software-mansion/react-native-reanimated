Jest tests in `__tests__` now resolve the same web-only modules as the library code, so a spy on such a module reaches the instance the library uses.
