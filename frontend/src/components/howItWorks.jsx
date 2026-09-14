import {
  Search,
  CalendarDays,
  Users,
  Trophy,
} from 'lucide-react'

function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: <Search />,
      title: 'Discover',
      description:
        'Find hackathons that match your interests, skills and goals.',
    },
    {
      number: '02',
      icon: <CalendarDays />,
      title: 'Track',
      description:
        'Keep registration and submission deadlines organized.',
    },
    {
      number: '03',
      icon: <Users />,
      title: 'Build',
      description:
        'Find teammates and form a team for your next challenge.',
    },
    {
      number: '04',
      icon: <Trophy />,
      title: 'Grow',
      description:
        'Build your experience, achievements and career profile.',
    },
  ]

  return (
    <section
      id="how-it-works"
      className="border-y border-slate-100 bg-slate-50 px-6 py-24 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mx-auto max-w-2xl text-center">

          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
            How it works
          </span>

          <h2 className="mt-4 text-4xl font-bold tracking-[-0.035em] text-slate-950">
            From discovery to opportunity
          </h2>

          <p className="mt-4 text-slate-500">
            Everything you need to make the most of your hackathon journey.
          </p>

        </div>


        <div className="mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-4">

          {steps.map((step) => (
            <div key={step.number}>

              <span className="text-xs font-bold text-indigo-500">
                {step.number}
              </span>

              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                {step.icon}
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-950">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {step.description}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  )
}

export default HowItWorks