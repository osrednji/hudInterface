// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewWindow};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_module")]
    pub last_active_module: String,
    #[serde(default = "default_one")]
    pub last_psalm_number: u32,
    #[serde(default = "default_one")]
    pub last_katizma_number: u32,
    #[serde(default = "default_layer")]
    pub last_psalter_level: String,
    #[serde(default)]
    pub last_psalm_scroll_pos: i32,
    #[serde(default = "default_width")]
    pub window_width: f64,
    #[serde(default = "default_height")]
    pub window_height: f64,
}

fn default_theme() -> String { "serbian-orthodox".into() }
fn default_module() -> String { "psalter".into() }
fn default_one() -> u32 { 1 }
fn default_layer() -> String { "single".into() }
fn default_width() -> f64 { 1060.0 }
fn default_height() -> f64 { 720.0 }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            last_active_module: default_module(),
            last_psalm_number: 1,
            last_katizma_number: 1,
            last_psalter_level: default_layer(),
            last_psalm_scroll_pos: 0,
            window_width: default_width(),
            window_height: default_height(),
        }
    }
}

fn get_app_dir() -> PathBuf {
    if let Some(app_data) = std::env::var_os("APPDATA") {
        let p = PathBuf::from(app_data).join("hudInteface");
        let _ = fs::create_dir_all(&p);
        p
    } else {
        let p = PathBuf::from(".").join("data");
        let _ = fs::create_dir_all(&p);
        p
    }
}

fn get_settings_path() -> PathBuf {
    get_app_dir().join("settings.json")
}

fn get_notes_path() -> PathBuf {
    get_app_dir().join("notes.json")
}

fn load_settings() -> AppSettings {
    let path = get_settings_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(s) = serde_json::from_str::<AppSettings>(&content) {
                return s;
            }
        }
    }
    AppSettings::default()
}

fn save_settings_to_disk(settings: &AppSettings) {
    let path = get_settings_path();
    if let Ok(json) = serde_json::to_string_pretty(settings) {
        let _ = fs::write(path, json);
    }
}

pub struct StateWrapper {
    pub settings: Mutex<AppSettings>,
}

#[tauri::command]
fn get_init_data(state: tauri::State<'_, Arc<StateWrapper>>) -> serde_json::Value {
    let s = state.settings.lock().unwrap().clone();
    serde_json::json!({
        "theme": s.theme,
        "lastActiveModule": s.last_active_module,
        "lastPsalmNumber": s.last_psalm_number,
        "lastKatizmaNumber": s.last_katizma_number,
        "lastPsalterLevel": s.last_psalter_level,
        "lastPsalmScrollPos": s.last_psalm_scroll_pos,
        "indexStatus": "ready",
        "modules": [
            { "id": "psalter", "title": "Псалтир", "hotkey": "P" },
            { "id": "notes", "title": "Белешке", "hotkey": "N" }
        ]
    })
}

#[tauri::command]
fn save_psalter_state(
    psalm_number: Option<u32>,
    katizma_number: Option<u32>,
    level: Option<String>,
    scroll_pos: Option<i32>,
    state: tauri::State<'_, Arc<StateWrapper>>,
) -> Result<(), String> {
    let mut s = state.settings.lock().unwrap();
    if let Some(pn) = psalm_number { s.last_psalm_number = pn; }
    if let Some(kn) = katizma_number { s.last_katizma_number = kn; }
    if let Some(lv) = level { s.last_psalter_level = lv; }
    if let Some(sp) = scroll_pos { s.last_psalm_scroll_pos = sp; }
    save_settings_to_disk(&s);
    Ok(())
}

#[tauri::command]
fn save_theme(theme: String, state: tauri::State<'_, Arc<StateWrapper>>) -> Result<(), String> {
    let mut s = state.settings.lock().unwrap();
    s.theme = theme;
    save_settings_to_disk(&s);
    Ok(())
}

#[tauri::command]
fn get_notes() -> serde_json::Value {
    let path = get_notes_path();
    if path.exists() {
        if let Ok(c) = fs::read_to_string(&path) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&c) {
                return val;
            }
        }
    }
    serde_json::json!([])
}

#[tauri::command]
fn save_note(note: serde_json::Value) -> Result<serde_json::Value, String> {
    let mut notes: Vec<serde_json::Value> = match get_notes() {
        serde_json::Value::Array(a) => a,
        _ => Vec::new(),
    };

    let note_id = note.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
    let mut updated = false;

    if let Some(ref id) = note_id {
        for n in &mut notes {
            if n.get("id").and_then(|v| v.as_str()) == Some(id) {
                *n = note.clone();
                updated = true;
                break;
            }
        }
    }

    if !updated {
        notes.push(note.clone());
    }

    let path = get_notes_path();
    if let Ok(json) = serde_json::to_string_pretty(&notes) {
        let _ = fs::write(path, json);
    }

    Ok(note)
}

#[tauri::command]
fn delete_note(id: String) -> Result<(), String> {
    let notes: Vec<serde_json::Value> = match get_notes() {
        serde_json::Value::Array(a) => a,
        _ => Vec::new(),
    };

    let filtered: Vec<_> = notes
        .into_iter()
        .filter(|n| n.get("id").and_then(|v| v.as_str()) != Some(&id))
        .collect();

    let path = get_notes_path();
    if let Ok(json) = serde_json::to_string_pretty(&filtered) {
        let _ = fs::write(path, json);
    }
    Ok(())
}

#[tauri::command]
fn drag_window(window: WebviewWindow) {
    let _ = window.start_dragging();
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

#[tauri::command]
fn exit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn log_to_host(message: String, level: Option<String>) {
    let lvl = level.unwrap_or_else(|| "INFO".into());
    println!("[{}] {}", lvl, message);
}

// Global Low-Level Keyboard Hook for Ctrl+Ctrl double tap
static LAST_CTRL_TIME: Mutex<Option<Instant>> = Mutex::new(None);
static GLOBAL_APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

#[cfg(windows)]
unsafe extern "system" fn low_level_keyboard_proc(
    n_code: i32,
    w_param: usize,
    l_param: isize,
) -> isize {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{VK_CONTROL, VK_LCONTROL, VK_RCONTROL};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, KBDLLHOOKSTRUCT, WM_KEYDOWN, WM_SYSKEYDOWN,
    };

    if n_code >= 0 && (w_param == WM_KEYDOWN as usize || w_param == WM_SYSKEYDOWN as usize) {
        let kbd = *(l_param as *const KBDLLHOOKSTRUCT);
        let vk = kbd.vkCode as u16;

        if vk == VK_CONTROL || vk == VK_LCONTROL || vk == VK_RCONTROL {
            let now = Instant::now();
            let mut last_guard = LAST_CTRL_TIME.lock().unwrap();
            if let Some(last) = *last_guard {
                let elapsed = now.duration_since(last);
                // Human double-tap between 80ms and 500ms (avoids holding key autorepeats)
                if elapsed >= Duration::from_millis(80) && elapsed <= Duration::from_millis(500) {
                    *last_guard = None;
                    drop(last_guard);

                    if let Some(app) = GLOBAL_APP_HANDLE.get() {
                        let win = app.get_webview_window("main")
                            .or_else(|| app.webview_windows().values().next().cloned());
                        if let Some(window) = win {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    return CallNextHookEx(std::ptr::null_mut(), n_code, w_param, l_param);
                }
            }
            *last_guard = Some(now);
        } else {
            if let Ok(mut last_guard) = LAST_CTRL_TIME.lock() {
                *last_guard = None;
            }
        }
    }

    CallNextHookEx(std::ptr::null_mut(), n_code, w_param, l_param)
}

fn setup_global_keyboard_hook(app_handle: AppHandle) {
    let _ = GLOBAL_APP_HANDLE.set(app_handle);

    std::thread::spawn(|| unsafe {
        use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage, MSG,
            WH_KEYBOARD_LL,
        };

        let h_mod = GetModuleHandleW(std::ptr::null());
        let hook = SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(low_level_keyboard_proc),
            h_mod,
            0,
        );

        if hook.is_null() {
            eprintln!("Failed to install global keyboard hook");
            return;
        }

        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    });
}

fn main() {
    let initial_settings = load_settings();
    let state_wrapper = Arc::new(StateWrapper {
        settings: Mutex::new(initial_settings),
    });

    tauri::Builder::default()
        .manage(state_wrapper)
        .setup(|app| {
            setup_global_keyboard_hook(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_init_data,
            save_psalter_state,
            save_theme,
            get_notes,
            save_note,
            delete_note,
            drag_window,
            hide_window,
            exit_app,
            log_to_host
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
