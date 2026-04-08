from sqlalchemy.future import select
from src.data.models.postgres.refresh_token import RefreshToken


async def store_refresh_token(db, token: str, user_id: int):
    obj = RefreshToken(token=token, user_id=user_id)

    db.add(obj)
    await db.commit()
    await db.refresh(obj)

    return obj


async def get_refresh_token(db, token: str):
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == token)
    )
    return result.scalar_one_or_none()


async def revoke_refresh_token(db, token: str):
    obj = await get_refresh_token(db, token)

    if obj:
        obj.is_revoked = True
        await db.commit()

    return obj