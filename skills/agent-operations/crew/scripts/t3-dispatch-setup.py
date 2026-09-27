#!/usr/bin/env python3
"""Inspect prerequisites and optionally install macOS recovery for T3 Crew."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys

LABEL = "dev.t3-crew.recovery"


def configuration():
    home = Path.home()
    crew = Path(os.environ.get("T3_DISPATCH_HOME", home / ".local/state/t3-crew")).resolve()
    base = Path(os.environ.get("T3_DISPATCH_BASE_DIR", home / ".t3")).resolve()
    script = Path(__file__).resolve().with_name("t3-dispatch.sh")
    path = home / "Library/LaunchAgents" / (LABEL + ".plist")
    config = {
        "Label": LABEL,
        "ProgramArguments": ["/bin/bash", str(script), "sweep"],
        "StartInterval": 60,
        "RunAtLoad": True,
        "EnvironmentVariables": {"HOME": str(home), "PATH": os.environ["PATH"],
                                 "T3_DISPATCH_HOME": str(crew), "T3_DISPATCH_BASE_DIR": str(base)},
        "StandardOutPath": str(crew / "sweep.log"),
        "StandardErrorPath": str(crew / "sweep.log"),
    }
    return crew, base, path, config


def main():
    os.umask(0o077)
    action, *args = sys.argv[1:]
    if action not in ("install", "doctor") or args not in ([], ["--dry-run"]):
        raise ValueError("usage: t3-dispatch.sh install [--dry-run] | doctor")
    crew, base, path, config = configuration()
    service = f"gui/{os.getuid()}/{LABEL}"
    if action == "install":
        if args == ["--dry-run"]:
            print(plistlib.dumps(config).decode(), end="")
            return 0
        if sys.platform != "darwin":
            raise ValueError("automatic recovery installation requires macOS; schedule sweep with your own scheduler")
        for binary in ("t3", "python3", "curl", "bun"):
            if not shutil.which(binary):
                raise ValueError(f"missing {binary}; install it before enabling recovery")
        crew.mkdir(parents=True, exist_ok=True)
        path.parent.mkdir(parents=True, exist_ok=True)
        previous = plistlib.loads(path.read_bytes()) if path.exists() else None
        loaded = subprocess.run(["launchctl", "print", service], capture_output=True).returncode == 0
        if loaded and previous == config:
            print(f"Already installed: {path}")
            return 0
        if loaded:
            subprocess.run(["launchctl", "bootout", service], check=True)
        path.write_bytes(plistlib.dumps(config))
        subprocess.run(["launchctl", "bootstrap", f"gui/{os.getuid()}", str(path)], check=True)
        print(f"Installed {path}; recovery runs every 60 seconds.")
        return 0

    failures = []
    for binary in ("bash", "t3", "python3", "curl", "bun", "sqlite3"):
        if not shutil.which(binary):
            failures.append(f"missing {binary}")
    python = shutil.which("python3")
    if python and subprocess.run([python, "-c", "import json, sqlite3"], capture_output=True).returncode:
        failures.append("python3 is installed but cannot run; fix PATH or complete its installation")
    runtime = base / "userdata/server-runtime.json"
    try:
        os.kill(json.loads(runtime.read_text())["pid"], 0)
    except (OSError, ValueError, KeyError):
        failures.append("T3 runtime is unavailable; start T3 and check T3_DISPATCH_BASE_DIR")
    print("STATE: " + ("BLOCKED" if failures else "READY"))
    for failure in failures:
        print(f"FAIL: {failure}")
    heartbeat = crew / "sweep-success"
    if heartbeat.exists():
        at = datetime.fromisoformat(heartbeat.read_text().strip().replace("Z", "+00:00"))
        age = int((datetime.now(timezone.utc) - at).total_seconds())
        print("RECOVERY: " + ("FRESH" if 0 <= age < 180 else "STALE"))
    else:
        print("RECOVERY: NOT_CONFIGURED")
    for current in sorted(crew.glob("*/current-round.json")):
        rid = json.loads(current.read_text())["round"]
        state = json.loads((current.parent / "rounds" / rid / "state.json").read_text())
        if state.get("settled_at"):
            continue
        print(f"PENDING: {current.parent.name} round={rid} report={state.get('recovery_report') or state['report']}")
    return bool(failures)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, subprocess.CalledProcessError):
        print("STATE: BLOCKED\nt3-dispatch: setup failed; check prerequisites and local recovery configuration", file=sys.stderr)
        sys.exit(1)
