// Important note: start() and stop() will only be called at most once.
// Once an animation has been stopped or finished its course, it will
// not be reused.
class Animation {
  start(fromValue, onUpdate, onEnd, previousAnimation, animatedValue) {}
  stop() {}
}

export default Animation;
