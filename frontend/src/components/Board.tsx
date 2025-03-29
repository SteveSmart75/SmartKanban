import React, { useEffect, useState, Fragment } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Box, Paper, Typography, CircularProgress, Button, IconButton, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useBoardStore } from '../store/boardStore';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { EditTaskDialog } from './EditTaskDialog';
import { Task } from '../types'; // Removed UserSummary import, Task now includes assignees

interface BoardProps {
  boardId: string;
}

export const Board: React.FC<BoardProps> = ({ boardId }) => {
  const { 
    currentBoard, 
    isLoading, 
    error, 
    fetchBoards, 
    fetchAssignableUsers,
    moveTask, 
    addColumn, 
    deleteColumn, 
    renameColumn, 
    moveColumn 
  } = useBoardStore(state => ({
    currentBoard: state.currentBoard,
    isLoading: state.isLoading,
    error: state.error,
    fetchBoards: state.fetchBoards,
    fetchAssignableUsers: state.fetchAssignableUsers,
    moveTask: state.moveTask,
    addColumn: state.addColumn,
    deleteColumn: state.deleteColumn,
    renameColumn: state.renameColumn,
    moveColumn: state.moveColumn,
  }));

  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [createTaskTargetColumnId, setCreateTaskTargetColumnId] = useState<string | null>(null);

  // State for Edit Task Dialog
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // State for adding a new column
  const [showAddColumnInput, setShowAddColumnInput] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [addColumnError, setAddColumnError] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const [isDeletingColumn, setIsDeletingColumn] = useState(false);

  // State for renaming column
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState<string>('');

  useEffect(() => {
    if (boardId && (!currentBoard || currentBoard.id !== boardId)) {
      fetchBoards();
    }
    fetchAssignableUsers();
  }, [boardId, currentBoard, fetchBoards, fetchAssignableUsers]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) {
      return; // Dropped outside a valid droppable
    }

    // Check if the item was dropped in the same place
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Handle COLUMN drag
    if (type === 'COLUMN' && currentBoard) {
      // Use destination.index for the new position
      moveColumn(currentBoard.id, draggableId, destination.index); 
      return; // Stop processing after handling column move
    }

    // Handle TASK drag (existing logic, ensure type is checked or default)
    if (type === 'DEFAULT' || !type) { // Allow default type for tasks
        const sourceColumnId = source.droppableId;
        const destinationColumnId = destination.droppableId;
        const taskId = draggableId;
        const newIndex = destination.index;
        moveTask(taskId, sourceColumnId, destinationColumnId, newIndex);
    }
  };

  const handleOpenCreateTaskDialog = (columnId: string) => {
    setCreateTaskTargetColumnId(columnId);
    setIsCreateTaskDialogOpen(true);
  };

  const handleCloseCreateTaskDialog = () => {
    setIsCreateTaskDialogOpen(false);
    setCreateTaskTargetColumnId(null);
  };

  // Handlers for Edit Task Dialog
  const handleOpenEditTaskDialog = (task: Task) => {
    setTaskToEdit(task);
    setIsEditTaskDialogOpen(true);
  };

  const handleCloseEditTaskDialog = () => {
    setIsEditTaskDialogOpen(false);
    setTaskToEdit(null);
  };

  const handleAddColumnSubmit = async () => {
    if (!newColumnName.trim() || !currentBoard) return;
    setAddColumnError(null);
    setIsAddingColumn(true);
    try {
      await addColumn(currentBoard.id, newColumnName.trim());
      setNewColumnName(''); 
      setShowAddColumnInput(false);
    } catch (err: unknown) {
        // Attempt to extract a message, default if not possible
        const message = err instanceof Error ? err.message : 'Failed to add column';
        setAddColumnError(message);
    } finally {
        setIsAddingColumn(false);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
      if (!currentBoard) return;
      if (!window.confirm("Are you sure you want to delete this column and all its tasks?")) {
          return;
      }
      setIsDeletingColumn(true);
      setColumnToDelete(columnId);
      try {
          await deleteColumn(currentBoard.id, columnId);
      } catch (err: unknown) {
          // Error is handled and re-thrown by the store, just log here
          console.error("Delete column failed:", err);
      } finally {
          setIsDeletingColumn(false);
          setColumnToDelete(null);
      }
  };

  // --- Column Rename Handlers --- 
  const handleColumnNameClick = (columnId: string, currentName: string) => {
    setEditingColumnId(columnId);
    setEditingColumnName(currentName);
  };

  const handleRenameColumn = async () => {
    if (!editingColumnId || !currentBoard || editingColumnName.trim() === '') return;
    
    const originalColumn = currentBoard.columns.find(c => c.id === editingColumnId);
    if (!originalColumn || originalColumn.name === editingColumnName.trim()) {
        // Name didn't change or column not found, just exit editing mode
        setEditingColumnId(null);
        setEditingColumnName('');
        return; 
    }

    try {
      await renameColumn(currentBoard.id, editingColumnId, editingColumnName.trim());
    } catch (err: unknown) {
        // Error is handled and re-thrown by the store, just log here
        console.error("Rename column failed:", err);
    } finally {
        // Always exit editing mode
        setEditingColumnId(null);
        setEditingColumnName('');
    }
  };

  const handleColumnNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setEditingColumnName(event.target.value);
  };

  const handleColumnNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
          handleRenameColumn();
      } else if (event.key === 'Escape') {
          setEditingColumnId(null);
          setEditingColumnName('');
      }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#121212',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#121212',
          color: '#FFFFFF',
          p: 2,
          gap: 2,
        }}
      >
        <Typography color="error">{error}</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => fetchBoards()}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (!currentBoard) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#121212',
          color: '#FFFFFF',
          p: 2,
          gap: 2,
        }}
      >
        <Typography>No board found</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => fetchBoards()}
        >
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#1f1f1f', color: 'white' }}>
        {/* Board Header (Optional) */}
        {/* <Typography variant="h4" sx={{ p: 2, textAlign: 'center' }}>
          {currentBoard?.name || 'Loading Board...'}
        </Typography> */}

        {/* Columns Area */}
        <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
          {(provided) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{ display: 'flex', overflowX: 'auto', p: 2, flexGrow: 1 }}
            >
              {currentBoard?.columns.map((column, index) => (
                <Draggable key={column.id} draggableId={column.id} index={index}>
                  {(providedDraggable, snapshotDraggable) => (
                      <Paper
                        ref={providedDraggable.innerRef}
                        {...providedDraggable.draggableProps}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: 300,
                          minWidth: 300,
                          maxHeight: 'calc(100vh - 120px)', // Adjust based on header/footer height
                          m: 1,
                          bgcolor: snapshotDraggable.isDragging ? '#424242' : '#303030',
                          borderRadius: 2,
                          boxShadow: snapshotDraggable.isDragging ? '0 4px 12px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      >
                        {/* Column Header with Drag Handle and Title/Input */}
                        <Box 
                          {...providedDraggable.dragHandleProps} 
                          sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              p: '8px 12px',
                              borderBottom: '1px solid #555',
                              cursor: 'grab', // Indicate draggable
                          }}
                        >
                          {editingColumnId === column.id ? (
                            <TextField 
                              value={editingColumnName}
                              onChange={handleColumnNameChange}
                              onBlur={handleRenameColumn} // Save on blur
                              onKeyDown={handleColumnNameKeyDown}
                              variant="standard"
                              autoFocus
                              fullWidth
                              sx={{ 
                                  '& .MuiInputBase-input': { color: 'white', fontSize: '1.1rem', fontWeight: 'bold' },
                                  '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255, 255, 255, 0.7)' },
                                  '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'white' },
                              }}
                            />
                          ) : (
                            <Typography 
                              variant="h6" 
                              sx={{ fontWeight: 'bold', flexGrow: 1, cursor: 'pointer' }}
                              onClick={() => handleColumnNameClick(column.id, column.name)}
                            >
                              {column.name}
                            </Typography>
                          )}
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteColumn(column.id)}
                            disabled={isDeletingColumn && columnToDelete === column.id}
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.7)',
                              '&:hover': { color: 'red' },
                            }}
                          >
                            {isDeletingColumn && columnToDelete === column.id 
                              ? <CircularProgress size={16} color="inherit" /> 
                              : <DeleteIcon fontSize="small" />
                            }
                          </IconButton>
                        </Box>

                        {/* Tasks Area */}
                        <Droppable droppableId={column.id} type="DEFAULT"> 
                          {(providedDroppable, snapshotDroppable) => (
                            <Box
                              ref={providedDroppable.innerRef}
                              {...providedDroppable.droppableProps}
                              sx={{
                                p: 1,
                                overflowY: 'auto',
                                flexGrow: 1,
                                bgcolor: snapshotDroppable.isDraggingOver ? '#3a3a3a' : 'inherit',
                                borderRadius: '0 0 8px 8px' // Match Paper rounding
                              }}
                            >
                              {column.tasks.map((task, taskIndex) => (
                                <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                                  {(providedTask) => (
                                    <Box
                                        ref={providedTask.innerRef}
                                        {...providedTask.draggableProps}
                                        {...providedTask.dragHandleProps}
                                        sx={{ mb: 1 }} // Margin between cards
                                    >
                                       <TaskCard task={task} onEdit={() => handleOpenEditTaskDialog(task)} />
                                    </Box>
                                  )}
                                </Draggable>
                              ))}
                              {providedDroppable.placeholder}
                            </Box>
                          )}
                        </Droppable>

                         {/* Add Task Button */}
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => handleOpenCreateTaskDialog(column.id)}
                          sx={{
                            m: 1,
                            mt: 'auto', // Push to bottom
                            color: 'rgba(255, 255, 255, 0.8)',
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            '&:hover': {
                              borderColor: 'white',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            }
                          }}
                        >
                          Add Task
                        </Button>
                      </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Add Column Button/Input */}
              <Paper sx={{
                  minWidth: 300, 
                  m: 1, 
                  p: 1, 
                  bgcolor: '#303030', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  maxHeight: 'calc(100vh - 120px)', // Match column height
                  height: showAddColumnInput ? 120 : 60, // Adjust height based on input visibility
                  transition: 'height 0.3s ease',
                  borderRadius: 2,
              }}>
                {showAddColumnInput ? (
                  <Fragment>
                    <TextField
                      placeholder="Enter column name..."
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddColumnSubmit()}
                      error={!!addColumnError}
                      helperText={addColumnError}
                      variant="standard"
                      fullWidth
                      autoFocus
                      disabled={isAddingColumn}
                      sx={{ mb: 1, input: { color: 'white' } }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Button 
                        onClick={handleAddColumnSubmit} 
                        disabled={!newColumnName.trim() || isAddingColumn}
                        variant="contained"
                        size="small"
                      >
                        {isAddingColumn ? <CircularProgress size={20} /> : 'Add Column'}
                      </Button>
                      <Button 
                        onClick={() => { setShowAddColumnInput(false); setAddColumnError(null); setNewColumnName(''); }}
                        disabled={isAddingColumn}
                        variant="text"
                        size="small"
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Fragment>
                ) : (
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setShowAddColumnInput(true)}
                    fullWidth
                    sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    Add another column
                  </Button>
                )}
              </Paper>
            </Box>
          )}
        </Droppable>

        {/* Render Create Task Dialog */}
        {createTaskTargetColumnId && (
          <CreateTaskDialog
            open={isCreateTaskDialogOpen}
            onClose={handleCloseCreateTaskDialog}
            columnId={createTaskTargetColumnId}
          />
        )}

        {/* Render Edit Task Dialog */}
        {taskToEdit && (
          <EditTaskDialog
            open={isEditTaskDialogOpen}
            onClose={handleCloseEditTaskDialog}
            task={taskToEdit}
          />
        )}
      </Box>
    </DragDropContext>
  );
}; 