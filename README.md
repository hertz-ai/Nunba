# Building the HevolveAi Agent Companion Application

This guide walks through the process of building the HevolveAi Agent Companion application from source code into a Windows executable and installer.
static
## Overview

The HevolveAi Agent Companion is a desktop application with a web-based interface and system tray functionality. It's built using:
- Flask for the backend server
- PyWebView for the desktop window
- cx_Freeze for packaging everything into an executable

## Prerequisites

Before starting, ensure you have:

- Python 3.8 or higher installed
- Windows operating system (the app is designed for Windows)
- Administrator privileges (for installing dependencies and building)
- Git (optional, for cloning the repository)

## Required Python Packages

Install the following Python packages:

```bash
pip install cx_Freeze flask pywebview pyautogui pillow flask-cors pystray setuptools wheel
```

## File Structure

Ensure you have all necessary files in your directory:
- `app.py` - Main application entry point
- `main.py` - Flask server implementation
- `setup.py` - Basic setup configuration
- `setup_freeze.py` - cx_Freeze configuration for building
- `cursor.png` (optional) - Cursor image for screenshots
- `Product_Hevolve_Logo.png` (optional) - Logo for application icon

## Step-by-Step Build Process

### 1. Prepare Your Environment

Open a command prompt with administrator privileges and navigate to the directory containing the application files.

```bash
cd path\to\hevolveai-agent-companion
```

### 2. Build the Executable

Run the cx_Freeze build script:

```bash
python setup_freeze.py build
```

This command:
- Creates a build directory (`build/HevolveAiAgentCompanion`)
- Compiles Python files and gathers dependencies
- Packages everything needed to run the application

The process may take a few minutes to complete.

### 3. Test the Built Executable

Before creating an installer, test the application:

```bash
build\HevolveAiAgentCompanion\HevolveAiAgentCompanion.exe
```

Verify that:
- The application window opens correctly
- The system tray icon appears
- Basic functionality works

### 4. Create an MSI Installer (Optional)

To create a Windows installer for distribution:

```bash
python setup_freeze.py bdist_msi
```
This creates an MSI installer in the `dist` directory.

The installer will:
- Create desktop and start menu shortcuts
- Add an autostart registry entry
- Install to Program Files by default

### 5. Create an Inno Installer (Preferred)

To Create a Windows Installed for distribution:

- Download and install the Inno Setup Compiler tool from [Website](https://jrsoftware.org/isinfo.php)
- Open the program and locate HevolveAI_installer.iss file and run it.
- This would create an output folder in the same directory within which you can find the installer.

We use this method such that the size of the installer gets greatly compressed.

## Understanding the Build Process

### What setup_freeze.py Does

The `setup_freeze.py` script handles several critical tasks:

1. **Icon Generation**
   - Converts `Product_Hevolve_Logo.png` to `app.ico` if needed
   - Uses Pillow to create a multi-resolution icon file

2. **Windows Manifest**
   - Creates a manifest file for admin privileges
   - Sets UAC execution level to "requireAdministrator"

3. **Dependency Management**
   - Automatically detects and packages Python dependencies
   - Includes necessary DLLs like zlib.dll
   - Packages embedded Python if available

4. **MSI Configuration**
   - Sets up installer properties and target directory
   - Configures desktop and start menu shortcuts
   - Adds an autostart registry entry

## Troubleshooting Common Issues

### Missing DLL Errors

If you encounter DLL errors during build:

```
error: Microsoft Visual C++ 14.0 or greater is required
```

Solution: Install Visual C++ Build Tools from Microsoft.

### ModuleNotFoundError

If packages are missing:

```
ModuleNotFoundError: No module named 'package_name'
```

Solution: Install the missing package:

```bash
pip install package_name
```

### Permission Issues

If you get permission errors:

```
PermissionError: [Errno 13] Permission denied
```

Solution: Run the command prompt as Administrator.

### Icon Conversion Fails

If icon creation fails:

```
Error converting logo to ico
```

Solution: Manually convert the PNG to ICO using an online converter.

## Additional Information

### Creating a Release Build

For a clean release build:

1. Remove previous build artifacts:
   ```bash
   rmdir /s /q build dist
   ```

2. Build with optimized settings:
   ```bash
   python setup_freeze.py build_exe --optimize=2
   ```

3. Create the installer:
   ```bash
   python setup_freeze.py bdist_msi
   ```

### Running the Application from Command Line

To start the application minimized to system tray:

```bash
HevolveAiAgentCompanion.exe --background
```

To specify custom window size:

```bash
HevolveAiAgentCompanion.exe --width 800 --height 600
```

### Log File Locations

Application logs are stored in:
```
%USERPROFILE%\Documents\HevolveAi Agent Companion\logs\
```

## Conclusion

Once built successfully, you'll have:
- A standalone executable in the `build/HevolveAiAgentCompanion` directory
- An MSI installer in the `dist` directory (if created)

The application will start automatically on Windows login (if installed via MSI) and can be accessed via the system tray icon.
