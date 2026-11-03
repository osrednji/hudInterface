using System.Text.Json;
using System.Threading.Tasks;
using hudInteface.Modules;

namespace hudInteface.Services.Notes;

public class NotesModule : IHudModule
{
    private readonly NotesService _notesService;

    public ModuleDescriptor Descriptor { get; } = new()
    {
        Id = "notes",
        Title = "Quick Notes",
        ShortcutKey = "n",
        BadgeKanji = "記",
        CyberCode = "MEM//03",
        Description = "Distraction-free scratchpad with auto-save & instant persistence",
        IconSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"></path><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"></path></svg>"
    };

    public NotesModule(NotesService notesService)
    {
        _notesService = notesService;
    }

    public async Task<object?> ExecuteActionAsync(string action, JsonElement parameters)
    {
        switch (action.ToLowerInvariant())
        {
            case "get_all":
                return _notesService.GetAll();

            case "create":
                string? newTitle = parameters.TryGetProperty("title", out var t) ? t.GetString() : null;
                string? newContent = parameters.TryGetProperty("content", out var c) ? c.GetString() : null;
                var created = _notesService.CreateNote(newTitle, newContent);
                await _notesService.SaveAsync();
                return created;

            case "update":
                string id = parameters.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
                string? title = parameters.TryGetProperty("title", out var upTitle) ? upTitle.GetString() : null;
                string? content = parameters.TryGetProperty("content", out var upContent) ? upContent.GetString() : null;
                bool ok = _notesService.UpdateNote(id, title, content);
                if (parameters.TryGetProperty("immediateSave", out var imm) && imm.GetBoolean())
                {
                    await _notesService.SaveAsync();
                }
                return ok;

            case "set_active":
                if (parameters.TryGetProperty("id", out var actId) && actId.GetString() is string targetId)
                {
                    _notesService.SetActiveNote(targetId);
                }
                return true;

            case "delete":
                if (parameters.TryGetProperty("id", out var delId) && delId.GetString() is string delTargetId)
                {
                    bool removed = _notesService.DeleteNote(delTargetId);
                    await _notesService.SaveAsync();
                    return removed;
                }
                return false;

            case "save":
                await _notesService.SaveAsync();
                return true;

            default:
                return null;
        }
    }

    public async Task SaveChangesAsync()
    {
        await _notesService.SaveAsync();
    }
}
