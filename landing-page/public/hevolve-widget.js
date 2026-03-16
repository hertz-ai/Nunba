/* eslint-disable */
(function () {
  // Create the HevolveWidget object with only init exposed globally
  window.HevolveWidget = {
    init: function (userConfig) {
      // Return instance of widget
      return WidgetInstance.init(userConfig);
    },
  };

  // Private widget implementation
  const WidgetInstance = {
    config: {
      agentName: null,
      mode: 'production',
      position: {right: 20, bottom: 20},
      theme: 'light', // 'light' or 'dark'
      width: '350px',
      height: '600px',
      primaryColor: '#6D28D9',
      buttonText: 'Chat with us',
      buttonIcon:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      authToken: null,
      userId: null,
      autoOpen: false,
      delay: 3000,
      embedMode: 'iframe', // 'iframe' or 'standard'
      devServer: 'https://dev.hevolve.hertzai.com',
      accessToken: null,
      emailAddress: null,
      refreshToken: null,
    },
    // DOM elements
    elements: {
      container: null,
      button: null,
      chatWindow: null,
      iframe: null,
      closeButton: null,
    },

    // State
    state: {
      isOpen: false,
      isDragging: false,
      dragOffset: {x: 0, y: 0},
    },

    // Event callbacks
    callbacks: {
      open: [],
      close: [],
      message: [],
    },

    /**
     * Initialize the widget with user configuration
     * @param {Object} userConfig - Configuration options
     */
    init: function (userConfig) {
      // Merge user config with defaults
      this.config = {...this.config, ...userConfig};

      // Validate required config
      if (!this.config.agentName) {
        console.error('Hevolve Widget: agentName is required');
        return this;
      }

      // Create DOM elements
      this.createElements();

      // Attach event listeners
      this.attachEventListeners();

      // Add styles
      this.addStyles();

      console.log('Hevolve Widget initialized:', this.config);

      // Auto open if configured
      if (this.config.autoOpen) {
        setTimeout(() => this.open(), this.config.delay);
      }

      // Return this instance for method chaining
      return this;
    },

    /**
     * Create DOM elements for the widget
     */
    createElements: function () {
      // Create container
      this.elements.container = document.createElement('div');
      this.elements.container.className = 'hevolve-widget-container';

      // Create chat button
      this.elements.button = document.createElement('div');
      this.elements.button.className = 'hevolve-widget-button';
      this.elements.button.innerHTML = this.config.buttonIcon;

      // Create chat window
      this.elements.chatWindow = document.createElement('div');
      this.elements.chatWindow.className = 'hevolve-widget-chat-window';
      this.elements.chatWindow.style.width = this.config.width;
      this.elements.chatWindow.style.height = this.config.height;

      // Create close button
      this.elements.closeButton = document.createElement('div');
      this.elements.closeButton.className = 'hevolve-widget-close-button';
      this.elements.closeButton.innerHTML = '✕';

      // Add to DOM
      this.elements.chatWindow.appendChild(this.elements.closeButton);
      this.elements.container.appendChild(this.elements.button);
      document.body.appendChild(this.elements.container);
      document.body.appendChild(this.elements.chatWindow);

      // Set positions based on config
      this.elements.container.style.right = `${this.config.position.right}px`;
      this.elements.container.style.bottom = `${this.config.position.bottom}px`;
      this.elements.chatWindow.style.right = `${this.config.position.right}px`;
      this.elements.chatWindow.style.bottom = `${
        this.config.position.bottom + 70
      }px`;

      // Initially hide the chat window
      this.elements.chatWindow.style.opacity = '0';
      this.elements.chatWindow.style.visibility = 'hidden';
      this.elements.chatWindow.style.transform = 'translateY(20px)';
    },

    /**
     * Attach event listeners to widget elements
     */
    attachEventListeners: function () {
      // Toggle chat window on button click
      this.elements.button.addEventListener('click', () => {
        this.toggle();
      });

      // Close chat window on close button click
      this.elements.closeButton.addEventListener('click', () => {
        this.close();
      });

      // Make widget draggable
      this.elements.chatWindow.addEventListener('mousedown', (e) => {
        if (
          e.target === this.elements.chatWindow ||
          e.target.classList.contains('hevolve-widget-header')
        ) {
          this.startDrag(e);
        }
      });

      document.addEventListener('mousemove', (e) => {
        if (this.state.isDragging) {
          this.drag(e);
        }
      });

      document.addEventListener('mouseup', () => {
        this.stopDrag();
      });
    },

    /**
     * Add CSS styles to the document
     */
    addStyles: function () {
      const style = document.createElement('style');
      style.textContent = `
          .hevolve-widget-container {
            position: fixed;
            z-index: 9999;
            transition: all 0.3s ease;
          }
          
          .hevolve-widget-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: #6D28D9;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }
          
          .hevolve-widget-button:hover {
            transform: scale(1.05);
          }
          
          .hevolve-widget-chat-window {
            position: fixed;
            width: 350px;
            height: 600px;
            border-radius: 10px;
            bottom: 10px !important;
            background-color: #fff;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            z-index: 9998;
          }
          
          .hevolve-widget-close-button {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            color: #333;
            z-index: 10;
          }
          
          .hevolve-widget-close-button:hover {
            background-color: rgba(255, 255, 255, 1);
          }
          
          .hevolve-widget-header {
            padding: 15px;
            background: black;
            color: white;
            font-weight: bold;
            cursor: move;
          }
          
          .hevolve-widget-iframe {
            flex: 1;
            border: none;
            width: 100%;
            height: 100%;
          }
        `;

      document.head.appendChild(style);
    },

    /**
     * Open the chat window
     */
    open: function () {
      if (this.state.isOpen) return this;

      // Show chat window with animation
      this.elements.chatWindow.style.opacity = '1';
      this.elements.chatWindow.style.visibility = 'visible';
      this.elements.chatWindow.style.transform = 'translateY(0)';

      // Hide the chat button when window is open
      this.elements.button.style.display = 'none';

      // If iframe mode and iframe not created yet
      if (this.config.embedMode === 'iframe' && !this.elements.iframe) {
        this.createIframe();
      }

      // If standard mode and chat interface not created yet
      if (
        this.config.embedMode === 'standard' &&
        !this.elements.chatInterface
      ) {
        this.createChatInterface();
      }

      this.state.isOpen = true;

      this.triggerEvent('open');

      return this;
    },

    /**
     * Close the chat window
     */
    close: function () {
      if (!this.state.isOpen) return this;

      // Hide chat window with animation
      this.elements.chatWindow.style.opacity = '0';
      this.elements.chatWindow.style.visibility = 'hidden';
      this.elements.chatWindow.style.transform = 'translateY(20px)';

      // Show the button again
      this.elements.button.style.display = 'flex';

      this.state.isOpen = false;

      // Trigger close callbacks
      this.triggerEvent('close');

      return this;
    },

    /**
     * Toggle chat window open/close
     */
    toggle: function () {
      if (this.state.isOpen) {
        this.close();
      } else {
        this.open();
      }

      return this;
    },

    /**
     * Create iframe for iframe mode
     */
    createIframe: function () {
      const iframe = document.createElement('iframe');
      iframe.className = 'hevolve-widget-iframe';

      // Construct URL with parameters
      let url = this.getAgentUrl();

      // Set iframe source
      iframe.src = url;

      // Add a header above the iframe for dragging
      const header = document.createElement('div');
      header.className = 'hevolve-widget-header';
      header.textContent = `Chat with ${this.config.agentName}`;

      this.elements.chatWindow.appendChild(header);
      this.elements.chatWindow.appendChild(iframe);
      this.elements.iframe = iframe;

      // Add message event listener for iframe communication
      window.addEventListener('message', (event) => {
        // Verify source if needed
        if (event.data.type === 'hevolve-message') {
          this.triggerEvent('message', event.data);
        }
      });
    },

    /**
     * Create chat interface for standard mode
     */
    createChatInterface: function () {
      const chatInterface = document.createElement('div');
      chatInterface.className = 'hevolve-widget-chat-interface';

      // Add header
      const header = document.createElement('div');
      header.className = 'hevolve-widget-header';
      header.textContent = `Chat with ${this.config.agentName}`;

      // Add messages container
      const messagesContainer = document.createElement('div');
      messagesContainer.className = 'hevolve-widget-chat-messages';

      // Add input area
      const inputArea = document.createElement('div');
      inputArea.className = 'hevolve-widget-chat-input';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Type your message...';

      const sendButton = document.createElement('button');
      sendButton.textContent = 'Send';

      // Add event listener for sending messages
      const sendMessage = () => {
        const text = input.value.trim();
        if (text) {
          this.addMessage(text, 'user');
          input.value = '';

          // TODO: Send message to backend and handle response
          // Simulate a response for now
          setTimeout(() => {
            this.addMessage(
              `I'm ${this.config.agentName}, how can I help you?`,
              'agent'
            );
          }, 1000);
        }
      };

      sendButton.addEventListener('click', sendMessage);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });

      inputArea.appendChild(input);
      inputArea.appendChild(sendButton);

      chatInterface.appendChild(header);
      chatInterface.appendChild(messagesContainer);
      chatInterface.appendChild(inputArea);

      this.elements.chatWindow.appendChild(chatInterface);
      this.elements.chatInterface = chatInterface;
      this.elements.messagesContainer = messagesContainer;
    },

    /**
     * Add a message to the chat interface
     */
    addMessage: function (text, sender) {
      if (!this.elements.messagesContainer) return this;

      const message = document.createElement('div');
      message.className = `hevolve-widget-message ${sender}`;
      message.textContent = text;

      this.elements.messagesContainer.appendChild(message);

      // Scroll to bottom
      this.elements.messagesContainer.scrollTop =
        this.elements.messagesContainer.scrollHeight;

      // Trigger message event
      if (sender === 'user') {
        this.triggerEvent('message', {text, sender});
      }

      return this;
    },

    /**
     * Get the appropriate agent URL based on configuration
     */
    getAgentUrl: function () {
      let baseUrl;

      if (this.config.mode === 'development') {
        baseUrl = this.config.devServer;
      } else {
        baseUrl = 'https://hevolve.hertzai.com';
      }

      let url = `${baseUrl}/agents/${this.config.agentName}`;

      // Add query parameters
      const params = new URLSearchParams();

      if (this.config.authToken) {
        params.set('token', this.config.authToken);
      }

      if (this.config.userId) {
        params.set('user_id', this.config.userId);
      }

      // Add additional parameters if provided
      if (this.config.accessToken) {
        params.set('access_token', this.config.accessToken);
      }

      if (this.config.emailAddress) {
        params.set('email_address', this.config.emailAddress);
      }

      if (this.config.refreshToken) {
        params.set('refresh_token', this.config.refreshToken);
      }

      // Add embed parameter
      params.set('embed', 'true');

      // Add theme
      params.set('theme', this.config.theme);

      // Add companionAppInstalled parameter
      params.set('companionAppInstalled', 'true');

      // Add as query string if there are params
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      return url;
    },

    /**
     * Start dragging the widget
     */
    startDrag: function (e) {
      this.state.isDragging = true;

      const rect = this.elements.chatWindow.getBoundingClientRect();
      this.state.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Add dragging class
      this.elements.chatWindow.classList.add('dragging');

      // Prevent text selection during drag
      e.preventDefault();
    },

    /**
     * Handle dragging motion
     */
    drag: function (e) {
      if (!this.state.isDragging) return;

      const x = e.clientX - this.state.dragOffset.x;
      const y = e.clientY - this.state.dragOffset.y;

      // Apply position
      this.elements.chatWindow.style.left = `${x}px`;
      this.elements.chatWindow.style.top = `${y}px`;

      // Override the default position
      this.elements.chatWindow.style.bottom = 'auto';
      this.elements.chatWindow.style.right = 'auto';
    },

    /**
     * Stop dragging
     */
    stopDrag: function () {
      this.state.isDragging = false;
      this.elements.chatWindow.classList.remove('dragging');
    },

    /**
     * Register event handler
     */
    on: function (event, callback) {
      if (!this.callbacks[event]) {
        console.warn(`Hevolve Widget: Unknown event type '${event}'`);
        return this;
      }

      this.callbacks[event].push(callback);
      return this;
    },

    /**
     * Trigger event callbacks
     */
    triggerEvent: function (event, data) {
      if (!this.callbacks[event]) return;

      this.callbacks[event].forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${event} callback:`, err);
        }
      });
    },

    /**
     * Set user information
     */
    setUser: function (userInfo) {
      this.config.userId = userInfo.id || this.config.userId;

      // If iframe exists, reload it with new user info
      if (this.elements.iframe) {
        this.elements.iframe.src = this.getAgentUrl();
      }

      return this;
    },
  };
})();
