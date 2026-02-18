import "../styles/auth.css"
import { useState } from "react"

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    remember: false,
  })

  function updateField(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: Connect to backend 
    console.log("Signup form:", form)
  }

  return (
    <div className="auth-page">
      
      <section className="auth-left">
        <div className="auth-left-inner">
          <h1 className="auth-title">
            Recruiter
            <br />
            Access
          </h1>
          <p className="auth-subtitle">
            Create an account to save prospects, compare athletes, and view insights powered by
            performance analytics.
          </p>
        </div>
      </section>

      
      <section className="auth-right">
        <div className="auth-card">
          <h2 className="auth-card-title">Sign Up</h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label">
              Full Name
              <input
                className="auth-input"
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Coach Carter"
                autoComplete="name"
                required
              />
            </label>

            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="coach@recruiter.info"
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                name="password"
                value={form.password}
                onChange={updateField}
                placeholder="**********"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <label className="auth-label">
              Confirm Password
              <input
                className="auth-input"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={updateField}
                placeholder="**********"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <div className="auth-row">
              <label className="auth-check">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={updateField}
                />
                <span>Remember me</span>
              </label>

              <button type="button" className="auth-link-btn">
                Already have an account?
              </button>
            </div>

            <button className="auth-button" type="submit">
              Create Account
            </button>

            <p className="auth-footnote">
              By signing up, you agree to our <button type="button" className="auth-link-btn">Terms</button> and{" "}
              <button type="button" className="auth-link-btn">Privacy Policy</button>.
            </p>
          </form>
        </div>
      </section>
    </div>
  )
}
