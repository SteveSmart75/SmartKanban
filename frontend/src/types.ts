// Central type definitions for the frontend

// Added UserSummary interface matching backend schema
export interface UserSummary {
  id: string;
  email: string;
  full_name?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string; // Store as ISO string (received from backend)
  priority: number;
  column_id: string;
  order_index: number;
  assignees: UserSummary[]; // Added assignees
}

export interface Column {
  id: string;
  name: string;
  board_id: string;
  order_index: number;
  tasks: Task[];
}

export interface Board {
  id: string;
  name: string;
  columns: Column[];
} 