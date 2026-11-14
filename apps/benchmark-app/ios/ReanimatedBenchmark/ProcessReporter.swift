import Darwin
import UIKit

final class ProcessReporter {
  private let screen: UIScreen
  private var firstFrameLink: CADisplayLink?

  init(screen: UIScreen) {
    self.screen = screen
  }

  func start() {
    let link = CADisplayLink(target: self, selector: #selector(reportLaunch))
    link.add(to: .main, forMode: .common)
    firstFrameLink = link
  }

  @objc private func reportLaunch() {
    firstFrameLink?.invalidate()
    firstFrameLink = nil
    guard let coldStart = millisecondsSinceProcessStart() else {
      return
    }
    var mainThread: UInt64 = 0
    pthread_threadid_np(nil, &mainThread)
    let sources = Bundle.main.object(forInfoDictionaryKey: "BenchmarkAppSources") as? String ?? ""
    let line = String(
      format: "LAUNCH pid=%d mainThread=%llu refreshRate=%ld thermal=%ld coldStart=%.3f sources=%@",
      getpid(), mainThread, screen.maximumFramesPerSecond,
      ProcessInfo.processInfo.thermalState.rawValue, coldStart, sources
    )
    print("ReanimatedBenchmark: \(line)")
    fflush(stdout)
  }

  private func millisecondsSinceProcessStart() -> Double? {
    var process = kinfo_proc()
    var size = MemoryLayout<kinfo_proc>.stride
    var name = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
    var now = timeval()
    guard sysctl(&name, UInt32(name.count), &process, &size, nil, 0) == 0, gettimeofday(&now, nil) == 0 else {
      return nil
    }
    let start = process.kp_proc.p_starttime
    return Double(now.tv_sec - start.tv_sec) * 1000 + Double(now.tv_usec - start.tv_usec) / 1000
  }
}
