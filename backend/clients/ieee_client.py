import os
import logging
from typing import List, Dict, Any, Optional

import requests

from backend.data.cache import (
    get_cache_key,
    read_from_cache,
    write_to_cache,
    exponential_backoff,
)

logger = logging.getLogger("scholargraph.ieee")

IEEE_API_URL = "https://ieeexploreapi.ieee.org/api/v1/search/articles"


@exponential_backoff(max_retries=1, base_delay=3.0)
def _fetch_ieee_raw(params: Dict[str, Any]) -> Dict[str, Any]:
    response = requests.get(IEEE_API_URL, params=params, timeout=30)

    if response.status_code == 429:
        raise Exception("429 Too Many Requests: IEEE Xplore rate limit hit")

    # Log non-200 bodies before raise_for_status blows up, so bad requests
    # (invalid key, malformed params) are visible instead of a bare traceback.
    if response.status_code != 200:
        logger.error(
            f"IEEE Xplore returned status {response.status_code}: {response.text[:500]}"
        )

    response.raise_for_status()
    return response.json()


def search_ieee(
    query: str,
    limit: int = 15,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Search IEEE Xplore Metadata API and return normalized paper metadata.
    """

    api_key = os.environ.get("IEEE_XPLORE_API_KEY")

    if not api_key or api_key.startswith("your-"):
        logger.warning("IEEE Xplore API key not configured; skipping IEEE search.")
        return []

    if os.environ.get("IEEE_ENABLED", "true").lower() == "false":
        logger.info("IEEE Xplore search disabled via IEEE_ENABLED=false.")
        return []

    max_records = min(limit, 200)

    params = {
        "apikey": api_key,
        "format": "json",
        "max_records": max_records,
        "querytext": query,
    }

    if year_from is not None:
        params["start_year"] = year_from
    if year_to is not None:
        params["end_year"] = year_to

    cache_key = get_cache_key(
        "ieee_v3", query=query, limit=limit, year_from=year_from, year_to=year_to
    )
    cached = read_from_cache(cache_key)
    if cached is not None:
        logger.info(f"IEEE cache hit for query: {query}")
        return cached

    logger.info(f"Querying IEEE Xplore API for: {query}")

    try:
        data = _fetch_ieee_raw(params)
    except Exception as e:
        logger.error(f"Failed to query IEEE Xplore: {e}")
        return []

    raw_articles = data.get("articles", [])
    logger.info(f"IEEE API returned {len(raw_articles)} raw articles for query: {query}")

    # TEMPORARY DIAGNOSTIC: dump the first raw article's keys so we can verify
    # field names (accessType vs access_type, etc.) match what's parsed below.
    # Remove this block once you've confirmed field names are correct.
    if raw_articles:
        logger.info(f"IEEE first raw article keys: {list(raw_articles[0].keys())}")

    papers: List[Dict[str, Any]] = []

    try:
        for item in raw_articles:
            article_number = item.get("article_number")
            if not article_number:
                continue

            doi = item.get("doi")
            paper_id = doi if doi else f"ieee-{article_number}"

            authors_block = item.get("authors", {}) or {}
            authors = [
                author.get("full_name")
                for author in authors_block.get("authors", [])
                if author.get("full_name")
            ]

            # Check both casings defensively until confirmed via the debug
            # log above — IEEE's docs and live responses have been
            # inconsistent about camelCase vs snake_case on this field.
            access_type = item.get("access_type") or item.get("accessType") or ""
            full_text_available = access_type.lower() == "open access"

            pdf_url = item.get("pdf_url")
            html_url = item.get("html_url")

            paper_url = (
                html_url
                or (f"https://doi.org/{doi}" if doi else
                    f"https://ieeexplore.ieee.org/document/{article_number}")
            )

            publication_year = item.get("publication_year")
            try:
                year = int(publication_year) if publication_year else 2000
            except (TypeError, ValueError):
                year = 2000

            citation_count = item.get("citing_paper_count", 0) or 0
            try:
                citation_count = int(citation_count)
            except (TypeError, ValueError):
                citation_count = 0

            papers.append({
                "id": paper_id,
                "title": item.get("title", "Untitled") or "Untitled",
                "authors": authors,
                "year": year,
                "venue": item.get("publication_title", "Unknown") or "Unknown",
                "abstract": item.get("abstract", "") or "",
                "pdf_url": pdf_url,
                "url": paper_url,
                "full_text_available": full_text_available,
                "citation_count": citation_count,
                "citations": [],
                "doi": doi,
                "arxiv_id": None,
                "s2_paper_id": None,
                "source": "ieee",
            })

        logger.info(f"IEEE Xplore parsed {len(papers)} normalized papers for query: {query}")

        if papers:
            write_to_cache(cache_key, papers)
        else:
            logger.warning(f"IEEE returned no usable papers for '{query}'. Not caching empty result.")

    except Exception as e:
        logger.error(f"Error parsing IEEE Xplore response: {e}")

    return papers