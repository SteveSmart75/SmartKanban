# Smart Kanban

A modern Kanban board application with a Spotify-inspired design, built with React and FastAPI.

## Features

- User authentication
- Create and manage boards
- Customizable columns (states)
- Drag-and-drop task management
- Priority levels
- Due dates
- Modern, Spotify-inspired UI

## Tech Stack

### Frontend
- React 18 with TypeScript
- Material-UI
- Zustand for state management
- React Beautiful DnD
- Axios for API calls

### Backend
- FastAPI
- SQLAlchemy ORM
- PostgreSQL 17
- JWT Authentication
- Alembic for migrations

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 16+
- PostgreSQL 17

### Backend Setup

1. Create a conda environment:
```bash
conda create -n kanban-fastapi python=3.11
conda activate kanban-fastapi
```

2. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Set up the database:
```bash
createdb kanban_dev
```

4. Run the backend:
```bash
uvicorn app.main:app --reload
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the frontend:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Development

### Running Tests

Backend:
```bash
pytest
```

Frontend:
```bash
npm test
```

## License

MIT 