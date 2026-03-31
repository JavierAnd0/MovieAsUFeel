import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ──────────────────────────────────────────────────────────────────────
ML_DIR       = Path(__file__).parent
DATA_DIR     = ML_DIR / "data"
ARTIFACTS    = DATA_DIR / "artifacts"
MOVIELENS    = DATA_DIR / "movielens"

DATA_DIR.mkdir(exist_ok=True)
ARTIFACTS.mkdir(exist_ok=True)
MOVIELENS.mkdir(exist_ok=True)

# Intermediate
TMDB_CATALOG    = DATA_DIR / "tmdb_catalog.json"
MOVIE_VECTORS   = ARTIFACTS / "movie_vectors.json"
CATALOG_META    = ARTIFACTS / "catalog_meta.json"
MODEL_INFO      = ARTIFACTS / "model_info.json"

# ── TMDB ───────────────────────────────────────────────────────────────────────
TMDB_API_KEY    = os.getenv("TMDB_API_KEY", "")
TMDB_BASE       = "https://api.themoviedb.org/3"
# Min vote count to include a movie (filters obscure titles)
MIN_VOTE_COUNT  = 100

# ── SVD model ──────────────────────────────────────────────────────────────────
SVD_K           = 50    # latent dimensions
TEST_FRACTION   = 0.20  # held-out split for RMSE evaluation

# ── MovieLens ─────────────────────────────────────────────────────────────────
MOVIELENS_URL   = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"
MOVIELENS_ZIP   = DATA_DIR / "ml-latest-small.zip"
