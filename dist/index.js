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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = exports.formatTE = void 0;
const O = __importStar(require("fp-ts/Option"));
const Str = __importStar(require("fp-ts/string"));
const A = __importStar(require("fp-ts/ReadonlyArray"));
const R = __importStar(require("fp-ts/Record"));
const function_1 = require("fp-ts/function");
const fs = __importStar(require("fs"));
const TE = __importStar(require("fp-ts/TaskEither"));
const require_relative_1 = __importDefault(require("require-relative"));
const path_1 = __importDefault(require("path"));
const E = __importStar(require("fp-ts/Either"));
const ruleValue = (value) => ({
    _tag: "Value",
    value,
});
const ruleDisabled = {
    _tag: "Disabled",
};
const ruleNotConfigured = {
    _tag: "NotConfigured",
};
const isValue = (rv) => rv._tag === "Value";
const getRuleValue = (name, key) => (rules) => {
    const rule = rules[name];
    if (Array.isArray(rule)) {
        const [ruleSetting, value] = rule;
        if (ruleSetting === 0 || ruleSetting === "off") {
            return ruleDisabled;
        }
        if (typeof value === "object") {
            if (key) {
                const subValue = value[key];
                return subValue === undefined
                    ? ruleNotConfigured
                    : ruleValue(subValue);
            }
            else {
                return ruleValue(value);
            }
        }
        else {
            return ruleValue(value);
        }
    }
    return ruleNotConfigured;
};
const makePrettierOption = (name) => (value, fallbacks) => {
    if (isValue(value)) {
        return O.some(value.value);
    }
    return (0, function_1.pipe)(fallbacks, R.lookup(name));
};
const eslintToBoolean = (eslintValue) => {
    if (isValue(eslintValue)) {
        if (eslintValue.value === "always") {
            return ruleValue(true);
        }
        else if (eslintValue.value === "never") {
            return ruleValue(false);
        }
    }
    return eslintValue;
};
const configConversions = {
    printWidth: {
        ruleValue: getRuleValue("max-len", "code"),
        ruleValueToPrettierOption: makePrettierOption("printWidth"),
    },
    tabWidth: {
        ruleValue: (rules) => {
            let indent = getRuleValue("indent")(rules);
            if (isValue(indent) && indent.value === "tab") {
                indent = getRuleValue("max-len", "tabWidth")(rules);
            }
            return indent;
        },
        ruleValueToPrettierOption: makePrettierOption("tabWidth"),
    },
    singleQuote: {
        ruleValue: getRuleValue("quotes"),
        ruleValueToPrettierOption: (value, fallbacks) => {
            let prettierValue;
            if (isValue(value)) {
                if (value.value === "single") {
                    prettierValue = ruleValue(true);
                }
                else {
                    prettierValue = ruleValue(false);
                }
            }
            else {
                prettierValue = value;
            }
            return makePrettierOption("singleQuote")(prettierValue, fallbacks);
        },
    },
    trailingComma: {
        ruleValue: getRuleValue("comma-dangle"),
        ruleValueToPrettierOption: (value, fallbacks) => {
            let prettierValue;
            if (isValue(value)) {
                if (value.value === "none") {
                    prettierValue = ruleValue("never");
                }
                else if (typeof value.value === "string" &&
                    value.value.indexOf("always") === 0) {
                    prettierValue = ruleValue("es5");
                }
                else {
                    prettierValue = ruleNotConfigured;
                }
            }
            else {
                prettierValue = ruleNotConfigured;
            }
            return makePrettierOption("trailingComma")(prettierValue, fallbacks);
        },
    },
    bracketSpacing: {
        ruleValue: getRuleValue("object-curly-spacing"),
        ruleValueToPrettierOption: (value, fallbacks) => makePrettierOption("bracketSpacing")(eslintToBoolean(value), fallbacks),
    },
    semi: {
        ruleValue: getRuleValue("semi"),
        ruleValueToPrettierOption: (value, fallbacks) => makePrettierOption("semi")(eslintToBoolean(value), fallbacks),
    },
    useTabs: {
        ruleValue: getRuleValue("indent"),
        ruleValueToPrettierOption: (value, fallbacks) => {
            let prettierValue;
            if (isValue(value) && value.value === "tab") {
                prettierValue = ruleValue(true);
            }
            else {
                prettierValue = ruleNotConfigured;
            }
            return makePrettierOption("useTabs")(prettierValue, fallbacks);
        },
    },
    bracketSameLine: {
        ruleValue: getRuleValue("react/jsx-closing-bracket-location", "nonEmpty"),
        ruleValueToPrettierOption: (value, fallbacks) => {
            let prettierValue;
            if (isValue(value)) {
                if (value.value === "after-props") {
                    prettierValue = ruleValue(true);
                }
                else if (value.value === "tag-aligned" ||
                    value.value === "line-aligned" ||
                    value.value === "props-aligned") {
                    prettierValue = ruleValue(false);
                }
                else {
                    prettierValue = value;
                }
            }
            else {
                prettierValue = value;
            }
            return makePrettierOption("bracketSameLine")(prettierValue, fallbacks);
        },
    },
    arrowParens: {
        ruleValue: getRuleValue("arrow-parens"),
        ruleValueToPrettierOption: (value, fallbacks) => makePrettierOption("arrowParens")(isValue(value) && value.value === "as-needed"
            ? ruleValue("avoid")
            : value, fallbacks),
    },
};
const getPrettierConfigForEslintRules = (eslintRules, prettierOptions, fallbackPrettierOptions) => {
    const prettierPluginOptions = getRuleValue("prettier/prettier")(eslintRules);
    if (isValue(prettierPluginOptions) &&
        typeof prettierPluginOptions.value === "object") {
        prettierOptions = { ...prettierOptions, ...prettierPluginOptions.value };
    }
    return (0, function_1.pipe)(configConversions, R.reduceWithIndex(Str.Ord)(prettierOptions, (k, options, { ruleValue, ruleValueToPrettierOption }) => {
        const eslintRuleValue = ruleValue(eslintRules);
        return (0, function_1.pipe)(ruleValueToPrettierOption(eslintRuleValue, fallbackPrettierOptions), O.match(() => options, (opt) => {
            options[k] = opt;
            return options;
        }));
    }));
};
function getEslint(eslintPath, eslintOptions) {
    return (0, function_1.pipe)(importModule(eslintPath, "eslint"), TE.map(({ ESLint }) => new ESLint(eslintOptions)));
}
function importModule(path, moduleName) {
    return (0, function_1.pipe)(TE.tryCatch(() => Promise.resolve().then(() => __importStar(require(path))), (err) => err), TE.matchEW(() => TE.tryCatch(() => Promise.resolve().then(() => __importStar(require(moduleName))), (err) => err), TE.right));
}
const getModulePath = (filePath, moduleName) => {
    try {
        return require_relative_1.default.resolve(moduleName, filePath);
    }
    catch (_) {
        return require.resolve(moduleName);
    }
};
const getEslintConfig = (filePath, eslintPath) => (0, function_1.pipe)(TE.Do, TE.bind("cwd", () => TE.right(path_1.default.dirname(filePath))), TE.bind("eslint", ({ cwd }) => getEslint(eslintPath, { cwd })), TE.bind("config", TE.tryCatchK(({ eslint }) => eslint.calculateConfigForFile(filePath), (err) => err)), TE.map(({ cwd, config }) => ({
    cwd,
    baseConfig: config,
})), TE.matchW(() => E.right({ baseConfig: { rules: {} } }), E.right));
const readFile = TE.taskify(fs.readFile);
const formatTE = (options) => (0, function_1.pipe)(TE.Do, TE.bind("text", () => (options === null || options === void 0 ? void 0 : options.text)
    ? TE.right(options.text)
    : (0, function_1.pipe)(readFile(options.filePath), TE.map((buffer) => buffer.toString("utf-8")))), TE.bind("eslintPath", () => { var _a; return TE.right((_a = options.eslintPath) !== null && _a !== void 0 ? _a : getModulePath(options.filePath, "eslint")); }), TE.bind("prettierPath", () => {
    var _a;
    return TE.right((_a = options.prettierPath) !== null && _a !== void 0 ? _a : getModulePath(options.filePath, "prettier"));
}), TE.bind("prettierLast", () => { var _a; return TE.right((_a = options.prettierLast) !== null && _a !== void 0 ? _a : false); }), TE.bind("fallbackPrettierOptions", () => { var _a; return TE.right((_a = options.prettierLast) !== null && _a !== void 0 ? _a : {}); }), TE.chain(({ eslintPath, prettierPath, ...rest }) => (0, function_1.pipe)(TE.Do, TE.apS("eslintConfig", getEslintConfig(options.filePath, eslintPath)), TE.apS("prettier", (0, function_1.pipe)(importModule(prettierPath, "prettier"), TE.chain(TE.tryCatchK((prettier) => prettier
    .resolveConfig(options.filePath)
    .then((prettierOptions) => ({ prettierOptions, prettier })), (err) => err)), TE.map(({ prettier, prettierOptions }) => ({
    prettier,
    prettierOptions: prettierOptions == null ? {} : prettierOptions,
})))), TE.map(({ eslintConfig, prettier }) => ({
    eslintConfig,
    eslintPath,
    prettierPath,
    ...rest,
    ...prettier,
})))), TE.bind("inferredPrettierConfig", ({ prettierOptions, eslintConfig, fallbackPrettierOptions }) => {
    var _a, _b;
    return TE.right(getPrettierConfigForEslintRules((_b = (_a = eslintConfig.baseConfig) === null || _a === void 0 ? void 0 : _a.rules) !== null && _b !== void 0 ? _b : {}, prettierOptions, fallbackPrettierOptions));
}), TE.chain(({ eslintPath, text, eslintConfig, inferredPrettierConfig, prettier }) => (0, function_1.pipe)(TE.tryCatch(() => new Promise((resolve) => resolve(prettier.format(text, {
    ...inferredPrettierConfig,
    filepath: options.filePath,
}))), (err) => err), TE.chain((prettified) => (0, function_1.pipe)(getEslint(eslintPath, { fix: true, ...eslintConfig }), TE.chain(TE.tryCatchK((eslint) => eslint.lintText(prettified, { filePath: options.filePath }), (err) => err)), TE.map((lintResults) => (0, function_1.pipe)(lintResults, A.filterMap((r) => (r.output ? O.some(r.output) : O.none))).join("")))))));
exports.formatTE = formatTE;
const format = async (options) => {
    const result = await (0, exports.formatTE)(options)();
    if (result._tag === "Left") {
        throw result.left;
    }
    return result.right;
};
exports.format = format;