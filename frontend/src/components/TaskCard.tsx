import React from 'react';
import { Paper, Typography, Box, Avatar, AvatarGroup } from '@mui/material';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  // onDelete: (taskId: string) => void; // Delete handled by dialog for now
}

// Helper to get initials from a name
const getInitials = (name?: string): string => {
  if (!name) return '?';
  const names = name.split(' ');
  if (names.length === 1) return names[0][0].toUpperCase();
  return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit }) => {
  return (
    <Paper 
      elevation={2} 
      sx={{
        p: 1.5,
        mb: 1,
        bgcolor: '#424242',
        color: 'white',
        borderRadius: 1.5,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: '#555555',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        }
      }}
      onClick={() => onEdit(task)} // Open edit dialog on click
    >
      <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {task.title}
      </Typography>
      {task.description && (
        <Typography variant="body2" sx={{ color: 'grey.300', mb: 1 }}>
          {task.description}
        </Typography>
      )}
      {/* Display Assignees */}
      {task.assignees && task.assignees.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
           <AvatarGroup max={4} sx={{ 
                '& .MuiAvatar-root': {
                     width: 28, 
                     height: 28, 
                     fontSize: '0.8rem', 
                     bgcolor: 'primary.main', // Use theme color
                     border: '2px solid #424242' // Match card background
                }
            }}>
            {task.assignees.map(assignee => (
              <Avatar key={assignee.id} alt={assignee.full_name || assignee.email}>
                {getInitials(assignee.full_name || assignee.email)}
              </Avatar>
            ))}
          </AvatarGroup>
        </Box>
      )}
    </Paper>
  );
}; 