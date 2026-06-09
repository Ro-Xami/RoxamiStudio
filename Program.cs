using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

class Program
{
    static string BaseDir;
    static int Port = 8080;
    static TcpListener _listener;
    static string _exePath;
    static Dictionary<string, string> MimeTypes;
    static bool _running = true;

    static void Main(string[] args)
    {
        BaseDir = AppDomain.CurrentDomain.BaseDirectory;
        _exePath = Environment.GetCommandLineArgs()[0];

        if (args.Length >= 2 && args[0] == "--delay")
        {
            int delayMs;
            if (int.TryParse(args[1], out delayMs))
                Thread.Sleep(delayMs);
        }

        MimeTypes = new Dictionary<string, string>();
        MimeTypes[".html"] = "text/html; charset=utf-8";
        MimeTypes[".css"] = "text/css; charset=utf-8";
        MimeTypes[".js"] = "application/javascript; charset=utf-8";
        MimeTypes[".mjs"] = "application/javascript; charset=utf-8";
        MimeTypes[".json"] = "application/json; charset=utf-8";
        MimeTypes[".png"] = "image/png";
        MimeTypes[".jpg"] = "image/jpeg";
        MimeTypes[".jpeg"] = "image/jpeg";
        MimeTypes[".gif"] = "image/gif";
        MimeTypes[".svg"] = "image/svg+xml";
        MimeTypes[".ico"] = "image/x-icon";
        MimeTypes[".woff"] = "font/woff";
        MimeTypes[".woff2"] = "font/woff2";
        MimeTypes[".ttf"] = "font/ttf";

        Console.Title = "Roxami Studio";
        Console.WriteLine("================================");
        Console.WriteLine("  Roxami Studio");
        Console.WriteLine("================================");
        Console.WriteLine();

        try
        {
            _listener = new TcpListener(IPAddress.Loopback, Port);
            _listener.Start();
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: Cannot start server on port " + Port + ".");
            Console.WriteLine(ex.Message);
            Console.WriteLine("Press Enter to exit...");
            Console.ReadLine();
            return;
        }

        try { Process.Start("http://localhost:" + Port); }
        catch { }

        Console.WriteLine("Server: http://localhost:" + Port);
        Console.WriteLine("Press Enter to stop...");
        Console.WriteLine();

        Thread serverThread = new Thread(delegate()
        {
            while (_running)
            {
                try
                {
                    TcpClient client = _listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(delegate(object s) { HandleClient((TcpClient)s); }, client);
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

    static void HandleClient(TcpClient client)
    {
        NetworkStream stream = null;
        try
        {
            stream = client.GetStream();
            stream.ReadTimeout = 10000;
            stream.WriteTimeout = 10000;

            byte[] buf = new byte[8192];
            int read = stream.Read(buf, 0, buf.Length);
            if (read <= 0) return;

            string request = Encoding.ASCII.GetString(buf, 0, read);
            string[] lines = request.Split(new string[] { "\r\n" }, StringSplitOptions.None);

            if (lines.Length == 0) return;

            string[] parts = lines[0].Split(' ');
            if (parts.Length < 2) return;

            string method = parts[0];
            string url = parts[1];

            int qIndex = url.IndexOf('?');
            string path = qIndex >= 0 ? url.Substring(0, qIndex) : url;
            path = path.TrimStart('/');

            if (method == "GET" && path == "health") { SendResponse(stream, client, 200, "ok", "text/plain; charset=utf-8"); return; }

            if (method == "GET" && path == "restart") { HandleRestart(stream, client); return; }

            ServeFile(stream, client, path);
        }
        catch { }
        finally
        {
            try { stream.Close(); } catch { }
            try { client.Close(); } catch { }
        }
    }

    static void HandleRestart(NetworkStream stream, TcpClient client)
    {
        Process newProc = null;
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = _exePath;
            psi.Arguments = "--delay 1500";
            psi.UseShellExecute = true;
            newProc = Process.Start(psi);
        }
        catch { }

        string json = "{\"status\":\"restarting\",\"newPid\":" + (newProc != null ? newProc.Id.ToString() : "0") + "}";
        SendResponse(stream, client, 200, json, "application/json; charset=utf-8");

        Thread restartThread = new Thread(delegate()
        {
            Thread.Sleep(500);
            try { _listener.Stop(); } catch { }
            _running = false;
            Thread.Sleep(200);
            Environment.Exit(0);
        });
        restartThread.IsBackground = true;
        restartThread.Start();
    }

    static void ServeFile(NetworkStream stream, TcpClient client, string path)
    {
        if (string.IsNullOrEmpty(path)) path = "index.html";
        string fullPath = Path.GetFullPath(Path.Combine(BaseDir, path));
        if (!fullPath.StartsWith(BaseDir, StringComparison.OrdinalIgnoreCase))
        {
            SendResponse(stream, client, 403, "Forbidden", "text/plain");
            return;
        }
        if (!File.Exists(fullPath))
        {
            SendResponse(stream, client, 404, "Not Found", "text/plain");
            return;
        }
        string ext = Path.GetExtension(fullPath);
        string mime;
        if (!MimeTypes.TryGetValue(ext, out mime)) mime = "application/octet-stream";

        byte[] bytes = File.ReadAllBytes(fullPath);
        SendBytes(stream, client, 200, bytes, mime);
    }

    static void SendResponse(NetworkStream stream, TcpClient client, int code, string body, string contentType)
    {
        byte[] bodyBytes = Encoding.UTF8.GetBytes(body);
        SendBytes(stream, client, code, bodyBytes, contentType);
    }

    static void SendBytes(NetworkStream stream, TcpClient client, int code, byte[] body, string contentType)
    {
        try
        {
            string status = code == 200 ? "OK" : code == 404 ? "Not Found" : "Error";
            string header = "HTTP/1.1 " + code + " " + status + "\r\n" +
                "Content-Type: " + contentType + "\r\n" +
                "Content-Length: " + body.Length + "\r\n" +
                "Cache-Control: no-cache, no-store, must-revalidate\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Connection: close\r\n" +
                "\r\n";
            byte[] headerBytes = Encoding.ASCII.GetBytes(header);
            stream.Write(headerBytes, 0, headerBytes.Length);
            stream.Write(body, 0, body.Length);
            stream.Flush();
        }
        catch { }
    }
}
