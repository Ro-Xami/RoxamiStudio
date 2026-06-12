using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;

class Program
{
    static void Main()
    {
        Console.Title = "Roxami Studio Setup";
        Console.WriteLine("========================================");
        Console.WriteLine("  Roxami Studio Installer");
        Console.WriteLine("========================================");
        Console.WriteLine();

        // Kill any running instance to free port 8080
        try
        {
            foreach (Process p in Process.GetProcessesByName("RoxamiStudio"))
            {
                Console.Write("Stopping existing Roxami Studio (PID: " + p.Id + ")... ");
                p.Kill();
                p.WaitForExit(3000);
                Console.WriteLine("Done.");
            }
        }
        catch { }

        string tempDir = Path.Combine(Path.GetTempPath(), "RoxamiStudio_Setup");

        try
        {
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, true);

            Directory.CreateDirectory(tempDir);

            Console.Write("Extracting installation files... ");
            string resourceName = "RoxamiStudio_Setup.RoxamiStudio_package.zip";
            using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName))
            {
                if (stream == null)
                {
                    Console.WriteLine();
                    Console.WriteLine("ERROR: Installation package is corrupted.");
                    Console.WriteLine("Press Enter to exit...");
                    Console.ReadLine();
                    return;
                }

                using (ZipArchive archive = new ZipArchive(stream))
                {
                    archive.ExtractToDirectory(tempDir);
                }
            }
            Console.WriteLine("Done.");
            Console.WriteLine();

            Console.WriteLine("Starting installation wizard...");
            Console.WriteLine("(A new window will open. Follow the prompts.)");

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" +
                    Path.Combine(tempDir, "install.ps1") + "\"",
                UseShellExecute = true
            };

            Process p = Process.Start(psi);
            if (p != null)
            {
                p.WaitForExit();
            }

            Console.WriteLine();
            Console.WriteLine("Installation complete. You can close this window.");
            Console.WriteLine("Press Enter to exit...");
        }
        catch (Exception ex)
        {
            Console.WriteLine("Installation failed: " + ex.Message);
            Console.WriteLine("Press Enter to exit...");
        }
    }
}
