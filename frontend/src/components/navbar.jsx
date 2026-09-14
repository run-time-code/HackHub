import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'

function Navbar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">

      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">

        {/* Logo */}
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg text-slate-950"
        >
          ✦
        </Link>


        {/* Desktop navigation */}
        <div className="hidden items-center gap-8 md:flex">

          <Link
            to="/"
            className="text-sm font-medium text-white"
          >
            Home
          </Link>

          <Link
            to="/discover"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Discover
          </Link>

          <Link
            to="/discover"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Hackathons
          </Link>

          <span
            className="cursor-not-allowed text-sm font-medium text-slate-500"
          >
            Teams
          </span>

          <span
            className="cursor-not-allowed text-sm font-medium text-slate-500"
          >
            Career
          </span>

        </div>


        {/* Right side */}
        <div className="flex items-center gap-3">

          <Link
            to="/auth"
            className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:block"
          >
            Log in
          </Link>

          <Link
            to="/auth"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Get Started
          </Link>


          {/* Mobile menu */}
          <button
            type="button"
            className="rounded-lg p-2 text-white md:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

        </div>

      </nav>

    </header>
  )
}

export default Navbar