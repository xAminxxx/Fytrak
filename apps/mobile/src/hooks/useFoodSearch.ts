import { useState, useCallback, useEffect } from "react";
import { searchFood, type FoodItem } from "../services/nutritionSearchService";

type UseFoodSearchOptions = {
  debounceMs?: number;
};

export function useFoodSearch(options: UseFoodSearchOptions = {}) {
  const { debounceMs = 400 } = options;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const found = await searchFood(trimmed);
        setResults(found);
      } catch (e) {
        console.error("Food search failed:", e);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [query, debounceMs]);

  return {
    query,
    setQuery,
    results,
    isSearching,
  };
}
