/**@module web/colors */

/**
 * 
 * @param {int} r value of red channel in range 0 to 255
 * @param {int} g value of green channel in range 0 to 255
 * @param {int} b value of blue channel in range 0 to 255
 * @param {float} alpha value of alpha-channel (transperancy) in range 0 to 1
 * @return {string} css specific property of color in rgba(r, g, b, alpha, format)
 */
export const webRGB = (r, g, b, alpha) => {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
