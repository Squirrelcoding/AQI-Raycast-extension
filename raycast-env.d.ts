/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `get-aqi` command */
  export type GetAqi = ExtensionPreferences & {
  /** Reddit Client ID - Reddit Client ID. */
  "client_id": string,
  /** Reddit Client Secreet - Reddit Client Secret. */
  "client_secret": string,
  /** Reddit username - Reddit username. */
  "reddit_username": string,
  /** Reddit Password - Reddit Password. */
  "reddit_password": string,
  /** Google Search API Key - Reddit Password. */
  "google_api_key": string
}
}

declare namespace Arguments {
  /** Arguments passed to the `get-aqi` command */
  export type GetAqi = {
  /** Enter location */
  "location": string
}
}

