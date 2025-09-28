import React, { useState, useEffect, useMemo } from 'react'
import usNavyLogo from '../../assets/images/usnavy_logo.webp'
import teamImage from '../../assets/images/fcs_team.webp'
import navyLogo from '../../assets/images/navy_logo.webp'
import { CheckCircle, Globe, Headphones, BookOpen, Target, Shield, Languages } from 'lucide-react'
import { Container, Card, Button, Alert, MiniAudioPlayer, Header } from '../ui'
// audioStorage removed - using localStorage for playlist persistence

const HistoryPage: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'th'>('en')
  const [isPlaying, setIsPlaying] = useState(false)
  const [showMiniPlayer, setShowMiniPlayer] = useState(false)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  // Default playlist
  interface Track { src: string; title: string }
  const defaultPlaylist: Track[] = useMemo(() => ([
    {
      src: new URL('../../assets/audio/หลักการ-Pqs.mp3', import.meta.url).toString(),
      title: "หลักการ PQS"
    },
    {
      src: new URL('../../assets/audio/ความฝันอันสูงสุด.ogg', import.meta.url).toString(),
      title: "ความฝันอันสูงสุด"
    }
  ]), [])

  // Load playlist from IndexedDB or use default
  const [playlist, setPlaylist] = useState<Track[]>(defaultPlaylist)
  const [isLoading, setIsLoading] = useState(true)

  // Load playlist on component mount
  useEffect(() => {
    const loadPlaylist = () => {
      try {
        const savedPlaylist = localStorage.getItem('pqs-audio-playlist')
        if (savedPlaylist) {
          const parsedPlaylist = JSON.parse(savedPlaylist)
          // Filter out invalid URLs (blob URLs that are no longer valid)
          const validPlaylist = parsedPlaylist.filter((track: Track) => {
            // Keep default tracks (they have relative paths)
            if (track.src.startsWith('/src/assets/')) {
              return true
            }
            // Keep data URLs (they are persistent)
            if (track.src.startsWith('data:audio/')) {
              return true
            }
            // Remove blob URLs (they expire)
            if (track.src.startsWith('blob:')) {
              return false
            }
            return true
          })
          
          // If we removed any tracks, update storage
          if (validPlaylist.length !== parsedPlaylist.length) {
            localStorage.setItem('pqs-audio-playlist', JSON.stringify(validPlaylist))
          }
          
          setPlaylist(validPlaylist)
        }
      } catch (error) {
        console.error('Error loading playlist:', error)
        setPlaylist(defaultPlaylist)
      } finally {
        setIsLoading(false)
      }
    }

    loadPlaylist()
  }, [defaultPlaylist])
  const audioRef = React.useRef<HTMLAudioElement>(null)
  
  // Alert state for PQS info
  const [showPQSInfoAlert] = useState(true)

  // Content data for both languages
  const content = {
    en: {
      description: "A Personnel Qualification Standard (PQS) is a standardized system used by the U.S. military, and other organizations, to verify that personnel possess the necessary knowledge and skills to perform specific tasks or duties, particularly those related to safety, security, and proper operation of equipment. PQS outlines the minimum requirements, often including training, experience, and practical demonstrations, to ensure personnel are qualified for their roles.",
      cards: [
        {
          title: "Minimum Knowledge",
          description: "Fundamental knowledge and testing for basic operations"
        },
        {
          title: "Minimum Skills", 
          description: "Training and testing the necessary operations to work correctly"
        },
        {
          title: "Safety for All",
          description: "Safety of personnel is the first priority, and equipment and other related matters follow suit."
        }
      ],
      alert: {
        title: "Personnel Qualification Standard : PQS",
        message: "A roadmap or a map to build expertise, so that personnel can know what knowledge and skills they need to perform their duties in that position safely and efficiently."
      }
    },
    th: {
      description: "มาตรฐานกำลังพล (PQS) เป็นระบบมาตรฐานที่กองทัพสหรัฐฯ และองค์กรอื่นๆ ใช้เพื่อตรวจสอบให้แน่ใจว่าบุคลากรมีความรู้และทักษะที่จำเป็นในการปฏิบัติงาน หรือ หน้าที่เฉพาะ โดยเฉพาะอย่างยิ่งที่เกี่ยวข้องกับความปลอดภัย ความมั่นคง และการใช้งานอุปกรณ์อย่างถูกต้อง PQS ระบุข้อกำหนดขั้นต่ำ ซึ่งมักรวมถึงการฝึกอบรม ประสบการณ์ และการสาธิตภาคปฏิบัติ เพื่อให้มั่นใจว่าบุคลากรมีคุณสมบัติเหมาะสมกับบทบาทหน้าที่ของตน และที่สำคัญยิ่ง คือ: เป็นเครื่องมือการพัฒนาที่ให้เส้นทางการเรียนรู้ ที่มีโครงสร้างอย่างชัดเจน",
      cards: [
        {
          title: "ความรู้ขั้นต่ำ",
          description: "ฝึกอบรมให้ความรู้ และการฝึกหัดศึกษา ระดับพื้นฐานที่เพียงพอ ต่อการทำงาน เบื้องต้นได้"
        },
        {
          title: "ความชำนาญขั้นต่ำ",
          description: "ฝึกการปฏิบัติงานในตำแหน่ง เพื่อสร้างความชำนาญขั้นต่ำ และมีประสิทธิภาพเพียงพอ"
        },
        {
          title: "ทุกสิ่งปลอดภัย",
          description: "ความปลอดภัยต่อบุคลากรเป็นลำดับแรก และยุทโธปกรณ์และอื่นๆ ที่เกี่ยวข้อง ตามลำดับ"
        }
      ],
      alert: {
        title: "เอกสารมาตรฐานกำลังพล คือ:",
        message: "แผนที่นำทาง หรือ แผนที่สร้างความเชี่ยวชาญ เพื่อให้กำลังพล ต้องมีความรู้ และทักษะ อะไรบ้าง ถึงจะปฏิบัติหน้าที่ในตำแหน่งนั้นๆ ได้อย่างปลอดภัย มีประสิทธิภาพ"
      }
    }
  }

  const handleLanguageChange = (lang: 'en' | 'th') => {
    setLanguage(lang)
  }

  const handlePodcastToggle = () => {
    if (audioRef.current) {
      if (!showMiniPlayer) {
        // First click: Show mini player and start playing
        setCurrentTrackIndex(0)
        if (audioRef.current) {
          audioRef.current.currentTime = 0
        }
        
        // Load audio first, then play
        audioRef.current.load()
        
        // Wait for audio to be loaded before playing
        const playAudio = () => {
          audioRef.current?.play().then(() => {
            setIsPlaying(true)
            setShowMiniPlayer(true)
          }).catch((error) => {
            console.error('Error playing audio:', error)
          })
        }
        
        // If audio is already loaded, play immediately
        if (audioRef.current.readyState >= 2) {
          playAudio()
        } else {
          // Wait for audio to load
          audioRef.current.addEventListener('canplaythrough', playAudio, { once: true })
        }
      } else {
        // Second click: Hide mini player and stop playing
        audioRef.current.pause()
        setIsPlaying(false)
        setShowMiniPlayer(false)
      }
    }
  }

  // Separate function for Mini Player's Play/Pause button
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true)
        }).catch((error) => {
          console.error('Error playing audio:', error)
        })
      }
    }
  }

  const handleAudioEnded = () => {
    // Auto play next track - loop back to first track when reaching the end
    const nextIndex = (currentTrackIndex + 1) % playlist.length
    handleTrackChange(nextIndex)
  }

  const handleTrackChange = (newIndex: number) => {
    setCurrentTrackIndex(newIndex)
    // Reset audio to beginning of new track
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      // Wait for audio to load before auto-playing
      const playAudio = () => {
        audioRef.current?.play().then(() => {
          setIsPlaying(true)
        }).catch((error) => {
          console.error('Error auto-playing track:', error)
          setIsPlaying(false)
        })
      }
      
      // If audio is already loaded, play immediately
      if (audioRef.current.readyState >= 2) {
        playAudio()
      } else {
        // Wait for audio to load
        audioRef.current.addEventListener('canplaythrough', playAudio, { once: true })
      }
    }
  }



  // Handle stop (pause and hide mini player)
  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setShowMiniPlayer(false) // Hide mini player
    }
  }

  // Reset playlist to default (optional function)
  const resetPlaylist = async () => {
    setPlaylist(defaultPlaylist)
    setCurrentTrackIndex(0)
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setShowMiniPlayer(false)
    }
    // Clear storage
    localStorage.removeItem('pqs-audio-playlist')
  }





  // Save playlist to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('pqs-audio-playlist', JSON.stringify(playlist))
      } catch (error) {
        console.error('Error saving playlist:', error)
      }
    }
  }, [playlist, isLoading])

  // Load audio when track changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load()
    }
  }, [currentTrackIndex])



  // Show loading state
  if (isLoading) {
    return (
      <section className="transition-colors duration-200">
        <Container size="large" padding="large" className="py-12 sm:py-20">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-text-primary mx-auto mb-4"></div>
              <p className="text-github-text-secondary">Loading playlist...</p>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className="transition-colors duration-200">
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
  src={playlist[currentTrackIndex]?.src || new URL('../../assets/audio/หลักการ-Pqs.mp3', import.meta.url).toString()}
        onEnded={handleAudioEnded}
        onPause={() => {
          setIsPlaying(false)
          // Don't hide mini player when pausing
        }}
        onPlay={() => {
          setIsPlaying(true)
          setShowMiniPlayer(true)
        }}
      />
      
      <Container size="large" padding="large" className="py-12 sm:py-20">
        {/* Header Section */}
        <Header
          logo={navyLogo}
          logoAlt="PQS RTN Logo"
          title={language === 'en' ? 'History of PQS' : 'ประวัติความเป็นมาของ PQS'}
          subtitle="Personnel Qualification Standard"
          description={language === 'en' ? 'The evolution and development of naval personnel qualification standards' : 'วิวัฒนาการและการพัฒนามาตรฐานการรับรองบุคลากรทางทหารเรือ'}
        />

        {/* Top Section - Content + Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* US Navy Section */}
            <div className="flex items-center space-x-4">
              <img 
                src={usNavyLogo} 
                alt="US Navy Logo"
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain"
              />
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium text-github-text-primary">
                Trusted by United States Navy since 1970s
              </h2>
            </div>

            {/* Description Paragraph */}
            <div className="space-y-6">
              <p className="text-sm sm:text-base md:text-lg text-github-text-secondary leading-relaxed font-light">
                {content[language].description}
              </p>



              {/* Language Toggle Buttons */}
              <div className="flex items-center justify-between">
                {/* Language Toggle Buttons - Left Side */}
                <div className="flex items-center space-x-4">
                  <Button 
                    variant={language === 'en' ? 'primary' : 'outline'} 
                    size="small"
                    onClick={() => handleLanguageChange('en')}
                  >
                    Us - English
                  </Button>
                  <Button 
                    variant={language === 'th' ? 'primary' : 'outline'} 
                    size="small"
                    onClick={() => handleLanguageChange('th')}
                  >
                    Th - ไทย
                  </Button>
                </div>

                                 {/* Podcast Button - Right Side */}
                 <div className="flex items-center space-x-2">
                   <Button 
                     variant={isPlaying ? 'primary' : 'outline'} 
                     size="small"
                     onClick={handlePodcastToggle}
                     icon={<Headphones className="w-4 h-4" />}
                   >
                     {isPlaying ? 'กำลังเล่น Podcast' : 'ฟัง Podcast'}
                   </Button>
                   
                   {/* Reset Button - Only show if there are uploaded tracks */}
                   {playlist.length > defaultPlaylist.length && (
                     <Button 
                       variant="outline" 
                       size="small"
                       onClick={resetPlaylist}
                                               className="text-github-accent-danger hover:text-github-accent-danger border-github-accent-danger hover:border-github-accent-danger"
                     >
                       Reset Playlist
                     </Button>
                   )}
                 </div>
              </div>
            </div>

                         {/* List of Key Points */}
             <div className="space-y-4">
               <div className="flex items-start space-x-3">
                 <CheckCircle className="w-5 h-5 text-github-accent-success mt-0.5 flex-shrink-0" />
                 <div>
                   <span className="font-medium text-github-text-primary">Minimum knowledge : </span>
                   <span className="text-github-text-secondary font-light">ความรู้ขั้นต่ำ</span>
                 </div>
               </div>
               <div className="flex items-start space-x-3">
                 <CheckCircle className="w-5 h-5 text-github-accent-success mt-0.5 flex-shrink-0" />
                 <div>
                   <span className="font-medium text-github-text-primary">Minimum skills : </span>
                   <span className="text-github-text-secondary font-light">ความชำนาญขั้นต่ำ</span>
                 </div>
               </div>
               <div className="flex items-start space-x-3">
                 <CheckCircle className="w-5 h-5 text-github-accent-success mt-0.5 flex-shrink-0" />
                 <div>
                   <span className="font-medium text-github-text-primary">Safety for All : </span>
                   <span className="text-github-text-secondary font-light">สำคัญที่สุด บุคลากร และยุทโธปกรณ์ ปลอดภัย</span>
                 </div>
               </div>
             </div>

                           {/* PQS Warning Alert */}
              {showPQSInfoAlert && (
                <Alert
                  type="warning"
                  title={content[language].alert.title}
                  message={content[language].alert.message}
                  showCloseButton={false}
                />
              )}
          </div>

          {/* Right Column - Cards + Team Image */}
          <div className="space-y-8">
            {/* Three Cards using Reusable Card Component */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Card 
                title={content[language].cards[0].title}
                subtitle={content[language].cards[0].description}
                icon={<BookOpen className="w-8 h-8 text-github-accent-info" />}
                hover={true}
                size="medium"
              />

              <Card 
                title={content[language].cards[1].title}
                subtitle={content[language].cards[1].description}
                icon={<Target className="w-8 h-8 text-github-accent-orange" />}
                hover={true}
                size="medium"
              />

              <Card 
                title={content[language].cards[2].title}
                subtitle={content[language].cards[2].description}
                icon={<Shield className="w-8 h-8 text-github-accent-success" />}
                hover={true}
                size="medium"
              />
            </div>

                         {/* Mini Audio Player */}
             {showMiniPlayer && (
               <div className="mb-4">
                                                                           <MiniAudioPlayer
                       audioRef={audioRef as React.RefObject<HTMLAudioElement>}
                       isPlaying={isPlaying}
                       onPlayPause={handlePlayPause}
                       onStop={handleStop}
                       onEnded={handleAudioEnded}
                       playlist={playlist}
                       currentTrackIndex={currentTrackIndex}
                       onTrackChange={handleTrackChange}
                     />
               </div>
             )}

                         {/* Team Image */}
             <div className="text-center">
               <img 
                 src={teamImage} 
                 alt="FCS Team"
                 className="w-full max-w-md mx-auto"
               />
             </div>
          </div>
        </div>

      </Container>
    </section>
  )
}

export default HistoryPage
