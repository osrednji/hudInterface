using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using hudInteface.Core;

namespace hudInteface.Services.SystemStats;

public class DriveStat
{
    public string Name { get; set; } = string.Empty;
    public string VolumeLabel { get; set; } = string.Empty;
    public double TotalGb { get; set; }
    public double FreeGb { get; set; }
    public double UsedGb { get; set; }
    public int PercentUsed { get; set; }
}

public class ProcessStat
{
    public int Pid { get; set; }
    public string Name { get; set; } = string.Empty;
    public double MemoryMb { get; set; }
}

public class SystemSnapshot
{
    public double CpuPercent { get; set; }
    public double RamUsedGb { get; set; }
    public double RamTotalGb { get; set; }
    public int RamPercent { get; set; }
    public string UptimeFormatted { get; set; } = string.Empty;
    public string BatteryStatus { get; set; } = string.Empty;
    public int BatteryPercent { get; set; }
    public List<DriveStat> Drives { get; set; } = new();
    public List<ProcessStat> TopProcesses { get; set; } = new();
    public string MachineName { get; set; } = Environment.MachineName;
    public string OsVersion { get; set; } = Environment.OSVersion.ToString();
}

public class SystemStatsService
{
    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetSystemTimes(out long lpIdleTime, out long lpKernelTime, out long lpUserTime);

    private long _prevIdleTime;
    private long _prevKernelTime;
    private long _prevUserTime;
    private bool _hasPrevTimes = false;

    public SystemSnapshot GetSnapshot()
    {
        var snapshot = new SystemSnapshot();

        // 1. CPU Usage via GetSystemTimes
        snapshot.CpuPercent = GetCpuUsage();

        // 2. RAM Usage via GlobalMemoryStatusEx
        var memStatus = new MemoryNative.MEMORYSTATUSEX();
        if (MemoryNative.GlobalMemoryStatusEx(memStatus))
        {
            snapshot.RamTotalGb = Math.Round(memStatus.ullTotalPhys / (1024.0 * 1024.0 * 1024.0), 1);
            double availGb = memStatus.ullAvailPhys / (1024.0 * 1024.0 * 1024.0);
            snapshot.RamUsedGb = Math.Round(snapshot.RamTotalGb - availGb, 1);
            snapshot.RamPercent = (int)memStatus.dwMemoryLoad;
        }

        // 3. System Uptime
        var uptime = TimeSpan.FromMilliseconds(Environment.TickCount64);
        snapshot.UptimeFormatted = $"{uptime.Days}d {uptime.Hours}h {uptime.Minutes}m {uptime.Seconds}s";

        // 4. Battery Status
        try
        {
            var power = SystemInformation.PowerStatus;
            snapshot.BatteryPercent = (int)(power.BatteryLifePercent * 100);
            snapshot.BatteryStatus = power.PowerLineStatus == PowerLineStatus.Online ? "AC Power (Charging/Plugged)" : "Battery Mode";
        }
        catch
        {
            snapshot.BatteryStatus = "Desktop / AC";
            snapshot.BatteryPercent = 100;
        }

        // 5. Drives
        try
        {
            foreach (var drive in DriveInfo.GetDrives())
            {
                if (drive.IsReady && drive.DriveType == DriveType.Fixed)
                {
                    double totalGb = Math.Round(drive.TotalSize / (1024.0 * 1024.0 * 1024.0), 1);
                    double freeGb = Math.Round(drive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0), 1);
                    double usedGb = Math.Round(totalGb - freeGb, 1);
                    int percentUsed = totalGb > 0 ? (int)((usedGb / totalGb) * 100) : 0;

                    snapshot.Drives.Add(new DriveStat
                    {
                        Name = drive.Name,
                        VolumeLabel = string.IsNullOrWhiteSpace(drive.VolumeLabel) ? "Local Disk" : drive.VolumeLabel,
                        TotalGb = totalGb,
                        FreeGb = freeGb,
                        UsedGb = usedGb,
                        PercentUsed = percentUsed
                    });
                }
            }
        }
        catch { }

        // 6. Top Processes by memory
        try
        {
            snapshot.TopProcesses = Process.GetProcesses()
                .Select(p =>
                {
                    try
                    {
                        return new ProcessStat
                        {
                            Pid = p.Id,
                            Name = p.ProcessName,
                            MemoryMb = Math.Round(p.WorkingSet64 / (1024.0 * 1024.0), 1)
                        };
                    }
                    catch
                    {
                        return null;
                    }
                })
                .Where(p => p != null && p.MemoryMb > 10)
                .OrderByDescending(p => p!.MemoryMb)
                .Take(6)
                .ToList()!;
        }
        catch { }

        return snapshot;
    }

    private double GetCpuUsage()
    {
        if (!GetSystemTimes(out long idleTime, out long kernelTime, out long userTime))
            return 0;

        if (!_hasPrevTimes)
        {
            _prevIdleTime = idleTime;
            _prevKernelTime = kernelTime;
            _prevUserTime = userTime;
            _hasPrevTimes = true;
            return 5.0;
        }

        long usrDiff = userTime - _prevUserTime;
        long kerDiff = kernelTime - _prevKernelTime;
        long idlDiff = idleTime - _prevIdleTime;

        long sysTotal = usrDiff + kerDiff;

        _prevIdleTime = idleTime;
        _prevKernelTime = kernelTime;
        _prevUserTime = userTime;

        if (sysTotal <= 0) return 0;

        double cpu = (double)(sysTotal - idlDiff) * 100.0 / sysTotal;
        return Math.Round(Math.Clamp(cpu, 0.0, 100.0), 1);
    }
}
