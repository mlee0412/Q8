/**
 * YouTube IFrame Player API TypeScript Definitions
 * Based on: https://developers.google.com/youtube/iframe_api_reference
 */

declare namespace YT {
  /** Player state constants */
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  /** Player error codes */
  enum PlayerError {
    INVALID_PARAM = 2,
    HTML5_ERROR = 5,
    VIDEO_NOT_FOUND = 100,
    EMBED_NOT_ALLOWED = 101,
    EMBED_NOT_ALLOWED_DISGUISE = 150,
  }

  /** Player variables for customization */
  interface PlayerVars {
    /** Auto-play the video (0 or 1) */
    autoplay?: 0 | 1;
    /** Default caption language (ISO 639-1 two-letter code) */
    cc_lang_pref?: string;
    /** Show captions by default (1) */
    cc_load_policy?: 0 | 1;
    /** Progress bar color ('red' or 'white') */
    color?: 'red' | 'white';
    /** Show player controls (0 or 1) */
    controls?: 0 | 1;
    /** Disable keyboard controls (0 or 1) */
    disablekb?: 0 | 1;
    /** Enable JavaScript API (1) */
    enablejsapi?: 0 | 1;
    /** End time in seconds */
    end?: number;
    /** Allow fullscreen (0 or 1) */
    fs?: 0 | 1;
    /** Interface language (ISO 639-1) */
    hl?: string;
    /** Video annotations (1 = show, 3 = hide) */
    iv_load_policy?: 1 | 3;
    /** Playlist or channel ID */
    list?: string;
    /** List type ('playlist' or 'user_uploads') */
    listType?: 'playlist' | 'user_uploads';
    /** Loop the video (0 or 1) */
    loop?: 0 | 1;
    /** Modest branding (deprecated) */
    modestbranding?: 0 | 1;
    /** Origin domain for security */
    origin?: string;
    /** Comma-separated video IDs for playlist */
    playlist?: string;
    /** Inline playback on iOS (0 or 1) */
    playsinline?: 0 | 1;
    /** Related videos from same channel (0 or 1) */
    rel?: 0 | 1;
    /** Start time in seconds */
    start?: number;
    /** Widget referrer URL */
    widget_referrer?: string;
  }

  /** Event object passed to event handlers */
  interface PlayerEvent {
    target: Player;
    data?: number;
  }

  /** Event handlers for player */
  interface Events {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: PlayerEvent) => void;
    onPlaybackQualityChange?: (event: PlayerEvent) => void;
    onPlaybackRateChange?: (event: PlayerEvent) => void;
    onError?: (event: PlayerEvent) => void;
    onApiChange?: (event: PlayerEvent) => void;
    onAutoplayBlocked?: (event: PlayerEvent) => void;
  }

  /** Options for creating a player */
  interface PlayerOptions {
    width?: number | string;
    height?: number | string;
    videoId?: string;
    playerVars?: PlayerVars;
    events?: Events;
  }

  /** Spherical video properties for 360° videos */
  interface SphericalProperties {
    yaw?: number;
    pitch?: number;
    roll?: number;
    fov?: number;
    enableOrientationSensor?: boolean;
  }

  /** YouTube Player class */
  class Player {
    constructor(elementId: string | HTMLElement, options?: PlayerOptions);

    // Queueing functions
    loadVideoById(videoId: string, startSeconds?: number): void;
    loadVideoById(options: {
      videoId: string;
      startSeconds?: number;
      endSeconds?: number;
    }): void;
    cueVideoById(videoId: string, startSeconds?: number): void;
    cueVideoById(options: {
      videoId: string;
      startSeconds?: number;
      endSeconds?: number;
    }): void;
    loadVideoByUrl(mediaContentUrl: string, startSeconds?: number): void;
    cueVideoByUrl(mediaContentUrl: string, startSeconds?: number): void;
    loadPlaylist(
      playlist: string | string[],
      index?: number,
      startSeconds?: number
    ): void;
    cuePlaylist(
      playlist: string | string[],
      index?: number,
      startSeconds?: number
    ): void;

    // Playback controls
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;

    // 360° video controls
    getSphericalProperties(): SphericalProperties;
    setSphericalProperties(properties: SphericalProperties): void;

    // Playlist controls
    nextVideo(): void;
    previousVideo(): void;
    playVideoAt(index: number): void;

    // Volume controls
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    setVolume(volume: number): void;
    getVolume(): number;

    // Player size
    setSize(width: number, height: number): object;

    // Playback rate
    getPlaybackRate(): number;
    setPlaybackRate(suggestedRate: number): void;
    getAvailablePlaybackRates(): number[];

    // Playlist behavior
    setLoop(loopPlaylists: boolean): void;
    setShuffle(shufflePlaylist: boolean): void;

    // Playback status
    getVideoLoadedFraction(): number;
    getPlayerState(): PlayerState;
    getCurrentTime(): number;
    getVideoStartBytes(): number;
    getVideoBytesLoaded(): number;
    getVideoBytesTotal(): number;

    // Video information
    getDuration(): number;
    getVideoUrl(): string;
    getVideoEmbedCode(): string;

    // Playlist information
    getPlaylist(): string[];
    getPlaylistIndex(): number;

    // Event listeners
    addEventListener<K extends keyof Events>(
      event: K,
      listener: Events[K]
    ): void;
    removeEventListener<K extends keyof Events>(
      event: K,
      listener: Events[K]
    ): void;

    // DOM access
    getIframe(): HTMLIFrameElement;
    destroy(): void;
  }
}

export {};
