/**
 * Tests for StatusBar component
 *
 * Demonstrates ink-testing-library usage for testing Ink/TUI components.
 */
import { describe, test, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { StatusBar } from './StatusBar.js';

describe('StatusBar', () => {
  test('renders without crashing', () => {
    const { lastFrame } = render(<StatusBar />);
    expect(lastFrame()).toBeDefined();
  });

  test('displays replmon branding', () => {
    const { lastFrame } = render(<StatusBar />);
    expect(lastFrame()).toContain('replmon');
  });

  test('shows keyboard shortcuts', () => {
    const { lastFrame } = render(<StatusBar />);
    const frame = lastFrame() ?? '';
    // StatusBar should show available key bindings
    expect(frame).toContain('q');  // quit key
  });
});
