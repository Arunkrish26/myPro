# MyFinance — Transaction Attachments

This package adds optional transaction attachments without changing the existing transaction, vehicle, category, dashboard, or authentication flows.

## Supabase SQL

Run:

`database/day5_transaction_attachments.sql`

in **Supabase Dashboard → SQL Editor → New Query** once.

It adds four nullable transaction metadata columns and creates a **private** `transaction-attachments` Storage bucket with owner-only RLS. Maximum file size is 10 MB.

## Supported files

- Images (`image/*`)
- PDF (`application/pdf`)
- Maximum size: 10 MB

## User flow

Transactions → optional Attachment → Save Transaction.

A new transaction is inserted first, the file is uploaded under `<user-id>/<transaction-id>/...`, and the transaction stores only the private Storage path and metadata. If attachment upload/metadata save fails while adding a new transaction, the new transaction is rolled back.

For editing, replacing an attachment uploads the new file, updates metadata, then removes the old object. Removing an existing attachment clears its metadata and deletes the old Storage object.

Transaction History includes a secure View action that generates a short-lived signed URL. Files are never made public.
