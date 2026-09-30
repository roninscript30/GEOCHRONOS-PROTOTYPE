from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
import pystac


class STACCatalogStore:
    def __init__(self, catalog_path: str | Path) -> None:
        self.catalog_path = Path(catalog_path)
        if not self.catalog_path.exists():
            raise FileNotFoundError(f"STAC catalog not found at: {self.catalog_path}")
        self._catalog: Optional[pystac.Catalog] = None
        self._items_cache: Dict[str, pystac.Item] = {}
        self._load_cache()

    def _load_cache(self) -> None:
        self._catalog = pystac.read_file(str(self.catalog_path))
        for item in self._catalog.get_items(recursive=True):
            self._items_cache[item.id] = item

    @property
    def catalog(self) -> pystac.Catalog:
        if self._catalog is None:
            self._load_cache()
        return self._catalog

    def get_item(self, source_item_id: str) -> Dict[str, Any]:
        if source_item_id in self._items_cache:
            return self._items_cache[source_item_id].to_dict()
        # Search by prefix or observation ID
        for item_id, item in self._items_cache.items():
            if item_id == source_item_id or source_item_id in item_id:
                return item.to_dict()
        return {"id": source_item_id, "assets": {}}

    def get_observation(self, observation_id: str) -> Dict[str, Any]:
        item_dict = self.get_item(observation_id)
        if "id" in item_dict and item_dict.get("assets"):
            return {
                "id": observation_id,
                "datetime": item_dict.get("properties", {}).get("datetime"),
                "platform": item_dict.get("properties", {}).get("platform"),
                "instruments": item_dict.get("properties", {}).get("instruments"),
                "items": [item_dict],
            }
        return {"id": observation_id, "items": []}

    def resolve_asset(self, source_item_id: str, asset_name: str) -> Dict[str, Any]:
        item = self.get_item(source_item_id)
        assets = item.get("assets", {})
        if asset_name in assets:
            return assets[asset_name]
        return {}

    def list_items(self) -> List[Dict[str, Any]]:
        return [item.to_dict() for item in self._items_cache.values()]
