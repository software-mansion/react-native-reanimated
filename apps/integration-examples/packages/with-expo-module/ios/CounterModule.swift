import ExpoModulesCore
import ExpoModulesWorklets

public final class CounterModule: Module {
  private let lock = NSLock()
  private var count = 0
  private var lastListenerId = 0
  private var listeners: [Int: Worklet] = [:]
  private var timer: DispatchSourceTimer?
  private var frameListeners: [Int: Worklet] = [:]
  private var displayLink: CADisplayLink?

  public func definition() -> ModuleDefinition {
    Name("WithExpoModuleCounter")

    Function("getCount") { () -> Int in
      return lock.withLock { count }
    }

    Function("addWorkletListener") { (worklet: Worklet) -> Int in
      return lock.withLock {
        lastListenerId += 1
        listeners[lastListenerId] = worklet
        return lastListenerId
      }
    }

    Function("removeWorkletListener") { (id: Int) in
      lock.withLock { listeners[id] = nil }
    }

    Function("addFrameWorkletListener") { (worklet: Worklet) -> Int in
      let id = lock.withLock {
        lastListenerId += 1
        frameListeners[lastListenerId] = worklet
        return lastListenerId
      }
      DispatchQueue.main.async { [weak self] in
        self?.updateDisplayLink()
      }
      return id
    }

    Function("removeFrameWorkletListener") { (id: Int) in
      lock.withLock { frameListeners[id] = nil }
      DispatchQueue.main.async { [weak self] in
        self?.updateDisplayLink()
      }
    }

    OnCreate {
      startCounter()
    }

    OnDestroy {
      timer?.cancel()
      lock.withLock {
        listeners.removeAll()
        frameListeners.removeAll()
      }
      DispatchQueue.main.async { [weak self] in
        self?.updateDisplayLink()
      }
    }
  }

  private func startCounter() {
    let timer = DispatchSource.makeTimerSource(queue: .global(qos: .userInteractive))
    timer.schedule(deadline: .now(), repeating: .milliseconds(16))
    timer.setEventHandler { [weak self] in
      self?.tick()
    }
    timer.resume()
    self.timer = timer
  }

  private func tick() {
    let newCount = lock.withLock {
      count += 1
      return count
    }
    DispatchQueue.main.async { [weak self] in
      self?.runWorklets(with: newCount)
    }
  }

  private func runWorklets(with newCount: Int) {
    let worklets = lock.withLock { Array(listeners.values) }
    guard !worklets.isEmpty, let runtime = try? appContext?.uiRuntime as? WorkletRuntime else {
      return
    }
    for worklet in worklets {
      worklet.execute(on: runtime, arguments: [newCount])
    }
  }

  private func updateDisplayLink() {
    let shouldRun = lock.withLock { !frameListeners.isEmpty }
    if shouldRun, displayLink == nil {
      let target = DisplayLinkTarget { [weak self] displayLink in
        guard let self else {
          displayLink.invalidate()
          return
        }
        self.runFrameWorklets()
      }
      let displayLink = CADisplayLink(target: target, selector: #selector(DisplayLinkTarget.onFrame(_:)))
      displayLink.add(to: .main, forMode: .common)
      self.displayLink = displayLink
    } else if !shouldRun {
      displayLink?.invalidate()
      displayLink = nil
    }
  }

  private func runFrameWorklets() {
    let (currentCount, worklets) = lock.withLock { (count, Array(frameListeners.values)) }
    guard let runtime = try? appContext?.uiRuntime as? WorkletRuntime else {
      return
    }
    for worklet in worklets {
      worklet.execute(on: runtime, arguments: [currentCount])
    }
  }
}

private final class DisplayLinkTarget: NSObject {
  private let frame: (CADisplayLink) -> Void

  init(_ frame: @escaping (CADisplayLink) -> Void) {
    self.frame = frame
  }

  @objc func onFrame(_ displayLink: CADisplayLink) {
    frame(displayLink)
  }
}
