declare module 'react-native-reanimated' {
	namespace Animated {
		export class Node {
		}

		export class Value extends Node {
			constructor(value?: number);
			setValue(value: NodeOrBlock): void;
			interpolate(config: InterpolateConfig): Node;
		}

		export class Clock extends Value {
			start(): void;
			stop(): void;
			isStarted(): boolean;
		}

		export enum Extrapolate {
			EXTEND = "extend",
			CLAMP = "clamp",
			IDENTITY = "identity"
		}

		export interface InterpolateConfig {
			inputRange: (number | Node)[];
			outputRange: (number | Node)[];
			easing?: ((input: number) => number);
			extrapolate?: Extrapolate;
			extrapolateLeft?: Extrapolate;
			extrapolateRight?: Extrapolate;
		}

		export type NodeOrBlock = number | Node | (number | Node)[];
		type SingleOperator = (a: NodeOrBlock) => Node;
		type InfixOperator = (a: NodeOrBlock, b: NodeOrBlock) => Node;
		type MultiOperator = (a: NodeOrBlock, b: NodeOrBlock, ...others: NodeOrBlock[]) => Node;
		type Mapping = { [key: string]: Mapping } | Value;

		export const add: MultiOperator;
		export const sub: MultiOperator;
		export const multiply: MultiOperator;
		export const divide: MultiOperator;
		export const pow: MultiOperator;
		export const modulo: MultiOperator;
		export const sqrt: SingleOperator;
		export const sin: SingleOperator;
		export const cos: SingleOperator;
		export const exp: SingleOperator;
		export const round: SingleOperator;
		export const lessThan: InfixOperator;
		export const eq: InfixOperator;
		export const greaterThan: InfixOperator;
		export const lessOrEq: InfixOperator;
		export const greaterOrEq: InfixOperator;
		export const neq: InfixOperator;
		export const and: MultiOperator;
		export const or: MultiOperator;
		export const defined: SingleOperator;
		export const not: SingleOperator;
		export const abs: SingleOperator;
		export const acc: SingleOperator;
		export const diff: SingleOperator;
		export const min: InfixOperator;
		export const max: InfixOperator;

		export function diffClamp(a: NodeOrBlock, minVal: NodeOrBlock, maxVal: NodeOrBlock): Node;
		export function color(r: NodeOrBlock, g: NodeOrBlock, b: NodeOrBlock, a?: NodeOrBlock): Node;
		export function interpolate(value: NodeOrBlock, config: InterpolateConfig): Node;

		export function set(what: Value, value: NodeOrBlock): Node;
		export function cond(cond: NodeOrBlock, ifBlock: NodeOrBlock, elseBlock?: NodeOrBlock): Node;
		export function block(items: (number | Node)[]): Node;
		export function call(args: (number | Node)[], func: (args: number[]) => void): Node;
		export function debug(message: string, value: NodeOrBlock): Node;
		export function startClock(clock: Clock): Node;
		export function stopClock(clock: Clock): Node;
		export function clockRunning(clock: Clock): Node;
		export function event(argMapping: Mapping[]): Node;

		export interface BackwardCompatibleAnimation {
			start(callback?: (result: { finished: boolean }) => void): void;
			stop(): void;
		}

		export interface DecayState {
			finished: Value;
			position: Value;
			velocity: Value;
			time: Value;
		}
		export interface DecayConfig {
			deceleration: NodeOrBlock;
		}
		export function decay(clock: Clock, state: DecayState, config: DecayConfig): Node;
		export function decay(value: Value, config: DecayConfig): BackwardCompatibleAnimation;

		export interface TimingState {
			finished: Value;
			position: Value;
			time: Value;
			frameTime: Value;
		}
		export interface TimingConfig {
			toValue: NodeOrBlock;
			duration: NodeOrBlock;
			easing: EasingFunction;
		}
		export function timing(clock: Clock, state: TimingState, config: TimingConfig): Node;
		export function timing(value: Value, config: TimingConfig): BackwardCompatibleAnimation;

		export interface SpringState {
			finished: Value;
			position: Value;
			velocity: Value;
			time: Value;
		}
		export interface SpringConfig {
			toValue: NodeOrBlock;
			damping: NodeOrBlock;
			mass: NodeOrBlock;
			stiffness: NodeOrBlock;
			overshootClamping: boolean;
			restSpeedThreshold: number;
			restDisplacementThreshold: number;
		}
		export function spring(clock: Clock, state: SpringState, config: SpringConfig): Node;
		export function spring(value: Value, config: SpringConfig): BackwardCompatibleAnimation;

		export const View: any;
		export const Image: any;
		export const Text: any;
		export const ScrollView: any;
	}

	type EasingFunction = (input: Animated.NodeOrBlock) => Animated.Node;

	export class Easing {
		static linear: EasingFunction;
		static ease: EasingFunction;
		static quad: EasingFunction;
		static cubic: EasingFunction;
		static poly(n: number): EasingFunction;
		static sin: EasingFunction;
		static circle: EasingFunction;
		static exp: EasingFunction;
		static elastic(bounciness?: number): EasingFunction;
		static back(s?: number): EasingFunction;
		static bounce: EasingFunction;
		static bezier(x1: number, y1: number, x2: number, y2: number): EasingFunction;
		static in(easing: EasingFunction): EasingFunction;
		static out(easing: EasingFunction): EasingFunction;
		static inOut(easing: EasingFunction): EasingFunction;
	}

	export default Animated;
}