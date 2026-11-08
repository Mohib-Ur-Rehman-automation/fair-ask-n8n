# Fair Ask: design spec

The decisions behind Fair Ask, as built. The README covers setup and results; this file covers what the system must do and why.

## Goal
After a job is completed, every eligible customer gets the same neutral request for a review. Anything a customer says privately becomes a tracked case with an owner and a deadline. The owner gets a monthly report.

## Frame
- Fictional business: Northgate Home Services (plumbing, electrical, heating). All people, emails and jobs are fake; demo emails go only to test inboxes.
- English, international audience.
- Free tools only: n8n Community Edition (self-hosted), Google Sheets, n8n Webhook + Respond to Webhook nodes for the private page, Gmail SMTP with an app password, Groq optional.

## Fairness rules (the point of the piece)
- **R1** Every eligible customer gets the same email. No sentiment check decides who sees the public review link.
- **R2** The public review link and the private feedback link appear with equal prominence. No wording steers unhappy customers away from reviewing publicly.
- **R3** No incentives, no quotas, no request for specific content or staff names.
- **R4** The public review link is in 100% of sent invites. The invite engine refuses to send if the link is missing or isn't an http(s) link.
- Basis: Google Maps' "Prohibited & restricted content" policy on review gating (support.google.com/contributionpolicy/answer/7400114), checked 28 Oct 2026. Not legal advice.

## Decisions
1. **Sending** uses the SMTP Send Email node with a Gmail app password, so sending doesn't depend on a Google OAuth login. Sheets are read and written through Google OAuth.
2. **Private feedback** is a page FA3 serves itself from a Webhook node: split layout, job facts read from the Jobs tab, light/dark, a styled thank-you page. n8n's stock Form Trigger could only be recoloured, not laid out. The invite's link carries `job_id` as a query parameter, which only works on the production URL, so FA3 must be published. A real customer needs n8n reachable from the internet.
3. **Triage is rules first.** Rules decide category and severity. Groq, if enabled, only writes a one-line summary; if it fails or returns anything with links or markup, the first words of the message are used.
4. **Deadlines** use calendar days: urgent 1 day, normal 3 days.
5. **Invite timing:** 2 days after completion, give up after 14 days, at most one invite per customer email per 30 days.

## Data model (one Google Sheet)
- **Jobs:** job_id, customer_name, customer_email, service_type, completed_date, job_status (completed / cancelled / in_progress), opted_out (Y or blank), invited_at, invite_status (sent / failed / skipped), skip_reason
- **Feedback:** timestamp, job_id, category, message, contact_ok (Y/N)
- **Cases:** case_id, job_id, created_at, category, severity (urgent / normal), summary, owner, status (open / contacted / resolved), due_at, resolved_at, classified_by (rules / rules+ai)
- **Log:** timestamp, module, event, detail
- **Config:** key/value: owner per category, urgent keywords, wait / window / dedupe days, deadline days, links, sender and alert addresses, `dry_run`, `max_invites_per_run`, `alert_cap_per_hour`, `ai_summary`, `report_to`
- **TestKey:** the expected result for each of the 40 demo jobs

## Eligibility for an invite (all must be true)
job_status = completed; completed_date at least 2 and at most 14 days ago; customer_email looks valid; opted_out blank; invited_at blank; no other invite to the same email in the last 30 days. Anything that fails gets invite_status = skipped with a skip_reason. Nothing is dropped silently.

## Categories and severity
Categories: went well, work quality, lateness, price/billing, communication, damage/safety, other. Urgent if the message hits the urgent keyword list in Config or the category is damage/safety; everything else is normal. A case whose category has no owner in Config goes to `owner:other`.

## Test matrix
Results with times are in [test-results.md](test-results.md).

- T1 Normal eligible job gets exactly one invite.
- T2 Job completed yesterday: skipped (too soon).
- T3 Job older than 14 days: skipped.
- T4 Cancelled job: skipped.
- T5 Missing email: skipped and logged.
- T6 Malformed email: skipped and logged.
- T7 Opted-out customer: skipped.
- T8 Run the workflow twice: no second invite.
- T9 Same customer, two jobs within 30 days: one invite only.
- T10 SMTP failure: invite_status = failed, alert sent, no duplicate on retry.
- T11 Feedback with an urgent keyword: urgent case plus alert to owner.
- T12 Feedback with a blank message: case still created and flagged.
- T13 Groq down: fallback summary, case still created.
- T14 Overdue case: one reminder per day, not one per run.
- T15 Report with zero cases and zero invites does not break.
- T16 Public review link present in every sent invite.
- T17 Hostile text in a customer message (script tags, HTML, quotes) is escaped in the owner alert and the report.
- T18 Form opened with a missing, edited or unknown job_id: case still created, flagged for human review, nothing crashes.

## Changes after the first build (3–4 Nov 2026)
- Emails and pages in the Northgate "Ironwork" look: cool mist background, slate header band, brass accents, white cards.
- Invite engine: allow-listed service names, at most 40 sends per run (`max_invites_per_run`), one combined Sheet write per run, `dry_run` switch.
- Feedback triage: the custom feedback page (decision 2), an "It went well" category, flood limits (`alert_cap_per_hour`, 3 cases per job per day), AI summary skipped for messages with links, markup or instruction-like text, review flags shown in the case summary, Sheets writes as plain text (no formulas).
- Recovery tracker: one email per owner per day, owners must be listed in Config, at most 25 cases listed per email, `resolved_at` filled automatically.
- Monthly report: invalid `report_month` overrides ignored; an empty month handled.
- Every Sheets step retries 3 times on network errors.
- Break-test findings and fixes: [break-test-log.md](break-test-log.md).
