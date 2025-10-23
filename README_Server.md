# TFA-CRM Development Server

This project includes a simple Python server to run your TFA-CRM HTML files locally for development and testing.

## Quick Start

### Run the Server
```bash
python run_server.py
```

The server prints a clickable URL you can Ctrl+Click in most terminals/IDEs.

## Opening the App

- After starting, copy or Ctrl+Click the printed link (e.g. `http://localhost:8000/main.html`).
- To change port: `python run_server.py --port 8080`.

Note: Auto-opening the browser and file-watching have been removed for simplicity.

## What These Scripts Do

### 🚀 Features
- **Serves all HTML files** on `http://localhost:8000`
- **Prints a clickable URL** (no auto-open)
- **Finds available port** if 8000 is busy
- **Checks for missing files** and warns you

### 📄 Available Pages
- `http://localhost:8000/main.html` - Home/Login Page
- `http://localhost:8000/dashboard.html` - Dashboard
- `http://localhost:8000/contacts.html` - Contacts Management  
- `http://localhost:8000/database-schema.html` - Database Schema

## File Descriptions

### `run_server.py`
- Uses only Python standard library
- No external dependencies required
- Prints a clickable link to open in your browser

## Usage Tips

1. **Run from project directory**: Make sure you're in the TFA-CRM folder when running the script

2. **Port conflicts**: If port 8000 is busy, the script will automatically find another available port

3. **Stop server**: Press `Ctrl+C` to stop the server

5. **Missing files**: The server will warn you if any expected HTML files are missing but will still run with available files

## Development Workflow

1. Start the server: `python run_server.py`
2. Ctrl+Click the printed link to open the app
3. Make changes to your HTML/CSS/JS files
4. Refresh your browser to see changes

## Troubleshooting

### "Port already in use"
- Close other applications using port 8000
- Or the script will automatically find another port

### "File not found"
- Make sure you're running the script from the TFA-CRM project directory
- Check that your HTML files are in the same folder as the Python script

### Browser doesn't open automatically
- Manually navigate to `http://localhost:8000/main.html`
- Check your browser's popup settings
