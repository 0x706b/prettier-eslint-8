"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configConversions = void 0;
const function_1 = require("fp-ts/function");
const O = __importStar(require("fp-ts/Option"));
const R = __importStar(require("fp-ts/Record"));
const RV = __importStar(require("./RuleValue"));
const printWidth = {
    ruleValue: RV.fromEslintRulesRecord('max-len', 'code'),
    ruleValueToPrettierOption: makePrettierOption('printWidth'),
};
const tabWidth = {
    ruleValue: (rules) => {
        let indent = RV.fromEslintRulesRecord('indent')(rules);
        if (RV.isValue(indent) && indent.value === 'tab') {
            indent = RV.fromEslintRulesRecord('max-len', 'tabWidth')(rules);
        }
        return indent;
    },
    ruleValueToPrettierOption: makePrettierOption('tabWidth'),
};
const singleQuote = {
    ruleValue: RV.fromEslintRulesRecord('quotes'),
    ruleValueToPrettierOption: (value, fallbacks) => {
        let prettierValue;
        if (RV.isValue(value)) {
            if (value.value === 'single') {
                prettierValue = RV.Value(true);
            }
            else {
                prettierValue = RV.Value(false);
            }
        }
        else {
            prettierValue = value;
        }
        return makePrettierOption('singleQuote')(prettierValue, fallbacks);
    },
};
const trailingComma = {
    ruleValue: RV.fromEslintRulesRecord('comma-dangle'),
    ruleValueToPrettierOption: (value, fallbacks) => {
        let prettierValue;
        if (RV.isValue(value)) {
            if (value.value === 'none') {
                prettierValue = RV.Value('never');
            }
            else if (typeof value.value === 'string' && value.value.indexOf('always') === 0) {
                prettierValue = RV.Value('es5');
            }
            else {
                prettierValue = RV.NotConfigured;
            }
        }
        else {
            prettierValue = RV.NotConfigured;
        }
        return makePrettierOption('trailingComma')(prettierValue, fallbacks);
    },
};
const bracketSpacing = {
    ruleValue: RV.fromEslintRulesRecord('object-curly-spacing'),
    ruleValueToPrettierOption: (value, fallbacks) => makePrettierOption('bracketSpacing')(ruleValueToBoolean(value), fallbacks),
};
const semi = {
    ruleValue: RV.fromEslintRulesRecord('semi'),
    ruleValueToPrettierOption: (value, fallbacks) => makePrettierOption('semi')(ruleValueToBoolean(value), fallbacks),
};
const useTabs = {
    ruleValue: RV.fromEslintRulesRecord('indent'),
    ruleValueToPrettierOption: (value, fallbacks) => {
        let prettierValue;
        if (RV.isValue(value) && value.value === 'tab') {
            prettierValue = RV.Value(true);
        }
        else {
            prettierValue = RV.NotConfigured;
        }
        return makePrettierOption('useTabs')(prettierValue, fallbacks);
    },
};
const bracketSameLine = {
    ruleValue: RV.fromEslintRulesRecord('react/jsx-closing-bracket-location', 'nonEmpty'),
    ruleValueToPrettierOption: (value, fallbacks) => {
        let prettierValue;
        if (RV.isValue(value)) {
            if (value.value === 'after-props') {
                prettierValue = RV.Value(true);
            }
            else if (value.value === 'tag-aligned' ||
                value.value === 'line-aligned' ||
                value.value === 'props-aligned') {
                prettierValue = RV.Value(false);
            }
            else {
                prettierValue = value;
            }
        }
        else {
            prettierValue = value;
        }
        return makePrettierOption('bracketSameLine')(prettierValue, fallbacks);
    },
};
const arrowParens = {
    ruleValue: RV.fromEslintRulesRecord('arrow-parens'),
    ruleValueToPrettierOption: (value, fallbacks) => makePrettierOption('arrowParens')(RV.isValue(value) && value.value === 'as-needed' ? RV.Value('avoid') : value, fallbacks),
};
exports.configConversions = {
    printWidth,
    tabWidth,
    singleQuote,
    trailingComma,
    bracketSpacing,
    semi,
    useTabs,
    bracketSameLine,
    arrowParens,
};
function makePrettierOption(name) {
    return (value, fallbacks) => {
        if (RV.isValue(value)) {
            return O.some(value.value);
        }
        return (0, function_1.pipe)(fallbacks, R.lookup(name));
    };
}
function ruleValueToBoolean(ruleValue) {
    if (RV.isValue(ruleValue)) {
        if (ruleValue.value === 'always') {
            return RV.Value(true);
        }
        else if (ruleValue.value === 'never') {
            return RV.Value(false);
        }
    }
    return ruleValue;
}
