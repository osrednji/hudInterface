# hudInterface

A transparent, minimalist, high-performance desktop Heads-Up Display (HUD) built in **C# (.NET 10 / WPF + WebView2)** featuring a modular decoupled architecture, global hotkey activation, full-text file search with highlighted excerpts, real-time system telemetry, and auto-saving notes.

---

## 🌟 Key Features

### 1. Global Activation
- **Toggle HUD (`Ctrl + Ctrl`)**: Double-tap either Ctrl key from anywhere in Windows to summon or dismiss the HUD.
- **Auto-Save on Hide**: When dismissing via `Ctrl + Ctrl` or `Esc`, all pending note changes and settings are persisted instantly to disk.

### 2. Dual Elegant Visual Themes
Switchable at any time via **Right-Click Context Menu** or header pill:
- 🌸 **Japanese Style**:
  - Translucent sumi-e ink charcoal frosted glass (`backdrop-filter: blur(32px)`)
  - Delicate crimson lacquer (*Shu-iro*) and gold leaf (*Kin-cha*) accents
  - Serene Enso circular brush watermark and Japanese Kanji motifs (索, 統, 記)
  - Refined serif typography and tranquil spacing
- ⚡ **Cyberpunk Neon Style**:
  - Holographic obsidian glass with neon cyan (`#00f3ff`) and electric magenta (`#ff0055`) glows
  - Animated scanline overlay, crosshairs, and angular telemetry brackets
  - Monospace high-tech terminal layout (`SYS//SEARCH`, `TELEMETRY//02`, `MEM//03`)

### 3. Modular Tools & Viewports

#### 🔍 File Search (`[S]`)
- Opens initially when HUD is summoned.
- Background multi-threaded indexing across Desktop, Documents, Downloads, and code repositories.
- Full-text search with **line-numbered excerpts** showing matched terms highlighted with `<mark class="highlight">`.
- Click any result to open the file; `Ctrl + Click` to reveal in Windows Explorer.

#### 📊 System Telemetry & Stats (`[D]`)
- Real-time CPU usage gauge using low-overhead Windows kernel timers.
- Total, used, and available RAM metrics via Win32 `GlobalMemoryStatusEx`.
- Storage drive status (total, free, % used).
- Battery / AC power status and system uptime.
- Top active processes ranked by memory footprint.

#### 📝 Distraction-Free Notes (`[N]`)
- Multi-note scratchpad with instant local persistence (`%APPDATA%\hudInteface\notes.json`).
- Live character & word counters.
- Automatic debounced auto-saving while typing, plus explicit instant flush on `Ctrl + Ctrl` or hide.

---

## ⌨️ Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Ctrl` | Toggle HUD visibility & auto-save changes |
| `S` (or `Alt + S`) | Switch to File Search & focus search bar |
| `D` (or `Alt + D`) | Switch to System Stats / Telemetry |
| `N` (or `Alt + N`) | Switch to Notes Scratchpad |
| `Esc` | Auto-save and hide HUD |
| `Right Click` | Open custom HUD Context Menu (Themes, Tools, Re-Index, Exit) |
| `Enter` | Open selected file in search |
| `Ctrl + Enter` | Reveal selected file in Windows File Explorer |

---

## 🛠️ Project Structure

```
hudInteface/
├── Core/
│   ├── GlobalKeyboardHook.cs   # Win32 WH_KEYBOARD_LL hook detecting double Ctrl
│   ├── AppSettings.cs          # Theme and UI preferences persistence
│   └── MemoryNative.cs         # Win32 GlobalMemoryStatusEx P/Invoke
├── Modules/
│   ├── IHudModule.cs           # Decoupled interface for modular HUD tools
│   ├── ModuleDescriptor.cs     # Metadata transfer object
│   └── ModuleManager.cs        # Orchestration and auto-saving
├── Services/
│   ├── FileSearch/             # Background indexer & excerpt search engine
│   ├── SystemStats/            # Hardware telemetry & process stats
│   └── Notes/                  # Persistent notes store
├── wwwroot/
│   ├── index.html              # HUD Shell layout
│   ├── style.css               # Base glassmorphism & layout
│   ├── app.js                  # Frontend controller & C# bridge
│   └── themes/
│       ├── japanese.css        # Japanese style
│       └── cyberpunk.css       # Cyberpunk Neon style
├── MainWindow.xaml             # Transparent borderless WPF window
└── App.xaml                    # Application life-cycle & tray management
```

---

## 🚀 Running the Project

```powershell
cd "c:\Users\HP\source\repos\hudInteface"
dotnet run
```
>>>>>>> 6fcf849 (Initial commit: hudInteface - Modular Transparent HUD with File Search, System Stats, Notes, and Psalter)
