from fastapi import FastAPI
from dotenv import load_dotenv

from src.api.routes.auth import router as auth_router
import os
from fastapi.middleware.cors import CORSMiddleware
load_dotenv()

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix="/auth")


@app.get("/")
def read_root():
    return {
        "message": "Backend running",
        "port": os.getenv("PORT")
    }