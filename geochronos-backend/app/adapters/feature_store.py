from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
import geopandas as gpd
from shapely.geometry import mapping
import pyogrio

from geochronos_engine.models import FeatureRecord


class GeoPackageFeatureStore:
    def __init__(self, gpkg_path: str | Path) -> None:
        self.gpkg_path = Path(gpkg_path)
        if not self.gpkg_path.exists():
            raise FileNotFoundError(f"Features GeoPackage not found at: {self.gpkg_path}")
        self._cache: Dict[str, FeatureRecord] = {}
        self._df: Optional[gpd.GeoDataFrame] = None

    def _row_to_record(self, row: Any) -> FeatureRecord:
        geom = row.geometry if hasattr(row, "geometry") else None
        if geom is not None and hasattr(geom, "bounds"):
            geom_dict = mapping(geom)
            minx, miny, maxx, maxy = geom.bounds
            geom_dict["min_x"] = minx
            geom_dict["min_y"] = miny
            geom_dict["max_x"] = maxx
            geom_dict["max_y"] = maxy
        else:
            geom_dict = {}
        fid = str(row.get("feature_id", ""))
        fclass = str(row.get("feature_class", ""))
        year = int(row.get("year", 2026))
        obs_id = str(row.get("observation_id", ""))
        conf = float(row.get("confidence", 1.0))
        item_id = str(row.get("source_item_id", obs_id))
        time_idx = int(row.get("cube_time_index", 0))
        area = float(row.get("area_m2", 0.0))
        semantic_text = f"{fclass} detected in {obs_id} ({year}) with area {area:.1f} m2"
        attrs = {
            "area_m2": area,
            "source_asset": str(row.get("source_asset", "")),
        }
        return FeatureRecord(
            feature_id=fid,
            feature_class=fclass,
            year=year,
            geometry=geom_dict,
            observation_id=obs_id,
            confidence=conf,
            source_item_id=item_id,
            cube_time_index=time_idx,
            semantic_text=semantic_text,
            attributes=attrs,
        )

    def get_feature(self, feature_id: str) -> Optional[FeatureRecord]:
        if feature_id in self._cache:
            return self._cache[feature_id]

        try:
            # Direct SQL query via pyogrio
            df = pyogrio.read_dataframe(
                str(self.gpkg_path),
                where=f"feature_id = '{feature_id}'",
                max_features=1,
            )
            if not df.empty:
                rec = self._row_to_record(df.iloc[0])
                self._cache[feature_id] = rec
                return rec
        except Exception:
            pass

        return None

    def get_features(self, **filters: Any) -> List[FeatureRecord]:
        clauses = []
        feature_class = filters.get("feature_class")
        if feature_class:
            clauses.append(f"feature_class = '{feature_class}'")

        year = filters.get("year")
        if year:
            clauses.append(f"year = {int(year)}")

        years = filters.get("years")
        if years:
            year_list = ",".join(str(int(y)) for y in years)
            clauses.append(f"year IN ({year_list})")

        obs_id = filters.get("observation_id")
        if obs_id:
            clauses.append(f"observation_id = '{obs_id}'")

        fid = filters.get("feature_id")
        if fid:
            clauses.append(f"feature_id = '{fid}'")

        where_clause = " AND ".join(clauses) if clauses else None
        limit = filters.get("limit", 50)
        offset = filters.get("offset", 0)

        bbox = filters.get("bbox")  # (minx, miny, maxx, maxy)

        try:
            df = pyogrio.read_dataframe(
                str(self.gpkg_path),
                where=where_clause,
                bbox=bbox,
                max_features=limit + offset if (limit or offset) else None,
            )
            if offset > 0:
                df = df.iloc[offset:]
            if limit:
                df = df.iloc[:limit]

            records = [self._row_to_record(row) for _, row in df.iterrows()]
            for r in records:
                self._cache[r.feature_id] = r
            return records
        except Exception as e:
            return []

    def get_features_by_observation(self, observation_id: str) -> List[FeatureRecord]:
        return self.get_features(observation_id=observation_id, limit=200)

    def count(self, **filters: Any) -> int:
        clauses = []
        if filters.get("feature_class"):
            clauses.append(f"feature_class = '{filters['feature_class']}'")
        if filters.get("year"):
            clauses.append(f"year = {int(filters['year'])}")
        if filters.get("observation_id"):
            clauses.append(f"observation_id = '{filters['observation_id']}'")
        where = " AND ".join(clauses) if clauses else None

        try:
            df = pyogrio.read_dataframe(str(self.gpkg_path), columns=["feature_id"], where=where)
            return len(df)
        except Exception:
            return 0
