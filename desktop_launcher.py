# desktop_launcher.py
# DATAVISION BI - Desktop Launcher
# Runs the Flask app locally and opens in browser

import os
import sys
import threading
import webbrowser
import time


def get_app_data_dir():
    """
    Get a writable directory for app data.
    - When running as .exe: use folder next to .exe
    - When running as script: use script folder
    """
    if getattr(sys, "frozen", False):
        # Running as compiled .exe — use .exe's folder
        app_dir = os.path.dirname(sys.executable)
    else:
        # Running as script
        app_dir = os.path.dirname(os.path.abspath(__file__))

    # Create a "data" folder next to the .exe for all writable data
    data_dir = os.path.join(app_dir, "datavision_data")
    os.makedirs(data_dir, exist_ok=True)

    return app_dir, data_dir


def get_resource_path(relative_path):
    """
    Get absolute path to resource (works for both script and .exe).
    When running as .exe, resources are in sys._MEIPASS temp folder.
    """
    if getattr(sys, "frozen", False):
        # Running as .exe — resources in temp folder
        base_path = sys._MEIPASS
    else:
        # Running as script
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, relative_path)


# ==========================================================
# SETUP PATHS
# ==========================================================
APP_DIR, DATA_DIR = get_app_data_dir()

# Create writable folders inside data dir
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
CLEANED_DIR = os.path.join(DATA_DIR, "cleaned")
INSTANCE_DIR = os.path.join(DATA_DIR, "instance")
LOGS_DIR = os.path.join(DATA_DIR, "logs")
SESSIONS_DIR = os.path.join(DATA_DIR, "flask_session")

for d in [UPLOAD_DIR, CLEANED_DIR, INSTANCE_DIR, LOGS_DIR, SESSIONS_DIR]:
    os.makedirs(d, exist_ok=True)

# Database file path
DB_PATH = os.path.join(INSTANCE_DIR, "datavision.db")

# ==========================================================
# SET ENVIRONMENT VARIABLES
# ==========================================================
os.environ["UPLOAD_FOLDER"] = UPLOAD_DIR
os.environ["CLEANED_FOLDER"] = CLEANED_DIR
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
os.environ["DEBUG"] = "False"
os.environ["ENVIRONMENT"] = "production"
os.environ["SESSION_FILE_DIR"] = SESSIONS_DIR
os.environ["SECRET_KEY"] = "datavision-desktop-app-secret-key-2026"
os.environ["FORCE_HTTPS"] = "False"

# Add resource paths so Flask can find templates/static
sys.path.insert(0, APP_DIR)

print("=" * 60)
print("  DATAVISION BI - Business Intelligence")
print("=" * 60)
print()
print(f"  Data folder: {DATA_DIR}")
print(f"  Database:    {DB_PATH}")
print()

# ==========================================================
# NOW IMPORT AND CREATE APP
# ==========================================================
try:
    from waitress import serve
    from app import create_app

    print("  Starting server...")
    app = create_app()
except Exception as e:
    print(f"\n  ERROR starting app: {e}")
    import traceback
    traceback.print_exc()
    input("\n  Press Enter to exit...")
    sys.exit(1)


# ==========================================================
# OPEN BROWSER
# ==========================================================
def open_browser():
    time.sleep(2.5)
    try:
        webbrowser.open("http://127.0.0.1:5000")
    except Exception:
        pass


# ==========================================================
# MAIN
# ==========================================================
if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()

    print()
    print("  ✅ DATAVISION BI is running!")
    print("  🌐 Open browser: http://127.0.0.1:5000")
    print()
    print("  ⚠️  Press Ctrl+C to stop.")
    print("=" * 60)
    print()

    try:
        serve(app, host="127.0.0.1", port=5000, threads=4)
    except KeyboardInterrupt:
        print("\n\n  Shutting down DATAVISION BI...")
        print("  Goodbye! 👋")
    except Exception as e:
        print(f"\n\n  Server error: {e}")
        import traceback
        traceback.print_exc()
        input("\n  Press Enter to exit...")