import Darwin
import os
import UIKit

final class ProcessReporter {
  private static let traceLog = OSLog(subsystem: "com.reanimatedbenchmark", category: .dynamicTracing)
  private static let stateInterval = DispatchTimeInterval.seconds(1)

  private let screen: UIScreen
  private let stateTimer = DispatchSource.makeTimerSource(queue: .main)
  private var firstFrameLink: CADisplayLink?

  init(screen: UIScreen) {
    self.screen = screen
  }

  func start() {
    UIDevice.current.isBatteryMonitoringEnabled = true
    let link = CADisplayLink(target: self, selector: #selector(reportLaunch))
    link.add(to: .main, forMode: .common)
    firstFrameLink = link
    stateTimer.schedule(deadline: .now(), repeating: Self.stateInterval)
    stateTimer.setEventHandler { [unowned self] in traceState() }
    stateTimer.resume()
  }

  @objc private func reportLaunch() {
    firstFrameLink?.invalidate()
    firstFrameLink = nil
    guard let coldStart = millisecondsSinceProcessStart() else {
      return
    }
    var mainThread: UInt64 = 0
    pthread_threadid_np(nil, &mainThread)
    let line = String(
      format: "LAUNCH pid=%d mainThread=%llu refreshRate=%ld thermal=%ld coldStart=%.3f",
      getpid(), mainThread, screen.maximumFramesPerSecond,
      ProcessInfo.processInfo.thermalState.rawValue, coldStart
    )
    print("ReanimatedBenchmark: \(line)")
    fflush(stdout)
  }

  private func traceState() {
    guard Self.traceLog.signpostsEnabled, let footprint = footprintKilobytes() else {
      return
    }
    let device = UIDevice.current
    os_signpost(
      .event, log: Self.traceLog, name: "State",
      "footprint=%llu thermal=%ld batteryLevel=%ld batteryState=%ld lowPower=%ld brightness=%ld",
      footprint,
      ProcessInfo.processInfo.thermalState.rawValue,
      Int((device.batteryLevel * 100).rounded()),
      device.batteryState.rawValue,
      ProcessInfo.processInfo.isLowPowerModeEnabled ? 1 : 0,
      Int((screen.brightness * 100).rounded())
    )
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

  private func footprintKilobytes() -> UInt64? {
    var info = task_vm_info_data_t()
    var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<integer_t>.size)
    let status = withUnsafeMutablePointer(to: &info) { pointer in
      pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
        task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
      }
    }
    return status == KERN_SUCCESS ? info.phys_footprint / 1024 : nil
  }
}
