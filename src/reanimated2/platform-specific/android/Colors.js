/**@module android/colors */

/**
 * on Android color is represented as signed 32 bit int
 * @param {int} c color in RGB
 * @return {int} 32bit int
 */
export const colorTo32bitInt = c => {
    return c < (1 << 31) >>> 0 ? c : c - Math.pow(2, 32);
}

/**
 * Android use 32 bit *signed* integer to represent the color
 * We utilize the fact that bitwise operations in JS also operates on
 * signed 32 bit integers, so that we can use those to convert from
 * *unsigned* to *signed* 32bit int that way.
 * @param {int} unsigned32bit 
 * @return {int} signed 32bit int
 */
export const convertToSigned = unsigned32bit => {
    return unsigned32bit | 0x0;
}

