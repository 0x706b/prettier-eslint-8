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
exports.getInferredPrettierConfig = void 0;
const function_1 = require("fp-ts/function");
const O = __importStar(require("fp-ts/Option"));
const R = __importStar(require("fp-ts/Record"));
const Str = __importStar(require("fp-ts/string"));
const ConfigConversions_1 = require("./ConfigConversions");
const RV = __importStar(require("./RuleValue"));
function getInferredPrettierConfig(eslintRules, prettierOptions, prettierFallbackOptions) {
    const prettierPluginOptions = RV.fromEslintRulesRecord('prettier/prettier')(eslintRules);
    if (RV.isValue(prettierPluginOptions) && typeof prettierPluginOptions.value === 'object') {
        // eslint-disable-next-line no-param-reassign
        prettierOptions = { ...prettierOptions, ...prettierPluginOptions.value };
    }
    return (0, function_1.pipe)(ConfigConversions_1.configConversions, R.reduceWithIndex(Str.Ord)(prettierOptions, (k, options, { ruleValue, ruleValueToPrettierOption }) => {
        const eslintRuleValue = ruleValue(eslintRules);
        return (0, function_1.pipe)(ruleValueToPrettierOption(eslintRuleValue, prettierFallbackOptions), O.match(() => options, (opt) => ({
            ...options,
            [k]: opt,
        })));
    }));
}
exports.getInferredPrettierConfig = getInferredPrettierConfig;
