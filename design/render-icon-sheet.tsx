/**
 * Render every icon in the set to a single SVG contact sheet, so the whole
 * family can be judged side by side at the sizes it is actually used at.
 *
 *     npx tsx design/render-icon-sheet.tsx
 *
 * Writes design/icon-sheet.svg. An icon that does not read at 16 px in this
 * sheet will not read in the interface either.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createElement } from "react";
import { ICONS, type IconName } from "../components/icons";

const HERE = dirname(fileURLToPath(import.meta.url));

const COLUMNS = 8;
const CELL = 104;
const TOP = 44;

const names = Object.keys(ICONS) as IconName[];
const rows = Math.ceil(names.length / COLUMNS);

const cells = names.map((name, index) => {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const x = column * CELL;
  const y = TOP + row * CELL;

  const large = renderToStaticMarkup(createElement(ICONS[name], { size: 28 }));
  const small = renderToStaticMarkup(createElement(ICONS[name], { size: 16 }));

  return `
  <g transform="translate(${x} ${y})">
    <rect x="4" y="4" width="${CELL - 8}" height="${CELL - 8}" rx="10" fill="#ffffff" stroke="#e2e8f0"/>
    <g transform="translate(24 20)" color="#131a19">${large}</g>
    <g transform="translate(60 26)" color="#64748b">${small}</g>
    <text x="${CELL / 2}" y="${CELL - 18}" text-anchor="middle"
          font-family="ui-sans-serif, system-ui, sans-serif" font-size="10" fill="#64748b">${name}</text>
  </g>`;
});

const width = COLUMNS * CELL;
const height = TOP + rows * CELL + 8;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <text x="16" y="28" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="700" fill="#131a19">
    SkyRoute icon set — ${names.length} icons, shown at 28 px and 16 px
  </text>
  ${cells.join("\n")}
</svg>
`;

const out = join(HERE, "icon-sheet.svg");
writeFileSync(out, svg);
console.log(`Wrote ${out} — ${names.length} icons`);
