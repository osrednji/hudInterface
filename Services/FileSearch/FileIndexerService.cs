using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace hudInteface.Services.FileSearch;

public class IndexedDocument
{
    public required string FilePath { get; init; }
    public required string FileName { get; init; }
    public required string Extension { get; init; }
    public required long FileSizeBytes { get; init; }
    public required DateTime LastModifiedUtc { get; init; }
    public string? Content { get; set; }
}

public class FileIndexerService
{
    private static readonly HashSet<string> TextExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".txt", ".md", ".cs", ".json", ".js", ".ts", ".jsx", ".tsx",
        ".html", ".css", ".scss", ".xml", ".yaml", ".yml", ".py", ".sql",
        ".log", ".env", ".ini", ".csv", ".sh", ".bat", ".ps1", ".cpp",
        ".c", ".h", ".hpp", ".java", ".rs", ".go", ".config", ".gitignore",
        ".editorconfig", ".csproj", ".sln"
    };

    private static readonly HashSet<string> SkipDirectories = new(StringComparer.OrdinalIgnoreCase)
    {
        "node_modules", ".git", ".vs", "bin", "obj", ".idea",
        "packages", "$Recycle.Bin", "AppData", "Local\\Temp"
    };

    private readonly ConcurrentDictionary<string, IndexedDocument> _index = new(StringComparer.OrdinalIgnoreCase);
    private bool _isIndexing = false;
    private CancellationTokenSource? _indexingCts;

    public event Action<IndexStatusInfo>? IndexStatusChanged;

    public IndexStatusInfo CurrentStatus => new()
    {
        TotalFilesIndexed = _index.Count,
        IsIndexing = _isIndexing,
        StatusMessage = _isIndexing ? $"Indexing in background ({_index.Count} files)..." : $"Ready ({_index.Count} files indexed)"
    };

    public void StartBackgroundIndexing()
    {
        _indexingCts?.Cancel();
        _indexingCts = new CancellationTokenSource();
        var token = _indexingCts.Token;

        Task.Run(() => IndexWorker(token), token);
    }

    private void IndexWorker(CancellationToken token)
    {
        _isIndexing = true;
        NotifyStatus($"Scanning directories...");

        var rootFolders = GetTargetDirectories();

        foreach (var dir in rootFolders)
        {
            if (token.IsCancellationRequested) break;
            if (!Directory.Exists(dir)) continue;

            try
            {
                ScanAndIndexDirectory(dir, token);
            }
            catch { }
        }

        _isIndexing = false;
        NotifyStatus($"Ready ({_index.Count:N0} files indexed)");
    }

    private List<string> GetTargetDirectories()
    {
        var dirs = new List<string>();

        void TryAdd(string? path)
        {
            if (!string.IsNullOrWhiteSpace(path) && Directory.Exists(path) && !dirs.Contains(path, StringComparer.OrdinalIgnoreCase))
            {
                dirs.Add(path);
            }
        }

        TryAdd(Environment.GetFolderPath(Environment.SpecialFolder.Desktop));
        TryAdd(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments));
        
        var userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        if (!string.IsNullOrEmpty(userProfile))
        {
            TryAdd(Path.Combine(userProfile, "Downloads"));
            TryAdd(Path.Combine(userProfile, "source", "repos"));
            TryAdd(Path.Combine(userProfile, "Repository"));
        }

        TryAdd(@"c:\Users\HP\Repository");

        return dirs;
    }

    private void ScanAndIndexDirectory(string rootDir, CancellationToken token)
    {
        var queue = new Queue<string>();
        queue.Enqueue(rootDir);

        int scanned = 0;

        while (queue.Count > 0 && !token.IsCancellationRequested)
        {
            var currentDir = queue.Dequeue();

            try
            {
                var dirInfo = new DirectoryInfo(currentDir);
                if (dirInfo.Attributes.HasFlag(FileAttributes.Hidden) || dirInfo.Attributes.HasFlag(FileAttributes.System))
                    continue;

                if (SkipDirectories.Contains(dirInfo.Name))
                    continue;

                foreach (var file in dirInfo.EnumerateFiles())
                {
                    if (token.IsCancellationRequested) return;
                    if (file.Attributes.HasFlag(FileAttributes.Hidden) || file.Attributes.HasFlag(FileAttributes.System))
                        continue;

                    IndexFile(file);
                    scanned++;

                    if (scanned % 150 == 0)
                    {
                        NotifyStatus($"Indexing ({_index.Count:N0} files)...");
                    }
                }

                foreach (var sub in dirInfo.EnumerateDirectories())
                {
                    if (token.IsCancellationRequested) return;
                    if (!SkipDirectories.Contains(sub.Name) && !sub.Attributes.HasFlag(FileAttributes.Hidden))
                    {
                        queue.Enqueue(sub.FullName);
                    }
                }
            }
            catch { }
        }
    }

    private void IndexFile(FileInfo file)
    {
        try
        {
            var ext = file.Extension;
            string? content = null;

            if (TextExtensions.Contains(ext) && file.Length < 3 * 1024 * 1024)
            {
                try
                {
                    using var stream = new FileStream(file.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    using var reader = new StreamReader(stream);
                    content = reader.ReadToEnd();
                }
                catch { }
            }

            var doc = new IndexedDocument
            {
                FilePath = file.FullName,
                FileName = file.Name,
                Extension = ext.ToLowerInvariant(),
                FileSizeBytes = file.Length,
                LastModifiedUtc = file.LastWriteTimeUtc,
                Content = content
            };

            _index[file.FullName] = doc;
        }
        catch { }
    }

    public List<FileSearchResult> Search(string query, int maxResults = 35)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new List<FileSearchResult>();

        var trimmed = query.Trim();
        var results = new List<FileSearchResult>();

        foreach (var doc in _index.Values)
        {
            bool nameMatch = doc.FileName.Contains(trimmed, StringComparison.OrdinalIgnoreCase);
            var excerpts = new List<SearchExcerpt>();

            if (doc.Content != null)
            {
                excerpts = ExtractExcerpts(doc.Content, trimmed, maxExcerpts: 3);
            }

            if (nameMatch || excerpts.Count > 0)
            {
                var dir = Path.GetDirectoryName(doc.FilePath) ?? string.Empty;
                results.Add(new FileSearchResult
                {
                    FileName = doc.FileName,
                    FilePath = doc.FilePath,
                    DirectoryPath = dir,
                    Extension = doc.Extension,
                    FormattedSize = FormatBytes(doc.FileSizeBytes),
                    LastModified = doc.LastModifiedUtc.ToLocalTime().ToString("yyyy-MM-dd HH:mm"),
                    NameMatched = nameMatch,
                    Excerpts = excerpts
                });

                if (results.Count >= maxResults * 2) break;
            }
        }

        return results
            .OrderByDescending(r => r.NameMatched ? 1 : 0)
            .ThenByDescending(r => r.Excerpts.Count)
            .Take(maxResults)
            .ToList();
    }

    private List<SearchExcerpt> ExtractExcerpts(string content, string query, int maxExcerpts = 3)
    {
        var excerpts = new List<SearchExcerpt>();
        int searchIndex = 0;
        int lineNum = 1;
        int currentLineStart = 0;

        while (searchIndex < content.Length && excerpts.Count < maxExcerpts)
        {
            int foundIndex = content.IndexOf(query, searchIndex, StringComparison.OrdinalIgnoreCase);
            if (foundIndex == -1) break;

            for (int i = searchIndex; i < foundIndex; i++)
            {
                if (content[i] == '\n')
                {
                    lineNum++;
                    currentLineStart = i + 1;
                }
            }

            int lineEnd = content.IndexOf('\n', foundIndex);
            if (lineEnd == -1) lineEnd = content.Length;

            int lineLen = lineEnd - currentLineStart;
            string fullLine = content.Substring(currentLineStart, lineLen).TrimEnd('\r');

            int matchPosInLine = foundIndex - currentLineStart;

            int windowBefore = 50;
            int windowAfter = 70;

            int snippetStart = Math.Max(0, matchPosInLine - windowBefore);
            int snippetEnd = Math.Min(fullLine.Length, matchPosInLine + query.Length + windowAfter);

            string rawSnippet = fullLine.Substring(snippetStart, snippetEnd - snippetStart);

            string prefix = snippetStart > 0 ? "..." : "";
            string suffix = snippetEnd < fullLine.Length ? "..." : "";

            string finalSnippet = prefix + rawSnippet + suffix;
            int finalMatchStart = prefix.Length + (matchPosInLine - snippetStart);

            excerpts.Add(new SearchExcerpt
            {
                LineNumber = lineNum,
                Snippet = finalSnippet,
                MatchStart = Math.Max(0, finalMatchStart),
                MatchLength = query.Length
            });

            searchIndex = foundIndex + query.Length;
        }

        return excerpts;
    }

    private static string FormatBytes(long bytes)
    {
        string[] sizes = { "B", "KB", "MB", "GB" };
        double len = bytes;
        int order = 0;
        while (len >= 1024 && order < sizes.Length - 1)
        {
            order++;
            len /= 1024;
        }
        return $"{len:0.#} {sizes[order]}";
    }

    private void NotifyStatus(string message)
    {
        IndexStatusChanged?.Invoke(new IndexStatusInfo
        {
            TotalFilesIndexed = _index.Count,
            IsIndexing = _isIndexing,
            StatusMessage = message
        });
    }

    public static void OpenFile(string path)
    {
        if (File.Exists(path))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = path,
                UseShellExecute = true
            });
        }
    }

    public static void RevealInExplorer(string path)
    {
        if (File.Exists(path) || Directory.Exists(path))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "explorer.exe",
                Arguments = $"/select,\"{path}\"",
                UseShellExecute = true
            });
        }
    }
}
