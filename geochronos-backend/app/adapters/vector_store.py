from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from geochronos_engine.models import FeatureRecord
from .feature_store import GeoPackageFeatureStore


class QdrantVectorStore:
    def __init__(
        self,
        db_path: str | Path,
        collection_name: str = "geochronos_features",
        feature_store: Optional[GeoPackageFeatureStore] = None,
    ) -> None:
        self.db_path = Path(db_path)
        self.collection_name = collection_name
        self.feature_store = feature_store
        self._client: Optional[QdrantClient] = None

    @property
    def client(self) -> QdrantClient:
        if self._client is None:
            self._client = QdrantClient(path=str(self.db_path))
        return self._client

    def _payload_to_feature(self, payload: Dict[str, Any]) -> FeatureRecord:
        fid = payload.get("feature_id", "")
        # If feature_store is present, fetch full geometry
        if self.feature_store:
            feat = self.feature_store.get_feature(fid)
            if feat:
                return feat

        # Fallback to payload geometry reference or empty
        geom = payload.get("geometry_reference", {})
        if not isinstance(geom, dict):
            geom = {}
        return FeatureRecord(
            feature_id=fid,
            feature_class=payload.get("feature_class", "unknown"),
            year=int(payload.get("year", 2026)),
            geometry=geom,
            observation_id=payload.get("observation_id", ""),
            confidence=float(payload.get("confidence", 1.0)),
            source_item_id=payload.get("source_item_id", ""),
            cube_time_index=int(payload.get("cube_time_index", 0)),
            semantic_text=f"{payload.get('feature_class', '')} in {payload.get('observation_id', '')}",
            attributes={"area_m2": payload.get("area_m2", 0.0)},
        )

    def semantic_search(
        self,
        query_embedding: List[float],
        *,
        top_k: int = 8,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Tuple[FeatureRecord, float]]:
        vec = query_embedding
        if len(vec) != 384:
            try:
                from fastembed import TextEmbedding
                if not hasattr(self, "_embedder") or self._embedder is None:
                    self._embedder = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
                search_term = "satellite observation"
                if filters and filters.get("feature_class"):
                    search_term = f"{filters['feature_class']} in Chennai"
                vec = list(self._embedder.embed([search_term]))[0].tolist()
            except Exception:
                vec = (vec + [0.0] * 384)[:384]

        must_conditions = []
        if filters:
            if "feature_class" in filters and filters["feature_class"]:
                must_conditions.append(
                    qmodels.FieldCondition(
                        key="feature_class",
                        match=qmodels.MatchValue(value=filters["feature_class"]),
                    )
                )
            if "year" in filters and filters["year"]:
                must_conditions.append(
                    qmodels.FieldCondition(
                        key="year",
                        match=qmodels.MatchValue(value=int(filters["year"])),
                    )
                )
            if "years" in filters and filters["years"]:
                must_conditions.append(
                    qmodels.FieldCondition(
                        key="year",
                        match=qmodels.MatchAny(any=[int(y) for y in filters["years"]]),
                    )
                )
            if "observation_id" in filters and filters["observation_id"]:
                must_conditions.append(
                    qmodels.FieldCondition(
                        key="observation_id",
                        match=qmodels.MatchValue(value=filters["observation_id"]),
                    )
                )

        q_filter = qmodels.Filter(must=must_conditions) if must_conditions else None

        hits = []
        try:
            # Try query_points (qdrant-client >= 1.10)
            res = self.client.query_points(
                collection_name=self.collection_name,
                query=vec,
                query_filter=q_filter,
                limit=top_k,
                with_payload=True,
            )
            hits = res.points
        except Exception:
            try:
                hits = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=vec,
                    query_filter=q_filter,
                    limit=top_k,
                    with_payload=True,
                )
            except Exception:
                hits = []

        results = []
        for hit in hits:
            feature = self._payload_to_feature(hit.payload or {})
            results.append((feature, float(hit.score)))

        # If vector search returns no results but filters exist, fallback to feature store
        if not results and self.feature_store and filters:
            if "years" in filters and isinstance(filters["years"], (list, tuple)):
                years = filters["years"]
                per_year = max(2, top_k // len(years))
                records = []
                f_copy = dict(filters)
                f_copy.pop("years", None)
                f_copy.pop("year", None)
                for yr in years:
                    records.extend(self.feature_store.get_features(year=yr, limit=per_year, **f_copy))
                results = [(r, 0.9) for r in records]
            else:
                records = self.feature_store.get_features(limit=top_k, **filters)
                results = [(r, 0.9) for r in records]

        return results

    def filter(self, **filters: Any) -> List[FeatureRecord]:
        must_conditions = []
        for k, v in filters.items():
            if v is None:
                continue
            if k in ("feature_class", "observation_id", "feature_id"):
                must_conditions.append(
                    qmodels.FieldCondition(key=k, match=qmodels.MatchValue(value=str(v)))
                )
            elif k == "year":
                must_conditions.append(
                    qmodels.FieldCondition(key=k, match=qmodels.MatchValue(value=int(v)))
                )
            elif k == "years":
                must_conditions.append(
                    qmodels.FieldCondition(key="year", match=qmodels.MatchAny(any=[int(y) for y in v]))
                )

        q_filter = qmodels.Filter(must=must_conditions) if must_conditions else None
        try:
            points, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=q_filter,
                limit=filters.get("limit", 50),
                with_payload=True,
            )
            return [self._payload_to_feature(p.payload or {}) for p in points]
        except Exception:
            return []

    def get_by_feature_id(self, feature_id: str) -> Optional[FeatureRecord]:
        q_filter = qmodels.Filter(
            must=[qmodels.FieldCondition(key="feature_id", match=qmodels.MatchValue(value=feature_id))]
        )
        try:
            points, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=q_filter,
                limit=1,
                with_payload=True,
            )
            if points:
                return self._payload_to_feature(points[0].payload or {})
        except Exception:
            pass

        if self.feature_store:
            return self.feature_store.get_feature(feature_id)
        return None
