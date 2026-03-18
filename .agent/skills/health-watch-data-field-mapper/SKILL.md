---
name: health-watch-data-field-mapper
description: Maps Samsung Watch health metrics from the Supabase health_metrics table to the VibeOS mobile Health Hub screen. Covers the raw_watch_data JSONB structure, deep sleep / REM extraction, and safe null handling.
---

# Health Watch Data Field Mapper

## When to use this skill

- When wiring health metric UI cards to real API data in `mobile/src/screens/HealthScreen.jsx`
- When adding new health fields to the backend health service or schema
- When the Health Hub screen shows hardcoded values (`1h 48m`, `1h 32m`) or `--` for fields that should have data

## Data Architecture

### Supabase `health_metrics` table columns

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | FK to users |
| `date` | date | One row per user per day |
| `sleep_duration` | float | Total sleep in hours (e.g. `7.38` = 7h 23m) |
| `avg_heart_rate` | integer | BPM |
| `water_liters` | float | Daily water intake |
| `ai_analysis` | text | Qwen morning analysis string |
| `raw_watch_data` | jsonb | **All other Samsung Watch fields live here** |

### API response shape (`GET /api/v1/health/metrics`)

```json
{
  "metrics": [
    {
      "date": "2026-03-17",
      "water_liters": 1.5,
      "sleep_duration": 7.38,
      "avg_heart_rate": 58,
      "raw_watch_data": {
        "deep_sleep_hours": 1.8,
        "rem_sleep_hours": 1.53,
        "sleep_score": 82,
        "steps": 8420,
        "calories": 2100
      },
      "ai_analysis": "Excellent night! Your deep sleep..."
    }
  ]
}
```

Note: `raw_watch_data` field names depend on what the Samsung Health Connect sync pushes. Treat them as optional — always guard with `?.`.

### The mobile client calls `fetchHealth()` which maps to `GET /api/v1/health/metrics`

But the mobile's `api.js:fetchHealth()` calls `/health/metrics` which returns `{"metrics": [...]}`. The mobile currently reads `result` directly, not `result.metrics[0]`. **This is a pre-existing bug — the data is available but the screen reads the wrong level.**

## Field Mapping Reference

### Top-level response fix

`fetchHealth()` returns `{ metrics: [ {...}, ... ] }`. The screen should use the most recent entry:

```javascript
const loadData = async () => {
  try {
    const result = await fetchHealth();
    const latest = result?.metrics?.[0] ?? null;  // most recent day
    setData(latest);
    if (latest?.water_liters) setWaterIntake(latest.water_liters);
  } catch {
    setData(null);
  }
};
```

### Sleep metrics extraction

```javascript
// Sleep total
const sleepHrs = data?.sleep_duration ? Math.floor(data.sleep_duration) : null;
const sleepMin = data?.sleep_duration ? Math.round((data.sleep_duration % 1) * 60) : null;
const sleepDisplay = sleepHrs != null ? `${sleepHrs}h ${sleepMin}m` : '--';

// Deep sleep (from raw_watch_data JSONB)
const deepSleepRaw = data?.raw_watch_data?.deep_sleep_hours;
const deepSleepDisplay = deepSleepRaw != null
  ? `${Math.floor(deepSleepRaw)}h ${Math.round((deepSleepRaw % 1) * 60)}m`
  : '--';

// REM sleep (from raw_watch_data JSONB)
const remRaw = data?.raw_watch_data?.rem_sleep_hours;
const remDisplay = remRaw != null
  ? `${Math.floor(remRaw)}h ${Math.round((remRaw % 1) * 60)}m`
  : '--';
```

### MetricCard wiring

```jsx
<MetricCard label="Sleep" value={sleepDisplay} delta={null} />
<MetricCard label="Avg HR" value={data?.avg_heart_rate ? `${data.avg_heart_rate} bpm` : '--'} delta={null} />
<MetricCard label="Deep Sleep" value={deepSleepDisplay} delta={null} />
<MetricCard label="REM" value={remDisplay} delta={null} />
```

> Deltas should be `null` until the backend provides a delta field. Do NOT hardcode `+18m`, `+12%`, `+5%`.

### AI Analysis card

```jsx
{data?.ai_analysis && (
  <Card style={{ marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: palette.accentPrimary }}>
    <Text style={{ color: palette.accentPrimary, fontWeight: '600', fontSize: 13, marginBottom: spacing.sm }}>
      {'\u26A1'} AI Morning Analysis — 8:00 AM
    </Text>
    <Text style={{ color: palette.textPrimary, fontSize: 13, lineHeight: 20 }}>
      {data.ai_analysis}
    </Text>
  </Card>
)}
```

## Health Connect / Samsung Watch Data Contract

The `raw_watch_data` JSONB is populated by:
1. The GitHub Actions `health_analysis.yml` daily workflow
2. `POST /api/v1/health/sync` from the mobile Health Connect integration

The canonical field names for raw Samsung Watch data:

| Watch export field | JSONB key in raw_watch_data | Unit |
|--------------------|-----------------------------|------|
| Deep Sleep | `deep_sleep_hours` | float hours |
| REM Sleep | `rem_sleep_hours` | float hours |
| Sleep Score | `sleep_score` | integer 0-100 |
| Steps | `steps` | integer |
| Active Calories | `calories` | integer kcal |

If these fields are absent (old sync data), the UI must show `--` — never default to hardcoded values.

## Forbidden Patterns

- **Do NOT hardcode health values** like `value="1h 48m"` — this ships fake data as real.
- **Do NOT assume `raw_watch_data` is populated** — it may be `null` for older rows.
- **Do NOT display delta values** (`+12%`, `+5%`) unless the API explicitly provides a previous-period comparison. Static deltas are misleading.
