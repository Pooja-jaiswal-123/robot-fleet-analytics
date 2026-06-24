# Fleet Navigation Analytics — Findings

Based on the full 1,000,000-row `navigation_spans` dataset (May 1–7, 2026, 200 robots).

## 1. Fixed daily operating window, no weekday/weekend effect
Every single span in the dataset falls inside **06:00–21:59**. There are zero spans
outside that window across all seven days, and the May 1–6 daily totals are flat
(~160–161K spans/day regardless of day-of-week — May 1 was a Friday, May 3–4 a
weekend). May 7 is a partial day (data cuts off at 09:32). Read literally: this fleet
runs one fixed 16-hour shift, 7 days a week, with no weekend slowdown.

## 2. Two sharp intraday demand spikes
Spans-per-hour are roughly flat (~58–69K/hour) across the shift **except** at
**10:00** and **15:00**, which run **+23%** and **+22%** above the surrounding
baseline respectively. This is too sharp and too localized to be random variation —
it reads like a batch task-release or shift-handoff event happening twice a day.
Worth investigating against the real WMS/task-scheduler logs if this were production
data.

## 3. Fleet utilization is far from even
Across the "identical" 200-robot fleet, span counts range from **2,453 to 7,154**
per robot — a **2.9x spread**, with mean 5,000 and std-dev ~1,223. **22 robots**
sit more than 1.5 standard deviations from the fleet mean (the dashboard's
"Utilization outliers" panel lists them by `robot_id`). In a real fleet this is the
finding worth escalating — it usually means a routing/assignment bias, a subset of
robots parked near high-demand zones, or hardware degradation pulling some units out
of rotation more often.

## 4. The stated speed spec doesn't fully hold in the data
The README specifies 0.5–1.5 m/s. In the actual data:
- **2.8%** of spans exceed 1.5 m/s
- **8.3%** of spans are under 0.5 m/s
- This isn't a measurement artifact on short legs — the violating spans have a
  normal distance profile (mean ~39m, same as the overall average), so it's a
  genuine tail in the underlying speed distribution, not rounding noise.

## 5. No discrete pick/pack/charge stations
The README's "spatial heatmap" framing implies fixed stations, but binning every
span's midpoint into a 10m grid shows **no sharp hotspots** — the densest cells run
~1,600 spans vs. an average of ~1,040 across 960 cells, a soft ~1.5x lift, not the
10x+ spike you'd expect from real fixed stations. Density instead gradients smoothly
toward the center of the 200m×120m floor. The heatmap panel is built to show this
honestly (a gradient, not pins) rather than force station-like clusters that aren't
there.

## 6. Task structure: leg counts decay geometrically
334,414 tasks start a leg 1; only 266,964 continue to leg 2; by leg 5 it's down to
66,385. Leg-to-leg continuation rates are **80% → 75% → 67% → 50%**, consistent with
each leg having a roughly fixed, slightly-declining chance of continuing into another
leg, rather than tasks being fixed at e.g. always-3-legs.

## Fleet totals (for context)
- 334,414 tasks, 1,000,000 spans, ~13,964 cumulative robot-hours of driving
- ~40,700 km of total distance covered fleet-wide over the week

## What this means for the dashboard
The app surfaces all six findings directly as panels rather than burying them in a
writeup: the hourly volume chart highlights the two spikes, the robot utilization
chart sorts and colors outliers, the speed histogram overlays the spec band against
the real distribution, and the heatmap is rendered as a gradient (not station pins)
because that's what the data actually shows.
