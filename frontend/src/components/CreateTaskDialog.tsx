import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import ReactSelect, { MultiValue, OnChangeValue } from 'react-select';
import { useBoardStore } from '../store/boardStore';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  columnId: string;
}

interface SelectOption {
  value: string;
  label: string;
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({ open, onClose, columnId }) => {
  const { createTask, assignableUsers } = useBoardStore(state => ({
    createTask: state.createTask,
    assignableUsers: state.assignableUsers,
  }));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(0);
  const [selectedAssignees, setSelectedAssignees] = useState<MultiValue<SelectOption>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map assignableUsers to react-select options
  const assigneeOptions: SelectOption[] = assignableUsers.map(user => ({
    value: user.id,
    label: user.full_name || user.email // Display name or email
  }));

  // Type the change handler for react-select
  const handleAssigneeChange = (selectedOptions: OnChangeValue<SelectOption, true>) => {
    setSelectedAssignees(selectedOptions);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const taskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority: priority,
      // due_date can be added later if needed
    };

    const assigneeIds = selectedAssignees.map(option => option.value);

    try {
      await createTask(columnId, taskData, assigneeIds);
      handleClose(); // Close dialog on success
    } catch (err: unknown) {
      // Attempt to extract a message, default if not possible
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority(0);
    setSelectedAssignees([]);
    setError(null);
    setIsSubmitting(false);
    onClose(); // Call the parent onClose handler
  };

  // Type the change handler for MUI Select
  const handlePriorityChange = (event: SelectChangeEvent<number>) => {
    setPriority(Number(event.target.value));
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Create New Task</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="title"
            label="Task Title"
            name="title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!error && error.includes('Title')} // Basic error check
            disabled={isSubmitting}
          />
          <TextField
            margin="normal"
            fullWidth
            id="description"
            label="Description (Optional)"
            name="description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="priority-label">Priority</InputLabel>
            <MuiSelect
              labelId="priority-label"
              id="priority"
              value={priority}
              label="Priority"
              onChange={handlePriorityChange}
              disabled={isSubmitting}
            >
              <MenuItem value={0}>Low</MenuItem>
              <MenuItem value={1}>Medium</MenuItem>
              <MenuItem value={2}>High</MenuItem>
            </MuiSelect>
          </FormControl>

          {/* Assignee Selection */}
          <FormControl fullWidth margin="normal">
             <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary' }}>Assignees (Optional)</Typography>
             <ReactSelect
                isMulti
                options={assigneeOptions}
                value={selectedAssignees}
                onChange={handleAssigneeChange}
                placeholder="Select assignees..."
                isDisabled={isSubmitting}
                styles={{
                    control: (base) => ({ 
                        ...base, 
                        background: 'transparent',
                        borderColor: 'rgba(0, 0, 0, 0.23)', // Match MUI theme (adapt if theme changes)
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        minHeight: '56px', // Match MUI TextField height
                        '&:hover': { borderColor: 'rgba(0, 0, 0, 0.87)' }
                    }),
                    menu: (base) => ({ ...base, zIndex: 9999, background: '#fff', color: '#000' }), // Light theme menu
                    option: (base, state) => ({
                        ...base,
                        background: state.isFocused ? '#eee' : '#fff',
                        color: '#000',
                         '&:hover': { background: '#eee' }
                    }),
                    multiValue: (base) => ({ ...base, background: 'rgba(0, 0, 0, 0.08)' }),
                    multiValueLabel: (base) => ({ ...base, color: '#000' }),
                    multiValueRemove: (base) => ({ 
                        ...base, 
                        color: 'rgba(0, 0, 0, 0.54)', 
                        '&:hover': { background: 'rgba(0, 0, 0, 0.12)', color: '#000' }
                    }),
                    placeholder: (base) => ({...base, color: 'rgba(0, 0, 0, 0.54)'}),
                    input: (base) => ({...base, color: '#000'}), // Input text color
                    valueContainer: (base) => ({...base, padding: '10px 14px'}), // Adjust padding
                    singleValue: (base) => ({...base, color: '#000'})
                }}
            />
          </FormControl>

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary" 
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 