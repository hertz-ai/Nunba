# Contributing to Nunba

Thanks for looking. This file exists because "we welcome contributions" in a
README is not the same as telling someone where to start, and the second one
is what actually gets a first PR opened.

Nunba is the desktop companion; the agent runtime underneath it lives in
[HARTOS](https://github.com/hertz-ai/HARTOS). A change to how the agent
*thinks* usually belongs there. A change to what the user *sees* belongs here.
If you are unsure, open an issue and we will point you at the right repo
rather than bounce the PR.

## Get it running

```bash
git clone https://github.com/hertz-ai/Nunba.git
cd Nunba
python -m venv .venv && .venv/Scripts/activate    # Windows
# source .venv/bin/activate                       # macOS / Linux
pip install -r requirements.txt
pip install -e ../HARTOS                          # or: pip install hart-backend
cd landing-page && npm install && npm run build && cd ..
python main.py --port 5000
```

First launch downloads models (~6GB) sized to your GPU. On a 6GB card you get
a single model plus Indic Parler; on 8GB+ the draft-first stack.

Tests:

```bash
pytest tests/ -q
```

`tests/conftest_cuda_mock.py` fakes a GPU, so most suites run on a machine
without one. If a test needs real CUDA it says so.

## Where the interesting problems are

Ranked by how much we would like the help, not by difficulty:

- **The auto-evolve loop** (`autoresearch_loop.py` in HARTOS) — turns usage
  into candidate optimisations on the hot path. The open question is
  exploration strategy: escaping local minima without destabilising a model
  someone is mid-conversation with.
- **The constitutional filter** (`hive_guardrails.py`, `cultural_wisdom.py`)
  — every self-improvement passes it before commit. It is deliberately
  load-bearing, and it is where "the agent got worse in a way nobody noticed"
  gets prevented. Adversarial test cases are worth more here than features.
- **Channel adapters** (31 of them in HARTOS) — the most self-contained place
  to start. Each is an inbound → agent → outbound loop, and they break in
  boring, findable ways: reconnect logic, message-type filters, ID mapping.
- **Hardware tiering** — we skip heavy engines on ≤6GB cards. The tier
  boundaries are educated guesses and would benefit from real measurements on
  hardware we do not own.

Good first issues are labelled
[`good first issue`](https://github.com/hertz-ai/Nunba/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## Before you open a PR

- One change per PR. A bug fix and a refactor in one diff take three times as
  long to review and usually get one of them rejected on the other's account.
- Say what breaks if the change is wrong. If nothing does, say that too — it
  tells a reviewer where to spend attention.
- Add a test that fails without your fix. A validator that only ever sees
  malformed input will pass while rejecting everything valid; we shipped
  exactly that bug, so we are particular about this one.
- Run `pytest tests/ -q`. If something unrelated is already failing, say so in
  the PR rather than fixing it silently in the same diff.

We are not strict about commit message format. We are strict about the body
explaining *why*, because the diff already shows *what*.

## Reporting bugs

Include the OS, GPU/VRAM, whether you installed from a release or from source,
and the relevant chunk of the log. Nunba writes logs to
`~/Documents/Nunba/logs/`. A crash before the log file opens is itself useful
information — say so.

Security issues do **not** go in the tracker. See [SECURITY.md](SECURITY.md).

## What we will not merge

- Telemetry, analytics, or anything that phones home. The privacy claim is
  the product; it has to remain checkable by reading the source.
- Anything that makes a cloud provider mandatory. Bring-your-own-key is fine,
  required-key is not.
- Vendored binaries without a build script that reproduces them.

## License

Contributions are accepted under the repository's [LICENSE](LICENSE). By
opening a PR you confirm you have the right to submit the code under it.
