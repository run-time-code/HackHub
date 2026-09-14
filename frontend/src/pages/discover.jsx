import { useState } from 'react'
import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  Filter,
  Globe2,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

function Discover() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomains, setSelectedDomains] = useState([])
  const [selectedModes, setSelectedModes] = useState([])
  const [selectedDeadline, setSelectedDeadline] = useState('')
  const [sortBy, setSortBy] = useState('recommended')
  const [showFilters, setShowFilters] = useState(false)

  /*
    Hackathons will come from the backend later.

    Example future structure:

    {
      id: "...",
      title: "...",
      organizer: "...",
      domains: ["AI / ML"],
      mode: "Online",
      deadline: "...",
      source: "Devpost"
    }
  */

  const hackathons = []


  const toggleDomain = (domain) => {
    setSelectedDomains((current) =>
      current.includes(domain)
        ? current.filter((item) => item !== domain)
        : [...current, domain],
    )
  }


  const toggleMode = (mode) => {
    setSelectedModes((current) =>
      current.includes(mode)
        ? current.filter((item) => item !== mode)
        : [...current, mode],
    )
  }


  const clearFilters = () => {
    setSelectedDomains([])
    setSelectedModes([])
    setSelectedDeadline('')
    setSearchQuery('')
  }


  const hasFilters =
    selectedDomains.length > 0 ||
    selectedModes.length > 0 ||
    selectedDeadline !== '' ||
    searchQuery !== ''


  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">

      {/* Navbar */}
      <Navbar />


      <main className="mx-auto max-w-7xl px-6 pb-16 pt-28 lg:px-8">

        {/* Heading */}
        <div className="mb-8">

          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
            Explore
          </p>

          <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

            <div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Discover Hackathons
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Find opportunities that match your skills, interests
                and goals.
              </p>

            </div>


            {/* Mobile filters button */}
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm lg:hidden"
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>

          </div>

        </div>


        {/* Search */}
        <div className="relative">

          <Search
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search hackathons, technologies, organizations..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-12 text-sm outline-none shadow-sm transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={17} />
            </button>
          )}

        </div>


        {/* Categories */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">

          <CategoryChip
            label="All"
            active={selectedDomains.length === 0}
            onClick={() => setSelectedDomains([])}
          />

          {[
            'AI / ML',
            'Web Development',
            'Cybersecurity',
            'FinTech',
            'Blockchain',
            'Open Source',
            'IoT',
          ].map((domain) => (
            <CategoryChip
              key={domain}
              label={domain}
              active={selectedDomains.includes(domain)}
              onClick={() => toggleDomain(domain)}
            />
          ))}

        </div>


        {/* Main layout */}
        <div className="mt-8 flex gap-8">


          {/* Desktop filters */}
          <aside className="hidden w-64 shrink-0 lg:block">

            <FilterPanel
              selectedDomains={selectedDomains}
              selectedModes={selectedModes}
              selectedDeadline={selectedDeadline}
              toggleDomain={toggleDomain}
              toggleMode={toggleMode}
              setSelectedDeadline={setSelectedDeadline}
              clearFilters={clearFilters}
              hasFilters={hasFilters}
            />

          </aside>


          {/* Results */}
          <section className="min-w-0 flex-1">

            {/* Toolbar */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">

              <p className="text-sm text-slate-400">
                {hackathons.length > 0
                  ? `${hackathons.length} opportunities`
                  : 'Explore available opportunities'}
              </p>


              {/* Sort */}
              <div className="relative">

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none shadow-sm focus:border-indigo-400"
                >

                  <option value="recommended">
                    Recommended
                  </option>

                  <option value="latest">
                    Latest
                  </option>

                  <option value="deadline">
                    Deadline
                  </option>

                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>

            </div>


            {/* Results / Empty state */}
            {hackathons.length > 0 ? (

              <div className="grid gap-5 md:grid-cols-2">

                {hackathons.map((hackathon) => (
                  <HackathonCard
                    key={hackathon.id}
                    hackathon={hackathon}
                  />
                ))}

              </div>

            ) : (

              <EmptyState
                hasFilters={hasFilters}
                clearFilters={clearFilters}
              />

            )}

          </section>

        </div>

      </main>


      {/* Mobile filter drawer */}
      {showFilters && (

        <div className="fixed inset-0 z-[100] lg:hidden">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />


          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6">

            <div className="mb-6 flex items-center justify-between">

              <h2 className="text-lg font-bold">
                Filters
              </h2>

              <button
                onClick={() => setShowFilters(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>

            </div>


            <FilterPanel
              selectedDomains={selectedDomains}
              selectedModes={selectedModes}
              selectedDeadline={selectedDeadline}
              toggleDomain={toggleDomain}
              toggleMode={toggleMode}
              setSelectedDeadline={setSelectedDeadline}
              clearFilters={clearFilters}
              hasFilters={hasFilters}
            />


            <button
              onClick={() => setShowFilters(false)}
              className="mt-6 w-full rounded-xl bg-slate-950 py-3.5 text-sm font-semibold text-white"
            >
              Apply Filters
            </button>

          </div>

        </div>

      )}

    </div>
  )
}


/* ============================================================
   NAVBAR
============================================================ */

function Navbar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">

      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">


        {/* Logo */}
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-lg text-white"
        >
          ✦
        </Link>


        {/* Navigation */}
        <div className="hidden items-center gap-8 md:flex">

          <Link
            to="/discover"
            className="text-sm font-semibold text-slate-950"
          >
            Discover
          </Link>

          <span className="text-sm text-slate-400">
            Hackathons
          </span>

          <span className="text-sm text-slate-400">
            Teams
          </span>

          <span className="text-sm text-slate-400">
            Career
          </span>

        </div>


        {/* Right */}
        <div className="flex items-center gap-3">

          <button className="hidden text-sm font-medium text-slate-600 sm:block">
            Log in
          </button>

          <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            Get Started
          </button>

        </div>

      </nav>

    </header>
  )
}


/* ============================================================
   FILTER PANEL
============================================================ */

function FilterPanel({
  selectedDomains,
  selectedModes,
  selectedDeadline,
  toggleDomain,
  toggleMode,
  setSelectedDeadline,
  clearFilters,
  hasFilters,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">


      {/* Header */}
      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2">

          <Filter size={16} />

          <h2 className="text-sm font-bold">
            Filters
          </h2>

        </div>


        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Clear all
          </button>
        )}

      </div>


      {/* Domain */}
      <FilterGroup title="Domain">

        {[
          'AI / ML',
          'Web Development',
          'Cybersecurity',
          'FinTech',
          'Blockchain',
          'Open Source',
        ].map((domain) => (

          <Checkbox
            key={domain}
            label={domain}
            checked={selectedDomains.includes(domain)}
            onChange={() => toggleDomain(domain)}
          />

        ))}

      </FilterGroup>


      {/* Mode */}
      <FilterGroup title="Mode">

        {[
          'Online',
          'Offline',
          'Hybrid',
        ].map((mode) => (

          <Checkbox
            key={mode}
            label={mode}
            checked={selectedModes.includes(mode)}
            onChange={() => toggleMode(mode)}
          />

        ))}

      </FilterGroup>


      {/* Deadline */}
      <FilterGroup title="Deadline">

        {[
          ['this-week', 'This week'],
          ['this-month', 'This month'],
          ['next-month', 'Next month'],
        ].map(([value, label]) => (

          <Checkbox
            key={value}
            label={label}
            type="radio"
            checked={selectedDeadline === value}
            onChange={() => setSelectedDeadline(value)}
          />

        ))}

      </FilterGroup>


      {/* Location */}
      <FilterGroup title="Location">

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500">

          <MapPin size={15} />

          Anywhere

        </div>

      </FilterGroup>

    </div>
  )
}


/* ============================================================
   FILTER GROUP
============================================================ */

function FilterGroup({ title, children }) {
  return (
    <div className="mt-7 border-t border-slate-100 pt-6">

      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>

      <div className="space-y-3">
        {children}
      </div>

    </div>
  )
}


/* ============================================================
   CHECKBOX
============================================================ */

function Checkbox({
  label,
  checked,
  onChange,
  type = 'checkbox',
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">

      <input
        type={type}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-indigo-600"
      />

      <span>
        {label}
      </span>

    </label>
  )
}


/* ============================================================
   CATEGORY CHIP
============================================================ */

function CategoryChip({
  label,
  active,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition ${
        active
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
      }`}
    >
      {label}
    </button>
  )
}


/* ============================================================
   HACKATHON CARD
============================================================ */

function HackathonCard({ hackathon }) {
  const [saved, setSaved] = useState(false)

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/30">


      {/* Top */}
      <div className="flex items-start justify-between">

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">

          {hackathon.logo ? (

            <img
              src={hackathon.logo}
              alt=""
              className="h-full w-full rounded-xl object-cover"
            />

          ) : (

            <Globe2
              size={20}
              className="text-slate-400"
            />

          )}

        </div>


        {/* Bookmark */}
        <button
          onClick={() => setSaved(!saved)}
          className={`rounded-lg p-2 transition ${
            saved
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
          }`}
          aria-label="Save hackathon"
        >

          <Bookmark
            size={18}
            fill={saved ? 'currentColor' : 'none'}
          />

        </button>

      </div>


      {/* Content */}
      <div className="mt-5">

        <p className="text-xs font-medium text-slate-400">
          {hackathon.organizer}
        </p>

        <h3 className="mt-1 text-base font-bold text-slate-950">
          {hackathon.title}
        </h3>

      </div>


      {/* Domains */}
      <div className="mt-4 flex flex-wrap gap-2">

        {hackathon.domains?.map((domain) => (

          <span
            key={domain}
            className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700"
          >
            {domain}
          </span>

        ))}

      </div>


      {/* Details */}
      <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">

        {hackathon.mode && (

          <div className="flex items-center gap-2 text-xs text-slate-500">

            <Globe2 size={14} />

            {hackathon.mode}

          </div>

        )}


        {hackathon.deadline && (

          <div className="flex items-center gap-2 text-xs text-slate-500">

            <CalendarDays size={14} />

            Deadline: {hackathon.deadline}

          </div>

        )}

      </div>


      {/* Footer */}
      <div className="mt-5 flex items-center justify-between">

        {hackathon.source && (

          <span className="text-[11px] text-slate-400">
            Source: {hackathon.source}
          </span>

        )}

        <button className="ml-auto text-xs font-semibold text-indigo-600 transition group-hover:text-indigo-700">
          View details →
        </button>

      </div>

    </article>
  )
}


/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  hasFilters,
  clearFilters,
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 text-center">

      {/* Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">

        <Search size={23} />

      </div>


      {/* Heading */}
      <h2 className="mt-5 text-lg font-bold text-slate-950">

        {hasFilters
          ? 'No hackathons match your filters'
          : 'No hackathons available yet'}

      </h2>


      {/* Description */}
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">

        {hasFilters
          ? 'Try adjusting your search or removing some filters to see more opportunities.'
          : 'Hackathon opportunities will appear here once the platform receives data from its connected sources.'}

      </p>


      {/* Clear */}
      {hasFilters && (

        <button
          onClick={clearFilters}
          className="mt-6 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Clear filters
        </button>

      )}

    </div>
  )
}

export default Discover