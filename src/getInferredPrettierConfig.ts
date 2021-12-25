import type { ConfigConversion } from './ConfigConversions'
import type { RawConfig } from './RawConfig'
import type { Linter } from 'eslint'

import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Record'
import * as Str from 'fp-ts/string'

import { configConversions } from './ConfigConversions'
import * as RV from './RuleValue'

export function getInferredPrettierConfig(
  eslintRules: Partial<Linter.RulesRecord>,
  prettierOptions: RawConfig,
  prettierFallbackOptions: RawConfig
): RawConfig {
  const prettierPluginOptions = RV.fromEslintRulesRecord('prettier/prettier')(eslintRules)

  if (RV.isValue(prettierPluginOptions) && typeof prettierPluginOptions.value === 'object') {
    // eslint-disable-next-line no-param-reassign
    prettierOptions = { ...prettierOptions, ...prettierPluginOptions.value }
  }

  return pipe(
    configConversions as Record<string, ConfigConversion>,
    R.reduceWithIndex(Str.Ord)(
      prettierOptions,
      (k, options, { ruleValue, ruleValueToPrettierOption }) => {
        const eslintRuleValue = ruleValue(eslintRules)
        return pipe(
          ruleValueToPrettierOption(eslintRuleValue, prettierFallbackOptions),
          O.match(
            () => options,
            (opt) => ({
              ...options,
              [k]: opt,
            })
          )
        )
      }
    )
  )
}
