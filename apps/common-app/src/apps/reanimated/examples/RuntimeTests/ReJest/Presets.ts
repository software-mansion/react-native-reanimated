// #region numbers
const INTEGERS = [
  -1000000000, -1234567, -1000000, -1000, -10, -5, -3, -2, -1, -0, 0, +0, 1, 2, 3, 5, 10, 1000, 1000000, -1234567,
  1000000000,
];

const FLOATS = [
  -1000000000.1234567, -1234567.1234567, -1000000.1234567, -1000.1234567, -10.1234567, -5.1234567, -3.1234567,
  -2.1234567, -1.1234567, -0.1234567, 0.1234567, 1.1234567, 2.1234567, 3.1234567, 5.1234567, 10.1234567, 1000.1234567,
  1000000.1234567, -1234567.1234567, 1000000000.1234567,
];

const ENGINEERING_NOTATION = [
  -9.275686287246587e38, -1234567e-7, -1000000e-7, -1000e-7, -10e-7, -5e-7, -3e-7, -2e-7, -1e-7, -0e-7,
  -1.0780873447336499e-39, 1.0780873447336499e-39, 1e-7, 2e-7, 3e-7, 5e-7, 10e-7, 1000e-7, 1000000e-7, -1234567e-7,
  1000000000e-7, 9.275686287246587e38,
];

const HEXADECIMAL_NOTATION = [0xff, 0xab1234, 0x123456, 0xffbbdd, 0x8989aaaa, 0x1234567890abcd];

const BINARY_NOTATION = [0b1111111, 0b101010, 0b0001, 0b11001, 0b1111111111111111111111111111111111111111111111111111];

const OCTADECIMAL_NOTATION = [0o123456, 0o111111112];

const BIG_INTS = [
  BigInt(1234567891234567),
  BigInt(Number.MAX_VALUE),
  BigInt('0'),
  BigInt('1'),
  BigInt(-1),
  BigInt(-123456789),
  BigInt('9007199254740991'),
  BigInt('0x1fffffffffffff'),
  BigInt('0o377777777777777777'),
  BigInt('0b11111111111111111111111111111111111111111111111111111'),
];

const UNDERSCORE_SEPARATED_NUMBES = [
  0b00_000_000_000_000_000_000_000_000_000_001, -1.07808734473_36499e-3_9, 1_0_00000000.1234567,
  0b000000000_000000000000000000_0001,
];

const EXTREME_NUMBERS = [
  Number.MAX_SAFE_INTEGER,
  Number.MIN_SAFE_INTEGER,
  Number.MAX_VALUE,
  Number.MIN_VALUE,
  Number.EPSILON,
];

const NOT_NUMBERS = [Infinity, -Infinity, NaN];
// #endregion

// #region strings
const TYPICAL_STRINGS = ['Aaaaaaa\n \t\t \v aaaaaa', 'Super long'.repeat(10000000), '', 'A string primitive'];

// eslint-disable-next-line no-new-wrappers
const STRING_OBJECTS = [new String('A String object')];

const EMOJI_STRINGS = ['Emoji consisting of multiple sub-emojis 👨‍👨‍👧‍👦', '👨‍👨‍👧‍👦', '😎', '👩🏽‍🏫'];

const COMMON_CHARS_AND_LIGATURES = [
  'π',
  'Number π is commonly used in math',
  'π ≈ 3.14',
  'The answer is 2±1',
  'ff may be written with ligature ﬀ',
  '1ﬆ May',
  '1 / 2 = ½',
  'Some fractions can be typed with single chars: ⅓, ⅔ and ½',
  'Naïve',
];

const NON_DEFAULT_ALPHABETS = ['你好的話', 'ሰላም ቃላት', 'Բարև խոսքեր', 'Cześć świecie!'];

const MISC_CHARACTERS = [
  '𝕳𝖊𝖑𝖑𝖔 𝖜𝖔𝖗𝖉',
  '​🇭​​🇪​​🇱​​🇱​​🇴​ ​🇼​​🇴​​🇷​​🇩',
  '🄷🄴🄻🄻🄾 🅆🄾🅁🄳',
  '𝐇𝐞𝐥𝐥𝐨 𝐰𝐨𝐫𝐝',
  '【H】【e】【l】【l】【o】 【w】【o】【r】【d】【!】',
  '✿༺ 𝐻𝑒𝓁𝓁𝑜 𝓌𝑜𝓇𝒹 ༻✿',
  '꧁༺ 𝓗𝓮𝓵𝓵𝓸 𝔀𝓸𝓻𝓭 ༻꧂',
  '🅷🅴🅻🅻🅾 🆆🅾🆁🅳',
  '🅗🅔🅛🅛🅞 🅦🅞🅡🅓',
];
// #endregion

// #region bufferArrays
const iterable = (function* () {
  yield* [1, 2, 3];
})();

const UINT_ARRAYS = [
  new Uint8Array(2),
  new Uint8Array(iterable),
  new Uint8Array([1, 2, 3, 4, 5, 6]),

  new Uint8ClampedArray(2),
  new Uint8ClampedArray(iterable),
  new Uint8ClampedArray([1, 2, 3, 4, 5, 6]),

  new Uint16Array(2),
  new Uint16Array(iterable),
  new Uint16Array([1, 2, 3, 4, 5, 6]),

  new Uint32Array(2),
  new Uint32Array(iterable),
  new Uint32Array([1, 2, 3, 4, 5, 6]),
];

const INT_ARRAYS = [
  new Int8Array(2),
  new Int8Array([1, 2, 3, 4, 5, 6]),
  new Int8Array(iterable),

  new Int16Array(2),
  new Int16Array([1, 2, 3, 4, 5, 6]),
  new Int16Array(iterable),

  new Int32Array(2),
  new Int32Array([1, 2, 3, 4, 5, 6]),
  new Int32Array(iterable),
];

const FLOAT_ARRAYS = [
  new Float32Array(2),
  new Float32Array([1, 2, 3, 4, 5, 6]),
  new Float32Array(iterable),

  new Float64Array(2),
  new Float64Array([1, 2, 3, 4, 5, 6]),
  new Float64Array(iterable),
];

const BUFFER_ARRAYS = [new ArrayBuffer(8), new ArrayBuffer(0)];
// #endregion

const EMPTIES = [[], null, undefined, {}, [[]], [{}], [null]];

// eslint-disable-next-line symbol-description
const SYMBOLS = [Symbol('Hello!'), Symbol(123), Symbol()];

const DATES = [
  new Date('2012-05-24'),
  Intl.DateTimeFormat(navigator.language),
  new Date('December 17, 1995 03:24:00'),
  new Date(),
  new Date(1999, 11),
  new Date(1999, 11, 24),
  new Date(1999, 11, 17),
  new Date(1999, 11, 17, 33),
  new Date(1999, 11, 17, 33, 54),
  new Date(1999, 11, 17, 33, 54, 12),
  new Date(1999, 120, 17, 33, 54, 12),
];

// eslint-disable-next-line prefer-regex-literals
const REGEXPS = [/ab+c/i, new RegExp('ab+c', 'i'), new RegExp(/ab+c/, 'i'), /\d/y];

// const MAX_SIZE_OF_ARRAY = Math.pow(2, 31) - 1;
const MAX_SIZE_OF_ARRAY = 1000;

const NUMERICAL_ARRAYS = [
  Array.from(Array(MAX_SIZE_OF_ARRAY).keys()),
  [[[[[[[[[[[[[[[[[[1], 2], 3], 4], 5], 6], 7], 8], 9], [[[[], 10]]]]]]]]]]]],
];
const VARIOUS_TYPE_ARRAYS = [
  ['a', 123],
  [1, 2, 3, ['A', 'B', 'C', 'D']],
  [1, 2, 3, [{ A: 'A' }, 'B', 'C', 'D']],
  [1, 2, 3, [{ A: ['A'] }, 'B', 'C', 'D']],
  [null, 2, 3, ['A', [[[null]]], 'B', 'C', 'D']],
  [null, undefined, [undefined, [[[null]]], undefined], [[], []]],
  [null, undefined, [{}, [[[null]]], undefined], [[], []]],
];

const OBJECTS = [
  { [Symbol('a')]: 'a' },
  { [Symbol('b')]: 'a', [Symbol('b')]: 'a' },
  { [Symbol('c')]: Symbol('d') },
  { [Symbol('e')]: Symbol('e') },
  { a: undefined, b: [[[[]]]] },
  { a: null, b: { c: null } },
  { a: { b: { c: { d: { e: 1 } } } } },
];

const myMap = new Map();

myMap.set('a', 1);
myMap.set('b', 2);
myMap.set('c', 3);

const MAPS = [myMap];
const SETS = [new Set([1, 2, 3])];

export const Presets = {
  numbers: [
    ...INTEGERS,
    ...FLOATS,
    ...ENGINEERING_NOTATION,
    ...EXTREME_NUMBERS,
    ...NOT_NUMBERS,
    ...HEXADECIMAL_NOTATION,
    ...BINARY_NOTATION,
    ...OCTADECIMAL_NOTATION,
    ...UNDERSCORE_SEPARATED_NUMBES,
  ],
  bigInts: BIG_INTS,
  strings: [
    ...TYPICAL_STRINGS,
    ...EMOJI_STRINGS,
    ...COMMON_CHARS_AND_LIGATURES,
    ...NON_DEFAULT_ALPHABETS,
    ...MISC_CHARACTERS,
  ],
  stringObjects: [...STRING_OBJECTS],
  symbols: SYMBOLS,
  regexps: REGEXPS,
  dates: DATES,
  serializableObjects: [...OBJECTS, ...EMPTIES, ...REGEXPS],
  unserializableObjects: [...MAPS, ...SETS],
  serializableArrays: [...NUMERICAL_ARRAYS, ...VARIOUS_TYPE_ARRAYS],
  arrays: [...INT_ARRAYS, ...UINT_ARRAYS, ...FLOAT_ARRAYS, ...NUMERICAL_ARRAYS, ...BUFFER_ARRAYS],
};
