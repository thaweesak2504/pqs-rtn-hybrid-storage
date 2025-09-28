import React from 'react'
import { useNavigate } from 'react-router-dom'
import navyLogo from '../assets/images/navy_logo.webp'
import { Card, Button, Container, Grid, Title, Header } from './ui'
import { 
  Award, 
  Mail, 
  ShieldCheck, 
  Users, 
  GitMerge, 
  ArrowRight
} from 'lucide-react'

const HeroSection: React.FC = () => {
  
  const navigate = useNavigate()
  const handleLearnMore = () => {
    navigate('/history')
  }

  return (
    <section className="transition-colors duration-200">
      <Container size="large" padding="large" className="py-12 sm:py-20">
        
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
            
            {/* Header Title */}
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
                 {/* Objective Card 1 */}
                 <div className="flex items-start space-x-4 p-6 rounded-lg border border-github-border-primary bg-white dark:bg-github-bg-tertiary">
                   <Award className="w-5 h-5 text-github-accent-primary mt-0.5 flex-shrink-0" />
                   <div>
                     <h3 className="text-lg sm:text-xl font-medium text-github-text-primary mb-1">
                       การปฏิบัติหน้าที่ในตำแหน่ง
                     </h3>
                     <p className="text-sm sm:text-base font-normal text-github-text-secondary">
                       Specific watch station
                     </p>
                   </div>
                 </div>
                 
                 {/* Objective Card 2 */}
                 <div className="flex items-start space-x-4 p-6 rounded-lg border border-github-border-primary bg-white dark:bg-github-bg-tertiary">
                   <Award className="w-5 h-5 text-github-accent-primary mt-0.5 flex-shrink-0" />
                   <div>
                     <h3 className="text-lg sm:text-xl font-medium text-github-text-primary mb-1">
                       การดำรงสภาพของยุทโธปกรณ์
                     </h3>
                     <p className="text-sm sm:text-base font-normal text-github-text-secondary">
                       Maintain specific equipment
                     </p>
                   </div>
                 </div>
                 
                 {/* Objective Card 3 */}
                 <div className="flex items-start space-x-4 p-6 rounded-lg border border-github-border-primary bg-white dark:bg-github-bg-tertiary">
                   <Award className="w-5 h-5 text-github-accent-primary mt-0.5 flex-shrink-0" />
                   <div>
                     <h3 className="text-lg sm:text-xl font-medium text-github-text-primary mb-1">
                       การปฏิบัติร่วมเป็นกลุ่มหรือทีม
                     </h3>
                     <p className="text-sm sm:text-base font-normal text-github-text-secondary">
                       Perform as a team member within unit
                     </p>
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
            
            {/* Capability Cards Grid */}
            <Grid cols={2} gap="medium">
              <Card
                title="การเตรียมความพร้อม"
                subtitle="Combat Readiness"
                icon={<Mail className="w-6 h-6 text-github-accent-info" />}
                variant="elevated"
                hover
              >
                ระบบประเมินความพร้อมรบด้านกำลังพล ตรวจสอบสมรรถนะ ความรู้ ทักษะ และขีดความสามารถ เพื่อให้กองทัพเรือมีศักยภาพสูงสุดในทุก สถานการณ์
              </Card>
              
              <Card
                title="ระบบความปลอดภัย"
                subtitle="Safety System"
                icon={<ShieldCheck className="w-6 h-6 text-github-accent-success" />}
                variant="elevated"
                hover
              >
                มาตรฐานความปลอดภัยระดับทหาร ตรวจสอบขั้นตอนการปฏิบัติงาน การใช้อุปกรณ์ และมาตรการ ป้องกันเพื่อปกป้องบุคลากรและยุทโธปกรณ์
              </Card>
              
              <Card
                title="การทำงานเป็นทีม"
                subtitle="Team Coordination"
                icon={<Users className="w-6 h-6 text-github-accent-purple" />}
                variant="elevated"
                hover
              >
                ระบบประสานงานหน่วยต่างๆ การสื่อสารภายใน ทีม การมอบหมายงาน การรายงานผล และการ ทำงานร่วมกันอย่างมีประสิทธิภาพ ตามหลักการ บังคับบัญชา
              </Card>
              
              <Card
                title="การบูรณาการระบบ"
                subtitle="System Integration"
                icon={<GitMerge className="w-6 h-6 text-github-accent-orange" />}
                variant="elevated"
                hover
              >
                เชื่อมต่อกับระบบงานต่างๆ ด้านกำลังพลใน กองทัพเรือ ระบบฐานข้อมูล ระบบบริหารจัดการ และระบบรายงานผลได้อย่างลื่นไหลและมี ประสิทธิภาพ
              </Card>
            </Grid>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default HeroSection
