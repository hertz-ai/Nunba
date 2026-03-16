# LLM Setup (llama.cpp)

Nunba uses [llama.cpp](https://github.com/ggml-org/llama.cpp) for local LLM inference. This runs entirely on your machine — no API keys, no cloud, no data leaves your device.

## Automatic Setup (Recommended)

Nunba includes an auto-installer that downloads llama.cpp and a model on first run.

### Using the AI Setup Wizard

```bash
python app.py --setup-ai
```

This opens a dark-themed GUI wizard that lets you:

1. Choose a model (vision or text-only)
2. Download llama.cpp binaries
3. Download the selected model from HuggingFace
4. Configure GPU acceleration

### Automatic First-Run

If you skip the wizard, Nunba detects the first run and installs automatically in the background:

1. Downloads llama.cpp prebuilt binary from GitHub
2. Downloads the default model (Qwen3-VL-2B Instruct, 1.5 GB)
3. Starts the llama.cpp server on port 8080

## Manual Setup

### Step 1: Install llama.cpp

=== "Pre-built Binary (easiest)"

    Download from [llama.cpp releases](https://github.com/ggml-org/llama.cpp/releases):

    - Windows + NVIDIA GPU: `llama-*-win-cuda-cu12.*.zip`
    - Windows CPU only: `llama-*-win-msvc-x64.zip`
    - macOS: `llama-*-macos-arm64.zip`

    Extract to `~/.nunba/llama.cpp/`

=== "Build from Source"

    ```bash
    git clone https://github.com/ggml-org/llama.cpp
    cd llama.cpp
    cmake -B build -DGGML_CUDA=ON   # or -DGGML_METAL=ON for macOS
    cmake --build build --config Release
    ```

### Step 2: Download a Model

Download a GGUF model from HuggingFace and place it in `~/.nunba/models/`:

| Model | Size | Type | Best For |
|-------|------|------|----------|
| [Qwen3-VL-2B-Instruct](https://huggingface.co/unsloth/Qwen3-VL-2B-Instruct-GGUF) | 1.5 GB | Vision + Text | General use (recommended) |
| [Qwen3-VL-2B-Thinking](https://huggingface.co/unsloth/Qwen3-VL-2B-Thinking-GGUF) | 1.5 GB | Vision + Text | Reasoning tasks |
| [Gemma-3-1B-IT](https://huggingface.co/google/gemma-3-1b-it-gguf) | 600 MB | Text only | Low-resource machines |
| [Qwen3-2B](https://huggingface.co/unsloth/Qwen3-2B-GGUF) | 1.1 GB | Text only | Fastest inference |

### Step 3: Start the Server

```bash
~/.nunba/llama.cpp/llama-server \
  --model ~/.nunba/models/your-model.gguf \
  --port 8080 \
  --ctx-size 4096 \
  --n-gpu-layers 99   # Use all GPU layers (omit for CPU-only)
```

Verify:
```bash
curl http://localhost:8080/health
# Expected: {"status":"ok"}
```

## Configuration

Edit `~/.nunba/llama_config.json`:

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

| Setting | Description |
|---------|-------------|
| `auto_start_server` | Start LLM server when Nunba launches |
| `selected_model_index` | Which model preset to use (0-3) |
| `server_port` | Port for llama.cpp server |
| `use_gpu` | Enable CUDA/Metal acceleration |
| `context_size` | Max tokens in context window |

## GPU Detection

The installer auto-detects GPU capability:

- **NVIDIA (CUDA)**: Detected via `nvidia-smi`. Downloads CUDA-enabled binary.
- **Apple (Metal)**: Detected on macOS. Metal is built-in.
- **CPU Fallback**: If no GPU detected, uses CPU-only binary.

## LLM Routing

When the LLM is running, chat messages are routed through a multi-tier pipeline:

```
React → POST /chat → chatbot_routes.py
                        ↓
                Tier 1: Intent detection (deterministic)
                        ↓
                Tier 2: LangChain agent (port 6778) — tools, memory
                        ↓ (fallback)
                Tier 3: Raw llama.cpp (port 8080)
```

If the LangChain agent service is not running, chat falls back directly to llama.cpp.

## Troubleshooting

### "Connecting to backend..." in chat

The LLM server is not reachable. Check:

1. Is llama.cpp running? `curl http://localhost:8080/health`
2. Is the model loaded? Check terminal output for errors
3. Is VRAM sufficient? Try a smaller model (Gemma-3-1B at 600 MB)

### Out of memory (CUDA)

Reduce GPU layers or use a smaller model:

```bash
# Use fewer GPU layers (offload some to CPU)
llama-server --model model.gguf --n-gpu-layers 10

# Or use a smaller model
# Gemma-3-1B-IT: ~600 MB VRAM
```

### Slow inference on CPU

CPU inference for a 2B model is ~5-15 tokens/second. For faster results:

- Use a smaller model (Gemma-3-1B)
- Reduce context size: `--ctx-size 2048`
- Install CUDA for GPU acceleration
