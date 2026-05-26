import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'

// Assets
import navyLogo from '../../assets/images/navy_logo.webp'
import usNavyLogo from '../../assets/images/usnavy_logo.webp'
import teamImage from '../../assets/images/fcs_team.webp'
import heroBg from '../../assets/images/naval_fleet_bg.png'
import twt from '../../assets/images/twt.webp'
import boonchana from '../../assets/images/boonchana.webp'
import kittisak from '../../assets/images/kittisak.webp'

// UI Components
import { Container, Card, Button, Alert, Header, Title, Grid } from '../ui'
import { MiniAudioPlayer } from '../ui'

// Icons
import {
  Award,
  Mail,
  ShieldCheck,
  Users,
  GitMerge,
  ArrowRight,
  CheckCircle,
  Headphones,
  BookOpen,
  Target,
  Shield,
  Star,
  Home,
  History,
  ChevronUp,
} from 'lucide-react'

// Utils
import { invoke } from '@tauri-apps/api/tauri'
import { logger } from '../../utils/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  src: string
  title: string
}

interface HighRankingOfficer {
  id: number
  thai_name: string
  position_thai: string
  position_english: string
  order_index: number
}

type SectionId = 'hero' | 'history' | 'team'

interface SectionConfig {
  id: SectionId
  label: string
  thaiLabel: string
  icon: React.ReactNode
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTIONS: SectionConfig[] = [
  { id: 'hero', label: 'Home', thaiLabel: 'หน้าหลัก', icon: <Home className="w-4 h-4" /> },
  { id: 'history', label: 'History', thaiLabel: 'ประวัติ', icon: <History className="w-4 h-4" /> },
  { id: 'team', label: 'Team', thaiLabel: 'ทีมงาน', icon: <Users className="w-4 h-4" /> },
]

// ─── Component ────────────────────────────────────────────────────────────────

const WelcomeLandingPage: React.FC = () => {

  // ── Section Navigation State ─────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<SectionId>('hero')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    hero: null,
    history: null,
    team: null,
  })

  // ── History Section State ────────────────────────────────────────────────
  const [language, setLanguage] = useState<'en' | 'th'>('en')
  const [isPlaying, setIsPlaying] = useState(false)
  const [showMiniPlayer, setShowMiniPlayer] = useState(false)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

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

  const [playlist, setPlaylist] = useState<Track[]>(defaultPlaylist)
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(true)

  // ── Team Section State ───────────────────────────────────────────────────
  const [officers, setOfficers] = useState<HighRankingOfficer[]>([])
  const [avatars, setAvatars] = useState<Record<number, string>>({})
  const [isTeamLoading, setIsTeamLoading] = useState(true)

  // ── Content Data (History) ───────────────────────────────────────────────
  const content = {
    en: {
      description: "A Personnel Qualification Standard (PQS) is a standardized system used by the U.S. military, and other organizations, to verify that personnel possess the necessary knowledge and skills to perform specific tasks or duties, particularly those related to safety, security, and proper operation of equipment. PQS outlines the minimum requirements, often including training, experience, and practical demonstrations, to ensure personnel are qualified for their roles.",
      cards: [
        { title: "Minimum Knowledge", description: "Fundamental knowledge and testing for basic operations" },
        { title: "Minimum Skills", description: "Training and testing the necessary operations to work correctly" },
        { title: "Safety for All", description: "Safety of personnel is the first priority, and equipment and other related matters follow suit." }
      ],
      alert: {
        title: "Personnel Qualification Standard : PQS",
        message: "A roadmap or a map to build expertise, so that personnel can know what knowledge and skills they need to perform their duties in that position safely and efficiently."
      }
    },
    th: {
      description: "มาตรฐานกำลังพล (PQS) เป็นระบบมาตรฐานที่กองทัพสหรัฐฯ และองค์กรอื่นๆ ใช้เพื่อตรวจสอบให้แน่ใจว่าบุคลากรมีความรู้และทักษะที่จำเป็นในการปฏิบัติงาน หรือ หน้าที่เฉพาะ โดยเฉพาะอย่างยิ่งที่เกี่ยวข้องกับความปลอดภัย ความมั่นคง และการใช้งานอุปกรณ์อย่างถูกต้อง PQS ระบุข้อกำหนดขั้นต่ำ ซึ่งมักรวมถึงการฝึกอบรม ประสบการณ์ และการสาธิตภาคปฏิบัติ เพื่อให้มั่นใจว่าบุคลากรมีคุณสมบัติเหมาะสมกับบทบาทหน้าที่ของตน และที่สำคัญยิ่ง คือ: เป็นเครื่องมือการพัฒนาที่ให้เส้นทางการเรียนรู้ ที่มีโครงสร้างอย่างชัดเจน",
      cards: [
        { title: "ความรู้ขั้นต่ำ", description: "ฝึกอบรมให้ความรู้ และการฝึกหัดศึกษา ระดับพื้นฐานที่เพียงพอ ต่อการทำงาน เบื้องต้นได้" },
        { title: "ความชำนาญขั้นต่ำ", description: "ฝึกการปฏิบัติงานในตำแหน่ง เพื่อสร้างความชำนาญขั้นต่ำ และมีประสิทธิภาพเพียงพอ" },
        { title: "ทุกสิ่งปลอดภัย", description: "ความปลอดภัยต่อบุคลากรเป็นลำดับแรก และยุทโธปกรณ์และอื่นๆ ที่เกี่ยวข้อง ตามลำดับ" }
      ],
      alert: {
        title: "เอกสารมาตรฐานกำลังพล คือ:",
        message: "แผนที่นำทาง หรือ แผนที่สร้างความเชี่ยวชาญ เพื่อให้กำลังพล ต้องมีความรู้ และทักษะ อะไรบ้าง ถึงจะปฏิบัติหน้าที่ในตำแหน่งนั้นๆ ได้อย่างปลอดภัย มีประสิทธิภาพ"
      }
    }
  }

  const headerMetrics = [
    { value: "50+", label: "หน่วยงาน" },
    { value: "40K+", label: "บุคลากร" },
    { value: "24/7", label: "พร้อมรบ" }
  ]

  // ── Intersection Observer for Section Tracking ───────────────────────────
  useEffect(() => {
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id as SectionId)
        }
      })
    }, observerOptions)

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  // ── Scroll Top Button Visibility ─────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      // Find the scrollable parent (the main content area)
      const scrollParent = sectionRefs.current.hero?.closest('.overflow-y-auto')
      if (scrollParent) {
        setShowScrollTop(scrollParent.scrollTop > 400)
      }
    }

    // Attach to the scrollable parent instead of window
    const scrollParent = sectionRefs.current.hero?.closest('.overflow-y-auto')
    if (scrollParent) {
      scrollParent.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        scrollParent.removeEventListener('scroll', handleScroll)
      }
    }
    return undefined
  }, [])

  // ── Playlist Loading ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const savedPlaylist = localStorage.getItem('pqs-audio-playlist')
      if (savedPlaylist) {
        const parsedPlaylist = JSON.parse(savedPlaylist)
        const validPlaylist = parsedPlaylist.filter((track: Track) => {
          if (track.src.startsWith('/src/assets/')) return true
          if (track.src.startsWith('data:audio/')) return true
          if (track.src.startsWith('blob:')) return false
          return true
        })
        if (validPlaylist.length !== parsedPlaylist.length) {
          localStorage.setItem('pqs-audio-playlist', JSON.stringify(validPlaylist))
        }
        setPlaylist(validPlaylist)
      }
    } catch (error) {
      logger.error('Error loading playlist:', error)
      setPlaylist(defaultPlaylist)
    } finally {
      setIsPlaylistLoading(false)
    }
  }, [defaultPlaylist])

  // Save playlist to localStorage whenever it changes
  useEffect(() => {
    if (!isPlaylistLoading) {
      try {
        localStorage.setItem('pqs-audio-playlist', JSON.stringify(playlist))
      } catch (error) {
        logger.error('Error saving playlist:', error)
      }
    }
  }, [playlist, isPlaylistLoading])

  // Load audio when track changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load()
    }
  }, [currentTrackIndex])

  // ── Team Data Loading ────────────────────────────────────────────────────
  useEffect(() => {
    const loadTeamData = async () => {
      try {
        setIsTeamLoading(true)
        const officersData = await invoke<HighRankingOfficer[]>('get_all_high_ranking_officers')
        setOfficers(officersData)

        const avatarPromises = officersData.map(async (officer) => {
          try {
            const avatarInfo = await invoke('get_hybrid_high_rank_avatar_info', {
              officerId: officer.id
            }) as { avatar_path?: string; file_exists?: boolean }

            if (avatarInfo && avatarInfo.avatar_path && avatarInfo.file_exists) {
              const base64Data = await invoke('get_hybrid_high_rank_avatar_base64', {
                avatarPath: avatarInfo.avatar_path
              }) as string
              return { officerId: officer.id, url: base64Data }
            }
          } catch (error) {
            logger.error(`Failed to load avatar for officer ${officer.id}:`, error)
          }
          return null
        })

        const avatarResults = await Promise.all(avatarPromises)
        const avatarMap: Record<number, string> = {}
        avatarResults.forEach((result) => {
          if (result) {
            avatarMap[result.officerId] = result.url as string
          }
        })
        setAvatars(avatarMap)
      } catch (error) {
        logger.error('Failed to load officers:', error)
      } finally {
        setIsTeamLoading(false)
      }
    }

    loadTeamData()

    return () => {
      Object.values(avatars).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const scrollToSection = useCallback((sectionId: SectionId) => {
    const element = sectionRefs.current[sectionId]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const scrollToTop = useCallback(() => {
    const scrollParent = sectionRefs.current.hero?.closest('.overflow-y-auto')
    if (scrollParent) {
      scrollParent.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const handleLearnMore = () => scrollToSection('history')

  const handlePodcastToggle = () => {
    if (audioRef.current) {
      if (!showMiniPlayer) {
        setCurrentTrackIndex(0)
        if (audioRef.current) audioRef.current.currentTime = 0
        audioRef.current.load()
        const playAudio = () => {
          audioRef.current?.play().then(() => {
            setIsPlaying(true)
            setShowMiniPlayer(true)
          }).catch((error) => logger.error('Error playing audio:', error))
        }
        if (audioRef.current.readyState >= 2) {
          playAudio()
        } else {
          audioRef.current.addEventListener('canplaythrough', playAudio, { once: true })
        }
      } else {
        audioRef.current.pause()
        setIsPlaying(false)
        setShowMiniPlayer(false)
      }
    }
  }

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play().then(() => setIsPlaying(true))
          .catch((error) => logger.error('Error playing audio:', error))
      }
    }
  }

  const handleAudioEnded = () => {
    const nextIndex = (currentTrackIndex + 1) % playlist.length
    handleTrackChange(nextIndex)
  }

  const handleTrackChange = (newIndex: number) => {
    setCurrentTrackIndex(newIndex)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      const playAudio = () => {
        audioRef.current?.play().then(() => setIsPlaying(true))
          .catch((error) => {
            logger.error('Error auto-playing track:', error)
            setIsPlaying(false)
          })
      }
      if (audioRef.current.readyState >= 2) {
        playAudio()
      } else {
        audioRef.current.addEventListener('canplaythrough', playAudio, { once: true })
      }
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setShowMiniPlayer(false)
    }
  }

  const resetPlaylist = () => {
    setPlaylist(defaultPlaylist)
    setCurrentTrackIndex(0)
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setShowMiniPlayer(false)
    }
    localStorage.removeItem('pqs-audio-playlist')
  }

  const getOfficerImage = (officerId: number): string => {
    if (avatars[officerId]) return avatars[officerId]
    return ''
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative transition-colors duration-200">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={playlist[currentTrackIndex]?.src || new URL('../../assets/audio/หลักการ-Pqs.mp3', import.meta.url).toString()}
        onEnded={handleAudioEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => { setIsPlaying(true); setShowMiniPlayer(true) }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          Sticky Section Navigation Bar
          ═══════════════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-30 bg-github-bg-primary/90 backdrop-blur-md border-b border-github-border-primary shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-center gap-1 sm:gap-2 py-2">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`
                  flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200 whitespace-nowrap
                  ${activeSection === section.id
                    ? 'bg-github-bg-active text-github-text-primary shadow-sm'
                    : 'text-github-text-secondary hover:text-github-text-primary hover:bg-github-bg-hover'
                  }
                `}
                type="button"
              >
                {section.icon}
                <span className="hidden sm:inline">{section.thaiLabel}</span>
                <span className="sm:hidden">{section.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: HERO (from HeroSection.tsx)
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        ref={(el) => { sectionRefs.current.hero = el }}
        className="scroll-mt-14 relative overflow-hidden"
      >
        {/* Background Image with CSS Gradient Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-30"
            style={{ 
              backgroundImage: `url(${heroBg})`,
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)'
            }}
          />
        </div>

        <Container size="large" padding="large" className="py-12 sm:py-20 relative z-10">
          {/* Header Section */}
          <Header
            logo={navyLogo}
            logoAlt="PQS RTN Logo"
            title="กองทัพเรือ"
            subtitle="Royal Thai Navy"
            description="มาตรฐานกำลังพลกองทัพเรือ - Personnel Qualification Standard"
          />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left Column - Header Card + Objectives */}
            <div className="space-y-8">
              <Title
                title="มาตรฐานกำลังพล กองทัพเรือ"
                subtitle="Personnel Qualification Standard"
                description="เครื่องมือช่วยให้เป็นหนึ่งในกำลังพลที่มีความสามารถอย่างเพียงพอเพื่อให้ กองทัพเรือมีความพร้อม | Assist you in becoming a more productive member of Combat-Ready & Safety for All"
                size="large"
                align="left"
                className="mb-6"
              />

              {/* Learn More Button */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  variant="outline"
                  size="medium"
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                  onClick={handleLearnMore}
                >
                  เรียนรู้เพิ่มเติม
                </Button>
              </div>

              {/* Objectives */}
              <div>
                <Title
                  title="วัตถุประสงค์ : Objective"
                  size="medium"
                  align="left"
                  className="mb-6"
                />
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-6 rounded-lg border border-github-border-primary dark:border-white/10 bg-white/20 dark:bg-white/5">
                    <Award className="w-5 h-5 text-github-accent-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg sm:text-xl font-medium text-github-text-primary mb-1">การปฏิบัติหน้าที่ในตำแหน่ง</h3>
                      <p className="text-sm sm:text-base font-normal text-github-text-secondary">Specific watch station</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-6 rounded-lg border border-github-border-primary dark:border-white/10 bg-white/20 dark:bg-white/5">
                    <Award className="w-5 h-5 text-github-accent-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg sm:text-xl font-medium text-github-text-primary mb-1">การดำรงสภาพของยุทโธปกรณ์</h3>
                      <p className="text-sm sm:text-base font-normal text-github-text-secondary">Maintain specific equipment</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-6 rounded-lg border border-github-border-primary dark:border-white/10 bg-white/20 dark:bg-white/5">
                    <Award className="w-5 h-5 text-github-accent-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg sm:text-xl font-medium text-github-text-primary mb-1">การปฏิบัติร่วมเป็นกลุ่มหรือทีม</h3>
                      <p className="text-sm sm:text-base font-normal text-github-text-secondary">Perform as a team member within unit</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Essential Capabilities */}
            <div>
              <Title
                title="ระบบมาตรฐานกำลังพล"
                subtitle="Essential capabilities for Royal Thai Navy operations"
                description="Personnel Qualification System : PQS คือ การมีความรู้-ความสามารถ ขั้นพื้นฐานที่จำเป็น สำหรับการปฏิบัติงานใน กองทัพเรือ"
                size="large"
                align="left"
                className="mb-8"
              />
              <Grid cols={2} gap="medium">
                <Card title="การเตรียมความพร้อม" subtitle="Combat Readiness" icon={<Mail className="w-6 h-6 text-github-accent-info" />} variant="glass" hover>
                  ระบบประเมินความพร้อมรบด้านกำลังพล ตรวจสอบสมรรถนะ ความรู้ ทักษะ และขีดความสามารถ เพื่อให้กองทัพเรือมีศักยภาพสูงสุดในทุก สถานการณ์
                </Card>
                <Card title="ระบบความปลอดภัย" subtitle="Safety System" icon={<ShieldCheck className="w-6 h-6 text-github-accent-success" />} variant="glass" hover>
                  มาตรฐานความปลอดภัยระดับทหาร ตรวจสอบขั้นตอนการปฏิบัติงาน การใช้อุปกรณ์ และมาตรการ ป้องกันเพื่อปกป้องบุคลากรและยุทโธปกรณ์
                </Card>
                <Card title="การทำงานเป็นทีม" subtitle="Team Coordination" icon={<Users className="w-6 h-6 text-github-accent-purple" />} variant="glass" hover>
                  ระบบประสานงานหน่วยต่างๆ การสื่อสารภายใน ทีม การมอบหมายงาน การรายงานผล และการ ทำงานร่วมกันอย่างมีประสิทธิภาพ ตามหลักการ บังคับบัญชา
                </Card>
                <Card title="การบูรณาการระบบ" subtitle="System Integration" icon={<GitMerge className="w-6 h-6 text-github-accent-orange" />} variant="glass" hover>
                  เชื่อมต่อกับระบบงานต่างๆ ด้านกำลังพลใน กองทัพเรือ ระบบฐานข้อมูล ระบบบริหารจัดการ และระบบรายงานผลได้อย่างลื่นไหลและมี ประสิทธิภาพ
                </Card>
              </Grid>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Section Divider ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-github-border-primary to-transparent" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: HISTORY (from HistoryPage.tsx)
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="history"
        ref={(el) => { sectionRefs.current.history = el }}
        className="scroll-mt-14"
      >
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

                {/* Language Toggle + Podcast Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant={language === 'en' ? 'primary' : 'outline'}
                      size="small"
                      onClick={() => setLanguage('en')}
                    >
                      Us - English
                    </Button>
                    <Button
                      variant={language === 'th' ? 'primary' : 'outline'}
                      size="small"
                      onClick={() => setLanguage('th')}
                    >
                      Th - ไทย
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={isPlaying ? 'primary' : 'outline'}
                      size="small"
                      onClick={handlePodcastToggle}
                      icon={<Headphones className="w-4 h-4" />}
                    >
                      {isPlaying ? 'กำลังเล่น Podcast' : 'ฟัง Podcast'}
                    </Button>

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
              <Alert
                type="warning"
                title={content[language].alert.title}
                message={content[language].alert.message}
                showCloseButton={false}
              />
            </div>

            {/* Right Column - Cards + Team Image */}
            <div className="space-y-8">
              {/* Three Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card
                  title={content[language].cards[0]?.title || ''}
                  subtitle={content[language].cards[0]?.description || ''}
                  icon={<BookOpen className="w-8 h-8 text-github-accent-info" />}
                  hover={true}
                  size="medium"
                />
                <Card
                  title={content[language].cards[1]?.title || ''}
                  subtitle={content[language].cards[1]?.description || ''}
                  icon={<Target className="w-8 h-8 text-github-accent-orange" />}
                  hover={true}
                  size="medium"
                />
                <Card
                  title={content[language].cards[2]?.title || ''}
                  subtitle={content[language].cards[2]?.description || ''}
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

      {/* ── Section Divider ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-github-border-primary to-transparent" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: TEAM (from TeamPage.tsx)
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="team"
        ref={(el) => { sectionRefs.current.team = el }}
        className="scroll-mt-14"
      >
        <Container size="large" padding="large" className="py-12 sm:py-20">
          {/* Header Section */}
          <Header
            logo={navyLogo}
            logoAlt="Royal Thai Navy Logo"
            title="ระบบ PQS กองทัพเรือ"
            subtitle="Personnel Qualification Standard System"
            description="ระบบมาตรฐานกำลังพลที่พัฒนาขึ้นเพื่อให้บุคลากรกองทัพเรือมีความรู้ ความสามารถ และทักษะที่จำเป็นในการปฏิบัติงานอย่างมีประสิทธิภาพ"
            metrics={headerMetrics}
          />

          {/* Single Column Layout */}
          <div className="space-y-16">
            {/* Leadership Excellence Section */}
            <div className="space-y-6">
              <Title
                title="ผู้บังคับบัญชาระดับสูง"
                subtitle="Leadership Excellence in Royal Thai Navy Operations"
                size="medium"
                align="center"
                className="mb-8"
              />

              {/* Leadership Cards - Dynamic from Database */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {isTeamLoading ? (
                  <>
                    {[1, 2, 3].map((index) => (
                      <Card
                        key={index}
                        title="กำลังโหลด..."
                        subtitle="Loading..."
                        icon={
                          <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-github-bg-tertiary animate-pulse border-2 border-github-accent-warning"></div>
                          </div>
                        }
                        hover={false}
                        size="medium"
                        className="max-w-sm mx-auto w-full text-center"
                      >
                        Loading...
                      </Card>
                    ))}
                  </>
                ) : (
                  officers.map((officer) => (
                    <Card
                      key={officer.id}
                      title={officer.thai_name}
                      subtitle={officer.position_thai}
                      icon={
                        <div className="flex justify-center mb-4">
                          <img
                            src={getOfficerImage(officer.id)}
                            alt={officer.thai_name}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover object-top border-2 border-github-accent-warning"
                          />
                        </div>
                      }
                      hover={true}
                      size="medium"
                      className="max-w-sm mx-auto w-full text-center"
                    >
                      {officer.position_english}
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* User Testimonials Section */}
            <div className="space-y-6">
              <Title
                title="ผลตอบรับจากผู้ใช้งาน"
                subtitle="Experiences from Royal Thai Navy personnel using qualification system"
                size="medium"
                align="center"
                className="mb-8"
              />

              {/* Testimonial Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {/* Card 1 */}
                <Card
                  title=""
                  subtitle=""
                  icon={
                    <div className="flex mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-github-accent-warning fill-current" />
                      ))}
                    </div>
                  }
                  hover={true}
                  size="medium"
                  className="max-w-sm mx-auto w-full"
                >
                  <div className="space-y-4">
                    <p>"ระบบ PQS ช่วยให้การพัฒนาบุคลากรเป็นไปอย่างเป็นระบบและมีประสิทธิภาพ"</p>
                    <div className="flex items-center justify-between">
                      <div className="text-right flex-1">
                        <p className="font-medium">น.อ.ทวีศักดิ์ ทองนาค</p>
                        <p className="text-sm text-github-text-secondary">นายทหารแผนงานไฟฟ้าอาวุธฯ</p>
                      </div>
                      <img src={twt} alt="น.อ.ทวีศักดิ์ ทองนาค" className="h-12 w-12 rounded-full object-cover object-top border border-github-accent-warning flex-shrink-0 ml-4" />
                    </div>
                  </div>
                </Card>

                {/* Card 2 */}
                <Card
                  title=""
                  subtitle=""
                  icon={
                    <div className="flex mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-github-accent-warning fill-current" />
                      ))}
                    </div>
                  }
                  hover={true}
                  size="medium"
                  className="max-w-sm mx-auto w-full"
                >
                  <div className="space-y-4">
                    <p>"การใช้งานง่าย สะดวก และช่วยให้การทำงานมีประสิทธิภาพมากขึ้น"</p>
                    <div className="flex items-center justify-between">
                      <div className="text-right flex-1">
                        <p className="font-medium">น.อ.บุญชนะ นิยมวัน</p>
                        <p className="text-sm text-github-text-secondary">นายช่างไฟฟ้าอาวุธฯ</p>
                      </div>
                      <img src={boonchana} alt="น.อ.บุญชนะ นิยมวัน" className="h-12 w-12 rounded-full object-cover object-top border border-github-accent-warning flex-shrink-0 ml-4" />
                    </div>
                  </div>
                </Card>

                {/* Card 3 */}
                <Card
                  title=""
                  subtitle=""
                  icon={
                    <div className="flex mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-github-accent-warning fill-current" />
                      ))}
                    </div>
                  }
                  hover={true}
                  size="medium"
                  className="max-w-sm mx-auto w-full"
                >
                  <div className="space-y-4">
                    <p>"ระบบช่วยให้การฝึกอบรมและการประเมินผลเป็นไปอย่างมีมาตรฐาน"</p>
                    <div className="flex items-center justify-between">
                      <div className="text-right flex-1">
                        <p className="font-medium">น.ท.เกียรติศักดิ์ จอกนาค</p>
                        <p className="text-sm text-github-text-secondary">ครูวิชาการปืนฯ</p>
                      </div>
                      <img src={kittisak} alt="น.ท.เกียรติศักดิ์ จอกนาค" className="h-12 w-12 rounded-full object-cover object-top border border-github-accent-warning flex-shrink-0 ml-4" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Scroll-to-Top FAB
          ═══════════════════════════════════════════════════════════════════ */}
      <button
        onClick={scrollToTop}
        className={`
          fixed bottom-6 right-6 z-40 p-3 rounded-full
          bg-github-bg-tertiary border border-github-border-primary
          shadow-lg hover:shadow-xl hover:bg-github-bg-hover
          transition-all duration-300 ease-in-out
          ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
        aria-label="Scroll to top"
        type="button"
      >
        <ChevronUp className="w-5 h-5 text-github-text-primary" />
      </button>
    </div>
  )
}

export default WelcomeLandingPage
