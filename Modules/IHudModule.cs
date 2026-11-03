using System.Text.Json;
using System.Threading.Tasks;

namespace hudInteface.Modules;

public interface IHudModule
{
    ModuleDescriptor Descriptor { get; }

    Task<object?> ExecuteActionAsync(string action, JsonElement parameters);
    Task SaveChangesAsync();
}
