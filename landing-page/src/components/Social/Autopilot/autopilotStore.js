/**
 * Autopilot Store — Tracks user patterns, manages automations, and orchestrates agent dispatch.
 *
 * Architecture:
 *   - Config persisted in localStorage (user-configurable)
 *   - Activity log tracks user behavior (last 500 entries, local-only)
 *   - Agent dispatch: autopilot triggers agents dynamically based on context
 *   - Agents can invoke each other via dispatch chain (games->learning->content)
 *
 * Uses localStorage for persistence, no backend dependency for base features.
 * Agent dispatch is fire-and-forget via /api/social/agent/dispatch endpoint.
 */

const STORE_KEY = 'nunba_autopilot';
const ACTIVITY_KEY = 'nunba_activity_log';

// ── Default Config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  enabled: true,
  // Core automations (toggle on/off)
  dailyDigest: true,
  smartReminders: true,
  healthNudges: true,
  contentCuration: true,
  gameSuggestions: true,
  learningGoals: false,
  agentObservation: false, // opt-in: agent watches behavior for self-critique
  // User preferences
  interests: ['technology', 'education', 'health'],
  // Agent orchestration preferences
  agentMode: 'suggest', // 'suggest' | 'auto' | 'off'
  agentFrequency: 'normal', // 'minimal' | 'normal' | 'frequent'
  // Per-agent toggles (which agents can act autonomously)
  agents: {
    games: true, // suggest games based on activity
    learning: true, // suggest learning content
    content: true, // curate feed content
    wellness: true, // health and wellness nudges
    social: true, // community engagement prompts
    creative: false, // creative challenges (opt-in)
  },
};

// ── Config Management ───────────────────────────────────────────────────────

export function getAutopilotConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY));
    // Merge with defaults to ensure new fields are always present
    return {...DEFAULT_CONFIG, agents: {...DEFAULT_CONFIG.agents}, ...stored};
  } catch {
    return {...DEFAULT_CONFIG};
  }
}

export function saveAutopilotConfig(config) {
  localStorage.setItem(STORE_KEY, JSON.stringify(config));
}

/** Update a single config field without overwriting the rest */
export function updateAutopilotField(key, value) {
  const config = getAutopilotConfig();
  config[key] = value;
  saveAutopilotConfig(config);
  return config;
}

/** Toggle a specific agent on/off */
export function toggleAgent(agentKey) {
  const config = getAutopilotConfig();
  const agents = config.agents || {...DEFAULT_CONFIG.agents};
  agents[agentKey] = !agents[agentKey];
  config.agents = agents;
  saveAutopilotConfig(config);
  return config;
}

// ── Activity Logging ────────────────────────────────────────────────────────

export function logActivity(action, metadata = {}) {
  try {
    const log = JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || [];
    log.push({
      action,
      ...metadata,
      timestamp: new Date().toISOString(),
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
    });
    // Keep last 500 entries
    if (log.length > 500) log.splice(0, log.length - 500);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log));

    // Trigger agent dispatch if autopilot is enabled and action warrants it
    _maybeDispatchAgent(action, metadata);
  } catch (err) {
    console.error('Activity logging failed:', err);
  }
}

// ── Pattern Detection ───────────────────────────────────────────────────────

export function detectPatterns() {
  try {
    const log = JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || [];
    if (log.length < 10) return [];

    const patterns = [];

    // Group by hour of day
    const hourCounts = {};
    const actionsByHour = {};
    log.forEach((entry) => {
      const h = entry.hour;
      hourCounts[h] = (hourCounts[h] || 0) + 1;
      if (!actionsByHour[h]) actionsByHour[h] = {};
      actionsByHour[h][entry.action] =
        (actionsByHour[h][entry.action] || 0) + 1;
    });

    // Find peak activity hours
    const sorted = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const peakHour = parseInt(sorted[0][0]);
      const topAction = actionsByHour[peakHour]
        ? Object.entries(actionsByHour[peakHour]).sort(
            (a, b) => b[1] - a[1]
          )[0]?.[0]
        : null;
      patterns.push({
        type: 'peak_activity',
        hour: peakHour,
        action: topAction,
        message: `You're most active around ${peakHour > 12 ? peakHour - 12 : peakHour}${peakHour >= 12 ? 'pm' : 'am'}${topAction ? ` \u2014 usually ${topAction.replace(/_/g, ' ')}` : ''}`,
        suggestion: topAction
          ? `Want me to prepare your ${topAction.replace(/_/g, ' ')} automatically?`
          : null,
      });
    }

    // Detect repeated searches
    const searches = log
      .filter((e) => e.action === 'search')
      .map((e) => e.query)
      .filter(Boolean);
    const searchCounts = {};
    searches.forEach((q) => {
      searchCounts[q] = (searchCounts[q] || 0) + 1;
    });
    Object.entries(searchCounts)
      .filter(([, c]) => c >= 3)
      .forEach(([query, count]) => {
        patterns.push({
          type: 'repeated_search',
          query,
          count,
          message: `You've searched for "${query}" ${count} times`,
          suggestion: `Want me to track "${query}" and notify you of updates?`,
        });
      });

    // Detect daily routine
    const dayActions = {};
    log.forEach((e) => {
      const day = e.timestamp?.split('T')[0];
      if (day) {
        if (!dayActions[day]) dayActions[day] = new Set();
        dayActions[day].add(e.action);
      }
    });
    const days = Object.keys(dayActions);
    if (days.length >= 3) {
      const actionDayCounts = {};
      days.forEach((d) => {
        dayActions[d].forEach((a) => {
          actionDayCounts[a] = (actionDayCounts[a] || 0) + 1;
        });
      });
      Object.entries(actionDayCounts)
        .filter(([, c]) => c >= Math.ceil(days.length * 0.6))
        .forEach(([action, count]) => {
          patterns.push({
            type: 'daily_routine',
            action,
            frequency: `${count}/${days.length} days`,
            message: `"${action.replace(/_/g, ' ')}" seems to be part of your daily routine`,
            suggestion: `Want me to automate or remind you about this?`,
          });
        });
    }

    // Detect game affinity
    const gameActions = log.filter(
      (e) => e.action === 'game_complete' || e.path?.includes('/games')
    );
    if (gameActions.length >= 5) {
      const categoryCounts = {};
      gameActions.forEach((e) => {
        const cat = e.category || 'general';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      const topCategory = Object.entries(categoryCounts).sort(
        (a, b) => b[1] - a[1]
      )[0];
      if (topCategory) {
        patterns.push({
          type: 'game_affinity',
          category: topCategory[0],
          count: topCategory[1],
          message: `You seem to enjoy ${topCategory[0]} games (${topCategory[1]} sessions)`,
          suggestion: `Try a new ${topCategory[0]} game or explore related categories?`,
          dispatchAgent: 'games',
        });
      }
    }

    return patterns;
  } catch {
    return [];
  }
}

// ── Time-Based Suggestions ──────────────────────────────────────────────────

export const ACTION_ROUTES = {
  daily_digest: '/social',
  view_feed: '/social',
  focus_mode: '/social/tracker',
  kids_learning: '/social/kids',
  view_communities: '/social/communities',
  wellness: '/social/tracker',
  motivation: '/social/resonance',
  encounters: '/social/encounters',
  view_progress: '/social/resonance',
  reflection: '/social/tracker',
  games: '/social/games',
  play_games: '/social/games',
  explore_games: '/social/games',
};

export function getTimeSuggestions() {
  const hour = new Date().getHours();
  const config = getAutopilotConfig();
  const suggestions = [];

  if (hour >= 6 && hour < 9) {
    if (config.dailyDigest)
      suggestions.push({
        icon: '\u{1F305}',
        text: 'Good morning! Ready for your daily digest?',
        action: 'daily_digest',
      });
    suggestions.push({
      icon: '\u{1F4F0}',
      text: 'Check the latest news and updates',
      action: 'view_feed',
    });
  } else if (hour >= 9 && hour < 12) {
    suggestions.push({
      icon: '\u{1F3AF}',
      text: 'Focus time \u2014 tackle your most important task',
      action: 'focus_mode',
    });
    suggestions.push({
      icon: '\u{1F4DA}',
      text: 'Learn something new today',
      action: 'kids_learning',
    });
    if (config.agents?.games)
      suggestions.push({
        icon: '\u{1F3AE}',
        text: 'Quick brain game to sharpen your mind',
        action: 'play_games',
      });
  } else if (hour >= 12 && hour < 14) {
    suggestions.push({
      icon: '\u{1F37D}\u{FE0F}',
      text: 'Lunch break \u2014 catch up with your community',
      action: 'view_communities',
    });
    if (config.healthNudges)
      suggestions.push({
        icon: '\u{1F9D8}',
        text: 'Quick mindfulness break?',
        action: 'wellness',
      });
  } else if (hour >= 14 && hour < 17) {
    suggestions.push({
      icon: '\u{1F4AA}',
      text: "Afternoon push \u2014 you're doing great!",
      action: 'motivation',
    });
    suggestions.push({
      icon: '\u{1F91D}',
      text: 'Connect with someone in your community',
      action: 'encounters',
    });
  } else if (hour >= 17 && hour < 20) {
    suggestions.push({
      icon: '\u{1F307}',
      text: "Wind down \u2014 review your day's progress",
      action: 'view_progress',
    });
    if (config.agents?.games)
      suggestions.push({
        icon: '\u{1F3AE}',
        text: 'Relax with a game',
        action: 'play_games',
      });
  } else {
    suggestions.push({
      icon: '\u{1F319}',
      text: 'Evening reflection \u2014 what did you accomplish today?',
      action: 'reflection',
    });
    suggestions.push({
      icon: '\u{1F4D6}',
      text: 'Light reading from your feed',
      action: 'view_feed',
    });
  }

  return suggestions;
}

// ── Daily Content ───────────────────────────────────────────────────────────

export function getDailyContent() {
  const config = getAutopilotConfig();
  const interests = config.interests || [];

  const tips = [
    {
      title: 'Productivity Tip',
      content:
        'Try the 2-minute rule: if a task takes less than 2 minutes, do it now instead of scheduling it.',
      emoji: '\u{26A1}',
      category: 'productivity',
    },
    {
      title: 'Health Reminder',
      content:
        "You've been active for a while. Remember to stand up, stretch, and hydrate!",
      emoji: '\u{1F9D8}',
      category: 'health',
    },
    {
      title: 'Learning Moment',
      content:
        'Did you know? The human brain can process images 60,000 times faster than text. Visual learning is powerful!',
      emoji: '\u{1F9E0}',
      category: 'education',
    },
    {
      title: 'Community Spotlight',
      content:
        "Engage with your community today \u2014 a simple comment or reaction can make someone's day!",
      emoji: '\u{1F4AC}',
      category: 'community',
    },
    {
      title: 'Creative Spark',
      content:
        'Take 5 minutes to brainstorm one wild idea. The best innovations start as "crazy" thoughts.',
      emoji: '\u{1F4A1}',
      category: 'creativity',
    },
    {
      title: 'Wellness Check',
      content:
        "Rate your energy from 1-10 right now. If it's below 5, consider a short walk or power nap.",
      emoji: '\u{1F50B}',
      category: 'health',
    },
    {
      title: 'Tech Discovery',
      content:
        'Try a new feature in Nunba today \u2014 explore the Games Hub or create your first Thought Experiment!',
      emoji: '\u{1F680}',
      category: 'technology',
    },
    {
      title: 'Game Break',
      content:
        'Challenge a friend to a quick game \u2014 trivia, word scrambles, or classic board games are all waiting in the Games Hub!',
      emoji: '\u{1F3AE}',
      category: 'games',
    },
  ];

  // Prefer tips matching user interests
  const dayIndex = new Date().getDay();
  const interestTips = tips.filter((t) => interests.includes(t.category));
  const pool = interestTips.length > 0 ? interestTips : tips;
  return pool[dayIndex % pool.length];
}

// ── Agent Dispatch System ───────────────────────────────────────────────────

/**
 * Agent Dispatch — Allows agents to dynamically invoke each other.
 *
 * Dispatch chains:
 *   games -> learning: completing games suggests learning content
 *   learning -> content: learning progress triggers curated feed items
 *   content -> social: interesting content suggests community engagement
 *   wellness -> games: wellness nudges can suggest casual games
 *   social -> creative: community interaction suggests creative challenges
 *
 * Each dispatch is fire-and-forget via the backend /api/social/agent/dispatch
 * or handled locally if no backend is available.
 */

const DISPATCH_CHAINS = {
  games: ['learning', 'social'],
  learning: ['content', 'games'],
  content: ['social', 'creative'],
  wellness: ['games'],
  social: ['creative', 'games'],
  creative: ['content', 'social'],
  community: ['content', 'creative', 'social'],
  distributed: ['learning', 'content'],
  marketplace: ['social', 'creative'],
};

/** Dispatch queue to avoid flooding — max 1 dispatch per agent per 5 minutes */
const _dispatchCooldowns = {};
const DISPATCH_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Dispatch an agent action. The agent can optionally chain to related agents.
 *
 * @param {string} agentKey - Which agent to invoke (games, learning, content, etc.)
 * @param {string} action - What the agent should do (suggest, generate, curate, etc.)
 * @param {Object} context - Context data for the agent (scores, preferences, etc.)
 * @param {Object} opts - { chain: true } to auto-chain to related agents
 */
export function dispatchAgent(agentKey, action, context = {}, opts = {}) {
  const config = getAutopilotConfig();

  // Guard: autopilot must be enabled
  if (!config.enabled) return;

  // Guard: this specific agent must be enabled
  if (!config.agents?.[agentKey]) return;

  // Guard: agent mode must allow dispatch
  if (config.agentMode === 'off') return;

  // Guard: cooldown per agent
  const now = Date.now();
  if (
    _dispatchCooldowns[agentKey] &&
    now - _dispatchCooldowns[agentKey] < DISPATCH_COOLDOWN_MS
  )
    return;
  _dispatchCooldowns[agentKey] = now;

  const dispatch = {
    agent: agentKey,
    action,
    context,
    mode: config.agentMode,
    timestamp: new Date().toISOString(),
    ...(agentKey === 'content' || agentKey === 'creative'
      ? {generate_layout: true}
      : {}),
  };

  // Try backend dispatch (fire-and-forget)
  _sendDispatch(dispatch);

  // Store locally for NunbaChatPanel to surface
  _storeLocalDispatch(dispatch);

  // Chain to related agents if enabled
  if (opts.chain && config.agentMode === 'auto') {
    const chainTargets = DISPATCH_CHAINS[agentKey] || [];
    for (const target of chainTargets) {
      if (config.agents?.[target]) {
        // Chained dispatches are always in 'suggest' mode (never auto-auto-auto)
        setTimeout(() => {
          dispatchAgent(target, 'suggest_related', {
            source: agentKey,
            sourceAction: action,
            ...context,
          });
        }, 2000); // Slight delay to avoid burst
      }
    }
  }
}

/** Fire-and-forget backend dispatch */
function _sendDispatch(dispatch) {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  fetch('/api/social/agent/dispatch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dispatch),
    keepalive: true,
  }).catch(() => {}); // silent
}

/** Store dispatch locally so NunbaChatPanel can show suggestions */
function _storeLocalDispatch(dispatch) {
  try {
    const key = 'nunba_agent_dispatches';
    const dispatches = JSON.parse(localStorage.getItem(key)) || [];
    dispatches.push(dispatch);
    // Keep last 20 dispatches
    if (dispatches.length > 20) dispatches.splice(0, dispatches.length - 20);
    localStorage.setItem(key, JSON.stringify(dispatches));
  } catch {
    /* ignore */
  }
}

/** Get pending agent dispatches (for NunbaChatPanel to surface) */
export function getPendingDispatches() {
  try {
    const key = 'nunba_agent_dispatches';
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

/** Clear dispatches after they've been surfaced */
export function clearDispatches() {
  localStorage.removeItem('nunba_agent_dispatches');
}

// ── Internal: Auto-dispatch based on activity ───────────────────────────────

function _maybeDispatchAgent(action, metadata) {
  const config = getAutopilotConfig();
  if (!config.enabled || config.agentMode === 'off') return;

  // HART action -> track streak, dispatch social agent
  if (action === 'hart') {
    _trackHartStreak(config);
  }

  // Post creation -> dispatch content HART to suggest enhancements
  if (action === 'post_create' && config.agents?.content) {
    dispatchAgent('content', 'enhance_post', {
      postId: metadata.postId,
    });
  }

  // 10+ HARTs received -> dispatch social HART to suggest community sharing
  if (
    action === 'hart_received' &&
    metadata.totalHarts >= 10 &&
    config.agents?.social
  ) {
    dispatchAgent('social', 'suggest_share', {
      postId: metadata.postId,
      hartCount: metadata.totalHarts,
    });
  }

  // Achievement unlock -> dispatch creative HART for celebration
  if (action === 'achievement_unlock' && config.agents?.creative) {
    dispatchAgent('creative', 'celebrate', {
      achievement: metadata.achievement,
    });
  }

  // Game completion -> dispatch games agent with chain
  if (action === 'game_complete' && config.agents?.games) {
    dispatchAgent(
      'games',
      'suggest_next',
      {
        gameId: metadata.gameId,
        category: metadata.category,
        score: metadata.score,
      },
      {chain: true}
    );
  }

  // Learning milestone -> dispatch learning agent
  if (action === 'learning_complete' && config.agents?.learning) {
    dispatchAgent(
      'learning',
      'track_progress',
      {
        topic: metadata.topic,
        progress: metadata.progress,
      },
      {chain: true}
    );
  }

  // Community post -> dispatch community chain
  if (action === 'community_post' && config.agents?.content) {
    dispatchAgent(
      'content',
      'community_response',
      {
        communityId: metadata.communityId,
        postId: metadata.postId,
      },
      {chain: false}
    ); // suggest mode only
  }

  // Long session -> dispatch wellness agent
  if (action === 'page_visit') {
    try {
      const log = JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || [];
      const recentVisits = log.filter(
        (e) =>
          e.action === 'page_visit' &&
          new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
      );
      if (recentVisits.length >= 15 && config.agents?.wellness) {
        dispatchAgent('wellness', 'break_reminder', {
          sessionLength: recentVisits.length,
        });
      }
    } catch {
      /* ignore */
    }
  }
}

// ── HART Streak Tracking ──────────────────────────────────────────────────

const HART_STREAK_KEY = 'nunba_hart_streak';

function _trackHartStreak(config) {
  try {
    const data = JSON.parse(localStorage.getItem(HART_STREAK_KEY)) || {
      count: 0,
      date: '',
      sessionCount: 0,
    };
    const today = new Date().toISOString().split('T')[0];

    if (data.date !== today) {
      data.count = 0;
      data.sessionCount = 0;
      data.date = today;
    }

    data.count += 1;
    data.sessionCount += 1;
    localStorage.setItem(HART_STREAK_KEY, JSON.stringify(data));

    // Session milestone: 3 HARTs in a session
    if (data.sessionCount === 3) {
      _storeLocalDispatch({
        agent: 'system',
        action: 'hart_streak_session',
        context: {message: "You're on a HART streak! Keep the love flowing."},
        mode: 'suggest',
        timestamp: new Date().toISOString(),
      });
    }

    // Daily milestone: 10 HARTs in a day -> bonus suggestion
    if (data.count === 10) {
      _storeLocalDispatch({
        agent: 'system',
        action: 'hart_streak_daily',
        context: {message: "10 HARTs today! You've earned a Spark bonus."},
        mode: 'suggest',
        timestamp: new Date().toISOString(),
      });
      // Dispatch social agent to celebrate
      if (config.agents?.social) {
        dispatchAgent('social', 'hart_milestone', {count: 10});
      }
    }
  } catch {
    /* ignore */
  }
}

/** Get current HART streak for display */
export function getHartStreak() {
  try {
    const data = JSON.parse(localStorage.getItem(HART_STREAK_KEY));
    if (!data) return {count: 0, sessionCount: 0};
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) return {count: 0, sessionCount: 0};
    return {count: data.count, sessionCount: data.sessionCount};
  } catch {
    return {count: 0, sessionCount: 0};
  }
}
