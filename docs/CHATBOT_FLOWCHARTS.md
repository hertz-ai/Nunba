# Chatbot API Flowcharts

## 1. /teachme2 Endpoint - Complete Flow

```mermaid
flowchart TD
    Start([Client Request]) --> Extract[Extract Parameters:<br/>user_id, text, teacher_avatar_id,<br/>request_id, video_req, goals, file_id]

    Extract --> CheckSession{Session<br/>Exists?}

    CheckSession -->|No| CreateSession[Create New Session:<br/>state: start<br/>conv_queue: empty deque<br/>preffered_lang: en]
    CheckSession -->|Yes - Check State| CheckState{State ==<br/>end?}

    CheckState -->|Yes| CreateSession
    CheckState -->|No| UpdateSession[Update Session:<br/>request_id<br/>raw_inp]

    CreateSession --> ValidateInput
    UpdateSession --> ValidateInput

    ValidateInput{Input empty<br/>AND no goals?}
    ValidateInput -->|Yes| ErrorEmpty[Return Error Response:<br/>Please enter something<br/>as response]
    ValidateInput -->|No| AddToQueue

    ErrorEmpty --> End([Return to Client])

    AddToQueue[Add user message<br/>to conv_queue] --> CallZeroshot[Call Zeroshot API<br/>with intital_labels]

    CallZeroshot --> ZeroshotSuccess{Zeroshot<br/>responds?}

    ZeroshotSuccess -->|Yes| StoreIntent[Store zeroshot_label<br/>in session]
    ZeroshotSuccess -->|No - Timeout| DefaultIntent[Use default label:<br/>first item in intital_labels]

    DefaultIntent --> StoreIntent

    StoreIntent --> RouteIntent{Check<br/>Intent}

    RouteIntent -->|abusive language| ResponseAbusive[Select random<br/>abusive template:<br/>Please be respectful]
    RouteIntent -->|greet| ResponseGreet[Generate greeting:<br/>Hello! How can I<br/>assist you today?]
    RouteIntent -->|teach me OR learn| ResponseTeach[Create topic selection:<br/>text + options array:<br/>Math, Science, History,<br/>Programming]
    RouteIntent -->|Other intents| CallVicuna[Get conversation<br/>history from session]

    ResponseAbusive --> FormatResponse
    ResponseGreet --> FormatResponse
    ResponseTeach --> FormatResponse

    CallVicuna --> PrepareVicunaRequest[Prepare Vicuna request:<br/>messages from conv_queue<br/>with user_id]

    PrepareVicunaRequest --> VicunaCall[POST to Vicuna API]

    VicunaCall --> VicunaSuccess{Vicuna<br/>responds?}

    VicunaSuccess -->|Yes| VicunaResponse[Extract response text]
    VicunaSuccess -->|No - Timeout| VicunaFallback[Use fallback stub:<br/>Vicuna API not configured]

    VicunaResponse --> AddBotMessage
    VicunaFallback --> AddBotMessage

    AddBotMessage[Add bot response<br/>to conv_queue] --> FormatResponse

    FormatResponse[Format Response JSON:<br/>status: success<br/>text: array<br/>options: array<br/>user_id and request_id<br/>action and bot name<br/>video_req] --> End

    style Start fill:#e1f5e1
    style End fill:#ffe1e1
    style ErrorEmpty fill:#ffcccc
    style RouteIntent fill:#fff4cc
    style CallVicuna fill:#cce5ff
    style FormatResponse fill:#e1f5e1
```

---

## 2. /custom_gpt Endpoint - Complete Flow

```mermaid
flowchart TD
    Start([Client Request]) --> Extract[Extract Parameters:<br/>user_id, text, teacher_avatar_id,<br/>request_id, video_req, create_agent,<br/>prompt_name, file_id, prompt_id, raw_inp]

    Extract --> ValidateInput{Input<br/>empty?}

    ValidateInput -->|Yes| ErrorEmpty[Return Error:<br/>Request cannot be blank]
    ValidateInput -->|No| CheckGeneralSession

    ErrorEmpty --> End([Return to Client])

    CheckGeneralSession{General<br/>session exists?}
    CheckGeneralSession -->|No| CreateGeneral[Create general session<br/>using create_sessions]
    CheckGeneralSession -->|Yes| CheckCustomSession

    CreateGeneral --> CheckCustomSession

    CheckCustomSession{Custom<br/>session exists<br/>OR state not equal end?}

    CheckCustomSession -->|No| CreateCustom[Create custom session:<br/>conv_queue: empty deque<br/>prompt: You are a helpful<br/>AI assistant<br/>prompt_id and file_id<br/>state: start]
    CheckCustomSession -->|Yes| UpdateCustom[Update custom session:<br/>request_id<br/>teacher_avatar_id<br/>file_id]

    CreateCustom --> AddMessage
    UpdateCustom --> AddMessage

    AddMessage[Add user message to<br/>custom conv_queue:<br/>role: user<br/>content: raw_inp or inp] --> PrepareLabels

    PrepareLabels[Prepare content labels:<br/>change language, revision,<br/>topic listing, abusive language,<br/>explain, question, learn,<br/>affirm, goodbye, greet] --> CallZeroshot1

    CallZeroshot1[Call Zeroshot API<br/>for content filtering] --> Zeroshot1Success{Zeroshot<br/>responds?}

    Zeroshot1Success -->|Yes| StoreLabel[Store zeroshot_label]
    Zeroshot1Success -->|No| DefaultLabel[Use default label]

    DefaultLabel --> StoreLabel

    StoreLabel --> CheckAbusive{Label ==<br/>abusive language?}

    CheckAbusive -->|Yes| CallZeroshot2[Call Zeroshot2 API<br/>for double-check]
    CheckAbusive -->|No| BuildRequest

    CallZeroshot2 --> Zeroshot2Success{Zeroshot2<br/>responds?}

    Zeroshot2Success -->|Yes| Zeroshot2Result{Still<br/>abusive?}
    Zeroshot2Success -->|No| BuildRequest

    Zeroshot2Result -->|Yes| ResponseAbusive[Select random<br/>abusive template:<br/>Let us keep the conversation<br/>positive]
    Zeroshot2Result -->|No| BuildRequest

    ResponseAbusive --> FormatResponse

    BuildRequest[Build request_data:<br/>Step 1: System message with<br/>custom prompt<br/>Step 2: All messages from<br/>conv_queue] --> CallVicuna

    CallVicuna[POST to Vicuna API:<br/>messages: request_data<br/>user_id<br/>prompt_id<br/>create_agent: flag<br/>custom_agent: true] --> VicunaSuccess{Vicuna<br/>responds?}

    VicunaSuccess -->|Yes| ExtractResponse[Extract response text<br/>from Vicuna result]
    VicunaSuccess -->|No - Timeout| VicunaFallback[Fallback response:<br/>Need user_id and text<br/>to create agent]

    ExtractResponse --> AddBotMessage
    VicunaFallback --> AddBotMessage

    AddBotMessage[Add bot response to<br/>conv_queue:<br/>role: assistant<br/>content: response] --> FormatResponse

    FormatResponse[Format Response JSON:<br/>status: success<br/>text: array with response<br/>options: empty array<br/>user_id and request_id<br/>action: Custom GPT<br/>video_req] --> End

    style Start fill:#e1f5e1
    style End fill:#ffe1e1
    style ErrorEmpty fill:#ffcccc
    style CheckAbusive fill:#fff4cc
    style CallZeroshot2 fill:#ffddaa
    style BuildRequest fill:#cce5ff
    style FormatResponse fill:#e1f5e1
```

---

## 3. Session Initialization Logic

```mermaid
flowchart TD
    Start([Session Check]) --> CheckExists{Session object<br/>exists for<br/>user_id?}

    CheckExists -->|No| InitNew[Initialize new session object]
    CheckExists -->|Yes| CheckState{session.state<br/>== end?}

    CheckState -->|Yes| InitNew
    CheckState -->|No| UpdateExisting[Update existing session]

    InitNew --> SetDefaults[Set default values:<br/>user_id<br/>teacher_avatar_id<br/>conv_bot_name<br/>topic: empty string<br/>state: start<br/>preffered_lang: en<br/>casual_conv_queue: deque maxlen=10<br/>inside_teachme: False<br/>inside_assessments: False<br/>request_id<br/>file_id]

    SetDefaults --> SaveSession[Save to sessions dict:<br/>sessions with user_id key equals session_obj]

    UpdateExisting --> UpdateFields[Update fields:<br/>request_id<br/>raw_inp<br/>timestamp]

    SaveSession --> Ready([Session Ready])
    UpdateFields --> Ready

    style Start fill:#e1f5e1
    style Ready fill:#e1f5e1
    style InitNew fill:#cce5ff
```

---

## 4. Intent Classification & Routing (/teachme2)

```mermaid
flowchart TD
    Start([Classified Intent]) --> Route{Intent Type}

    Route -->|abusive language| Abusive[Response Type: Warning<br/>Template: Random from abusive array<br/>Options: None<br/>Action: Abusive Language Detected]

    Route -->|greet| Greet[Response Type: Greeting<br/>Text: Hello! I am your teaching<br/>assistant. How can I help you<br/>learn today?<br/>Options: None<br/>Action: Greeting]

    Route -->|teach me| TeachMe[Response Type: Topic Selection<br/>Text: I would love to teach you!<br/>What topic would you like<br/>to learn about?<br/>Options: Math, Science,<br/>History, Programming<br/>Action: Topic Selection]

    Route -->|learn| TeachMe

    Route -->|revise| Revise[Response Type: Revision<br/>Template: Random from revise array<br/>Options: Subject list<br/>Action: Revision Request]

    Route -->|question| Conversation
    Route -->|explain| Conversation
    Route -->|topic listing| TopicList[Call get_list_topics<br/>Response: Topic list from DB<br/>Action: Topic Listing]

    Route -->|goodbye| Goodbye[Response: Farewell message<br/>Update state: end<br/>Action: Goodbye]

    Route -->|Other| Conversation[Route to Vicuna Bot:<br/>Get conversation history<br/>Call vicuna_bot API<br/>Return conversational response<br/>Action: Casual Conversation]

    Abusive --> Return([Return Response])
    Greet --> Return
    TeachMe --> Return
    Revise --> Return
    TopicList --> Return
    Goodbye --> Return
    Conversation --> Return

    style Start fill:#e1f5e1
    style Return fill:#ffe1e1
    style Route fill:#fff4cc
    style Conversation fill:#cce5ff
```

---

## 5. Content Moderation Flow (/custom_gpt)

```mermaid
flowchart TD
    Start([User Input]) --> Stage1[Stage 1: Primary Classification<br/>Call Zeroshot API]

    Stage1 --> Success1{API<br/>Success?}

    Success1 -->|No - Timeout| Default[Use default label:<br/>first item in labels array]
    Success1 -->|Yes| GetLabel[Extract label and score]

    Default --> CheckLabel
    GetLabel --> CheckLabel

    CheckLabel{Label ==<br/>abusive language?}

    CheckLabel -->|No| Safe[Content is safe<br/>Proceed to generate response]

    CheckLabel -->|Yes| Stage2[Stage 2: Secondary Validation<br/>Call Zeroshot2 API<br/>for confirmation]

    Stage2 --> Success2{API<br/>Success?}

    Success2 -->|No - Timeout| Safe
    Success2 -->|Yes| GetLabel2[Extract secondary label]

    GetLabel2 --> DoubleCheck{Secondary label<br/>== abusive<br/>language?}

    DoubleCheck -->|No - False Positive| Safe
    DoubleCheck -->|Yes - Confirmed| Block[Block and warn:<br/>Select random warning<br/>from abusive template<br/>Return warning response]

    Safe --> Continue([Continue Processing])
    Block --> End([Return to Client])

    style Start fill:#e1f5e1
    style End fill:#ffe1e1
    style Safe fill:#ccffcc
    style Block fill:#ffcccc
    style Stage1 fill:#fff4cc
    style Stage2 fill:#ffddaa
```

---

## 6. Conversation Queue Management

```mermaid
flowchart TD
    Start([New Message]) --> GetQueue[Get user's conv_queue<br/>from session<br/>deque maxlen=10]

    GetQueue --> AddUser[Append user message:<br/>role: 'user'<br/>content: user_input]

    AddUser --> CheckSize{Queue<br/>size > 10?}

    CheckSize -->|Yes - Auto-trim| Trim[Deque automatically<br/>removes oldest message<br/>FIFO behavior]
    CheckSize -->|No| BuildContext

    Trim --> BuildContext[Build context for LLM:<br/>Convert deque to list<br/>of message objects]

    BuildContext --> CustomGPT{Endpoint ==<br/>custom_gpt?}

    CustomGPT -->|Yes| AddSystem[Prepend system message:<br/>role: 'system'<br/>content: custom_prompt]
    CustomGPT -->|No| SendToLLM

    AddSystem --> SendToLLM[Send to LLM API:<br/>Vicuna with full context]

    SendToLLM --> GetResponse[Receive LLM response]

    GetResponse --> AddBot[Append bot message:<br/>role: 'assistant'<br/>content: llm_response]

    AddBot --> CheckSize2{Queue<br/>size > 10?}

    CheckSize2 -->|Yes| Trim2[Auto-remove oldest]
    CheckSize2 -->|No| SaveQueue

    Trim2 --> SaveQueue[Save updated queue<br/>to session]

    SaveQueue --> End([Queue Updated])

    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style BuildContext fill:#cce5ff
    style AddSystem fill:#ffe5cc
```

---

## 7. Error Handling Decision Tree

```mermaid
flowchart TD
    Start([Error Occurred]) --> Type{Error Type}

    Type -->|Empty Input| EmptyError[Validate input<br/>before processing]
    Type -->|Session Missing| SessionError[Create new session<br/>with defaults]
    Type -->|Zeroshot Timeout| ZeroshotError[Use default label<br/>Continue processing]
    Type -->|Zeroshot2 Timeout| Zeroshot2Error[Skip secondary check<br/>Assume safe content]
    Type -->|Vicuna Timeout| VicunaError[Use fallback response<br/>or stub message]
    Type -->|Vicuna Error| VicunaError
    Type -->|Database Error| DBError[Log error<br/>Return cached/default data]
    Type -->|Unknown Error| UnknownError[Catch in error_handler<br/>decorator]

    EmptyError --> ValidateResponse[Return validation error:<br/>Ask user for input]
    SessionError --> CreateSession[Initialize new session<br/>Continue normally]
    ZeroshotError --> DefaultIntent[Use first intital_label<br/>Proceed with classification]
    Zeroshot2Error --> SafeContent[Assume content is safe<br/>Proceed to generate response]
    VicunaError --> StubResponse[Return friendly fallback:<br/>I am having trouble...<br/>or configuration message]
    DBError --> DefaultData[Return empty list<br/>or cached data if available]
    UnknownError --> ErrorResponse[Return JSON error:<br/>status: error<br/>message: exception string]

    ValidateResponse --> End([Return to Client])
    CreateSession --> End
    DefaultIntent --> End
    SafeContent --> End
    StubResponse --> End
    DefaultData --> End
    ErrorResponse --> End

    style Start fill:#ffe1e1
    style End fill:#e1f5e1
    style Type fill:#fff4cc
    style SafeContent fill:#ccffcc
    style ErrorResponse fill:#ffcccc
```

---

## 8. Response Formatting Flow

```mermaid
flowchart TD
    Start([Response Data Ready]) --> Endpoint{Which<br/>Endpoint?}

    Endpoint -->|teachme2| TeachmeFormat[Call teachme_response2<br/>async function]
    Endpoint -->|custom_gpt| CustomFormat[Call customgpt_response<br/>async function]

    TeachmeFormat --> BuildTeachme[Build response object:<br/>- status: 'success'<br/>- text: text array<br/>- options: options array<br/>- user_id<br/>- request_id<br/>- action: action type<br/>- bot: 'Teach Yourself'<br/>- video_req<br/>- cartoon_id<br/>- teacher_avatar_id<br/>- lang<br/>- message: stub message]

    CustomFormat --> BuildCustom[Build response object:<br/>- status: 'success'<br/>- text: text array<br/>- options: empty array<br/>- user_id<br/>- request_id<br/>- action: 'Custom GPT'<br/>- video_req<br/>- teacher_avatar_id<br/>- message: stub message]

    BuildTeachme --> ToJSON
    BuildCustom --> ToJSON

    ToJSON[Convert to JSON:<br/>jsonify response object] --> AddHeaders[Flask adds CORS headers:<br/>- Access-Control-Allow-Origin<br/>- Access-Control-Allow-Methods<br/>- Access-Control-Allow-Headers<br/>- Access-Control-Allow-Credentials]

    AddHeaders --> Return([Return HTTP 200<br/>with JSON response])

    style Start fill:#e1f5e1
    style Return fill:#e1f5e1
    style Endpoint fill:#fff4cc
    style BuildTeachme fill:#cce5ff
    style BuildCustom fill:#ffe5cc
```

---

## 9. Complete Request Lifecycle

```mermaid
flowchart TD
    Start([HTTP POST Request]) --> CORS1[CORS Preflight Check<br/>handle_preflight]

    CORS1 --> Route[Flask Route Handler:<br/>/teachme2 or /custom_gpt]

    Route --> ErrorDec[Error Handler Decorator<br/>Wraps function]

    ErrorDec --> TryCatch{Try Block}

    TryCatch -->|Success| MainLogic[Execute Main Logic:<br/>See detailed flowcharts above]
    TryCatch -->|Exception| CatchError[Catch Exception:<br/>Log error details]

    CatchError --> ErrorJSON[Return error JSON:<br/>status: 'error'<br/>message: exception message<br/>HTTP 500]

    MainLogic --> SuccessJSON[Return success JSON:<br/>HTTP 200]

    ErrorJSON --> CORS2
    SuccessJSON --> CORS2

    CORS2[After Request Handler:<br/>Add CORS headers<br/>based on origin] --> LogRequest[Log to werkzeug:<br/>IP, timestamp, status code]

    LogRequest --> End([HTTP Response to Client])

    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style TryCatch fill:#fff4cc
    style ErrorJSON fill:#ffcccc
    style SuccessJSON fill:#ccffcc
```

---

## Summary of Flowchart Types

| Flowchart | Purpose | Key Features |
|-----------|---------|--------------|
| 1. /teachme2 Complete Flow | End-to-end request processing | Shows all decision points and branches |
| 2. /custom_gpt Complete Flow | End-to-end request processing | Includes dual session and two-stage filtering |
| 3. Session Initialization | Session lifecycle management | Create vs update logic |
| 4. Intent Routing | /teachme2 intent handling | All possible intent paths |
| 5. Content Moderation | /custom_gpt filtering | Two-stage validation process |
| 6. Conversation Queue | Message history management | FIFO queue with maxlen=10 |
| 7. Error Handling | Failure scenarios | Graceful degradation strategies |
| 8. Response Formatting | JSON response building | Different formats per endpoint |
| 9. Complete Lifecycle | Full HTTP request cycle | CORS, error handling, logging |
