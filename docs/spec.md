# Fair Ask — spec v1 (working name; rename freely)

Status: APPROVED 28 Oct 2026 by Kamona (decision 2 changed to an n8n form; on 4 Nov the form became a custom Webhook page so the approved design could ship). Paste this file at the top of every module chat so nothing gets re-explained.

## One-line goal
After a job is completed, every eligible customer gets the same neutral request for a review. Anything a customer says privately becomes a tracked case with an owner and a deadline. The owner gets a monthly report.

## Showcase frame
- Fictional business: Northgate Home Services (plumbing, electrical, heating). All people, emails and jobs are fake. Demo emails go only to your own test inboxes.
- English, international audience. No camera, no talking.
- Free tools only. n8n CE (Docker/WSL2), Google Sheets, n8n Webhook + Respond to Webhook nodes for the private page, Gmail SMTP with app password. Groq API optional (see M3).
- Build on the separate build account. The build email and Sheet ID must never appear in anything published.

## Decisions (approved 28 Oct 2026)
1. Sending uses the SMTP Send Email node with an app password, so sending survives the weekly Google OAuth expiry. Reading/writing Sheets still uses Google OAuth, so test inside one OAuth week.
2. CHANGED: private feedback uses an n8n Form Trigger page (fully styled with Custom Form Styling CSS, so it can match the brand like the Lead Engine form). The invite's private link carries job_id as a query parameter into a Hidden Field. Query parameters only work on the PRODUCTION URL (workflow saved and active), never the Test URL, so test the link in production mode. A real customer needs a publicly reachable n8n URL (the client's own instance); the demo uses a local URL or tunnel.
3. Triage is rules-first. Rules decide category and severity. Groq (if it works) only writes a one-line summary. If Groq fails, the summary is the first 140 characters of the message.
4. Deadlines use calendar days, not business hours (urgent: 1 day, normal: 3 days). Listed as a known limitation.
5. Invite timing: send 2 days after completion, give up after 14 days, max one request per customer email per 30 days.

## Templates
Designed by ChatGPT, cleaned and tested by Claude (templates/ folder): invite.html + invite.txt, alert.html, report.html. Plain Mustache only ({{var}}, {{#list}}, {{^empty}}); a small renderer in an n8n Code node fills them and HTML-escapes every value. Severity branching uses the {{is_urgent}} flag, not Handlebars. Cases tab colours use only spec values: severity urgent/normal, status open/contacted/resolved.

## Fairness rules (non-negotiable; these are the point of the piece)
- R1 Every eligible customer gets the same email. No sentiment screening decides who sees the public review link.
- R2 The public review link and the private feedback link both appear, with equal prominence. No wording that steers unhappy customers away from reviewing publicly.
- R3 No incentives, no quotas, no request for specific content or staff names.
- R4 Test: the public review link is present in 100% of sent invites.
- Basis: Google's Maps "Prohibited & restricted content" policy (support.google.com/contributionpolicy/answer/7400114), checked 28 Oct 2026. Not legal advice; re-read it before publishing.

## Data model (one Google Sheet, four tabs + Config)
- Jobs: job_id, customer_name, customer_email, service_type, completed_date, job_status (completed / cancelled / in_progress), opted_out (Y or blank), invited_at, invite_status (sent / failed / skipped), skip_reason
- Feedback (rows written by the form workflow): timestamp, job_id, category (dropdown), message, contact_ok (Y/N)
- Cases: case_id, job_id, created_at, category, severity (urgent / normal), summary, owner, status (open / contacted / resolved), due_at, resolved_at, classified_by (rules / rules+ai)
- Log: timestamp, module, event, detail
- Config: category -> owner email map, urgent keyword list, wait days, window days, dedupe days, deadline days

## Eligibility for an invite (all must be true)
job_status = completed; completed_date at least 2 days ago and at most 14 days ago; customer_email looks valid; opted_out blank; invited_at blank; no other invite to the same email in the last 30 days. Anything that fails gets invite_status = skipped with a skip_reason. Nothing is dropped silently.

## Categories and severity
Categories: went well, work quality, lateness, price/billing, communication, damage/safety, other ("went well" added in the 4 Nov design pass). Urgent if the message hits the urgent keyword list (Config) or the category is damage/safety. Everything else is normal.

## Known limitations (seeds for the README)
- n8n cannot see whether a customer actually posted a public review, so the report counts invites and private feedback only.
- Keyword rules miss sarcasm and mixed-language messages; low-confidence cases are flagged for a human, not guessed.
- Calendar-day deadlines, one language, demo data only, weekly OAuth reconnect for Sheets, and the feedback form is only reachable by customers if n8n is publicly reachable.

## Modules (one chat each; goal -> exit check)
- M1 Blueprint: this spec approved + fake data loaded -> Jobs tab holds ~40 fake jobs including every edge case below.
- M2 Invite engine: same neutral invite, once per eligible customer -> T1-T10 and T16 pass.
- M3 Feedback triage: every private message becomes a categorized case with an owner -> T11-T13, T17 and T18 pass.
- M4 Recovery tracker: no case goes quiet -> T14 passes.
- M5 Report: owner understands the month in 30 seconds -> T15 passes; output looks designed.
- M6 Proof and ship: full test run recorded, README, scrub, public repo.

## Test matrix (record pass/fail and minutes for each; this becomes "how it was tested")
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

## Definition of done
All 18 tests pass with recorded results. You can explain every node, fix a broken expression, and rebuild one small part without AI. README follows your layout (what it does, what it replaces, how it works, what it handles, how it was tested, sample output, setup, known limitations). Scrub is clean. Repo is public.

## Cap
Target 4 working days, hard stop at 5. Cut order if behind: (1) Groq summaries, (2) Sheet dashboard in the report (keep the email), (3) the daily escalation digest becomes a per-case reminder. If it is not producing correct cases by end of day 3, ship what passes its tests and list the rest as limitations.
## Changes since v1 (3–4 Nov 2026)

- Templates rebuilt in the Northgate "Ironwork" look: mist background, slate header band, brass rule, white cards. Sandy/linen backgrounds are not used.
- Invite engine: allow-listed service names, at most 40 sends per run (`max_invites_per_run`), one combined Sheet write per run, `dry_run` switch.
- Feedback triage: flood limits (`alert_cap_per_hour`, 3 cases per job per day), AI summary skipped for messages with links, markup or instruction-like text, review flags shown in the Cases summary, Sheets writes as plain text (no formulas).
- Recovery tracker: one email per owner per day, owners must be listed in Config, at most 25 cases listed per email, `resolved_at` filled automatically.
- Monthly report: invalid `report_month` overrides ignored; zero-data month handled.
- Every Sheets step retries 3 times on network errors.
