using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

class Program
{
    static void Main()
    {
        Console.Title = "Roxami Studio";
        Console.WriteLine("================================");
        Console.WriteLine("  Roxami Studio starting...");
        Console.WriteLine("================================");
        Console.WriteLine();

        var baseDir = AppDomain.CurrentDomain.BaseDirectory;
        var indexHtml = Path.Combine(baseDir, "index.html");

        if (!File.Exists(indexHtml))
        {
            Console.WriteLine("Error: index.html not found!");
            Console.WriteLine("Expected: " + indexHtml);
            Console.WriteLine("Press Enter to exit...");
            Console.ReadLine();
            return;
        }

        var psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c npx --yes http-server . -p 8080 -c-1",
            WorkingDirectory = baseDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };

        Process? serverProcess = null;
        try
        {
            serverProcess = Process.Start(psi);
            if (serverProcess == null)
            {
                Console.WriteLine("Error: Failed to start HTTP server. Make sure Node.js is installed.");
                Console.WriteLine("Press Enter to exit...");
                Console.ReadLine();
                return;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
            Console.WriteLine("Make sure Node.js is installed (https://nodejs.org).");
            Console.WriteLine("Press Enter to exit...");
            Console.ReadLine();
            return;
        }

        Thread.Sleep(2500);

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "http://localhost:8080",
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine("Warning: Cannot open browser - " + ex.Message);
            Console.WriteLine("Please visit http://localhost:8080 manually");
        }

        Console.WriteLine("Server running: http://localhost:8080");
        Console.WriteLine("Press Enter to stop server...");
        Console.ReadLine();

        try
        {
            if (!serverProcess.HasExited)
            {
                serverProcess.Kill();
                serverProcess.WaitForExit(3000);
            }
        }
        catch { }

        Console.WriteLine("Roxami Studio closed.");
    }
}
