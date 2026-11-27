"""The /chat reply this node serves carries the persona HARTOS named.

Owner, 2026-11-25: "my computer desktop is child personna, where are we
showing the persona with agent name to user in chat screen?"  HARTOS's /chat
reply now carries `persona`, the persona of the turn's person in that agent
(design_1125 B; HARTOS hart_intelligence_entry._chat_reply, one reader:
core.flow_progress.persona_of).  This node rebuilds the reply from a fixed
list of keys (routes/chatbot_routes.py), so the page never saw it.  None
named, none passed on.

The harness of tests/test_reel_attachments_passthrough.py: HARTOS's
in-process app is a stand-in answering /chat, reached through the adapter's
own transport; LlamaConfig, the llama health probe, the model gate, server
TTS and the cloud leg are recorded or refused, so no model server is touched.

    python -m pytest tests/test_the_chat_reply_names_its_persona.py -q
"""
from tests.test_reel_attachments_passthrough import (  # noqa: F401
    PHONE_RID, PROMPT_ID, _built, _fresh_sessions, app, client, hartos,
    llama_config, prompts_dir)


def _turn(client):
    return client.post('/chat', json={
        'text': 'ball', 'user_id': '10202', 'prompt_id': PROMPT_ID,
        'request_id': PHONE_RID, 'media_mode': 'text'})


def test_the_persona_hartos_named_reaches_the_page(client, hartos):
    _built(hartos.prompts_dir)
    hartos.state['reply'] = {'response': 'Well done!', 'persona': 'Child'}
    resp = _turn(client)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['text'] == 'Well done!'
    assert body['persona'] == 'Child'


def test_a_reply_that_names_no_persona_gets_none_here(client, hartos):
    _built(hartos.prompts_dir)
    hartos.state['reply'] = {'response': 'Hello!'}
    resp = _turn(client)
    assert resp.status_code == 200
    assert 'persona' not in resp.get_json()
