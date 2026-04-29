const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const srcDir = path.join(root, "src");
const migrationsDir = path.join(root, "supabase", "migrations");
const baselineFile = path.join(root, "00000_baseline_schema.sql");

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath, predicate);
    return predicate(fullPath) ? [fullPath] : [];
  });
}

function readAll(files) {
  return files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
}

function uniqueMatches(content, regex) {
  const values = new Set();
  for (const match of content.matchAll(regex)) values.add(match[1]);
  return [...values].sort();
}

function hasSqlObject(sql, kind, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns =
    kind === "rpc"
      ? [
          new RegExp(
            `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?${escaped}\\s*\\(`,
            "i",
          ),
        ]
      : [
          new RegExp(
            `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${escaped}\\b`,
            "i",
          ),
          new RegExp(
            `create\\s+(?:or\\s+replace\\s+)?view\\s+(?:public\\.)?${escaped}\\b`,
            "i",
          ),
          new RegExp(
            `create\\s+materialized\\s+view\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${escaped}\\b`,
            "i",
          ),
        ];

  return patterns.some((pattern) => pattern.test(sql));
}

const sourceFiles = walk(srcDir, (file) => /\.(ts|tsx)$/.test(file));
const sqlFiles = [
  ...(fs.existsSync(baselineFile) ? [baselineFile] : []),
  ...walk(migrationsDir, (file) => file.endsWith(".sql")),
];

const source = readAll(sourceFiles);
const sql = readAll(sqlFiles);

const frontendRpcs = uniqueMatches(source, /\.rpc\(\s*["']([^"']+)["']/g);
const storageBuckets = uniqueMatches(
  source,
  /\.storage\s*\.\s*from\(\s*["']([^"']+)["']/g,
);
const frontendRelations = uniqueMatches(
  source,
  /\.from\(\s*["']([^"']+)["']/g,
).filter((name) => !storageBuckets.includes(name));

const missingRpcs = frontendRpcs.filter((name) => !hasSqlObject(sql, "rpc", name));
const missingRelations = frontendRelations.filter(
  (name) => !hasSqlObject(sql, "relation", name),
);

const migrationFiles = walk(migrationsDir, (file) => file.endsWith(".sql")).map(
  (file) => path.basename(file),
);
const duplicatePrefixes = Object.entries(
  migrationFiles.reduce((groups, file) => {
    const prefix = file.match(/^(\d+)/)?.[1] || file;
    groups[prefix] = groups[prefix] || [];
    groups[prefix].push(file);
    return groups;
  }, {}),
).filter(([, files]) => files.length > 1);

console.log("Database contract check");
console.log(`  source files: ${sourceFiles.length}`);
console.log(`  sql files: ${sqlFiles.length}`);
console.log(`  frontend RPCs: ${frontendRpcs.length}`);
console.log(`  frontend relations: ${frontendRelations.length}`);
console.log(`  storage buckets: ${storageBuckets.length}`);

if (duplicatePrefixes.length > 0) {
  console.log("\nWarnings: duplicate migration number prefixes detected");
  for (const [prefix, files] of duplicatePrefixes) {
    console.log(`  ${prefix}: ${files.join(", ")}`);
  }
}

if (missingRpcs.length > 0 || missingRelations.length > 0) {
  if (missingRpcs.length > 0) {
    console.error("\nMissing RPC definitions:");
    for (const name of missingRpcs) console.error(`  - ${name}`);
  }

  if (missingRelations.length > 0) {
    console.error("\nMissing table/view definitions:");
    for (const name of missingRelations) console.error(`  - ${name}`);
  }

  process.exit(1);
}

console.log("\nOK: frontend database contract is covered by SQL files.");
