/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Reddit Client ID - Reddit Client ID. */
  "client_id": string,
  /** Reddit Client Secreet - Reddit Client Secret. */
  "client_secret": string,
  /** Reddit username - Reddit username. */
  "reddit_username": string,
  /** Reddit Password - Reddit Password. */
  "reddit_password": string,
  /** SerpAPI Key - SerpAPI Key */
  "serp_api_key": string,
  /** Gemma API Key - Gemma API Key */
  "gemma_api_key": string,
  /** Supabase URL - Supabase URL */
  "supabase_url": string,
  /** Supabase Key - Supabase Key */
  "supabase_key": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `get-mood` command */
  export type GetMood = ExtensionPreferences & {}
  /** Preferences accessible in the `get-cache` command */
  export type GetCache = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `get-mood` command */
  export type GetMood = {
  /** Enter location */
  "location": string
}
  /** Arguments passed to the `get-cache` command */
  export type GetCache = {}
}

