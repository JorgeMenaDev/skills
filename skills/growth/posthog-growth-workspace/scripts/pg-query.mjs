#!/usr/bin/env node
// pg-query.mjs — dependency-free PostHog HogQL/API runner (Node 18+).
//
// Auth: POSTHOG_PERSONAL_API_KEY (falls back to POSTHOG_CLI_API_KEY) — a phx_ personal key.
// Host: POSTHOG_API_HOST (default https://us.posthog.com).
//
// Usage:
//   node pg-query.mjs --project 12345 --hogql "SELECT event, count() FROM events GROUP BY event"
//   node pg-query.mjs --get /api/projects/12345/dashboards/
//   node pg-query.mjs --project 12345 --hogql-file query.sql
//
// Output: JSON on stdout. HogQL results print {columns, results, ...} from the query API.

import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}

const apiKey = process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_CLI_API_KEY
let host
try {
  const configuredHost = process.env.POSTHOG_API_HOST || 'https://us.posthog.com'
  if (!/^https?:\/\//.test(configuredHost) || /[\\\s?#]/.test(configuredHost)) throw new Error()
  host = new URL(configuredHost)
  if (!['https:', 'http:'].includes(host.protocol) || host.username || host.password ||
      host.pathname !== '/' || host.search || host.hash) throw new Error()
} catch {
  console.error('pg-query: POSTHOG_API_HOST must be an HTTP(S) origin without credentials, a path, query or fragment')
  process.exit(2)
}

if (!apiKey) {
  console.error('pg-query: set POSTHOG_PERSONAL_API_KEY (or POSTHOG_CLI_API_KEY) to a personal API key')
  process.exit(2)
}

const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

async function request(method, path, body) {
  let url
  try {
    if (!path.startsWith('/api/') || /[\\\s#]/.test(path)) throw new Error()
    url = new URL(path, host)
    if (url.origin !== host.origin || !url.pathname.startsWith('/api/') ||
        url.username || url.password || url.hash) throw new Error()
  } catch {
    console.error('pg-query: request path must start with /api/ and stay on the configured origin without a fragment')
    process.exit(2)
  }
  try {
    const res = await fetch(url, {
      method,
      headers,
      redirect: 'error',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`pg-query: ${method} request failed with HTTP ${res.status}`)
      process.exit(1)
    }
    return await res.text()
  } catch {
    console.error('pg-query: request failed; redirects are disabled')
    process.exit(1)
  }
}

const getPath = opt('--get')
const project = opt('--project')
let hogql = opt('--hogql')
if (hogql === undefined && opt('--hogql-file')) {
  try {
    hogql = readFileSync(opt('--hogql-file'), 'utf8')
  } catch (err) {
    console.error(`pg-query: cannot read --hogql-file ${opt('--hogql-file')}: ${err.message}`)
    process.exit(2)
  }
}

if (getPath && (project || hogql)) {
  console.error('pg-query: ambiguous arguments — pass either --get, or --project with --hogql, not both')
  process.exit(2)
}

if (getPath) {
  process.stdout.write(await request('GET', getPath))
} else if (project && hogql) {
  const body = { query: { kind: 'HogQLQuery', query: hogql } }
  process.stdout.write(await request('POST', `/api/projects/${project}/query/`, body))
} else {
  console.error('pg-query: need either --get <path>, or --project <id> with --hogql "<sql>" / --hogql-file <file>')
  process.exit(2)
}
