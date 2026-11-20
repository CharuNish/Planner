# ⌚ Apple Watch → Dashboard (free, every night)

Apple doesn't let websites read Health data directly. So we use the **Shortcuts** app that's already on your iPhone:
every night it reads today's numbers from the Health app (where your Apple Watch saves everything) and sends them to your dashboard.
They land in a new **Health** tab in your Life sheet, the **💪 Body & Health** tab (renamed from Weight), the 7 AM Telegram recap, and "gym" gets ticked on Habits when you did a real workout.

It takes about **20 minutes once**. After that you never touch it again.

What gets sent each day: steps, distance, active calories (Move ring), exercise minutes, resting heart rate, average / lowest / highest heart rate, and each workout (type + minutes).

---

## Step 1. Make a secret key in Vercel (2 min)

This key stops strangers from sending fake data to your site.

1. Go to **vercel.com** → open your **planner** project → **Settings** → **Environment Variables**.
2. **Key:** `HEALTH_KEY`
   **Value:** make up a long password with no spaces, e.g. `charu-watch-7Kq92xLp` (write it down, you'll type it into the Shortcut).
3. Click **Save**.
4. Optional goals (skip to keep the defaults):
   - `STEP_GOAL` = `10000`
   - `MOVE_GOAL_KCAL` = `400`
   - `EXERCISE_GOAL_MIN` = `30`
   - `AGE` = your age (helps judge very high heart-rate spikes)
5. Go to **Deployments** → on the top one click **⋯** → **Redeploy** → **Redeploy**. Wait until it says **Ready**.

---

## Step 2. Build the Shortcut on your iPhone (15 min)

> Tip: every time you need an action, tap the **search bar at the bottom** ("Search Actions") and type its name.
> Blue words inside an action are buttons. Tap them to change them.

### 2.1 Create it
1. Open the **Shortcuts** app → **Shortcuts** tab (bottom) → tap **+** (top right).
2. Tap the name at the very top (it says "New Shortcut") → **Rename** → type **`Sync Health to Dashboard`** → **Done**.

### 2.2 Steps (3 actions; this pattern repeats, so the first one is explained in detail)
1. Search **Find Health Samples** → tap it to add.
2. It reads something like *Find All Health Samples where Type is …*. Tap the blue word after **Type is** → pick **Steps**.
3. Look for a second line **Start Date is Today**.
   - If it isn't there: tap **Add Filter** → a new line appears → tap its first blue word → choose **Start Date** → make it say **is today**.
4. Search **Calculate Statistics** → add it. Tap the blue word **Average** → choose **Sum**.
   (It automatically uses the Health Samples from the action above. ✅)
5. Search **Set Variable** → add it. Tap **Variable Name** → type **`Steps`** → **Done**.
   It should read *Set variable Steps to Statistics*.

Your first block looks like this:
```
Find All Health Samples where Type is Steps and Start Date is today
Calculate Sum of Health Samples
Set variable Steps to Statistics
```

### 2.3 Do the same block 4 more times
Exactly like 2.2 (Find Health Samples → Calculate Statistics → Set Variable), only change the three bold things:

| Type is | Calculate | Set variable name |
|---|---|---|
| **Walking + Running Distance** | **Sum** | **`Distance`** |
| **Active Energy** | **Sum** | **`Active`** |
| **Exercise Minutes** (sometimes called *Exercise Time*) | **Sum** | **`Exercise`** |
| **Resting Heart Rate** | **Average** | **`Resting`** |

### 2.4 Heart rate (average, lowest, highest)
1. **Find Health Samples** → Type **Heart Rate**, Start Date **is today**.
2. **Calculate Statistics** → **Average** → **Set Variable** `HRAvg`.
3. **Calculate Statistics** again. This one must use the heart rate samples, not the average:
   tap its blue input word (it may say *Variable* or *Statistics*) → **Select Variable** → the screen scrolls up → tap the **Health Samples** bubble of the **Heart Rate** Find action.
   Set the calculation to **Minimum** → **Set Variable** `HRMin`.
4. Repeat 3 once more with **Maximum** → **Set Variable** `HRMax`.

### 2.5 Workouts (most iPhones: SKIP this section)
Many iPhones don't let Shortcuts read workouts at all (you'll only see "Log Workout" and "Search Fitness+").
If **Find Health Samples** has no **Workouts** type and there's no **Find Workouts** action, skip to 2.6 and leave out the `workouts` field.
Instead, log what you trained with one tap on the **💪 Body & Health** tab, and any day with 30+ watch exercise minutes ticks gym automatically.

Only if your iPhone does have it:
1. **Find Health Samples** → Type **Workouts**, Start Date **is today**.
2. Search **Repeat with Each** → add it (it uses the Health Samples automatically).
3. *Inside* the Repeat (between **Repeat with each** and **End Repeat**), add a **Text** action. In its box:
   - Tap **Repeat Item** in the bar above the keyboard to insert it. Then **tap the Repeat Item bubble** you just inserted → a list of details pops up → choose **Workout Type** (if your iPhone doesn't show that, choose **Type**).
   - Type a straight line character: **`|`** (on the keyboard: **123** → **#+=** → **|**).
   - Insert **Repeat Item** again → tap the new bubble → choose **Duration**.
   - The box now looks like: `Repeat Item (Workout Type) | Repeat Item (Duration)`.
4. *After* **End Repeat**, add **Combine Text**. Tap the first blue word → choose **Repeat Results**. Make it say **with New Lines**.

### 2.6 Send it to the dashboard
1. Search **Get Contents of URL** → add it.
2. Tap **URL** and type exactly:
   **`https://planner-sable-five.vercel.app/api/apple-health`**
3. Tap the little **arrow (›) / Show More** on the action.
4. **Method** → **POST**. **Request Body** → **JSON**.
5. Tap **Add new field** → **Text** for each row below. Left box = key (type exactly, lowercase), right box = value:

| Key | Value (how to fill it) |
|---|---|
| `key` | type your HEALTH_KEY from Step 1 |
| `date` | tap the box → in the bar above the keyboard pick **Current Date** → tap the bubble → **Date Format: Custom** → type **`yyyy-MM-dd`** |
| `steps` | tap the box → pick the variable **Steps** (above the keyboard, or **Select Variable**) |
| `distance` | variable **Distance** |
| `active` | variable **Active** |
| `exercise` | variable **Exercise** |
| `resting` | variable **Resting** |
| `hr_avg` | variable **HRAvg** |
| `hr_min` | variable **HRMin** |
| `hr_max` | variable **HRMax** |
| `workouts` | the **Combined Text** bubble (only if you did 2.5, otherwise leave this row out) |

6. Last action: search **Get Dictionary Value** → add it → tap **Key** → type **`message`**.
7. Search **Show Notification** → add it. It will show the **Dictionary Value**, so you get a little "✅ Saved" pop-up.
8. Tap **Done** (top right).

### 2.7 Test it
1. Tap the shortcut once to run it.
2. iPhone asks to **access Health** → tap **Allow** / turn everything on → **Allow**.
3. It asks to connect to **planner-sable-five.vercel.app** → **Always Allow**.
4. You should see a notification like **"✅ Saved 2026-11-20: 8,432 steps, 1 workout. Bestie bot is watching 👀"**.
5. Open the dashboard → **💪 Body & Health**. Your numbers are there. 🎉

If the notification says something else, it tells you what's wrong (e.g. *Wrong key* = the `key` field doesn't match HEALTH_KEY in Vercel). Screenshot it and send it to Claude.

---

## Step 3. Make it run by itself every night (2 min)

1. Shortcuts app → **Automation** tab (bottom) → **+** (or **New Automation**).
2. Choose **Time of Day**.
3. Set **11:00 PM**, **Daily**.
4. Choose **Run Immediately** (not "Run After Confirmation"). Turn **Notify When Run** off if you like.
5. Tap **Next** → pick **Sync Health to Dashboard** → **Done**.

**Important:** iPhone hides Health data while the phone is locked, so pick a time when you're usually still scrolling 😏. If the Body & Health tab says "last sync 2 days ago", either change the time, or add a second automation: **+** → **App** → choose an app you open every evening (e.g. Instagram) → **Is Closed** → **Run Immediately** → same shortcut. Running it many times a day is fine: each run just updates today's row.

You can also run it manually any time (or add it to your Home Screen: open the shortcut → **ⓘ** → **Add to Home Screen**).

---

## What happens with the data
- **Life sheet → Health tab** (made automatically): one row per day.
- **💪 Body & Health tab**: rings, 30-day daily steps chart, a heart check that flags unusual BPM (e.g. resting rate 8+ above your normal, over 100 or under 40), a workout summary with weekly Strength / Cardio / Mobility targets, and a "what to train next" card.
- **7 AM Telegram**: yesterday's steps, workouts, kcal and resting heart rate in the recap. If the watch hasn't synced for 2+ days, it nags you.
- **Habits**: 30+ exercise minutes on the watch, or a logged workout of 15+ minutes that isn't a walk, ticks **gym** for that day.
- **Workouts**: tap "What did you train?" on the Body & Health tab (Strength, Cardio, HIIT, Yoga…). They're saved in a **Workouts** tab in the Life sheet and feed the workout summary and "what to train next".
