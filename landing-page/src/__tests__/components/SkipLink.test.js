/**
 * WCAG 2.4.1 Bypass Blocks: the app shell's "Skip to main content" link.
 *
 * Regression: c9090a39 deleted the link from App.js with no stated reason,
 * and tests/harness/test_family_m_accessibility.py::test_m1 went red. These
 * tests render the real component and drive focus/blur, so a link that
 * exists but never becomes visible (or points at the wrong target) fails.
 */
import SkipLink, {SKIP_LINK_TARGET_ID} from '../../components/shared/SkipLink';

import {render, fireEvent, screen} from '@testing-library/react';
import React from 'react';

describe('SkipLink (WCAG 2.4.1)', () => {
  test('targets the <main id="main-content"> container App.js renders', () => {
    expect(SKIP_LINK_TARGET_ID).toBe('main-content');
    render(<SkipLink />);
    const link = screen.getByRole('link', {name: 'Skip to main content'});
    expect(link.getAttribute('href')).toBe('#main-content');
  });

  test('is off-screen until focused', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', {name: 'Skip to main content'});
    expect(link.style.position).toBe('absolute');
    expect(link.style.left).toBe('-9999px');
  });

  test('becomes visible on keyboard focus and hides again on blur', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', {name: 'Skip to main content'});

    fireEvent.focus(link);
    expect(link.style.position).toBe('fixed');
    expect(link.style.left).toBe('8px');
    expect(link.style.top).toBe('8px');
    expect(link.style.overflow).toBe('visible');

    fireEvent.blur(link);
    expect(link.style.position).toBe('absolute');
    expect(link.style.left).toBe('-9999px');
    expect(link.style.overflow).toBe('hidden');
  });

  test('source guard: App.js mounts it ahead of the titlebar, with the target present', () => {
    // App needs the router and every provider, so check its source order the
    // one way that cannot be faked by the component test above: the link is
    // mounted in App.js and the target id exists there.
    const fs = require('fs');
    const path = require('path');
    const app = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8');
    const skipAt = app.indexOf('<SkipLink />');
    const titleBarAt = app.indexOf('<NunbaTitleBar>');
    expect(skipAt).toBeGreaterThan(-1);
    expect(titleBarAt).toBeGreaterThan(skipAt);
    expect(app).toContain(`<main id="${SKIP_LINK_TARGET_ID}">`);
  });
});
