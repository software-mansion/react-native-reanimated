export const colorTo32bitInt = c => {
    return c < (1 << 31) >>> 0 ? c : c - Math.pow(2, 32);
}

export const convertToSigned = unsigned32bit => {
    return unsigned32bit | 0x0;
}

