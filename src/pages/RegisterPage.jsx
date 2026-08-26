import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import BrandLogo from "../components/common/BrandLogo";
import CountrySelect from "../components/common/CountrySelect";
import PhoneCountryField from "../components/common/PhoneCountryField";
import { useAuth } from "../auth/useAuth";
import { Button, FieldError } from "../components/ui";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  phone_country: "Pakistan",
  company_name: "",
  company_logo_data: "",
  address: "",
  city: "",
  country: "Pakistan",
  password: "",
  password_confirmation: "",
};

function Field({ id, label, icon: Icon, trailing, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          {...props}
          className={`h-11 w-full rounded-md border text-sm outline-none focus:border-primary aria-[invalid=true]:border-red-400 ${Icon ? "pl-10" : "pl-3"} ${trailing ? "pr-10" : "pr-3"}`}
        />
        {trailing}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export default function RegisterPage() {
  const { isAuthenticated, register, verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const step = searchParams.get("step") === "business" ? 2 : 1;
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [code, setCode] = useState("");
  const [localCode, setLocalCode] = useState("");
  const [logoName, setLogoName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const change = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
  };
  const selectLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Company logo must be smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, company_logo_data: reader.result }));
      setLogoName(file.name);
      setError("");
    };
    reader.readAsDataURL(file);
  };
  const continueToBusiness = (event) => {
    event.preventDefault();
    if (form.password !== form.password_confirmation) {
      setError("Password confirmation does not match.");
      return;
    }
    setError("");
    setSearchParams({ step: "business" });
  };
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await register(form);
      setVerificationEmail(result.email);
      setLocalCode(result.verification_code || "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };
  const verify = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await verifyEmail({ email: verificationEmail, code });
      navigate("/marketplace", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };
  const resend = async () => {
    setSubmitting(true);
    setError("");
    try {
      const result = await register(form);
      setLocalCode(result.verification_code || "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="register-page auth-page grid h-[100dvh] overflow-hidden bg-white lg:grid-cols-[minmax(560px,56%)_1fr]">
      <section className="auth-scroll-panel flex min-h-0 items-start justify-center overflow-y-auto px-4 py-5 sm:px-8 lg:px-10">
        <div className="my-auto w-full max-w-[610px]">
          <BrandLogo />
          <div className="mt-6">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <UserRound className="h-3.5 w-3.5" />
              Buyer registration
            </span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              {verificationEmail ? "Verify your email" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {verificationEmail
                ? `Enter the 6-digit code sent to ${verificationEmail}.`
                : step === 1
                  ? "Start with your login and contact details."
                  : "Tell us about your business (optional)."}
            </p>
          </div>

          {!verificationEmail && (
            <div className="mt-5 flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSearchParams({});
                  setError("");
                }}
                className="inline-flex items-center gap-3"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary font-bold text-white">
                  1
                </span>
                <b
                  className={
                    step === 1
                      ? "text-slate-900"
                      : "text-primary hover:underline"
                  }
                >
                  Account details
                </b>
              </button>
              <span className="h-px flex-1 bg-slate-200" />
              <span
                className={`grid h-7 w-7 place-items-center rounded-full font-bold ${step >= 2 ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}
              >
                2
              </span>
              <b className={step === 2 ? "text-slate-900" : "text-slate-500"}>
                Business profile
              </b>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            >
              <AlertCircle className="mt-px h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {verificationEmail ? (
            <form onSubmit={verify} className="mt-6 space-y-4">
              {localCode && (
                <button
                  type="button"
                  onClick={() => setCode(localCode)}
                  className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800"
                >
                  <span className="font-semibold">Local testing code:</span>{" "}
                  <b className="ml-1 tracking-[.2em]">{localCode}</b>
                  <span className="ml-2 text-[11px]">Click to use</span>
                </button>
              )}
              <div>
                <label
                  htmlFor="verification-code"
                  className="mb-1.5 block text-xs font-semibold"
                >
                  Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="verification-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    required
                    autoFocus
                    className="h-12 w-full rounded-md border pl-10 pr-3 text-center text-xl font-bold tracking-[.4em]"
                    placeholder="000000"
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                loading={submitting}
                disabled={code.length !== 6}
                className="w-full"
              >
                {submitting ? "Verifying email" : "Verify & Continue"}
              </Button>
              <button
                type="button"
                disabled={submitting}
                onClick={resend}
                className="w-full text-xs font-semibold text-primary disabled:opacity-50"
              >
                Resend verification code
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerificationEmail("");
                  setCode("");
                  setLocalCode("");
                  setSearchParams({});
                  setError("");
                }}
                className="w-full text-xs text-slate-500"
              >
                Change email
              </button>
            </form>
          ) : step === 1 ? (
            <form
              onSubmit={continueToBusiness}
              className="mt-5 grid gap-3 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <Field
                  id="register-name"
                  label="Full Name"
                  icon={UserRound}
                  name="name"
                  value={form.name}
                  onChange={change}
                  required
                  maxLength={100}
                  placeholder="Your full name"
                />
              </div>
              <Field
                id="register-email"
                label="Email"
                icon={Mail}
                name="email"
                type="email"
                value={form.email}
                onChange={change}
                required
                placeholder="you@example.com"
              />
                <PhoneCountryField
                  value={form.phone}
                  country={form.phone_country}
                  required
                  onChange={(phone) => {
                    setForm((current) => ({ ...current, phone }))
                    setError('')
                  }}
                  onCountryChange={(country) =>
                    setForm((current) => ({ ...current, country, phone_country: country }))
                  }
                />
              <Field
                id="register-password"
                label="Password"
                icon={LockKeyhole}
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={change}
                required
                minLength={8}
                error={
                  form.password && form.password.length < 8
                    ? "Use at least 8 characters."
                    : ""
                }
                placeholder="Minimum 8 characters"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-slate-400 hover:text-primary"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
              <Field
                id="register-confirmation"
                label="Confirm Password"
                icon={LockKeyhole}
                name="password_confirmation"
                type={showConfirmation ? "text" : "password"}
                value={form.password_confirmation}
                onChange={change}
                required
                minLength={8}
                error={
                  form.password_confirmation &&
                  form.password !== form.password_confirmation
                    ? "Passwords do not match."
                    : ""
                }
                placeholder="Repeat password"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirmation((visible) => !visible)}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-slate-400 hover:text-primary"
                    aria-label={
                      showConfirmation
                        ? "Hide password confirmation"
                        : "Show password confirmation"
                    }
                  >
                    {showConfirmation ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
              <button className="sm:col-span-2 mt-1 flex h-11 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white hover:bg-blue-700">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  id="register-company"
                  label="Company Name (optional)"
                  icon={Building2}
                  name="company_name"
                  value={form.company_name}
                  onChange={change}
                  maxLength={150}
                  placeholder="Your company name"
                />
              </div>
              <label className="sm:col-span-2 flex h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-xs text-slate-500 hover:border-primary">
                <ImagePlus className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">
                  {logoName || "Upload company logo (optional)"}
                </span>
                <span className="font-semibold text-primary">Browse</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={selectLogo}
                  className="sr-only"
                />
              </label>
              <div className="sm:col-span-2">
                <label
                  htmlFor="register-address"
                  className="mb-1.5 block text-xs font-semibold"
                >
                  Address (optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    id="register-address"
                    name="address"
                    value={form.address}
                    onChange={change}
                    maxLength={1000}
                    rows="2"
                    className="w-full rounded-md border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
                    placeholder="Street or business address"
                  />
                </div>
              </div>
              <Field
                id="register-city"
                label="City (optional)"
                name="city"
                value={form.city}
                onChange={change}
                maxLength={100}
                placeholder="City"
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  Country
                </label>
                <CountrySelect
                  required
                  value={form.country}
                  onChange={(country) =>
                    setForm((current) => ({ ...current, country }))
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchParams({});
                  setError("");
                }}
                className="flex h-11 items-center justify-center gap-2 rounded-md border border-primary bg-white text-sm font-semibold text-primary transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to account details
              </button>
              <Button
                type="submit"
                size="lg"
                loading={submitting}
                className="w-full"
              >
                {submitting ? "Creating account" : "Create account"}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-slate-500">
            Already registered?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
      <section
        className="relative hidden min-h-0 overflow-hidden bg-gradient-to-br from-[#020617] via-[#082d66] to-primary lg:flex lg:items-center lg:justify-center"
        aria-hidden="true"
      >
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative max-w-lg p-12">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100">
            QUOTATION GLOBAL MARKETPLACE
          </span>
          <h2 className="mt-6 text-4xl font-bold leading-tight text-white">
            Find the right technology partner for your business.
          </h2>
          <p className="mt-5 text-base leading-7 text-blue-100">
            Create your verified account and connect with trusted vendors across
            software, hardware and professional services.
          </p>
          <div className="mt-8 grid gap-3">
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-sm font-semibold text-white">
              ✓ Request competitive quotations
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-sm font-semibold text-white">
              ✓ Book product demonstrations
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-sm font-semibold text-white">
              ✓ Generate and manage purchase orders
            </div>
          </div>
          <p className="mt-8 text-xs text-blue-200">
            Secure email verification · Verified vendors · Transparent
            procurement
          </p>
        </div>
      </section>
    </main>
  );
}
