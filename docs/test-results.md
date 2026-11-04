# Test results

Live runs on a self-hosted n8n CE (Docker, WSL2) against the demo Sheet, 3–4 Nov 2026, timezone Asia/Karachi.
"Time" is the n8n execution time of the run that proved the test.

| Test | What was checked | How | Result | Time |
|---|---|---|---|---|
| T1 | Normal eligible job gets exactly one invite | Clean reset, FA2 live run | 19 invites sent, 1 refused by Gmail's daily cap (handled as T10) | 87 s |
| T2 | Completed yesterday / today → skipped | same run | `too_soon` ×2 | – |
| T3 | Older than 14 days → skipped | same run | `too_old` ×2 (15 and 30 days) | – |
| T4 | Cancelled / in progress → skipped | same run | `not_completed` ×4 | – |
| T5 | Missing email → skipped and logged | same run | `missing_email` | – |
| T6 | Malformed email → skipped and logged | same run | `invalid_email` ×3 (no @, no domain end, space inside) | – |
| T7 | Opted out → skipped | same run | `opted_out` ×2 | – |
| T8 | Run twice → no second invite | FA2 second run straight after | 0 sends; the 2 duplicate rows were re-labelled `recent_invite` | 16 s |
| T9 | Same customer, two jobs in 30 days | same run | older job invited; same address in capitals skipped `duplicate_email`; address invited 10 days earlier skipped `recent_invite` | – |
| T10 | SMTP failure | Happened for real twice (Gmail "Daily user sending limit exceeded") | job marked `failed / smtp_error`, retried next run, never duplicated; run logged `run_with_failures` | – |
| T11 | Urgent keyword → urgent case + owner alert | Form: "gas smell near the boiler" | urgent, due in 1 day, alert delivered (3 Nov) | 17 s |
| T12 | Blank message | Form with empty message | case created, `[Check by hand: blank message]` | 12 s |
| T13 | Groq down | Groq URL pointed at an unreachable host | rules summary used, `classified_by: rules`, case created | 27 s |
| T14 | Overdue case → one reminder per day | 2 overdue test cases, FA4 run twice | run 1: one digest with both cases; run 2: 0 emails | 18 s / 7 s |
| T15 | Report with zero data | report for an empty month | "A quiet month.", dashes instead of averages, no errors | 17 s |
| T16 | Public link in every invite | every live invite + fuzzing | 39/39 live, 5,000/5,000 fuzz | – |
| T17 | Hostile text | Form: `<script>`, `=HYPERLINK(…)`, "Ignore previous instructions" | AI skipped, text escaped in emails, stored as plain text (no live formula) | 12 s |
| T18 | Missing, edited or unknown job id | Form with `NG-9999` and with no id | job stored as `UNKNOWN`, flagged, no crash | 14 s |

## Feedback page (4 Nov 2026)

The stock n8n Form Trigger could only be recoloured, not laid out, so the approved design (split panel, job facts, numbered steps, light/dark switch, styled thank-you page) never reached the customer. FA3 now serves its own page from a Webhook node.

| Check | Input | Result | Time |
|---|---|---|---|
| Page opens with job facts | GET `?job_id=NG-1003` | split page, Job / Service / Completed read from the Jobs tab | 4 s |
| Unknown job | GET `?job_id=NG-9999` | page renders, "could not match this link to a job" | 3 s |
| Real submission | POST: Lateness, no reply wanted | thank-you page returned, case `C-261104-LL56` opened (normal, due in 3 days), AI summary, no email | 14 s |
| Bot submission | POST with the hidden trap field filled | thank-you page returned, nothing saved, no alert | 4 s |
| Unit checks | `tests/page.test.js` | 23/23: escaping, bad links dropped, repeated fields, 2,000-character cap, page post feeds Triage, reply promise matches Triage (1 day for safety or urgent words, nothing for no-reply), It went well reaches Triage, public link sits above Q01 | – |

## What the live runs taught

- **Gmail's real cap.** Both demo accounts were blocked after roughly 25–40 automated sends in 24 hours, far below the 500/day usually quoted. FA2 now sends at most 40 per run (Config `max_invites_per_run`).
- **One write, not three.** The first version wrote sent, skipped and failed rows to the Sheet in three separate steps. When an alert email failed, the run stopped before the skipped rows were saved. All results now merge into one write.
- **Network blips.** A dropped connection to Google left a feedback row without its case. Every Sheets step now retries 3 times, 3 seconds apart.
- **From address.** Sending through one Gmail account while the "From" line names another sends mail to spam. `from_email` must be the sending account.
- **n8n sandboxes webhook pages.** Since n8n 1.103 an HTML response is served with a `Content-Security-Policy: sandbox` header: forms and scripts work, browser storage does not, and n8n's docs say to use absolute URLs, so the page posts to the full webhook address.
