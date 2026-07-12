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
const host = (process.env.POSTHOG_API_HOST || 'https://us.posthog.com').replace(/\/$/, '')

if (!apiKey) {
  console.error('pg-query: set POSTHOG_PERSONAL_API_KEY (or POSTHOG_CLI_API_KEY) to a personal API key')
  process.exit(2)
}

const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

async function request(method, path, body) {
  const res = await fetch(`${host}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`pg-query: ${method} ${path} → HTTP ${res.status}\n${text.slice(0, 2000)}`)
    process.exit(1)
  }
  return text
}

const getPath = opt('--get')
const project = opt('--project')
const hogql = opt('--hogql') ?? (opt('--hogql-file') ? readFileSync(opt('--hogql-file'), 'utf8') : undefined)

if (getPath) {
  process.stdout.write(await request('GET', getPath))
} else if (project && hogql) {
  const body = { query: { kind: 'HogQLQuery', query: hogql } }
  process.stdout.write(await request('POST', `/api/projects/${project}/query/`, body))
} else {
  console.error('pg-query: need either --get <path>, or --project <id> with --hogql "<sql>" / --hogql-file <file>')
  process.exit(2)
}
