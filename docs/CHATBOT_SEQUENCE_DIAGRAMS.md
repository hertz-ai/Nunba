# Chatbot API Sequence Diagrams

## 1. /teachme2 Endpoint - Educational Chatbot

```mermaid
sequenceDiagram
    participant Client
    participant Flask as Flask Server<br/>/teachme2
    participant Session as Session Manager
    participant Zeroshot as Zeroshot API<br/>(Intent Classifier)
    participant Vicuna as Vicuna Bot API<br/>(LLM)

    Client->>Flask: POST /teachme2<br/>{user_id, text, teacher_avatar_id, request_id}

    Note over Flask: Extract Parameters
    Flask->>Flask: Extract user_id, text, request_id,<br/>teacher_avatar_id, video_req, goals, file_id

    alt Session doesn't exist or ended
        Flask->>Session: Create new session
        Session-->>Flask: Session initialized<br/>{state: "start", conv_queue: [], ...}
    else Session exists
        Flask->>Session: Update existing session
        Session-->>Flask: Session updated
    end

    Note over Flask: Input Validation
    alt Empty input and no goals
        Flask-->>Client: Error: "Please enter something as response"
    end

    Flask->>Session: Add user message to conv_queue
    Session-->>Flask: Message added

    Note over Flask: Intent Classification
    Flask->>Zeroshot: POST /zeroshot3<br/>{text: inp, labels: intital_labels}
    Note over Zeroshot: Classify into:<br/>["teach me", "abusive language",<br/>"topic listing", "explain", "question",<br/>"learn", "revise", "greet", "goodbye"]

    alt Zeroshot service available
        Zeroshot-->>Flask: {labels: ["greet"], scores: [0.95]}
    else Zeroshot timeout/error
        Zeroshot--xFlask: Connection timeout (10s)
        Note over Flask: Fallback to default label
        Flask->>Flask: Use default: labels[0]
    end

    Flask->>Session: Store zeroshot_label

    Note over Flask: Intent Routing
    alt Intent: "abusive language"
        Flask->>Flask: Select random abusive response<br/>from template
        Flask-->>Client: Response: "Please be respectful"

    else Intent: "greet"
        Flask->>Flask: Generate greeting response
        Flask-->>Client: Response: "Hello! I'm your teaching<br/>assistant. How can I help?"

    else Intent: "teach me" OR "learn"
        Flask->>Flask: Create topic selection response
        Flask-->>Client: Response: {<br/>  text: ["What topic would you like to learn?"],<br/>  options: ["Math", "Science", "History", "Programming"]<br/>}

    else Intent: "question" OR other
        Note over Flask: Default to conversational response
        Flask->>Session: Get conversation history (last 10)
        Session-->>Flask: conversation_queue

        Flask->>Vicuna: POST /chat<br/>{messages: conv_queue, user_id}

        alt Vicuna service available
            Vicuna->>Vicuna: Generate response with context
            Vicuna-->>Flask: {response: "Here's the answer..."}
        else Vicuna timeout/error
            Vicuna--xFlask: Connection timeout
            Flask->>Flask: Fallback stub response
        end

        Flask->>Session: Add bot response to conv_queue
        Flask-->>Client: Response: {<br/>  text: [response_text],<br/>  action: "Casual Conversation"<br/>}
    end

    Note over Client: Display response to user
```

---

## 2. /custom_gpt Endpoint - Custom AI Assistant

```mermaid
sequenceDiagram
    participant Client
    participant Flask as Flask Server<br/>/custom_gpt
    participant Session as Session Manager
    participant CustomSession as Custom Session Manager
    participant Zeroshot as Zeroshot API<br/>(Content Filter)
    participant Zeroshot2 as Zeroshot2 API<br/>(Backup Filter)
    participant Vicuna as Vicuna Bot API<br/>(Custom Agent)

    Client->>Flask: POST /custom_gpt<br/>{user_id, text, teacher_avatar_id,<br/>prompt_id, create_agent}

    Note over Flask: Extract Parameters
    Flask->>Flask: Extract user_id, text, request_id,<br/>teacher_avatar_id, video_req,<br/>create_agent, prompt_name,<br/>file_id, prompt_id, raw_inp

    Note over Flask: Input Validation
    alt Empty input
        Flask-->>Client: Error: "Request cannot be blank"
    end

    Note over Flask: Session Initialization
    alt General session doesn't exist
        Flask->>Session: Create general session
        Session-->>Flask: Session created
    end

    alt Custom session doesn't exist
        Flask->>CustomSession: Create custom session
        Note over CustomSession: Initialize with:<br/>- conv_queue (maxlen=10)<br/>- prompt: "You are a helpful AI assistant"<br/>- prompt_id, file_id, state: "start"
        CustomSession-->>Flask: Custom session created
    end

    Flask->>CustomSession: Update request_id, teacher_avatar_id, file_id

    Flask->>CustomSession: Add user message to conv_queue<br/>{role: "user", content: raw_inp or inp}
    CustomSession-->>Flask: Message added

    Note over Flask: Content Moderation (2-stage)
    Flask->>Zeroshot: POST /zeroshot3<br/>{text: inp, labels: content_labels}
    Note over Zeroshot: Classify into:<br/>["abusive language", "greet",<br/>"explain", "question", "learn", ...]

    alt Zeroshot available
        Zeroshot-->>Flask: {labels: ["question"], scores: [0.88]}
    else Zeroshot timeout
        Zeroshot--xFlask: Timeout (10s)
        Flask->>Flask: Default label
    end

    alt Primary classification: "abusive language"
        Note over Flask: Double-check with secondary classifier
        Flask->>Zeroshot2: POST /zeroshot<br/>{text: inp, labels: content_labels}

        alt Zeroshot2 confirms abuse
            Zeroshot2-->>Flask: {labels: ["abusive language"], scores: [0.92]}
            Flask->>Flask: Select random warning from template
            Flask-->>Client: Response: "Let's keep the<br/>conversation positive"
        else Zeroshot2 disagrees
            Zeroshot2-->>Flask: {labels: ["question"], scores: [0.75]}
            Note over Flask: Continue processing (not abusive)
        end
    end

    Flask->>CustomSession: Store zeroshot_label

    Note over Flask: Build Request with System Prompt
    Flask->>CustomSession: Get system prompt and conversation history
    CustomSession-->>Flask: {<br/>  prompt: custom_prompt,<br/>  conv_queue: message_history<br/>}

    Flask->>Flask: Build request_data = [<br/>  {role: "system", content: prompt},<br/>  ...conv_queue messages<br/>]

    Note over Flask: Generate Response with Custom Agent
    Flask->>Vicuna: POST /chat<br/>{<br/>  messages: request_data,<br/>  user_id: user_id,<br/>  prompt_id: prompt_id,<br/>  create_agent: create_agent,<br/>  custom_agent: true<br/>}

    alt Vicuna available
        Note over Vicuna: Generate response using:<br/>- Custom system prompt<br/>- Full conversation history<br/>- Agent-specific settings
        Vicuna->>Vicuna: Process with custom agent context
        Vicuna-->>Flask: {response: "Based on your request..."}
    else Vicuna timeout/error
        Vicuna--xFlask: Connection timeout (30s)
        Flask->>Flask: Fallback: "Need user_id and text<br/>to create agent"
    end

    Flask->>CustomSession: Add bot response to conv_queue<br/>{role: "assistant", content: response}

    Flask-->>Client: Response: {<br/>  status: "success",<br/>  text: [response_text],<br/>  action: "Custom GPT",<br/>  request_id: request_id,<br/>  video_req: video_req<br/>}

    Note over Client: Display AI response to user
```

---

## 3. Key Differences Between Endpoints

| Feature | /teachme2 | /custom_gpt |
|---------|-----------|-------------|
| **Purpose** | Educational tutoring | General-purpose AI assistant |
| **Session Type** | Single session | Dual sessions (general + custom) |
| **Intent Classification** | Routes to different flows | Only for content moderation |
| **System Prompt** | Fixed teaching prompt | Customizable via prompt_id |
| **Agent Creation** | No agent creation | Supports create_agent flag |
| **Response Options** | Includes topic selection UI | Pure text responses |
| **Content Filtering** | Single-stage (zeroshot) | Two-stage (zeroshot + zeroshot2) |
| **Conversation Context** | Last 10 messages | Last 10 messages with system prompt |

---

## 4. External Service Dependencies

### Zeroshot Service
- **URL**: `http://azurekong.hertzai.com:8000/zeroshot3`
- **Timeout**: 10 seconds
- **Purpose**: Intent classification, content moderation
- **Fallback**: Returns default label on failure

### Zeroshot2 Service
- **URL**: `http://azurekong.hertzai.com:8000/zeroshot`
- **Timeout**: 10 seconds
- **Purpose**: Secondary validation for abusive content
- **Used by**: /custom_gpt only

### Vicuna Bot Service
- **URL**: `http://azure_all_vms.hertzai.com:6777/chat`
- **Timeout**: 30 seconds
- **Purpose**: LLM-powered conversational responses
- **Features**:
  - Multi-turn conversations
  - Custom system prompts
  - Agent creation
  - Context management

---

## 5. Session Management Flow

```mermaid
stateDiagram-v2
    [*] --> CheckSession: Request arrives

    CheckSession --> CreateSession: Session doesn't exist<br/>OR state == "end"
    CheckSession --> UpdateSession: Session exists

    CreateSession --> InitializeData: Create new session object
    InitializeData --> Ready: Set state="start"

    UpdateSession --> Ready: Update request_id, timestamp

    Ready --> AddMessage: Add user message to conv_queue
    AddMessage --> ProcessIntent: Classify intent (teachme2)<br/>OR Filter content (custom_gpt)

    ProcessIntent --> GenerateResponse: Route based on classification
    GenerateResponse --> UpdateHistory: Add bot response to conv_queue

    UpdateHistory --> [*]: Return response to client

    note right of CreateSession
        Session Structure:
        - user_id
        - teacher_avatar_id
        - conv_bot_name
        - state ("start", "end")
        - casual_conv_queue (deque, maxlen=10)
        - preffered_lang
        - request_id
        - zeroshot_label
    end note
```

---

## 6. Error Handling & Fallbacks

Both endpoints implement graceful degradation:

1. **External Service Timeout**
   - Zeroshot: Falls back to default label (first in list)
   - Vicuna: Returns stub response or error message

2. **Empty Input**
   - Returns validation error asking for input

3. **Session State**
   - Automatically creates new session if missing or ended
   - Maintains conversation history up to 10 messages

4. **Network Errors**
   - Catches exceptions and logs errors
   - Returns friendly error messages to user
   - Continues operation without crashing
