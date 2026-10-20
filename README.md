# familytree

A 5-generation family tree web page with photo uploads, built with Next.js for Vercel.

## Deploy on Vercel

1. On vercel.com, choose **Add New → Project** and import this repository (framework: Next.js).
2. In the project's **Storage** tab, add:
   - **Upstash Redis** (stores family members)
   - **Blob** (stores photos)
   Connect both to the project; Vercel adds their keys automatically.
3. Optional: in **Settings → Environment Variables**, add `ADMIN_PASSWORD` with a password you share with family. Once set, it is needed to add members or upload photos. Without it, anyone with the link can add members.
4. **Redeploy** so the new settings take effect.

## Run locally

Requires Node.js 18.17+.

```
npm install
npx vercel env pull .env.local
npm run dev
```
