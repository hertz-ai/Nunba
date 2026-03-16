# Llama.cpp Enhanced Setup for Nunba - Implementation Summary

This document describes the enhancements made to the Llama.cpp automatic installation system for Nunba, addressing port conflicts, existing installations, and server identification.

## Overview of Enhancements

### 1. **Port Conflict Resolution** ✅
Automatically detects and resolves port conflicts when starting the Llama.cpp server.

### 2. **Existing Installation Detection** ✅
Checks for user's existing Llama.cpp installations before downloading.

### 3. **Health Endpoint with Nunba Identification** ✅
Provides health endpoints that identify Nunba-managed servers for local intelligence integration.

---

## 1. Port Conflict Resolution

### Problem
If port 8080 (or the configured port) is already occupied by another service, the Llama.cpp server would fail to start.

### Solution
The enhanced `start_server()` method in `llama_config.py` now:

1. **Detects what's running on the target port**:
   - Nunba-managed Llama.cpp server → Use existing server
   - External Llama.cpp server → Use existing server (no need to start new one)
   - Other service → Find alternative port
   - Nothing → Use configured port

2. **Automatically finds an available port** if conflict detected:
   - Starts searching from port 8081
   - Tries up to 10 consecutive ports
   - Updates configuration with new port
   - Logs port change for transparency

3. **Gracefully handles external Llama.cpp servers**:
   - Detects when user is already running llama.cpp
   - Reuses the existing server instead of starting a new one
   - Updates API base URL to point to existing server

### Code Example

```python
from llama_config import LlamaConfig

config = LlamaConfig()

# Will automatically handle port conflicts
if config.start_server():
    print(f"Server running on port: {config.config['server_port']}")
    print(f"API available at: {config.api_base}")
```

### New Methods

#### `is_port_available(port: int) -> bool`
Checks if a specific port is available for binding.

#### `find_available_port(start_port: int, max_attempts: int) -> Optional[int]`
Finds the next available port starting from `start_port`.

#### `check_server_type(port: int) -> Tuple[str, Optional[Dict]]`
Determines what type of server (if any) is running on a port:
- `ServerType.NOT_RUNNING` - Nothing running
- `ServerType.NUNBA_MANAGED` - Nunba's llama.cpp server
- `ServerType.EXTERNAL_LLAMA` - External llama.cpp installation
- `ServerType.OTHER_SERVICE` - Non-llama.cpp service

---

## 2. Existing Installation Detection

### Problem
If a user already has Llama.cpp installed on their system, Nunba would unnecessarily download and install another copy.

### Solution
Enhanced `find_llama_server()` method in `llama_installer.py` now:

1. **Checks common system installation paths** before Nunba's installation:
   - `/usr/local/bin/llama-server`
   - `/usr/bin/llama-server`
   - `~/.local/bin/llama-server`
   - `C:/llama.cpp/build/bin/Release/llama-server.exe`
   - `C:/Program Files/llama.cpp/llama-server.exe`
   - User's home directory installations
   - PATH environment variable

2. **Prioritizes system installations** over Nunba installations:
   - Checks system paths first (configurable)
   - Falls back to Nunba's installation if not found
   - Logs which installation is being used

3. **Identifies installation source**:
   - Distinguishes between system and Nunba installations
   - Logs source for transparency
   - Allows users to leverage existing setups

### Code Example

```python
from llama_installer import LlamaInstaller

installer = LlamaInstaller()

# Check system installations first
llama_path = installer.find_llama_server(check_system_first=True)

if llama_path:
    if installer.is_system_installation(llama_path):
        print(f"Using existing system installation: {llama_path}")
    else:
        print(f"Using Nunba installation: {llama_path}")
```

### New Methods

#### `find_llama_server(check_system_first: bool = True) -> Optional[str]`
Enhanced to check system paths before Nunba paths.

#### `is_system_installation(llama_path: str) -> bool`
Determines if a path points to a system/user installation vs Nunba-managed.

---

## 3. Health Endpoint with Nunba Identification

### Problem
External processes need to:
- Detect if Llama.cpp is managed by Nunba
- Distinguish Nunba servers from other llama.cpp instances
- Query AI capabilities for local intelligence integration

### Solution
Created `llama_health_endpoint.py` with Flask endpoints that:

1. **Wrap standard llama.cpp health endpoint** with Nunba metadata
2. **Provide clear identification** for external processes
3. **Offer detailed AI status** information

### Available Endpoints

#### 1. `/health` - Nunba Health Check
Enhanced health endpoint that wraps llama.cpp's health with Nunba identification.

**Response:**
```json
{
  "managed_by": "Nunba",
  "nunba_version": "2.0.0",
  "status": "ok",
  "wrapper_port": 8080,
  "llama_port": 8080,
  "timestamp": "2026-01-03 10:30:45",
  "llama_health": {
    "status": "ok",
    "slots_idle": 1,
    "slots_processing": 0
  }
}
```

**Usage:**
```python
import requests

response = requests.get("http://localhost:8080/health")
data = response.json()

if data.get("managed_by") == "Nunba":
    print("This is a Nunba-managed server!")
```

#### 2. `/nunba/info` - Nunba Information
Provides general information about Nunba and AI capabilities.

**Response:**
```json
{
  "application": "Nunba",
  "version": "2.0.0",
  "description": "A Friend, A Well Wisher, Your LocalMind",
  "ai_capabilities": {
    "local_llm": true,
    "managed_by": "Nunba",
    "engine": "llama.cpp"
  },
  "ai_config": {
    "port": 8080,
    "gpu_enabled": true,
    "context_size": 4096,
    "selected_model_index": 0,
    "model": {
      "name": "Qwen3-VL-2B Instruct Q4_K_XL (Recommended)",
      "size_mb": 1500,
      "has_vision": true,
      "description": "Vision+text, best for code analysis with diagrams"
    }
  },
  "timestamp": "2026-01-03 10:30:45"
}
```

#### 3. `/nunba/ai/status` - Detailed AI Status
Provides detailed status of the AI server and configuration.

**Response:**
```json
{
  "running": true,
  "server_type": "nunba_managed",
  "port": 8080,
  "api_base": "http://127.0.0.1:8080/v1",
  "gpu_available": "cuda",
  "model": {
    "name": "Qwen3-VL-2B Instruct Q4_K_XL (Recommended)",
    "size_mb": 1500,
    "has_vision": true,
    "downloaded": true,
    "path": "/home/user/.nunba/models/Qwen3-VL-2B-Instruct-UD-Q4_K_XL.gguf"
  },
  "timestamp": "2026-01-03 10:30:45"
}
```

### Integration

The health endpoints are automatically registered in `main.py`:

```python
from llama_health_endpoint import add_health_routes
from llama_config import LlamaConfig

llama_config = LlamaConfig()
add_health_routes(app, llama_config)
```

---

## Usage Scenarios

### Scenario 1: Normal First Run
1. User installs Nunba
2. No Llama.cpp found on system
3. Nunba downloads and installs llama.cpp
4. Downloads default model
5. Starts server on port 8080
6. Health endpoint identifies as Nunba-managed

### Scenario 2: User Has Existing Llama.cpp
1. User installs Nunba
2. Llama.cpp found at `/usr/local/bin/llama-server`
3. Nunba skips download, uses existing installation
4. Downloads model (if not present)
5. Starts server using existing llama.cpp
6. Health endpoint identifies as Nunba-managed

### Scenario 3: Port Conflict with Non-Llama Service
1. Port 8080 occupied by another service
2. Nunba detects conflict
3. Finds next available port (e.g., 8081)
4. Starts server on port 8081
5. Updates configuration
6. Health endpoint available on port 8081

### Scenario 4: External Llama.cpp Running
1. User already running llama.cpp on port 8080
2. Nunba detects external llama.cpp server
3. Reuses existing server (no new server started)
4. Updates API base to point to existing server
5. Health endpoint shows external llama status

---

## Testing

### Test Port Conflict Resolution
```python
# Test with occupied port
from llama_config import LlamaConfig
import socket

# Occupy port 8080
with socket.socket() as s:
    s.bind(('127.0.0.1', 8080))
    s.listen(1)

    # Try to start server (should use different port)
    config = LlamaConfig()
    config.start_server()

    # Check new port
    print(f"Server started on port: {config.config['server_port']}")
```

### Test Existing Installation Detection
```python
from llama_installer import LlamaInstaller

installer = LlamaInstaller()

# Check what was found
llama_path = installer.find_llama_server()
if llama_path:
    if installer.is_system_installation(llama_path):
        print("Using existing system installation")
    else:
        print("Using Nunba installation")
```

### Test Health Endpoints
```bash
# Check if Nunba-managed
curl http://localhost:8080/health

# Get Nunba info
curl http://localhost:8080/nunba/info

# Get AI status
curl http://localhost:8080/nunba/ai/status
```

---

## Configuration Updates

### Enhanced Config Structure

The configuration file (`~/.nunba/llama_config.json`) now includes:

```json
{
  "first_run": false,
  "auto_start_server": true,
  "selected_model_index": 0,
  "server_port": 8080,
  "use_gpu": true,
  "context_size": 4096
}
```

**Note:** `server_port` is automatically updated if port conflict occurs.

---

## File Changes Summary

### New Files
- `llama_health_endpoint.py` - Health endpoint wrapper with Nunba identification

### Modified Files
- `llama_installer.py` - Enhanced installation detection
- `llama_config.py` - Port conflict resolution and server type detection
- `main.py` - Health endpoint registration
- `setup_freeze_nunba.py` - Include new modules in build

### Updated Files
- `LLAMA_SETUP_README.md` - Original documentation
- `LLAMA_ENHANCEMENTS.md` - This document

---

## API Reference

### LlamaConfig Enhancements

```python
class LlamaConfig:
    def is_port_available(self, port: int) -> bool
    def find_available_port(self, start_port: int, max_attempts: int) -> Optional[int]
    def check_server_type(self, port: int) -> Tuple[str, Optional[Dict]]
    def check_server_running(self, port: Optional[int]) -> bool
    def start_server(self, model_preset: Optional[ModelPreset], force_new_port: bool) -> bool
```

### LlamaInstaller Enhancements

```python
class LlamaInstaller:
    def find_llama_server(self, check_system_first: bool) -> Optional[str]
    def is_system_installation(self, llama_path: str) -> bool
```

### ServerType Enum

```python
class ServerType:
    NOT_RUNNING = "not_running"
    NUNBA_MANAGED = "nunba_managed"
    EXTERNAL_LLAMA = "external_llama"
    OTHER_SERVICE = "other_service"
```

---

## Benefits

✅ **Robust Port Management** - No more failed starts due to port conflicts
✅ **Resource Efficiency** - Reuses existing installations when possible
✅ **Clear Identification** - External processes can detect Nunba servers
✅ **Better User Experience** - Graceful handling of edge cases
✅ **Local Intelligence Ready** - Health endpoints enable integration
✅ **Transparent Logging** - Clear logs for troubleshooting

---

## Future Enhancements

Potential future improvements:
- Auto-restart on crash with exponential backoff
- Model hot-swapping without server restart
- Multi-model server support
- WebSocket health status streaming
- Prometheus metrics endpoint
- Docker container support

---

## Support

For issues or questions:
1. Check logs in `~/Documents/Nunba/logs/gui_app.log`
2. Verify health endpoint: `curl http://localhost:8080/health`
3. Check AI status: `curl http://localhost:8080/nunba/ai/status`
4. Review configuration: `~/.nunba/llama_config.json`

---

**Version:** 2.0.0
**Last Updated:** 2026-01-03
**Author:** Based on TrueFlow AIExplanationPanel.kt
