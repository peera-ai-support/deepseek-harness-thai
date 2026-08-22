using System.Diagnostics;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    private const string AppUserModelId = "DeepSeekAI.Harness.Desktop";
    private const string SingleInstanceMutex = @"Local\DeepSeekHarness.Desktop";
    private const int Port = 13080;
    internal const string AppUrl = "http://127.0.0.1:13080/";

    private static Process? serverProcess;
    private static bool startedServer;
    private static IntPtr serverJob;

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SetCurrentProcessExplicitAppUserModelID(string appID);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string? lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(IntPtr hJob, int jobObjectInfoClass, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION lpJobObjectInfo, int cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    private const int JobObjectExtendedLimitInformation = 9;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [STAThread]
    private static void Main()
    {
        using var mutex = new Mutex(true, SingleInstanceMutex, out var created);
        if (!created)
        {
            ActivateExistingWindow();
            return;
        }

        SetCurrentProcessExplicitAppUserModelID(AppUserModelId);
        ApplicationConfiguration.Initialize();
        Application.ApplicationExit += (_, _) => StopServerIfStarted();
        Application.Run(new AppWindow());
    }

    private static void ActivateExistingWindow()
    {
        foreach (var proc in Process.GetProcessesByName("DeepSeekHarness"))
        {
            if (proc.Id == Environment.ProcessId) continue;
            var handle = proc.MainWindowHandle;
            if (handle == IntPtr.Zero) continue;
            ShowWindow(handle, 9);
            SetForegroundWindow(handle);
            return;
        }
    }

    internal static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "pnpm-workspace.yaml"))
                && File.Exists(Path.Combine(dir.FullName, "package.json")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        var cwd = Directory.GetCurrentDirectory();
        if (File.Exists(Path.Combine(cwd, "package.json")))
        {
            return cwd;
        }

        throw new DirectoryNotFoundException("Could not find the DeepSeek Harness project folder.");
    }

    internal static bool IsServerReady()
    {
        try
        {
            using var client = new TcpClient();
            var ar = client.BeginConnect("127.0.0.1", Port, null, null);
            return ar.AsyncWaitHandle.WaitOne(250) && client.Connected;
        }
        catch (SocketException)
        {
            return false;
        }
        catch (ObjectDisposedException)
        {
            return false;
        }
    }

    internal static void EnsureServer(string root)
    {
        if (IsServerReady())
        {
            return;
        }

        var pathExtra = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "npm"),
            @"C:\nvm4w\nodejs",
            @"C:\Program Files\nodejs",
        };
        var currentPath = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        Environment.SetEnvironmentVariable(
            "PATH",
            string.Join(";", pathExtra.Where(Directory.Exists).Append(currentPath)));

        var pnpm = FindOnPath("pnpm.cmd") ?? FindOnPath("pnpm.exe");
        if (pnpm is null)
        {
            throw new InvalidOperationException("pnpm was not found. Install pnpm, then try again.");
        }

        if (!Directory.Exists(Path.Combine(root, "node_modules")))
        {
            throw new InvalidOperationException("Dependencies are missing. Run pnpm install in the project folder first.");
        }

        var overlay = Path.Combine(root, "desktop-host", "pin-browse-picker.overlay.yml");
        var patchArg = File.Exists(overlay) ? $" --patch \"{overlay}\"" : "";
        // Built mode first: `apps/cli/lib/bin.js` boots in ~3s instead of the
        // ~20s tsx source transpile; fall back to the source launch when the
        // checkout has never been built.
        var built = Path.Combine(root, "apps", "cli", "lib", "bin.js");
        var node = FindOnPath("node.exe");
        var command = File.Exists(built) && node is not null
            ? $"/c \"\"{node}\" \"{built}\" web{patchArg} --port {Port} --no-open\""
            : $"/c \"\"{pnpm}\" dsh web{patchArg} --port {Port} --no-open\"";
        serverProcess = Process.Start(new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = command,
            WorkingDirectory = root,
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden,
        }) ?? throw new InvalidOperationException("Failed to start the DeepSeek Harness server.");
        startedServer = true;

        // Kill(entireProcessTree:) races intermediate-process exits and orphans
        // the leaf server; the job object makes the OS kill the whole tree when
        // this process exits, crash included.
        serverJob = CreateJobObject(IntPtr.Zero, null);
        var limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        SetInformationJobObject(serverJob, JobObjectExtendedLimitInformation, ref limits, Marshal.SizeOf<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>());
        AssignProcessToJobObject(serverJob, serverProcess.Handle);

        // Cold starts after large repo updates (tsx cache + first-run scans)
        // have exceeded 45s; allow 120s so the first launch still succeeds.
        var deadline = DateTime.UtcNow.AddSeconds(120);
        while (DateTime.UtcNow < deadline)
        {
            if (IsServerReady())
            {
                return;
            }

            Thread.Sleep(250);
        }

        StopServerIfStarted();
        throw new TimeoutException($"The DeepSeek Harness server did not start on port {Port}.");
    }

    internal static void StopServerIfStarted()
    {
        if (!startedServer || serverProcess is null)
        {
            return;
        }

        try
        {
            if (!serverProcess.HasExited)
            {
                serverProcess.Kill(entireProcessTree: true);
            }
        }
        catch (InvalidOperationException)
        {
            // The process already exited between HasExited and Kill.
        }
        catch (System.ComponentModel.Win32Exception)
        {
            // Access denied or the process is already terminating.
        }
        finally
        {
            serverProcess.Dispose();
            serverProcess = null;
            startedServer = false;
        }
    }

    private static string? FindOnPath(string fileName)
    {
        var path = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        foreach (var dir in path.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
        {
            var candidate = Path.Combine(dir.Trim('"'), fileName);
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        return null;
    }
}

internal sealed class AppWindow : Form
{
    private readonly WebView2 _webView = new() { Dock = DockStyle.Fill };

    public AppWindow()
    {
        Text = "DeepSeek Harness";
        Width = 1360;
        Height = 880;
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(900, 600);

        var exe = Application.ExecutablePath;
        if (File.Exists(exe))
        {
            Icon = Icon.ExtractAssociatedIcon(exe);
            ShowIcon = true;
        }

        Controls.Add(_webView);
        Shown += OnShown;
        FormClosed += (_, _) => Program.StopServerIfStarted();
    }

    private async void OnShown(object? sender, EventArgs e)
    {
        Shown -= OnShown;
        try
        {
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "DeepSeekHarness",
                "webview2");
            Directory.CreateDirectory(userData);

            var env = await CoreWebView2Environment.CreateAsync(null, userData);
            await _webView.EnsureCoreWebView2Async(env);
            _webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = true;
            _webView.CoreWebView2.NewWindowRequested += (_, args) =>
            {
                args.Handled = true;
                Process.Start(new ProcessStartInfo(args.Uri) { UseShellExecute = true });
            };

            _webView.NavigateToString(DeepSeekHarness.SplashPage.Html);

            var root = Program.FindRepoRoot();
            await Task.Run(() => Program.EnsureServer(root));
            _webView.CoreWebView2.Navigate(Program.AppUrl.TrimEnd('/') + "/");
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "DeepSeek Harness", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }
}
