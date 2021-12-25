/**
 * An algebraic datatype expressing an ESLint rule or Prettier config value
 */
import type { RawConfigValue } from './RawConfig'
import type { Linter } from 'eslint'

export interface Value {
  readonly _tag: 'Value'
  readonly value: RawConfigValue
}

export const Value = (value: RawConfigValue): RuleValue => ({
  _tag: 'Value',
  value,
})

export interface Disabled {
  readonly _tag: 'Disabled'
}

export const Disabled: RuleValue = {
  _tag: 'Disabled',
}

export interface NotConfigured {
  readonly _tag: 'NotConfigured'
}

export const NotConfigured: RuleValue = {
  _tag: 'NotConfigured',
}

export type RuleValue = Value | Disabled | NotConfigured;

export const isValue = (rv: RuleValue): rv is Value => rv._tag === 'Value'

export function fromEslintRulesRecord(
  name: string,
  key?: string
): (rules: Partial<Linter.RulesRecord>) => RuleValue {
  return (rules) => {
    const rule = rules[name]
    if (Array.isArray(rule)) {
      const [ruleSetting, value] = rule
      if (ruleSetting === 0 || ruleSetting === 'off') {
        return Disabled
      }

      if (typeof value === 'object') {
        if (key) {
          const subValue = value[key]
          return subValue === undefined ? NotConfigured : Value(subValue)
        } else {
          return Value(value)
        }
      } else {
        return Value(value)
      }
    }
    return NotConfigured
  }
}

export const match =
  <A, B, C>(value: (value: RawConfigValue) => A, disabled: () => B, notConfigured: () => C) =>
  (ruleValue: RuleValue): A | B | C => {
    switch (ruleValue._tag) {
      case 'Value': {
        return value(ruleValue.value)
      }
      case 'Disabled': {
        return disabled()
      }
      case 'NotConfigured': {
        return notConfigured()
      }
    }
  }
