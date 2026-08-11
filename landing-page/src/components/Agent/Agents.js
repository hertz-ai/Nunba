import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ToastContainer, toast} from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import Footer from '../footer';
import Navbar from '../navbar';

import './agents.css';
import {X, Search, ArrowRight, Sparkles, CloudOff} from 'lucide-react';

import AgentPoster from '../../assets/images/AgentPoster.png';
import {chatApi} from '../../services/socialApi';

// Hevolve brand spectrum: the steward's six hues. Each card is tinted with one
// of these (by grid position) so the gallery reads as a spectrum rather than a
// single monochrome wash. Canonical source: hartResponsive.css (--hv-*).
const SPECTRUM = [
  ['#00E6C3', '0, 230, 195'], // teal
  ['#29C5FF', '41, 197, 255'], // cyan
  ['#3B82F6', '59, 130, 246'], // blue
  ['#9B5CFF', '155, 92, 255'], // violet
  ['#FF2E9A', '255, 46, 154'], // magenta
  ['#FFC83D', '255, 200, 61'], // amber
];

const Agents = ({
  isOverlay = false,
  onClose = () => {},
  onAgentSelect = () => {},
  predefinedAgents = null,
}) => {
  const [agentsData, setAgentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAgents, setFilteredAgents] = useState([]);
  // A failed load is NOT an empty list.  Before this flag existed the catch
  // below only console.error'd, so the page rendered the same "No agents found"
  // copy for "your backend is down" and "you genuinely have zero agents" — the
  // user cannot tell those apart, and one of them is fixable by retrying.
  const [loadError, setLoadError] = useState(false);

  // Lifted out of the effect so the retry CTA can re-run the exact same load
  // path.  A second inline fetch for retry would be a parallel path that drifts.
  const fetchAgents = useCallback(async () => {
    setLoadError(false);
    setLoading(true);
    try {
      if (predefinedAgents && predefinedAgents.length > 0) {
        const validAgents = predefinedAgents.filter(
          (agent) => agent.name && agent.name.trim() !== ''
        );
        setAgentsData(validAgents);
        setFilteredAgents(validAgents);
        return;
      }

      // Otherwise fetch from API
      const res = await chatApi.getPrompts();
      const data = res?.prompts || res?.data?.prompts || res || [];

      // Filter out agents without a name
      const validAgents = (data || []).filter(
        (agent) => agent.name && agent.name.trim() !== ''
      );
      setAgentsData(validAgents);
      setFilteredAgents(validAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setLoadError(true);
      // Leave any previously-loaded list in place rather than blanking it — a
      // failed refresh should not destroy what the user can already see.
    } finally {
      setLoading(false);
    }
  }, [predefinedAgents]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    const filtered = agentsData.filter((agent) =>
      agent.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredAgents(filtered);
  };

  if (loading) {
    return (
      <div
        className={`agents-page agents-loading ${
          isOverlay ? 'text-white px-6 pb-8' : 'min-h-[50vh] px-4'
        }`}
      >
        <div className="agents-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const count = filteredAgents.length;
  const countLabel = `${count} agent${count === 1 ? '' : 's'}`;

  if (isOverlay) {
    return (
      <div
        className="agents-page fixed inset-0 w-full z-50 flex justify-center items-center overflow-y-auto"
        style={{background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)'}}
      >
        <div
          className="rounded-3xl shadow-2xl max-h-[95vh] w-[95vw] max-w-5xl flex flex-col overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, rgba(20,24,32,0.98), rgba(13,17,23,0.98))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="flex justify-between items-center p-5"
            style={{borderBottom: '1px solid rgba(255,255,255,0.07)'}}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">All Agents</h2>
              <span className="agents-search__count" style={{margin: 0}}>
                {countLabel}
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-white rounded-full p-1.5 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex justify-center px-5 pt-4">
            <div className="agents-search">
              <Search className="agents-search__icon" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="agents-search__input"
              />
            </div>
          </div>

          {/* Agents Grid */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="agents-grid">
              {filteredAgents.length === 0 && loadError ? (
                <LoadErrorState onRetry={fetchAgents} />
              ) : filteredAgents.length === 0 ? (
                <EmptyState query={searchQuery} />
              ) : (
                filteredAgents.map((agent, index) => (
                  <AgentCard
                    key={index}
                    agent={agent}
                    index={index}
                    isOverlay={true}
                    onSelect={() => onAgentSelect(agent)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular standalone view
  return (
    <>
      <div className="bg-[#212A31]">
        <Navbar />

        <div className="agents-page min-h-screen bg-[#212A31] pt-28 pb-16">
          {/* Header */}
          <header className="agents-header">
            <span className="agents-header__eyebrow">
              <Sparkles /> HART OS Agents
            </span>
            <h1 className="agents-header__title">Explore Agents</h1>
            <p className="agents-header__subtitle">
              Pick an agent trained for a specific craft and start a
              conversation. Each one learns once, then works for you.
            </p>
          </header>

          {/* Search Bar */}
          <div className="flex flex-col items-center mt-9 mb-1 px-4">
            <div className="agents-search">
              <Search className="agents-search__icon" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="agents-search__input"
              />
            </div>
            {count > 0 && <span className="agents-search__count">{countLabel}</span>}
          </div>

          <div className="max-w-6xl mx-auto px-2">
            <div className="agents-grid">
              {filteredAgents.length === 0 && loadError ? (
                <LoadErrorState onRetry={fetchAgents} />
              ) : filteredAgents.length === 0 ? (
                <EmptyState query={searchQuery} />
              ) : (
                filteredAgents.map((agent, index) => (
                  <AgentCard
                    key={index}
                    agent={agent}
                    index={index}
                    isOverlay={false}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

const SkeletonCard = () => (
  <div className="skeleton-card" aria-hidden="true">
    <div className="skeleton-card__media shimmer" />
    <div className="skeleton-card__body">
      <div className="skeleton-line is-title shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-line is-short shimmer" />
    </div>
  </div>
);

const EmptyState = ({query = ''}) => (
  <div className="agents-empty">
    <div className="agents-empty__icon">
      <Search />
    </div>
    <p className="agents-empty__title">No agents found</p>
    <p className="agents-empty__hint">
      {query
        ? 'Nothing matches that search. Try a different term.'
        : 'No agents are available right now. Check back soon.'}
    </p>
  </div>
);

// Distinguishable sibling of EmptyState: "we could not load" is a different fact
// from "there is nothing to show", and only this one is worth retrying.  Reuses
// the agents-empty* classes so it needs no new CSS and matches the surrounding
// visual language.  role="alert" so screen readers announce the failure instead
// of leaving a silently-empty grid.
const LoadErrorState = ({onRetry}) => (
  <div className="agents-empty" role="alert">
    <div className="agents-empty__icon">
      <CloudOff />
    </div>
    <p className="agents-empty__title">Couldn&apos;t load your agents</p>
    <p className="agents-empty__hint">
      The local backend didn&apos;t respond. Your agents are still there — this is
      a connection problem, not an empty list.
    </p>
    <button type="button" className="agents-empty__retry" onClick={onRetry}>
      Retry
    </button>
  </div>
);

const AgentCard = ({agent, index = 0, isOverlay = false, onSelect = () => {}}) => {
  const navigate = useNavigate();
  const accent = SPECTRUM[index % SPECTRUM.length];

  const handleButtonClick = () => {
    if (isOverlay) {
      onSelect(agent);
      return;
    }

    const agentName = agent.name.replace(/\s+/g, '-');
    navigate(`/agents/${agentName}`, {
      state: {
        agentData: agent,
      },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleButtonClick();
    }
  };

  const description =
    agent.video_text && agent.video_text !== 'This is Static Description'
      ? agent.video_text
      : 'An AI agent ready to help. Tap to start a conversation.';

  return (
    <article
      onClick={handleButtonClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Talk to ${agent.name}`}
      className="agent-card"
      style={{'--accent': accent[0], '--accent-rgb': accent[1]}}
    >
      {/* Media */}
      <div className="agent-card__media">
        <img
          src={agent.teacher_image_url || agent.image_url || AgentPoster}
          className="agent-card__img"
          alt={agent.name}
          loading="lazy"
        />
        <div className="agent-card__scrim" />
        <div className="agent-card__glow" />
      </div>

      {/* Content */}
      <div className="agent-card__body">
        <h3 className="agent-card__name">{agent.name}</h3>
        <p className="agent-card__desc">{description}</p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleButtonClick();
          }}
          className="agent-card__cta"
        >
          <span>Talk to agent</span>
          <ArrowRight />
        </button>
      </div>
    </article>
  );
};

export default Agents;
