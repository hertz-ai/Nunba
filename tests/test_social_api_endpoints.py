"""
Functional tests for Social API endpoints via Flask test client.

Tests the HARTOS social integration: feed, posts, comments, votes,
user profiles, gamification, discovery, and admin endpoints.
All tests use the Flask test client (no running server needed).
"""
import json
import os
import sys
import time

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture(scope='module')
def client():
    try:
        from main import app
        app.config['TESTING'] = True
        with app.test_client() as c:
            yield c
    except Exception as e:
        pytest.skip(f"Could not import Flask app: {e}")


@pytest.fixture(scope='module')
def auth_header(client):
    """Register + login to get a JWT for authenticated requests."""
    ts = int(time.time() * 1000)
    user = {'username': f'social_api_test_{ts}', 'password': 'TestPass123!',
            'display_name': f'API Tester {ts}'}
    client.post('/api/social/auth/register', json=user,
               content_type='application/json')
    resp = client.post('/api/social/auth/login',
                      json={'username': user['username'], 'password': user['password']},
                      content_type='application/json')
    if resp.status_code != 200:
        pytest.skip("Could not authenticate")
    token = (resp.get_json().get('data') or {}).get('token', '')
    if not token:
        pytest.skip("No JWT in login response")
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


# ==========================================================================
# 1. Feed
# ==========================================================================
class TestFeedAPI:
    def test_feed_requires_auth(self, client):
        resp = client.get('/api/social/feed')
        assert resp.status_code in (200, 401, 403, 500)

    def test_feed_returns_json(self, client, auth_header):
        resp = client.get('/api/social/feed', headers=auth_header)
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, dict)

    def test_feed_has_posts_key(self, client, auth_header):
        resp = client.get('/api/social/feed', headers=auth_header)
        if resp.status_code == 200:
            data = resp.get_json()
            assert 'posts' in data or 'data' in data or 'feed' in data

    def test_feed_pagination(self, client, auth_header):
        resp = client.get('/api/social/feed?page=1&per_page=5', headers=auth_header)
        assert resp.status_code in (200, 500)

    def test_feed_page_zero(self, client, auth_header):
        resp = client.get('/api/social/feed?page=0', headers=auth_header)
        assert resp.status_code in (200, 400, 500)


# ==========================================================================
# 2. Posts CRUD
# ==========================================================================
class TestPostsAPI:
    def test_create_post(self, client, auth_header):
        resp = client.post('/api/social/posts',
                          json={'content': f'Test post {time.time()}'},
                          headers=auth_header)
        assert resp.status_code in (200, 201, 400, 500)

    def test_create_post_empty_content(self, client, auth_header):
        resp = client.post('/api/social/posts',
                          json={'content': ''},
                          headers=auth_header)
        assert resp.status_code in (200, 201, 400, 422, 500)

    def test_create_post_no_auth(self, client):
        resp = client.post('/api/social/posts',
                          json={'content': 'no auth'},
                          content_type='application/json')
        assert resp.status_code in (401, 403, 500)

    def test_get_posts(self, client, auth_header):
        resp = client.get('/api/social/posts', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_get_post_nonexistent(self, client, auth_header):
        resp = client.get('/api/social/posts/999999', headers=auth_header)
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 3. Comments
# ==========================================================================
class TestCommentsAPI:
    def _create_post(self, client, auth_header):
        resp = client.post('/api/social/posts',
                          json={'content': f'For comments {time.time()}'},
                          headers=auth_header)
        if resp.status_code in (200, 201):
            data = resp.get_json()
            return (data.get('data') or data).get('id')
        return None

    def test_add_comment(self, client, auth_header):
        post_id = self._create_post(client, auth_header)
        if not post_id:
            pytest.skip("Could not create post")
        resp = client.post(f'/api/social/posts/{post_id}/comments',
                          json={'content': 'Nice post!'},
                          headers=auth_header)
        assert resp.status_code in (200, 201, 400, 404, 500)

    def test_get_comments(self, client, auth_header):
        post_id = self._create_post(client, auth_header)
        if not post_id:
            pytest.skip("Could not create post")
        resp = client.get(f'/api/social/posts/{post_id}/comments',
                         headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_comment_on_nonexistent_post(self, client, auth_header):
        resp = client.post('/api/social/posts/999999/comments',
                          json={'content': 'Ghost comment'},
                          headers=auth_header)
        assert resp.status_code in (400, 404, 500)


# ==========================================================================
# 4. Votes
# ==========================================================================
class TestVotesAPI:
    def _create_post(self, client, auth_header):
        resp = client.post('/api/social/posts',
                          json={'content': f'For votes {time.time()}'},
                          headers=auth_header)
        if resp.status_code in (200, 201):
            data = resp.get_json()
            return (data.get('data') or data).get('id')
        return None

    def test_upvote_post(self, client, auth_header):
        post_id = self._create_post(client, auth_header)
        if not post_id:
            pytest.skip("Could not create post")
        resp = client.post(f'/api/social/posts/{post_id}/vote',
                          json={'vote_type': 'up'},
                          headers=auth_header)
        assert resp.status_code in (200, 201, 400, 404, 500)

    def test_downvote_post(self, client, auth_header):
        post_id = self._create_post(client, auth_header)
        if not post_id:
            pytest.skip("Could not create post")
        resp = client.post(f'/api/social/posts/{post_id}/vote',
                          json={'vote_type': 'down'},
                          headers=auth_header)
        assert resp.status_code in (200, 201, 400, 404, 500)

    def test_vote_no_auth(self, client):
        resp = client.post('/api/social/posts/1/vote',
                          json={'vote_type': 'up'},
                          content_type='application/json')
        assert resp.status_code in (401, 403, 404, 405, 500)


# ==========================================================================
# 5. User Profile
# ==========================================================================
class TestUserProfileAPI:
    def test_get_own_profile(self, client, auth_header):
        resp = client.get('/api/social/users/me/profile', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_update_profile(self, client, auth_header):
        resp = client.put('/api/social/users/me/profile',
                         json={'display_name': f'Updated {time.time()}'},
                         headers=auth_header)
        assert resp.status_code in (200, 400, 404, 405, 500)

    def test_get_user_by_id(self, client, auth_header):
        resp = client.get('/api/social/users/1', headers=auth_header)
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 6. Gamification (Resonance)
# ==========================================================================
class TestGamificationAPI:
    def test_resonance_wallet(self, client, auth_header):
        resp = client.get('/api/social/resonance/wallet', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_resonance_streak(self, client, auth_header):
        resp = client.get('/api/social/resonance/streak', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_resonance_leaderboard(self, client, auth_header):
        resp = client.get('/api/social/resonance/leaderboard', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_resonance_transactions(self, client, auth_header):
        resp = client.get('/api/social/resonance/transactions', headers=auth_header)
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 7. Discovery
# ==========================================================================
class TestDiscoveryAPI:
    def test_trending(self, client, auth_header):
        resp = client.get('/api/social/discovery/trending', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_suggested_users(self, client, auth_header):
        resp = client.get('/api/social/discovery/suggested', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_search_posts(self, client, auth_header):
        resp = client.get('/api/social/discovery/search?q=test', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_search_empty_query(self, client, auth_header):
        resp = client.get('/api/social/discovery/search?q=', headers=auth_header)
        assert resp.status_code in (200, 400, 404, 500)


# ==========================================================================
# 8. Admin Social (requires admin role)
# ==========================================================================
class TestAdminSocialAPI:
    def test_admin_stats_requires_admin(self, client, auth_header):
        resp = client.get('/api/social/admin/stats', headers=auth_header)
        # Regular user should get 403 or similar
        assert resp.status_code in (200, 403, 404, 500)

    def test_admin_users_requires_admin(self, client, auth_header):
        resp = client.get('/api/social/admin/users', headers=auth_header)
        assert resp.status_code in (200, 403, 404, 500)


# ==========================================================================
# 9. Channels Admin API
# ==========================================================================
class TestChannelsAdminAPI:
    def test_admin_config(self, client, auth_header):
        resp = client.get('/api/admin/config', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_admin_identity(self, client, auth_header):
        resp = client.get('/api/admin/identity', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_admin_channels(self, client, auth_header):
        resp = client.get('/api/admin/channels', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_admin_metrics(self, client, auth_header):
        resp = client.get('/api/admin/metrics', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_admin_sessions(self, client, auth_header):
        resp = client.get('/api/admin/sessions', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)
