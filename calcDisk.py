import ctypes
import os
from ctypes import wintypes

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

class BY_HANDLE_FILE_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("dwFileAttributes", wintypes.DWORD),
        ("ftCreationTime", wintypes.FILETIME),
        ("ftLastAccessTime", wintypes.FILETIME),
        ("ftLastWriteTime", wintypes.FILETIME),
        ("dwVolumeSerialNumber", wintypes.DWORD),
        ("nFileSizeHigh", wintypes.DWORD),
        ("nFileSizeLow", wintypes.DWORD),
        ("nNumberOfLinks", wintypes.DWORD),
        ("nFileIndexHigh", wintypes.DWORD),
        ("nFileIndexLow", wintypes.DWORD),
    ]

CreateFileW = kernel32.CreateFileW
CreateFileW.argtypes = [
    wintypes.LPCWSTR,
    wintypes.DWORD,
    wintypes.DWORD,
    wintypes.LPVOID,
    wintypes.DWORD,
    wintypes.DWORD,
    wintypes.HANDLE,
]
CreateFileW.restype = wintypes.HANDLE

GetFileInformationByHandle = kernel32.GetFileInformationByHandle
GetFileInformationByHandle.argtypes = [wintypes.HANDLE, ctypes.POINTER(BY_HANDLE_FILE_INFORMATION)]
GetFileInformationByHandle.restype = wintypes.BOOL

CloseHandle = kernel32.CloseHandle
CloseHandle.argtypes = [wintypes.HANDLE]
CloseHandle.restype = wintypes.BOOL

GENERIC_READ = 0x80000000
FILE_SHARE_READ = 0x00000001
OPEN_EXISTING = 3
FILE_FLAG_BACKUP_SEMANTICS = 0x02000000


def get_file_unique_info(filepath: str):
    hfile = CreateFileW(
        filepath,
        GENERIC_READ,
        FILE_SHARE_READ,
        None,
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS,
        None
    )
    if hfile == wintypes.HANDLE(-1).value:
        return None
    info = BY_HANDLE_FILE_INFORMATION()
    ok = GetFileInformationByHandle(hfile, ctypes.byref(info))
    CloseHandle(hfile)
    if not ok:
        return None
    file_index = (info.nFileIndexHigh << 32) | info.nFileIndexLow
    file_size = (info.nFileSizeHigh << 32) | info.nFileSizeLow
    volume_serial = info.dwVolumeSerialNumber
    return {"file_index": file_index, "size": file_size, "volume": volume_serial}


def bytes_to_gb(b: int) -> str:
    return f"{b / (1024**3):.2f} GB"


def calc_folder_size(root_path: str):
    total_logic = 0
    visited_file_indices = set()
    total_disk = 0
    file_count = 0
    dir_count = 0

    for current_dir, subdirs, files in os.walk(root_path):
        dir_count += 1
        for fn in files:
            fp = os.path.join(current_dir, fn)
            try:
                info = get_file_unique_info(fp)
                if info is None:
                    continue
                file_count += 1
                sz = info["size"]
                total_logic += sz
                key = (info["volume"], info["file_index"])
                if key not in visited_file_indices:
                    visited_file_indices.add(key)
                    total_disk += sz
            except Exception:
                continue

    print("=" * 70)
    print(f"扫描目录: {root_path}")
    print(f"目录数量: {dir_count}")
    print(f"文件数量: {file_count}")
    print("-" * 70)
    print(f"【逻辑总大小(Windows属性-大小)】: {bytes_to_gb(total_logic)}")
    print(f"【磁盘实际占用(去重硬链接)】: {bytes_to_gb(total_disk)}")
    print(f"硬链接重复虚高部分: {bytes_to_gb(total_logic - total_disk)}")
    print("=" * 70)


if __name__ == "__main__":
    TARGET_FOLDER = r"D:\doc"  # 修改为你的目录
    calc_folder_size(TARGET_FOLDER)
