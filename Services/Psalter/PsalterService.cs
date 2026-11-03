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
    private readonly object _lock = new();

    public string GetPsalterJson()
    {
        lock (_lock)
        {
            if (_cachedRawJson != null)
                return _cachedRawJson;

            // Search possible paths for psalter.json
            string[] possiblePaths =
            [
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "data", "psalter.json"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "psalter.json"),
                Path.Combine(Environment.CurrentDirectory, "wwwroot", "data", "psalter.json"),
                Path.Combine(Environment.CurrentDirectory, "Data", "psalter.json"),
                @"C:\Users\HP\source\repos\hudInteface\wwwroot\data\psalter.json",
                @"C:\Users\HP\source\repos\hudInteface\Data\psalter.json"
            ];

            foreach (var path in possiblePaths)
            {
                if (File.Exists(path))
                {
                    try
                    {
                        HudLogger.Log($"Loading Psalter from: {path}");
                        _cachedRawJson = File.ReadAllText(path);
                        _cachedDoc = JsonDocument.Parse(_cachedRawJson);
                        return _cachedRawJson;
                    }
                    catch (Exception ex)
                    {
                        HudLogger.LogError($"Error reading psalter file from {path}", ex);
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
}
