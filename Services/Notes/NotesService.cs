using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace hudInteface.Services.Notes;

public class NoteItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = "Untitled Note";
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class NotesData
{
    public string ActiveNoteId { get; set; } = string.Empty;
    public List<NoteItem> Notes { get; set; } = new();
}

public class NotesService
{
    private static readonly string DataFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "hudInteface"
    );
    private static readonly string NotesFilePath = Path.Combine(DataFolder, "notes.json");

    private NotesData _data = new();
    private bool _hasUnsavedChanges = false;
    private readonly object _lock = new();

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    public NotesService()
    {
        Load();
    }

    private void Load()
    {
        lock (_lock)
        {
            try
            {
                if (File.Exists(NotesFilePath))
                {
                    var json = File.ReadAllText(NotesFilePath);
                    var loaded = JsonSerializer.Deserialize<NotesData>(json, SerializerOptions);
                    if (loaded != null && loaded.Notes.Count > 0)
                    {
                        _data = loaded;
                        return;
                    }
                }
            }
            catch { }

            var defaultNote = new NoteItem
            {
                Title = "Quick Thoughts & Ideas",
                Content = "# Welcome to hudInteface Notes\n\n- Press [S] for File Search\n- Press [D] for System Telemetry\n- Press [N] for Quick Notes\n- Right-click anywhere for context menu\n- Double-tap [Ctrl] to hide and auto-save instantly!\n",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _data = new NotesData
            {
                ActiveNoteId = defaultNote.Id,
                Notes = new List<NoteItem> { defaultNote }
            };
            _hasUnsavedChanges = true;
            Save();
        }
    }

    public NotesData GetAll()
    {
        lock (_lock)
        {
            return _data;
        }
    }

    public NoteItem? GetActiveNote()
    {
        lock (_lock)
        {
            return _data.Notes.FirstOrDefault(n => n.Id == _data.ActiveNoteId) ?? _data.Notes.FirstOrDefault();
        }
    }

    public NoteItem CreateNote(string? title = null, string? content = null)
    {
        lock (_lock)
        {
            var note = new NoteItem
            {
                Title = string.IsNullOrWhiteSpace(title) ? $"Note {DateTime.Now:MMM dd HH:mm}" : title,
                Content = content ?? string.Empty,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _data.Notes.Insert(0, note);
            _data.ActiveNoteId = note.Id;
            _hasUnsavedChanges = true;
            return note;
        }
    }

    public bool UpdateNote(string id, string? title, string? content)
    {
        lock (_lock)
        {
            var note = _data.Notes.FirstOrDefault(n => n.Id == id);
            if (note == null) return false;

            if (title != null) note.Title = title;
            if (content != null) note.Content = content;
            note.UpdatedAt = DateTime.UtcNow;

            _data.ActiveNoteId = id;
            _hasUnsavedChanges = true;
            return true;
        }
    }

    public bool DeleteNote(string id)
    {
        lock (_lock)
        {
            var removed = _data.Notes.RemoveAll(n => n.Id == id) > 0;
            if (removed)
            {
                if (_data.ActiveNoteId == id)
                {
                    _data.ActiveNoteId = _data.Notes.FirstOrDefault()?.Id ?? string.Empty;
                }
                _hasUnsavedChanges = true;
            }
            return removed;
        }
    }

    public void SetActiveNote(string id)
    {
        lock (_lock)
        {
            if (_data.Notes.Any(n => n.Id == id))
            {
                _data.ActiveNoteId = id;
                _hasUnsavedChanges = true;
            }
        }
    }

    public Task SaveAsync()
    {
        return Task.Run(() => Save());
    }

    public void Save()
    {
        lock (_lock)
        {
            try
            {
                if (!Directory.Exists(DataFolder))
                {
                    Directory.CreateDirectory(DataFolder);
                }

                var json = JsonSerializer.Serialize(_data, SerializerOptions);
                File.WriteAllText(NotesFilePath, json);
                _hasUnsavedChanges = false;
            }
            catch { }
        }
    }
}
