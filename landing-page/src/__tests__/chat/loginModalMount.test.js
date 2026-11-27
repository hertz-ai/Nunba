/**
 * "Please login to talk to agent" opens the sign-in modal (2026-11-25).
 *
 * The button only sets isModalOpen.  The one OtpAuthModal lived inside the
 * empty-chat welcome card (drawn only while messages.length === 0), plus a
 * second copy in AgentSidebar, so with restored history the click opened
 * nothing.  The modal is now mounted once, beside ChatInputBar, whenever the
 * person is signed out.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('sign-in modal mount', () => {
  it('Demopage mounts OtpAuthModal once, right after ChatInputBar, while signed out', () => {
    const src = read('pages/Demopage.js');
    const mounts = src.match(/<OtpAuthModal\b/g) || [];
    expect(mounts).toHaveLength(1);
    const bar = src.indexOf('<ChatInputBar');
    const barEnd = src.indexOf('/>', src.indexOf('onToggleShowThinkingTraces=', bar));
    const modal = src.indexOf('<OtpAuthModal');
    expect(bar).toBeGreaterThan(-1);
    expect(modal).toBeGreaterThan(barEnd);
    const between = src.slice(barEnd, modal);
    expect(between).toMatch(/\{!isAuthenticated && \(\s*$/);
    expect(src.slice(modal, src.indexOf('/>', modal))).toMatch(/isOpen=\{isModalOpen\}/);
  });

  it('AgentSidebar does not mount a second modal', () => {
    expect(read('pages/chat/AgentSidebar.js')).not.toMatch(/<OtpAuthModal\b/);
  });
});
