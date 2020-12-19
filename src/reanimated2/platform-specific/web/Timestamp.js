/**@module web/Timestamp */

/**
 * Receiving timestamp from browser
 * @return {int} timestamp of a moment of time function was called 
 */
export const getWebTimestamp = () => {
    return window.performance.now();
}