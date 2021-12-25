/* eslint-disable @typescript-eslint/consistent-type-imports */
import type { ESLint, Linter } from 'eslint'
import type { Options as PrettierOptions } from 'prettier'

import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import * as fs from 'fs'
import path from 'path'
import requireRelative from 'require-relative'

import { getInferredPrettierConfig } from './getInferredPrettierConfig'
import { fromPrettierOptions } from './RawConfig'

interface FormatOptions {
  filePath: string
  text?: string
  eslintPath?: string
  prettierPath?: string
  eslintConfig?: ESLint.Options
  prettierOptions?: PrettierOptions
  fallbackPrettierOptions?: PrettierOptions
  prettierLast?: boolean
}

const getEslintConfig = (
  filePath: string,
  eslintPath: string
): TE.TaskEither<never, ESLint.Options> =>
  pipe(
    TE.Do,
    TE.bind('cwd', () => TE.right(path.dirname(filePath))),
    TE.bind('eslint', ({ cwd }) => getEslint(eslintPath, { cwd })),
    TE.bind(
      'config',
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
  )

const readFile = TE.taskify(fs.readFile)

export const formatTE = (options: FormatOptions): TE.TaskEither<Error, string> =>
  pipe(
    TE.Do,
    TE.bind('text', () =>
      options?.text
        ? TE.right(options.text)
        : pipe(
            readFile(options.filePath),
            TE.map((buffer) => buffer.toString('utf-8'))
          )
    ),
    TE.bind('eslintPath', () =>
      TE.right(options.eslintPath ?? getRelativeModulePath(options.filePath, 'eslint'))
    ),
    TE.bind('prettierPath', () =>
      TE.right(options.prettierPath ?? getRelativeModulePath(options.filePath, 'prettier'))
    ),
    TE.bind('prettierLast', () => TE.right(options.prettierLast ?? false)),
    TE.bind('fallbackPrettierOptions', () => TE.right(options.prettierLast ?? {})),
    TE.chain(({ eslintPath, prettierPath, ...rest }) =>
      pipe(
        TE.Do,
        TE.apS('eslintConfig', getEslintConfig(options.filePath, eslintPath)),
        TE.apS(
          'prettier',
          pipe(
            importModule<typeof import('prettier')>(prettierPath, 'prettier'),
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
      'inferredPrettierConfig',
      ({ prettierOptions, eslintConfig, fallbackPrettierOptions }) =>
        TE.right(
          getInferredPrettierConfig(
            eslintConfig.baseConfig?.rules ?? {},
            fromPrettierOptions(prettierOptions),
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
              ).join('')
            ),
            TE.map((output) => (output === '' ? prettified : output))
          )
        )
      )
    )
  )

export const format = async (options: FormatOptions): Promise<string> => {
  const result = await formatTE(options)()
  if (result._tag === 'Left') {
    throw result.left
  }
  return result.right
}

function getEslint(
  eslintPath: string,
  eslintOptions?: ESLint.Options
): TE.TaskEither<Error, ESLint> {
  return pipe(
    importModule<typeof import('eslint')>(eslintPath, 'eslint'),
    TE.map(({ ESLint }) => new ESLint(eslintOptions))
  )
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
  )
}

function getRelativeModulePath(filePath: string, moduleName: string) {
  try {
    return requireRelative.resolve(moduleName, filePath)
  } catch (_) {
    return require.resolve(moduleName)
  }
}
