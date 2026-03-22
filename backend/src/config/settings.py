from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str = "supersecret"
    

    class Config:
        env_file = ".env"

settings = Settings()