import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert } from '@mui/material';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

export const LoginForm: React.FC<{ onToggleForm: () => void }> = ({ onToggleForm }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore(state => state.login);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.detail || 'Invalid email or password.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: '#282828',
          padding: 4,
          borderRadius: 2,
        }}
      >
        <Typography component="h1" variant="h5" sx={{ color: '#FFFFFF' }}>
          Sign in
        </Typography>
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }} data-testid="login-form">
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="email-input"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#FFFFFF',
                '& fieldset': {
                  borderColor: '#B3B3B3',
                },
                '&:hover fieldset': {
                  borderColor: '#1DB954',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#B3B3B3',
              },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="password-input"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#FFFFFF',
                '& fieldset': {
                  borderColor: '#B3B3B3',
                },
                '&:hover fieldset': {
                  borderColor: '#1DB954',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#B3B3B3',
              },
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            data-testid="submit-button"
            sx={{
              mt: 3,
              mb: 2,
              bgcolor: '#1DB954',
              '&:hover': {
                bgcolor: '#1ed760',
              },
            }}
          >
            Sign In
          </Button>
          <Button
            fullWidth
            onClick={onToggleForm}
            sx={{
              color: '#B3B3B3',
              '&:hover': {
                color: '#FFFFFF',
              },
            }}
          >
            Don't have an account? Sign up
          </Button>
        </Box>
      </Box>
    </Container>
  );
}; 