/* eslint-disable */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

// Mock dependencies
jest.mock('../../assets/images/AgentPoster.png', () => 'agent-poster.png', {virtual: true});

jest.mock('../../pages/OtpAuthModal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => <div data-testid="otp-modal" />,
  };
});

jest.mock('../../components/HART/HARTSpeechPlayer', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => <div data-testid="hart-speech-player" />,
  };
});

jest.mock('lucide-react', () => ({
  ChevronRight: (props) => <svg data-testid="chevron-right" {...props} />,
  Menu: (props) => <svg data-testid="menu-icon" {...props} />,
  Star: (props) => <svg data-testid="star-icon" {...props} />,
  Plus: (props) => <svg data-testid="plus-icon" {...props} />,
  X: (props) => <svg data-testid="x-icon" {...props} />,
}));

import AgentSidebar from '../../pages/chat/AgentSidebar';

const defaultProps = {
  screenWidth: 1024,
  showContent: false,
  onMouseEnterSidebar: jest.fn(),
  onMouseLeaveSidebar: jest.fn(),
  isOpen: false,
  setIsOpen: jest.fn(),
  isAuthenticated: true,
  isGuestMode: false,
  decryptedEmail: 'user@test.com',
  decryptedUserId: 'uid-1',
  token: 'jwt-token',
  isTextMode: false,
  setIsTextMode: jest.fn(),
  isModalOpen: false,
  setIsModalOpen: jest.fn(),
  sessionExpiredMessage: '',
  isLocalRoute: false,
  items: [],
  handleCreateAgentClick: jest.fn(),
  handleButtonClick: jest.fn(),
  handleImgError: jest.fn(),
  setShowAgentsOverlay: jest.fn(),
  LogOutUser: jest.fn(),
  toggleDropdown: jest.fn(),
};

function renderSidebar(overrides = {}) {
  return render(
    <MemoryRouter>
      <AgentSidebar {...defaultProps} {...overrides} />
    </MemoryRouter>
  );
}

describe('AgentSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Desktop sidebar rendering ────────────────────────────────────────────

  it('renders desktop sidebar when screenWidth > 768', () => {
    const {container} = renderSidebar({screenWidth: 1024});
    expect(container.querySelector('.sticky')).toBeInTheDocument();
  });

  it('has overflow-hidden class on desktop sidebar', () => {
    const {container} = renderSidebar({screenWidth: 1024});
    const sidebar = container.querySelector('.overflow-hidden');
    expect(sidebar).toBeInTheDocument();
  });

  it('renders HevolveAI title', () => {
    renderSidebar();
    const titles = screen.getAllByText('HevolveAI');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('renders Create new Agent button', () => {
    renderSidebar({showContent: true});
    const createBtns = screen.getAllByText('Create new Agent');
    expect(createBtns.length).toBeGreaterThan(0);
  });

  // ── Agent list rendering ─────────────────────────────────────────────────

  it('renders agent items in the list', () => {
    renderSidebar({
      showContent: true,
      items: [
        {name: 'Agent Alpha', image_url: 'alpha.png'},
        {name: 'Agent Beta', image_url: 'beta.png'},
      ],
    });
    expect(screen.getAllByText('Agent Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agent Beta').length).toBeGreaterThan(0);
  });

  it('renders agent images with fallback to AgentPoster', () => {
    const {container} = renderSidebar({
      showContent: true,
      items: [{name: 'Agent C'}],
    });
    const imgs = container.querySelectorAll('img[alt="Agent C"]');
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs[0].src).toContain('agent-poster.png');
  });

  // ── Agent selection click ────────────────────────────────────────────────

  it('calls handleButtonClick when agent item is clicked', () => {
    const handleButtonClick = jest.fn();
    renderSidebar({
      showContent: true,
      items: [{name: 'Clickable Agent'}],
      handleButtonClick,
    });
    const agents = screen.getAllByText('Clickable Agent');
    fireEvent.click(agents[0]);
    expect(handleButtonClick).toHaveBeenCalledWith({name: 'Clickable Agent'});
  });

  // ── Hover behavior (showContent) ─────────────────────────────────────────

  it('applies bg-gray-900 class when showContent is true', () => {
    const {container} = renderSidebar({showContent: true});
    const sidebar = container.querySelector('.sticky');
    expect(sidebar.className).toContain('bg-gray-900');
  });

  it('does not apply bg-gray-900 when showContent is false', () => {
    const {container} = renderSidebar({showContent: false});
    const sidebar = container.querySelector('.sticky');
    expect(sidebar.className).not.toContain('bg-gray-900');
  });

  it('overlay becomes opacity-100 when showContent is true', () => {
    const {container} = renderSidebar({showContent: true});
    const overlay = container.querySelector('.opacity-100');
    expect(overlay).toBeInTheDocument();
  });

  it('overlay is opacity-0 when showContent is false', () => {
    const {container} = renderSidebar({showContent: false});
    const overlay = container.querySelector('.opacity-0');
    expect(overlay).toBeInTheDocument();
  });

  // ── Mouse enter/leave ────────────────────────────────────────────────────

  it('calls onMouseEnterSidebar on mouseEnter', () => {
    const onMouseEnterSidebar = jest.fn();
    const {container} = renderSidebar({onMouseEnterSidebar});
    fireEvent.mouseEnter(container.querySelector('.sticky'));
    expect(onMouseEnterSidebar).toHaveBeenCalledTimes(1);
  });

  it('calls onMouseLeaveSidebar on mouseLeave', () => {
    const onMouseLeaveSidebar = jest.fn();
    const {container} = renderSidebar({onMouseLeaveSidebar});
    fireEvent.mouseLeave(container.querySelector('.sticky'));
    expect(onMouseLeaveSidebar).toHaveBeenCalledTimes(1);
  });

  // ── Mobile menu ──────────────────────────────────────────────────────────

  it('renders mobile hamburger button when screenWidth <= 768', () => {
    renderSidebar({screenWidth: 600, isOpen: false});
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });

  it('renders mobile menu panel when isOpen and screenWidth <= 768', () => {
    renderSidebar({screenWidth: 600, isOpen: true});
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    expect(screen.getByText('Recents')).toBeInTheDocument();
  });

  it('calls setIsOpen(true) when hamburger clicked', () => {
    const setIsOpen = jest.fn();
    renderSidebar({screenWidth: 600, isOpen: false, setIsOpen});
    fireEvent.click(screen.getByTestId('menu-icon').closest('button'));
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  it('calls setIsOpen(false) when close X clicked', () => {
    const setIsOpen = jest.fn();
    renderSidebar({screenWidth: 600, isOpen: true, setIsOpen});
    fireEvent.click(screen.getByTestId('x-icon').closest('button'));
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  // ── Authentication state ─────────────────────────────────────────────────

  it('shows email initial in avatar circle', () => {
    renderSidebar({decryptedEmail: 'alice@test.com'});
    const initials = screen.getAllByText('A');
    expect(initials.length).toBeGreaterThan(0);
  });

  it('shows "Welcome! Log in" when not authenticated', () => {
    renderSidebar({
      decryptedEmail: '',
      token: '',
      decryptedUserId: '',
      isGuestMode: false,
    });
    const welcomes = screen.getAllByText('Welcome! Log in');
    expect(welcomes.length).toBeGreaterThan(0);
  });

  // ── View All Agents button ───────────────────────────────────────────────

  it('calls setShowAgentsOverlay when View All Agents is clicked', () => {
    const setShowAgentsOverlay = jest.fn();
    renderSidebar({showContent: true, setShowAgentsOverlay});
    const viewAllBtns = screen.getAllByText('View All Agents');
    fireEvent.click(viewAllBtns[0]);
    expect(setShowAgentsOverlay).toHaveBeenCalledWith(true);
  });
});
