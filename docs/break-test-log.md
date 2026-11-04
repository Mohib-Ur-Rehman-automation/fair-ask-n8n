# Break-test log

The goal was to break Fair Ask on purpose, not to confirm that it works.
Two rounds: targeted attacks written by hand, then invariant fuzzing with random hostile input.
Every fix was re-tested locally (`npm test`) and then live on n8n before publishing.

## Round 1 — 21 targeted attacks (3 Nov 2026)

| # | Attack | First version | Fix |
|---|---|---|---|
| A1 | `service_type` = `constructor` | **Broke**: JavaScript function text appeared in the email ("Our function Object() { [native code] }") | lookups use `Map` and an allow-list of services; unknown → "Our team" |
| A2 | Line break + `Bcc:` inside `service_type` | **Broke**: newline reached the subject line | subject only uses allow-listed service names |
| A3 | Line break + `Bcc:` inside the email address | held: rejected as `invalid_email` | – |
| A4 | 5,000 eligible jobs at once | **Broke**: would send 5,000 emails in one run (account ban) | cap of 40 per run (Config), the rest wait for the next run |
| A5 | Objects/arrays instead of text in name or email | held | – |
| A6 | Review link set to `javascript:` | held: run refuses to send | – |
| A7 | Name `__proto__` | held | – |
| B1 | Form category tampered to `constructor` | **Broke**: category became a function | `Map` lookup; unknown → `other` + flagged |
| B2 | Form category tampered to `__proto__` | **Broke** | same fix |
| B3 | Object posing as the message | held (stored as `[object Object]`) | – |
| B4 | 100 KB message | held: clamped to 2,000 characters | – |
| B5 | Someone else's real job number in the form | accepted | known limitation: links are not signed |
| B6 | Keyword written as "g a s" | not caught | known limitation |
| B7 | 500 urgent submissions | **Broke**: 500 alert emails to the owner | alert cap: 5 urgent per hour, 3 cases per job per day; cases still saved and flagged |
| B8 | Regex characters in the keyword list | held | – |
| C1 | Owner cell edited to an outside address | **Broke**: overdue case details mailed to that address | morning check only goes to owners listed in Config |
| C2 | HTML in a case summary | held: escaped | – |
| C3 | 500 overdue cases | **Broke**: 261 KB email (Gmail clips at ~102 KB) | first 25 listed, "and N more"; now 15 KB |
| C4 | Garbage due date | held | – |
| D1 | HTML in the report's overdue list | held: escaped | – |
| D2 | `report_month` = `2026-13` | **Broke**: "Invalid DateTime" in the report | invalid overrides are ignored |

**7 broke, 7 fixed.**

## Round 2 — invariant fuzzing (3 Nov 2026)

`tests/fuzz.test.js` feeds random values into all five code nodes: real-looking data mixed with `<x-fz>` markup, quotes, CRLF + `Bcc:`, `constructor`, `__proto__`, `toString`, `null`, `NaN`, `Infinity`, objects, arrays, 5,000-character strings, emoji, spreadsheet formulas, impossible dates.

Rules that must hold on every run:

- no code node crashes
- the public review link is in every invite (R4)
- both buttons appear exactly once in every invite (R2)
- no input reaches an email unescaped; no line breaks in any subject
- every recipient is a valid address, nobody gets two invites in one run, never more than 40 sends
- category, severity and due date are always valid values
- morning checks only go to owners listed in Config
- the report never shows "Invalid" dates

First pass (3,000 runs) found two more problems:

| Found | Fix |
|---|---|
| A date cell holding `NaN` or `Infinity` crashed the invite engine and the report | numeric dates outside a sane range are treated as empty |
| (test was too strict) the rules-based summary may contain `<`; it is escaped everywhere it is shown | test corrected |

Final run: **5,000 runs, 0 failures.**

## Live re-tests after the fixes (3–4 Nov 2026)

- Form submitted with category `constructor` and contact `__proto__` → stored as `other`, flagged, no alert.
- Groq made unreachable → rules summary, case still created.
- FA2, FA4, FA5 re-run → clean.
