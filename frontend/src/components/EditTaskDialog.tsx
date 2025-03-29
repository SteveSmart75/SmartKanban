import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
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
import { Task, UserSummary } from '../types';
import { format } from 'date-fns';

interface EditTaskDialogProps {
  open: boolean;
  onClose: () => void;
  task: Task | null; // Task being edited
}

// Re-use SelectOption interface
interface SelectOption {
  value: string;
  label: string;
}

export const EditTaskDialog: React.FC<EditTaskDialogProps> = ({ open, onClose, task }) => {
  const { updateTask, assignableUsers, deleteTask } = useBoardStore(state => ({ 
      updateTask: state.updateTask, 
      assignableUsers: state.assignableUsers,
      deleteTask: state.deleteTask
  }));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>(''); // Store as YYYY-MM-DD string
  const [selectedAssignees, setSelectedAssignees] = useState<MultiValue<SelectOption>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Map assignableUsers to options
  const assigneeOptions: SelectOption[] = assignableUsers.map(user => ({
    value: user.id,
    label: user.full_name || user.email
  }));

  // Wrap handleClose in useCallback
  const handleClose = useCallback((callParentOnClose = true) => { 
    if (isLoading || isDeleting) return;
    setTitle('');
    setDescription('');
    setPriority(0);
    setDueDate('');
    setSelectedAssignees([]);
    setError(null);
    if (callParentOnClose) {
      onClose(); 
    }
  }, [isLoading, isDeleting, onClose]); 

  // Populate form when task prop changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      // Format date from ISO string to YYYY-MM-DD for the input
      setDueDate(task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '');
      // Set initial assignees from the task prop
      const initialAssignees = task.assignees?.map((a: UserSummary) => ({ 
          value: a.id, 
          label: a.full_name || a.email 
      })) || [];
      setSelectedAssignees(initialAssignees);
    } else {
      handleClose(false); 
    }
  }, [task, handleClose]); 

  const handlePriorityChange = (event: SelectChangeEvent<number>) => {
    setPriority(Number(event.target.value));
  };

  // Type the change handler for react-select
  const handleAssigneeChange = (selectedOptions: OnChangeValue<SelectOption, true>) => {
    setSelectedAssignees(selectedOptions);
  };

  const handleSubmit = async () => {
    if (!task) return; // Should not happen if dialog is open
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError(null);
    setIsLoading(true);

    // Prepare task data excluding assignees (handled separately)
    const updatedTaskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority: priority,
      // Convert YYYY-MM-DD string back to ISO string if set, otherwise undefined
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      // Include original column_id and order_index if your update logic needs them
      // column_id: task.column_id,
      // order_index: task.order_index,
    };

    // Get the IDs of selected assignees
    const assigneeIds = selectedAssignees.map(option => option.value);

    try {
      await updateTask(task.id, updatedTaskData, assigneeIds);
      handleClose();
    } catch (err: unknown) {
      // Attempt to extract a message, default if not possible
      const message = err instanceof Error ? err.message : 'Failed to update task';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteTask(task.id);
      handleClose();
    } catch (err: unknown) {
      // Attempt to extract a message, default if not possible
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Don't render if task is null, though parent logic should prevent this
  if (!task) return null; 

  return (
    <Dialog open={open} onClose={() => handleClose()} fullWidth maxWidth="sm">
      <DialogTitle>Edit Task</DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Box component="form" noValidate sx={{ mt: 1 }}>
          <TextField
            autoFocus
            margin="normal"
            required
            fullWidth
            id="title"
            label="Task Title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
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
            disabled={isLoading}
          />
          <FormControl fullWidth margin="normal" disabled={isLoading}>
            <InputLabel id="priority-label">Priority</InputLabel>
            <Select
              labelId="priority-label"
              id="priority"
              value={priority}
              label="Priority"
              onChange={handlePriorityChange}
            >
              <MenuItem value={0}>Low</MenuItem>
              <MenuItem value={1}>Medium</MenuItem>
              <MenuItem value={2}>High</MenuItem>
              {/* Ensure priorities match if more are used */}
              {/* <MenuItem value={3}>Critical</MenuItem> */}
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            id="due-date"
            label="Due Date (Optional)"
            type="date"
            fullWidth
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            disabled={isLoading}
          />
          
          {/* Assignee Selection */}
          <FormControl fullWidth margin="normal">
             <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary' }}>Assignees</Typography>
             <ReactSelect
                isMulti
                options={assigneeOptions}
                value={selectedAssignees}
                onChange={handleAssigneeChange}
                placeholder="Select assignees..."
                isDisabled={isLoading}
                styles={{ /* Same styles as CreateTaskDialog for consistency */ 
                    control: (base) => ({ 
                        ...base, 
                        background: 'transparent',
                        borderColor: 'rgba(0, 0, 0, 0.23)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        minHeight: '56px',
                        '&:hover': { borderColor: 'rgba(0, 0, 0, 0.87)' }
                    }),
                    menu: (base) => ({ ...base, zIndex: 9999, background: '#fff', color: '#000' }), 
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
                    input: (base) => ({...base, color: '#000'}),
                    valueContainer: (base) => ({...base, padding: '10px 14px'}),
                    singleValue: (base) => ({...base, color: '#000'})
                }}
            />
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button 
          onClick={handleDelete} 
          color="error" 
          variant="outlined" 
          disabled={isLoading || isDeleting}
          sx={{ mr: 'auto' }}
        >
          {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Delete Task'}
        </Button>
        <Box>
          <Button onClick={() => handleClose()} disabled={isLoading || isDeleting}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={isLoading || isDeleting || !title.trim()} sx={{ ml: 1 }}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}; 