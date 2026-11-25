Keep running the other `requestAnimationFrame` callbacks of a frame on Worker Runtimes when one of them throws, and stop leaking timer callbacks that throw.
