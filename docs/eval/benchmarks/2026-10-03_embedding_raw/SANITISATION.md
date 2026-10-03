# Sanitisation & Privacy Statement

## What this corpus is
**All 113 documents and all 225 queries were written by hand by the AI agent
that built this benchmark.** They are synthetic imitations of creator-platform
artifact types (captions, hooks, scripts, ideas, comments, voice samples,
strategy notes, lessons, performance insights, snippets, memory chunks).

**No real creator post, comment, profile, transcript or dataset was used.**

## Automated scan performed
Run over the concatenation of all document and query text:

| Pattern searched | Matches found |
|---|---:|
| Email addresses | **0** |
| URLs (`http://`, `https://`, `www.`) | **0** |
| `@handles` | **0** |
| Phone-number-shaped digit runs | **0** |
| Digit runs of 9+ characters | **0** |

## What was removed
**Nothing.** No redaction, replacement or omission was necessary, so
`documents.csv` ships the **full text** of every document
(`text_included = yes`).

The export brief noted that *"a hash of text is NOT anonymisation"*. That is
correct, and it is why a hash was **not** used as a text substitute here: there
was no privacy problem to solve in the first place.

## Public identifiers that do appear
Model repository ids, model commit SHAs, library names and versions, hardware
strings. These are public, non-personal identifiers.

## Secrets
**No API key, token, password or `.env` value appears anywhere in this folder.**
The export reads only: `dataset.json`, `raw_results.json`,
`benchmark_config.json`, `environment.json`, `integrity_report.json` and
`recovered.json`. None of these contain credentials.
`environment.json` is machine-generated and holds only hardware, library
versions and model commit hashes.

Note: the database container runs with credentials in its environment, but no
benchmark artefact records or exposes them, and this export does not read the
container environment.

## If you extend this dataset later
If real creator content is ever added, the following must be replaced or dropped
before committing: personal names, @handles, phone numbers, emails, links/URLs,
and any account or order identifiers. Text that cannot be redacted should be
dropped entirely, keeping only `doc_id`, `script`, `language` and length.
