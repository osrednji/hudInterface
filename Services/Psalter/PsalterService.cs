using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using hudInteface.Core;

namespace hudInteface.Services.Psalter;

public class PsalterService
{
    private JsonDocument? _cachedDoc;
    private string? _cachedRawJson;
    private JsonDocument? _cachedInstDoc;
    private string? _cachedInstRawJson;
    private readonly object _lock = new();

    private static string? ResolveDataFilePath(string relativeSubPath)
    {
        // 1. Direct from BaseDirectory (e.g. bin output directory or installed app directory)
        string pathBase = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, relativeSubPath);
        if (File.Exists(pathBase)) return pathBase;

        // 2. Direct from CurrentDirectory
        string pathCurrent = Path.Combine(Environment.CurrentDirectory, relativeSubPath);
        if (File.Exists(pathCurrent)) return pathCurrent;

        // 3. Probe upwards (handles running inside bin/Debug/net10.0-windows during development)
        string? dir = AppDomain.CurrentDomain.BaseDirectory;
        for (int i = 0; i < 5 && dir != null; i++)
        {
            string candidate = Path.Combine(dir, relativeSubPath);
            if (File.Exists(candidate)) return candidate;
            dir = Directory.GetParent(dir)?.FullName;
        }

        return null;
    }

    public string GetPsalterJson()
    {
        lock (_lock)
        {
            if (_cachedRawJson != null)
                return _cachedRawJson;

            string[] candidateRelativePaths =
            [
                Path.Combine("wwwroot", "data", "psalter.json"),
                Path.Combine("Data", "psalter.json")
            ];

            foreach (var relPath in candidateRelativePaths)
            {
                string? resolved = ResolveDataFilePath(relPath);
                if (resolved != null)
                {
                    try
                    {
                        HudLogger.Log($"Loading Psalter from: {resolved}");
                        _cachedRawJson = File.ReadAllText(resolved);
                        _cachedDoc = JsonDocument.Parse(_cachedRawJson);
                        return _cachedRawJson;
                    }
                    catch (Exception ex)
                    {
                        HudLogger.LogError($"Error reading psalter file from {resolved}", ex);
                    }
                }
            }

            HudLogger.Log("Psalter JSON not found in standard paths, returning empty template.", "WARN");
            return "{\"title\":\"Псалтир\",\"katizmas\":[]}";
        }
    }

    public JsonElement GetAllData()
    {
        lock (_lock)
        {
            if (_cachedDoc == null)
            {
                GetPsalterJson();
            }
            return _cachedDoc?.RootElement ?? default;
        }
    }

    public string GetInstructionsJson()
    {
        lock (_lock)
        {
            if (_cachedInstRawJson != null)
                return _cachedInstRawJson;

            string[] candidateRelativePaths =
            [
                Path.Combine("wwwroot", "data", "psalm_instructions.json"),
                Path.Combine("Data", "psalm_instructions.json")
            ];

            foreach (var relPath in candidateRelativePaths)
            {
                string? resolved = ResolveDataFilePath(relPath);
                if (resolved != null)
                {
                    try
                    {
                        HudLogger.Log($"Loading Psalm Instructions from: {resolved}");
                        _cachedInstRawJson = File.ReadAllText(resolved);
                        _cachedInstDoc = JsonDocument.Parse(_cachedInstRawJson);
                        return _cachedInstRawJson;
                    }
                    catch (Exception ex)
                    {
                        HudLogger.LogError($"Error reading psalm instructions from {resolved}", ex);
                    }
                }
            }

            HudLogger.Log("Psalm instructions JSON not found in standard paths.", "WARN");
            return "{}";
        }
    }

    public JsonElement GetInstructionsData()
    {
        lock (_lock)
        {
            if (_cachedInstDoc == null)
            {
                GetInstructionsJson();
            }
            return _cachedInstDoc?.RootElement ?? default;
        }
    }

    private JsonDocument? _cachedKatizmaPrayersDoc;
    private string? _cachedKatizmaPrayersRawJson;
    private JsonDocument? _cachedPrefaceDoc;
    private string? _cachedPrefaceRawJson;

    public string GetKatizmaPrayersJson()
    {
        lock (_lock)
        {
            if (_cachedKatizmaPrayersRawJson != null)
                return _cachedKatizmaPrayersRawJson;

            string[] candidateRelativePaths =
            [
                Path.Combine("wwwroot", "data", "katizma_prayers.json"),
                Path.Combine("Data", "katizma_prayers.json")
            ];

            foreach (var relPath in candidateRelativePaths)
            {
                string? resolved = ResolveDataFilePath(relPath);
                if (resolved != null)
                {
                    try
                    {
                        HudLogger.Log($"Loading Katizma Prayers from: {resolved}");
                        _cachedKatizmaPrayersRawJson = File.ReadAllText(resolved);
                        _cachedKatizmaPrayersDoc = JsonDocument.Parse(_cachedKatizmaPrayersRawJson);
                        return _cachedKatizmaPrayersRawJson;
                    }
                    catch (Exception ex)
                    {
                        HudLogger.LogError($"Error reading katizma prayers from {resolved}", ex);
                    }
                }
            }

            HudLogger.Log("Katizma prayers JSON not found in standard paths.", "WARN");
            return "{}";
        }
    }

    public JsonElement GetKatizmaPrayersData()
    {
        lock (_lock)
        {
            if (_cachedKatizmaPrayersDoc == null)
            {
                GetKatizmaPrayersJson();
            }
            return _cachedKatizmaPrayersDoc?.RootElement ?? default;
        }
    }

    public string GetPrefacePrayersJson()
    {
        lock (_lock)
        {
            if (_cachedPrefaceRawJson != null)
                return _cachedPrefaceRawJson;

            string[] candidateRelativePaths =
            [
                Path.Combine("wwwroot", "data", "psalter_preface.json"),
                Path.Combine("Data", "psalter_preface.json")
            ];

            foreach (var relPath in candidateRelativePaths)
            {
                string? resolved = ResolveDataFilePath(relPath);
                if (resolved != null)
                {
                    try
                    {
                        HudLogger.Log($"Loading Preface Prayers from: {resolved}");
                        _cachedPrefaceRawJson = File.ReadAllText(resolved);
                        _cachedPrefaceDoc = JsonDocument.Parse(_cachedPrefaceRawJson);
                        return _cachedPrefaceRawJson;
                    }
                    catch (Exception ex)
                    {
                        HudLogger.LogError($"Error reading preface prayers from {resolved}", ex);
                    }
                }
            }

            HudLogger.Log("Preface prayers JSON not found in standard paths.", "WARN");
            return "{}";
        }
    }

    public JsonElement GetPrefacePrayersData()
    {
        lock (_lock)
        {
            if (_cachedPrefaceDoc == null)
            {
                GetPrefacePrayersJson();
            }
            return _cachedPrefaceDoc?.RootElement ?? default;
        }
    }

    private JsonDocument? _cachedCsOldDoc;
    private string? _cachedCsOldRawJson;
    private JsonDocument? _cachedCsCyrillicDoc;
    private string? _cachedCsCyrillicRawJson;

    public string GetPsalmsCsOldJson()
    {
        lock (_lock)
        {
            if (_cachedCsOldRawJson != null)
                return _cachedCsOldRawJson;

            string[] candidateRelativePaths =
            [
                Path.Combine("wwwroot", "data", "psalms_cs_old.json"),
                Path.Combine("Data", "psalms_cs_old.json")
            ];

            foreach (var relPath in candidateRelativePaths)
            {
                string? resolved = ResolveDataFilePath(relPath);
                if (resolved != null)
                {
                    try
                    {
                        HudLogger.Log($"Loading Old Church Slavonic Psalms from: {resolved}");
                        _cachedCsOldRawJson = File.ReadAllText(resolved);
                        _cachedCsOldDoc = JsonDocument.Parse(_cachedCsOldRawJson);
                        return _cachedCsOldRawJson;
                    }
                    catch (Exception ex)
                    {
                        HudLogger.LogError($"Error reading Old CS psalms from {resolved}", ex);
                    }
                }
            }

            HudLogger.Log("Old CS psalms JSON not found in standard paths.", "WARN");
            return "{}";
        }
    }

    public JsonElement GetPsalmsCsOldData()
    {
        lock (_lock)
        {
            if (_cachedCsOldDoc == null)
            {
                GetPsalmsCsOldJson();
            }
            return _cachedCsOldDoc?.RootElement ?? default;
        }
    }

    public string GetPsalmsCsCyrillicJson()
    {
        lock (_lock)
        {
            if (_cachedCsCyrillicRawJson != null)
                return _cachedCsCyrillicRawJson;

            string[] candidateRelativePaths =
            [
                Path.Combine("wwwroot", "data", "psalms_cs_cyrillic.json"),
                Path.Combine("Data", "psalms_cs_cyrillic.json")
            ];

            foreach (var relPath in candidateRelativePaths)
            {
                string? resolved = ResolveDataFilePath(relPath);
                if (resolved != null)
                {
                    try
                    {
                        HudLogger.Log($"Loading Cyrillic Church Slavonic Psalms from: {resolved}");
                        _cachedCsCyrillicRawJson = File.ReadAllText(resolved);
                        _cachedCsCyrillicDoc = JsonDocument.Parse(_cachedCsCyrillicRawJson);
                        return _cachedCsCyrillicRawJson;
                    }
                    catch (Exception ex)
                    {
                        HudLogger.LogError($"Error reading Cyrillic CS psalms from {resolved}", ex);
                    }
                }
            }

            HudLogger.Log("Cyrillic CS psalms JSON not found in standard paths.", "WARN");
            return "{}";
        }
    }

    public JsonElement GetPsalmsCsCyrillicData()
    {
        lock (_lock)
        {
            if (_cachedCsCyrillicDoc == null)
            {
                GetPsalmsCsCyrillicJson();
            }
            return _cachedCsCyrillicDoc?.RootElement ?? default;
        }
    }

}
