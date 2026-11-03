using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using hudInteface.Core;

namespace hudInteface.Modules;

public class ModuleManager
{
    private readonly Dictionary<string, IHudModule> _modules = new(StringComparer.OrdinalIgnoreCase);
    private readonly AppSettings _settings;

    public AppSettings Settings => _settings;

    public ModuleManager(AppSettings settings)
    {
        _settings = settings;
    }

    public void RegisterModule(IHudModule module)
    {
        _modules[module.Descriptor.Id] = module;
    }

    public IHudModule? GetModule(string id)
    {
        return _modules.TryGetValue(id, out var mod) ? mod : null;
    }

    public List<ModuleDescriptor> GetAllDescriptors()
    {
        return _modules.Values.Select(m => m.Descriptor).ToList();
    }

    public async Task<object?> ExecuteActionAsync(string moduleId, string action, JsonElement parameters)
    {
        if (_modules.TryGetValue(moduleId, out var mod))
        {
            return await mod.ExecuteActionAsync(action, parameters);
        }
        return null;
    }

    public async Task SaveAllModulesAsync()
    {
        _settings.Save();
        foreach (var mod in _modules.Values)
        {
            try
            {
                await mod.SaveChangesAsync();
            }
            catch { }
        }
    }
}
