import { ArrowRight, Search, Users, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950">

      {/* Background glow */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />


      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-32 lg:px-8 lg:pb-28 lg:pt-40">

        {/* Hero content */}
        <div className="mx-auto max-w-4xl text-center">

          {/* Small label */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300">

            <Sparkles
              size={14}
              className="text-indigo-400"
            />

            One place for every opportunity

          </div>


          {/* Heading */}
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">

            Every hackathon.
            <br />

            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
              One place.
            </span>

          </h1>


          {/* Description */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">

            Discover hackathons, track deadlines, find teammates,
            showcase your work and turn your participation into
            meaningful career opportunities.

          </p>


          {/* CTA buttons */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">

            {/* Explore Hackathons */}
            <Link
              to="/discover"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 sm:w-auto"
            >

              <Search size={17} />

              Explore Hackathons

              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />

            </Link>


            {/* Find Your Team */}
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >

              <Users size={17} />

              Find Your Team

            </button>

          </div>

        </div>


        {/* Product preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">

          <div className="absolute -inset-4 rounded-[2rem] bg-indigo-500/10 blur-2xl" />

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-2 shadow-2xl">

            {/* Browser top bar */}
            <div className="flex h-10 items-center gap-2 border-b border-white/10 px-4">

              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />

              <div className="ml-4 h-6 flex-1 rounded-md bg-white/5" />

            </div>


            {/* Dashboard preview */}
            <div className="grid min-h-[330px] grid-cols-12 gap-3 p-3">

              {/* Sidebar */}
              <div className="col-span-3 hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:block">

                <div className="h-7 w-7 rounded-lg bg-white/10" />

                <div className="mt-8 space-y-3">

                  <div className="h-8 rounded-lg bg-white/10" />
                  <div className="h-8 rounded-lg bg-white/5" />
                  <div className="h-8 rounded-lg bg-white/5" />
                  <div className="h-8 rounded-lg bg-white/5" />

                </div>

              </div>


              {/* Main dashboard */}
              <div className="col-span-12 rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:col-span-9">

                <div className="flex items-center justify-between">

                  <div>

                    <div className="h-4 w-32 rounded bg-white/15" />

                    <div className="mt-2 h-3 w-52 rounded bg-white/5" />

                  </div>

                  <div className="h-9 w-9 rounded-full bg-white/10" />

                </div>


                {/* Cards */}
                <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                    >

                      <div className="h-9 w-9 rounded-lg bg-white/10" />

                      <div className="mt-5 h-3 w-24 rounded bg-white/15" />

                      <div className="mt-2 h-2.5 w-full rounded bg-white/5" />

                      <div className="mt-2 h-2.5 w-3/4 rounded bg-white/5" />

                      <div className="mt-5 h-7 rounded-lg bg-white/5" />

                    </div>
                  ))}

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  )
}

export default Hero