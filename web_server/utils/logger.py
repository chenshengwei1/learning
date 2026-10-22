# web_server/utils/logger.py
import time
import inspect
import builtins
from async_logger import log_info

_original_print = builtins.print


def _print_with_timestamp(*args, **kwargs):
    """给所有 print 加上时间戳"""
    try:
        timestamp = time.strftime("%H:%M:%S")
        func_name = "unknown"
        try:
            frame = inspect.currentframe()
            if frame and frame.f_back:
                caller_frame = frame.f_back
                if caller_frame:
                    func_name = caller_frame.f_code.co_name
            del frame
        except:
            pass

        _original_print(f"[{timestamp}] [{func_name}]", *args, **kwargs)
        prefix = f"[{timestamp}] [{func_name}]"
        args_str = " ".join(map(str, args))
        kwargs_str = " ".join(f"{k}={v}" for k, v in kwargs.items())
        full_message = "{} {} {}".format(prefix, args_str, kwargs_str).strip()
        log_info(full_message)
    except Exception as e:
        try:
            _original_print(f"PRINT ERROR: {e}", *args)
        except:
            pass


def setup_logger():
    """替换全局 print"""
    builtins.print = _print_with_timestamp