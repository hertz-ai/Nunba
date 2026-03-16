# Llama.cpp Automatic Installation for Nunba

This implementation provides automatic download and installation of Llama.cpp and AI models from HuggingFace during the first run of the Nunba app.

## Overview

The system consists of three main components:

1. **llama_installer.py** - Core installer that handles:
   - Automatic detection and installation of Llama.cpp
   - Downloading prebuilt binaries from GitHub releases
   - Fallback to building from source if prebuilt not available
   - Model downloading from HuggingFace with progress tracking
   - GPU detection (CUDA on Windows/Linux, Metal on macOS)

2. **llama_config.py** - Configuration and server management:
   - Configuration persistence
   - Llama.cpp server lifecycle management
   - Chat completion API interface
   - First-run detection and initialization

3. **Integration in app.py** - First-run initialization:
   - Automatic detection of first run
   - Background installation during app startup
   - Non-blocking initialization (app starts immediately)

## Features

### Automatic Installation

On first run, the system will:
1. Detect if this is the first run
2. Check for Llama.cpp installation
3. Download prebuilt binaries from GitHub (faster)
4. Fall back to building from source if needed
5. Download the default AI model from HuggingFace

### GPU Acceleration

The installer automatically detects and configures GPU acceleration:
- **CUDA** on Windows/Linux (if NVIDIA GPU detected)
- **Metal** on macOS (automatically enabled)
- **CPU fallback** if no GPU available

### Model Presets

Pre-configured models are available in `llama_installer.py`:

| Model | Size | Features | Description |
|-------|------|----------|-------------|
| Qwen3-VL-2B Instruct (Recommended) | 1.5GB | Vision + Text | Best for code analysis with diagrams |
| Qwen3-VL-2B Thinking | 1.5GB | Vision + Text | Chain-of-thought reasoning |
| Gemma-3-1B IT | 600MB | Text-only | Compact & fast, quick analysis |
| Qwen3-2B Text-Only | 1.1GB | Text-only | Fastest, no vision support |

## File Structure

```
omnitool-gui/
├── llama_installer.py       # Core installer module
├── llama_config.py          # Configuration and server management
├── app.py                   # Main app (with first-run integration)
├── setup_freeze_nunba.py    # Build config (includes installer modules)
└── LLAMA_SETUP_README.md    # This file
```

## Installation Directories

- **Llama.cpp**: `~/.nunba/llama.cpp/`
- **Models**: `~/.nunba/models/`
- **Config**: `~/.nunba/llama_config.json`
- **Server Status**: `~/.nunba/server_status.json`

## Configuration

The configuration is stored in `~/.nunba/llama_config.json`:

```json
{
  "first_run": true,
  "auto_start_server": true,
  "selected_model_index": 0,
  "server_port": 8080,
  "use_gpu": true,
  "context_size": 4096
}
```

### Configuration Options

- `first_run`: Set to `false` after first initialization
- `auto_start_server`: Automatically start AI server on app launch
- `selected_model_index`: Index of the model to use (from MODEL_PRESETS)
- `server_port`: Port for the Llama.cpp server (default: 8080)
- `use_gpu`: Enable GPU acceleration if available
- `context_size`: Context window size in tokens

## Usage

### Programmatic Usage

```python
from llama_installer import LlamaInstaller, MODEL_PRESETS
from llama_config import LlamaConfig

# Initialize installer
installer = LlamaInstaller()

# Install Llama.cpp
def progress(msg):
    print(f"Progress: {msg}")

installer.install_llama_cpp(progress_callback=progress)

# Download a model
preset = MODEL_PRESETS[0]  # Recommended model
installer.download_model(preset, progress_callback=lambda d, t, s: print(s))

# Start server
config = LlamaConfig()
config.start_server()

# Use the AI
response = config.chat_completion([
    {"role": "user", "content": "Hello! How are you?"}
])
print(response)
```

### Checking Installation Status

```python
from llama_installer import LlamaInstaller
from llama_config import LlamaConfig

installer = LlamaInstaller()

# Check if Llama.cpp is installed
if installer.is_installed():
    print("Llama.cpp is installed at:", installer.find_llama_server())

# Check if model is downloaded
preset = MODEL_PRESETS[0]
if installer.is_model_downloaded(preset):
    print("Model is ready:", preset.display_name)

# Check first run status
config = LlamaConfig()
if config.is_first_run():
    print("This is the first run - initialization will occur")
```

## Building the Installer

When building Nunba with cx_Freeze, the installer modules are automatically included:

```bash
python setup_freeze_nunba.py bdist_msi
```

The built MSI will include:
- `llama_installer.py`
- `llama_config.py`
- All necessary dependencies

On first launch after installation, the app will automatically:
1. Download Llama.cpp binaries
2. Download the default AI model
3. Configure the system
4. Mark first-run as complete

## Troubleshooting

### Installation fails

Check logs in `~/Documents/Nunba/logs/gui_app.log` for detailed error messages.

Common issues:
- **No internet connection**: Installer needs internet to download binaries and models
- **Disk space**: Models require 600MB-1.5GB each
- **Firewall**: May block downloads from GitHub/HuggingFace

### Building from source fails

Requirements for building from source:
- Git (for cloning repository)
- CMake (for building)
- C++ compiler (MSVC on Windows, GCC/Clang on Linux/macOS)

### GPU not detected

The installer will automatically fall back to CPU if:
- No NVIDIA GPU found
- CUDA drivers not installed
- GPU memory insufficient

## Advanced Configuration

### Changing Default Model

Edit `llama_config.py` to change the default model:

```python
def _load_config(self) -> Dict:
    return {
        # ...
        "selected_model_index": 2,  # Change to different model index
        # ...
    }
```

### Custom Model Presets

Add custom models to `MODEL_PRESETS` in `llama_installer.py`:

```python
MODEL_PRESETS.append(
    ModelPreset(
        "My Custom Model",
        "user/repo-id-on-huggingface",
        "model-file.gguf",
        size_mb=2000,
        description="Custom model description",
        has_vision=False
    )
)
```

## API Reference

### LlamaInstaller

- `is_installed()` - Check if Llama.cpp is installed
- `install_llama_cpp(progress_callback)` - Install Llama.cpp
- `download_model(preset, progress_callback)` - Download a model
- `is_model_downloaded(preset)` - Check if model is downloaded
- `get_model_path(preset)` - Get path to downloaded model
- `find_llama_server()` - Find llama-server executable

### LlamaConfig

- `is_first_run()` - Check if this is the first run
- `mark_first_run_complete()` - Mark first run as complete
- `start_server(model_preset)` - Start the AI server
- `stop_server()` - Stop the AI server
- `check_server_running()` - Check if server is running
- `chat_completion(messages, temperature, max_tokens)` - Send chat request

## License

This implementation is based on the TrueFlow AIExplanationPanel.kt and is part of the Nunba project.

## Credits

- Based on implementation from TrueFlow (AIExplanationPanel.kt)
- Uses Llama.cpp from https://github.com/ggml-org/llama.cpp
- Models from HuggingFace (Unsloth and others)
