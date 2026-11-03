using System.Text.Json;
using System.Threading.Tasks;
using hudInteface.Modules;

namespace hudInteface.Services.SystemStats;

public class SystemStatsModule : IHudModule
{
    private readonly SystemStatsService _statsService;

    public ModuleDescriptor Descriptor { get; } = new()
    {
        Id = "stats",
        Title = "System Stats",
        ShortcutKey = "d",
        BadgeKanji = "統",
        CyberCode = "DIAG//02",
        Description = "Real-time hardware performance, memory metrics, storage & top processes",
        IconSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"3\" width=\"20\" height=\"14\" rx=\"2\" ry=\"2\"></rect><line x1=\"8\" y1=\"21\" x2=\"16\" y2=\"21\"></line><line x1=\"12\" y1=\"17\" x2=\"12\" y2=\"21\"></line></svg>"
    };

    public SystemStatsModule(SystemStatsService statsService)
    {
        _statsService = statsService;
    }

    public Task<object?> ExecuteActionAsync(string action, JsonElement parameters)
    {
        switch (action.ToLowerInvariant())
        {
            case "snapshot":
            case "get":
                return Task.FromResult<object?>(_statsService.GetSnapshot());

            default:
                return Task.FromResult<object?>(null);
        }
    }

    public Task SaveChangesAsync()
    {
        return Task.CompletedTask;
    }
}
