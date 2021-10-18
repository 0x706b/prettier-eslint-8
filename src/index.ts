import type { ESLint, Linter } from "eslint";
import type { Options as PrettierOptions } from "prettier";

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as A from "fp-ts/ReadonlyArray";
import * as R from "fp-ts/Record";
import * as Str from "fp-ts/string";
import * as TE from "fp-ts/TaskEither";
import * as fs from "fs";
import path from "path";
import requireRelative from "require-relative";

type ConfigOption = string | number | boolean | Record<string, any>;
type PrettierConfig = Record<string, any>;

interface Value {
  readonly _tag: "Value";
  readonly value: ConfigOption;
}

const ruleValue = (value: ConfigOption): RuleValue => ({
  _tag: "Value",
  value,
});

interface Disabled {
  readonly _tag: "Disabled";
}

const ruleDisabled: RuleValue = {
  _tag: "Disabled",
};

interface NotConfigured {
  readonly _tag: "NotConfigured";
}

const ruleNotConfigured: RuleValue = {
  _tag: "NotConfigured",
};

type RuleValue = Value | Disabled | NotConfigured;

const isValue = (rv: RuleValue): rv is Value => rv._tag === "Value";

type ConfigConversions = Partial<{
  [K in keyof PrettierOptions]: {
    ruleValue: (rules: Linter.RulesRecord) => RuleValue;
    ruleValueToPrettierOption: (
      value: RuleValue,
      fallbacks: Record<string, ConfigOption>
    ) => O.Option<ConfigOption>;
  };
}>;

const getRuleValue =
  (name: string, key?: string) =>
  (rules: Partial<Linter.RulesRecord>): RuleValue => {
    const rule = rules[name];
    if (Array.isArray(rule)) {
      const [ruleSetting, value] = rule;
      if (ruleSetting === 0 || ruleSetting === "off") {
        return ruleDisabled;
      }

      if (typeof value === "object") {
        if (key) {
          const subValue = value[key];
          return subValue === undefined ? ruleNotConfigured : ruleValue(subValue);
        } else {
          return ruleValue(value);
        }
      } else {
        return ruleValue(value);
      }
    }
    return ruleNotConfigured;
  };

const makePrettierOption =
  (name: string) =>
  (value: RuleValue, fallbacks: Record<string, ConfigOption>): O.Option<ConfigOption> => {
    if (isValue(value)) {
      return O.some(value.value);
    }

    return pipe(fallbacks, R.lookup(name));
  };

const eslintToBoolean = (eslintValue: RuleValue): RuleValue => {
  if (isValue(eslintValue)) {
    if (eslintValue.value === "always") {
      return ruleValue(true);
    } else if (eslintValue.value === "never") {
      return ruleValue(false);
    }
  }
  return eslintValue;
};

const configConversions: ConfigConversions = {
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
      let prettierValue: RuleValue;
      if (isValue(value)) {
        if (value.value === "single") {
          prettierValue = ruleValue(true);
        } else {
          prettierValue = ruleValue(false);
        }
      } else {
        prettierValue = value;
      }
      return makePrettierOption("singleQuote")(prettierValue, fallbacks);
    },
  },
  trailingComma: {
    ruleValue: getRuleValue("comma-dangle"),
    ruleValueToPrettierOption: (value, fallbacks) => {
      let prettierValue: RuleValue;
      if (isValue(value)) {
        if (value.value === "none") {
          prettierValue = ruleValue("never");
        } else if (typeof value.value === "string" && value.value.indexOf("always") === 0) {
          prettierValue = ruleValue("es5");
        } else {
          prettierValue = ruleNotConfigured;
        }
      } else {
        prettierValue = ruleNotConfigured;
      }
      return makePrettierOption("trailingComma")(prettierValue, fallbacks);
    },
  },
  bracketSpacing: {
    ruleValue: getRuleValue("object-curly-spacing"),
    ruleValueToPrettierOption: (value, fallbacks) =>
      makePrettierOption("bracketSpacing")(eslintToBoolean(value), fallbacks),
  },
  semi: {
    ruleValue: getRuleValue("semi"),
    ruleValueToPrettierOption: (value, fallbacks) =>
      makePrettierOption("semi")(eslintToBoolean(value), fallbacks),
  },
  useTabs: {
    ruleValue: getRuleValue("indent"),
    ruleValueToPrettierOption: (value, fallbacks) => {
      let prettierValue: RuleValue;
      if (isValue(value) && value.value === "tab") {
        prettierValue = ruleValue(true);
      } else {
        prettierValue = ruleNotConfigured;
      }
      return makePrettierOption("useTabs")(prettierValue, fallbacks);
    },
  },
  bracketSameLine: {
    ruleValue: getRuleValue("react/jsx-closing-bracket-location", "nonEmpty"),
    ruleValueToPrettierOption: (value, fallbacks) => {
      let prettierValue: RuleValue;
      if (isValue(value)) {
        if (value.value === "after-props") {
          prettierValue = ruleValue(true);
        } else if (
          value.value === "tag-aligned" ||
          value.value === "line-aligned" ||
          value.value === "props-aligned"
        ) {
          prettierValue = ruleValue(false);
        } else {
          prettierValue = value;
        }
      } else {
        prettierValue = value;
      }
      return makePrettierOption("bracketSameLine")(prettierValue, fallbacks);
    },
  },
  arrowParens: {
    ruleValue: getRuleValue("arrow-parens"),
    ruleValueToPrettierOption: (value, fallbacks) =>
      makePrettierOption("arrowParens")(
        isValue(value) && value.value === "as-needed" ? ruleValue("avoid") : value,
        fallbacks
      ),
  },
};

const getPrettierConfigForEslintRules = (
  eslintRules: Partial<Linter.RulesRecord>,
  prettierOptions: PrettierConfig,
  fallbackPrettierOptions: PrettierConfig
): PrettierConfig => {
  const prettierPluginOptions = getRuleValue("prettier/prettier")(eslintRules);
  if (isValue(prettierPluginOptions) && typeof prettierPluginOptions.value === "object") {
    prettierOptions = { ...prettierOptions, ...prettierPluginOptions.value };
  }

  return pipe(
    configConversions as Record<
      string,
      {
        ruleValue: (rules: Partial<Linter.RulesRecord>) => RuleValue;
        ruleValueToPrettierOption: (
          value: RuleValue,
          fallbacks: Record<string, ConfigOption>
        ) => O.Option<ConfigOption>;
      }
    >,
    R.reduceWithIndex(Str.Ord)(
      prettierOptions,
      (k, options, { ruleValue, ruleValueToPrettierOption }) => {
        const eslintRuleValue = ruleValue(eslintRules);
        return pipe(
          ruleValueToPrettierOption(eslintRuleValue, fallbackPrettierOptions),
          O.match(
            () => options,
            (opt) => {
              options[k] = opt;
              return options;
            }
          )
        );
      }
    )
  );
};

function getEslint(eslintPath: string, eslintOptions?: ESLint.Options) {
  return pipe(
    importModule<typeof import("eslint")>(eslintPath, "eslint"),
    TE.map(({ ESLint }) => new ESLint(eslintOptions))
  );
}

function importModule<A>(path: string, moduleName: string): TE.TaskEither<Error, A> {
  return pipe(
    TE.tryCatch(
      () => import(path) as Promise<A>,
      (err) => err as Error
    ),
    TE.matchEW(
      () =>
        TE.tryCatch(
          () => import(moduleName) as Promise<A>,
          (err) => err as Error
        ),
      TE.right
    )
  );
}

interface FormatOptions {
  filePath: string;
  text?: string;
  eslintPath?: string;
  prettierPath?: string;
  eslintConfig?: ESLint.Options;
  prettierOptions?: PrettierOptions;
  fallbackPrettierOptions?: PrettierOptions;
  prettierLast?: boolean;
}

const getModulePath = (filePath: string, moduleName: string) => {
  try {
    return requireRelative.resolve(moduleName, filePath);
  } catch (_) {
    return require.resolve(moduleName);
  }
};

const getEslintConfig = (
  filePath: string,
  eslintPath: string
): TE.TaskEither<never, ESLint.Options> =>
  pipe(
    TE.Do,
    TE.bind("cwd", () => TE.right(path.dirname(filePath))),
    TE.bind("eslint", ({ cwd }) => getEslint(eslintPath, { cwd })),
    TE.bind(
      "config",
      TE.tryCatchK(
        ({ eslint }) => eslint.calculateConfigForFile(filePath) as Promise<Linter.Config>,
        (err) => err as Error
      )
    ),
    TE.map(({ cwd, config }) => ({
      cwd,
      baseConfig: config,
    })),
    TE.matchW(() => E.right({ baseConfig: { rules: {} } }), E.right)
  );

const readFile = TE.taskify(fs.readFile);

export const formatTE = (options: FormatOptions): TE.TaskEither<Error, string> =>
  pipe(
    TE.Do,
    TE.bind("text", () =>
      options?.text
        ? TE.right(options.text)
        : pipe(
            readFile(options.filePath),
            TE.map((buffer) => buffer.toString("utf-8"))
          )
    ),
    TE.bind("eslintPath", () =>
      TE.right(options.eslintPath ?? getModulePath(options.filePath, "eslint"))
    ),
    TE.bind("prettierPath", () =>
      TE.right(options.prettierPath ?? getModulePath(options.filePath, "prettier"))
    ),
    TE.bind("prettierLast", () => TE.right(options.prettierLast ?? false)),
    TE.bind("fallbackPrettierOptions", () => TE.right(options.prettierLast ?? {})),
    TE.chain(({ eslintPath, prettierPath, ...rest }) =>
      pipe(
        TE.Do,
        TE.apS("eslintConfig", getEslintConfig(options.filePath, eslintPath)),
        TE.apS(
          "prettier",
          pipe(
            importModule<typeof import("prettier")>(prettierPath, "prettier"),
            TE.chain(
              TE.tryCatchK(
                (prettier) =>
                  prettier
                    .resolveConfig(options.filePath)
                    .then((prettierOptions) => ({ prettierOptions, prettier })),
                (err) => err as Error
              )
            ),
            TE.map(({ prettier, prettierOptions }) => ({
              prettier,
              prettierOptions: prettierOptions == null ? {} : prettierOptions,
            }))
          )
        ),
        TE.map(({ eslintConfig, prettier }) => ({
          eslintConfig,
          eslintPath,
          prettierPath,
          ...rest,
          ...prettier,
        }))
      )
    ),
    TE.bind(
      "inferredPrettierConfig",
      ({ prettierOptions, eslintConfig, fallbackPrettierOptions }) =>
        TE.right(
          getPrettierConfigForEslintRules(
            eslintConfig.baseConfig?.rules ?? {},
            prettierOptions,
            fallbackPrettierOptions
          )
        )
    ),
    TE.chain(({ eslintPath, text, eslintConfig, inferredPrettierConfig, prettier }) =>
      pipe(
        TE.tryCatch(
          () =>
            new Promise<string>((resolve) =>
              resolve(
                prettier.format(text, {
                  ...inferredPrettierConfig,
                  filepath: options.filePath,
                })
              )
            ),
          (err) => err as Error
        ),
        TE.chain((prettified) =>
          pipe(
            getEslint(eslintPath, { fix: true, ...eslintConfig }),
            TE.chain(
              TE.tryCatchK(
                (eslint) => eslint.lintText(prettified, { filePath: options.filePath }),
                (err) => err as Error
              )
            ),
            TE.map((lintResults) =>
              pipe(
                lintResults,
                A.filterMap((r) => (r.output ? O.some(r.output) : O.none))
              ).join("")
            ),
            TE.map((output) => (output === "" ? prettified : output))
          )
        )
      )
    )
  );

export const format = async (options: FormatOptions): Promise<string> => {
  const result = await formatTE(options)();
  if (result._tag === "Left") {
    throw result.left;
  }
  return result.right;
};
