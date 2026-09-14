import { ArrowRight, Search } from 'lucide-react'

function FeaturedHackathons() {
  const hackathons = []

  return (
    <section
      id="hackathons"
      className="px-6 py-24 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        <div className="flex items-end justify-between">

          <div>

            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
              Featured
            </span>

            <h2 className="mt-3 text-4xl font-bold tracking-[-0.035em] text-slate-950">
              Featured Hackathons
            </h2>

            <p className="mt-2 text-slate-500">
              Opportunities collected from across the ecosystem.
            </p>

          </div>

          <button className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 sm:flex">
            View all
            <ArrowRight size={16} />
          </button>

        </div>


        {/* Empty state until API is connected */}
        {hackathons.length === 0 ? (
          <div className="mt-10 flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
              <Search size={21} />
            </div>

            <h3 className="mt-5 text-base font-semibold text-slate-900">
              Hackathons will appear here
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Once the hackathon data source is connected,
              featured opportunities will automatically appear here.
            </p>

          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {hackathons.map((hackathon) => (
              <HackathonCard
                key={hackathon.id}
                hackathon={hackathon}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  )
}


function HackathonCard({ hackathon }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">

      <div className="h-11 w-11 rounded-xl bg-slate-100" />

      <h3 className="mt-5 font-semibold text-slate-950">
        {hackathon.title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {hackathon.organizer}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {hackathon.domains?.map((domain) => (
          <span
            key={domain}
            className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700"
          >
            {domain}
          </span>
        ))}
      </div>

    </article>
  )
}

export default FeaturedHackathons