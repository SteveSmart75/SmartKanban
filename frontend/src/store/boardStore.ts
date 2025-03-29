import { create } from 'zustand';
import axios, { isAxiosError } from 'axios';
import { useAuthStore } from './authStore';

// Added UserSummary interface
interface UserSummary {
  id: string;
  email: string;
  full_name?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: number;
  order_index: number;
  column_id: string;
  assignees: UserSummary[]; // Added assignees
}

interface Column {
  id: string;
  name: string;
  order_index: number;
  tasks: Task[];
}

interface Board {
  id: string;
  name: string;
  description?: string;
  columns: Column[];
}

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  isLoading: boolean;
  error: string | null;
  assignableUsers: UserSummary[]; // Added state for assignable users
  fetchBoards: () => Promise<void>;
  fetchAssignableUsers: () => Promise<void>; // Added action definition
  createBoard: (name: string, description?: string) => Promise<void>;
  // Updated createTask signature
  createTask: (columnId: string, taskData: Partial<Omit<Task, 'id' | 'assignees' | 'column_id'>>, assigneeIds?: string[]) => Promise<void>; 
  moveTask: (taskId: string, sourceColumnId: string, destinationColumnId: string, newIndex: number) => Promise<void>;
  // Updated updateTask signature
  updateTask: (taskId: string, updatedData: Partial<Omit<Task, 'id' | 'assignees' | 'column_id'>>, assigneeIds?: string[]) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addColumn: (boardId: string, columnName: string) => Promise<void>;
  deleteColumn: (boardId: string, columnId: string) => Promise<void>;
  renameColumn: (boardId: string, columnId: string, newName: string) => Promise<void>;
  moveColumn: (boardId: string, columnId: string, newIndex: number) => Promise<void>;
  selectBoard: (boardId: string) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoard: null,
  isLoading: false,
  error: null,
  assignableUsers: [], // Initialized assignableUsers state
  
  fetchBoards: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('http://localhost:8000/api/v1/boards/', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (Array.isArray(response.data)) {
        const fetchedBoards: Board[] = response.data.map(board => ({
          ...board,
          // Ensure tasks have assignees array, even if empty from backend
          columns: board.columns.map((col: Column) => ({
            ...col,
            tasks: col.tasks.map((task: Task) => ({ ...task, assignees: task.assignees || [] }))
          }))
        }));

        const initialBoard = fetchedBoards.length > 0 ? fetchedBoards[0] : null;
        set({ 
          boards: fetchedBoards,
          currentBoard: initialBoard,
          isLoading: false,
          error: null
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: unknown) {
      let errorMessage = 'Failed to load boards';
      if (isAxiosError(error) && error.response?.status === 401) {
        useAuthStore.getState().logout();
        errorMessage = 'Session expired. Please log in again.';
        set({ boards: [], currentBoard: null }); // Clear board data on auth error
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      set({ error: errorMessage, isLoading: false });
    }
  },

  // Added fetchAssignableUsers implementation
  fetchAssignableUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get<UserSummary[]>('http://localhost:8000/api/v1/users/assignable', {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ assignableUsers: response.data, isLoading: false });
    } catch (error: unknown) {
      console.error("Failed to fetch assignable users:", error);
      const message = error instanceof Error ? error.message : 'Failed to load assignable users';
      set({ error: message, isLoading: false, assignableUsers: [] });
    }
  },

  createBoard: async (name: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        'http://localhost:8000/api/v1/boards/',
        { 
          name, 
          description, 
          columns: [
            { name: 'To Do', order_index: 0 },
            { name: 'In Progress', order_index: 1 },
            { name: 'Done', order_index: 2 }
          ] 
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      const newBoard = response.data;
      set({ 
        boards: [...get().boards, newBoard],
        currentBoard: newBoard
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create board';
      set({ error: message });
      throw error; // Re-throw for component
    } finally {
      set({ isLoading: false });
    }
  },

  // Updated createTask implementation
  createTask: async (columnId: string, taskData: Partial<Omit<Task, 'id' | 'assignees' | 'column_id'>>, assigneeIds?: string[]) => {
    set({ isLoading: true, error: null });
    const { currentBoard, boards } = get();
    if (!currentBoard) {
      set({ error: "No board selected", isLoading: false });
      return;
    }
    // Store original state for rollback
    const originalBoard = JSON.parse(JSON.stringify(currentBoard));
    const originalBoards = JSON.parse(JSON.stringify(boards));

    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiTaskData = {
        ...taskData,
        column_id: columnId,
        assignee_ids: assigneeIds, // Include assignee IDs
      };

      const response = await axios.post<Task>(
        'http://localhost:8000/api/v1/tasks/',
        apiTaskData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      const newTask = response.data; // API now returns the task with assignees populated
      
      // --- Update State (using API response) --- 
      const updatedColumns = currentBoard.columns.map(column => {
        if (column.id === columnId) {
          // Ensure tasks array exists and add the new task
          const existingTasks = column.tasks || []; 
          return {
            ...column,
            // Add the new task and ensure assignees array is present
            tasks: [...existingTasks, { ...newTask, assignees: newTask.assignees || [] }]
                    .sort((a, b) => a.order_index - b.order_index) // Ensure order is maintained
          };
        }
        return column;
      });
      
      const updatedBoard = {
        ...currentBoard,
        columns: updatedColumns
      };
      
      set({
        boards: boards.map(b => b.id === currentBoard.id ? updatedBoard : b),
        currentBoard: updatedBoard,
        isLoading: false,
        error: null,
      });

    } catch (error: unknown) {
      console.error("Failed to create task:", error);
      const message = error instanceof Error ? error.message : 'Failed to create task';
      // Rollback on error
      set({ 
        currentBoard: originalBoard, 
        boards: originalBoards, 
        error: message, 
        isLoading: false 
      });
      throw error; // Re-throw for component
    }
  },

  moveTask: async (taskId: string, sourceColumnId: string, destinationColumnId: string, newIndex: number) => {
    const { currentBoard, boards } = get();
    if (!currentBoard) return;

    // Optimistic UI Update
    let taskToMove: Task | undefined;
    const tempColumns = currentBoard.columns.map(column => {
      if (column.id === sourceColumnId) {
        taskToMove = column.tasks.find(task => task.id === taskId);
        return { ...column, tasks: column.tasks.filter(task => task.id !== taskId) };
      }
      return column;
    });

    if (!taskToMove) return; 

    const finalColumns = tempColumns.map(column => {
      if (column.id === destinationColumnId) {
        const newTasks = [...column.tasks];
        // Ensure assignees are carried over
        newTasks.splice(newIndex, 0, { ...taskToMove!, column_id: destinationColumnId, assignees: taskToMove!.assignees || [] }); 
        const updatedTasks = newTasks.map((task, index) => ({ ...task, order_index: index }));
        return { ...column, tasks: updatedTasks };
      }
      return column;
    });

    const originalBoardState = JSON.parse(JSON.stringify(currentBoard));

    if (sourceColumnId !== destinationColumnId) {
        const finalColumnsWithSourceUpdate = finalColumns.map(column => {
            if (column.id === sourceColumnId) {
                const updatedTasks = column.tasks.map((task, index) => ({ ...task, order_index: index }));
                return { ...column, tasks: updatedTasks };
            }
            return column;
        });
        set({ 
          currentBoard: { ...currentBoard, columns: finalColumnsWithSourceUpdate },
          boards: boards.map(b => b.id === currentBoard.id ? { ...currentBoard, columns: finalColumnsWithSourceUpdate } : b)
        });
    } else {
        set({ 
          currentBoard: { ...currentBoard, columns: finalColumns },
          boards: boards.map(b => b.id === currentBoard.id ? { ...currentBoard, columns: finalColumns } : b)
        });
    }

    // API Call
    try {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('No authentication token found');

      await axios.put(
        `http://localhost:8000/api/v1/tasks/${taskId}/move`,
        { column_id: destinationColumnId, order_index: newIndex },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to move task';
      set({ error: message });
      console.error("Failed to update task position on backend, rolling back:", error);
      // Rollback Optimistic Update
      set({ 
        currentBoard: originalBoardState,
        boards: boards.map(b => b.id === originalBoardState.id ? originalBoardState : b)
      });
    }
  },

  // Updated updateTask implementation
  updateTask: async (taskId: string, updatedData: Partial<Omit<Task, 'id' | 'assignees' | 'column_id'>>, assigneeIds?: string[]) => {
    const { currentBoard, boards } = get();
    if (!currentBoard) return;

    const originalBoard = JSON.parse(JSON.stringify(currentBoard)); 
    const originalBoards = JSON.parse(JSON.stringify(boards));

    // Note: Optimistic update for assignees is tricky without user summaries readily available.
    // We will apply optimistic update for other fields, but rely on API response for assignee changes.
    let taskFound = false;
    const optimisticallyUpdatedColumns = currentBoard.columns.map(column => {
      const taskIndex = column.tasks.findIndex(task => task.id === taskId);
      if (taskIndex !== -1) {
        taskFound = true;
        const updatedTask = { 
          ...column.tasks[taskIndex], 
          ...updatedData // Apply non-assignee updates optimistically
        };
        const newTasks = [
          ...column.tasks.slice(0, taskIndex),
          updatedTask,
          ...column.tasks.slice(taskIndex + 1)
        ];
        return { ...column, tasks: newTasks };
      }
      return column;
    });

    if (!taskFound) {
        console.error("Task not found for optimistic update:", taskId);
        return;
    }

    const optimisticallyUpdatedBoard = { ...currentBoard, columns: optimisticallyUpdatedColumns };
    const optimisticallyUpdatedBoards = boards.map(board => board.id === currentBoard.id ? optimisticallyUpdatedBoard : board);

    set({ currentBoard: optimisticallyUpdatedBoard, boards: optimisticallyUpdatedBoards, error: null });

    // --- API Call --- 
    try {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('No authentication token found');
      
      const apiUpdateData = {
          ...updatedData, // Send other updated fields
          assignee_ids: assigneeIds // Send the new list of assignee IDs (can be undefined if not changed)
      }

      // Remove undefined keys before sending to API
      Object.keys(apiUpdateData).forEach(key => apiUpdateData[key as keyof typeof apiUpdateData] === undefined && delete apiUpdateData[key as keyof typeof apiUpdateData]);

      const response = await axios.put<Task>(
        `http://localhost:8000/api/v1/tasks/${taskId}`,
        apiUpdateData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      const updatedTaskFromApi = response.data; // Task with potentially updated assignees

      // --- Update State with API Response (incl. assignees) --- 
      const finalUpdatedColumns = currentBoard.columns.map(column => {
        const taskIndex = column.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          const finalTasks = [
            ...column.tasks.slice(0, taskIndex),
            { ...updatedTaskFromApi, assignees: updatedTaskFromApi.assignees || [] }, // Use API response
            ...column.tasks.slice(taskIndex + 1)
          ];
          return { ...column, tasks: finalTasks };
        }
        return column;
      });

      const finalUpdatedBoard = { ...currentBoard, columns: finalUpdatedColumns };
      const finalUpdatedBoards = boards.map(board => board.id === currentBoard.id ? finalUpdatedBoard : board);

      // Update state with the confirmed data from the API
      set({ currentBoard: finalUpdatedBoard, boards: finalUpdatedBoards, error: null });

    } catch (error: unknown) {
      console.error("Failed to update task:", error);
      const message = error instanceof Error ? error.message : 'Failed to update task';
      // --- Rollback on error --- 
      set({ 
        currentBoard: originalBoard, 
        boards: originalBoards,
        error: message 
      });
      throw error; // Re-throw for component
    } 
  },

  deleteTask: async (taskId: string) => {
    const { currentBoard, boards } = get();
    if (!currentBoard) return;

    const originalBoard = JSON.parse(JSON.stringify(currentBoard)); 
    const originalBoards = JSON.parse(JSON.stringify(boards));

    let taskFound = false;
    const optimisticallyUpdatedColumns = currentBoard.columns.map(column => {
      const taskIndex = column.tasks.findIndex(task => task.id === taskId);
      if (taskIndex !== -1) {
        taskFound = true;
        const remainingTasks = column.tasks.filter(task => task.id !== taskId);
        const updatedTasks = remainingTasks.map((task, index) => ({ ...task, order_index: index }));
        return { ...column, tasks: updatedTasks };
      }
      return column;
    });

    if (!taskFound) {
        console.error("Task not found for optimistic delete:", taskId);
        return; 
    }

    const optimisticallyUpdatedBoard = { ...currentBoard, columns: optimisticallyUpdatedColumns };
    const optimisticallyUpdatedBoards = boards.map(board => board.id === currentBoard.id ? optimisticallyUpdatedBoard : board);

    set({ currentBoard: optimisticallyUpdatedBoard, boards: optimisticallyUpdatedBoards, error: null });

    // API Call
    try {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('No authentication token found');

      await axios.delete(
        `http://localhost:8000/api/v1/tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error: unknown) {
      console.error("Failed to delete task:", error);
      const message = error instanceof Error ? error.message : 'Failed to delete task';
      // Rollback on error
      set({ 
        currentBoard: originalBoard, 
        boards: originalBoards,
        error: message 
      });
      throw error; // Re-throw for component
    } 
  },

  addColumn: async (boardId: string, columnName: string) => {
    const { currentBoard, boards } = get();
    if (!currentBoard || currentBoard.id !== boardId) {
      console.error("Board not found or boardId mismatch");
      throw new Error("Cannot add column to the specified board.");
    }

    // --- API Call First (to get the new column ID and order_index) ---
    try {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('No authentication token found');

      const response = await axios.post(
        `http://localhost:8000/api/v1/boards/${boardId}/columns`,
        { name: columnName },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      const newColumn = response.data; // Contains id, name, order_index, tasks: []

      // --- Update State --- 
      // Ensure the new column has an empty tasks array if not provided by backend
      const columnToAdd = { ...newColumn, tasks: newColumn.tasks || [] };

      const updatedBoard = { 
        ...currentBoard, 
        columns: [...currentBoard.columns, columnToAdd].sort((a, b) => a.order_index - b.order_index) // Add and re-sort
      };
      const updatedBoards = boards.map(board => 
        board.id === boardId ? updatedBoard : board
      );

      set({ 
        currentBoard: updatedBoard, 
        boards: updatedBoards, 
        error: null 
      });

    } catch (error: unknown) {
      console.error("Failed to add column:", error);
      let message = 'Failed to add column';
      // Try to get backend detail message
      if (isAxiosError(error) && error.response?.data?.detail) {
        message = typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail);
      } else if (error instanceof Error) {
        message = error.message;
      }
      set({ error: message });
      throw error; 
    }
  },

  deleteColumn: async (boardId: string, columnId: string) => {
    const { currentBoard, boards } = get();
    if (!currentBoard || currentBoard.id !== boardId) {
        console.error("Board not found or boardId mismatch for deleteColumn");
        throw new Error("Cannot delete column from the specified board.");
    }

    // --- Store original state for rollback --- 
    const originalBoard = JSON.parse(JSON.stringify(currentBoard)); 
    const originalBoards = JSON.parse(JSON.stringify(boards));

    // --- Optimistic Update --- 
    const columnsBeforeDelete = currentBoard.columns;
    const optimisticallyUpdatedColumns = columnsBeforeDelete
        .filter(column => column.id !== columnId)
        // Re-assign order_index for remaining columns
        .map((column, index) => ({ ...column, order_index: index }));

    // Check if a column was actually removed (sanity check)
    if (optimisticallyUpdatedColumns.length === columnsBeforeDelete.length) {
        console.error("Column not found for optimistic delete:", columnId);
        return; // Column wasn't found
    }

    const optimisticallyUpdatedBoard = { 
        ...currentBoard, 
        columns: optimisticallyUpdatedColumns 
    };

    const optimisticallyUpdatedBoards = boards.map(board => 
        board.id === currentBoard.id ? optimisticallyUpdatedBoard : board
    );

    // Apply the optimistic update
    set({ 
        currentBoard: optimisticallyUpdatedBoard, 
        boards: optimisticallyUpdatedBoards, 
        error: null 
    });

    // --- API Call --- 
    try {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error('No authentication token found');

        await axios.delete(
            `http://localhost:8000/api/v1/boards/${boardId}/columns/${columnId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        // Success: Optimistic update is confirmed.
        // console.log("Column deleted successfully (soft delete)");

    } catch (error: unknown) {
        console.error("Failed to delete column:", error);
        let message = 'Failed to delete column';
        if (isAxiosError(error) && error.response?.data?.detail) {
          message = typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail);
        } else if (error instanceof Error) {
          message = error.message;
        }
        // --- Rollback on error --- 
        set({ 
            currentBoard: originalBoard, 
            boards: originalBoards,
            error: message 
        });
         // Re-throw the error so the UI component knows the delete failed
        throw error; 
    }
  },

  renameColumn: async (boardId: string, columnId: string, newName: string) => {
    const { currentBoard, boards } = get();
    if (!currentBoard || currentBoard.id !== boardId) {
        console.error("Board not found or boardId mismatch for renameColumn");
        throw new Error("Cannot rename column on the specified board.");
    }

    // --- Store original state for rollback --- 
    const originalBoard = JSON.parse(JSON.stringify(currentBoard)); 
    const originalBoards = JSON.parse(JSON.stringify(boards));

    // --- Optimistic Update --- 
    let columnFound = false;
    const optimisticallyUpdatedColumns = currentBoard.columns.map(column => {
      if (column.id === columnId) {
        columnFound = true;
        return { ...column, name: newName }; // Update the name
      }
      return column;
    });

    if (!columnFound) {
        console.error("Column not found for optimistic rename:", columnId);
        return; // Column wasn't found
    }

    const optimisticallyUpdatedBoard = { 
        ...currentBoard, 
        columns: optimisticallyUpdatedColumns 
    };

    const optimisticallyUpdatedBoards = boards.map(board => 
        board.id === currentBoard.id ? optimisticallyUpdatedBoard : board
    );

    // Apply the optimistic update
    set({ 
        currentBoard: optimisticallyUpdatedBoard, 
        boards: optimisticallyUpdatedBoards, 
        error: null 
    });

    // --- API Call --- 
    try {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error('No authentication token found');

        await axios.put(
            `http://localhost:8000/api/v1/boards/${boardId}/columns/${columnId}`,
            { name: newName }, // Send the new name in the request body
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        // Success: Optimistic update is confirmed.
        // console.log("Column renamed successfully");

    } catch (error: unknown) {
        console.error("Failed to rename column:", error);
        let message = 'Failed to rename column';
        if (isAxiosError(error) && error.response?.data?.detail) {
          message = typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail);
        } else if (error instanceof Error) {
          message = error.message;
        }
        // --- Rollback on error --- 
        set({ 
            currentBoard: originalBoard, 
            boards: originalBoards,
            error: message 
        });
         // Re-throw the error so the UI component knows the rename failed
        throw error; 
    }
  },

  moveColumn: async (boardId: string, columnId: string, newIndex: number) => {
    const { currentBoard, boards } = get();
    if (!currentBoard || currentBoard.id !== boardId) {
      console.error("Board not found or boardId mismatch for moveColumn");
      throw new Error("Cannot move column on the specified board.");
    }

    // --- Store original state for rollback --- 
    const originalBoard = JSON.parse(JSON.stringify(currentBoard)); 
    const originalBoards = JSON.parse(JSON.stringify(boards));

    // --- Optimistic Update --- 
    const columns = [...currentBoard.columns]; // Clone the array
    const columnIndex = columns.findIndex(col => col.id === columnId);
    if (columnIndex === -1) {
      console.error("Column not found for optimistic move:", columnId);
      return; // Column wasn't found
    }

    // Remove column from original position
    const [movedColumn] = columns.splice(columnIndex, 1);
    
    // Insert column at new position (ensure index is within bounds)
    const validatedNewIndex = Math.max(0, Math.min(newIndex, columns.length));
    columns.splice(validatedNewIndex, 0, movedColumn);

    // Re-assign order_index based on new array order
    const optimisticallyUpdatedColumns = columns.map((col, index) => ({ 
      ...col, 
      order_index: index 
    }));

    const optimisticallyUpdatedBoard = { 
        ...currentBoard, 
        columns: optimisticallyUpdatedColumns 
    };

    const optimisticallyUpdatedBoards = boards.map(board => 
        board.id === currentBoard.id ? optimisticallyUpdatedBoard : board
    );

    // Apply the optimistic update
    set({ 
        currentBoard: optimisticallyUpdatedBoard, 
        boards: optimisticallyUpdatedBoards, 
        error: null 
    });

    // --- API Call --- 
    try {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error('No authentication token found');

        await axios.put(
            `http://localhost:8000/api/v1/boards/${boardId}/columns/${columnId}/move`,
            { new_order_index: validatedNewIndex }, // Send the calculated index
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        // Success: Optimistic update is confirmed.
        // console.log("Column moved successfully");

    } catch (error: unknown) {
        console.error("Failed to move column:", error);
        let message = 'Failed to move column';
        if (isAxiosError(error) && error.response?.data?.detail) {
          message = typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail);
        } else if (error instanceof Error) {
          message = error.message;
        }
        // --- Rollback on error --- 
        set({ 
            currentBoard: originalBoard, 
            boards: originalBoards,
            error: message 
        });
         // Re-throw the error so the UI component knows the move failed
        throw error; 
    }
  },

  selectBoard: (boardId: string) => {
    const board = get().boards.find(b => b.id === boardId);
    set({ currentBoard: board || null });
  },
})); 