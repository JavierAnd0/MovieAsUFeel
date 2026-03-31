"""
Script 3: Fusiona movie_vectors.json con tmdb_catalog.json y genera los
archivos finales listos para ser consumidos por Next.js.

Output (en ml/data/artifacts/):
  - movie_vectors.json  → {tmdbId: float[50]}  (para scoring en TS)
  - catalog_meta.json   → {tmdbId: {title, year, genres, vote_average, poster_path}}

Uso:
    cd ml
    python scripts/3_export.py
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import TMDB_CATALOG, MOVIE_VECTORS, CATALOG_META, MODEL_INFO, ARTIFACTS


def main():
    print("=" * 60)
    print("  CineMood — Export de artifacts para Next.js")
    print("=" * 60 + "\n")

    # Load movie vectors (already filtered to catalog in script 2)
    if not MOVIE_VECTORS.exists():
        print("ERROR: movie_vectors.json no encontrado. Ejecuta primero: python scripts/2_train.py")
        sys.exit(1)
    if not TMDB_CATALOG.exists():
        print("ERROR: tmdb_catalog.json no encontrado. Ejecuta primero: python scripts/1_fetch_catalog.py")
        sys.exit(1)

    with open(MOVIE_VECTORS) as f:
        vectors: dict[str, list[float]] = json.load(f)

    with open(TMDB_CATALOG) as f:
        catalog: dict[str, dict] = json.load(f)

    # Build catalog_meta.json: only movies that have vectors
    catalog_meta: dict[str, dict] = {}
    missing_meta = 0

    for tmdb_id_str in vectors:
        entry = catalog.get(tmdb_id_str)
        if entry is None:
            missing_meta += 1
            continue
        catalog_meta[tmdb_id_str] = {
            "title":        entry["title"],
            "year":         entry["year"],
            "genres":       entry["genres"],
            "vote_average": entry["vote_average"],
            "poster_path":  entry["poster_path"],
        }

    # Keep only vectors for movies that have metadata
    vectors_clean = {k: v for k, v in vectors.items() if k in catalog_meta}

    # Save catalog_meta.json (overwrite existing in artifacts/)
    with open(CATALOG_META, "w") as f:
        json.dump(catalog_meta, f)

    # Overwrite movie_vectors.json with only the clean entries
    with open(MOVIE_VECTORS, "w") as f:
        json.dump(vectors_clean, f)

    # Print summary
    vec_kb  = MOVIE_VECTORS.stat().st_size  // 1024
    meta_kb = CATALOG_META.stat().st_size   // 1024
    dims    = len(next(iter(vectors_clean.values()))) if vectors_clean else 0

    print(f"Películas con vector + metadata:  {len(vectors_clean):>5,}")
    if missing_meta:
        print(f"Películas sin metadata (saltadas): {missing_meta:>4,}")

    print(f"\nArchivos en {ARTIFACTS}/")
    print(f"  movie_vectors.json   {vec_kb:>5} KB  ({dims} dims por película)")
    print(f"  catalog_meta.json    {meta_kb:>5} KB")

    if MODEL_INFO.exists():
        with open(MODEL_INFO) as f:
            info = json.load(f)
        print(f"\nMétricas del modelo:")
        print(f"  RMSE:        {info.get('rmse', 'N/A')}")
        print(f"  Componentes: {info.get('k_components', 'N/A')}")

    print("\n✓ Export completado.")
    print("  Reinicia el servidor Next.js y el motor ML se activará automáticamente.")
    print(f"  Artifacts en: {ARTIFACTS.resolve()}")


if __name__ == "__main__":
    main()
