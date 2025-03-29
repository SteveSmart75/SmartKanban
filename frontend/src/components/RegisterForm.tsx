import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert, CircularProgress } from '@mui/material';
import { useAuthStore } from '../store/authStore';

export const RegisterForm: React.FC<{ onToggleForm: () => void }> = ({ onToggleForm }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const register = useAuthStore(state => state.register);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      await register(email, password, fullName);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
    } finally {
      setIsLoading(false);
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
          Create Account
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="fullName"
            label="Full Name"
            name="fullName"
            autoComplete="name"
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
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
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
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
            disabled={isLoading}
            sx={{
              mt: 3,
              mb: 2,
              bgcolor: '#1DB954',
              '&:hover': {
                bgcolor: '#1ed760',
              },
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>
          <Button
            fullWidth
            onClick={onToggleForm}
            disabled={isLoading}
            sx={{
              color: '#B3B3B3',
              '&:hover': {
                color: '#FFFFFF',
              },
            }}
          >
            Already have an account? Sign in
          </Button>
        </Box>
      </Box>
    </Container>
  );
}; 