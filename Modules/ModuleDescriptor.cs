namespace hudInteface.Modules;

public class ModuleDescriptor
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public required string ShortcutKey { get; init; }
    public required string IconSvg { get; init; }
    public required string BadgeKanji { get; init; }
    public required string CyberCode { get; init; }
    public required string Description { get; init; }
}
