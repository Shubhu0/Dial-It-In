# Dial It In

A mobile-first coffee dialling-in app that helps you track brew sessions, tune your grind and extraction parameters, and converge on the perfect cup — for any brew method.

Built with Expo (React Native), Supabase, and NativeWind. Runs on iOS, Android, and web.

---

## Features

### Bean Management

- **Add beans** via a 2-step wizard:
  - **Step 1** — capture a photo with the device camera or pick one from your photo library, then fill in bean details: name, roaster, origin, roast level (light / medium / medium-dark / dark), roast date, and free-form notes.
  - **Step 2** — set a starting grind setting using preset chips (8–38) or type a custom value. An in-app grind guide maps ranges to brew methods (espresso, pour over, French press).
- Beans are stored per-user in Supabase with full RLS (row-level security) so data is always private.
- A horizontal bean list on the home screen lets you quickly switch the active bean.

### Brew Logging

- Log a brew session for the currently selected bean.
- **Four brew methods supported**: Espresso, Pour Over, AeroPress, French Press — each with method-appropriate parameter sliders:
  - **Espresso**: dose (g), yield (g), time (s). Live ratio badge (e.g. `1:2.1`) updates as you adjust.
  - **Pour Over / AeroPress / French Press**: dose (g), water volume (g), brew time (s).
- All parameters are adjusted with smooth sliders that snap to sensible step sizes.
- Brews are saved to Supabase and linked to the user's account and selected bean.

### Taste Dial

- An interactive **radial dial** (0–100 scale) lets you mark where a brew sits on the sour-to-bitter spectrum:
  - `0–29` — Very Sour
  - `30–44` — Sour
  - `45–55` — Balanced
  - `56–70` — Bitter
  - `71–100` — Very Bitter
- Drag the dial handle to your taste position; the arc fill colour transitions from blue (sour) → green (balanced) → orange (bitter) in real time.
- Implemented with `react-native-svg` and `PanResponder` for full web + native compatibility (no native modules required).

### Live Dial Tip (Dialling Algorithm)

- As soon as you move the taste dial, a **DialTipBox** appears instantly — no save required.
- The algorithm maps your taste zone × brew method to a structured tip:
  - A short action headline (e.g. *"Slightly under-extracted — grind finer"*)
  - An explanation of why the adjustment helps
  - 2–3 specific parameter changes with direction arrows (↑ / ↓ / ✓), e.g.:
    - Grind — 1 step finer ↓
    - Time — +3–4 s ↑
- Full tip tables for all four methods × five taste zones (20 unique tip sets).
- Oscillation detection: if recent sessions bounce between sour and bitter, the algorithm flags it and suggests smaller increments.

### Progress Tracking

- **Progress screen** shows your dialling-in journey for the selected bean:
  - A bar chart of the last 5 sessions, colour-coded by taste position (sour / balanced / bitter).
  - A **dial-in score** (0–100 %) calculated as `100 - avg(abs(taste_position - 50)) × 2` — the closer your average taste is to balanced, the higher your score.
  - A full shot log listing every brew with method, dose, grind setting, and taste label.
- Scores are computed by a Supabase view (`dial_in_scores`) so they stay up to date automatically.

### AI Brew Suggestion (Edge Function)

- After saving a brew, the app calls a **Supabase Edge Function** (`get-suggestion`) that constructs a detailed prompt from:
  - Bean metadata (name, origin, roast level, roast date)
  - Current brew parameters
  - Up to the last N sessions for that bean
- The function returns a structured JSON suggestion:
  ```json
  {
    "diagnosis": "Slightly under-extracted",
    "changes": [{ "param": "Grind", "from": "14", "to": "12", "direction": "down" }],
    "reasoning": "...",
    "closerThanLast": true
  }
  ```
- Separate system prompts are defined for each of the four brew methods with method-specific extraction rules.
- The app shows an `AISuggestionBox` card with the diagnosis, each parameter change, and reasoning text.
- An 8-second timeout with `Promise.race` ensures the UI never hangs if the edge function is unavailable.

### Home Screen

- Time-aware greeting (Good morning / afternoon / evening).
- **Last Coffee Card** showing the currently selected bean.
- Horizontal scrollable list of recent brew sessions.
- Horizontal scrollable list of all saved beans.
- Quick-action buttons for New Brew, Progress, and Add Bean.
- Full-width **Add Brew** button at the bottom of the scroll content.

### Authentication

- Anonymous sign-in via Supabase Auth — no account creation required to start using the app.
- All data (beans, brews) is scoped to the anonymous user's ID via RLS policies.
- Auth is initialised at app launch; failures are silently ignored so the UI always loads.

### Deployment

- **Web**: exported with `npx expo export --platform web` and deployed to Vercel. SPA rewrites ensure expo-router deep links work correctly.
- **Mobile**: run with Expo Go or build a standalone binary. LAN hosting (`expo start --web --host lan`) is available for local testing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54, expo-router v6 |
| UI | React Native 0.81.5, NativeWind v4, react-native-svg |
| Gestures | PanResponder (web-compatible), react-native-gesture-handler |
| State | Zustand |
| Backend | Supabase (Postgres, Auth, Edge Functions) |
| Forms | react-hook-form |
| Deployment | Vercel (web), Expo Go (mobile) |

---

## Database Schema

```sql
-- Beans: one row per coffee bag
beans (id, user_id, name, roaster, origin, roast_level, roast_date, notes, grind_setting, created_at)

-- Brews: one row per session
brews (id, user_id, bean_id, method, dose_g, yield_g, time_s, water_g, brew_time_s,
       grind_setting, water_temp_c, taste_position, taste_notes, rating, personal_notes,
       ai_suggestion, created_at)

-- View: dial-in score per bean
dial_in_scores (bean_id, total_brews, avg_rating, dial_in_pct)
```

All tables have RLS enabled. Users can only read and write their own rows.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server (web)
npm run web

# Start with LAN access (for phone testing on the same network)
npm run lan

# Export for Vercel
npx expo export --platform web
```

Create a `.env.local` file with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```
