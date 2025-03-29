from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time

# Configure logging
# Consider making the level configurable (e.g., via environment variable)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("api_requests")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Log request
        logger.info(f"Incoming request: {request.method} {request.url.path} - Client: {request.client.host}")
        
        # Process request
        response = await call_next(request)
        
        process_time = (time.time() - start_time) * 1000 # milliseconds
        # Log response
        logger.info(f"Response: {request.method} {request.url.path} - Status: {response.status_code} - Duration: {process_time:.2f}ms")
        
        return response 