import React, { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Container, Card, Header, Title } from '../ui'
import { invoke } from '@tauri-apps/api/tauri'
import navyLogo from '../../assets/images/navy_logo.webp'
import member1 from '../../assets/images/member_1.webp'
import member2 from '../../assets/images/member_2.webp'
import member3 from '../../assets/images/member_3.webp'
import twt from '../../assets/images/twt.webp'
import boonchana from '../../assets/images/boonchana.webp'
import kittisak from '../../assets/images/kittisak.webp'

interface HighRankingOfficer {
  id: number;
  thai_name: string;
  position_thai: string;
  position_english: string;
  order_index: number;
}

interface HighRankingAvatar {
  id: number;
  officer_id: number;
  avatar_data: number[];
  mime_type: string;
  file_size: number;
}

const TeamPage: React.FC = () => {
  const [officers, setOfficers] = useState<HighRankingOfficer[]>([]);
  const [avatars, setAvatars] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const headerMetrics = [
    { value: "50+", label: "หน่วยงาน" },
    { value: "40K+", label: "บุคลากร" },
    { value: "24/7", label: "พร้อมรบ" }
  ]

  // Load officers and avatars from database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load officers
        const officersData = await invoke<HighRankingOfficer[]>('get_all_high_ranking_officers');
        setOfficers(officersData);

        // Load avatars for each officer using Hybrid System
        const avatarPromises = officersData.map(async (officer) => {
          try {
            const avatarInfo = await invoke('get_hybrid_high_rank_avatar_info', {
              officerId: officer.id
            });
            
            if (avatarInfo && avatarInfo.avatar_path && avatarInfo.file_exists) {
              // Get base64 data for display
              const base64Data = await invoke('get_hybrid_high_rank_avatar_base64', {
                avatarPath: avatarInfo.avatar_path
              });
              return { officerId: officer.id, url: base64Data };
            }
          } catch (error) {
            console.error(`Failed to load avatar for officer ${officer.id}:`, error);
          }
          return null;
        });

        const avatarResults = await Promise.all(avatarPromises);
        const avatarMap: Record<number, string> = {};
        
        avatarResults.forEach((result) => {
          if (result) {
            avatarMap[result.officerId] = result.url;
          }
        });
        
        setAvatars(avatarMap);
      } catch (error) {
        console.error('Failed to load officers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Cleanup function to revoke blob URLs
    return () => {
      Object.values(avatars).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // Get image source for officer (database avatar or fallback)
  const getOfficerImage = (officerId: number): string => {
    if (avatars[officerId]) {
      return avatars[officerId];
    }
    
    // Fallback to static images
    switch (officerId) {
      case 1: return member1;
      case 2: return member2;
      case 3: return member3;
      default: return member1;
    }
  };

  return (
    <section className="transition-colors duration-200">
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
              {loading ? (
                // Loading state
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
                // Dynamic cards from database
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
            
            {/* Testimonial Cards - 1 Row */}
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
                                                                                  <img 
                                                                                    src={twt} 
                        alt="น.อ.ทวีศักดิ์ ทองนาค"
                        className="h-12 w-12 rounded-full object-cover object-top border border-github-accent-warning flex-shrink-0 ml-4"
                      />
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
                                                                                  <img 
                                                                                    src={boonchana} 
                        alt="น.อ.บุญชนะ นิยมวัน"
                        className="h-12 w-12 rounded-full object-cover object-top border border-github-accent-warning flex-shrink-0 ml-4"
                      />
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
                                                                                  <img 
                                                                                    src={kittisak} 
                        alt="น.ท.เกียรติศักดิ์ จอกนาค"
                        className="h-12 w-12 rounded-full object-cover object-top border border-github-accent-warning flex-shrink-0 ml-4"
                      />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default TeamPage
