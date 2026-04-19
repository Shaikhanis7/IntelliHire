from src.data.repositories import candidate_repo, resume_repo, blacklist_repo
async def process_resume(db, url, text, name, skills, sourcing_id):

    if await resume_repo.exists(db, url):
        return

   
    candidate = await candidate_repo.create_candidate(
        db, name, ",".join(skills), sourcing_id
    )

    await resume_repo.create_resume(
        db, candidate.id, url, text
    )