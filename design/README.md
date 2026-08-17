# Design assets

The SkyRoute mark, the icon set, and the tools that cut them into the files the
application serves.

| File | What it is |
| --- | --- |
| `logo-master.svg` | The mark at full size — gradient disc, sheen, route, waypoint, aircraft. |
| `logo-small.svg` | The 16–32 px cut. Thicker route, larger aircraft, full-bleed disc, no sheen. |
| `logo-mono.svg` | Single colour, no disc. Takes `currentColor`. For print and watermarks. |
| `logo-mark-white.svg` | The mark alone in white, for when something else supplies the badge. |
| `icon-sheet.svg` | Contact sheet of all 50 icons at 28 px and 16 px. Generated. |
| `preview.png` | The mark at every size it is actually seen at, light and dark. Generated. |
| `render-icon-sheet.tsx` | Regenerates `icon-sheet.svg`. |
| `build-icons.py` | Offline raster pipeline. See the note below before running it. |

## The mark

Three elements, which are the three nouns of the product: a waypoint you leave
from, a route, and the aircraft that flies it.

**The disc is the deliberate part.** Almost every app icon is a rounded square,
so a circle is what makes this one findable in a dock or a tab strip — and a
disc reads as a globe, which is the right shape to hang a great-circle route on.

Everything sits inside `r = 19` of the centre, well within the `r = 23` disc.
The aircraft used to break the disc edge: that looks intentional at 88 px and
looks broken at 16.

### Palette

| Token | Hex | Where |
| --- | --- | --- |
| Disc, light end | `#19AD9C` | Gradient start, 135° |
| Disc, deep end | `#0A564D` | Gradient end |
| `--accent`, light | `#0D6B5E` | Dark enough to clear 4.5:1 on white, so one value serves both a link and a filled button |
| `--accent`, dark | `#2FC4AE` | Lifted well above the light value — a colour that reads as "deep" on white reads as "muddy" on black |

Teal and green sit close on the wheel, and a "confirmed" badge has to be
unmistakable next to a teal button. `--positive` is therefore held at a warmer,
yellower green: hue 103 against the accent's 172 in light, 96 against 171 in
dark. It also never ships without a tick beside it.

The neutrals carry a trace of the accent's hue rather than sitting on pure grey.
It is below the threshold anyone would name as "green", but it is what stops the
chrome reading as stock iOS.

## Where these are used

The vectors are the source of truth; nothing traces them by hand.

- **`app/icon.svg`** is `logo-small.svg`, served as the favicon by Next's file
  convention. Copy it across again if the small cut changes.
- **`app/apple-icon.tsx`** and **`app/opengraph-image.tsx`** redraw the mark
  from the same path data and render it to PNG at build time via `next/og`, so
  there are no binaries to keep in step.
- **`components/Brand.tsx`** is `logo-master.svg` and `logo-mono.svg` as React
  components, for the navbar, the auth panel, the footer and the e-ticket.
- **`components/icons.tsx`** is the icon set. It is the source; `icon-sheet.svg`
  is rendered from it, not the other way round.

## Regenerating the contact sheet

```
npx tsx --tsconfig tsconfig.designtools.json design/render-icon-sheet.tsx
```

The separate tsconfig is only there because Next builds the app with
`jsx: "preserve"` and applies its own transform, while a script run outside Next
needs the automatic runtime named explicitly.

An icon that does not read at 16 px on that sheet will not read in the
interface either.

## Note on `build-icons.py`

This is the original offline raster pipeline. It needs `cairosvg` and `pillow`,
and it writes `app/favicon.ico`, `app/apple-icon.png` and
`app/opengraph-image.png`.

**Those last two now collide with `app/apple-icon.tsx` and
`app/opengraph-image.tsx`**, which generate the same assets from the same
vectors without the native dependency. Next will not accept both. Keep the
script for reference, or point its output elsewhere before running it.
