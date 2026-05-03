# Pogosyan Budget — Setup Guide

15 minutes from zero to a working tool on your phone.

## What you're building

A web app at a URL like `pogosyan-budget.vercel.app` that:
- Works on phone, tablet, and desktop
- Categorizes Chase + Citi statements automatically
- Handles screenshot uploads of credit card balances
- Stores your data privately in your browser
- Costs $0 to host (Anthropic API costs apply, ~$0.05–0.15 per statement)

---

## Step 1: Create a Vercel account (3 min)

1. Go to **https://vercel.com/signup**
2. Sign up with **email** (simplest) or GitHub if you have one
3. Verify your email
4. When asked about a team, choose the **Hobby (free)** plan

---

## Step 2: Get your Anthropic API key ready (1 min)

1. Go to **https://console.anthropic.com/settings/keys**
2. Either use your existing key or click **Create Key** and name it "Budget Tool"
3. Copy the key (starts with `sk-ant-`) — keep this tab open, you'll need it in Step 4

---

## Step 3: Deploy the project (5 min)

There are two ways. Pick whichever is easier for you.

### Option A: Drag-and-drop deploy (no GitHub needed)

1. Download the **pogosyan-budget folder** I gave you (it has `index.html`, `vercel.json`, and an `api` folder)
2. Go to **https://vercel.com/new**
3. Click the small text that says **"Need a template?"** then **"Deploy a Template"** OR look for **"Import Third-Party Git Repository"**

If you don't see a clear drag-drop option, use Option B instead — it's actually easier.

### Option B: GitHub deploy (recommended)

1. Go to **https://github.com** and create a free account if you don't have one
2. Click the **"+"** in the top right → **"New repository"**
3. Name it `pogosyan-budget`, leave everything else default, click **Create repository**
4. On the next page, click **"uploading an existing file"** (it's a small link in the middle)
5. Drag in all 3 files from the folder I gave you: `index.html`, `vercel.json`, and the `api` folder (keep the folder structure intact)
6. Click **Commit changes**
7. Now go back to **https://vercel.com/new**
8. Click **Import** next to the `pogosyan-budget` repo you just made
9. Don't change any settings — just click **Deploy**
10. Wait ~30 seconds. You'll get a URL like `pogosyan-budget.vercel.app`

**Don't open it yet — there's one more step.**

---

## Step 4: Add your API key to Vercel (2 min)

This is the critical step that makes the API actually work.

1. In your Vercel dashboard, click on your `pogosyan-budget` project
2. Click **Settings** (top tab)
3. Click **Environment Variables** (left sidebar)
4. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY` (exactly this, all caps, with underscores)
   - **Value:** paste your `sk-ant-...` key from Step 2
   - **Environment:** leave all three checked (Production, Preview, Development)
5. Click **Save**
6. Now click **Deployments** (top tab)
7. Click the three dots `...` on the latest deployment → **Redeploy**
8. Wait ~30 seconds for it to finish

---

## Step 5: Use it (1 min)

1. Open your URL: `https://pogosyan-budget.vercel.app` (or whatever yours is)
2. On your phone:
   - Open the URL in **Safari**
   - Tap the **Share** button (the box with the up arrow at the bottom)
   - Tap **"Add to Home Screen"**
   - Now it lives on your home screen like an app
3. Drop in a PDF statement and watch it work

---

## Optional: Save it as a custom URL

Vercel gives you a free domain like `pogosyan-budget.vercel.app`. If you want something cleaner like `budget.grantedesigns.com`:

1. In your project settings → **Domains**
2. Add your domain and follow the DNS instructions
3. Skip this step if `pogosyan-budget.vercel.app` is fine — it's just easier

---

## Troubleshooting

**"Server missing ANTHROPIC_API_KEY" error**
You skipped Step 4 or didn't redeploy after adding the variable. Go back and redeploy.

**"Claude API error 401"**
Your API key is wrong, expired, or revoked. Generate a new one in the Anthropic console and update the env variable in Vercel.

**"Claude API error 529" or timeout**
Anthropic is overloaded or your statement is huge. Wait a minute and try again.

**Categorization is wrong**
Tell me which vendor → which category, and I'll update the system prompt in the `api/categorize.js` file. You re-upload that file to GitHub and Vercel auto-redeploys.

**App won't load on phone**
Hard refresh: pull down to refresh in Safari. If still broken, check Vercel dashboard → Deployments to see if your latest deploy succeeded.

---

## Cost

- **Vercel hosting:** $0 (free tier covers this easily)
- **Anthropic API:** ~$0.05–0.15 per statement processed. Maybe $1/month for normal use.
- **Domain (optional):** $10–15/year if you want a custom URL

Total: under $20/year if you go all-in, or $0–2/month if you stick with the free Vercel URL.
