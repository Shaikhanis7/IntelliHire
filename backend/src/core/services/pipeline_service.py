from src.data.repositories import candidate_repo, resume_repo, blacklist_repo
async def process_resume(db, url, text, name, skills, sourcing_id):

    if await resume_repo.exists(db, url):
        return

    if await blacklist_repo.is_blacklisted(db, url):
        return

    if not text or len(text) < 200:
        await blacklist_repo.add_blacklist(db, url, "invalid")
        return

    candidate = await candidate_repo.create_candidate(
        db, name, ",".join(skills), sourcing_id
    )

    await resume_repo.create_resume(
        db, candidate.id, url, text
    )