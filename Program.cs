using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

class Program
{
    const string AppVersion = "1.0.1";
    const string AppMutexName = "RoxamiStudio_SingleInstance_Mutex";

    const string DefaultSettings = """
{
    "theme": "light",
    "providers": [
        {
            "name": "Deepseek",
            "baseUrl": "https://api.deepseek.com",
            "apiKey": "",
            "models": [
                { "id": "deepseek-v4-flash", "name": "deepseek-v4-flash" }
            ]
        }
    ]
}
""";

    static string BaseDir = "";
    static int Port = 8080;
    static TcpListener? _listener;
    static string _exePath = "";
    static Dictionary<string, string> MimeTypes = new();
    static bool _running = true;
    static Mutex? _appMutex;

    // Update: download state
    static string? _installFile;
    static readonly object _installLock = new();

    // Update: caching (avoids GitHub API rate limit)
    static DateTime _updateCacheTime = DateTime.MinValue;
    static string? _updateCacheTag;
    static string? _updateCacheVer;
    static string? _updateCacheNotes;
    static string? _updateCacheUrl;
    const int UpdateCacheMinutes = 60;

    // Windows API imports for window activation
    [DllImport("user32.dll")]
    private static extern IntPtr FindWindow(string? lpClassName, string? lpWindowName);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern IntPtr ShowWindow(IntPtr hWnd, int nCmdShow);

    private const int SW_RESTORE = 9;
    private const int SW_SHOW = 5;

    static void Main(string[] args)
    {
        // --install mode
        if (args.Length > 0 && args[0] == "--install")
        {
            RunInstaller();
            return;
        }

        // --uninstall mode
        if (args.Length > 0 && args[0] == "--uninstall")
        {
            RunUninstaller();
            return;
        }

        // --delay mode (for restart)
        if (args.Length >= 2 && args[0] == "--delay")
        {
            if (int.TryParse(args[1], out int delayMs))
                Thread.Sleep(delayMs);
        }

        // Single instance check
        bool isFirstInstance = TryAcquireAppMutex();
        if (!isFirstInstance)
        {
            // Activate existing instance's browser window
            ActivateExistingInstance();
            return;
        }

        try
        {
            RunServer();
        }
        finally
        {
            _appMutex?.ReleaseMutex();
            _appMutex?.Dispose();
        }
    }

    // Single instance: Mutex acquisition
    static bool TryAcquireAppMutex()
    {
        try
        {
            _appMutex = new Mutex(true, AppMutexName, out bool createdNew);
            return createdNew;
        }
        catch
        {
            return false;
        }
    }

    // Activate existing instance: Find and bring browser window to front
    static void ActivateExistingInstance()
    {
        try
        {
            // Try to find browser windows associated with localhost
            // First, check common browser processes that might have opened the app
            Process[] allProcesses = Process.GetProcesses();
            
            foreach (Process proc in allProcesses)
            {
                try
                {
                    // Look for chrome, firefox, edge, or other browser windows
                    string procName = proc.ProcessName.ToLower();
                    if (procName.Contains("chrome") || procName.Contains("firefox") || 
                        procName.Contains("edge") || procName.Contains("iexplore") ||
                        procName.Contains("opera"))
                    {
                        IntPtr mainWnd = proc.MainWindowHandle;
                        if (mainWnd != IntPtr.Zero)
                        {
                            // Restore if minimized
                            if (IsIconic(mainWnd))
                                ShowWindow(mainWnd, SW_RESTORE);
                            else
                                ShowWindow(mainWnd, SW_SHOW);
                            
                            // Bring to front
                            SetForegroundWindow(mainWnd);
                            return;
                        }
                    }
                }
                catch { }
            }

            // Fallback: Try generic window search by title containing "localhost"
            IntPtr hWnd = FindWindowByPartialTitle("localhost");
            if (hWnd != IntPtr.Zero)
            {
                if (IsIconic(hWnd))
                    ShowWindow(hWnd, SW_RESTORE);
                else
                    ShowWindow(hWnd, SW_SHOW);
                
                SetForegroundWindow(hWnd);
            }
        }
        catch { }
    }

    // Helper: Find window by partial title match
    static IntPtr FindWindowByPartialTitle(string partialTitle)
    {
        Process[] allProcesses = Process.GetProcesses();
        foreach (Process proc in allProcesses)
        {
            try
            {
                if (!string.IsNullOrEmpty(proc.MainWindowTitle) && 
                    proc.MainWindowTitle.Contains(partialTitle, StringComparison.OrdinalIgnoreCase))
                {
                    return proc.MainWindowHandle;
                }
            }
            catch { }
        }
        return IntPtr.Zero;
    }

    // ============================================================
    //  INSTALLER
    // ============================================================
    static void RunInstaller()
    {
        Console.Title = "Roxami Studio Setup";
        Console.WriteLine("========================================");
        Console.WriteLine("  Roxami Studio Setup v1.0.0");
        Console.WriteLine("========================================");
        Console.WriteLine();

        // Source = same directory as this exe
        string srcDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');

        // Default install path — user directory (no admin required)
        string defaultPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs", "RoxamiStudio");

        Console.WriteLine("Install location:");
        Console.WriteLine("  [" + defaultPath + "]");
        Console.Write("  Enter path (Enter = default): ");
        string? input = Console.ReadLine();
        string installDir = string.IsNullOrWhiteSpace(input) ? defaultPath : input.Trim();

        Console.WriteLine();
        Console.WriteLine("Installing to: " + installDir);

        // Remove existing
        if (Directory.Exists(installDir))
        {
            Console.Write("Removing existing installation... ");
            Directory.Delete(installDir, true);
            Console.WriteLine("done.");
        }

        // Copy files
        Console.Write("Copying files... ");
        CopyDirectory(srcDir, installDir, excludeFileName: "RoxamiStudio_Setup.exe");
        long sizeMB = GetDirectorySize(installDir) / 1024 / 1024;
        Console.WriteLine("done. (" + sizeMB + " MB)");

        // Create Start Menu shortcut
        string exePath = Path.Combine(installDir, "RoxamiStudio.exe");
        string startMenuDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu),
            "Programs", "Roxami Studio");
        string userStartMenuDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
            "Programs", "Roxami Studio");

        // Try system-wide first, fall back to user
        string smDir = userStartMenuDir;
        try
        {
            Directory.CreateDirectory(startMenuDir);
            smDir = startMenuDir;
        }
        catch
        {
            Directory.CreateDirectory(userStartMenuDir);
        }

        string smShortcut = Path.Combine(smDir, "Roxami Studio.lnk");
        string smUninstall = Path.Combine(smDir, "Uninstall Roxami Studio.lnk");
        CreateShortcut(smShortcut, exePath, installDir);
        CreateShortcut(smUninstall,
            exePath, installDir,
            arguments: "--uninstall",
            description: "Uninstall Roxami Studio");

        // Desktop shortcut
        string desktopPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
            "Roxami Studio.lnk");
        CreateShortcut(desktopPath, exePath, installDir);

        Console.WriteLine("Shortcuts created. (Desktop + Start Menu)");

        // Write uninstall info
        WriteUninstallRegistry(installDir, exePath, smDir);
        Console.WriteLine("Registered in Add/Remove Programs.");

        // Done
        Console.WriteLine();
        Console.WriteLine("========================================");
        Console.WriteLine("  Installation Complete!");
        Console.WriteLine("========================================");
        Console.WriteLine("  " + installDir);
        Console.WriteLine();

        // Launch
        try
        {
            Console.WriteLine("Launching Roxami Studio...");
            Process.Start(new ProcessStartInfo
            {
                FileName = exePath,
                WorkingDirectory = installDir,
                UseShellExecute = true
            });
        }
        catch { }

        Console.WriteLine("Press Enter to close this window.");
        Console.ReadLine();
    }

    static void RunUninstaller()
    {
        Console.Title = "Roxami Studio Uninstaller";
        Console.WriteLine("========================================");
        Console.WriteLine("  Roxami Studio Uninstaller");
        Console.WriteLine("========================================");
        Console.WriteLine();

        string exeDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
        Console.Write("Uninstall from: " + exeDir + " ? (Y/n): ");
        string? answer = Console.ReadLine();
        if (answer != null && answer.Trim().ToLower() == "n") return;

        // Remove Start Menu
        foreach (string sm in new[] {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu), "Programs", "Roxami Studio"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "Roxami Studio")
        })
        {
            if (Directory.Exists(sm)) { Directory.Delete(sm, true); Console.WriteLine("Removed Start Menu."); }
        }

        // Remove desktop shortcut
        string desk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "Roxami Studio.lnk");
        if (File.Exists(desk)) { File.Delete(desk); Console.WriteLine("Removed desktop shortcut."); }

        // Remove registry
        RemoveUninstallRegistry();

        // Schedule self-delete
        Console.WriteLine("Removing installation files...");
        string bat = Path.Combine(Path.GetTempPath(), "roxami_uninstall.bat");
        File.WriteAllText(bat,
            "@echo off\r\n" +
            "ping 127.0.0.1 -n 3 > nul\r\n" +
            "rmdir /s /q \"" + exeDir + "\"\r\n" +
            "del \"" + bat + "\"\r\n");
        Process.Start(new ProcessStartInfo
        {
            FileName = bat,
            UseShellExecute = true,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden
        });

        Console.WriteLine();
        Console.WriteLine("Uninstall complete. Press Enter to exit.");
        Console.ReadLine();
        Environment.Exit(0);
    }

    static void CopyDirectory(string src, string dst, string excludeFileName = "")
    {
        Directory.CreateDirectory(dst);
        foreach (string file in Directory.GetFiles(src))
        {
            string name = Path.GetFileName(file);
            if (!string.IsNullOrEmpty(excludeFileName) &&
                name.Equals(excludeFileName, StringComparison.OrdinalIgnoreCase))
                continue;
            File.Copy(file, Path.Combine(dst, name), overwrite: true);
        }
        foreach (string dir in Directory.GetDirectories(src))
        {
            string name = Path.GetFileName(dir);
            CopyDirectory(dir, Path.Combine(dst, name), excludeFileName);
        }
    }

    static long GetDirectorySize(string path)
    {
        long size = 0;
        foreach (string f in Directory.GetFiles(path, "*", SearchOption.AllDirectories))
            size += new FileInfo(f).Length;
        return size;
    }

    static void CreateShortcut(string lnkPath, string targetPath, string workDir,
        string arguments = "", string description = "Roxami Studio - All-in-one creative tools")
    {
        // Use VBScript to create shortcut (no COM dependency on runtime)
        string vbs = Path.GetTempFileName() + ".vbs";
        File.WriteAllText(vbs,
            "Set oWS = WScript.CreateObject(\"WScript.Shell\")\r\n" +
            "Set oLink = oWS.CreateShortcut(\"" + lnkPath.Replace("\"", "\"\"") + "\")\r\n" +
            "oLink.TargetPath = \"" + targetPath.Replace("\"", "\"\"") + "\"\r\n" +
            "oLink.WorkingDirectory = \"" + workDir.Replace("\"", "\"\"") + "\"\r\n" +
            "oLink.Arguments = \"" + arguments + "\"\r\n" +
            "oLink.Description = \"" + description + "\"\r\n" +
            "oLink.Save\r\n");
        try
        {
            Process p = Process.Start(new ProcessStartInfo
            {
                FileName = "wscript.exe",
                Arguments = "\"" + vbs + "\"",
                UseShellExecute = false,
                CreateNoWindow = true
            })!;
            p.WaitForExit(5000);
        }
        finally
        {
            try { File.Delete(vbs); } catch { }
        }
    }

    static void WriteUninstallRegistry(string installDir, string exePath, string smDir)
    {
        try
        {
            // Try HKLM first (admin), fall back to HKCU
            WriteReg(
                @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\RoxamiStudio",
                installDir, exePath);
        }
        catch { }
    }

    static void WriteReg(string subKey, string installDir, string exePath)
    {
        // Use reg.exe to avoid requiring Microsoft.Win32.Registry on non-Windows
        string uninstallCmd = "\"" + exePath + "\" --uninstall";
        string[] cmds = {
            $"reg add \"HKCU\\{subKey}\" /f",
            $"reg add \"HKCU\\{subKey}\" /v DisplayName /t REG_SZ /d \"Roxami Studio\" /f",
            $"reg add \"HKCU\\{subKey}\" /v UninstallString /t REG_SZ /d \"{uninstallCmd}\" /f",
            $"reg add \"HKCU\\{subKey}\" /v DisplayVersion /t REG_SZ /d \"1.0.0\" /f",
            $"reg add \"HKCU\\{subKey}\" /v Publisher /t REG_SZ /d \"Roxami\" /f",
            $"reg add \"HKCU\\{subKey}\" /v InstallLocation /t REG_SZ /d \"{installDir}\" /f",
            $"reg add \"HKCU\\{subKey}\" /v NoModify /t REG_DWORD /d 1 /f",
            $"reg add \"HKCU\\{subKey}\" /v NoRepair /t REG_DWORD /d 1 /f",
        };
        foreach (string cmd in cmds)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c " + cmd,
                UseShellExecute = false,
                CreateNoWindow = true
            })!.WaitForExit(3000);
        }
    }

    static void RemoveUninstallRegistry()
    {
        foreach (string hive in new[] { "HKCU", "HKLM" })
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c reg delete \"{hive}\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\RoxamiStudio\" /f",
                    UseShellExecute = false,
                    CreateNoWindow = true
                })!.WaitForExit(3000);
            }
            catch { }
        }
    }

    // ============================================================
    //  HTTP SERVER
    // ============================================================
    static void RunServer()
    {
        BaseDir = AppDomain.CurrentDomain.BaseDirectory;
        _exePath = Environment.ProcessPath ?? Environment.GetCommandLineArgs()[0];

        MimeTypes[".html"]  = "text/html; charset=utf-8";
        MimeTypes[".css"]   = "text/css; charset=utf-8";
        MimeTypes[".js"]    = "application/javascript; charset=utf-8";
        MimeTypes[".mjs"]   = "application/javascript; charset=utf-8";
        MimeTypes[".json"]  = "application/json; charset=utf-8";
        MimeTypes[".png"]   = "image/png";
        MimeTypes[".jpg"]   = "image/jpeg";
        MimeTypes[".jpeg"]  = "image/jpeg";
        MimeTypes[".gif"]   = "image/gif";
        MimeTypes[".svg"]   = "image/svg+xml";
        MimeTypes[".ico"]   = "image/x-icon";
        MimeTypes[".woff"]  = "font/woff";
        MimeTypes[".woff2"] = "font/woff2";
        MimeTypes[".ttf"]   = "font/ttf";

        Console.Title = "Roxami Studio";
        Console.WriteLine("================================");
        Console.WriteLine("  Roxami Studio");
        Console.WriteLine("================================");
        Console.WriteLine();

        // Find an available port starting at 8080
        bool started = false;
        for (int p = 8080; p <= 8089; p++)
        {
            try
            {
                _listener = new TcpListener(IPAddress.Loopback, p);
                _listener.Start();
                Port = p;
                started = true;
                break;
            }
            catch { /* port busy, try next */ }
        }

        if (!started)
        {
            Console.WriteLine("Error: Could not find an available port (8080-8089).");
            Console.WriteLine("Please close other programs using those ports.");
            Console.WriteLine("Press Enter to exit...");
            Console.ReadLine();
            return;
        }

        string url = "http://localhost:" + Port;
        OpenBrowser(url);

        Console.WriteLine("Server: " + url);
        Console.WriteLine("Press Enter to stop...");
        Console.WriteLine();

        Thread serverThread = new Thread(() =>
        {
            while (_running)
            {
                try
                {
                    TcpClient client = _listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(_ => HandleClient(client));
                }
                catch (SocketException) { break; }
                catch (ObjectDisposedException) { break; }
            }
        });
        serverThread.Start();

        Console.ReadLine();
        _running = false;
        try { _listener.Stop(); } catch { }
        serverThread.Join(3000);
        Console.WriteLine("Roxami Studio closed.");
    }

    static void OpenBrowser(string url)
    {
        try { Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true }); return; } catch { }
        try { Process.Start(new ProcessStartInfo { FileName = "cmd", Arguments = "/c start " + url, UseShellExecute = false, CreateNoWindow = true }); return; } catch { }
        Console.WriteLine("Open your browser and go to: " + url);
    }

    static void HandleClient(TcpClient client)
    {
        NetworkStream? stream = null;
        try
        {
            stream = client.GetStream();
            stream.ReadTimeout = 10000;
            stream.WriteTimeout = 10000;

            byte[] buf = new byte[8192];
            int read = stream.Read(buf, 0, buf.Length);
            if (read <= 0) return;

        string request = Encoding.ASCII.GetString(buf, 0, read);
        string[] lines = request.Split(new[] { "\r\n" }, StringSplitOptions.None);
        if (lines.Length == 0) return;

        string[] parts = lines[0].Split(' ');
        if (parts.Length < 2) return;

        string method = parts[0];
        string url = parts[1];
        int q = url.IndexOf('?');
        string path = (q >= 0 ? url[..q] : url).TrimStart('/');
        string query = q >= 0 ? url[(q+1)..] : "";
        bool forceCheck = query.Contains("force=1");

        // Extract POST body
        string body = "";
        if (method == "POST" || method == "PUT")
        {
            int cl = 0;
            foreach (string line in lines)
            {
                if (line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                {
                    int.TryParse(line.Substring("Content-Length:".Length).Trim(), out cl);
                    break;
                }
            }
            int bodyIdx = request.IndexOf("\r\n\r\n");
            if (bodyIdx >= 0)
                body = request.Substring(bodyIdx + 4);
            int bodyBytes = Encoding.UTF8.GetBytes(body).Length;
            if (cl > bodyBytes)
            {
                byte[] rest = new byte[cl - bodyBytes];
                int r = stream.Read(rest, 0, rest.Length);
                body += Encoding.UTF8.GetString(rest, 0, r);
            }
        }

        if (method == "OPTIONS")
        {
            byte[] optHeader = Encoding.ASCII.GetBytes(
                "HTTP/1.1 200 OK\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                "Access-Control-Allow-Headers: Content-Type\r\n" +
                "Content-Length: 0\r\n" +
                "Connection: close\r\n\r\n");
            stream.Write(optHeader, 0, optHeader.Length);
            stream.Flush();
            return;
        }
        if (method == "GET" && path == "health") { Send(stream, 200, "ok", "text/plain; charset=utf-8"); return; }
        if (method == "GET" && path == "restart") { HandleRestart(stream, client); return; }
        if (method == "GET" && path == "api/update/check") { HandleUpdateCheck(stream, forceCheck); return; }
        if (method == "GET" && path == "api/update/download") { HandleUpdateDownload(stream); return; }
        if (method == "POST" && path == "api/update/install") { HandleUpdateInstall(stream); return; }
        if (method == "GET" && path == "api/settings/load") { HandleSettingsLoad(stream); return; }
        if (method == "POST" && path == "api/settings/save") { HandleSettingsSave(stream, body); return; }
        if (method == "GET" && path == "api/conversations/load") { HandleConversationsLoad(stream); return; }
        if (method == "POST" && path == "api/conversations/save") { HandleConversationsSave(stream, body); return; }

        ServeFile(stream, path);
        }
        catch { }
        finally
        {
            try { stream?.Close(); } catch { }
            try { client.Close(); } catch { }
        }
    }

    static void HandleRestart(NetworkStream stream, TcpClient client)
    {
        Process? newProc = null;
        try
        {
            newProc = Process.Start(new ProcessStartInfo
            {
                FileName = _exePath,
                Arguments = "--delay 1500",
                UseShellExecute = true
            });
        }
        catch { }

        string json = "{\"status\":\"restarting\",\"newPid\":" + (newProc?.Id ?? 0) + "}";
        Send(stream, 200, json, "application/json; charset=utf-8");

        Thread t = new Thread(() =>
        {
            Thread.Sleep(500);
            try { _listener?.Stop(); } catch { }
            _running = false;
            Thread.Sleep(200);
            Environment.Exit(0);
        }) { IsBackground = true };
        t.Start();
    }

    static void HandleUpdateCheck(NetworkStream stream, bool force)
    {
        string json;

        // Return cache if fresh and not forced
        if (!force && (DateTime.UtcNow - _updateCacheTime).TotalMinutes < UpdateCacheMinutes
            && _updateCacheVer != null)
        {
            Console.WriteLine("[Update] Using cached check result");
            json = BuildUpdateJson(_updateCacheVer, _updateCacheTag!, _updateCacheNotes ?? "",
                _updateCacheUrl ?? "", true);
            Send(stream, 200, json, "application/json; charset=utf-8");
            return;
        }

        // Call GitHub API
        bool rateLimited = false;
        try
        {
            using var wc = new WebClient();
            wc.Headers.Add("User-Agent", "RoxamiStudio-Update/1.0");
            wc.Headers.Add("Accept", "application/vnd.github.v3+json");
            string apiResp = wc.DownloadString(
                "https://api.github.com/repos/Ro-Xami/RoxamiStudio/releases/latest");
            string tag = ExtractJsonValue(apiResp, "tag_name");
            string name = ExtractJsonValue(apiResp, "name");
            string body = ExtractJsonValue(apiResp, "body");
            string downloadUrl = ExtractJsonValue(apiResp, "browser_download_url");
            string latestVer = (tag ?? name ?? "").TrimStart('v');

            if (string.IsNullOrEmpty(latestVer) || string.IsNullOrEmpty(downloadUrl))
                throw new Exception("Could not parse release info");

            // Update cache
            _updateCacheTime = DateTime.UtcNow;
            _updateCacheTag = tag;
            _updateCacheVer = latestVer;
            _updateCacheNotes = body;
            _updateCacheUrl = downloadUrl;

            json = BuildUpdateJson(latestVer, tag ?? "", body ?? "", downloadUrl, false);
        }
        catch (WebException we)
        {
            var resp = we.Response as HttpWebResponse;
            if (resp != null && (int)resp.StatusCode == 403)
                rateLimited = true;

            // Fall back to cache
            if (_updateCacheVer != null)
            {
                Console.WriteLine("[Update] API failed, returning cached data");
                json = BuildUpdateJson(_updateCacheVer, _updateCacheTag!, _updateCacheNotes ?? "",
                    _updateCacheUrl ?? "", true);
            }
            else if (rateLimited)
            {
                json = "{\"error\":\"请求次数太多，请隔一小时后再试\"}";
            }
            else
            {
                json = "{\"error\":\"" + JsonEscape(we.Message) + "\"}";
            }
        }
        catch (Exception ex)
        {
            if (_updateCacheVer != null)
            {
                Console.WriteLine("[Update] API failed, returning cached data");
                json = BuildUpdateJson(_updateCacheVer, _updateCacheTag!, _updateCacheNotes ?? "",
                    _updateCacheUrl ?? "", true);
            }
            else
            {
                json = "{\"error\":\"" + JsonEscape(ex.Message) + "\"}";
            }
        }

        Send(stream, 200, json, "application/json; charset=utf-8");
    }

    static string BuildUpdateJson(string latestVer, string tag, string notes, string downloadUrl, bool cached)
    {
        bool hasUpdate = CompareVersions(latestVer, AppVersion) > 0;
        return "{\"current\":\"" + AppVersion +
               "\",\"latest\":\"" + latestVer +
               "\",\"hasUpdate\":" + (hasUpdate ? "true" : "false") +
               ",\"url\":\"" + JsonEscape(downloadUrl) +
               "\",\"notes\":\"" + JsonEscape(notes) +
               "\",\"cached\":" + (cached ? "true" : "false") + "}";
    }

    static void HandleUpdateDownload(NetworkStream stream)
    {
        // Send SSE headers
        byte[] header = Encoding.ASCII.GetBytes(
            "HTTP/1.1 200 OK\r\n" +
            "Content-Type: text/event-stream\r\n" +
            "Cache-Control: no-cache\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "Connection: keep-alive\r\n\r\n");
        stream.Write(header, 0, header.Length);
        stream.Flush();

        string[] mirrors = {
            "https://github.com/Ro-Xami/RoxamiStudio/releases/download/{0}/RoxamiStudio_Setup.exe",
            "https://ghproxy.net/https://github.com/Ro-Xami/RoxamiStudio/releases/download/{0}/RoxamiStudio_Setup.exe",
            "https://gh-proxy.com/https://github.com/Ro-Xami/RoxamiStudio/releases/download/{0}/RoxamiStudio_Setup.exe",
            "https://github.moeyy.xyz/https://github.com/Ro-Xami/RoxamiStudio/releases/download/{0}/RoxamiStudio_Setup.exe"
        };

        // Use cached tag from previous check; fall back to API only if missing
        string tag;
        if (_updateCacheTag != null)
        {
            tag = _updateCacheTag;
        }
        else
        {
            try
            {
                using var wc = new WebClient();
                wc.Headers.Add("User-Agent", "RoxamiStudio-Update/1.0");
                wc.Headers.Add("Accept", "application/vnd.github.v3+json");
                string apiResp = wc.DownloadString(
                    "https://api.github.com/repos/Ro-Xami/RoxamiStudio/releases/latest");
                string t = ExtractJsonValue(apiResp, "tag_name") ?? "";
                tag = t.Trim();
            }
            catch
            {
                SendSSEMsg(stream, "error", "Failed to get latest version info");
                stream.Flush();
                return;
            }
        }

        string tempFile = Path.Combine(Path.GetTempPath(), "RoxamiStudio_Update.exe");
        lock (_installLock) { _installFile = tempFile; }

        bool downloaded = false;
        foreach (string mirror in mirrors)
        {
            string url = mirror.Replace("{0}", tag);
            string mirrorLabel = mirror.StartsWith("https://github.com/Ro-Xami") ? "GitHub"
                : mirror.StartsWith("https://ghproxy.net") ? "ghproxy.net"
                : mirror.StartsWith("https://gh-proxy.com") ? "gh-proxy.com"
                : mirror.StartsWith("https://github.moeyy.xyz") ? "github.moeyy.xyz"
                : "Mirror";
            Console.WriteLine("[Update] Trying: " + url);
            SendSSEMsg(stream, "mirror", mirrorLabel);
            SendSSEMsg(stream, "status", "Connecting to " + mirrorLabel + "...");
            stream.Flush();

            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.UserAgent = "RoxamiStudio-Update/1.0";
                req.Timeout = 30000;
                req.ReadWriteTimeout = 300000;

                using HttpWebResponse resp = (HttpWebResponse)req.GetResponse();
                if (resp.StatusCode != HttpStatusCode.OK) continue;

                long total = resp.ContentLength;
                using var rs = resp.GetResponseStream();
                using var fs = File.Create(tempFile);

                byte[] buf = new byte[65536];
                long read = 0;
                int n;
                var lastProgress = DateTime.MinValue;
                while ((n = rs.Read(buf, 0, buf.Length)) > 0)
                {
                    fs.Write(buf, 0, n);
                    read += n;
                    var now = DateTime.UtcNow;
                    if ((now - lastProgress).TotalMilliseconds >= 500)
                    {
                        lastProgress = now;
                        string pct = total > 0 ? ((double)read / total * 100).ToString("F0") : "0";
                        string sizeMB = (read / 1024.0 / 1024.0).ToString("F1");
                        string totalMB = total > 0 ? (total / 1024.0 / 1024.0).ToString("F1") : "?";
                        SendSSEMsg(stream, "progress",
                            $"{{\"pct\":{pct},\"sizeMB\":{sizeMB},\"totalMB\":\"{totalMB}\",\"mirror\":\"{mirrorLabel}\"}}");
                        stream.Flush();
                    }
                }
                downloaded = true;
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine("[Update] Mirror failed: " + ex.Message);
            }
        }

        if (downloaded)
        {
            Console.WriteLine("[Update] Download complete: " + tempFile);
            SendSSEMsg(stream, "done", "{\"file\":\"" + JsonEscape(tempFile) + "\"}");
        }
        else
        {
            SendSSEMsg(stream, "error", "All mirrors failed. Please download manually.");
        }
        stream.Flush();
    }

    static void HandleUpdateInstall(NetworkStream stream)
    {
        string file;
        lock (_installLock)
        {
            if (_installFile == null || !File.Exists(_installFile))
            {
                Send(stream, 400, "{\"error\":\"No update package downloaded\"}",
                    "application/json; charset=utf-8");
                return;
            }
            file = _installFile;
            Send(stream, 200, "{\"status\":\"installing\"}", "application/json; charset=utf-8");
        }

        // Write batch script to run installer + restart AFTER this process exits
        string bat = Path.Combine(Path.GetTempPath(), "roxami_update.bat");
        File.WriteAllText(bat,
            "@echo off\r\n" +
            "ping 127.0.0.1 -n 3 > nul\r\n" +
            "\"" + file + "\" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART\r\n" +
            "start \"\" \"" + _exePath + "\"\r\n" +
            "del \"" + bat + "\"\r\n");
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = bat,
                UseShellExecute = true,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            });
        }
        catch { }

        // Exit current process immediately — batch handles the rest
        Thread.Sleep(300);
        try { _listener?.Stop(); } catch { }
        _running = false;
        Environment.Exit(0);
    }

    // ============================================================
    //  SETTINGS & CONVERSATIONS API
    // ============================================================
    static void HandleSettingsLoad(NetworkStream stream)
    {
        try
        {
            string filePath = Path.Combine(BaseDir, "settings.json");
            if (!File.Exists(filePath))
            {
                File.WriteAllText(filePath, DefaultSettings, Encoding.UTF8);
                Send(stream, 200, DefaultSettings, "application/json; charset=utf-8");
                return;
            }
            string content = File.ReadAllText(filePath, Encoding.UTF8);
            Send(stream, 200, content, "application/json; charset=utf-8");
        }
        catch (Exception ex)
        {
            Send(stream, 500, "{\"error\":\"" + JsonEscape(ex.Message) + "\"}", "application/json; charset=utf-8");
        }
    }

    static void HandleSettingsSave(NetworkStream stream, string body)
    {
        if (string.IsNullOrEmpty(body))
        {
            Send(stream, 400, "{\"error\":\"Empty body\"}", "application/json; charset=utf-8");
            return;
        }
        try
        {
            string filePath = Path.Combine(BaseDir, "settings.json");
            File.WriteAllText(filePath, body, Encoding.UTF8);
            Send(stream, 200, "{\"ok\":true}", "application/json; charset=utf-8");
        }
        catch (Exception ex)
        {
            Send(stream, 500, "{\"error\":\"" + JsonEscape(ex.Message) + "\"}", "application/json; charset=utf-8");
        }
    }

    static void HandleConversationsLoad(NetworkStream stream)
    {
        try
        {
            string filePath = Path.Combine(BaseDir, "conversations.json");
            if (!File.Exists(filePath))
            {
                Send(stream, 200, "[]", "application/json; charset=utf-8");
                return;
            }
            string content = File.ReadAllText(filePath, Encoding.UTF8);
            Send(stream, 200, content, "application/json; charset=utf-8");
        }
        catch (Exception ex)
        {
            Send(stream, 500, "{\"error\":\"" + JsonEscape(ex.Message) + "\"}", "application/json; charset=utf-8");
        }
    }

    static void HandleConversationsSave(NetworkStream stream, string body)
    {
        if (string.IsNullOrEmpty(body))
        {
            Send(stream, 400, "{\"error\":\"Empty body\"}", "application/json; charset=utf-8");
            return;
        }
        try
        {
            string filePath = Path.Combine(BaseDir, "conversations.json");
            File.WriteAllText(filePath, body, Encoding.UTF8);
            Send(stream, 200, "{\"ok\":true}", "application/json; charset=utf-8");
        }
        catch (Exception ex)
        {
            Send(stream, 500, "{\"error\":\"" + JsonEscape(ex.Message) + "\"}", "application/json; charset=utf-8");
        }
    }

    static void SendSSEMsg(NetworkStream stream, string type, string data)
    {
        string msg = "event: " + type + "\r\ndata: " + data + "\r\n\r\n";
        byte[] bytes = Encoding.UTF8.GetBytes(msg);
        try { stream.Write(bytes, 0, bytes.Length); } catch { }
    }

    static string? ExtractJsonValue(string json, string key)
    {
        string search = "\"" + key + "\":\"";
        int start = json.IndexOf(search);
        if (start < 0)
        {
            search = "\"" + key + "\": \"";
            start = json.IndexOf(search);
        }
        if (start < 0) return null;
        start += search.Length;
        int end = json.IndexOf('"', start);
        if (end < 0) return null;
        return json[start..end]
            .Replace("\\n", "\n")
            .Replace("\\r", "\r")
            .Replace("\\t", "\t")
            .Replace("\\\"", "\"");
    }

    static int CompareVersions(string a, string b)
    {
        try
        {
            string[] pa = a.Split('.');
            string[] pb = b.Split('.');
            for (int i = 0; i < Math.Max(pa.Length, pb.Length); i++)
            {
                int va = 0, vb = 0;
                if (i < pa.Length) int.TryParse(pa[i], out va);
                if (i < pb.Length) int.TryParse(pb[i], out vb);
                if (va != vb) return va.CompareTo(vb);
            }
            return 0;
        }
        catch { return 0; }
    }

    static string JsonEscape(string s)
    {
        return (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"")
            .Replace("\n", "\\n").Replace("\r", "\\r");
    }

    static void ServeFile(NetworkStream stream, string path)
    {
        if (string.IsNullOrEmpty(path)) path = "index.html";
        string full = Path.GetFullPath(Path.Combine(BaseDir, path));
        if (!full.StartsWith(BaseDir, StringComparison.OrdinalIgnoreCase)) { Send(stream, 403, "Forbidden", "text/plain"); return; }
        if (!File.Exists(full)) { Send(stream, 404, "Not Found", "text/plain"); return; }

        string ext = Path.GetExtension(full);
        string mime = MimeTypes.TryGetValue(ext, out string? m) ? m : "application/octet-stream";
        byte[] body = File.ReadAllBytes(full);
        SendBytes(stream, 200, body, mime);
    }

    static void Send(NetworkStream stream, int code, string body, string contentType)
        => SendBytes(stream, code, Encoding.UTF8.GetBytes(body), contentType);

    static void SendBytes(NetworkStream stream, int code, byte[] body, string contentType)
    {
        try
        {
            string status = code switch { 200 => "OK", 404 => "Not Found", 403 => "Forbidden", _ => "Error" };
            byte[] header = Encoding.ASCII.GetBytes(
                "HTTP/1.1 " + code + " " + status + "\r\n" +
                "Content-Type: " + contentType + "\r\n" +
                "Content-Length: " + body.Length + "\r\n" +
                "Cache-Control: no-cache, no-store, must-revalidate\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Connection: close\r\n\r\n");
            stream.Write(header, 0, header.Length);
            stream.Write(body, 0, body.Length);
            stream.Flush();
        }
        catch { }
    }
}
