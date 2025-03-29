import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/kanban_dev")

def reset_database():
    """Reset all tables except users."""
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # Define reset queries - order matters for referential integrity
    reset_queries = [
        # First clear the junction table
        "DELETE FROM task_assignees;",
        
        # Then clear tasks
        "DELETE FROM tasks;",
        
        # Then clear board columns
        "DELETE FROM board_columns;",
        
        # Finally clear boards
        "DELETE FROM boards;"
    ]
    
    # Execute queries
    try:
        with engine.connect() as connection:
            # Start a transaction
            with connection.begin():
                print("Starting database reset...")
                for query in reset_queries:
                    connection.execute(text(query))
                print("Database reset complete!")
                return True
                
    except Exception as e:
        print(f"Error resetting database: {e}")
        return False
    
    return True

if __name__ == "__main__":
    # Add a confirmation prompt
    response = input("This will delete ALL data except users. Are you sure? (y/N): ")
    if response.lower() == 'y':
        success = reset_database()
        sys.exit(0 if success else 1)
    else:
        print("Operation cancelled.")
        sys.exit(0) 