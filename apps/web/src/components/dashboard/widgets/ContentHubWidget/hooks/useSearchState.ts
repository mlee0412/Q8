/**
 * useSearchState Hook
 * Manages search functionality state for ContentHub
 */

import { useState, useCallback } from 'react';
import { useContentHub } from '@/hooks/useContentHub';
import type { ContentItem } from '@/types/contenthub';

interface UseSearchStateReturn {
  searchQuery: string;
  showSearch: boolean;
  searchResults: ContentItem[];
  searchLoading: boolean;
  handleSearch: (query: string) => Promise<void>;
  handlePlayFromSearch: (item: ContentItem, onPlay: (item: ContentItem) => void) => void;
  clearSearch: () => void;
  setShowSearch: (show: boolean) => void;
}

export function useSearchState(): UseSearchStateReturn {
  const { search } = useContentHub();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.length >= 2) {
        setSearchLoading(true);
        try {
          const results = await search(query);
          setSearchResults(results);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    },
    [search]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  }, []);

  const handlePlayFromSearch = useCallback(
    (item: ContentItem, onPlay: (item: ContentItem) => void) => {
      onPlay(item);
      clearSearch();
    },
    [clearSearch]
  );

  return {
    searchQuery,
    showSearch,
    searchResults,
    searchLoading,
    handleSearch,
    handlePlayFromSearch,
    clearSearch,
    setShowSearch,
  };
}

export default useSearchState;
