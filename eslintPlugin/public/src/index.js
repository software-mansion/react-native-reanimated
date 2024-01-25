"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rules = void 0;
const noAnimatedStyleToNonAnimatedComponent_1 = __importDefault(require("./noAnimatedStyleToNonAnimatedComponent"));
exports.rules = {
    'animated-style-non-animated-component': noAnimatedStyleToNonAnimatedComponent_1.default,
};
