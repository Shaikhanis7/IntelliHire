from sqlalchemy.future import select
from src.data.models.postgres.user import User


async def get_user_by_email(db, email: str):
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db, email: str, password: str, role: str):
    user = User(email=email, password=password, role=role)

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user