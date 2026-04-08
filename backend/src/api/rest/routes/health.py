from fastapi import APIRouter

router = APIRouter(tags=["Heath Check"])



@router.get("/")
def health():
    return {"status": "ok"}