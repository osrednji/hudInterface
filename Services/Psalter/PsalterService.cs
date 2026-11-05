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
}
