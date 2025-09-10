export type PerformanceMonitorProps = {
    /**
     * Sets amount of previous frames used for smoothing at highest expectedFps.
     *
     * Automatically scales down at lower frame rates.
     *
     * Affects jumpiness of the FPS measurements value.
     */
    smoothingFrames?: number;
};
/**
 * A component that lets you measure fps values on JS and UI threads on both the
 * Paper and Fabric architectures.
 *
 * @param smoothingFrames - Determines amount of saved frames which will be used
 *   for fps value smoothing.
 */
export declare function PerformanceMonitor({ smoothingFrames, }: PerformanceMonitorProps): import("react").JSX.Element;
//# sourceMappingURL=PerformanceMonitor.d.ts.map