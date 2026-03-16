/**
 * PeerConnectionManager — WebRTC P2P data channel manager for multiplayer games.
 *
 * Provides low-latency peer-to-peer communication using WebRTC data channels.
 * Uses the existing gamesApi session endpoints for signaling (ICE/SDP exchange).
 * Falls back gracefully to server-relayed mode (REST polling) when P2P fails.
 *
 * Architecture:
 *   - Signaling: POST /api/social/games/sessions/:id/move with type='signal'
 *   - Data Channel: unreliable ordered (low latency for game moves)
 *   - Mesh topology: each peer connects to all others (up to 4 players)
 *   - STUN servers: Google public STUN (no TURN needed for most NATs)
 *
 * No external dependencies — uses native RTCPeerConnection API.
 */

const ICE_SERVERS = [
  {urls: 'stun:stun.l.google.com:19302'},
  {urls: 'stun:stun1.l.google.com:19302'},
];

const DATA_CHANNEL_LABEL = 'nunba-game';

export default class PeerConnectionManager {
  constructor({
    sessionId,
    localPlayerId,
    onMessage,
    onPeerConnected,
    onPeerDisconnected,
    signalSend,
  }) {
    this.sessionId = sessionId;
    this.localPlayerId = localPlayerId;
    this.onMessage = onMessage || (() => {});
    this.onPeerConnected = onPeerConnected || (() => {});
    this.onPeerDisconnected = onPeerDisconnected || (() => {});
    this.signalSend = signalSend; // async (peerId, signalData) => void

    /** @type {Map<string, RTCPeerConnection>} */
    this.peers = new Map();
    /** @type {Map<string, RTCDataChannel>} */
    this.channels = new Map();

    this._closed = false;
  }

  /** Check if WebRTC is supported in this browser */
  static isSupported() {
    return typeof RTCPeerConnection !== 'undefined';
  }

  /**
   * Initiate a connection to a remote peer (caller side).
   * Creates an offer and sends it via the signaling channel.
   */
  async connectToPeer(remotePeerId) {
    if (this._closed || this.peers.has(remotePeerId)) return;

    const pc = this._createPeerConnection(remotePeerId);
    this.peers.set(remotePeerId, pc);

    // Create data channel (caller creates it)
    const channel = pc.createDataChannel(DATA_CHANNEL_LABEL, {
      ordered: true,
      maxRetransmits: 3,
    });
    this._setupChannel(channel, remotePeerId);

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await this.signalSend(remotePeerId, {
      type: 'offer',
      sdp: pc.localDescription.sdp,
      from: this.localPlayerId,
    });
  }

  /**
   * Handle an incoming signal message from a remote peer.
   * Processes offers, answers, and ICE candidates.
   */
  async handleSignal(fromPeerId, signal) {
    if (this._closed) return;

    if (signal.type === 'offer') {
      // Callee side: create connection, set remote, create answer
      let pc = this.peers.get(fromPeerId);
      if (!pc) {
        pc = this._createPeerConnection(fromPeerId);
        this.peers.set(fromPeerId, pc);
      }

      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: 'offer',
          sdp: signal.sdp,
        })
      );

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await this.signalSend(fromPeerId, {
        type: 'answer',
        sdp: pc.localDescription.sdp,
        from: this.localPlayerId,
      });
    } else if (signal.type === 'answer') {
      const pc = this.peers.get(fromPeerId);
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: 'answer',
            sdp: signal.sdp,
          })
        );
      }
    } else if (signal.type === 'ice-candidate' && signal.candidate) {
      const pc = this.peers.get(fromPeerId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    }
  }

  /**
   * Send a message to all connected peers via data channels.
   * @param {Object} message - JSON-serializable game message
   * @returns {boolean} true if sent to at least one peer
   */
  broadcast(message) {
    const payload = JSON.stringify({
      ...message,
      from: this.localPlayerId,
      ts: Date.now(),
    });

    let sentCount = 0;
    for (const [peerId, channel] of this.channels) {
      if (channel.readyState === 'open') {
        try {
          channel.send(payload);
          sentCount++;
        } catch (err) {
          console.warn(`P2P send failed to ${peerId}:`, err.message);
        }
      }
    }
    return sentCount > 0;
  }

  /**
   * Send a message to a specific peer.
   */
  sendTo(peerId, message) {
    const channel = this.channels.get(peerId);
    if (channel?.readyState === 'open') {
      channel.send(
        JSON.stringify({
          ...message,
          from: this.localPlayerId,
          ts: Date.now(),
        })
      );
      return true;
    }
    return false;
  }

  /** Number of peers with open data channels */
  get connectedCount() {
    let count = 0;
    for (const channel of this.channels.values()) {
      if (channel.readyState === 'open') count++;
    }
    return count;
  }

  /** Whether any peer has an open data channel */
  get isConnected() {
    return this.connectedCount > 0;
  }

  /** Close all connections and clean up */
  close() {
    this._closed = true;
    for (const channel of this.channels.values()) {
      try {
        channel.close();
      } catch (_) {}
    }
    for (const pc of this.peers.values()) {
      try {
        pc.close();
      } catch (_) {}
    }
    this.peers.clear();
    this.channels.clear();
  }

  // ── Internal ──────────────────────────────────────────────────

  _createPeerConnection(remotePeerId) {
    const pc = new RTCPeerConnection({iceServers: ICE_SERVERS});

    // Send ICE candidates via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && !this._closed) {
        this.signalSend(remotePeerId, {
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
          from: this.localPlayerId,
        }).catch(() => {});
      }
    };

    // Handle data channel from remote (callee receives here)
    pc.ondatachannel = (event) => {
      this._setupChannel(event.channel, remotePeerId);
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed'
      ) {
        this._cleanupPeer(remotePeerId);
      }
    };

    return pc;
  }

  _setupChannel(channel, remotePeerId) {
    channel.onopen = () => {
      this.channels.set(remotePeerId, channel);
      this.onPeerConnected(remotePeerId);
    };

    channel.onclose = () => {
      this.channels.delete(remotePeerId);
      this.onPeerDisconnected(remotePeerId);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage(data, remotePeerId);
      } catch (err) {
        console.warn('P2P message parse error:', err);
      }
    };

    // If already open (rare), trigger immediately
    if (channel.readyState === 'open') {
      this.channels.set(remotePeerId, channel);
      this.onPeerConnected(remotePeerId);
    }
  }

  _cleanupPeer(remotePeerId) {
    const channel = this.channels.get(remotePeerId);
    if (channel) {
      try {
        channel.close();
      } catch (_) {}
      this.channels.delete(remotePeerId);
    }
    const pc = this.peers.get(remotePeerId);
    if (pc) {
      try {
        pc.close();
      } catch (_) {}
      this.peers.delete(remotePeerId);
    }
    this.onPeerDisconnected(remotePeerId);
  }
}
