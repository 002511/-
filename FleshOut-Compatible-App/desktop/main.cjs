const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

let serverProcess = null;

function resourcePath(...parts) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app", ...parts);
  }
  return path.join(__dirname, "..", ...parts);
}

function nodePath() {
  const bundledNode = resourcePath("runtime", "node.exe");
  return fs.existsSync(bundledNode) ? bundledNode : "node";
}

function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(`${url}/api/health`);
        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        // Keep waiting until timeout.
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("本地服务启动超时"));
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

async function startServer() {
  const root = resourcePath();
  const serverFile = path.join(root, "server", "index.js");
  serverProcess = spawn(nodePath(), [serverFile], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      FLESHOUT_DESKTOP: "1",
      PORT: "5178"
    },
    windowsHide: true,
    stdio: "ignore"
  });

  serverProcess.on("exit", () => {
    serverProcess = null;
  });

  await waitForServer("http://127.0.0.1:5178");
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: "FleshOut Compatible",
    backgroundColor: "#eef1f4",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadURL("http://127.0.0.1:5178");
}

app.whenReady().then(async () => {
  try {
    await startServer();
    await createWindow();
  } catch (error) {
    dialog.showErrorBox("FleshOut Compatible 启动失败", error instanceof Error ? error.message : String(error));
    app.quit();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
