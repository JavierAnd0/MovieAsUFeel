"""
Script 1: Descarga MovieLens latest-small y enriquece cada película con datos de TMDB.
Output: ml/data/tmdb_catalog.json

Uso:
    cd ml
    python scripts/1_fetch_catalog.py
"""

import sys
import json
import time
import zipfile
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    TMDB_API_KEY, TMDB_BASE, MIN_VOTE_COUNT,
    MOVIELENS_URL, MOVIELENS_ZIP, MOVIELENS, TMDB_CATALOG
)

import requests
import pandas as pd


# ── Helpers ────────────────────────────────────────────────────────────────────

def download_movielens():
    if MOVIELENS_ZIP.exists():
        print("MovieLens zip ya existe, saltando descarga.")
    else:
        print(f"Descargando MovieLens desde {MOVIELENS_URL} ...")
        urllib.request.urlretrieve(MOVIELENS_URL, MOVIELENS_ZIP)
        print(f"  ✓ Descargado ({MOVIELENS_ZIP.stat().st_size // 1024} KB)")

    # Extract only the files we need
    needed = {"ml-latest-small/ratings.csv", "ml-latest-small/movies.csv", "ml-latest-small/links.csv"}
    with zipfile.ZipFile(MOVIELENS_ZIP) as z:
        for member in z.namelist():
            if member in needed:
                dest = MOVIELENS / Path(member).name
                if not dest.exists():
                    print(f"  Extrayendo {member} ...")
                    with z.open(member) as src, open(dest, "wb") as dst:
                        dst.write(src.read())
    print("  ✓ Archivos MovieLens listos.")


def fetch_tmdb_movie(tmdb_id: int, session: requests.Session) -> dict | None:
    """Fetches movie details from TMDB. Returns None if not found or filtered out."""
    url = f"{TMDB_BASE}/movie/{tmdb_id}"
    params = {"api_key": TMDB_API_KEY, "language": "en-US"}
    try:
        r = session.get(url, params=params, timeout=10)
        if r.status_code == 404:
            return None
        if r.status_code == 429:
            # Rate limited — wait and retry once
            time.sleep(2)
            r = session.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return None

    if data.get("vote_count", 0) < MIN_VOTE_COUNT:
        return None
    if not data.get("poster_path"):
        return None

    release = data.get("release_date", "")
    year = int(release[:4]) if release and len(release) >= 4 else 0

    return {
        "title":         data.get("title", ""),
        "year":          year,
        "genres":        [g["id"] for g in data.get("genres", [])],
        "vote_average":  round(data.get("vote_average", 0), 2),
        "vote_count":    data.get("vote_count", 0),
        "poster_path":   data.get("poster_path"),
        "popularity":    round(data.get("popularity", 0), 3),
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    if not TMDB_API_KEY:
        print("ERROR: TMDB_API_KEY no está configurada en ml/.env")
        sys.exit(1)

    # 1. Download MovieLens
    download_movielens()

    # 2. Read links.csv to get tmdbId for each MovieLens movieId
    links = pd.read_csv(MOVIELENS / "links.csv")
    links = links.dropna(subset=["tmdbId"])
    links["tmdbId"] = links["tmdbId"].astype(int)
    print(f"\nMovieLens → {len(links)} películas con tmdbId.")

    # 3. Fetch TMDB details for each movie
    catalog: dict[str, dict] = {}

    # Resume if partial catalog already exists
    if TMDB_CATALOG.exists():
        with open(TMDB_CATALOG) as f:
            catalog = json.load(f)
        print(f"Catálogo parcial cargado: {len(catalog)} películas ya procesadas.")

    already_done = set(catalog.keys())
    pending = links[~links["tmdbId"].astype(str).isin(already_done)]
    total = len(pending)
    print(f"Fetching {total} películas de TMDB (esto tarda ~{total // 35} min)...\n")

    session = requests.Session()
    session.headers.update({"Accept": "application/json"})

    for idx, (_, row) in enumerate(pending.iterrows()):
        tmdb_id = int(row["tmdbId"])
        movie = fetch_tmdb_movie(tmdb_id, session)

        if movie:
            catalog[str(tmdb_id)] = movie

        # Progress every 50 movies
        if (idx + 1) % 50 == 0:
            pct = (idx + 1) / total * 100
            print(f"  {idx+1}/{total} ({pct:.0f}%) | en catálogo: {len(catalog)}")
            # Save checkpoint
            with open(TMDB_CATALOG, "w") as f:
                json.dump(catalog, f)

        # Respect TMDB rate limit: ~40 req/10s
        time.sleep(0.27)

    # Final save
    with open(TMDB_CATALOG, "w") as f:
        json.dump(catalog, f)

    print(f"\n✓ Catálogo guardado: {len(catalog)} películas → {TMDB_CATALOG}")
    print(f"  Tamaño: {TMDB_CATALOG.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
