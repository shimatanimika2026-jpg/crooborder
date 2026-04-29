const { spawnSync } = require("child_process");
const path = require("path");

const scriptArg = process.argv[2];
const scriptArgs = process.argv.slice(3);

if (!scriptArg) {
  console.error("Usage: node scripts/run-bash.cjs <script> [args...]");
  process.exit(1);
}

const bashCandidates = [
  process.env.BASH_PATH,
  "C:\\Program Files\\Git\\bin\\bash.exe",
  "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
  "bash",
].filter(Boolean);

const projectRoot = path.resolve(__dirname, "..");
const scriptPath = path.isAbsolute(scriptArg)
  ? scriptArg
  : path.resolve(projectRoot, scriptArg);

let lastError = null;

for (const bashPath of bashCandidates) {
  const result = spawnSync(
    bashPath,
    [scriptPath, ...scriptArgs],
    {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env,
        PROJECT_ROOT: projectRoot,
      },
    },
  );

  if (!result.error) {
    process.exit(result.status ?? 0);
  }

  lastError = result.error;
}

console.error("Unable to launch bash for script:", scriptPath);
if (lastError) {
  console.error(lastError.message);
}
process.exit(1);
