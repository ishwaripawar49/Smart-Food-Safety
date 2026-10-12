const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

let backendDir = path.join(__dirname, "backend");
let frontendDir = path.join(__dirname, "frontend");

if (!fs.existsSync(backendDir)) {
  backendDir = path.join(__dirname, "Smart-Food-Safety", "backend");
}
if (!fs.existsSync(frontendDir)) {
  frontendDir = path.join(__dirname, "Smart-Food-Safety", "frontend");
}

if (!fs.existsSync(backendDir) || !fs.existsSync(frontendDir)) {
  console.error("ERROR: Could not locate backend or frontend directories!");
  process.exit(1);
}

console.log("\n=======================================================");
console.log("   SMART FOOD SAFETY COMPLAINT & MONITORING PLATFORM   ");
console.log("=======================================================");
console.log(`Backend : ${backendDir}`);
console.log(`Frontend: ${frontendDir}`);
console.log("-------------------------------------------------------");
console.log("Starting Backend (Port 5000) and Frontend (Port 5173)...");
console.log("Press Ctrl+C to stop both servers at any time.\n");

const isWin = process.platform === "win32";

// 1. Start Backend Server
const backend = spawn("node", ["src/server.js"], {
  cwd: backendDir,
  shell: true,
  env: process.env,
  stdio: "inherit"
});

// 2. Start Frontend Server
const npxCmd = isWin ? "npx.cmd" : "npx";
const frontend = spawn(npxCmd, ["vite"], {
  cwd: frontendDir,
  shell: true,
  env: process.env,
  stdio: "inherit"
});

function cleanup() {
  console.log("\nShutting down servers...");
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

backend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Backend process exited with code ${code}`);
  }
});

frontend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Frontend process exited with code ${code}`);
  }
});
