import {
  ArrowRight,
  BriefcaseBusiness,
  Trophy,
  UserRound,
} from 'lucide-react'

function CareerSection() {
  return (
    <section
      id="career"
      className="px-6 py-28 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Text */}
          <div>

            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
              Beyond hackathons
            </span>

            <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Your hackathon journey shouldn't end at submission.
            </h2>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-500">
              Build a profile around your projects, participation and
              achievements — and use your experience to discover
              meaningful career opportunities.
            </p>

            <button className="mt-8 flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Explore Opportunities
              <ArrowRight size={17} />
            </button>

          </div>


          {/* Journey */}
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">

            <JourneyItem
              icon={<Trophy />}
              title="Participate"
              description="Take part in challenges and build real projects."
            />

            <JourneyLine />

            <JourneyItem
              icon={<UserRound />}
              title="Build your profile"
              description="Showcase skills, projects and achievements."
            />

            <JourneyLine />

            <JourneyItem
              icon={<BriefcaseBusiness />}
              title="Discover opportunities"
              description="Connect your experience with internships and hiring opportunities."
            />

          </div>

        </div>

      </div>
    </section>
  )
}


function JourneyItem({ icon, title, description }) {
  return (
    <div className="flex gap-4">

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
        {icon}
      </div>

      <div>
        <h3 className="font-semibold text-slate-950">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

    </div>
  )
}


function JourneyLine() {
  return (
    <div className="ml-5 h-8 border-l border-dashed border-slate-300" />
  )
}

export default CareerSection