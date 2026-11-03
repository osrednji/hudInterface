using System.Text.Json;
using System.Threading.Tasks;
using hudInteface.Modules;

namespace hudInteface.Services.Psalter;

public class PsalterModule : IHudModule
{
    private readonly PsalterService _psalterService;

    public PsalterModule(PsalterService psalterService)
    {
        _psalterService = psalterService;
    }

    public ModuleDescriptor Descriptor => new()
    {
        Id = "psalter",
        Title = "Свети Псалтир",
        ShortcutKey = "P",
        IconSvg = "<svg viewBox='0 0 24 24'><path d='M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z'/></svg>",
        BadgeKanji = "詩",
        CyberCode = "0xPSALM",
        Description = "Свети Псалтир цара и пророка Давида са катизмама и псалмима"
    };

    public Task<object?> ExecuteActionAsync(string action, JsonElement parameters)
    {
        switch (action.ToLowerInvariant())
        {
            case "get_all":
            case "data":
                return Task.FromResult<object?>(_psalterService.GetAllData());

            case "raw_json":
                return Task.FromResult<object?>(_psalterService.GetPsalterJson());

            default:
                return Task.FromResult<object?>(null);
        }
    }

    public Task SaveChangesAsync()
    {
        return Task.CompletedTask;
    }
}
