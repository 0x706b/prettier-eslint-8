import type { Options } from 'prettier'

export declare type RawConfigValue = boolean | number | string | undefined | RawConfigRecord;

export interface RawConfigRecord {
  [key: string]: RawConfigValue
}

export type RawConfig = RawConfigRecord;

export const fromPrettierOptions = (options: Options): RawConfig => options as RawConfig
