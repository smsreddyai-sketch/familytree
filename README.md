# familytree

A private family tree for our family: email-code login, a top-down tree with lines from parents to children
(any number of generations), separate photos for husband and wife, divorce/delete support, a "where we live"
summary and PDF download. Built with Next.js for Vercel.

## Who can do what

| Role   | See tree + PDF | Add / edit / delete people & photos | Manage who has access |
|--------|:-:|:-:|:-:|
| Viewer | ✓ | | |
| Editor | ✓ | ✓ | |
| Admin  | ✓ | ✓ | ✓ |

Emails in `OWNER_EMAILS` are always admins. Admins add other family emails from the **Access** button.

## Vercel setup

Storage (Storage tab): **Upstash Redis** (people, marriages, access list) and **Blob** (photos).

Environment variables:

| Name | Value |
|------|-------|
| `OWNER_EMAILS` | Owner email(s), comma separated |
| `SESSION_SECRET` | Long random string (signs login cookies) |
| `GMAIL_USER` | Gmail address that sends login codes |
| `GMAIL_APP_PASSWORD` | Google App Password for that Gmail (not the normal password) |

## Run locally

Requires Node.js 20+.

```
npm install
npx vercel env pull .env.local
npm run dev
```

Without `GMAIL_*` set, the login code is printed in the terminal instead of emailed.
