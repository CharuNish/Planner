# Setting up your planner 🌸

This guide walks you through everything once. It takes about 30–45 minutes and costs nothing.
Until each part is connected, that tab shows **sample data**, so you can do these steps in any order.

**What you'll set up**

1. Your two Google Sheets (Finance and Studies)
2. A Google "robot" account that can read them and your calendar
3. Free hosting on Vercel, with your password
4. (Optional) Morning reminders on Telegram
5. Installing it on your phone

---

## 1. Create your Google Sheets

The `templates/` folder has two files: **Finance-template.xlsx** and **Studies-template.xlsx**. (Finance-template now has an **Investments** tab too; you don't need to re-import it, the app adds that tab to your existing sheet automatically.)

For each one:

1. Go to [Google Drive](https://drive.google.com) → **New → File upload** and pick the file.
2. Open it, then **File → Save as Google Sheets**. (Use the new Google Sheets copy from now on.)
3. Delete the example rows if you like, but **keep the first row (the headings) exactly as it is**, and keep the tab names.
4. Copy the sheet's ID from its link: `docs.google.com/spreadsheets/d/`**`THIS-LONG-PART`**`/edit`. Save it somewhere for step 3.

### Finance sheet tabs

| Tab | Columns | Notes |
|---|---|---|
| **Transactions** | Date · Type · Category · Amount · Description · Method | One row per income or expense. Type is `Income` or `Expense`. Amounts are positive numbers. |
| **Budgets** | Category · Monthly Budget | One row per spending category. Use the same category names as in Transactions. |
| **Bills** | Name · Amount · Type · Frequency · Next Due · Category · End Date (optional) | Type: `Bill` / `Subscription` / `Payment`. Frequency: `Weekly`, `Monthly`, `Quarterly`, `Yearly` or `Once` (you can also type `Every 2 weeks`, `Every 2 months`, `Every 6 months`). You only need to set the first due date; the planner works out the next ones and also adds them to your Google Calendar. See step 15. |
| **Investments** | Name · Type · Institution · Amount · Rate % · Start Date · Term (Months) · Maturity Date · Interest Payout · Auto Renew · Current Value · Status · Notes | FDs, planned FDs, T-bills, unit trusts, shares, gold, savings. Created for you automatically. See step 13. |

### Studies sheet tabs

| Tab | Columns | Notes |
|---|---|---|
| **Deadlines** | Title · Type · Subject · Due Date · Notes | Exams and submissions. |
| **Tasks** | Subject · Task · Deadline · Status · Est Hours · Done On · Priority | **Deadline** must match a Title from the Deadlines tab, so the planner knows which exam a lesson belongs to. Status: `Todo`, `Doing` or `Done`. Est Hours is how long you think it'll take (blank = 2 hours). Priority is optional (`High`/`Medium`/`Low`). |
| **StudyLog** | Date · Hours · Subject · Notes | One row per study session (or per day). |
| **Targets** *(optional)* | Date · Hours | A different study goal for a specific day, e.g. `8` on a free day before an exam, or `0` on a wedding day. Days not listed use your weekday goals (see `STUDY_TARGET_HOURS` below). |

Dates work as `2026-11-20` or `20/11/2026` (day first).

> 💡 You can also add expenses and study hours **from the planner itself** (the purple buttons). They're saved straight into your sheet.

---

## 2. Create the Google "robot" account (service account)

This lets the planner read your sheets and calendar **without making them public**. You share them with the robot's email, just like sharing with a friend.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in with your Google account.
2. At the top, click the project picker → **New project** → name it `planner` → **Create**. Make sure it's selected.
3. Turn on the two APIs (click each link, then **Enable**):
   - [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
   - [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
4. Go to **IAM & Admin → [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)** → **Create service account**. Name it `planner-bot` → **Create and continue** → **Done** (skip the optional steps).
5. Click the new service account → **Keys** tab → **Add key → Create new key → JSON → Create**. A file downloads. **Keep it private** (never post it or put it in GitHub).
6. Open that file in Notepad. You need two values from it:
   - `client_email` (looks like `planner-bot@planner-12345.iam.gserviceaccount.com`)
   - `private_key` (starts with `-----BEGIN PRIVATE KEY-----`)

### Share your sheets and calendar with the robot

- **Each Google Sheet:** click **Share**, paste the `client_email`, choose **Editor**, untick "Notify", **Share**.
- **Google Calendar:** open [Google Calendar](https://calendar.google.com) → ⚙️ **Settings** → on the left click your calendar under "Settings for my calendars" → **Share with specific people → Add people** → paste the `client_email` → choose **Make changes to events** → **Send**.
  Your **calendar ID is simply your Gmail address** (e.g. `yourname@gmail.com`). You'll use it in step 3. Nothing else to do on this page.

> 💡 **Tip:** Start event titles with a tag like `[Gym]`, `[Exam]`, `[Lecture]`, `[Bill]` or `[Meeting]` to choose their colour in the planner. Without a tag it guesses from the title.

---

## 3. Put it online for free (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Sign up → Continue with GitHub** (the free "Hobby" plan).
2. Click **Add New → Project** → find **Planner** → **Import**.
3. Open **Environment Variables** and add these (name → value):

| Name | Value |
|---|---|
| `APP_PASSWORD` | the password you'll use to log in |
| `SESSION_SECRET` | any long random text, 32+ characters (e.g. mash the keyboard) |
| `GOOGLE_CLIENT_EMAIL` | `client_email` from the JSON file |
| `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON file, the **whole thing** including `-----BEGIN…` and `…END PRIVATE KEY-----\n` |
| `FINANCE_SHEET_ID` | ID of your Finance sheet |
| `STUDIES_SHEET_ID` | ID of your Studies sheet |
| `GOOGLE_CALENDAR_IDS` | your Gmail address |
| `OWNER_NAME` | Charuka |
| `TIMEZONE` | `Asia/Colombo` (change if you move) |
| `CURRENCY` | `Rs` (or `LKR`, `$`, …) |
| `STUDY_TARGET_HOURS` | your daily study goal. One number for every day (`4`), or **7 numbers for Monday to Sunday** separated by commas, e.g. `2,2,3,2,2,6,6`. For one-off days use the Targets tab. |

4. Click **Deploy**. After a minute you get a link like `planner-charuka.vercel.app`. Open it and log in. 🎉

Every time new code is pushed to GitHub, Vercel updates the site automatically.

---

## 4. (Optional) Morning reminders on Telegram

Every morning at **7:00 AM (Sri Lanka time)** the planner can message you: today's events, bills due in the next 3 days, budget left, deadlines this week and what to study first.

1. In Telegram, open **@BotFather** → send `/newbot` → follow the steps. It gives you a **token**.
2. Open your new bot and send it any message (like "hi").
3. In a browser open `https://api.telegram.org/bot<YOUR-TOKEN>/getUpdates` and find `"chat":{"id": 123456789`. That number is your **chat ID**.
4. In Vercel → your project → **Settings → Environment Variables**, add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` and `CRON_SECRET` (any random text). Then **Deployments → ⋯ → Redeploy**.

For the bot's message times (morning, midday, evening, night), see **step 14**.

---

## 5. Install it on your phone

- **Android (Chrome):** open your planner link → ⋮ menu → **Add to Home screen / Install app**.
- **iPhone (Safari):** open the link → Share button → **Add to Home Screen**.

It opens full-screen like a normal app.

---

---

# Stage 2: Updates, Opportunities, Weight, Habits, Mini goals

## 6. Create your Life sheet

Upload **templates/Life-template.xlsx** the same way as before (**File → Save as Google Sheets**, then **Share** the new copy with the robot's email as **Editor**). Copy its ID.

| Tab | Columns | Notes |
|---|---|---|
| **Weight** | Date · Weight (kg) · Notes | Add a row whenever you weigh yourself (or use the button on the Weight tab). |
| **Habits** | Date · Sleep (h) · Water (glasses) · Gym · Notes | Gym is `Yes` or `No`. The Habits tab has a quick card for each habit (sleep, water, gym, note). Each saves on its own into that day's row, so you can log them at different times. |
| **Goals** | Goal · Category · Target Date · Status · Progress (%) · Cost · Notes | Category: `Career`, `Buy`, `Travel`, `Learn`, `Health` or `Other`. No image column needed: tap **📷 Add photo** on a goal card on the site to upload your own picture (needs Vercel Blob, see 'Wins photos'). Goals without one get a matching photo automatically. Uploaded photos are remembered in a **GoalPhotos** tab the site makes by itself — don't edit it. If you rename a goal, upload its photo again. (An old Image URL column still works if you keep it.) |
| **RecipeLog** | Date · Recipe · Link · Rating · Comment | Filled in when you tick **I made this** on a recipe. |
| **Opportunities** | Title · Type · Organisation · Deadline · Link · Status · Notes | Filled in when you **Save** an opportunity. Update Status as you go (Interested → Applying → Applied → Interview → Offer). |

## 7. Get a free Gemini key (for summaries and the opportunity search)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in.
2. Click **Create API key** (pick your `planner` project if asked). Copy the key.

It's free; you don't need to add a card. The planner uses only a handful of requests a day.

## 8. Get a free YouTube key (for the video picks)

1. Go to the [YouTube Data API page](https://console.cloud.google.com/apis/library/youtube.googleapis.com) (make sure your `planner` project is selected at the top) → **Enable**.
2. Go to **APIs & Services → [Credentials](https://console.cloud.google.com/apis/credentials)** → **Create credentials → API key**. Copy it.
3. (Recommended) Click the key → under **API restrictions** choose **Restrict key** → tick **YouTube Data API v3** → Save.

## 9. Add the new settings in Vercel

**Settings → Environment Variables**, then **Redeploy**:

| Name | Value |
|---|---|
| `LIFE_SHEET_ID` | ID of your Life sheet |
| `GEMINI_API_KEY` | your Gemini key |
| `YOUTUBE_API_KEY` | your YouTube key |
| `WEIGHT_GOAL_KG` | your goal weight, e.g. `65` (optional) |
| `HEIGHT_CM` | your height, e.g. `160`, to show BMI (optional) |
| `SLEEP_TARGET_HOURS` | e.g. `7` (optional, default 7) |
| `WATER_TARGET_GLASSES` | e.g. `8` (optional, default 8) |

The Updates and Opportunities tabs refresh by themselves at **6:00 AM Sri Lanka time**. The first time you open them before that, they may take up to a minute to load.

**Want different topics?** Edit `src/lib/interests.ts` in GitHub (pencil icon ✏️ → change the words → **Commit changes**). Vercel updates the site automatically.

---

# Stage 4: Content (your social media analytics)

You fill in a spreadsheet; the **Content** tab turns it into follower counts, growth charts, likes and nudges. Nothing is ever posted for you.

## 10. Open the Content tab once

That's the whole setup. The first time you open **Content**, the site adds four tabs to your Life sheet (or to `CONTENT_SHEET_ID` if you set one), with the headers and dropdowns ready:

| Tab | One row per… | Columns |
|---|---|---|
| **Followers** | account, each time you check (once a week is plenty) | Date, Channel, Platform, Followers |
| **Uploads** | thing you made | Date, Channel, Title, Type, Where, Instagram/Facebook/TikTok/YouTube Likes, …Views, Link, Notes |
| **Collabs** | brand deal | Date, Brand, Channel, Platforms, Video idea, Price, Status, Due date, Paid, Contact, Notes |
| **Follower Goals** | account (already filled in for you) | Channel, Platform, Goal. Type a goal, or leave it empty to aim for the next round number |

**Uploads:** a Reel, Picture or Carousel counts for every platform of that channel (Life with C: Instagram, TikTok, YouTube; Ane Manda: Instagram, Facebook, TikTok, YouTube). Pick **Long video** as the Type and it counts for YouTube only. Want something else? Type the platforms in **Where** (e.g. `Instagram, TikTok`). Fill in the likes for each platform whenever you check; views are optional.

You can also press **💌 Log follower counts** on the Content tab instead of typing in the sheet.

If you had the older Content tabs (Queue, Posts, Captions, Channels), you can delete them; they aren't used any more.

**Nudges:** when an account goes 7 days without an upload, the Content tab shows a nudge, and the morning Telegram message reminds you (plus collabs due within a week).

---

# Extras you can change

- **Body measurements:** add a **Measurements** tab to your Life sheet with the headers `Date | Chest | Waist | Belly | Hip | Arms | Thigh | Notes` (it's in the updated [`templates/Life-template.xlsx`](templates/Life-template.xlsx)). Then use **📏 Add measurements** on the Weight tab.
- **Home countdown:** press **✎ change** under the countdown and pick a new date and name. (It saves to a **Settings** tab in your Life sheet, created automatically.)
- **Hype quotes:** the "imagine how ___ would regret it" lines use the name in `EX_NAME` (Vercel setting). Set it to `none` to turn those off.

---

## 11. Wins page + the bestie morning message

**Wins (no setup needed).** Open the 🏆 Wins tab (or the box on Home), write what you did, pick a category, Save. The first save creates a **Wins** tab in your Life sheet by itself (columns: Date, Win, Category, Photo). You can also type wins straight into that tab.

**Photos (one-time, free, about 2 minutes).** Photos are saved in Vercel's free storage (Vercel Blob, 1 GB free on the Hobby plan; photos are shrunk to about 300 KB, so that's thousands of photos).
1. Go to vercel.com, open your **planner** project, and click **Storage** in the left menu.
2. Click the white **Create Database** button on the right (or top-right **Create New → Store**, which opens the same list).
3. In the list that pops up, click **Blob** (Vercel's own file storage, usually near the top. If you don't see it, type `blob` in the search box). Click **Continue**.
4. Name it `wins-photos`. If it asks for access, choose **Public**. Click **Create**. When it asks which environments to connect, keep all ticked and click **Connect**. This adds `BLOB_READ_WRITE_TOKEN` for you, nothing to copy.
5. Go to **Deployments**, click the ⋯ next to the newest one, **Redeploy**. Done: the 📸 Add photo button now works.
(Photo links are long random addresses, so nobody can guess them, but anyone you send a link to can open that photo.)

**Morning message.** Every day at 7:00 AM (Sri Lanka) Telegram gets a bestie-style recap of yesterday (study hours vs goal, tasks ticked off, gym/sleep/water, money spent, weight and measurements, posts and collabs, calendar events, and your Wins) plus today's to-do list (calendar, deadlines this week, top study tasks, bills due in 3 days, collabs, posting nudges).
- It uses your existing `GEMINI_API_KEY` for one short call per morning. If Gemini is busy or out of free quota, a built-in bestie voice writes it instead, so it always arrives.
- To test it any time: Home page → **💌 Send me the morning message now**.

## 12. Steps and workouts (Body & Health tab)

Type your daily step count (from your watch or the Fitness app) and tap what you trained, right on the **💪 Body & Health** tab. Nothing reads your Apple Health data.
Optional Vercel setting: `STEP_GOAL` (default 10000).

## 13. Fixed deposits & investments (Finance tab)

**No new settings needed.** Open the 💰 Finance page once and a new **Investments** tab appears in your Finance sheet by itself (with dropdowns). Scroll to **🏦 Savings & investments** at the bottom of the Finance page.

**Add an FD (easiest way):** press **+ Add FD / investment** on the Finance page, fill it in, Save. It goes straight into the sheet.

**Or type it into the sheet.** One row per FD / investment:

| Column | What to put | Example |
|---|---|---|
| Name | Anything that helps you recognise it | `FD 12 months` |
| Type | Pick from the dropdown: `Fixed Deposit`, `Treasury Bill`, `Treasury Bond`, `Unit Trust`, `Stocks (CSE)`, `Gold`, `Savings Account`, `Other` | `Fixed Deposit` |
| Institution | The bank or company | `Commercial Bank` |
| Amount | The money you put in (just the number, no "Rs") | `500000` |
| Rate % | Yearly interest rate from your FD certificate (FDs, T-bills, bonds, savings only) | `10.5` |
| Start Date | The day the FD started | `2026-01-15` |
| Term (Months) | How long it's locked for. **Or** leave this empty and fill Maturity Date instead | `12` |
| Maturity Date | Optional if you filled Term. Needed for T-bills (e.g. 91 days) | `2027-01-15` |
| Interest Payout | `At Maturity`, `Monthly` or `Yearly` (how the bank pays the interest) | `At Maturity` |
| Auto Renew | `Yes` if the bank renews it automatically when it ends | `No` |
| Current Value | **Only for shares, unit trusts and gold**: what it's worth today. Update it whenever you check the price. Leave empty for FDs | `161200` |
| Status | `Active` (running now), `Planned` (an FD you want to open later), `Matured` or `Withdrawn` (finished, kept for history) | `Active` |
| Notes | Anything: certificate number, what the money is for | |

**Planned / future FDs:** add a row with Status `Planned` and the date you plan to open it as the Start Date. It shows under 🌱 Planned with a countdown and the money you'll have at the end. When you actually open it, change Status to `Active` (and fix the rate/date if they changed).

**When an FD ends:** if it auto-renews, the planner rolls it into the next term by itself. If not, it reminds you; then either change Status to `Matured`, or add a new row for the renewed FD.

**What you'll see:** total worth today, interest earned so far, interest you'll get this term, next maturity countdown, a "where your money is" chart, upcoming maturities with progress bars, all holdings, and planned FDs.
**Morning message:** the 7 AM Telegram to-do list now also says when an FD matures within 7 days, when a planned FD is due to start within 3 days, and when one has matured and is waiting for you.

Interest is worked out simply (amount × rate × days ÷ 365), before tax, so it can be a few rupees off your bank's figure. Your bank's slip is always the final word.

## 14. When the Telegram bot texts you

**No setup needed.** The bot texts you up to 4 times a day (Sri Lanka time):

| Message | Time | What it says |
|---|---|---|
| ☀️ Morning recap | 7:00 AM | Yesterday's recap + today's to-do list (the one from step 11) |
| 🚨 Midday deadline check | 1:00 PM | **Only** sends if a deadline or today's study goal is urgent |
| 🌆 Evening check-in | 6:00 PM | How today is going (study hours, steps, water, spends, wins) + one mission for tonight |
| 🌙 Night recap | 9:30 PM | Today's scoreboard, tomorrow's calendar, deadlines and bills, and what to log before bed |

- Vercel's free timers run "sometime within the hour", so each message arrives within about half an hour of its time.
- Evening and night messages don't use Gemini, so your free Gemini quota is still only used once a day (morning).
- Nothing is sent twice: every message is listed in a **BotLog** tab in your Life sheet (created by itself the first time).
- Want different times? Just ask Claude. (They live in `src/lib/bot.ts` and `vercel.json`.)

## 15. Recurring bills in your Google Calendar

Every bill in the **Bills** tab is added to your Google Calendar as an all-day, repeating event (yellow, with a reminder at 9:00 AM the day before). A monthly bill repeats every month, a weekly one every week, and so on. On the website it also shows in every upcoming list (Finance, Home and Calendar) each time it is due, so you never have to change **Next Due** by hand.

- **When it happens:** every morning at 6:00 AM, and a few seconds after you open the Finance page. To do it right away, click **📅 Add to my calendar now** on the Finance page, next to "Bills & subscriptions".
- **Change a bill:** edit the row in the sheet (amount, date, frequency). The calendar event updates by itself. Don't edit the bill in Google Calendar, because the sheet wins.
- **Bill that ends (e.g. a 12-month plan):** put the last date in the **End Date** column (G). The bill stops showing after that date and the calendar event stops repeating then. Leave it blank to keep it going forever.
- **Stop a bill:** delete its row in the sheet, or set its End Date. Its calendar event is removed too. Only events the planner made are ever removed.
- **Your sheet is never changed.** The planner only reads it.
- **If you see "no access (403)":** the robot can only read your calendar. Open [Google Calendar](https://calendar.google.com) → ⚙️ **Settings** → click your calendar on the left → **Shared with** → next to the robot's email pick **Make changes to events**.

## Running it on your laptop (optional, for tinkering)

1. Install [Node.js](https://nodejs.org) (the LTS version).
2. In the project folder: copy `.env.example` to `.env.local` and fill it in (at minimum `APP_PASSWORD`).
3. Run `npm install`, then `npm run dev`, and open http://localhost:3000.

## If something goes wrong

- **"Couldn't read your finance sheet … 403"**: the sheet isn't shared with the robot's email, or the Sheets API isn't enabled.
- **"… 404"**: the sheet ID is wrong.
- **"Unable to parse range"**: a tab name is different from the template (e.g. `Transaction` instead of `Transactions`).
- **Calendar shows nothing**: check the calendar is shared with the robot and the calendar ID is right.
- **Private key errors**: paste the whole key, including the BEGIN/END lines.
