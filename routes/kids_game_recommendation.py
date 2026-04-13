"""
Kids Game Recommendation Engine — HARTOS Backend

Mirrors the React Native gameRecommendationEngine.js for server-side
game recommendations. Includes:
  - Game recommendation fleet command handler
  - Engagement detection rules
  - Speech therapy focus areas
  - Concept tracking schema
  - Recommendation scoring algorithm

Fleet command: game_recommendation
WAMP topic: com.hertzai.hevolve.fleet.{deviceId}
"""

import logging
import time
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

kids_recommendation_bp = Blueprint('kids_recommendation', __name__)

# ─── Constants ───────────────────────────────────────────────────────────────

SPACED_REPETITION_INTERVALS = [1, 3, 7, 14, 30]  # days
WEAK_CONCEPT_THRESHOLD = 0.6  # accuracy below this = weak
WEAK_CONCEPT_MIN_ATTEMPTS = 3
RECENT_GAMES_WINDOW = 10
RECOMMENDATIONS_RETURNED = 3
ENGAGEMENT_TIMEOUT_SECONDS = 180  # 3 min no interaction

# ─── Game Template Registry (Server-Side Mirror) ────────────────────────────

TOUCH_TEMPLATES = [
    'multiple-choice', 'drag-to-zone', 'match-pairs', 'sequence-order',
    'word-build', 'fill-blank', 'memory-flip', 'true-false', 'counting',
    'tracing', 'timed-rush', 'puzzle-assemble', 'story-builder',
    'simulation', 'spot-difference',
]

VOICE_TEMPLATES = [
    'voice_spell', 'sound_charades', 'whisper_shout', 'story_weaver',
    'beat_match', 'voice_paint', 'voice-balloon-pop', 'peekaboo',
    'speech-bubble',
]

CANVAS_TEMPLATES = [
    'balloon-pop', 'whack-a-mole', 'catcher', 'flappy-learner',
    'runner-dodge', 'math-castle', 'letter-trace-canvas',
    'paint-by-concept', 'builder', 'word-maze',
]

ALL_TEMPLATES = TOUCH_TEMPLATES + VOICE_TEMPLATES + CANVAS_TEMPLATES

# ─── Speech Therapy Focus Areas ─────────────────────────────────────────────

THERAPY_FOCUS = {
    'articulation': ['voice_spell', 'voice-balloon-pop', 'speech-bubble'],
    'fluency': ['story_weaver', 'beat_match', 'speech-bubble'],
    'voice_control': ['whisper_shout', 'voice_paint', 'sound_charades'],
    'rhythm': ['beat_match', 'sound_charades', 'voice-balloon-pop'],
    'comprehension': ['peekaboo', 'story_weaver', 'voice_spell'],
}

LANGUAGE_LEVELS = {
    'beginner': ['voice-balloon-pop', 'voice_spell', 'peekaboo'],
    'intermediate': ['speech-bubble', 'story_weaver', 'sound_charades'],
    'advanced': ['story_weaver', 'beat_match', 'voice_paint'],
}

# ─── Engagement Detection Rules ─────────────────────────────────────────────

ENGAGEMENT_RULES = {
    'inactive': {
        'threshold': '24h no games',
        'check': lambda stats: (
            stats.get('last_game_time') is not None and
            (datetime.utcnow() - datetime.fromisoformat(stats['last_game_time'])) > timedelta(hours=24)
        ),
        'action': 'suggest_easy_voice_game',
        'message': "I noticed you haven't played in a while. Want to try a fun voice game?",
    },
    'low': {
        'threshold': '<3 games/day',
        'check': lambda stats: stats.get('games_today', 0) < 3,
        'action': 'suggest_targeted_game',
        'message': "Let's play a game that helps with what you're learning!",
    },
    'struggling': {
        'threshold': '<60% accuracy on 3+ attempts',
        'check': lambda stats: (
            stats.get('recent_accuracy', 1.0) < 0.6 and
            stats.get('recent_attempts', 0) >= 3
        ),
        'action': 'suggest_therapy_focus',
        'message': "I have a special game that will help you practice. Let's try it!",
    },
    'new_user': {
        'threshold': '0 games ever',
        'check': lambda stats: stats.get('total_games_played', 0) == 0,
        'action': 'suggest_onboarding_game',
        'message': "Welcome! Let's start with a fun voice game to warm up!",
    },
}

# ─── Concept Tracking Schema ────────────────────────────────────────────────

def create_concept_entry():
    """Create a new concept tracking entry (mirrors mobile schema)."""
    now = datetime.utcnow().isoformat()
    return {
        'firstSeen': now,
        'timesPresented': 0,
        'timesCorrect': 0,
        'correctCount': 0,
        'totalAttempts': 0,
        'nextReviewDate': now,
        'registration': {'registered': False},
        'retention': {'interval': 0},
        'recall': {'lastRecallAccuracy': 0.0},
    }


def update_concept_entry(entry, is_correct):
    """Update a concept entry after an answer."""
    entry['timesPresented'] += 1
    entry['totalAttempts'] += 1
    if is_correct:
        entry['timesCorrect'] += 1
        entry['correctCount'] += 1
        entry['registration']['registered'] = True

    # Spaced repetition
    accuracy = entry['correctCount'] / max(entry['totalAttempts'], 1)
    entry['recall']['lastRecallAccuracy'] = accuracy

    if is_correct:
        interval_idx = min(entry['retention']['interval'], len(SPACED_REPETITION_INTERVALS) - 1)
        days = SPACED_REPETITION_INTERVALS[interval_idx]
        entry['retention']['interval'] = min(entry['retention']['interval'] + 1, len(SPACED_REPETITION_INTERVALS) - 1)
    else:
        days = 1  # Review tomorrow
        entry['retention']['interval'] = 0

    next_review = datetime.utcnow() + timedelta(days=days)
    entry['nextReviewDate'] = next_review.isoformat()

    return entry


def get_weak_concepts(concept_map):
    """Get concepts where accuracy < 60% with 3+ attempts."""
    weak = []
    for key, entry in concept_map.items():
        if entry['totalAttempts'] >= WEAK_CONCEPT_MIN_ATTEMPTS:
            accuracy = entry['correctCount'] / entry['totalAttempts']
            if accuracy < WEAK_CONCEPT_THRESHOLD:
                weak.append({
                    'concept': key,
                    'accuracy': accuracy,
                    'attempts': entry['totalAttempts'],
                })
    return sorted(weak, key=lambda x: x['accuracy'])


def get_due_reviews(concept_map):
    """Get concepts due for spaced repetition review."""
    now = datetime.utcnow()
    due = []
    for key, entry in concept_map.items():
        try:
            review_date = datetime.fromisoformat(entry['nextReviewDate'])
            if review_date <= now:
                due.append({
                    'concept': key,
                    'interval': entry['retention']['interval'],
                    'accuracy': entry['recall']['lastRecallAccuracy'],
                })
        except (ValueError, KeyError):
            continue
    return due

# ─── Recommendation Scoring Algorithm ───────────────────────────────────────

def score_game(game, user_profile):
    """
    Score a game for recommendation. Higher = better fit.

    Score = 10 (base)
      + 5 if game targets user's weak concept category
      + 4 if voice game and preferVoice=true
      + 3 if not played recently (not in last 10)
      - 2 if too advanced for user age group
      + 3 if age-appropriate
    """
    score = 10
    reasons = []

    # Weak concept bonus
    weak_concepts = user_profile.get('weak_concepts', [])
    game_tags = game.get('tags', [])
    game_objectives = game.get('learningObjectives', [])
    for wc in weak_concepts:
        concept_cat = wc.get('concept', '').split(':')[0] if ':' in wc.get('concept', '') else ''
        if concept_cat and (concept_cat in game_tags or concept_cat in game_objectives):
            score += 5
            reasons.append(f"Targets your weak area: {concept_cat}")
            break

    # Voice preference bonus
    if user_profile.get('preferVoice', False) and game.get('template', '') in VOICE_TEMPLATES:
        score += 4
        reasons.append("Voice game matches your preference")

    # Novelty bonus
    recent_ids = user_profile.get('recent_game_ids', [])[-RECENT_GAMES_WINDOW:]
    if game.get('id') not in recent_ids:
        score += 3
        reasons.append("You haven't played this recently")

    # Age appropriateness
    user_age = user_profile.get('age', 7)
    age_range = game.get('ageRange', [3, 12])
    if age_range[0] <= user_age <= age_range[1]:
        score += 3
        reasons.append("Perfect for your age")
    elif user_age < age_range[0]:
        score -= 2
        reasons.append("Might be a bit challenging")

    # Therapy focus bonus
    focus_area = user_profile.get('focusArea')
    if focus_area and focus_area in THERAPY_FOCUS:
        if game.get('template') in THERAPY_FOCUS[focus_area]:
            score += 4
            reasons.append(f"Great for {focus_area} practice")

    return score, reasons


def get_recommendations(games_catalog, user_profile, count=RECOMMENDATIONS_RETURNED):
    """
    Get top-N game recommendations for a user.

    Args:
        games_catalog: list of game config dicts
        user_profile: { age, preferVoice, recent_game_ids, weak_concepts, focusArea, ... }
        count: number of recommendations to return

    Returns:
        list of { game, score, reasons }
    """
    scored = []
    for game in games_catalog:
        game_score, reasons = score_game(game, user_profile)
        scored.append({
            'game': {
                'id': game['id'],
                'title': game.get('title', ''),
                'template': game.get('template', ''),
                'category': game.get('category', ''),
                'difficulty': game.get('difficulty', 1),
                'emoji': game.get('emoji', ''),
                'color': game.get('color', '#6C63FF'),
                'estimatedMinutes': game.get('estimatedMinutes', 3),
            },
            'score': game_score,
            'reasons': reasons,
        })

    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored[:count]


def detect_engagement_level(user_stats):
    """
    Detect user engagement level and return action + message.

    Args:
        user_stats: { last_game_time, games_today, recent_accuracy, recent_attempts, total_games_played }

    Returns:
        { level, action, message } or None if engagement is normal
    """
    for level, rule in ENGAGEMENT_RULES.items():
        try:
            if rule['check'](user_stats):
                return {
                    'level': level,
                    'action': rule['action'],
                    'message': rule['message'],
                }
        except Exception:
            continue
    return None


def build_fleet_command(recommendations, engagement, agent_id='learning_agent_001'):
    """
    Build a game_recommendation fleet command payload.

    This is dispatched via WAMP topic com.hertzai.hevolve.fleet.{deviceId}.
    """
    return {
        'cmd_type': 'game_recommendation',
        'params': {
            'language': 'en',
            'focusArea': engagement.get('focusArea', '') if engagement else '',
            'ageGroup': engagement.get('ageGroup', '3-12') if engagement else '3-12',
            'preferVoice': True,
            'message': engagement['message'] if engagement else 'Check out these games!',
            'agent_id': agent_id,
            'recommendations': recommendations,
            'timestamp': datetime.utcnow().isoformat(),
        },
    }

# ─── API Endpoints ──────────────────────────────────────────────────────────

@kids_recommendation_bp.route('/api/kids/recommendations', methods=['POST'])
def get_game_recommendations():
    """
    Get personalized game recommendations.

    POST body:
      {
        "age": 7,
        "preferVoice": true,
        "recentGameIds": ["id1", "id2"],
        "conceptMap": { "category:concept": { ... } },
        "focusArea": "articulation",
        "gamesPlayed": 15,
        "lastGameTime": "2026-03-31T..."
      }

    Returns:
      {
        "success": true,
        "recommendations": [...],
        "engagement": { "level": "...", "action": "...", "message": "..." }
      }
    """
    try:
        data = request.get_json(silent=True) or {}

        user_profile = {
            'age': data.get('age', 7),
            'preferVoice': data.get('preferVoice', False),
            'recent_game_ids': data.get('recentGameIds', []),
            'weak_concepts': get_weak_concepts(data.get('conceptMap', {})),
            'focusArea': data.get('focusArea'),
        }

        user_stats = {
            'total_games_played': data.get('gamesPlayed', 0),
            'last_game_time': data.get('lastGameTime'),
            'games_today': data.get('gamesToday', 0),
            'recent_accuracy': data.get('recentAccuracy', 1.0),
            'recent_attempts': data.get('recentAttempts', 0),
        }

        # We don't have the full game catalog server-side, but we return
        # template-based recommendations from the voice + therapy focus areas
        template_recommendations = []
        focus = data.get('focusArea')

        if focus and focus in THERAPY_FOCUS:
            for tmpl in THERAPY_FOCUS[focus]:
                template_recommendations.append({
                    'game': {
                        'id': f'recommended-{tmpl}',
                        'title': tmpl.replace('_', ' ').replace('-', ' ').title(),
                        'template': tmpl,
                        'category': 'voice',
                        'difficulty': 1,
                    },
                    'score': 15,
                    'reasons': [f'Great for {focus} practice'],
                })
        else:
            # Default: suggest beginner voice games
            level = 'beginner'
            if user_stats['total_games_played'] > 20:
                level = 'advanced'
            elif user_stats['total_games_played'] > 5:
                level = 'intermediate'

            for tmpl in LANGUAGE_LEVELS.get(level, LANGUAGE_LEVELS['beginner']):
                template_recommendations.append({
                    'game': {
                        'id': f'recommended-{tmpl}',
                        'title': tmpl.replace('_', ' ').replace('-', ' ').title(),
                        'template': tmpl,
                        'category': 'voice',
                        'difficulty': 1,
                    },
                    'score': 12,
                    'reasons': [f'Good for {level} level'],
                })

        engagement = detect_engagement_level(user_stats)

        return jsonify({
            'success': True,
            'recommendations': template_recommendations[:RECOMMENDATIONS_RETURNED],
            'engagement': engagement,
            'therapyFocus': THERAPY_FOCUS,
            'templates': {
                'touch': TOUCH_TEMPLATES,
                'voice': VOICE_TEMPLATES,
                'canvas': CANVAS_TEMPLATES,
            },
        })
    except Exception as e:
        logger.exception('Error getting game recommendations')
        return jsonify({'success': False, 'error': str(e)}), 500


@kids_recommendation_bp.route('/api/kids/concept-tracking', methods=['POST'])
def update_concept_tracking():
    """
    Update concept tracking for a user after answering a question.

    POST body:
      {
        "concept": "voice-spell:cat",
        "isCorrect": true,
        "responseTimeMs": 1200,
        "conceptMap": { ... }   // current concept map
      }

    Returns updated concept entry.
    """
    try:
        data = request.get_json(silent=True) or {}
        concept = data.get('concept', '')
        is_correct = data.get('isCorrect', False)
        concept_map = data.get('conceptMap', {})

        if concept not in concept_map:
            concept_map[concept] = create_concept_entry()

        updated = update_concept_entry(concept_map[concept], is_correct)

        return jsonify({
            'success': True,
            'concept': concept,
            'entry': updated,
            'weakConcepts': get_weak_concepts(concept_map),
            'dueReviews': get_due_reviews(concept_map),
        })
    except Exception as e:
        logger.exception('Error updating concept tracking')
        return jsonify({'success': False, 'error': str(e)}), 500


@kids_recommendation_bp.route('/api/kids/engagement', methods=['POST'])
def check_engagement():
    """
    Check user engagement level and return action recommendation.

    POST body:
      {
        "lastGameTime": "2026-03-31T...",
        "gamesToday": 2,
        "recentAccuracy": 0.45,
        "recentAttempts": 5,
        "totalGamesPlayed": 15
      }
    """
    try:
        data = request.get_json(silent=True) or {}
        user_stats = {
            'last_game_time': data.get('lastGameTime'),
            'games_today': data.get('gamesToday', 0),
            'recent_accuracy': data.get('recentAccuracy', 1.0),
            'recent_attempts': data.get('recentAttempts', 0),
            'total_games_played': data.get('totalGamesPlayed', 0),
        }

        engagement = detect_engagement_level(user_stats)

        return jsonify({
            'success': True,
            'engagement': engagement,
        })
    except Exception as e:
        logger.exception('Error checking engagement')
        return jsonify({'success': False, 'error': str(e)}), 500


@kids_recommendation_bp.route('/api/kids/speech-therapy-focus', methods=['GET'])
def get_speech_therapy_focus():
    """Return speech therapy focus areas and associated game templates."""
    return jsonify({
        'success': True,
        'therapyFocus': THERAPY_FOCUS,
        'languageLevels': LANGUAGE_LEVELS,
        'voiceTemplates': VOICE_TEMPLATES,
    })


@kids_recommendation_bp.route('/api/kids/fleet-command', methods=['POST'])
def create_fleet_command():
    """
    Create a game_recommendation fleet command for dispatch.

    POST body:
      {
        "deviceId": "device_123",
        "agentId": "learning_agent_001",
        "focusArea": "articulation",
        "ageGroup": "3-6",
        "recommendations": [...]
      }

    The command is formatted for WAMP dispatch on:
      com.hertzai.hevolve.fleet.{deviceId}
    """
    try:
        data = request.get_json(silent=True) or {}
        recommendations = data.get('recommendations', [])
        engagement_info = {
            'focusArea': data.get('focusArea', ''),
            'ageGroup': data.get('ageGroup', '3-12'),
            'message': data.get('message', 'Check out these games!'),
        }

        command = build_fleet_command(
            recommendations,
            engagement_info,
            agent_id=data.get('agentId', 'learning_agent_001'),
        )

        # In production, dispatch via WAMP:
        # from crossbar_client import publish
        # publish(f"com.hertzai.hevolve.fleet.{data['deviceId']}", command)

        return jsonify({
            'success': True,
            'command': command,
            'topic': f"com.hertzai.hevolve.fleet.{data.get('deviceId', 'unknown')}",
        })
    except Exception as e:
        logger.exception('Error creating fleet command')
        return jsonify({'success': False, 'error': str(e)}), 500
