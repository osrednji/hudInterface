using System.Collections.Generic;

namespace hudInteface.Services.FileSearch;

public class SearchExcerpt
{
    public int LineNumber { get; set; }
    public string Snippet { get; set; } = string.Empty;
    public int MatchStart { get; set; }
    public int MatchLength { get; set; }
}

public class FileSearchResult
{
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string DirectoryPath { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public string FormattedSize { get; set; } = string.Empty;
    public string LastModified { get; set; } = string.Empty;
    public bool NameMatched { get; set; }
    public List<SearchExcerpt> Excerpts { get; set; } = new();
}

public class IndexStatusInfo
{
    public int TotalFilesIndexed { get; set; }
    public bool IsIndexing { get; set; }
    public string StatusMessage { get; set; } = string.Empty;
}
