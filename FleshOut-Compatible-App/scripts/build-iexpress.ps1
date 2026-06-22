$ErrorActionPreference = "Stop"

$app = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$release = Join-Path $app "release"
$workRoot = "E:\fleshout_pack_work"
$source = Join-Path $workRoot "portable-source"
$bundle = Join-Path $workRoot "bundle"
$zip = Join-Path $bundle "app.zip"
$webViewPkg = Join-Path $workRoot "webview2_pkg"
$webViewNupkg = Join-Path $webViewPkg "Microsoft.Web.WebView2.nupkg"
$webViewUrl = "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.2792.45"
$launcherSource = Join-Path $workRoot "FleshOutCompatibleLauncher.cs"
$launcherExe = Join-Path $workRoot "FleshOut-Compatible.exe"
$uninstallerSource = Join-Path $workRoot "FleshOutCompatibleUninstall.cs"
$uninstallerExe = Join-Path $workRoot "Uninstall.exe"
$setupSource = Join-Path $workRoot "FleshOutCompatibleSetup.cs"
$setupExe = Join-Path $release "FleshOut-Compatible-Setup.exe"

Set-Location -LiteralPath $app
npm run build
node --check "$app\server\index.js"

foreach ($dir in @($source, $bundle)) {
  if (Test-Path -LiteralPath $dir) {
    Remove-Item -LiteralPath $dir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
New-Item -ItemType Directory -Path $release -Force | Out-Null

foreach ($item in @("dist", "server", "runtime", "node_modules")) {
  $from = Join-Path $app $item
  if (Test-Path -LiteralPath $from) {
    Copy-Item -LiteralPath $from -Destination $source -Recurse -Force
  }
}

Copy-Item -LiteralPath (Join-Path $app "package.json") -Destination $source -Force

$sourceData = Join-Path $source "data"
New-Item -ItemType Directory -Path $sourceData -Force | Out-Null
$sidecarDb = Join-Path $app "data\continuations.db"
if (Test-Path -LiteralPath $sidecarDb) {
  Copy-Item -LiteralPath $sidecarDb -Destination $sourceData -Force
}

if (Test-Path -LiteralPath $zip) {
  Remove-Item -LiteralPath $zip -Force
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($source, $zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

if (!(Test-Path -LiteralPath (Join-Path $webViewPkg "lib\net462\Microsoft.Web.WebView2.WinForms.dll"))) {
  if (Test-Path -LiteralPath $webViewPkg) {
    Remove-Item -LiteralPath $webViewPkg -Recurse -Force
  }
  New-Item -ItemType Directory -Path $webViewPkg -Force | Out-Null
  Invoke-WebRequest -Uri $webViewUrl -OutFile $webViewNupkg -UseBasicParsing
  [System.IO.Compression.ZipFile]::ExtractToDirectory($webViewNupkg, $webViewPkg)
}

$webViewCore = Join-Path $webViewPkg "lib\net462\Microsoft.Web.WebView2.Core.dll"
$webViewWinForms = Join-Path $webViewPkg "lib\net462\Microsoft.Web.WebView2.WinForms.dll"
$webViewLoader = Join-Path $webViewPkg "runtimes\win-x64\native\WebView2Loader.dll"
if (!(Test-Path -LiteralPath $webViewLoader)) {
  $webViewLoader = Join-Path $webViewPkg "runtimes\win-x64\native_uap\WebView2Loader.dll"
}
foreach ($required in @($webViewCore, $webViewWinForms, $webViewLoader)) {
  if (!(Test-Path -LiteralPath $required)) {
    throw "Missing WebView2 dependency: $required"
  }
}

Set-Content -LiteralPath $launcherSource -Encoding UTF8 -Value @"
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

public sealed class MainForm : Form
{
    private readonly string appUrl;
    private readonly string userDataFolder;
    private WebView2 webView;

    public MainForm(string appUrl, string userDataFolder)
    {
        this.appUrl = appUrl;
        this.userDataFolder = userDataFolder;
        Text = "FleshOut Compatible";
        Width = 1400;
        Height = 900;
        MinimumSize = new System.Drawing.Size(1280, 800);
        StartPosition = FormStartPosition.CenterScreen;
    }

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        webView = new WebView2();
        webView.Dock = DockStyle.Fill;
        Controls.Add(webView);
        try
        {
            CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await webView.EnsureCoreWebView2Async(env);
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.ZoomFactor = 1.0;
            await WaitForServerAsync(appUrl);
            webView.Source = new Uri(appUrl);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, "FleshOut Compatible failed to start:\\n" + ex.Message, "FleshOut Compatible", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static async Task WaitForServerAsync(string baseUrl)
    {
        string healthUrl = baseUrl.TrimEnd('/') + "/api/health";
        for (int i = 0; i < 100; i++)
        {
            bool ready = false;
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(healthUrl);
                request.Timeout = 1000;
                using (HttpWebResponse response = (HttpWebResponse)await request.GetResponseAsync())
                {
                    if ((int)response.StatusCode == 200)
                    {
                        ready = true;
                    }
                }
            }
            catch
            {
            }
            if (ready)
            {
                return;
            }
            await Task.Delay(250);
        }
        throw new TimeoutException("Local service startup timed out.");
    }
}

public static class Program
{
    private static Process serverProcess;

    [STAThread]
    public static int Main()
    {
        try
        {
            string root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
            string logDir = Path.Combine(root, "logs");
            Directory.CreateDirectory(logDir);

            int port = GetFreeLoopbackPort();
            string appUrl = "http://127.0.0.1:" + port.ToString();
            string node = Path.Combine(root, "runtime", "node.exe");
            string server = Path.Combine(root, "server", "index.js");
            File.AppendAllText(Path.Combine(logDir, "launcher.log"), DateTime.Now.ToString("s") + " starting desktop window" + Environment.NewLine, Encoding.UTF8);

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = node;
            psi.Arguments = "\"" + server + "\"";
            psi.WorkingDirectory = root;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.EnvironmentVariables["FLESHOUT_DESKTOP"] = "1";
            psi.EnvironmentVariables["NODE_ENV"] = "production";
            psi.EnvironmentVariables["PORT"] = port.ToString();
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            serverProcess = Process.Start(psi);
            serverProcess.OutputDataReceived += (sender, args) => { if (args.Data != null) File.AppendAllText(Path.Combine(logDir, "server.out.log"), args.Data + Environment.NewLine, Encoding.UTF8); };
            serverProcess.ErrorDataReceived += (sender, args) => { if (args.Data != null) File.AppendAllText(Path.Combine(logDir, "server.err.log"), args.Data + Environment.NewLine, Encoding.UTF8); };
            serverProcess.BeginOutputReadLine();
            serverProcess.BeginErrorReadLine();

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.ApplicationExit += (sender, args) =>
            {
                try
                {
                    if (serverProcess != null && !serverProcess.HasExited)
                    {
                        serverProcess.Kill();
                    }
                }
                catch
                {
                }
            };
            Application.Run(new MainForm(appUrl, Path.Combine(root, "webview2-user-data")));
            return 0;
        }
        catch (Exception ex)
        {
            try
            {
                string root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
                string logDir = Path.Combine(root, "logs");
                Directory.CreateDirectory(logDir);
                File.WriteAllText(Path.Combine(logDir, "launcher.err.log"), ex.ToString(), Encoding.UTF8);
            }
            catch
            {
            }
            return 1;
        }
    }

    private static int GetFreeLoopbackPort()
    {
        TcpListener listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        int port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }
}
"@

Set-Content -LiteralPath $uninstallerSource -Encoding UTF8 -Value @"
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

public static class Program
{
    [STAThread]
    public static int Main()
    {
        try
        {
            string installRoot = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Microsoft", "Windows", "Start Menu", "Programs", "FleshOut Compatible");
            DeleteIfExists(Path.Combine(desktop, "FleshOut Compatible.lnk"));
            if (Directory.Exists(startMenu))
            {
                Directory.Delete(startMenu, true);
            }
            Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\FleshOut-Compatible", false);

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "cmd.exe";
            psi.Arguments = "/c timeout /t 1 /nobreak > nul & rmdir /s /q \"" + installRoot + "\"";
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            Process.Start(psi);
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show("Uninstall failed:\\n" + ex.Message, "FleshOut Compatible", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    private static void DeleteIfExists(string path)
    {
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }
}
"@

Set-Content -LiteralPath $setupSource -Encoding UTF8 -Value @"
using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

public static class Program
{
    private const string AppName = "FleshOut Compatible";
    private const string InstallFolderName = "FleshOut-Compatible-App";

    [STAThread]
    public static int Main()
    {
        try
        {
            string installRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), InstallFolderName);
            string staging = Path.Combine(installRoot, "_setup_staging_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(installRoot);
            Directory.CreateDirectory(staging);

            string zipPath = Path.Combine(staging, "app.zip");
            WriteResource("app.zip", zipPath);
            ZipFile.ExtractToDirectory(zipPath, staging);
            File.Delete(zipPath);

            CopyAppPayload(staging, installRoot);
            Directory.Delete(staging, true);

            WriteResource("FleshOut-Compatible.exe", Path.Combine(installRoot, "FleshOut-Compatible.exe"));
            WriteResource("Uninstall.exe", Path.Combine(installRoot, "Uninstall.exe"));
            WriteResource("Microsoft.Web.WebView2.Core.dll", Path.Combine(installRoot, "Microsoft.Web.WebView2.Core.dll"));
            WriteResource("Microsoft.Web.WebView2.WinForms.dll", Path.Combine(installRoot, "Microsoft.Web.WebView2.WinForms.dll"));
            WriteResource("WebView2Loader.dll", Path.Combine(installRoot, "WebView2Loader.dll"));

            CreateShortcuts(installRoot);
            RegisterUninstall(installRoot);
            System.Diagnostics.Process.Start(Path.Combine(installRoot, "FleshOut-Compatible.exe"));
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show("Install failed:\\n" + ex.Message, AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    private static void CopyAppPayload(string staging, string installRoot)
    {
        foreach (string dirName in new[] { "dist", "server", "runtime", "node_modules" })
        {
            string target = Path.Combine(installRoot, dirName);
            if (Directory.Exists(target))
            {
                Directory.Delete(target, true);
            }
            CopyDirectory(Path.Combine(staging, dirName), target);
        }

        File.Copy(Path.Combine(staging, "package.json"), Path.Combine(installRoot, "package.json"), true);

        string dataRoot = Path.Combine(installRoot, "data");
        Directory.CreateDirectory(dataRoot);
        string stagedDb = Path.Combine(staging, "data", "continuations.db");
        string targetDb = Path.Combine(dataRoot, "continuations.db");
        if (File.Exists(stagedDb) && !File.Exists(targetDb))
        {
            File.Copy(stagedDb, targetDb, false);
        }
        Directory.CreateDirectory(Path.Combine(dataRoot, "user-projects"));
        Directory.CreateDirectory(Path.Combine(installRoot, "logs"));
    }

    private static void CopyDirectory(string source, string target)
    {
        Directory.CreateDirectory(target);
        foreach (string dir in Directory.GetDirectories(source, "*", SearchOption.AllDirectories))
        {
            Directory.CreateDirectory(dir.Replace(source, target));
        }
        foreach (string file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
        {
            string destination = file.Replace(source, target);
            Directory.CreateDirectory(Path.GetDirectoryName(destination));
            File.Copy(file, destination, true);
        }
    }

    private static void WriteResource(string resourceName, string path)
    {
        using (Stream input = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName))
        {
            if (input == null)
            {
                throw new InvalidOperationException("Missing installer resource: " + resourceName);
            }
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            using (FileStream output = File.Create(path))
            {
                input.CopyTo(output);
            }
        }
    }

    private static void CreateShortcuts(string installRoot)
    {
        string launcher = Path.Combine(installRoot, "FleshOut-Compatible.exe");
        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        CreateShortcut(Path.Combine(desktop, "FleshOut Compatible.lnk"), launcher, installRoot);

        string startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Microsoft", "Windows", "Start Menu", "Programs", "FleshOut Compatible");
        Directory.CreateDirectory(startMenu);
        CreateShortcut(Path.Combine(startMenu, "FleshOut Compatible.lnk"), launcher, installRoot);
        CreateShortcut(Path.Combine(startMenu, "Uninstall FleshOut Compatible.lnk"), Path.Combine(installRoot, "Uninstall.exe"), installRoot);
    }

    private static void CreateShortcut(string shortcutPath, string targetPath, string workingDirectory)
    {
        Type shellType = Type.GetTypeFromProgID("WScript.Shell");
        object shell = Activator.CreateInstance(shellType);
        object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
        Type shortcutType = shortcut.GetType();
        shortcutType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath });
        shortcutType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDirectory });
        shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { AppName });
        shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
    }

    private static void RegisterUninstall(string installRoot)
    {
        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\FleshOut-Compatible"))
        {
            key.SetValue("DisplayName", AppName);
            key.SetValue("DisplayVersion", "0.1.0");
            key.SetValue("Publisher", "FleshOut Compatible");
            key.SetValue("InstallLocation", installRoot);
            key.SetValue("DisplayIcon", Path.Combine(installRoot, "FleshOut-Compatible.exe"));
            key.SetValue("UninstallString", "\"" + Path.Combine(installRoot, "Uninstall.exe") + "\"");
            key.SetValue("NoModify", 1, RegistryValueKind.DWord);
            key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
        }
    }
}
"@

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (!(Test-Path -LiteralPath $csc)) {
  $csc = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (!(Test-Path -LiteralPath $csc)) {
  throw "csc.exe not found"
}

& $csc /nologo /target:winexe /platform:x64 /optimize+ /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll /reference:$webViewCore /reference:$webViewWinForms /out:$launcherExe $launcherSource
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $launcherExe)) {
  throw "Launcher compilation failed"
}

& $csc /nologo /target:winexe /platform:x64 /optimize+ /reference:System.Windows.Forms.dll /out:$uninstallerExe $uninstallerSource
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $uninstallerExe)) {
  throw "Uninstaller compilation failed"
}

if (Test-Path -LiteralPath $setupExe) {
  Remove-Item -LiteralPath $setupExe -Force
}
& $csc /nologo /target:winexe /platform:x64 /optimize+ /reference:System.Windows.Forms.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll /resource:$zip,app.zip /resource:$launcherExe,FleshOut-Compatible.exe /resource:$uninstallerExe,Uninstall.exe /resource:$webViewCore,Microsoft.Web.WebView2.Core.dll /resource:$webViewWinForms,Microsoft.Web.WebView2.WinForms.dll /resource:$webViewLoader,WebView2Loader.dll /out:$setupExe $setupSource
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $setupExe)) {
  throw "Setup compilation failed"
}

Write-Host "Built $setupExe"
