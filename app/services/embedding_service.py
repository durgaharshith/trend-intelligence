from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
import numpy as np
import logging
from typing import Tuple, List

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Semantic clustering service using sentence-transformers.
    Optimized for trend detection: focuses on grouping similar discussions,
    not exhaustive matching. Keeps memory footprint small for free tier."""
    
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model loaded (384D)")
    
    def encode_texts(self, texts: list) -> np.ndarray:
        """Encode texts to embeddings. Batch process for efficiency."""
        if not texts:
            return np.array([])
        embeddings = self.model.encode(texts, convert_to_numpy=True, batch_size=32, normalize_embeddings=True)
        return embeddings
    
    def cluster_embeddings(self, embeddings: np.ndarray, distance_threshold: float = 0.30) -> np.ndarray:
        """Agglomerative clustering for trend grouping.
        Distance threshold controls cluster granularity:
        - 0.25: tight clusters (more clusters)
        - 0.30: balanced (default, good for trends)
        - 0.45: loose clusters (fewer, broader trends)"""
        
        if len(embeddings) < 2:
            return np.array([0] * len(embeddings))
        
        try:
            clustering = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=distance_threshold,
                linkage="average",
                metric="cosine",
            )
            labels = clustering.fit_predict(embeddings)
        except TypeError:
            # Fallback for older scikit-learn versions where metric was affinity
            clustering = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=distance_threshold,
                linkage="average",
                affinity="cosine",
            )
            labels = clustering.fit_predict(embeddings)
        return labels
    
    def find_similar_posts(
        self, 
        query_embedding: np.ndarray, 
        embeddings: np.ndarray, 
        threshold: float = 0.75
    ) -> Tuple[List[int], List[float]]:
        """Find posts similar to query. Used for deduplication and trend expansion."""
        if len(embeddings) == 0:
            return [], []
        
        similarities = np.dot(embeddings, query_embedding) / (
            np.linalg.norm(embeddings, axis=1) * np.linalg.norm(query_embedding) + 1e-8
        )
        similar_indices = np.where(similarities >= threshold)[0]
        return similar_indices.tolist(), similarities[similar_indices].tolist()
    
    def calculate_cluster_centroid(self, embeddings: np.ndarray) -> np.ndarray:
        """Calculate centroid of a cluster for trend representation."""
        if len(embeddings) == 0:
            return np.array([])
        return np.mean(embeddings, axis=0)
