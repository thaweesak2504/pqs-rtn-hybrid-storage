import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, RotateCcw, RotateCw, List } from 'lucide-react'

interface MiniAudioPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement>
  isPlaying: boolean
  onPlayPause: () => void
  onStop?: () => void
  onEnded: () => void
  className?: string
  title?: string
  playlist?: Array<{
    src: string
    title: string
  }>
  currentTrackIndex?: number
  onTrackChange?: (index: number) => void
}

const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({
  audioRef,
  isPlaying,
  onPlayPause,
  onStop,
  onEnded,
  className = '',
  title = 'PQS Podcast',
  playlist = [],
  currentTrackIndex = 0,
  onTrackChange
}) => {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isVolumeDragging, setIsVolumeDragging] = useState(false)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [srStatus, setSrStatus] = useState('')
  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)
  const playlistRef = useRef<HTMLDivElement>(null)
  
  // Current track title (memoized)
  const getCurrentTrackTitle = useCallback(() => {
    if (playlist.length > 0 && playlist[currentTrackIndex]) {
      return playlist[currentTrackIndex].title
    }
    return title
  }, [playlist, currentTrackIndex, title])

  // Format time to MM:SS
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle time update
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      onEnded()
      setSrStatus('Track ended')
    }

    const handlePlay = () => {
      // Ensure we start tracking time when audio starts playing
      setCurrentTime(audio.currentTime)
      setSrStatus(`Playing: ${getCurrentTrackTitle()}`)
    }
    const handlePause = () => {
      setSrStatus('Paused')
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
  audio.addEventListener('play', handlePlay)
  audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
  audio.removeEventListener('play', handlePlay)
  audio.removeEventListener('pause', handlePause)
    }
  }, [audioRef, onEnded, isDragging, getCurrentTrackTitle])

  // Sync with audio element when it changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Update current time and duration from audio element
    setCurrentTime(audio.currentTime || 0)
    setDuration(audio.duration || 0)
  }, [audioRef])

  // Continuous sync with audio element
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isDragging) return

    const syncInterval = setInterval(() => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime)
        setDuration(audio.duration || 0)
      }
    }, 100) // Update every 100ms for smooth progress

    return () => clearInterval(syncInterval)
  }, [audioRef, isDragging])

  // Reset progress when track changes
  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
  }, [currentTrackIndex])

  // Handle volume change
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted, audioRef])

  // Handle progress bar click and drag
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return
    updateProgressFromEvent(e)
  }

  const updateProgressFromEvent = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const audio = audioRef.current
    if (!audio || !progressRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const clickPercent = Math.max(0, Math.min(1, clickX / width))
    const newTime = clickPercent * audio.duration

    // Update audio position
    audio.currentTime = newTime
    // Update local state
    setCurrentTime(newTime)
  }, [audioRef])

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    updateProgressFromEvent(e)
  }

  const handleProgressMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      updateProgressFromEvent(e)
    }
  }, [isDragging, updateProgressFromEvent])

  const handleProgressMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add global mouse event listeners for progress dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleProgressMouseMove)
      document.addEventListener('mouseup', handleProgressMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleProgressMouseMove)
        document.removeEventListener('mouseup', handleProgressMouseUp)
      }
    }
  }, [isDragging, handleProgressMouseMove, handleProgressMouseUp])

  

  // Handle volume bar click and drag
  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isVolumeDragging) return
    updateVolumeFromEvent(e)
  }

  const updateVolumeFromEvent = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!volumeRef.current) return

    const rect = volumeRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const clickPercent = Math.max(0, Math.min(1, clickX / width))
    
    setVolume(clickPercent)
    setIsMuted(clickPercent === 0)
  }, [])

  const handleVolumeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsVolumeDragging(true)
    updateVolumeFromEvent(e)
  }

  const handleVolumeMouseMove = useCallback((e: MouseEvent) => {
    if (isVolumeDragging) {
      updateVolumeFromEvent(e)
    }
  }, [isVolumeDragging, updateVolumeFromEvent])

  const handleVolumeMouseUp = useCallback(() => {
    setIsVolumeDragging(false)
  }, [])

  // Add global mouse event listeners for volume dragging
  useEffect(() => {
    if (isVolumeDragging) {
      document.addEventListener('mousemove', handleVolumeMouseMove)
      document.addEventListener('mouseup', handleVolumeMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleVolumeMouseMove)
        document.removeEventListener('mouseup', handleVolumeMouseUp)
      }
    }
  }, [isVolumeDragging, handleVolumeMouseMove, handleVolumeMouseUp])

  // Handle mute toggle
  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
  }

  // Handle previous track
  const handlePreviousTrack = () => {
    if (playlist.length === 0) return
    const newIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : playlist.length - 1
    onTrackChange?.(newIndex)
  setSrStatus(`Previous track: ${playlist[newIndex]?.title || ''}`)
  }

  // Handle next track
  const handleNextTrack = () => {
    if (playlist.length === 0) return
    const newIndex = currentTrackIndex < playlist.length - 1 ? currentTrackIndex + 1 : 0
    onTrackChange?.(newIndex)
  setSrStatus(`Next track: ${playlist[newIndex]?.title || ''}`)
  }

  // Handle rewind (10 seconds back)
  const handleRewind = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, audio.currentTime - 10)
  }

  // Handle fast forward (10 seconds forward)
  const handleFastForward = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10)
  }

  

  // Handle playlist toggle
  const handlePlaylistToggle = () => {
    setShowPlaylist(!showPlaylist)
  }

  // Handle track selection from playlist
  const handleTrackSelect = (index: number) => {
    onTrackChange?.(index)
    setShowPlaylist(false)
    // Auto-play is now handled in handleTrackChange, no need to call onPlayPause here
  setSrStatus(`Selected track: ${playlist[index]?.title || ''}`)
  }

  // Close playlist when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (playlistRef.current && !playlistRef.current.contains(event.target as Node)) {
        setShowPlaylist(false)
      }
    }

    if (showPlaylist) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPlaylist])

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`relative ${className}`}>
  {/* Live region for screen reader announcements */}
  <span className="sr-only" aria-live="polite">{srStatus}</span>
      {/* Main Player */}
      <div className={`
        bg-github-bg-tertiary border border-github-border-primary 
        rounded-lg p-4 shadow-lg
      `}>
        {/* Song Title */}
        <div className="text-sm font-medium text-github-text-primary mb-3 truncate">
          {getCurrentTrackTitle()}
        </div>
      
        {/* Progress Bar */}
        <div className="mb-3">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
            role="slider"
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration) || 0}
            aria-valuenow={Math.floor(currentTime) || 0}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
      tabIndex={0}
            onKeyDown={(e) => {
              // Left/Right arrows to seek by 5s, Home/End to min/max
              const audio = audioRef.current
              if (!audio) return
              const step = 5
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + step)
                setCurrentTime(audio.currentTime)
        setSrStatus(`Position ${formatTime(audio.currentTime)} of ${formatTime(audio.duration || 0)}`)
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                audio.currentTime = Math.max(0, audio.currentTime - step)
                setCurrentTime(audio.currentTime)
        setSrStatus(`Position ${formatTime(audio.currentTime)} of ${formatTime(audio.duration || 0)}`)
              } else if (e.key === 'Home') {
                e.preventDefault()
                audio.currentTime = 0
                setCurrentTime(0)
        setSrStatus(`Position ${formatTime(0)} of ${formatTime(audio.duration || 0)}`)
              } else if (e.key === 'End') {
                e.preventDefault()
                audio.currentTime = audio.duration || 0
                setCurrentTime(audio.currentTime)
        setSrStatus(`Position ${formatTime(audio.currentTime)} of ${formatTime(audio.duration || 0)}`)
              }
            }}
            className={`w-full h-1 bg-github-border-primary rounded-full cursor-pointer relative ${
              isDragging ? 'select-none' : ''
            }`}
          >
            {/* Progress Bar Fill - Using inline style for dynamic percentage */}
            <div
              className="h-full bg-github-text-primary rounded-full transition-all duration-200"
              style={{ width: `${progressPercentage}%` }}
            />
            {/* Progress Thumb - Using inline style for dynamic positioning */}
            <div
              className={`absolute top-1/2 w-2 h-2 bg-github-text-primary rounded-full -translate-y-1/2 -translate-x-1 
                         ${isDragging ? 'scale-110' : 'scale-100'} transition-transform duration-200`}
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
        
          {/* Time Display */}
          <div className="flex justify-between text-xs text-github-text-secondary mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Player Controls - Left Side */}
          <div className="flex items-center space-x-2">
            {/* Previous Track */}
            <button
              onClick={handlePreviousTrack}
              className="flex items-center justify-center w-6 h-6 rounded-full 
                       bg-github-bg-tertiary hover:bg-github-bg-hover 
                       transition-colors duration-200"
              aria-label="Previous track"
              type="button"
            >
              <SkipBack className="w-3 h-3 text-github-text-secondary" />
            </button>

            {/* Rewind */}
            <button
              onClick={handleRewind}
              className="flex items-center justify-center w-6 h-6 rounded-full 
                       bg-github-bg-tertiary hover:bg-github-bg-hover 
                       transition-colors duration-200"
              aria-label="Rewind 10 seconds"
              type="button"
            >
              <RotateCcw className="w-3 h-3 text-github-text-secondary" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={onPlayPause}
              className="flex items-center justify-center w-8 h-8 rounded-full 
                       bg-github-bg-active hover:bg-github-bg-hover 
                       transition-colors duration-200"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              type="button"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-github-text-primary" />
              ) : (
                <Play className="w-4 h-4 text-github-text-primary ml-0.5" />
              )}
            </button>

            {/* Stop Button */}
            {onStop && (
              <button
                onClick={onStop}
                className="flex items-center justify-center w-6 h-6 rounded-full 
                         bg-github-bg-tertiary hover:bg-github-bg-hover 
                         transition-colors duration-200"
                aria-label="Stop"
                type="button"
              >
                <div className="w-3 h-3 bg-github-text-secondary rounded-sm" />
              </button>
            )}

            {/* Fast Forward */}
            <button
              onClick={handleFastForward}
              className="flex items-center justify-center w-6 h-6 rounded-full 
                       bg-github-bg-tertiary hover:bg-github-bg-hover 
                       transition-colors duration-200"
              aria-label="Fast forward 10 seconds"
              type="button"
            >
              <RotateCw className="w-3 h-3 text-github-text-secondary" />
            </button>

            {/* Next Track */}
            <button
              onClick={handleNextTrack}
              className="flex items-center justify-center w-6 h-6 rounded-full 
                       bg-github-bg-tertiary hover:bg-github-bg-hover 
                       transition-colors duration-200"
              aria-label="Next track"
              type="button"
            >
              <SkipForward className="w-3 h-3 text-github-text-secondary" />
            </button>
          </div>

          {/* Volume Control - Right Side */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMuteToggle}
              className="p-1 hover:bg-github-bg-hover rounded transition-colors duration-200"
              aria-label={isMuted || volume === 0 ? 'Unmute audio' : 'Mute audio'}
              type="button"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-github-text-secondary" />
              ) : (
                <Volume2 className="w-4 h-4 text-github-text-secondary" />
              )}
            </button>

            {/* Volume Bar */}
            <div
              ref={volumeRef}
              onClick={handleVolumeClick}
              onMouseDown={handleVolumeMouseDown}
              role="slider"
              aria-label="Volume"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
              aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)} percent`}
              tabIndex={0}
              onKeyDown={(e) => {
                const step = 0.05 // 5%
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  const next = Math.min(1, (isMuted ? 0 : volume) + step)
                  setIsMuted(false)
                  setVolume(next)
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault()
                  const next = Math.max(0, (isMuted ? 0 : volume) - step)
                  setIsMuted(next === 0)
                  setVolume(next)
                } else if (e.key === 'Home') {
                  e.preventDefault()
                  setIsMuted(true)
                  setVolume(0)
                } else if (e.key === 'End') {
                  e.preventDefault()
                  setIsMuted(false)
                  setVolume(1)
                }
              }}
              className={`w-16 h-1 bg-github-border-primary rounded-full cursor-pointer relative ${
                isVolumeDragging ? 'select-none' : ''
              }`}
            >
              {/* Volume Bar Fill - Using inline style for dynamic percentage */}
              <div
                className="h-full bg-github-text-primary rounded-full transition-all duration-200"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              />
              {/* Volume Thumb - Using inline style for dynamic positioning */}
              <div
                className={`absolute top-1/2 w-1.5 h-1.5 bg-github-text-primary rounded-full -translate-y-1/2 -translate-x-0.5 
                           ${isVolumeDragging ? 'scale-110' : 'scale-100'} transition-transform duration-200`}
                style={{ left: `${isMuted ? 0 : volume * 100}%` }}
              />
            </div>

            {/* Playlist Button */}
            <button
              onClick={handlePlaylistToggle}
              className="p-1 hover:bg-github-bg-hover rounded transition-colors duration-200"
              aria-label={showPlaylist ? 'Hide playlist' : 'Show playlist'}
              type="button"
            >
              <List className="w-4 h-4 text-github-text-secondary" />
            </button>
          </div>
        </div>

        {/* Playlist Dropdown */}
        {showPlaylist && (
          <div
            ref={playlistRef}
            className="absolute top-full right-0 mt-2 bg-github-bg-tertiary border border-github-border-primary rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto min-w-48 max-w-64"
          >
            <div className="p-3">
              <div className="text-xs font-medium text-github-text-secondary mb-3 px-1">
                Playlist
              </div>
              {playlist.map((track, index) => (
                <button
                  key={index}
                  onClick={() => handleTrackSelect(index)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors duration-200 ${
                    index === currentTrackIndex
                      ? 'bg-github-bg-active text-github-text-primary'
                      : 'text-github-text-secondary hover:bg-github-bg-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate pr-2">{track.title}</span>
                    {index === currentTrackIndex && (
                      <div className="w-2 h-2 bg-github-text-primary rounded-full flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MiniAudioPlayer
