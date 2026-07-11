from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.tags import router as tags_router
from routers.notes import router as notes_router
import logging
from core.exceptions import AppError
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("app")
logger.setLevel(logging.INFO)

formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)

file_handler = logging.FileHandler("app.log", mode="a", encoding="utf-8")
file_handler.setLevel(logging.ERROR)
file_handler.setFormatter(formatter)

logger.handlers.clear()
logger.addHandler(console_handler)
logger.addHandler(file_handler)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    if exc.status_code >= 500:    
        logger.error(f"App logic error: {exc.detail} at {request.url.path}")

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 500:
        logger.error(f"HTTP Server Error: {exc.status_code} at {request.url.path}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Critical error at {request.url.path}: {exc}")

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(tags_router)
app.include_router(notes_router)