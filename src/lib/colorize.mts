'use strict';

import { log } from './log.mjs';
import ircColors from 'irc-colors';

// ─── IRC Color Names ─────────────────────────────────────────────
// Every foreground color supported by irc-colors, keyed by name.

export type IrcColorName =
  | 'white'
  | 'black'
  | 'navy'
  | 'green'
  | 'red'
  | 'brown'
  | 'maroon'
  | 'purple'
  | 'violet'
  | 'olive'
  | 'yellow'
  | 'lightgreen'
  | 'lime'
  | 'teal'
  | 'bluecyan'
  | 'cyan'
  | 'aqua'
  | 'blue'
  | 'royal'
  | 'pink'
  | 'lightpurple'
  | 'fuchsia'
  | 'gray'
  | 'grey'
  | 'lightgray'
  | 'lightgrey'
  | 'silver';

export type IrcBgColorName =
  | 'bgwhite'
  | 'bgblack'
  | 'bgnavy'
  | 'bggreen'
  | 'bgred'
  | 'bgbrown'
  | 'bgmaroon'
  | 'bgpurple'
  | 'bgviolet'
  | 'bgolive'
  | 'bgyellow'
  | 'bglightgreen'
  | 'bglime'
  | 'bgteal'
  | 'bgbluecyan'
  | 'bgcyan'
  | 'bgaqua'
  | 'bgblue'
  | 'bgroyal'
  | 'bgpink'
  | 'bglightpurple'
  | 'bgfuchsia'
  | 'bggray'
  | 'bggrey'
  | 'bglightgray'
  | 'bglightgrey'
  | 'bgsilver';

export type IrcStyleName =
  | 'normal'
  | 'underline'
  | 'bold'
  | 'italic'
  | 'inverse'
  | 'strikethrough'
  | 'monospace';

// ─── Safe color function map ─────────────────────────────────────
// Pre-validated mapping of every irc-colors foreground color to its function.
// Falls back to identity if a color is somehow missing.

const allFgColors: Record<string, (text: string) => string> = {};
for (const name of [
  'white', 'black', 'navy', 'green', 'red', 'brown', 'maroon',
  'purple', 'violet', 'olive', 'yellow', 'lightgreen', 'lime',
  'teal', 'bluecyan', 'cyan', 'aqua', 'blue', 'royal', 'pink',
  'lightpurple', 'fuchsia', 'gray', 'grey', 'lightgray', 'lightgrey', 'silver',
] as IrcColorName[]) {
  const fn = (ircColors as unknown as Record<string, unknown>)[name];
  if (typeof fn === 'function') {
    allFgColors[name] = fn as (text: string) => string;
  }
}

const allBgColors: Record<string, (text: string) => string> = {};
for (const name of [
  'bgwhite', 'bgblack', 'bgnavy', 'bggreen', 'bgred', 'bgbrown',
  'bgmaroon', 'bgpurple', 'bgviolet', 'bgolive', 'bgyellow',
  'bglightgreen', 'bglime', 'bgteal', 'bgbluecyan', 'bgcyan',
  'bgaqua', 'bgblue', 'bgroyal', 'bgpink', 'bglightpurple',
  'bgfuchsia', 'bggray', 'bggrey', 'bglightgray', 'bglightgrey', 'bgsilver',
] as IrcBgColorName[]) {
  const fn = (ircColors as unknown as Record<string, unknown>)[name];
  if (typeof fn === 'function') {
    allBgColors[name] = fn as (text: string) => string;
  }
}

const allStyles: Record<string, (text: string) => string> = {};
for (const name of [
  'normal', 'underline', 'bold', 'italic', 'inverse', 'strikethrough', 'monospace',
] as IrcStyleName[]) {
  const fn = (ircColors as unknown as Record<string, unknown>)[name];
  if (typeof fn === 'function') {
    allStyles[name] = fn as (text: string) => string;
  }
}

/**
 * Apply an IRC foreground color to text, but only on IRC platforms.
 *
 * @param text     - The text to colorize
 * @param platform - The platform string (e.g. 'irc', 'discord')
 * @param color    - An IrcColorName or a direct color function
 * @returns Colorized text on IRC, original text otherwise
 */
export function colorizeForPlatform(
  text: string,
  platform: string,
  color: IrcColorName | ((text: string) => string)
): string {
  if (platform !== 'irc') return text;

  try {
    if (typeof color === 'function') return color(text);
    const fn = allFgColors[color];
    if (fn) return fn(text);
    log.warn('Unknown IRC color name', { color });
    return text;
  } catch (error) {
    log.error('Failed to colorize text for IRC', { color, error: error instanceof Error ? error.message : String(error) });
    return text;
  }
}

/**
 * Apply an IRC background color to text, but only on IRC platforms.
 */
export function colorizeBgForPlatform(
  text: string,
  platform: string,
  color: IrcBgColorName
): string {
  if (platform !== 'irc') return text;

  try {
    const fn = allBgColors[color];
    if (fn) return fn(text);
    log.warn('Unknown IRC bg color name', { color });
    return text;
  } catch (error) {
    log.error('Failed to apply bg color for IRC', { color, error: error instanceof Error ? error.message : String(error) });
    return text;
  }
}

/**
 * Apply an IRC style (bold, underline, etc.) to text, but only on IRC platforms.
 */
export function styleForPlatform(
  text: string,
  platform: string,
  style: IrcStyleName
): string {
  if (platform !== 'irc') return text;

  try {
    const fn = allStyles[style];
    if (fn) return fn(text);
    log.warn('Unknown IRC style name', { style });
    return text;
  } catch (error) {
    log.error('Failed to apply style for IRC', { style, error: error instanceof Error ? error.message : String(error) });
    return text;
  }
}

// ─── Semantic color mapping ──────────────────────────────────────
// Common "type → color" mappings used across modules.
// Modules can override these, but the defaults match existing behavior.

export interface SemanticColorMap {
  user?: IrcColorName;
  date?: IrcColorName;
  action?: IrcColorName;
  warning?: IrcColorName;
  info?: IrcColorName;
  title?: IrcColorName;
  error?: IrcColorName;
  success?: IrcColorName;
  highlight?: IrcColorName;
  muted?: IrcColorName;
  [key: string]: IrcColorName | undefined;
}

const defaultSemanticColors: Required<SemanticColorMap> = {
  user: 'cyan',
  date: 'green',
  action: 'yellow',
  warning: 'olive',
  info: 'blue',
  title: 'cyan',
  error: 'red',
  success: 'green',
  highlight: 'yellow',
  muted: 'gray',
};

/**
 * Colorize text using a semantic type key (e.g. 'user', 'date', 'warning').
 * Uses the default color map unless overridden.
 *
 * @param text     - Text to colorize
 * @param platform - Platform string
 * @param type     - Semantic type key
 * @param colorMap - Optional override map
 * @returns Colorized text on IRC, original text otherwise
 */
export function colorizeByType(
  text: string,
  platform: string,
  type: string,
  colorMap?: SemanticColorMap
): string {
  if (platform !== 'irc') return text;

  const map = colorMap ?? defaultSemanticColors;
  const colorName = map[type] ?? defaultSemanticColors[type];

  if (!colorName) {
    // Unknown type — fall back to 'info' color
    const fallback = map.info ?? defaultSemanticColors.info;
    return colorizeForPlatform(text, platform, fallback);
  }

  return colorizeForPlatform(text, platform, colorName);
}

// ─── Random color (for emote, etc.) ──────────────────────────────

const fgColorList = Object.values(allFgColors);

/**
 * Pick a random IRC color and apply it (IRC only).
 */
export function randomColorForPlatform(text: string, platform: string): string {
  if (platform !== 'irc') return text;
  if (fgColorList.length === 0) return text;
  const fn = fgColorList[Math.floor(Math.random() * fgColorList.length)];
  try {
    return fn(text);
  } catch {
    return text;
  }
}

// ─── Value-based color selection ─────────────────────────────────
// For numeric ranges (temperature, wind, humidity, etc.)

export interface ValueColorRange {
  /** Apply this color when value < threshold */
  lt?: { threshold: number; color: IrcColorName };
  /** Ranges: array of { max, color } evaluated in order */
  ranges?: Array<{ max: number; color: IrcColorName }>;
  /** Fallback color when no range matches */
  fallback: IrcColorName;
}

/**
 * Pick a color based on a numeric value and a range definition, then apply it (IRC only).
 *
 * Example:
 * ```ts
 * const tempColor = colorizeByValue(text, platform, tempF, {
 *   ranges: [
 *     { max: 32, color: 'blue' },
 *     { max: 50, color: 'cyan' },
 *     { max: 70, color: 'green' },
 *     { max: 80, color: 'yellow' },
 *     { max: 90, color: 'olive' },
 *   ],
 *   fallback: 'red',
 * });
 * ```
 */
export function colorizeByValue(
  text: string,
  platform: string,
  value: number,
  def: ValueColorRange
): string {
  if (platform !== 'irc') return text;

  if (def.ranges) {
    for (const range of def.ranges) {
      if (value < range.max) {
        return colorizeForPlatform(text, platform, range.color);
      }
    }
  }

  if (def.lt && value < def.lt.threshold) {
    return colorizeForPlatform(text, platform, def.lt.color);
  }

  return colorizeForPlatform(text, platform, def.fallback);
}

// ─── Rainbow text ────────────────────────────────────────────────

/**
 * Apply rainbow coloring to text (IRC only).
 */
export function rainbowForPlatform(text: string, platform: string, colorArr?: string[]): string {
  if (platform !== 'irc') return text;
  try {
    return ircColors.rainbow(text, colorArr);
  } catch (error) {
    log.error('Failed to apply rainbow colorization', { error: error instanceof Error ? error.message : String(error) });
    return text;
  }
}

// ─── Strip IRC formatting ────────────────────────────────────────

/**
 * Strip IRC color codes and style codes from a string.
 */
export function stripColors(text: string): string {
  try {
    return ircColors.stripColors(text);
  } catch {
    return text;
  }
}

export function stripStyle(text: string): string {
  try {
    return ircColors.stripStyle(text);
  } catch {
    return text;
  }
}

export function stripColorsAndStyle(text: string): string {
  try {
    return ircColors.stripColorsAndStyle(text);
  } catch {
    return text;
  }
}

// ─── Weather icons ───────────────────────────────────────────────
// DEPRECATED: getWeatherIcon has been moved to the weather module.
// This is only kept for re-export compatibility and will be removed.

// ─── Full color map export ───────────────────────────────────────
// For modules that want direct access to validated color functions.

export const fgColors: Readonly<Record<string, (text: string) => string>> = allFgColors;
export const bgColors: Readonly<Record<string, (text: string) => string>> = allBgColors;
export const styles: Readonly<Record<string, (text: string) => string>> = allStyles;
