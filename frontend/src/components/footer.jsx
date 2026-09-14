function Footer() {
  return (
    <footer className="border-t border-slate-100 px-6 py-10 lg:px-8">

      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">

        <div className="flex items-center gap-3">

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950">
            <span className="text-sm text-white">✦</span>
          </div>

        </div>

        <div className="flex flex-wrap gap-6 text-sm text-slate-500">

          <a href="#discover" className="transition hover:text-slate-950">
            Discover
          </a>

          <a href="#hackathons" className="transition hover:text-slate-950">
            Hackathons
          </a>

          <a href="#career" className="transition hover:text-slate-950">
            Career
          </a>

          <a href="#how-it-works" className="transition hover:text-slate-950">
            How it works
          </a>

        </div>

        <p className="text-xs text-slate-400">
          © 2026
        </p>

      </div>

    </footer>
  )
}

export default Footer