# Mood Rater UI review

The selected UI revision was developed on `codex/radix-ui-review`, based on `44fa658`.
The pre-review version remains recoverable at commit `44fa658`. The user selected
this revision for publication on 2026-10-23, retaining the original colors and motion.

## Local comparison

The comparison utility is kept under ignored `outputs/ui-review/design-review.html`
for local reference. It is excluded from the deployed assets.

## Findings and changes

- The homepage has one primary action, Start annotating, plus a GitHub source link.
- Hero labels use the current language and show full words without ellipses.
- Repeated eyebrows, workflow numbers, decorative labels and overlapping calls
  to action competed with the annotation task. The candidate removes them.
- Several text styles were 8–11px. The candidate uses 12, 14, 20 and 32px.
- Following review, the original warm background, deep green accents and
  original semantic/chart colors are restored. The Radix palette replacement
  and its dependency are removed.
- Visible copy no longer uses middle dots as separators. Labels describe the
  action or data directly. Necessary recording, missing-data, saving and consent
  semantics remain visible or in the existing operation guide.
- Original border weights, shadows, hover lifts and transitions are restored.
  The original looping hero trajectory and pause/resume control are restored,
  with reduced-motion support. Container/control radius and alignment changes
  from the content review remain.
- Time-series labels use a responsive SVG viewport, so they stay 12px on small
  screens. The seek slider aligns with the chart's time-axis endpoints.

## Data and compatibility

`config/va-interface.json` again uses the original version 3 profile
(`mood-rater-soft-va`) and its exact four corner colors. The 97 emotion words,
coordinates, circle diameter and annotation algorithm are unchanged. Existing
sessions retain their original saved interface profile, including any local
trial sessions made with the earlier review palette. The historical legacy
page and original palette preset remain preserved as historical references.

## Validation

- TypeScript check and all 47 tests (including responsive hero-label bounds) passed.
- Production build passed.
- Browser checks cover desktop and 320/390px layouts, Chinese/English copy,
  sample selection, keyboard rating, stopping, autosave, undo and export controls.
- Research collection remains disabled; production verification must confirm that
  research and admin endpoints continue to reject collection requests.
- The chosen revision is prepared for synchronization to the existing GitHub v2
  branch and the existing public Sites deployment.
