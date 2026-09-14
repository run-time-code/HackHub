import { ArrowRight } from 'lucide-react'

function CTA() {
  return (
    <section className="px-6 pb-10 lg:px-8">

      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#070a12] px-8 py-16 sm:px-12">

        <div className="pointer-events-none absolute right-[-100px] top-[-150px] h-[400px] w-[400px] rounded-full bg-indigo-600/20 blur-[100px]" />

        <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">

          <div>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to find your next hackathon?
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Discover opportunities, find your team and start building.
            </p>

          </div>

          <button className="group flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">

            Explore Hackathons

            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />

          </button>

        </div>

      </div>

    </section>
  )
}

export default CTA