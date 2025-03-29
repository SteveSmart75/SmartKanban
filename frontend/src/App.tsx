import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  CircularProgress,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { Board } from './components/Board';
import { useAuthStore } from './store/authStore';
import { useBoardStore } from './store/boardStore';
import { CreateBoardDialog } from './components/CreateBoardDialog';
import axios from 'axios';

const drawerWidth = 240;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1DB954', // Spotify green
    },
    background: {
      default: '#121212',
      paper: '#282828',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B3B3B3',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 500,
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
  },
});

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const logout = useAuthStore(state => state.logout);
  const { boards, currentBoard, fetchBoards, selectBoard } = useBoardStore();
  const validateToken = useAuthStore(state => state.validateToken);
  const [showLogin, setShowLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCreateBoardDialog, setOpenCreateBoardDialog] = useState(false);

  const toggleForm = () => {
    setShowLogin(!showLogin);
  };

  const initializeApp = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Validate token
      const isValid = await validateToken();
      if (isValid) {
        // 2. Fetch boards if authenticated
        await fetchBoards();
      }
      setIsInitialized(true);
    } catch (err: unknown) {
      let errorMessage = 'Failed to initialize application';
      if (err instanceof Error) {
        // Use type guard for Axios error properties
        const isAuthError = (axios.isAxiosError(err) && err.response?.status === 401) || err.message === 'No authentication token found';
        if (isAuthError && isAuthenticated) {
          logout(); 
          errorMessage = 'Session expired or invalid. Please log in again.';
        } else {
           errorMessage = err.message; 
        }
      } else {
        console.error("Caught a non-Error object:", err);
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [validateToken, fetchBoards, logout, isAuthenticated]);

  // Run initialization on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Effect to handle re-fetching or re-selecting when auth state changes
  useEffect(() => {
    if (isAuthenticated && !isInitialized && !isLoading) {
        initializeApp();
    } else if (!isAuthenticated) {
        selectBoard(''); 
        setIsInitialized(false);
    }
  }, [isAuthenticated, isInitialized, isLoading, selectBoard, initializeApp]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleOpenCreateBoardDialog = () => {
    setOpenCreateBoardDialog(true);
  };

  const handleCloseCreateBoardDialog = () => {
    setOpenCreateBoardDialog(false);
  };

  const handleClearSession = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    window.location.reload();
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: 'background.default',
            color: 'text.primary',
          }}
        >
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: 'background.default',
            color: 'text.primary',
          }}
        >
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={initializeApp}
              sx={{ bgcolor: '#1DB954', '&:hover': { bgcolor: '#1ed760' } }}
            >
              Retry
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleClearSession}
              sx={{ borderColor: '#1DB954', color: '#1DB954' }}
            >
              Clear Session & Reload
            </Button>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  const drawerContent = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        Boards
      </Typography>
      <List>
        {boards.map((board) => (
          <ListItem key={board.id} disablePadding>
            <ListItemButton 
              selected={currentBoard?.id === board.id}
              onClick={() => selectBoard(board.id)}>
              <ListItemText primary={board.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Button 
        variant="contained" 
        onClick={handleOpenCreateBoardDialog} 
        sx={{ mt: 2, mb: 2 }}
      >
        Create New Board
      </Button>
    </Box>
  );

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {isAuthenticated ? (
          <>
            <AppBar 
              position="fixed"
              sx={{ 
                width: { sm: `calc(100% - ${drawerWidth}px)` },
                ml: { sm: `${drawerWidth}px` },
              }}
            >
              <Toolbar>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2, display: { sm: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" noWrap component="div">
                  {currentBoard ? currentBoard.name : 'Select a Board'}
                </Typography>
                <Box sx={{ flexGrow: 1 }} /> { /* Spacer */ }
                <Button color="inherit" onClick={logout}>
                  Logout
                </Button>
              </Toolbar>
            </AppBar>
            <Box
              component="nav"
              sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
              aria-label="mailbox folders"
            >
              {/* Temporary Drawer for mobile */}
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                  display: { xs: 'block', sm: 'none' },
                  '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
              >
                {drawerContent}
              </Drawer>
              {/* Permanent Drawer for desktop */}
              <Drawer
                variant="permanent"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
                open
              >
                {drawerContent}
              </Drawer>
            </Box>
            <Box
              component="main"
              sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
            >
              <Toolbar /> { /* Spacer for AppBar */ }
              {currentBoard ? (
                <Board boardId={currentBoard.id} />
              ) : (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Typography>Select a board from the left menu, or create a new one.</Typography>
                  <Button 
                    variant="contained" 
                    onClick={handleOpenCreateBoardDialog}
                    sx={{ mt: 2 }}
                  >
                    Create New Board
                  </Button>
                </Box>
              )}
            </Box>
            <CreateBoardDialog 
              open={openCreateBoardDialog} 
              onClose={handleCloseCreateBoardDialog} 
            />
          </>
        ) : (
          showLogin ? (
            <LoginForm onToggleForm={toggleForm} />
          ) : (
            <RegisterForm onToggleForm={toggleForm} />
          )
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
