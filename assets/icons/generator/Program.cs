using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

public static class Program
{
    [DllImport("shell32.dll")]
    private static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    [STAThread]
    public static int Main(string[] args)
    {
        try
        {
            var iconsDir = AppContext.BaseDirectory;
            while (!File.Exists(Path.Combine(iconsDir, "icon-512.png")) && Directory.GetParent(iconsDir) != null)
            {
                iconsDir = Directory.GetParent(iconsDir)!.FullName;
            }

            var src512 = Path.Combine(iconsDir, "icon-512.png");
            if (!File.Exists(src512))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[ERROR] Source file not found: {src512}");
                Console.ResetColor();
                return 1;
            }

            Console.WriteLine($"[INFO] Reading base icon: {src512}");
            var baseImage = new BitmapImage();
            baseImage.BeginInit();
            baseImage.UriSource = new Uri(src512, UriKind.Absolute);
            baseImage.CacheOption = BitmapCacheOption.OnLoad;
            baseImage.EndInit();
            baseImage.Freeze();

            int[] pngSizes = [16, 32, 48, 128, 256];
            foreach (var size in pngSizes)
            {
                var targetPath = Path.Combine(iconsDir, $"icon-{size}.png");
                SaveResizedPng(baseImage, targetPath, size);
                Console.WriteLine($"  [+] Created: icon-{size}.png ({size}x{size})");
            }

            var applePath = Path.Combine(iconsDir, "apple-touch-icon.png");
            SaveResizedPng(baseImage, applePath, 180);
            Console.WriteLine("  [+] Created: apple-touch-icon.png (180x180)");

            // Build multi-size .ico
            int[] icoSizes = [16, 24, 32, 48, 64, 128, 256];
            var icoPath = Path.Combine(iconsDir, "icon.ico");
            SaveMultiSizeIco(baseImage, icoPath, icoSizes);
            Console.WriteLine("  [+] Created: icon.ico (16, 24, 32, 48, 64, 128, 256)");

            // Find repo root to update app.ico and deepseek-harness.ico
            var repoRoot = iconsDir;
            while (!File.Exists(Path.Combine(repoRoot, "package.json")) && Directory.GetParent(repoRoot) != null)
            {
                repoRoot = Directory.GetParent(repoRoot)!.FullName;
            }

            if (File.Exists(Path.Combine(repoRoot, "package.json")))
            {
                var hostIco = Path.Combine(repoRoot, "desktop-host", "app.ico");
                var rootIco = Path.Combine(repoRoot, "deepseek-harness.ico");
                File.Copy(icoPath, hostIco, true);
                File.Copy(icoPath, rootIco, true);
                Console.WriteLine($"  [+] Synchronized: {hostIco}");
                Console.WriteLine($"  [+] Synchronized: {rootIco}");
            }

            // Refresh Windows Shell cache
            SHChangeNotify(0x08000000, 0x1000, IntPtr.Zero, IntPtr.Zero);
            Console.WriteLine("[SUCCESS] All icons generated and Windows shell cache refreshed successfully!");
            return 0;
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[ERROR] Failed to generate icons: {ex.Message}");
            Console.ResetColor();
            return 1;
        }
    }

    private static BitmapSource ResizeBitmap(BitmapSource source, int size)
    {
        var targetRect = new Rect(0, 0, size, size);
        var visual = new DrawingVisual();
        using (var dc = visual.RenderOpen())
        {
            RenderOptions.SetBitmapScalingMode(visual, BitmapScalingMode.HighQuality);
            dc.DrawImage(source, targetRect);
        }

        var rtb = new RenderTargetBitmap(size, size, 96, 96, PixelFormats.Pbgra32);
        rtb.Render(visual);
        return rtb;
    }

    private static byte[] GetPngBytes(BitmapSource source, int size)
    {
        var resized = ResizeBitmap(source, size);
        var encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(resized));
        using var ms = new MemoryStream();
        encoder.Save(ms);
        return ms.ToArray();
    }

    private static void SaveResizedPng(BitmapSource source, string path, int size)
    {
        var bytes = GetPngBytes(source, size);
        File.WriteAllBytes(path, bytes);
    }

    private static void SaveMultiSizeIco(BitmapSource source, string path, int[] sizes)
    {
        var pngData = new List<byte[]>();
        foreach (var s in sizes)
        {
            pngData.Add(GetPngBytes(source, s));
        }

        using var fs = File.OpenWrite(path);
        using var bw = new BinaryWriter(fs);

        bw.Write((ushort)0); // reserved
        bw.Write((ushort)1); // icon type
        bw.Write((ushort)sizes.Length); // count

        int offset = 6 + 16 * sizes.Length;
        for (int i = 0; i < sizes.Length; i++)
        {
            int s = sizes[i];
            bw.Write((byte)(s >= 256 ? 0 : s));
            bw.Write((byte)(s >= 256 ? 0 : s));
            bw.Write((byte)0); // color count
            bw.Write((byte)0); // reserved
            bw.Write((ushort)1); // planes
            bw.Write((ushort)32); // bpp
            bw.Write((uint)pngData[i].Length); // size
            bw.Write((uint)offset); // offset

            offset += pngData[i].Length;
        }

        for (int i = 0; i < sizes.Length; i++)
        {
            bw.Write(pngData[i]);
        }
    }
}
