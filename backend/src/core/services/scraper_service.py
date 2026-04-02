"""
src/core/services/scraper_service.py

Scrapes resume links from postjobfree.com — single-page per call.
  • get_resume_links() fetches ONE page only — sourcing_service drives pagination
  • query is URL-encoded so agentic adapted queries with spaces work correctly
"""

import requests
from urllib.parse import quote_plus
from bs4 import BeautifulSoup
from fastapi.concurrency import run_in_threadpool
from src.observability.logging.logger import setup_logger

log = setup_logger()

BASE = "https://www.postjobfree.com"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


async def get_resume_links(
    role: str,
    count: int = 10,
    page: int = 1,
) -> list[str]:
    """
    Fetch ONE page of resume links for the given role and page number.
    Pagination is driven externally by sourcing_service (agentic layer).
    role is URL-encoded — supports multi-word adapted queries like
    'react developer' or 'django backend engineer'.
    """

    def fetch_page() -> list[str]:
        encoded_role = quote_plus(role)
        url = f"{BASE}/resumes?q={encoded_role}&l=India&pg={page}"

        log.info(f"[scraper] Fetching: {url}")  # ← URL logged before request

        try:
            res = requests.get(url, timeout=10, headers=HEADERS)
            res.raise_for_status()
        except Exception as exc:
            log.warning(f"[scraper] Fetch failed | url={url} | error={exc}")
            return []

        soup = BeautifulSoup(res.text, "html.parser")

        # Deduplicate within the page using a set
        links = list({
            BASE + a["href"]
            for a in soup.find_all("a", href=True)
            if "/resume/" in a["href"]
        })

        log.info(
            f"[scraper] page={page} query='{role}' found={len(links)} | url={url}"
        )
        return links[:count]

    return await run_in_threadpool(fetch_page)


async def scrape_resume(url: str) -> str:
    """
    Fetch a single resume page and return cleaned body text.
    """

    def fetch() -> str:
        log.info(f"[scraper] Scraping resume: {url}")  # ← resume URL logged

        try:
            res = requests.get(url, timeout=10, headers=HEADERS)
            res.raise_for_status()
        except Exception as exc:
            log.warning(f"[scraper] Failed to fetch | url={url} | error={exc}")
            return ""

        soup = BeautifulSoup(res.text, "html.parser")

        for selector in ["div.resumeBody", "div.resume", "div#resume", "div.content"]:
            container = soup.select_one(selector)
            if container:
                text = container.get_text(" ", strip=True)
                log.info(f"[scraper] Extracted {len(text)} chars via '{selector}' | url={url}")
                return text

        for tag in soup(["nav", "header", "footer", "script", "style", "noscript"]):
            tag.decompose()

        text = soup.get_text(" ", strip=True)
        log.info(f"[scraper] Extracted {len(text)} chars via full-page fallback | url={url}")
        return text

    return await run_in_threadpool(fetch)