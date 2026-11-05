using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;
using hudInteface.Core;
using hudInteface.Modules;
using hudInteface.Services.FileSearch;
using hudInteface.Services.Notes;
using hudInteface.Services.Psalter;
using hudInteface.Services.SystemStats;
using WinForms = System.Windows.Forms;

namespace hudInteface;

public partial class MainWindow : Window
{
    private readonly GlobalKeyboardHook _keyboardHook;
    private readonly AppSettings _settings;
    private readonly ModuleManager _moduleManager;
    private readonly FileIndexerService _indexerService;
    private readonly SystemStatsService _statsService;
    private readonly NotesService _notesService;
    private readonly PsalterService _psalterService;

    private WinForms.NotifyIcon? _notifyIcon;
    private bool _isHudVisible = false;
    private bool _isWebViewReady = false;

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern IntPtr SetActiveWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    private static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int Msg, IntPtr wParam, IntPtr lParam);

    private const int SW_SHOW = 5;
    private const int WM_NCLBUTTONDOWN = 0xA1;
    private const int HTLEFT = 10;
    private const int HTRIGHT = 11;
    private const int HTTOP = 12;
    private const int HTTOPLEFT = 13;
    private const int HTTOPRIGHT = 14;
    private const int HTBOTTOM = 15;
    private const int HTBOTTOMLEFT = 16;
    private const int HTBOTTOMRIGHT = 17;

    public void ForceForeground()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        IntPtr foregroundWnd = GetForegroundWindow();
        if (foregroundWnd == hwnd) return;

        uint foregroundThreadId = GetWindowThreadProcessId(foregroundWnd, out _);
        uint currentThreadId = GetCurrentThreadId();

        if (foregroundThreadId != currentThreadId && foregroundThreadId != 0)
        {
            AttachThreadInput(currentThreadId, foregroundThreadId, true);
            BringWindowToTop(hwnd);
            ShowWindow(hwnd, SW_SHOW);
            SetForegroundWindow(hwnd);
            SetActiveWindow(hwnd);
            AttachThreadInput(currentThreadId, foregroundThreadId, false);
        }
        else
        {
            BringWindowToTop(hwnd);
            ShowWindow(hwnd, SW_SHOW);
            SetForegroundWindow(hwnd);
            SetActiveWindow(hwnd);
        }
    }

    public MainWindow()
    {
        InitializeComponent();

        HudLogger.Log("hudInteface MainWindow starting up.");

        // Disable WPF's default Tab navigation so Tab reaches WebView2
        KeyboardNavigation.SetTabNavigation(this, KeyboardNavigationMode.None);
        KeyboardNavigation.SetControlTabNavigation(this, KeyboardNavigationMode.None);
        KeyboardNavigation.SetDirectionalNavigation(this, KeyboardNavigationMode.None);

        _settings = AppSettings.Load();
        if (_settings.WindowWidth >= 800) Width = _settings.WindowWidth;
        if (_settings.WindowHeight >= 500) Height = _settings.WindowHeight;

        SizeChanged += (s, e) =>
        {
            if (_settings != null && WindowState == WindowState.Normal)
            {
                _settings.WindowWidth = Width;
                _settings.WindowHeight = Height;
                _settings.Save();
            }
        };

        _moduleManager = new ModuleManager(_settings);

        _indexerService = new FileIndexerService();
        _statsService = new SystemStatsService();
        _notesService = new NotesService();
        _psalterService = new PsalterService();

        // Register Modules
        _moduleManager.RegisterModule(new FileSearchModule(_indexerService));
        _moduleManager.RegisterModule(new SystemStatsModule(_statsService));
        _moduleManager.RegisterModule(new NotesModule(_notesService));
        _moduleManager.RegisterModule(new PsalterModule(_psalterService));

        // Forward index status
        _indexerService.IndexStatusChanged += status =>
        {
            Dispatcher.InvokeAsync(() =>
            {
                PostMessageToWeb("index_status", status);
            });
        };

        // Initialize Global Keyboard Hook
        _keyboardHook = new GlobalKeyboardHook();
        _keyboardHook.DoubleCtrlPressed += OnDoubleCtrlPressed;

        InitializeTrayIcon();

        Loaded += MainWindow_Loaded;
        Closing += MainWindow_Closing;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        HudLogger.Log("MainWindow_Loaded event fired.");
        await InitializeWebViewAsync();

        _indexerService.StartBackgroundIndexing();
        ShowHud();
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            HudLogger.Log("Initializing WebView2 environment...");
            webView.DefaultBackgroundColor = Color.Transparent;

            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "hudInteface",
                "WebViewProfile"
            );

            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

            webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

            var htmlPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "index.html");
            HudLogger.Log($"Navigating WebView2 to: {htmlPath}");

            if (File.Exists(htmlPath))
            {
                webView.CoreWebView2.Navigate(new Uri(htmlPath).AbsoluteUri);
            }
            else
            {
                HudLogger.Log($"HTML file not found at: {htmlPath}", "ERROR");
                webView.NavigateToString("<html><body style='color:white;font-family:sans-serif;'><h1>hudInteface UI not found</h1></body></html>");
            }

            _isWebViewReady = true;
            HudLogger.Log("WebView2 initialized successfully.");
        }
        catch (Exception ex)
        {
            HudLogger.LogError("Error initializing WebView2", ex);
            System.Windows.MessageBox.Show($"Error initializing WebView2: {ex.Message}", "hudInteface Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private async void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;

            string type = root.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "";
            string requestId = root.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";

            switch (type)
            {
                case "log":
                    string logMsg = root.TryGetProperty("message", out var lm) ? lm.GetString() ?? "" : "";
                    string logLvl = root.TryGetProperty("level", out var ll) ? ll.GetString() ?? "INFO" : "INFO";
                    HudLogger.Log($"[JS] {logMsg}", logLvl);
                    break;

                case "get_init_data":
                    var initData = new
                    {
                        theme = _settings.Theme,
                        lastActiveModule = _settings.LastActiveModule,
                        modules = _moduleManager.GetAllDescriptors(),
                        indexStatus = _indexerService.CurrentStatus,
                        lastPsalmNumber = _settings.LastPsalmNumber,
                        lastKatizmaNumber = _settings.LastKatizmaNumber,
                        lastPsalterLevel = _settings.LastPsalterLevel,
                        lastPsalmScrollPos = _settings.LastPsalmScrollPos
                    };
                    SendResponse(requestId, initData);
                    break;

                case "save_psalter_state":
                    if (root.TryGetProperty("psalmNumber", out var pn)) _settings.LastPsalmNumber = pn.GetInt32();
                    if (root.TryGetProperty("katizmaNumber", out var kn)) _settings.LastKatizmaNumber = kn.GetInt32();
                    if (root.TryGetProperty("level", out var lv)) _settings.LastPsalterLevel = lv.GetString() ?? "katizma";
                    if (root.TryGetProperty("scrollPos", out var sp)) _settings.LastPsalmScrollPos = sp.GetInt32();
                    _settings.Save();
                    SendResponse(requestId, new { success = true });
                    break;

                case "module_action":
                    string moduleId = root.GetProperty("moduleId").GetString() ?? "";
                    string action = root.GetProperty("action").GetString() ?? "";
                    JsonElement parameters = root.TryGetProperty("params", out var p) ? p : default;

                    var result = await _moduleManager.ExecuteActionAsync(moduleId, action, parameters);
                    SendResponse(requestId, result);
                    break;

                case "set_theme":
                    string theme = root.GetProperty("theme").GetString() ?? "japanese";
                    _settings.Theme = theme;
                    _settings.Save();
                    SendResponse(requestId, new { success = true, theme });
                    break;

                case "save_state":
                    await _moduleManager.SaveAllModulesAsync();
                    SendResponse(requestId, new { success = true });
                    break;

                case "hide_hud":
                    await _moduleManager.SaveAllModulesAsync();
                    HideHud();
                    break;

                case "drag_window":
                    DragMove();
                    break;

                case "resize_window":
                    var dir = root.TryGetProperty("direction", out var dp) ? dp.GetString() : "bottom-right";
                    int ht = dir switch
                    {
                        "left" => HTLEFT,
                        "right" => HTRIGHT,
                        "top" => HTTOP,
                        "top-left" => HTTOPLEFT,
                        "top-right" => HTTOPRIGHT,
                        "bottom" => HTBOTTOM,
                        "bottom-left" => HTBOTTOMLEFT,
                        "bottom-right" => HTBOTTOMRIGHT,
                        _ => HTBOTTOMRIGHT
                    };
                    var winHwnd = new WindowInteropHelper(this).Handle;
                    ReleaseCapture();
                    SendMessage(winHwnd, WM_NCLBUTTONDOWN, (IntPtr)ht, IntPtr.Zero);
                    break;

                case "ensure_window_width":
                    if (root.TryGetProperty("minWidth", out var mwProp))
                    {
                        double minW = mwProp.GetDouble();
                        if (Width < minW)
                        {
                            Width = minW;
                            if (_settings != null)
                            {
                                _settings.WindowWidth = (int)Width;
                                _settings.Save();
                            }
                        }
                    }
                    SendResponse(requestId, new { width = Width });
                    break;

                case "exit_app":
                    await _moduleManager.SaveAllModulesAsync();
                    ExitApplication();
                    break;
            }
        }
        catch (Exception ex)
        {
            HudLogger.LogError("WebMessageReceived handling error", ex);
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    private void SendResponse(string requestId, object? data)
    {
        if (string.IsNullOrEmpty(requestId) || !_isWebViewReady) return;

        var message = JsonSerializer.Serialize(new
        {
            type = "response",
            id = requestId,
            data
        }, JsonOptions);

        webView.CoreWebView2.PostWebMessageAsJson(message);
    }

    private void PostMessageToWeb(string eventType, object? payload)
    {
        if (!_isWebViewReady || webView.CoreWebView2 == null) return;

        var message = JsonSerializer.Serialize(new
        {
            type = "event",
            @event = eventType,
            data = payload
        }, JsonOptions);

        webView.CoreWebView2.PostWebMessageAsJson(message);
    }

    private void OnDoubleCtrlPressed()
    {
        HudLogger.Log("Global Double-Ctrl detected.");
        Dispatcher.InvokeAsync(async () =>
        {
            var hwnd = new WindowInteropHelper(this).Handle;
            IntPtr foregroundWnd = GetForegroundWindow();

            // If HUD is already visible AND has focus, double-Ctrl hides it.
            // If another application is focused, double-Ctrl immediately activates and focuses the HUD!
            if (_isHudVisible && foregroundWnd == hwnd)
            {
                await _moduleManager.SaveAllModulesAsync();
                HideHud();
            }
            else
            {
                ShowHud();
            }
        });
    }

    public void ShowHud(string? targetModule = null)
    {
        HudLogger.Log($"ShowHud() called. TargetModule: {targetModule ?? "default"}");
        _isHudVisible = true;
        Show();
        WindowState = WindowState.Normal;

        ForceForeground();
        Activate();
        Focus();

        // Give input focus to WebView2
        webView.Focus();
        Keyboard.Focus(webView);

        PostMessageToWeb("hud_visibility", new
        {
            visible = true,
            targetModule
        });

        if (_isWebViewReady && webView.CoreWebView2 != null)
        {
            _ = webView.ExecuteScriptAsync("if (window.focusHudSearch) { window.focusHudSearch(); }");
        }
    }

    public void HideHud()
    {
        HudLogger.Log("HideHud() called.");
        _isHudVisible = false;
        PostMessageToWeb("hud_visibility", new { visible = false });
        Hide();
    }

    private void InitializeTrayIcon()
    {
        _notifyIcon = new WinForms.NotifyIcon
        {
            Text = "hudInteface [Ctrl+Ctrl]",
            Visible = true,
            Icon = SystemIcons.Shield
        };

        var contextMenu = new WinForms.ContextMenuStrip();

        contextMenu.Items.Add("Toggle HUD (Ctrl + Ctrl)", null, (s, e) =>
        {
            if (_isHudVisible) HideHud(); else ShowHud();
        });

        contextMenu.Items.Add(new WinForms.ToolStripSeparator());

        contextMenu.Items.Add("🔍 File Search (S)", null, (s, e) => ShowHud("search"));
        contextMenu.Items.Add("📊 System Stats (D)", null, (s, e) => ShowHud("stats"));
        contextMenu.Items.Add("📝 Quick Notes (N)", null, (s, e) => ShowHud("notes"));
        contextMenu.Items.Add("📖 Свети Псалтир (P)", null, (s, e) => ShowHud("psalter"));

        contextMenu.Items.Add(new WinForms.ToolStripSeparator());

        var themeMenu = new WinForms.ToolStripMenuItem("Themes");
        themeMenu.DropDownItems.Add("☦ Српски (Тамни)", null, (s, e) =>
        {
            _settings.Theme = "serbian-orthodox";
            _settings.Save();
            PostMessageToWeb("theme_changed", "serbian-orthodox");
        });
        themeMenu.DropDownItems.Add("📜 Српски (Пергамент)", null, (s, e) =>
        {
            _settings.Theme = "serbian-parchment";
            _settings.Save();
            PostMessageToWeb("theme_changed", "serbian-parchment");
        });
        themeMenu.DropDownItems.Add("🇷🇸 Застава (Тробојка)", null, (s, e) =>
        {
            _settings.Theme = "zastava";
            _settings.Save();
            PostMessageToWeb("theme_changed", "zastava");
        });
        themeMenu.DropDownItems.Add("☦ Русский", null, (s, e) =>
        {
            _settings.Theme = "russian-orthodox";
            _settings.Save();
            PostMessageToWeb("theme_changed", "russian-orthodox");
        });
        themeMenu.DropDownItems.Add("☧ Βυζαντινό", null, (s, e) =>
        {
            _settings.Theme = "byzantine-orthodox";
            _settings.Save();
            PostMessageToWeb("theme_changed", "byzantine-orthodox");
        });
        themeMenu.DropDownItems.Add("🌸 Japanese Minimalist", null, (s, e) =>
        {
            _settings.Theme = "japanese";
            _settings.Save();
            PostMessageToWeb("theme_changed", "japanese");
        });
        themeMenu.DropDownItems.Add("⚡ Cyberpunk Neon", null, (s, e) =>
        {
            _settings.Theme = "cyberpunk";
            _settings.Save();
            PostMessageToWeb("theme_changed", "cyberpunk");
        });
        contextMenu.Items.Add(themeMenu);

        contextMenu.Items.Add(new WinForms.ToolStripSeparator());

        contextMenu.Items.Add("Exit", null, (s, e) => ExitApplication());

        _notifyIcon.ContextMenuStrip = contextMenu;
        _notifyIcon.DoubleClick += (s, e) =>
        {
            if (_isHudVisible) HideHud(); else ShowHud();
        };
    }

    private async void ExitApplication()
    {
        HudLogger.Log("ExitApplication() called.");
        await _moduleManager.SaveAllModulesAsync();
        _notifyIcon?.Dispose();
        _keyboardHook.Dispose();
        System.Windows.Application.Current.Shutdown();
    }

    private async void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        e.Cancel = true;
        await _moduleManager.SaveAllModulesAsync();
        HideHud();
    }
}
