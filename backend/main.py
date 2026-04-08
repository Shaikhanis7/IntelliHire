import requests
from bs4 import BeautifulSoup
import time

BASE_URL = "https://www.postjobfree.com"


def build_url(query, location="India", radius=2, page=1):
    return f"{BASE_URL}/resumes?q={query}&l={location}&radius={radius}&p={page}"


# 🔹 Extract resume links
def get_resume_links(query, location="India", pages=2):

    headers = {"User-Agent": "Mozilla/5.0"}
    links = set()

    for page in range(1, pages + 1):

        url = build_url(query, location, page=page)
        print(f"\n🔍 Fetching Page {page}: {url}")

        try:
            res = requests.get(url, headers=headers, timeout=10)

            if res.status_code != 200:
                print("❌ Failed page")
                continue

            soup = BeautifulSoup(res.text, "html.parser")

            for a in soup.find_all("a", href=True):
                href = a["href"]

                if "/resume/" in href:
                    full_url = BASE_URL + href
                    links.add(full_url)

        except Exception as e:
            print("Error:", e)

        time.sleep(1)

    return list(links)


# 🔹 Scrape individual resume
def scrape_resume(url):

    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        res = requests.get(url, headers=headers, timeout=10)

        if res.status_code != 200:
            print(f"❌ Failed: {url}")
            return None

        soup = BeautifulSoup(res.text, "html.parser")

        text = soup.get_text(separator=" ").strip()

        if len(text) < 200:
            print(f"⚠️ Too short: {url}")
            return None

        return text

    except Exception as e:
        print(f"❌ Error: {url} → {e}")
        return None


# 🔹 Run full flow
def run_scraper(query):

    links = get_resume_links(query)

    print(f"\n✅ Found {len(links)} resumes\n")

    for i, link in enumerate(links[:5]):  # limit for testing

        print(f"\n Scraping {i+1}: {link}")

        text = scrape_resume(link)

        if text:
            print("\n--- Resume Preview ---")
            print(text)



if __name__ == "__main__":
    run_scraper("software engineer")