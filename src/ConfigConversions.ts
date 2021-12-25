/**
 * Functions for converting configured ESLint rules to Prettier-compatible values
 */
import type { RawConfigValue } from './RawConfig'
import type { RuleValue } from './RuleValue'
import type { Linter } from 'eslint'
import type { Options as PrettierOptions } from 'prettier'

import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Record'

import * as RV from './RuleValue'

export interface ConfigConversion {
  /**
   * A function that converts an ESLint rule to `RuleValue`.
   */
  ruleValue: (rules: Partial<Linter.RulesRecord>) => RuleValue
  /**
   * A function that converts a `RuleValue` to a Prettier config value
   */
  ruleValueToPrettierOption: (
    value: RuleValue,
    fallbacks: Record<string, RawConfigValue>
  ) => O.Option<RawConfigValue>
}

type ConfigConversions = Partial<{
  [K in keyof PrettierOptions]: ConfigConversion;
}>;

const printWidth: ConfigConversion = {
  ruleValue: RV.fromEslintRulesRecord('max-len', 'code'),
  ruleValueToPrettierOption: makePrettierOption('printWidth'),
}

const tabWidth: ConfigConversion = {
  ruleValue: (rules) => {
    let indent = RV.fromEslintRulesRecord('indent')(rules)
    if (RV.isValue(indent) && indent.value === 'tab') {
      indent = RV.fromEslintRulesRecord('max-len', 'tabWidth')(rules)
    }
    return indent
  },
  ruleValueToPrettierOption: makePrettierOption('tabWidth'),
}

const singleQuote: ConfigConversion = {
  ruleValue: RV.fromEslintRulesRecord('quotes'),
  ruleValueToPrettierOption: (value, fallbacks) => {
    let prettierValue: RuleValue
    if (RV.isValue(value)) {
      if (value.value === 'single') {
        prettierValue = RV.Value(true)
      } else {
        prettierValue = RV.Value(false)
      }
    } else {
      prettierValue = value
    }
    return makePrettierOption('singleQuote')(prettierValue, fallbacks)
  },
}

const trailingComma: ConfigConversion = {
  ruleValue: RV.fromEslintRulesRecord('comma-dangle'),
  ruleValueToPrettierOption: (value, fallbacks) => {
    let prettierValue: RuleValue
    if (RV.isValue(value)) {
      if (value.value === 'none') {
        prettierValue = RV.Value('never')
      } else if (typeof value.value === 'string' && value.value.indexOf('always') === 0) {
        prettierValue = RV.Value('es5')
      } else {
        prettierValue = RV.NotConfigured
      }
    } else {
      prettierValue = RV.NotConfigured
    }
    return makePrettierOption('trailingComma')(prettierValue, fallbacks)
  },
}

const bracketSpacing: ConfigConversion = {
  ruleValue: RV.fromEslintRulesRecord('object-curly-spacing'),
  ruleValueToPrettierOption: (value, fallbacks) =>
    makePrettierOption('bracketSpacing')(ruleValueToBoolean(value), fallbacks),
}

const semi: ConfigConversion = {
  ruleValue: RV.fromEslintRulesRecord('semi'),
  ruleValueToPrettierOption: (value, fallbacks) =>
    makePrettierOption('semi')(ruleValueToBoolean(value), fallbacks),
}

const useTabs: ConfigConversion = {
  ruleValue: RV.fromEslintRulesRecord('indent'),
  ruleValueToPrettierOption: (value, fallbacks) => {
    let prettierValue: RuleValue
    if (RV.isValue(value) && value.value === 'tab') {
      prettierValue = RV.Value(true)
    } else {
      prettierValue = RV.NotConfigured
    }
    return makePrettierOption('useTabs')(prettierValue, fallbacks)
  },
}

const bracketSameLine: ConfigConversion = {
  ruleValue: RV.fromEslintRulesRecord('react/jsx-closing-bracket-location', 'nonEmpty'),
  ruleValueToPrettierOption: (value, fallbacks) => {
    let prettierValue: RuleValue
    if (RV.isValue(value)) {
      if (value.value === 'after-props') {
        prettierValue = RV.Value(true)
      } else if (
        value.value === 'tag-aligned' ||
        value.value === 'line-aligned' ||
        value.value === 'props-aligned'
      ) {
        prettierValue = RV.Value(false)
      } else {
        prettierValue = value
      }
    } else {
      prettierValue = value
    }
    return makePrettierOption('bracketSameLine')(prettierValue, fallbacks)
  },
}

const arrowParens: ConfigConversion = {
  ruleValue: RV.fromEslintRulesRecord('arrow-parens'),
  ruleValueToPrettierOption: (value, fallbacks) =>
    makePrettierOption('arrowParens')(
      RV.isValue(value) && value.value === 'as-needed' ? RV.Value('avoid') : value,
      fallbacks
    ),
}

export const configConversions: ConfigConversions = {
  printWidth,
  tabWidth,
  singleQuote,
  trailingComma,
  bracketSpacing,
  semi,
  useTabs,
  bracketSameLine,
  arrowParens,
}

function makePrettierOption(
  name: string
): (value: RuleValue, fallbacks: Record<string, RawConfigValue>) => O.Option<RawConfigValue> {
  return (value, fallbacks) => {
    if (RV.isValue(value)) {
      return O.some(value.value)
    }

    return pipe(fallbacks, R.lookup(name))
  }
}

function ruleValueToBoolean(ruleValue: RuleValue): RuleValue {
  if (RV.isValue(ruleValue)) {
    if (ruleValue.value === 'always') {
      return RV.Value(true)
    } else if (ruleValue.value === 'never') {
      return RV.Value(false)
    }
  }
  return ruleValue
}
