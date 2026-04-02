from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    jwt_secret: str
    GOOGLE_API_KEY:str
    GROQ_API_KEY:str

    AWS_ACCESS_KEY_ID:str

    AWS_SECRET_ACCESS_KEY:str

    AWS_REGION:str              # region you picked when creating the bucket
    S3_BUCKET_NAME:str     # name you gave the bucket
    S3_PRESIGNED_URL_EXPIRY:int

    REDIS_URL:str

    class Config:
        env_file = ".env"

settings = Settings()