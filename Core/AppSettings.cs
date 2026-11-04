using System;
using System.IO;
using System.Text.Json;

namespace hudInteface.Core;

public class AppSettings
{
    public string Theme { get; set; } = "japanese";
    public string LastActiveModule { get; set; } = "search";
    public bool StartMinimized { get; set; } = false;

    // Persisted Psalter State
    public int LastPsalmNumber { get; set; } = 1;
    public int LastKatizmaNumber { get; set; } = 1;
    public string LastPsalterLevel { get; set; } = "katizma";
    public int LastPsalmScrollPos { get; set; } = 0;

    // Window Dimensions Persistence
    public double WindowWidth { get; set; } = 1060;
    public double WindowHeight { get; set; } = 720;

    private static readonly string SettingsFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "hudInteface"
    );
    private static readonly string SettingsFilePath = Path.Combine(SettingsFolder, "settings.json");

    public static AppSettings Load()
    {
        try
        {
            if (File.Exists(SettingsFilePath))
            {
                var json = File.ReadAllText(SettingsFilePath);
                var settings = JsonSerializer.Deserialize<AppSettings>(json);
                if (settings != null) return settings;
            }
        }
        catch { }

        return new AppSettings();
    }

    public void Save()
    {
        try
        {
            if (!Directory.Exists(SettingsFolder))
            {
                Directory.CreateDirectory(SettingsFolder);
            }
            var json = JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(SettingsFilePath, json);
        }
        catch { }
    }
}
