/* eslint-disable */
import React, {useState} from 'react';
import './PupitDocs.css';

const MindstorySDKDocs = () => {
  const [activeSection, setActiveSection] = useState('quickstart');

  return (
    <div className="body">
      <header>
        <h1 className="heading">Mindstory SDK Documentation</h1>
        <p>Multimodal SDK for developers. Free forever. Modality in, modality out.</p>
      </header>

      <nav className="toc">
        <h2 className="heading">Table of Contents</h2>
        <ul className="tocList">
          <li><a href="#quickstart" className="tocLink">1. Quick Start</a></li>
          <li><a href="#api-reference" className="tocLink">2. API Reference</a>
            <ul className="tocList">
              <li><a href="#completions" className="tocLink">Chat Completions</a></li>
              <li><a href="#multimodal" className="tocLink">Multimodal Input</a></li>
              <li><a href="#corrections" className="tocLink">Expert Corrections</a></li>
              <li><a href="#streaming" className="tocLink">Streaming / Stats</a></li>
              <li><a href="#api-reference" className="tocLink">Error Codes</a></li>
              <li><a href="#api-reference" className="tocLink">Rate Limits</a></li>
              <li><a href="#api-reference" className="tocLink">Authentication Flow</a></li>
              <li><a href="#api-reference" className="tocLink">Webhooks / Callbacks</a></li>
              <li><a href="#api-reference" className="tocLink">SDK Versioning</a></li>
            </ul>
          </li>
          <li><a href="#agent-extension" className="tocLink">2.5 Agent Extension (Add to Any Page)</a></li>
          <li><a href="#sdks" className="tocLink">3. SDKs & Libraries</a></li>
          <li><a href="#distribution" className="tocLink">4. Distribution Channels</a></li>
          <li><a href="#revenue" className="tocLink">5. Revenue Model (90/9/1)</a></li>
          <li><a href="#security" className="tocLink">6. Security</a></li>
          <li><a href="#onboarding" className="tocLink">7. Agentic Developer Onboarding</a></li>
          <li><a href="#premium" className="tocLink">8. Premium Features & Pricing</a></li>
          <li><a href="#products" className="tocLink">9. Products</a></li>
        </ul>
      </nav>

      <main>
        <section id="quickstart">
          <h2 className="heading">1. Quick Start</h2>
          <p>
            Mindstory uses an OpenAI-compatible API. Any OpenAI SDK client works out of the box.
          </p>

          <h3 className="heading">Python</h3>
          <pre className="pre"><code>{`from openai import OpenAI

client = OpenAI(
    base_url="https://azurekong.hertzai.com/v1",
    api_key="your-mindstory-key"
)

response = client.chat.completions.create(
    model="hevolve",
    messages=[{"role": "user", "content": "Explain quantum computing simply"}]
)
print(response.choices[0].message.content)`}</code></pre>

          <h3 className="heading">JavaScript / TypeScript</h3>
          <pre className="pre"><code>{`import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://azurekong.hertzai.com/v1',
  apiKey: 'your-mindstory-key'
});

const response = await client.chat.completions.create({
  model: 'hevolve',
  messages: [{ role: 'user', content: 'Hello from Mindstory SDK' }]
});`}</code></pre>

          <h3 className="heading">cURL</h3>
          <pre className="pre"><code>{`curl -X POST https://azurekong.hertzai.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-mindstory-key" \\
  -d '{
    "model": "hevolve",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}</code></pre>
        </section>

        <section id="api-reference">
          <h2 className="heading">2. API Reference</h2>

          <h3 id="completions" className="heading">POST /v1/chat/completions</h3>
          <p>OpenAI-compatible chat completions endpoint.</p>
          <ul>
            <li><strong>model</strong>: <code className="code">"hevolve"</code> (required)</li>
            <li><strong>messages</strong>: Array of <code className="code">{`{role, content}`}</code> (required)</li>
            <li><strong>temperature</strong>: 0.0-2.0 (default: 0.7)</li>
            <li><strong>max_tokens</strong>: Max output tokens (default: 512)</li>
            <li><strong>stream</strong>: Boolean for streaming (default: false)</li>
          </ul>

          <h4 className="heading">Response</h4>
          <pre className="pre"><code>{`{
  "id": "chatcmpl-abc123",
  "model": "hevolve",
  "choices": [{
    "message": {"role": "assistant", "content": "..."},
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 50,
    "total_tokens": 70
  },
  "epistemic": {
    "confidence": 0.95,
    "uncertainty": 0.08,
    "should_defer": false
  }
}`}</code></pre>
          <p>
            The <code className="code">epistemic</code> field is unique to HevolveAI —
            intrinsic confidence computed during the forward pass at zero additional cost.
          </p>

          <h3 id="multimodal" className="heading">Multimodal Input (Image + Text)</h3>
          <pre className="pre"><code>{`{
  "model": "hevolve",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "What do you see?"},
      {"type": "image_url", "image_url": {
        "url": "data:image/jpeg;base64,..."
      }}
    ]
  }]
}`}</code></pre>

          <h3 id="corrections" className="heading">POST /v1/corrections</h3>
          <p>Expert feedback — teach the model. It learns immediately with zero catastrophic forgetting.</p>
          <pre className="pre"><code>{`{
  "original_response": "The capital of France is London",
  "corrected_response": "The capital of France is Paris",
  "expert_id": "developer-123",
  "confidence": 0.99,
  "explanation": "Factual correction"
}`}</code></pre>

          <h3 id="streaming" className="heading">GET /v1/stats</h3>
          <p>Learning statistics — experiences stored, corrections received, memory usage.</p>

          <h3 className="heading">POST /v1/chat/completions (Streaming)</h3>
          <p>Set <code className="code">stream: true</code> for Server-Sent Events:</p>
          <pre className="pre"><code>{`data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"Hello"}}]}
data: {"id":"chatcmpl-1","choices":[{"delta":{"content":" world"}}]}
data: [DONE]`}</code></pre>

          <h3 className="heading">Error Codes</h3>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #2c3e50'}}>
                <th style={{textAlign: 'left', padding: '8px'}}>HTTP</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Code</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['400', 'invalid_request', 'Missing required fields or malformed JSON'],
                ['401', 'unauthorized', 'Invalid or missing API key'],
                ['403', 'forbidden', 'API key valid but lacks permission for this resource'],
                ['404', 'not_found', 'Endpoint does not exist'],
                ['429', 'rate_limited', 'Too many requests — see Retry-After header'],
                ['500', 'internal_error', 'Server error — safe to retry with backoff'],
                ['502', 'upstream_unavailable', 'HevolveAI backend not reachable'],
                ['503', 'overloaded', 'All compute nodes busy — retry in 5-30s'],
              ].map(([http, code, meaning], i) => (
                <tr key={i} style={{borderBottom: '1px solid #ecf0f1'}}>
                  <td style={{padding: '8px'}}><code className="code">{http}</code></td>
                  <td style={{padding: '8px'}}><code className="code">{code}</code></td>
                  <td style={{padding: '8px'}}>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{marginTop: '8px'}}>
            Error response body: <code className="code">{`{"error": {"code": "rate_limited", "message": "...", "retry_after": 30}}`}</code>
          </p>

          <h3 className="heading">Rate Limits</h3>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #2c3e50'}}>
                <th style={{textAlign: 'left', padding: '8px'}}>Tier</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Per Minute</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Per Hour</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Per Day</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{borderBottom: '1px solid #ecf0f1'}}>
                <td style={{padding: '8px'}}>Free</td>
                <td style={{padding: '8px'}}>60</td>
                <td style={{padding: '8px'}}>1,000</td>
                <td style={{padding: '8px'}}>10,000</td>
              </tr>
              <tr>
                <td style={{padding: '8px'}}>Premium</td>
                <td style={{padding: '8px'}}>Unlimited</td>
                <td style={{padding: '8px'}}>Unlimited</td>
                <td style={{padding: '8px'}}>Unlimited</td>
              </tr>
            </tbody>
          </table>
          <p style={{marginTop: '8px'}}>
            Rate limit headers: <code className="code">X-RateLimit-Remaining</code>,{' '}
            <code className="code">X-RateLimit-Reset</code>,{' '}
            <code className="code">Retry-After</code> (seconds).
          </p>

          <h3 className="heading">Authentication Flow</h3>
          <ol>
            <li><strong>Register</strong>: POST to <code className="code">/register_student</code> with name, email, phone</li>
            <li><strong>Login</strong>: POST to <code className="code">/login</code> with email or phone — receives OTP</li>
            <li><strong>Verify OTP</strong>: POST to <code className="code">/verify_otp</code> — receives OAuth2 token</li>
            <li><strong>Use token</strong>: Include <code className="code">Authorization: Bearer YOUR_TOKEN</code> in all API calls</li>
            <li><strong>Kong API Key</strong>: For SDK access, use <code className="code">apikey: YOUR_MINDSTORY_KEY</code> header (simpler, no OTP)</li>
          </ol>

          <h3 className="heading">Webhooks / Callbacks</h3>
          <p>For async operations (video generation, long inference), configure a webhook URL:</p>
          <pre className="pre"><code>{`POST /v1/chat/completions
{
  "model": "hevolve",
  "messages": [...],
  "webhook_url": "https://your-server.com/callback",
  "webhook_secret": "your-hmac-secret"
}

// Your server receives:
POST /callback
X-Webhook-Signature: sha256=...
{
  "id": "chatcmpl-abc123",
  "status": "completed",
  "choices": [...],
  "usage": {...}
}`}</code></pre>
          <p>
            For Pupit video generation, real-time progress is delivered via WAMP WebSocket
            on topic <code className="code">com.hertzai.pupit.{'{uid}'}</code> — no polling needed.
          </p>

          <h3 className="heading">SDK Versioning</h3>
          <p>
            The API follows semantic versioning. Breaking changes only in major versions.
            Current: <code className="code">v1</code>. All endpoints are prefixed with <code className="code">/v1/</code>.
          </p>
          <ul>
            <li><code className="code">v1</code> — Current stable (chat completions, corrections, stats)</li>
            <li><code className="code">v2</code> — Planned (streaming corrections, multi-turn memory, tool use)</li>
          </ul>
          <p>
            Changelog is published at <code className="code">/v1/changelog</code> and in the GitHub releases.
          </p>
        </section>

        <section id="agent-extension">
          <h2 className="heading">2.5 Hevolve Agent Extension</h2>
          <p>
            Add the Hevolve AI agent as a floating chat helper on any page — the same widget
            you see on this docs page. It connects to your HART OS backend and can answer
            questions, generate videos, and run agent tasks conversationally.
          </p>

          <h3 className="heading">Script Tag (Simplest)</h3>
          <pre className="pre"><code>{`<script>
var script = document.createElement('script');
script.src = "https://hevolve.hertzai.com/hevolve-widget.js";
script.onload = function() {
  HevolveWidget.init({
    agentName: 'Radha',        // or any agent name
    authToken: 'YOUR_TOKEN',   // from /verify_otp
    userId: 'USER_ID',
    emailAddress: 'user@example.com'
  });
};
document.body.appendChild(script);
</script>`}</code></pre>

          <h3 className="heading">React Component (For React Apps)</h3>
          <pre className="pre"><code>{`import { NunbaChatProvider, NunbaChatPill, NunbaChatPanel }
  from '@hertzai/mindstory/NunbaChat';

function App() {
  return (
    <NunbaChatProvider>
      <YourApp />
      <NunbaChatPill />
      <NunbaChatPanel />
    </NunbaChatProvider>
  );
}`}</code></pre>

          <h3 className="heading">Custom Events</h3>
          <pre className="pre"><code>{`// Open chat with a specific agent
window.dispatchEvent(new CustomEvent('nunba:selectAgent', {
  detail: { agentId: '49', agentName: 'Speech Therapy Agent' }
}));

// Widget events
widgetInstance.on('open', () => console.log('opened'));
widgetInstance.on('close', () => console.log('closed'));
widgetInstance.on('message', (data) => console.log(data));`}</code></pre>

          <h3 className="heading">Features</h3>
          <ul>
            <li>Floating pill with typewriter greetings (desktop + mobile)</li>
            <li>Full chat panel with agent switching, TTS, @mentions</li>
            <li>Persistent message history (localStorage)</li>
            <li>Automatic retry with exponential backoff</li>
            <li>Diverse seeded avatars per agent</li>
            <li>Conversational video downloads — ask for a video, get inline player + download</li>
            <li>Works offline (local mode) and online (cloud mode)</li>
          </ul>
        </section>

        <section id="sdks">
          <h2 className="heading">3. SDKs & Libraries</h2>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #2c3e50'}}>
                <th style={{textAlign: 'left', padding: '8px'}}>Platform</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Package</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{borderBottom: '1px solid #ecf0f1'}}>
                <td style={{padding: '8px'}}>Python</td>
                <td style={{padding: '8px'}}><code className="code">pip install mindstory</code></td>
                <td style={{padding: '8px'}}>Coming soon</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ecf0f1'}}>
                <td style={{padding: '8px'}}>JavaScript</td>
                <td style={{padding: '8px'}}><code className="code">npm install @hertzai/mindstory</code></td>
                <td style={{padding: '8px'}}>Coming soon</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ecf0f1'}}>
                <td style={{padding: '8px'}}>Android</td>
                <td style={{padding: '8px'}}>Pupit-SDK (Gradle)</td>
                <td style={{padding: '8px'}}>Available</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ecf0f1'}}>
                <td style={{padding: '8px'}}>React Native</td>
                <td style={{padding: '8px'}}>@hertzai/mindstory-rn</td>
                <td style={{padding: '8px'}}>Available via Hevolve app</td>
              </tr>
              <tr>
                <td style={{padding: '8px'}}>REST API</td>
                <td style={{padding: '8px'}}>Any HTTP client</td>
                <td style={{padding: '8px'}}>Available now</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section id="distribution">
          <h2 className="heading">4. Distribution Channels</h2>
          <ul>
            <li><strong>Nunba</strong> — Web/desktop app with built-in playground</li>
            <li><strong>Mindstory (Play Store)</strong> — Mobile app with camera, voice, local-first inference</li>
            <li><strong>Pupit Player</strong> — AI-powered talking head video generation</li>
            <li><strong>Website Plugin</strong> — Drop-in chat widget for any website</li>
          </ul>
        </section>

        <section id="revenue">
          <h2 className="heading">5. Revenue Model (90/9/1)</h2>
          <p>All SDK usage fees flow through the 90/9/1 split:</p>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #2c3e50'}}>
                <th style={{textAlign: 'left', padding: '8px'}}>Share</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Recipient</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{borderBottom: '1px solid #ecf0f1'}}>
                <td style={{padding: '8px'}}>90%</td>
                <td style={{padding: '8px'}}>Compute contributors</td>
                <td style={{padding: '8px'}}>People who provide GPU/CPU for inference</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ecf0f1'}}>
                <td style={{padding: '8px'}}>9%</td>
                <td style={{padding: '8px'}}>Infrastructure</td>
                <td style={{padding: '8px'}}>Server costs, bandwidth, maintenance</td>
              </tr>
              <tr>
                <td style={{padding: '8px'}}>1%</td>
                <td style={{padding: '8px'}}>Central</td>
                <td style={{padding: '8px'}}>Platform development, governance</td>
              </tr>
            </tbody>
          </table>
          <p style={{marginTop: '10px'}}>
            <strong>SDK access is free forever.</strong> Developers pay per-token for API calls.
            Local inference is free — run HevolveAI on your own hardware.
          </p>
        </section>

        <section id="security">
          <h2 className="heading">6. Security</h2>
          <ul>
            <li>All API traffic encrypted (TLS 1.3)</li>
            <li>API keys scoped per project</li>
            <li>Edge privacy: user data never leaves device unless explicitly shared</li>
            <li>Constitutional governance: 33 immutable terms enforced cryptographically</li>
            <li>No data used for training without explicit consent</li>
          </ul>
        </section>

        <section id="onboarding">
          <h2 className="heading">7. Agentic Developer Onboarding</h2>
          <p>
            HART OS includes a built-in MCP (Model Context Protocol) server that lets
            Claude Code — or any MCP-compatible tool — orchestrate the entire platform
            agentically. Developers get an AI coding partner that understands the full stack.
          </p>

          <h3 className="heading">Step 1: Connect Claude Code to HARTOS</h3>
          <pre className="pre"><code>{`# In your Claude Code MCP settings (~/.claude/mcp_servers.json):
{
  "mcpServers": {
    "hartos": {
      "command": "python",
      "args": ["-m", "integrations.mcp.mcp_server"],
      "cwd": "/path/to/HARTOS"
    }
  }
}`}</code></pre>

          <h3 className="heading">Step 2: Onboard into Kong (One Command)</h3>
          <pre className="pre"><code>{`# Via MCP tool (agentic — Claude does it for you):
> Use the onboard_kong tool

# Or via CLI:
python -m integrations.gateway.kong_onboard

# Queries existing Kong config, creates/updates:
# - Service: hevolve-completions → localhost:8000
# - Routes: /v1/chat/completions, /v1/corrections, /v1/stats
# - Plugins: key-auth, rate-limiting, cors, request-size-limiting`}</code></pre>

          <h3 className="heading">Step 3: Start Building</h3>
          <p>Available MCP tools for developers:</p>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #2c3e50'}}>
                <th style={{textAlign: 'left', padding: '8px'}}>Tool</th>
                <th style={{textAlign: 'left', padding: '8px'}}>What it does</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['code', 'Execute coding tasks via distributed coding agent'],
                ['list_agents', 'Browse 96 expert agents by category'],
                ['create_goal', 'Create goals for autonomous agents'],
                ['dispatch_goal', 'Force-dispatch a goal immediately'],
                ['remember / recall', 'Persistent memory graph (store & search)'],
                ['switch_model', 'Hot-swap the local LLM at runtime'],
                ['system_health', 'Full stack health check (Flask, LLM, DB, memory)'],
                ['onboard_kong', 'Programmatic Kong API Gateway setup'],
                ['list_recipes', 'Browse trained agent recipes'],
                ['social_query', 'Read-only queries on users, posts, goals'],
              ].map(([tool, desc], i) => (
                <tr key={i} style={{borderBottom: '1px solid #ecf0f1'}}>
                  <td style={{padding: '8px'}}><code className="code">{tool}</code></td>
                  <td style={{padding: '8px'}}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="premium">
          <h2 className="heading">8. Premium Features & Pricing</h2>

          <h3 className="heading">Free Tier (Forever)</h3>
          <ul>
            <li>SDK access and development</li>
            <li>Local inference (run HevolveAI on your hardware)</li>
            <li>Basic completions API (rate limited)</li>
            <li>Community support</li>
          </ul>

          <h3 className="heading">Premium Features</h3>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #2c3e50'}}>
                <th style={{textAlign: 'left', padding: '8px'}}>Feature</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Free</th>
                <th style={{textAlign: 'left', padding: '8px'}}>Premium</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['API Rate Limit', '60/min', 'Unlimited'],
                ['Multimodal (Image/Audio/Video)', 'Text only', 'All modalities'],
                ['Pupit Video Generation', '3/day watermarked', 'Unlimited, no watermark'],
                ['Mindstory Story Videos', '1/day, 30s max', 'Unlimited, 5min max'],
                ['HD Video Output', 'Standard', '1080p + 4K'],
                ['Voice Cloning (TTS)', 'Built-in voices', 'Custom voice cloning'],
                ['Priority Inference', 'Shared queue', 'Dedicated compute'],
                ['Expert Corrections', '10/day', 'Unlimited'],
                ['Custom Model Fine-tuning', 'No', 'Yes'],
                ['Ad-free Experience', 'Ads supported', 'No ads'],
              ].map(([feature, free, premium], i) => (
                <tr key={i} style={{borderBottom: '1px solid #ecf0f1'}}>
                  <td style={{padding: '8px'}}>{feature}</td>
                  <td style={{padding: '8px'}}>{free}</td>
                  <td style={{padding: '8px'}}><strong>{premium}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="heading">Monetization</h3>
          <ul>
            <li><strong>Per-token API billing</strong> — metered through Kong, settled via 90/9/1</li>
            <li><strong>Premium subscriptions</strong> — unlocks HD video, unlimited Pupit, priority compute</li>
            <li><strong>Google AdMob</strong> — integrated in Hevolve Android app (free tier ad-supported)</li>
            <li><strong>Peer-witnessed ad impressions</strong> — federated ad verification, no fraud</li>
          </ul>
          <p>
            All revenue flows through the 90/9/1 split. Compute providers earn 90%.
            Premium features fund infrastructure (9%) and platform governance (1%).
          </p>
        </section>

        <section id="products">
          <h2 className="heading">9. Products</h2>
          <ul>
            <li>
              <strong>HevolveAI Multimodal API</strong> — Text, image, audio, video inference.
              OpenAI-compatible. Epistemic confidence scoring. Expert corrections.
            </li>
            <li>
              <strong>Pupit Player</strong> — AI talking head video generation. Image + text/audio
              in, realistic lip-synced video out. Avatar warm-up, chunked streaming, vtoonify.
            </li>
            <li>
              <strong>Mindstory</strong> — Story video generation. Create narrative videos from
              text prompts. Download or share. Premium: longer videos, HD, no watermark.
            </li>
            <li>
              <strong>Hevolve Website Plugin</strong> — Drop-in chat widget for any website.
              Customizable themes. Streaming responses. Multimodal input.
            </li>
            <li>
              <strong>Hevolve Mobile (Play Store)</strong> — Published as "Mindstory".
              Camera input, voice I/O, local-first inference, Google AdMob for free tier.
            </li>
            <li>
              <strong>Nunba Desktop</strong> — Web/desktop app with built-in playground,
              developer portal, SDK package downloads.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default MindstorySDKDocs;
