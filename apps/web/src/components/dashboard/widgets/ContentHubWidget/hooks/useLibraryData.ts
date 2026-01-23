/**
 * useLibraryData Hook
 * Manages fetching and state for Spotify/YouTube library data
 */

import { useState, useEffect, useCallback } from 'react';
import { useContentHub } from '@/hooks/useContentHub';
import type { ContentItem } from '@/types/contenthub';

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  imageUrl: string;
  duration: number;
  uri: string;
  spotifyUrl: string;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  imageUrl: string;
  owner: string;
  uri: string;
  spotifyUrl: string;
}

interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  duration: number;
  url: string;
}

function mapSpotifyTrack(t: SpotifyTrack, prefix = 'spotify'): ContentItem {
  return {
    id: `${prefix}-${t.id}`,
    source: 'spotify',
    type: 'track',
    title: t.name,
    subtitle: t.artist,
    thumbnailUrl: t.imageUrl,
    duration: t.duration,
    playbackUrl: t.spotifyUrl,
    deepLinkUrl: t.spotifyUrl,
    sourceMetadata: { uri: t.uri },
  };
}

function mapSpotifyPlaylist(p: SpotifyPlaylist, prefix = 'spotify-playlist'): ContentItem {
  return {
    id: `${prefix}-${p.id}`,
    source: 'spotify',
    type: 'track', // Playlists are treated as track containers
    title: p.name,
    subtitle: p.owner,
    thumbnailUrl: p.imageUrl,
    duration: 0,
    playbackUrl: p.spotifyUrl,
    deepLinkUrl: p.spotifyUrl,
    sourceMetadata: { uri: p.uri, playlistId: p.id, isPlaylist: true },
  };
}

function mapYouTubeVideo(v: YouTubeVideo, prefix = 'youtube'): ContentItem {
  return {
    id: `${prefix}-${v.id}`,
    source: 'youtube',
    type: 'video',
    title: v.title,
    subtitle: v.channel,
    thumbnailUrl: v.thumbnailUrl,
    duration: v.duration,
    playbackUrl: v.url,
    deepLinkUrl: v.url,
    sourceMetadata: { videoId: v.id },
  };
}

export function useLibraryData() {
  const {
    fetchRecommendations,
    fetchSpotifyLibrary,
    fetchYouTubeLibrary,
    fetchYouTubeHistory,
    fetchPlaylistTracks,
    addToPlaylist,
    createPlaylist,
  } = useContentHub();

  // Recommendations
  const [recommendations, setRecommendations] = useState<ContentItem[]>([]);
  const [trending, setTrending] = useState<ContentItem[]>([]);

  // Spotify library
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<ContentItem[]>([]);
  const [spotifyRecentlyPlayed, setSpotifyRecentlyPlayed] = useState<ContentItem[]>([]);
  const [spotifyTopTracks, setSpotifyTopTracks] = useState<ContentItem[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<ContentItem[]>([]);

  // YouTube library
  const [youtubeTrending, setYoutubeTrending] = useState<ContentItem[]>([]);
  const [youtubeMusic, setYoutubeMusic] = useState<ContentItem[]>([]);

  // YouTube user data (from history API - liked videos & subscriptions)
  const [youtubeLikedVideos, setYoutubeLikedVideos] = useState<ContentItem[]>([]);
  const [youtubeFromSubscriptions, setYoutubeFromSubscriptions] = useState<ContentItem[]>([]);
  const [youtubeAuthenticated, setYoutubeAuthenticated] = useState(false);

  // Playlist detail
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string } | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<ContentItem[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  // Load recommendations on mount
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const data = await fetchRecommendations();
        setRecommendations(data.recommendations || []);
        setTrending(data.trending || []);
      } catch {
        // Silently fail - recommendations are optional
        setRecommendations([]);
        setTrending([]);
      }
    };
    loadRecommendations();
  }, [fetchRecommendations]);

  // Load library data on mount
  useEffect(() => {
    const loadLibraryData = async () => {
      // Fetch Spotify library
      const spotifyData = await fetchSpotifyLibrary();
      if (spotifyData) {
        if (spotifyData.playlists) {
          setSpotifyPlaylists(spotifyData.playlists.map((p: SpotifyPlaylist) => mapSpotifyPlaylist(p)));
        }
        if (spotifyData.recentlyPlayed) {
          setSpotifyRecentlyPlayed(spotifyData.recentlyPlayed.map((t: SpotifyTrack) => mapSpotifyTrack(t)));
        }
        if (spotifyData.topTracks) {
          setSpotifyTopTracks(spotifyData.topTracks.map((t: SpotifyTrack) => mapSpotifyTrack(t)));
        }
        if (spotifyData.featuredPlaylists) {
          setFeaturedPlaylists(spotifyData.featuredPlaylists.map((p: SpotifyPlaylist) => mapSpotifyPlaylist(p, 'spotify-featured')));
        }
      }

      // Fetch YouTube library (trending content)
      const youtubeData = await fetchYouTubeLibrary();
      if (youtubeData) {
        if (youtubeData.trending) {
          setYoutubeTrending(youtubeData.trending.map((v: YouTubeVideo) => mapYouTubeVideo(v)));
        }
        if (youtubeData.music) {
          setYoutubeMusic(youtubeData.music.map((v: YouTubeVideo) => mapYouTubeVideo(v, 'youtube-music')));
        }
      }

      // Fetch YouTube user history (liked videos, subscriptions)
      const youtubeHistory = await fetchYouTubeHistory();
      if (youtubeHistory) {
        setYoutubeAuthenticated(youtubeHistory.authenticated || false);

        // Liked videos are already ContentItem format from the API
        if (youtubeHistory.likedVideos && Array.isArray(youtubeHistory.likedVideos)) {
          setYoutubeLikedVideos(youtubeHistory.likedVideos);
        }

        // Recent uploads from subscribed channels
        if (youtubeHistory.recentFromSubscriptions && Array.isArray(youtubeHistory.recentFromSubscriptions)) {
          setYoutubeFromSubscriptions(youtubeHistory.recentFromSubscriptions);
        }
      }
    };
    loadLibraryData();
  }, [fetchSpotifyLibrary, fetchYouTubeLibrary, fetchYouTubeHistory]);

  // Open playlist to view tracks
  const handleOpenPlaylist = useCallback(async (playlistId: string, playlistName: string) => {
    setPlaylistLoading(true);
    setSelectedPlaylist({ id: playlistId, name: playlistName });
    try {
      const data = await fetchPlaylistTracks(playlistId);
      if (data?.tracks) {
        setPlaylistTracks(data.tracks.map((t: SpotifyTrack) => mapSpotifyTrack(t)));
      }
    } finally {
      setPlaylistLoading(false);
    }
  }, [fetchPlaylistTracks]);

  // Close playlist detail view
  const handleClosePlaylist = useCallback(() => {
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
  }, []);

  // Add track to playlist
  const handleAddToPlaylist = useCallback(async (playlistId: string, trackUri: string) => {
    return addToPlaylist(playlistId, trackUri);
  }, [addToPlaylist]);

  // Create new playlist and refresh list
  const handleCreatePlaylist = useCallback(async (name: string) => {
    const result = await createPlaylist(name);
    if (result.success) {
      const spotifyData = await fetchSpotifyLibrary();
      if (spotifyData?.playlists) {
        setSpotifyPlaylists(spotifyData.playlists.map((p: SpotifyPlaylist) => mapSpotifyPlaylist(p)));
      }
    }
    return result;
  }, [createPlaylist, fetchSpotifyLibrary]);

  return {
    // Recommendations
    recommendations,
    trending,
    // Spotify
    spotifyPlaylists,
    spotifyRecentlyPlayed,
    spotifyTopTracks,
    featuredPlaylists,
    // YouTube trending
    youtubeTrending,
    youtubeMusic,
    // YouTube user data
    youtubeLikedVideos,
    youtubeFromSubscriptions,
    youtubeAuthenticated,
    // Playlist detail
    selectedPlaylist,
    playlistTracks,
    playlistLoading,
    // Actions
    handleOpenPlaylist,
    handleClosePlaylist,
    handleAddToPlaylist,
    handleCreatePlaylist,
  };
}
