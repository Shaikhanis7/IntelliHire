from src.data.models.postgres.blacklist import Blacklist

from sqlalchemy import select

async def is_blacklisted(db, url):
    result = await db.execute(
        select(Blacklist).where(Blacklist.url == url)
    )
    return result.scalar_one_or_none() is not None


async def add_blacklist(db, url, reason):
    db.add(Blacklist(url=url, reason=reason))
    await db.commit()