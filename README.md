# Elevate-Media-Invoices
Invoicing interface for Elevate Media

Live at https://darthkanaka.github.io/Elevate-Media-Invoices/ (GitHub Pages on `main`, no build step).

## How it works

- The pages in this repo collect the invoice details.
- The invoices themselves are produced by the Google Apps Script endpoints listed in `js/app.js`.
- The client list lives in `js/clients.js`. To add or change a client for good, edit `CLIENTS` there and push.

## No database

Until 2026-09-23 the client list came from a Supabase project (Elevate Media Finances). It held two rows and cost $10 a month, so it was moved into `js/clients.js` and the project was deleted. `clients.js` keeps the old method names, which is why `SupabaseClient` still appears in `app.js`.

Clients added through the New Client form are saved in that browser's localStorage only. Copy them into `CLIENTS` to keep them.

A backup of the old table is at `~/Documents/Developer/_backups/elevate-media-finances-2026-09-23/` on Kawika's Mac.
