# Chromachron

Color-as-time for `*.chron` log files. Noon glows yellow, midnight deepens to blue; midsummer and midwinter bookend the year. Also works on `*.chron.md` (Markdown-flavored, for Obsidian-style vaults) and `*.log.md` out of the box. Inspired by Tian Harlan's 1971 Chromachron wristwatch, which told the time through colored sectors on a rotating dial (see [Chromachron, A Radically New Approach To Time](https://www.hodinkee.com/articles/chromachron-a-radically-new-approach-to-time)).

- **Time of day → color curve.** Midnight anchors to deep blue, noon to bright yellow. Hue, saturation, and lightness smoothly interpolate via a tent function — so 3 AM and 9 PM feel equally "night," 9 AM and 3 PM equally "day."
- **Date → seasonal color.** Same anchors, mapped to the year. Midsummer solstice glows yellow; midwinter solstice is dark blue. (Day-of-week presets still available.)
- **Weekday names** (`Mon`, `Monday`, `Tue`, …) get their own rainbow-by-default coloring.
- **Timezones** — abbreviations (`PST`, `UTC`, `JST`…) and offsets (`+05:00`, `-07:00`) — get their own accent color.
- **Hashtags and inline `code`** are dimmed to a subtle gray so they don't compete with the timeline.
- **Markdown links** get a configurable color.
- **Clickable color squares** next to each date and time (the picker is read-only — won't accidentally edit your file).
- **Fast.** Only scans the visible portion of the document. Debounced on edits. Extension doesn't even load unless a `*.chron` or `*.log.md` file opens.
- **`.log.md` stays regular Markdown.** Every Markdown renderer (GitHub, Obsidian, pandoc, Marked, etc.) sees plain Markdown. The coloring is a VS Code overlay only.

## How file matching works

Chromachron registers a language called `chron` with three default file patterns: `*.chron` (the canonical extension), `*.chron.md` (Markdown-flavored — opens as regular Markdown in Obsidian, GitHub, pandoc, etc.), and `*.log.md` (legacy). Regular `.md` files are untouched.

If another extension in your setup claims `.md` and wins the language tiebreak, you can force the association explicitly:

```jsonc
"files.associations": {
  "*.chron.md": "chron",
  "*.log.md": "chron"
}
```

Add any other extension the same way:

```jsonc
"files.associations": { "*.log": "chron", "*.timeline": "chron" }
```

To narrow which files get decorated (e.g. to one folder), use `chromachron.scope.enabledGlobs`.

## Settings

All settings live under `chromachron.*`. Each feature has `enabled`, color(s), and `bold` so you can tune them independently — turn off anything you don't want.

### Scope

| Setting | Default | Description |
| --- | --- | --- |
| `chromachron.scope.enabledGlobs` | `["**/*.chron", "**/*.chron.md", "**/*.log.md"]` | Only decorate files matching these globs. |

### Time (HH:mm)

| Setting | Default | Description |
| --- | --- | --- |
| `chromachron.time.enabled` | `true` | Colorize `HH:mm` matches. |
| `chromachron.time.showColorSquare` | `true` | Show a clickable square next to each time. |
| `chromachron.time.midnightColor` | `#2e3b73` | Color at 00:00. |
| `chromachron.time.noonColor` | `#f5c842` | Color at 12:00. |
| `chromachron.time.bold` | `false` | Render times in bold. |

The color curve interpolates hue, saturation, and lightness together — so midnight is simultaneously bluer *and* darker, noon yellower *and* brighter. Override the two anchor colors to retune the whole palette.

### Date (YYYY-MM-DD)

| Setting | Default | Description |
| --- | --- | --- |
| `chromachron.date.enabled` | `true` | Colorize `YYYY-MM-DD` dates. |
| `chromachron.date.showColorSquare` | `true` | Show a clickable square next to each date. |
| `chromachron.date.preset` | `"seasonal"` | `seasonal` tracks the year solstice-to-solstice. `workweek` splits Mon-Fri vs Sat-Sun. Others (`rainbow`, `pastel`, `muted`, `warmCool`, `custom`) color by day-of-week. |
| `chromachron.date.winterColor` | `#2e3b73` | Winter-solstice color (used by `seasonal`). |
| `chromachron.date.summerColor` | `#f5c842` | Summer-solstice color (used by `seasonal`). |
| `chromachron.date.hemisphere` | `"north"` | Flip the seasonal curve for the southern hemisphere. |
| `chromachron.date.workdayColor` | `#6b7280` | Mon-Fri color (used by `workweek`). |
| `chromachron.date.weekendColor` | `#f5c842` | Sat-Sun color (used by `workweek`). |
| `chromachron.date.colors` | `{}` | Custom 7-day colors when `preset = "custom"`. |
| `chromachron.date.bold` | `false` | Render dates in bold. |

### Weekday names (Mon, Monday, …)

| Setting | Default | Description |
| --- | --- | --- |
| `chromachron.weekday.enabled` | `true` | Colorize weekday names. |
| `chromachron.weekday.preset` | `"rainbow"` | `rainbow`, `workweek`, `pastel`, `muted`, `warmCool`, or `custom`. |
| `chromachron.weekday.colors` | `{}` | Custom 7-day colors when `preset = "custom"`. |
| `chromachron.weekday.workdayColor` | `#6b7280` | Mon-Fri color (used by `workweek`). |
| `chromachron.weekday.weekendColor` | `#f5c842` | Sat-Sun color (used by `workweek`). |
| `chromachron.weekday.bold` | `false` | |

### Timezone

| Setting | Default | Description |
| --- | --- | --- |
| `chromachron.timezone.enabled` | `true` | Colorize abbreviations (`UTC`, `PST`) and offsets (`+05:00`). |
| `chromachron.timezone.color` | `#a58fc9` | |
| `chromachron.timezone.bold` | `false` | |

### Hashtag

| Setting | Default | Description |
| --- | --- | --- |
| `chromachron.hashtag.enabled` | `true` | Dim `#hashtags`. |
| `chromachron.hashtag.color` | `#6b7280` | |
| `chromachron.hashtag.bold` | `false` | |

### Inline code

| Setting | Default | Description |
| --- | --- | --- |
| `chromachron.code.enabled` | `true` | Dim `` `code` `` spans. |
| `chromachron.code.color` | `#6b7280` | |
| `chromachron.code.bold` | `false` | |

### Links

| Setting | Default | Description |
| --- | --- | --- |
| `chromachron.links.enabled` | `true` | Color markdown links and bare URLs. |
| `chromachron.links.color` | `#61afef` | |

### Performance

| Setting | Default | Description |
| --- | --- | --- |
| `chromachron.perf.visibleRangeOnly` | `true` | Only scan the visible portion of the document (with 50-line padding). |
| `chromachron.perf.debounceMs` | `100` | Debounce decoration updates during typing/scrolling. |

## Example: custom weekday colors

```jsonc
"chromachron.weekday.preset": "custom",
"chromachron.weekday.colors": {
  "monday":    "#ff6b6b",
  "tuesday":   "#ffa94d",
  "wednesday": "#ffd43b",
  "thursday":  "#8ce99a",
  "friday":    "#74c0fc",
  "saturday":  "#b197fc",
  "sunday":    "#f783ac"
}
```

## Install (development)

```bash
git clone https://github.com/gpechenik/chromachron.git
cd chromachron
npm install
npm run reinstall   # compile + package + install into your default VS Code profile
```

Then `Cmd+Shift+P` → **Developer: Reload Window**.

### VS Code profiles

If you use a non-default VS Code profile, add `--profile=<YourProfileName>` to the `reinstall` script in `package.json`:

```jsonc
"reinstall": "... && code --install-extension ./chromachron.vsix --profile=Work --force"
```

### Iterating

```bash
npm run watch       # tsc --watch, recompiles on save
# ...make changes...
npm run reinstall   # package + install in one step
# then Developer: Reload Window
```

---

## Future ideas

Captured here so they don't get lost. Nothing in this list is implemented yet.

### Time coloring

- **Per-time anchor points.** Instead of just midnight + noon, allow an arbitrary list: `00:00 = navy`, `06:00 = coral`, `12:00 = gold`, `18:00 = purple`, `22:00 = navy`. Smoothly interpolate between them.
- **Specific-time overrides.** Within any anchor-interpolation scheme, allow exact-match overrides — e.g. `09:00 = red` always.
- **OKLCH / perceptual color space** for smoother-feeling transitions.
- **Seconds support.** Optionally match `HH:mm:ss` and use seconds as a subtle secondary signal.
- **12-hour format.** Optional `h:mm am/pm` recognition.
- **Timezone-aware color.** If a time has a TZ marker, shift the curve accordingly.
- **Background color mode.** Paint the background of the time instead of the foreground, for very high contrast.
- **Gutter color bar.** A vertical color strip in the gutter showing each line's time color.

### Date coloring

- **Per-date anchor points.** Same idea as time anchors, but along the year (equinoxes + solstices + custom dates).
- **Distance-from-today gradient** — today is white, recent past warms, distant past fades to gray.
- **Holiday / custom-day overrides** — a calendar of specific dates → specific colors.
- **Workday vs weekend boolean coloring** as a minimal preset.
- **Locale-aware week start** (Sun vs Mon as week 1).

### Links

- **Per-scheme colors** (`https://` vs `obsidian://` vs wiki `[[…]]` links).
- **Visited-link color** tracked in workspace state.

### Ranges and durations

- **`HH:mm–HH:mm` ranges** get a gradient underline between the two time colors.
- **Duration-on-hover** (how long was that session?).

### Document / workspace level

- **Status bar summary** for selected time ranges (total hours).
- **Heatmap minimap** — minimap shows time colors, making the day's rhythm visible at a glance.
- **Per-file overrides** via YAML frontmatter (e.g. `chromachron: { time: { noonColor: "#ffbb00" } }`).
- **Inline per-line anchor comments** (e.g. `<!-- chromachron:today -->`).

### Marketplace readiness

- **Icon + marketplace screenshots.**
- **`vsce publish`** once the publisher account is set up.
- **Snapshot tests** — a `.chron` fixture with known matches.
- **Settings UI webview** — a visual editor for the 7 weekday colors and the 2 anchor colors.
- **Theme compatibility notes** — the default lightness curve works well on dark themes; light themes may need tuning.

### Pie-in-the-sky

- **Mood / energy annotation** — an extra glyph whose color blends with the HSL hue, indicating productivity tags (`#focus`, `#drain`) on the same line.
- **Cross-file color consistency** — the same date in different files always gets exactly the same shade.
- **Color-blind-safe presets** (deuteranopia / protanopia / tritanopia).
- **Export as SVG** — render the colored log as a printable timeline.

## Credit

Inspired by Tian Harlan's [Chromachron wristwatch](https://www.hodinkee.com/articles/chromachron-a-radically-new-approach-to-time) (1971), which mapped each hour to a color on a rotating dial.

## License

MIT.
