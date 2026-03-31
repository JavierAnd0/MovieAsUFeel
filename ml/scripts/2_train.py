"""
Script 2: Entrena el modelo SVD sobre los ratings de MovieLens.
Produce movie_vectors.json: {tmdbId: [float x 50]} — vectores latentes por película.

Uso:
    cd ml
    python scripts/2_train.py
"""

import sys
import json
import time
import numpy as np
import pandas as pd
from pathlib import Path
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    MOVIELENS, TMDB_CATALOG, MOVIE_VECTORS, MODEL_INFO,
    SVD_K, TEST_FRACTION
)


def load_data() -> tuple[pd.DataFrame, dict]:
    """Carga ratings de MovieLens y catálogo TMDB."""
    if not (MOVIELENS / "ratings.csv").exists():
        print("ERROR: ratings.csv no encontrado. Ejecuta primero: python scripts/1_fetch_catalog.py")
        sys.exit(1)
    if not TMDB_CATALOG.exists():
        print("ERROR: tmdb_catalog.json no encontrado. Ejecuta primero: python scripts/1_fetch_catalog.py")
        sys.exit(1)

    ratings = pd.read_csv(MOVIELENS / "ratings.csv")
    links   = pd.read_csv(MOVIELENS / "links.csv").dropna(subset=["tmdbId"])
    links["tmdbId"] = links["tmdbId"].astype(int)

    with open(TMDB_CATALOG) as f:
        catalog = json.load(f)

    # Keep only movies that are in our TMDB catalog (have quality data)
    catalog_tmdb_ids = set(int(k) for k in catalog.keys())
    links_filtered = links[links["tmdbId"].isin(catalog_tmdb_ids)]

    # Map MovieLens movieId → tmdbId
    ml_to_tmdb = dict(zip(links_filtered["movieId"], links_filtered["tmdbId"]))
    ratings_filtered = ratings[ratings["movieId"].isin(ml_to_tmdb)]
    ratings_filtered = ratings_filtered.copy()
    ratings_filtered["tmdbId"] = ratings_filtered["movieId"].map(ml_to_tmdb)

    print(f"Ratings totales:    {len(ratings):>7,}")
    print(f"Ratings filtrados:  {len(ratings_filtered):>7,}  (solo películas en TMDB catalog)")
    print(f"Películas:          {ratings_filtered['tmdbId'].nunique():>7,}")
    print(f"Usuarios:           {ratings_filtered['userId'].nunique():>7,}")

    return ratings_filtered, catalog


def build_sparse_matrix(ratings: pd.DataFrame):
    """
    Construye la matrix usuario×película, centrada por usuario.
    Retorna: matrix sparse, índices de usuario, índices de película.
    """
    # Create integer indices
    users   = ratings["userId"].unique()
    movies  = ratings["tmdbId"].unique()
    user_idx  = {u: i for i, u in enumerate(users)}
    movie_idx = {m: i for i, m in enumerate(movies)}

    row = ratings["userId"].map(user_idx).values
    col = ratings["tmdbId"].map(movie_idx).values
    val = ratings["rating"].values.astype(np.float32)

    R = csr_matrix((val, (row, col)), shape=(len(users), len(movies)))

    # Center each user's ratings (subtract their mean)
    user_means = np.array(R.sum(axis=1)).flatten() / np.maximum(
        np.array((R > 0).sum(axis=1)).flatten(), 1
    )
    # Apply centering only to non-zero entries (rated items)
    R_coo = R.tocoo()
    R_coo.data -= user_means[R_coo.row]
    R_centered = R_coo.tocsr()

    return R_centered, user_idx, movie_idx, movies


def train_svd(R: csr_matrix, k: int):
    """
    Aplica Truncated SVD: R ≈ U Σ Vt
    Retorna Vt.T (movie factors, shape: n_movies × k) y Σ.
    """
    print(f"\nEntrenando SVD con k={k} componentes latentes...")
    t0 = time.time()

    # svds requiere que k < min(shape) - 1
    max_k = min(R.shape) - 1
    k_actual = min(k, max_k)

    U, s, Vt = svds(R, k=k_actual)

    # Sort by singular values (svds returns in ascending order)
    idx = np.argsort(s)[::-1]
    U, s, Vt = U[:, idx], s[idx], Vt[idx, :]

    elapsed = time.time() - t0
    print(f"  ✓ SVD completado en {elapsed:.1f}s")
    print(f"  Componentes: {k_actual} | varianza explicada aprox: {(s**2).sum():.0f}")

    # Movie vectors = Vt.T (each row is a movie)
    movie_factors = Vt.T  # shape: (n_movies, k)

    # Normalize to unit norm for cosine similarity
    norms = np.linalg.norm(movie_factors, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    movie_factors_normalized = movie_factors / norms

    return movie_factors_normalized, U, s, Vt


def evaluate(R: csr_matrix, U: np.ndarray, s: np.ndarray, Vt: np.ndarray,
             test_fraction: float) -> float:
    """
    Computa RMSE en una muestra aleatoria de ratings conocidos.
    R_hat = U × diag(s) × Vt
    """
    print(f"\nEvaluando (RMSE en {test_fraction*100:.0f}% de ratings)...")

    # Sample known ratings
    R_coo = R.tocoo()
    n_test = max(1, int(len(R_coo.data) * test_fraction))
    idx = np.random.choice(len(R_coo.data), n_test, replace=False)

    # Predicted values via dot products
    u_vecs = U[R_coo.row[idx]] * s[np.newaxis, :]   # shape (n_test, k)
    v_vecs = Vt[:, R_coo.col[idx]].T                 # shape (n_test, k)
    preds  = (u_vecs * v_vecs).sum(axis=1)
    actual = R_coo.data[idx]

    rmse = float(np.sqrt(np.mean((preds - actual) ** 2)))
    print(f"  RMSE: {rmse:.4f}  (escala 0.5–5.0, ~0.85 es bueno para este dataset)")
    return rmse


def save_vectors(movie_factors: np.ndarray, movies: np.ndarray,
                 catalog: dict, rmse: float, k: int) -> None:
    """Guarda movie_vectors.json y model_info.json."""
    print("\nGuardando vectores...")

    vectors: dict[str, list[float]] = {}
    skipped = 0

    for i, tmdb_id in enumerate(movies):
        key = str(int(tmdb_id))
        if key not in catalog:
            skipped += 1
            continue
        # Round to 6 decimal places to reduce file size
        vectors[key] = [round(float(v), 6) for v in movie_factors[i]]

    with open(MOVIE_VECTORS, "w") as f:
        json.dump(vectors, f)

    info = {
        "n_movies_with_vectors": len(vectors),
        "n_movies_skipped": skipped,
        "k_components": k,
        "rmse": round(rmse, 4),
        "vector_dims": k,
    }
    with open(MODEL_INFO, "w") as f:
        json.dump(info, f, indent=2)

    size_kb = MOVIE_VECTORS.stat().st_size // 1024
    print(f"  ✓ {len(vectors)} vectores guardados → {MOVIE_VECTORS} ({size_kb} KB)")
    print(f"  ✓ Métricas guardadas → {MODEL_INFO}")


def main():
    print("=" * 60)
    print("  CineMood — Entrenamiento SVD")
    print("=" * 60 + "\n")

    ratings, catalog = load_data()
    R, user_idx, movie_idx, movies = build_sparse_matrix(ratings)

    print(f"\nMatrix: {R.shape[0]} usuarios × {R.shape[1]} películas "
          f"| densidad: {R.nnz / (R.shape[0] * R.shape[1]):.4%}")

    movie_factors, U, s, Vt = train_svd(R, SVD_K)
    rmse = evaluate(R, U, s, Vt, TEST_FRACTION)
    save_vectors(movie_factors, movies, catalog, rmse, SVD_K)

    print("\n✓ Entrenamiento completado.")
    print("  Siguiente paso: python scripts/3_export.py")


if __name__ == "__main__":
    main()
