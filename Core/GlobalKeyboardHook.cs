using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace hudInteface.Core;

public sealed class GlobalKeyboardHook : IDisposable
{
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_KEYUP = 0x0101;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_SYSKEYUP = 0x0105;

    private const int VK_CONTROL = 0x11;
    private const int VK_LCONTROL = 0xA2;
    private const int VK_RCONTROL = 0xA3;

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);
    private readonly LowLevelKeyboardProc _proc;
    private IntPtr _hookId = IntPtr.Zero;

    private DateTime _lastCtrlReleaseTime = DateTime.MinValue;
    private bool _ctrlIsDown = false;
    private bool _otherKeyPressedWhileCtrlDown = false;
    private readonly TimeSpan _doubleTapThreshold = TimeSpan.FromMilliseconds(420);

    public event Action? DoubleCtrlPressed;

    public GlobalKeyboardHook()
    {
        _proc = HookCallback;
        _hookId = SetHook(_proc);
    }

    private IntPtr SetHook(LowLevelKeyboardProc proc)
    {
        using var curProcess = Process.GetCurrentProcess();
        using var curModule = curProcess.MainModule;
        var moduleHandle = curModule != null ? GetModuleHandle(curModule.ModuleName) : IntPtr.Zero;
        return SetWindowsHookEx(WH_KEYBOARD_LL, proc, moduleHandle, 0);
    }

    private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            int msg = wParam.ToInt32();
            int vkCode = Marshal.ReadInt32(lParam);

            bool isCtrl = vkCode == VK_CONTROL || vkCode == VK_LCONTROL || vkCode == VK_RCONTROL;

            if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN)
            {
                if (isCtrl)
                {
                    _ctrlIsDown = true;
                }
                else if (_ctrlIsDown)
                {
                    _otherKeyPressedWhileCtrlDown = true;
                }
            }
            else if (msg == WM_KEYUP || msg == WM_SYSKEYUP)
            {
                if (isCtrl)
                {
                    if (!_otherKeyPressedWhileCtrlDown)
                    {
                        var now = DateTime.UtcNow;
                        if ((now - _lastCtrlReleaseTime) <= _doubleTapThreshold)
                        {
                            _lastCtrlReleaseTime = DateTime.MinValue;
                            DoubleCtrlPressed?.Invoke();
                        }
                        else
                        {
                            _lastCtrlReleaseTime = now;
                        }
                    }
                    _ctrlIsDown = false;
                    _otherKeyPressedWhileCtrlDown = false;
                }
            }
        }

        return CallNextHookEx(_hookId, nCode, wParam, lParam);
    }

    public void Dispose()
    {
        if (_hookId != IntPtr.Zero)
        {
            UnhookWindowsHookEx(_hookId);
            _hookId = IntPtr.Zero;
        }
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string? lpModuleName);
}
