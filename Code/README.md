# JobTrack: Job Application Tracker

A Next.js 14 (App Router) + TypeScript + Tailwind app for tracking a job search. Your data is stored in your browser's `localStorage`, and you can back it up and restore it as JSON.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
# production
npm run build && npm start
```

Other scripts: `npm run lint`, `npm run typecheck`.

## Features

- **Dashboard** (`/`): shows total applied, response rate, interview rate, active processes and offers. It also has a pipeline funnel with stage-to-stage conversion, a status breakdown, a chart of weekly activity, follow-up reminders and recent updates.
- **Board** (`/board`): a Kanban board with one column per status. Drag a card to change its status, or use the ← → arrows on the card (these also work on touch screens). The `+` button in a column header adds an application with that status.
- **List** (`/list`): a sortable table (it becomes cards on mobile). You can change status inline, open the job posting, and edit or delete a row.
- **Filters** on Board and List: search by company, role, location or notes, and filter by status, work mode and a range of application dates.
- **Add/edit modal**: validates the form (company, role, status and date are required, and the URL must be valid). Salary accepts shorthand like `120k`. The follow-up date picker has quick-pick buttons, and the modal includes interview notes per stage and the status history.
- **Sync & Share Hub** (header **Share** button, or `S`). A tabbed drawer. Cloud services and email delivery are **simulated** in the browser; share links, QR codes, downloads and mail drafts are real.
  - **Share & Link:** three templates: *Career Coach Weekly Digest*, *Mentor / Network Share* and *Full Job Hunt Archive*. A privacy redaction toggle hides salary, notes, follow-ups and links. Create a read-only **snapshot link** with an expiry (24h, 7d, 30d or never) and a client-side SVG **QR code** you can enlarge or save. The snapshot is compressed into the URL fragment, so nothing is uploaded. The **email digest** composer has recipient chips, saved contacts, a subject line, a personal note, a desktop/mobile preview, simulated delivery status, "Open in mail app" (mailto) and "Copy as text". The archive template also offers a restorable JSON download.
  - **Cloud Integrations:** Google Sheets and Notion two-way sync, with a simulated OAuth consent screen, a target picker, editable field mapping, auto-sync on change, and "Sync now" progress. Google Drive, Dropbox and OneDrive are backup destinations.
  - **Scheduled Digests:** a pipeline digest and an automatic cloud backup, each with frequency, day, time, template, recipients, destinations and **Run now**. Schedules run while the app is open and catch up on missed runs when you next open it.
  - **Activity Log:** a timeline grouped by day, with type filters, destination badges, record counts, status, repeated auto-syncs collapsed into one entry, and "Copy link" for active shares.
- **`/share#s=…`**: the public read-only snapshot page, with expiry checks and Print / Save PDF.
- **Backup** (header button): restore from JSON (merge or replace), open the Hub or the Full Archive, or clear all data. An amber dot on the button means your last backup is more than 7 days old.
- Toasts appear after each save, status change and delete, with **Undo** for status changes and deletes.
- Keyboard: `N` opens a new application, `S` opens the Sync & Share Hub, `Ctrl/⌘ + Enter` saves the form, `Esc` closes it.

## Project layout

```
src/app/            routes (dashboard, board, list), layout, error/404
src/components/     AppShell, DataDialog, views/, applications/, dashboard/, ui/
src/context/        ApplicationsProvider (state + persistence), ToastProvider, ApplicationModalProvider, CloudHubProvider
src/lib/            types, constants, stats, form validation, backup, storage, sample data
src/lib/cloud-sync/ templates, snapshot links, QR, schedules, sync simulation, hub storage
src/components/cloud-hub/  Hub drawer, tabs, connect wizard, digest/email preview, snapshot viewer
```
