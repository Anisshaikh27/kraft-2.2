import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('Auth Store (Zustand)', () => {
  beforeEach(() => {
    // Reset store state before every test
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  });

  it('should have initial unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should authenticate correctly with setAuth', () => {
    const mockUser = { id: '1', name: 'Test', email: 'test@example.com' };
    
    useAuthStore.getState().setAuth('mock-token-xyz', mockUser);
    
    const state = useAuthStore.getState();
    expect(state.token).toBe('mock-token-xyz');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should clear authentication on logout', () => {
    const mockUser = { id: '1', name: 'Test', email: 'test@example.com' };
    useAuthStore.getState().setAuth('mock-token-xyz', mockUser);
    
    // Perform logout
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
