#!/usr/bin/env python3
"""
TFA-CRM Local Development Server
Automatically serves all HTML files and opens the main page in your browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import time
from pathlib import Path
import threading
import argparse
import subprocess
import shutil

# Configuration
PORT = 8000
HOST = "localhost"
MAIN_PAGE = "main.html"

class TFARequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler with better logging and CORS support"""
    
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Custom logging format
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {format % args}")

    # Avoid noisy tracebacks when the browser cancels a request mid-stream
    def copyfile(self, source, outputfile):
        try:
            shutil.copyfileobj(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            # Client closed connection; safe to ignore
            pass

def find_available_port(start_port=8000, max_attempts=10):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socketserver.TCPServer((HOST, port), TFARequestHandler) as server:
                return port
        except OSError:
            continue
    raise RuntimeError(f"Could not find an available port in range {start_port}-{start_port + max_attempts}")

def _register_windows_browser_candidates(browser_name: str):
    """Best-effort registration of specific Windows browsers so webbrowser can find them."""
    if sys.platform != "win32":
        return
    candidates = []
    prog_files = [os.environ.get("PROGRAMFILES"), os.environ.get("PROGRAMFILES(X86)"), os.environ.get("LOCALAPPDATA")]
    prog_files = [p for p in prog_files if p]

    if browser_name == "edge":
        for base in prog_files:
            candidates += [
                os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
            ]
    elif browser_name == "chrome":
        for base in prog_files:
            candidates += [
                os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"),
            ]
    elif browser_name == "brave":
        for base in prog_files:
            candidates += [
                os.path.join(base, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
            ]

    for exe in candidates:
        if exe and os.path.exists(exe):
            try:
                webbrowser.register(browser_name, None, webbrowser.BackgroundBrowser(exe))
            except Exception:
                pass

def _windows_specific_launch(url: str, browser: str) -> bool:
    """Extra Windows fallbacks if webbrowser lookup fails. Returns True if launched."""
    if sys.platform != "win32":
        return False
    try:
        if browser == "edge":
            # Use Edge protocol, very reliable on Windows
            os.startfile("microsoft-edge:" + url)  # type: ignore[attr-defined]
            return True
        elif browser in ("chrome", "brave"):
            # Try direct exec of known paths
            exe_paths = []
            bases = [os.environ.get("PROGRAMFILES"), os.environ.get("PROGRAMFILES(X86)"), os.environ.get("LOCALAPPDATA")]
            bases = [b for b in bases if b]
            if browser == "chrome":
                for base in bases:
                    exe_paths.append(os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"))
            else:  # brave
                for base in bases:
                    exe_paths.append(os.path.join(base, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"))
            for exe in exe_paths:
                if exe and os.path.exists(exe):
                    subprocess.Popen([exe, url])
                    return True
    except Exception:
        pass
    return False

def print_clickable(url: str):
    # Print a clear, clickable link for terminals/IDEs that support Ctrl+Click
    print()
    print("Open this link in your browser:")
    print(url)
    print()

def check_files():
    """Check if all expected HTML files exist"""
    expected_files = [
        "main.html",
        "dashboard.html", 
        "contacts.html",
        "database-schema.html"
    ]
    
    missing_files = []
    for file in expected_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("⚠️  Warning: The following files are missing:")
        for file in missing_files:
            print(f"   - {file}")
        print()
    
    return len(missing_files) == 0

def print_server_info(port):
    """Print server information"""
    print("=" * 60)
    print("🚀 TFA-CRM Development Server")
    print("=" * 60)
    print(f"📡 Server running at: http://{HOST}:{port}")
    print(f"🏠 Main page: http://{HOST}:{port}/{MAIN_PAGE}")
    print()
    print("📄 Available pages:")
    pages = [
        ("main.html", "Home/Login Page"),
        ("dashboard.html", "Dashboard"),
        ("contacts.html", "Contacts Management"),
        ("database-schema.html", "Database Schema")
    ]
    
    for filename, description in pages:
        if os.path.exists(filename):
            print(f"   ✅ {filename:<20} - {description}")
        else:
            print(f"   ❌ {filename:<20} - {description} (missing)")
    
    print()
    print("🛑 Press Ctrl+C to stop the server")
    print("=" * 60)

def main():
    """Main function to start the server"""
    try:
        parser = argparse.ArgumentParser(description="Run TFA-CRM dev server")
        parser.add_argument("--port", type=int, default=PORT, help="Preferred port (will search if busy)")
        args = parser.parse_args()

        # Check if we're in the right directory
        if not os.path.exists(MAIN_PAGE):
            print(f"❌ Error: {MAIN_PAGE} not found in current directory.")
            print("Please run this script from the TFA-CRM project directory.")
            sys.exit(1)
        
        # Check for missing files
        all_files_present = check_files()
        
        # Find available port
        port = find_available_port(args.port)
        
        # Change to the script's directory to serve files from there
        script_dir = Path(__file__).parent.absolute()
        os.chdir(script_dir)
        
        # Create server
        with socketserver.TCPServer((HOST, port), TFARequestHandler) as httpd:
            print_server_info(port)
            
            # Show clickable URL instead of auto-opening
            main_url = f"http://{HOST}:{port}/{MAIN_PAGE}"
            print_clickable(main_url)
            
            if not all_files_present:
                print("⚠️  Some files are missing, but server is running with available files.")
                print()
            
            # Start server
            print("🔄 Server starting...")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Error: Port {PORT} is already in use.")
            print("Try closing other applications or use a different port.")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
