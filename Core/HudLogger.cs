using System;
using System.IO;

namespace hudInteface.Core;

public static class HudLogger
{
    private static readonly string LogDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "hudInteface"
    );
    private static readonly string LogFile = Path.Combine(LogDir, "hud.log");
    private static readonly object LockObj = new();

    static HudLogger()
    {
        try
        {
            if (!Directory.Exists(LogDir))
            {
                Directory.CreateDirectory(LogDir);
            }
        }
        catch { }
    }

    public static void Log(string message, string level = "INFO")
    {
        try
        {
            lock (LockObj)
            {
                var entry = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] [{level}] {message}{Environment.NewLine}";
                File.AppendAllText(LogFile, entry);
            }
        }
        catch { }
    }

    public static void LogError(string message, Exception? ex = null)
    {
        var text = ex != null ? $"{message} | EXCEPTION: {ex.GetType().Name}: {ex.Message}{Environment.NewLine}{ex.StackTrace}" : message;
        Log(text, "ERROR");
    }
}
