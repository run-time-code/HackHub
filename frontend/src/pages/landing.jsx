import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import AggregationSection from '../components/AggregationSection'
import FeaturedHackathons from '../components/FeaturedHackathons'
import HowItWorks from '../components/HowItWorks'
import CareerSection from '../components/CareerSection'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-950">
      <Navbar />

      <main>
        <Hero />
        <AggregationSection />
        <FeaturedHackathons />
        <HowItWorks />
        <CareerSection />
        <CTA />
      </main>

      <Footer />
    </div>
  )
}

export default Landing