# Connecting a Hostinger Domain to Cloudflare Pages

This guide covers **two independent workflows** you need, in order:

1. **Deploy the app itself** to Cloudflare Pages/Workers (it does not live on Hostinger — Hostinger only sells/manages the domain name; Hostinger's shared hosting cannot run this app because it requires the Cloudflare Workers edge runtime + D1 database).
2. **Point your Hostinger-registered domain** at that Cloudflare deployment, using either of two DNS strategies.

If you already deployed and just need the DNS steps, skip to **Part 2**.

---

## Part 1 — Deploy the App to Cloudflare Pages

You need a Cloudflare account (free tier is sufficient). Two ways to get credentials into this project:

- **Option A — Bring Your Own Key (BYOK)**: You generate a Cloudflare API Token yourself and paste it into this project's **Deploy** panel. You keep full ownership of the Cloudflare account, database, and domain binding.
- **Option B — Genspark-hosted**: Genspark provisions and manages the Cloudflare resources on your behalf under a Genspark-managed account.

> This project has **not yet been deployed to production** — the steps below assume Option A (BYOK), since you control the domain and will likely want direct `wrangler` access. Ask your Genspark agent to run this once you've decided which option to use; do not run `wrangler login` (interactive OAuth login does not work in the sandbox) — use an API token instead.

### 1.1 Create a Cloudflare API Token
1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **My Profile → API Tokens → Create Token**.
3. Use the **"Edit Cloudflare Workers"** template (grants Pages, Workers, D1, KV, R2 edit permissions), or create a custom token with:
   - `Account.Cloudflare Pages: Edit`
   - `Account.D1: Edit`
   - `Account.Workers Scripts: Edit`
4. Copy the generated token and paste it into the project's **Deploy** tab in Genspark (or set it as `CLOUDFLARE_API_TOKEN` in the sandbox environment).

### 1.2 Create the Production D1 Database
The repo's `wrangler.jsonc` ships with a **placeholder** `database_id` (`local-placeholder-id`) because the real database can only be created once you have live Cloudflare credentials:

```bash
cd webapp
npx wrangler d1 create ncfvs-production
```

This prints a real `database_id`. Copy it into `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "ncfvs-production",
    "database_id": "PASTE-THE-REAL-UUID-HERE"
  }
]
```

### 1.3 Apply Migrations to Production
```bash
npx wrangler d1 migrations apply ncfvs-production --remote
```
This runs `migrations/0001_initial_schema.sql` and `migrations/0002_seed_data.sql` against the **live** database, creating all 14 tables and seeding the 9 roles + the default `admin` / `ncfvs` login.

⚠️ **Immediately after your first production login, go to Admin Panel → Reset Password and change the `admin` password.**

### 1.4 Set the JWT Secret
The app falls back to a hardcoded development secret (`DEV_SECRET`) if `JWT_SECRET` isn't set — this is fine for local dev but **must not** be used in production:

```bash
npx wrangler pages secret put JWT_SECRET --project-name ncfvs
# paste a long random string when prompted, e.g. output of:
# openssl rand -base64 48
```

### 1.5 Build and Deploy
```bash
npm run build
npx wrangler pages deploy dist --project-name ncfvs
```
Wrangler will print your live URL, e.g. `https://ncfvs.pages.dev`. Verify it loads and you can log in.

Every subsequent deploy is just:
```bash
npm run build && npx wrangler pages deploy dist --project-name ncfvs
```

---

## Part 2 — Point Your Hostinger Domain at Cloudflare

You registered/manage your domain at Hostinger, but it is **DNS-only** there (no Hostinger hosting is used). You have two options. **Option 2A (subdomain via CNAME) is simpler and keeps Hostinger as your DNS provider.** **Option 2B (full nameserver delegation) is required if you want the bare root/apex domain** (e.g. `ncfventurestudio.com` with no subdomain) to point at Cloudflare Pages, and also unlocks Cloudflare's CDN/SSL/WAF for the whole domain.

### Option 2A — CNAME on a Subdomain (keep DNS at Hostinger)
Best if you're fine with something like `app.yourdomain.com` or `studio.yourdomain.com` and don't want to touch nameservers.

1. In **Cloudflare dashboard → Workers & Pages → your project (`ncfvs`) → Custom domains**, click **Set up a custom domain**, enter e.g. `app.yourdomain.com`, and confirm. Cloudflare will show you the required DNS target (usually `<project>.pages.dev`).
2. Log in to **Hostinger → Domains → yourdomain.com → DNS / Nameservers → DNS Records**.
3. Add a new record:
   | Type | Name (Host) | Value / Points to | TTL |
   |---|---|---|---|
   | `CNAME` | `app` (or your chosen subdomain) | `ncfvs.pages.dev` (the value Cloudflare showed you) | Auto / 14400 |
4. Save. DNS propagation typically takes a few minutes up to a few hours.
5. Back in Cloudflare, the custom domain status will flip from "Pending" to "Active" once it detects the CNAME and issues an SSL certificate automatically. No manual SSL upload is required.
6. Visit `https://app.yourdomain.com` — you should see the login page.

> Note: With this method, only the subdomain is covered by Cloudflare's SSL/CDN — the root domain and any other subdomains keep whatever Hostinger already serves for them (e.g. a placeholder page, if any).

### Option 2B — Full Nameserver Delegation to Cloudflare (needed for the root/apex domain)
Best if you want `yourdomain.com` (no subdomain) to load the app, or you want Cloudflare to manage **all** DNS for the domain (mail records, other subdomains, etc. — you re-create them inside Cloudflare).

1. In the **Cloudflare dashboard**, click **Add a Site**, enter `yourdomain.com`, choose the Free plan.
2. Cloudflare scans your existing DNS records at Hostinger and imports them automatically — **review this list carefully** and add any missing records (especially `MX` records for email, if you use Hostinger email) before proceeding, since once you switch nameservers Hostinger's DNS panel stops being authoritative.
3. Cloudflare gives you two nameservers, e.g. `ana.ns.cloudflare.com` and `bob.ns.cloudflare.com` (yours will differ).
4. Log in to **Hostinger → Domains → yourdomain.com → DNS / Nameservers**, choose **"Change Nameservers" / "Use custom nameservers"**, and replace Hostinger's default nameservers with the two Cloudflare nameservers from step 3.
5. Save. Nameserver propagation can take from 15 minutes up to 24–48 hours worldwide (usually much faster in practice).
6. Once Cloudflare shows the zone as **Active** (it emails you, or check the dashboard), go to **DNS → Records** inside Cloudflare and add:
   | Type | Name | Value / Target | Proxy status |
   |---|---|---|---|
   | `CNAME` | `@` (root) | `ncfvs.pages.dev` | Proxied (orange cloud) |
   | `CNAME` | `www` | `ncfvs.pages.dev` | Proxied (orange cloud) |

   (Cloudflare supports "CNAME flattening" at the root/apex automatically, so a `CNAME` at `@` works even though plain DNS normally disallows this.)
7. In **Workers & Pages → your project → Custom domains**, add `yourdomain.com` and `www.yourdomain.com`. Cloudflare issues SSL certificates automatically.
8. Visit `https://yourdomain.com` — the app should load with a valid padlock/HTTPS.

### Which option should you pick?
| | 2A: CNAME subdomain | 2B: Full nameserver delegation |
|---|---|---|
| Effort | Low — one DNS record | Medium — must migrate all DNS records |
| Root domain (`yourdomain.com`) support | ❌ No (subdomain only) | ✅ Yes |
| Keeps Hostinger as DNS manager | ✅ Yes | ❌ No (Cloudflare becomes DNS manager) |
| Affects existing email (MX) records | ❌ No impact | ⚠️ Must re-add MX records in Cloudflare |
| Cloudflare CDN/WAF for whole domain | ❌ Only the subdomain | ✅ Whole domain |

If you're unsure, start with **Option 2A** — it's low-risk and reversible (just delete the CNAME record to undo it). Move to **Option 2B** later if you want the bare domain or full Cloudflare DNS management.

---

## Part 3 — About "Real-Time" Data Between Users

To restate what was clarified in conversation: this app is **not** using WebSockets or server push, so two users viewing the same channel simultaneously will not see each other's new posts/tasks/votes appear instantly without a refresh or re-navigation.

However, **all data is centrally stored** in the single Cloudflare D1 database (`ncfvs-production`) — there is no per-browser/local storage of app data. This means:
- Every user, on every device, reads and writes the **same shared source of truth**.
- As soon as any user reloads the channel (or navigates back into it), they will see everyone else's changes — task moves, new posts, stage-gate votes, RSVPs, etc.
- This is standard "centrally consistent" behavior (like a typical web app / REST API), just not "push/real-time" (like Slack or Discord's live socket updates).

If true push-style real-time updates become a requirement later, the recommended low-effort upgrade path on Cloudflare is **Durable Objects with WebSockets**, or **polling** the relevant `GET` endpoints (e.g. every 5–10s) from the frontend — either can be added incrementally without changing the data model.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Cloudflare custom domain stuck "Pending" | DNS record not yet propagated, or wrong CNAME target | Double-check the exact value Cloudflare gave you; use `dig CNAME app.yourdomain.com` to confirm propagation |
| `Error 1101` / Worker threw exception | Missing `JWT_SECRET` secret, or D1 migrations not applied to `--remote` | Re-run steps 1.3 and 1.4 |
| Login fails with correct `admin`/`ncfvs` in production | Migrations not applied to the **production** (`--remote`) database, only local | Run `npx wrangler d1 migrations apply ncfvs-production --remote` |
| Root domain shows Hostinger's default page instead of the app | Used Option 2A (subdomain-only) but tried to load the bare domain | Either use the subdomain you configured, or switch to Option 2B for root-domain support |
| Email stopped working after nameserver switch | MX records not re-created in Cloudflare after Option 2B | Add your mail provider's MX records under Cloudflare → DNS → Records |
