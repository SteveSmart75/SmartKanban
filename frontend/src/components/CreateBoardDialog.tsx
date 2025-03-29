import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Box,
  CircularProgress,
  Typography
} from '@mui/material';
import { useBoardStore } from '../store/boardStore';

interface CreateBoardDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CreateBoardDialog: React.FC<CreateBoardDialogProps> = ({ open, onClose }) => {
  const { createBoard } = useBoardStore(state => ({ createBoard: state.createBoard }));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Board name is required');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      await createBoard(name.trim(), description.trim() || undefined);
      handleClose(); // Close dialog on success
    } catch (err: unknown) {
      // Attempt to extract a message, default if not possible
      const message = err instanceof Error ? err.message : 'Failed to create board';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setName('');
    setDescription('');
    setError(null);
    onClose(); // Call the parent onClose handler
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Create New Board</DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Box component="form" noValidate sx={{ mt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            required
            fullWidth
            id="name"
            label="Board Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            error={!name.trim() && !!error} // Show error state if name is empty on submit attempt
          />
          <TextField
            margin="dense"
            fullWidth
            id="description"
            label="Description (Optional)"
            name="description"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isLoading || !name.trim()}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Board'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 