'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minimize2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { NowPlayingCard } from './NowPlayingCard';
import { QuickActions } from './QuickActions';
import { QueueItem, ContentCard, PlaylistCard, ContentSection } from './components';
import type { MediaCommandCenterProps, ContentTabType } from './types';

export function MediaCommandCenter({
  onClose,
  nowPlaying,
  isPlaying,
  progress,
  queue,
  recommendations,
  trending,
  spotifyPlaylists,
  spotifyRecentlyPlayed,
  spotifyTopTracks,
  featuredPlaylists,
  youtubeTrending,
  youtubeMusic,
  selectedPlaylist,
  playlistTracks,
  playlistLoading,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onPlay,
  onRemove,
  onAIDiscover,
  onSmartHome,
  onVoice,
  aiDiscoverLoading,
  onOpenPlaylist,
  onClosePlaylist,
  onAddToPlaylist,
  onCreatePlaylist,
  onDeviceSelect,
  currentDeviceName,
}: MediaCommandCenterProps) {
  const { history, savedForLater } = useContentHubStore();
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTabType>('discover');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <Minimize2 className="h-5 w-5" />
      </Button>

      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-neon-primary" />
              <h1 className="text-2xl font-bold text-white">MediaCommandCenter</h1>
            </div>

            {/* Quick Actions */}
            <QuickActions
              onAIDiscover={onAIDiscover}
              onSmartHome={onSmartHome}
              onVoice={onVoice}
              aiDiscoverLoading={aiDiscoverLoading}
              className="flex-row-reverse"
            />
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Now Playing - Large */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl overflow-hidden bg-surface-3/50 backdrop-blur-sm border border-border-subtle">
                <NowPlayingCard
                  item={nowPlaying}
                  isPlaying={isPlaying}
                  progress={progress}
                  onPlayPause={onPlayPause}
                  onNext={onNext}
                  onPrevious={onPrevious}
                  onSeek={onSeek}
                  onDeviceSelect={nowPlaying?.source === 'spotify' ? onDeviceSelect : undefined}
                  showControls={true}
                  compact={false}
                  className="min-h-[300px]"
                  currentDeviceName={currentDeviceName}
                />
              </div>
            </div>

            {/* Queue & History sidebar */}
            <div className="space-y-6">
              {/* Up Next */}
              <div className="rounded-2xl bg-surface-3/50 backdrop-blur-sm border border-border-subtle p-4">
                <h3 className="text-sm font-medium text-white mb-3">Up Next</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {queue.slice(0, 5).map((item, index) => (
                    <QueueItem
                      key={item.id}
                      item={item}
                      index={index}
                      onPlay={() => onPlay(item)}
                      onRemove={() => onRemove(item.id)}
                    />
                  ))}
                  {queue.length === 0 && (
                    <p className="text-xs text-text-muted text-center py-4">
                      Queue is empty
                    </p>
                  )}
                </div>
              </div>

              {/* Recently Played */}
              <div className="rounded-2xl bg-surface-3/50 backdrop-blur-sm border border-border-subtle p-4">
                <h3 className="text-sm font-medium text-white mb-3">Recently Played</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {history.slice(0, 5).map((item, index) => (
                    <QueueItem
                      key={`${item.id}-${index}`}
                      item={item}
                      index={index}
                      onPlay={() => onPlay(item)}
                      showRemove={false}
                    />
                  ))}
                  {history.length === 0 && (
                    <p className="text-xs text-text-muted text-center py-4">
                      No history yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="mt-8">
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
              <Button
                variant={activeTab === 'discover' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('discover')}
                className={activeTab === 'discover' ? 'bg-neon-primary/20 text-neon-primary' : 'text-white/70'}
              >
                For You
              </Button>
              <Button
                variant={activeTab === 'spotify' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('spotify')}
                className={activeTab === 'spotify' ? 'bg-green-500/20 text-green-400' : 'text-white/70'}
              >
                Spotify
              </Button>
              <Button
                variant={activeTab === 'youtube' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('youtube')}
                className={activeTab === 'youtube' ? 'bg-red-500/20 text-red-400' : 'text-white/70'}
              >
                YouTube
              </Button>
            </div>

            {/* For You Tab */}
            {activeTab === 'discover' && (
              <div className="space-y-8">
                {recommendations.length > 0 && (
                  <ContentSection
                    title="Recommended for You"
                    items={recommendations}
                    onPlay={onPlay}
                    showAll={showAllRecommendations}
                    onToggleShowAll={() => setShowAllRecommendations(!showAllRecommendations)}
                  />
                )}

                {spotifyRecentlyPlayed.length > 0 && (
                  <ContentSection
                    title="Recently Played"
                    items={spotifyRecentlyPlayed}
                    onPlay={onPlay}
                  />
                )}

                {spotifyTopTracks.length > 0 && (
                  <ContentSection
                    title="Your Top Tracks"
                    items={spotifyTopTracks}
                    onPlay={onPlay}
                  />
                )}

                {savedForLater.length > 0 && (
                  <ContentSection
                    title="Saved for Later"
                    items={savedForLater}
                    onPlay={onPlay}
                  />
                )}
              </div>
            )}

            {/* Spotify Tab */}
            {activeTab === 'spotify' && (
              <div className="space-y-8">
                {/* Playlist Detail View */}
                {selectedPlaylist && (
                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClosePlaylist}
                        className="text-white/70 hover:text-white"
                      >
                        ← Back to Playlists
                      </Button>
                      <h3 className="text-xl font-semibold text-white">{selectedPlaylist.name}</h3>
                    </div>
                    {playlistLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {playlistTracks.map((item) => (
                          <ContentCard
                            key={item.id}
                            item={item}
                            onClick={() => onPlay(item)}
                          />
                        ))}
                        {playlistTracks.length === 0 && (
                          <p className="col-span-full text-center text-text-muted py-8">
                            This playlist is empty
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Playlists Grid (hidden when viewing playlist detail) */}
                {!selectedPlaylist && (
                  <>
                    {/* Add to Playlist / Create Playlist UI */}
                    {nowPlaying && nowPlaying.source === 'spotify' && (
                      <div className="mb-6 p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-white/70">Add current track to playlist:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddToPlaylist(!showAddToPlaylist)}
                            className="text-green-400 hover:text-green-300"
                          >
                            {showAddToPlaylist ? 'Cancel' : '+ Add to Playlist'}
                          </Button>
                        </div>
                        {showAddToPlaylist && (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="New playlist name..."
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                className="flex-1 px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded text-white placeholder:text-white/40"
                              />
                              <Button
                                size="sm"
                                disabled={!newPlaylistName.trim()}
                                onClick={async () => {
                                  const result = await onCreatePlaylist(newPlaylistName.trim());
                                  if (result.success) {
                                    setNewPlaylistName('');
                                    setShowAddToPlaylist(false);
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Create
                              </Button>
                            </div>
                            <div className="text-xs text-white/50 mb-2">Or add to existing:</div>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                              {spotifyPlaylists.slice(0, 10).map((playlist) => (
                                <Button
                                  key={playlist.id}
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs border border-white/20 hover:bg-green-600/20"
                                  onClick={() => {
                                    const playlistId = playlist.id.replace('spotify-playlist-', '');
                                    onAddToPlaylist(playlistId);
                                    setShowAddToPlaylist(false);
                                  }}
                                >
                                  {playlist.title}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Your Playlists */}
                    {spotifyPlaylists.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-white mb-4">Your Playlists</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {spotifyPlaylists.slice(0, 12).map((item) => (
                            <PlaylistCard
                              key={item.id}
                              item={item}
                              onClick={() => {
                                const playlistId = item.id.replace('spotify-playlist-', '');
                                onOpenPlaylist(playlistId, item.title);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Featured Playlists */}
                    {featuredPlaylists.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-white mb-4">Featured Playlists</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {featuredPlaylists.slice(0, 12).map((item) => (
                            <PlaylistCard
                              key={item.id}
                              item={item}
                              onClick={() => {
                                const playlistId = item.id.replace('spotify-featured-', '');
                                onOpenPlaylist(playlistId, item.title);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recently Played */}
                    {spotifyRecentlyPlayed.length > 0 && (
                      <ContentSection
                        title="Recently Played"
                        items={spotifyRecentlyPlayed}
                        onPlay={onPlay}
                      />
                    )}

                    {/* Top Tracks */}
                    {spotifyTopTracks.length > 0 && (
                      <ContentSection
                        title="Your Top Tracks"
                        items={spotifyTopTracks}
                        onPlay={onPlay}
                      />
                    )}

                    {spotifyPlaylists.length === 0 && spotifyRecentlyPlayed.length === 0 && (
                      <p className="text-sm text-text-muted text-center py-8">
                        Connect Spotify to see your playlists and history
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* YouTube Tab */}
            {activeTab === 'youtube' && (
              <div className="space-y-8">
                {youtubeMusic.length > 0 && (
                  <ContentSection
                    title="Trending Music"
                    items={youtubeMusic}
                    onPlay={onPlay}
                  />
                )}

                {youtubeTrending.length > 0 && (
                  <ContentSection
                    title="Trending Videos"
                    items={youtubeTrending}
                    onPlay={onPlay}
                  />
                )}

                {trending.length > 0 && (
                  <ContentSection
                    title="Popular Now"
                    items={trending}
                    onPlay={onPlay}
                    showAll={showAllTrending}
                    onToggleShowAll={() => setShowAllTrending(!showAllTrending)}
                  />
                )}

                {youtubeTrending.length === 0 && youtubeMusic.length === 0 && trending.length === 0 && (
                  <p className="text-sm text-text-muted text-center py-8">
                    No YouTube content available
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
