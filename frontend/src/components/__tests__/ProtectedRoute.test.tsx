import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuthStore } from '../../store/authStore';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  });

  it('redirects unauthenticated users to /login', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page Mock</div>} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to login and NOT show secret content
    expect(screen.getByText('Login Page Mock')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    // Authenticate the store
    useAuthStore.setState({
      token: 'fake-jwt',
      user: { id: '1', name: 'Test', email: 't@t.com' },
      isAuthenticated: true
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page Mock</div>} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    // Should show secret content and NOT redirect
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page Mock')).not.toBeInTheDocument();
  });
});
