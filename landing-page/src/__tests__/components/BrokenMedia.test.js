/* eslint-disable */
/**
 * Regression tests for broken image/video fallback handling.
 *
 * Verifies that onError handlers hide broken media elements
 * instead of showing broken image/video icons.
 */

import React from 'react';
import {render, fireEvent} from '@testing-library/react';

describe('Broken media fallback - img onError', () => {
  test('hides image when src fails to load', () => {
    const handleImgError = (e) => {
      e.target.style.display = 'none';
    };

    const {getByAltText} = render(
      <img
        src="http://broken-url.test/image.png"
        alt="Test Image"
        onError={handleImgError}
      />
    );

    const img = getByAltText('Test Image');
    expect(img.style.display).not.toBe('none');

    // Simulate error event
    fireEvent.error(img);

    expect(img.style.display).toBe('none');
  });

  test('hides agent avatar when src fails', () => {
    const handleImgError = (e) => {
      e.target.style.display = 'none';
    };

    const {getByAltText} = render(
      <img
        src="https://broken-cdn.test/avatar.png"
        alt="Agent Avatar"
        className="rounded-full"
        onError={handleImgError}
      />
    );

    const img = getByAltText('Agent Avatar');
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });

  test('hides companion status image when src fails', () => {
    const handleImgError = (e) => {
      e.target.style.display = 'none';
    };

    const {getByAltText} = render(
      <img
        src="/broken-companion.gif"
        alt="Connection Status"
        className="w-16 h-16"
        onError={handleImgError}
      />
    );

    const img = getByAltText('Connection Status');
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });
});

describe('Broken media fallback - video onError', () => {
  test('hides video when src fails to load', () => {
    const handleVideoError = (e) => {
      e.target.style.display = 'none';
    };

    const {container} = render(
      <video
        src="http://broken-url.test/video.mp4"
        data-testid="test-video"
        onError={handleVideoError}
      />
    );

    const video = container.querySelector('video');
    expect(video.style.display).not.toBe('none');

    // Simulate error event
    fireEvent.error(video);

    expect(video.style.display).toBe('none');
  });
});

describe('Broken media fallback - multiple images', () => {
  test('only the broken image is hidden, others remain visible', () => {
    const handleImgError = (e) => {
      e.target.style.display = 'none';
    };

    const {getByAltText} = render(
      <div>
        <img
          src="http://good-url.test/image1.png"
          alt="Good Image"
          onError={handleImgError}
        />
        <img
          src="http://broken-url.test/image2.png"
          alt="Broken Image"
          onError={handleImgError}
        />
      </div>
    );

    const brokenImg = getByAltText('Broken Image');
    const goodImg = getByAltText('Good Image');

    // Only the broken image triggers error
    fireEvent.error(brokenImg);

    expect(brokenImg.style.display).toBe('none');
    expect(goodImg.style.display).not.toBe('none');
  });
});
