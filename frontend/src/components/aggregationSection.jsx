import {
  Search,
  Users,
  BarChart3,
  BriefcaseBusiness,
  ArrowRight,
} from 'lucide-react'

function AggregationSection() {
  return (
    <section
      id="discover"
      className="bg-white px-6 py-24 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left */}
          <div>

            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
              The problem
            </span>

            <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Hackathons are everywhere.

              <span className="block text-indigo-600">
                Opportunities shouldn't be.
              </span>
            </h2>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-500">
              Hackathon opportunities are spread across multiple
              platforms and communities, making discovery difficult
              and easy to miss.
            </p>

            <p className="mt-4 max-w-lg text-base leading-7 text-slate-500">
              The platform brings those opportunities together into
              one organized experience.
            </p>

            {/* Sources */}
            <div className="mt-10 flex flex-wrap items-center gap-3">

              <SourceBadge label="Devpost" />
              <SourceBadge label="Unstop" />
              <SourceBadge label="Devfolio" />
              <SourceBadge label="Other sources" />

              <ArrowRight
                size={20}
                className="mx-2 text-indigo-400"
              />

              <div className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">
                One place
              </div>

            </div>

          </div>


          {/* Right */}
          <div className="rounded-[28px] border border-indigo-100 bg-indigo-50/50 p-5">

            <div className="grid gap-4 sm:grid-cols-2">

              <FeatureCard
                icon={<Search />}
                title="Discover Easily"
                description="Find relevant hackathons without checking multiple platforms."
              />

              <FeatureCard
                icon={<Users />}
                title="Find Your Team"
                description="Connect with people who complement your skills."
              />

              <FeatureCard
                icon={<BarChart3 />}
                title="Track Progress"
                description="Keep deadlines, participation and achievements organized."
              />

              <FeatureCard
                icon={<BriefcaseBusiness />}
                title="Unlock Opportunities"
                description="Connect your experience with future career opportunities."
              />

            </div>

          </div>

        </div>

      </div>
    </section>
  )
}


function SourceBadge({ label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
      {label}
    </div>
  )
}


function FeatureCard({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>

      <h3 className="mt-5 font-semibold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

    </div>
  )
}

export default AggregationSection