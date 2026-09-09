import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as XLSX from "xlsx";

const workbookPath = process.argv[2];
if (!workbookPath) {
  console.error("Usage: npm run import:build -- /path/to/workbook.xlsx");
  process.exit(1);
}

const wb = XLSX.readFile(workbookPath, {
  cellDates: false,
  cellNF: true,
  cellText: true
});

const datasets = [
  "Executive",
  "News",
  "Announcements",
  "Knowledge",
  "Banners",
  "ITA",
  "Downloads",
  "About",
  "Systems",
  "Popup"
];

function sqlString(v) {
  return "'" + String(v ?? "").replaceAll("'", "''") + "'";
}

function displayCell(ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  if (!cell) return "";
  return String(XLSX.utils.format_cell(cell) ?? "");
}

function sheetRows(ws) {
  if (!ws || !ws["!ref"]) return [];
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const rows = [];

  for (let r = 1; r <= range.e.r; r++) {
    const row = [];
    let hasValue = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const text = displayCell(ws, r, c);
      if (text !== "") hasValue = true;
      row.push(text);
    }
    rows.push({ row, hasValue });
  }

  while (rows.length && !rows.at(-1).hasValue) rows.pop();
  return rows.map(x => x.row);
}

const sql = [];
sql.push("BEGIN TRANSACTION;");
sql.push("DELETE FROM legacy_rows;");
sql.push("DELETE FROM view_counters;");
sql.push("DELETE FROM complaints;");

for (const dataset of datasets) {
  const ws = wb.Sheets[dataset];
  if (!ws) {
    console.warn(`Warning: sheet not found: ${dataset}`);
    continue;
  }

  const rows = sheetRows(ws);
  rows.forEach((row, idx) => {
    const rowIndex = idx + 1;
    const title =
      (dataset === "News" || dataset === "Announcements")
        ? String(row[1] || "")
        : "";

    sql.push(
      `INSERT INTO legacy_rows(dataset,row_index,data_json,title_text) VALUES (` +
      `${sqlString(dataset)},${rowIndex},${sqlString(JSON.stringify(row))},${title ? sqlString(title) : "NULL"});`
    );

    if (dataset === "News") {
      const initial = Number.parseInt(String(row[5] || "0").replaceAll(",", ""), 10) || 0;
      sql.push(
        `INSERT INTO view_counters(dataset,row_index,view_count) VALUES ('News',${rowIndex},${initial});`
      );
    }

    if (dataset === "Announcements") {
      const initial = Number.parseInt(String(row[4] || "0").replaceAll(",", ""), 10) || 0;
      sql.push(
        `INSERT INTO view_counters(dataset,row_index,view_count) VALUES ('Announcements',${rowIndex},${initial});`
      );
    }
  });
}

const complaintsWs = wb.Sheets["Complaints"];
if (complaintsWs) {
  const rows = sheetRows(complaintsWs);
  for (const row of rows) {
    if (!row.some(v => String(v || "").trim() !== "")) continue;
    const padded = [...row];
    while (padded.length < 8) padded.push("");
    sql.push(
      `INSERT INTO complaints(submitted_at,type,topic,detail,name,contact,status,note) VALUES (` +
      padded.slice(0, 8).map(sqlString).join(",") + `);`
    );
  }
}

sql.push("COMMIT;");

const outDir = path.resolve("generated");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "import.sql");
fs.writeFileSync(outPath, sql.join("\n"), "utf8");

console.log(`Created ${outPath}`);
console.log(`Datasets: ${datasets.join(", ")}`);
console.log("Next:");
console.log("npx wrangler d1 execute thaijaroen --remote --file=generated/import.sql");
