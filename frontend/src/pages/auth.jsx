import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'

function Auth() {
  const [isLogin, setIsLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <main className="min-h-screen bg-[#070a12] text-white">

      {/* Top navigation */}
      <header className="absolute left-0 right-0 top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">

          <a
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              <Sparkles size={17} />
            </div>
          </a>

          <div className="text-sm text-slate-400">
            {isLogin
              ? "Don't have an account?"
              : 'Already have an account?'
            }

            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-semibold text-white transition hover:text-violet-300"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>

        </div>
      </header>


      {/* Main */}
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">

        {/* Left panel */}
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-20">

          <div className="absolute left-[-200px] top-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />

          <div className="relative">

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium tracking-[0.15em] text-slate-400">
              <Sparkles size={13} />
              BUILD YOUR JOURNEY
            </span>

            <h1 className="mt-7 max-w-xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] xl:text-6xl">
              Discover.

              <span className="block bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
                Build.
              </span>

              <span className="block">
                Grow.
              </span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-7 text-slate-400">
              Discover hackathons, find teammates, track your
              opportunities and build a profile around the things
              you create.
            </p>

            <div className="mt-10 flex items-center gap-3 text-sm text-slate-500">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                <ArrowRight size={16} />
              </div>

              Your next opportunity starts here.
            </div>

          </div>

        </section>


        {/* Right panel */}
        <section className="flex items-center justify-center px-6 pb-12 pt-28 sm:px-10 lg:px-12">

          <div className="w-full max-w-md">

            {/* Mobile back */}
            <a
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white lg:hidden"
            >
              <ArrowLeft size={16} />
              Back
            </a>


            {/* Heading */}
            <div>

              <h2 className="text-3xl font-bold tracking-tight">
                {isLogin
                  ? 'Welcome back'
                  : 'Create your account'
                }
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {isLogin
                  ? 'Log in to continue your hackathon journey.'
                  : 'Start discovering opportunities and building your profile.'
                }
              </p>

            </div>


            {/* Auth toggle */}
            <div className="mt-8 grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">

              <button
                onClick={() => setIsLogin(false)}
                className={`rounded-lg py-2.5 text-sm font-medium transition ${
                  !isLogin
                    ? 'bg-white text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>

              <button
                onClick={() => setIsLogin(true)}
                className={`rounded-lg py-2.5 text-sm font-medium transition ${
                  isLogin
                    ? 'bg-white text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Log In
              </button>

            </div>


            {/* Form */}
            <form className="mt-8 space-y-5">

              {!isLogin && (
                <InputField
                  label="Full name"
                  type="text"
                  placeholder="Enter your full name"
                />
              )}

              <InputField
                label="Email address"
                type="email"
                placeholder="you@example.com"
              />


              {/* Password */}
              <div>

                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Password
                </label>

                <div className="relative">

                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 pr-12 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-indigo-400/60 focus:bg-white/[0.06]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 transition hover:text-white"
                  >
                    {showPassword
                      ? <EyeOff size={17} />
                      : <Eye size={17} />
                    }
                  </button>

                </div>

              </div>


              {/* Confirm password */}
              {!isLogin && (
                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Confirm password
                  </label>

                  <div className="relative">

                    <input
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Re-enter your password"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 pr-12 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-indigo-400/60 focus:bg-white/[0.06]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword,
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 transition hover:text-white"
                    >
                      {showConfirmPassword
                        ? <EyeOff size={17} />
                        : <Eye size={17} />
                      }
                    </button>

                  </div>

                </div>
              )}


              {/* Forgot password */}
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-medium text-indigo-300 transition hover:text-indigo-200"
                  >
                    Forgot password?
                  </button>
                </div>
              )}


              {/* Submit */}
              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                {isLogin
                  ? 'Log in'
                  : 'Create account'
                }

                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>

            </form>


            {/* Terms */}
            {!isLogin && (
              <p className="mt-6 text-center text-xs leading-5 text-slate-600">
                By creating an account, you agree to the platform's
                terms of service and privacy policy.
              </p>
            )}

          </div>

        </section>

      </div>

    </main>
  )
}


function InputField({
  label,
  type,
  placeholder,
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-indigo-400/60 focus:bg-white/[0.06]"
      />

    </div>
  )
}

export default Auth