using System.Text.Json;
using System.Threading.Tasks;
using hudInteface.Modules;

namespace hudInteface.Services.FileSearch;

public class FileSearchModule : IHudModule
{
    private readonly FileIndexerService _indexer;

    public ModuleDescriptor Descriptor { get; } = new()
    {
        Id = "search",
        Title = "File Search",
        ShortcutKey = "s",
        BadgeKanji = "索",
        CyberCode = "SRCH//01",
        Description = "Instant full-text index across files & documents with excerpt previews",
        IconSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"8\"></circle><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"></line></svg>"
    };

    public FileSearchModule(FileIndexerService indexer)
    {
        _indexer = indexer;
    }

    public Task<object?> ExecuteActionAsync(string action, JsonElement parameters)
    {
        switch (action.ToLowerInvariant())
        {
            case "search":
                string query = parameters.TryGetProperty("query", out var q) ? q.GetString() ?? "" : "";
                var results = _indexer.Search(query);
                return Task.FromResult<object?>(results);

            case "status":
                return Task.FromResult<object?>(_indexer.CurrentStatus);

            case "reindex":
                _indexer.StartBackgroundIndexing();
                return Task.FromResult<object?>(_indexer.CurrentStatus);

            case "open":
                if (parameters.TryGetProperty("path", out var p) && p.GetString() is string filePath)
                {
                    FileIndexerService.OpenFile(filePath);
                }
                return Task.FromResult<object?>(true);

            case "reveal":
                if (parameters.TryGetProperty("path", out var r) && r.GetString() is string revPath)
                {
                    FileIndexerService.RevealInExplorer(revPath);
                }
                return Task.FromResult<object?>(true);

            default:
                return Task.FromResult<object?>(null);
        }
    }

    public Task SaveChangesAsync()
    {
        return Task.CompletedTask;
    }
}
