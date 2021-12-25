"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.match = exports.fromEslintRulesRecord = exports.isValue = exports.NotConfigured = exports.Disabled = exports.Value = void 0;
const Value = (value) => ({
    _tag: 'Value',
    value,
});
exports.Value = Value;
exports.Disabled = {
    _tag: 'Disabled',
};
exports.NotConfigured = {
    _tag: 'NotConfigured',
};
const isValue = (rv) => rv._tag === 'Value';
exports.isValue = isValue;
function fromEslintRulesRecord(name, key) {
    return (rules) => {
        const rule = rules[name];
        if (Array.isArray(rule)) {
            const [ruleSetting, value] = rule;
            if (ruleSetting === 0 || ruleSetting === 'off') {
                return exports.Disabled;
            }
            if (typeof value === 'object') {
                if (key) {
                    const subValue = value[key];
                    return subValue === undefined ? exports.NotConfigured : (0, exports.Value)(subValue);
                }
                else {
                    return (0, exports.Value)(value);
                }
            }
            else {
                return (0, exports.Value)(value);
            }
        }
        return exports.NotConfigured;
    };
}
exports.fromEslintRulesRecord = fromEslintRulesRecord;
const match = (value, disabled, notConfigured) => (ruleValue) => {
    switch (ruleValue._tag) {
        case 'Value': {
            return value(ruleValue.value);
        }
        case 'Disabled': {
            return disabled();
        }
        case 'NotConfigured': {
            return notConfigured();
        }
    }
};
exports.match = match;
