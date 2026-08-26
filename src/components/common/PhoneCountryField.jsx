import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";

const flagAssets = import.meta.glob(
  "../../../node_modules/flag-icons/flags/4x3/*.svg",
  { eager: true, query: "?url", import: "default" },
);
const flagUrl = (code) =>
  flagAssets[`../../../node_modules/flag-icons/flags/4x3/${code.toLowerCase()}.svg`];

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryOptions = getCountries()
  .map((code) => ({
    code,
    name: displayNames.of(code),
    dialCode: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
const countryByName = (name) =>
  countryOptions.find((country) => country.name === name);

export default function PhoneCountryField({
  value,
  country = "Pakistan",
  onChange,
  onCountryChange,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef(null);
  const selected =
    countryByName(country) || countryOptions.find((item) => item.code === "PK");
  const localNumber = String(value || "").replace(
    new RegExp(`^\\${selected.dialCode}\\s*`),
    "",
  );

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return countryOptions.filter(
      (item) =>
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.dialCode.includes(term),
    );
  }, [query]);

  const updateNumber = (number, option = selected) => {
    const cleaned = number.replace(/[^\d\s()-]/g, "").replace(/^0+(?=\d)/, "");
    onChange(`${option.dialCode}${cleaned ? ` ${cleaned}` : ""}`);
  };

  const choose = (option) => {
    onCountryChange?.(option.name);
    updateNumber(localNumber, option);
    setOpen(false);
    setQuery("");
  };

  return (
    <div>
      <label
        htmlFor="register-phone"
        className="mb-1.5 block text-xs font-semibold"
      >
        Phone Number
      </label>
      <div
        ref={root}
        className="relative flex h-11 rounded-md border bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10"
      >
        <button
          type="button"
          aria-label="Select phone country code"
          aria-expanded={open}
          onClick={() => {
            setOpen((current) => !current);
            setQuery("");
          }}
          className="flex shrink-0 items-center gap-1.5 border-r px-2.5 text-sm hover:bg-slate-50"
        >
          <img
            src={flagUrl(selected.code)}
            alt=""
            className="h-4 w-5 shrink-0 rounded-[2px] object-cover shadow-sm"
          />
          <span className="font-medium text-slate-700">
            {selected.dialCode}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          />
        </button>
        <input
          id="register-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          maxLength={24}
          value={localNumber}
          onChange={(event) => updateNumber(event.target.value)}
          className="min-w-0 flex-1 rounded-r-md px-3 text-sm outline-none"
          placeholder="300 1234567"
        />
        {open && (
          <div className="absolute left-0 top-12 z-50 w-full min-w-72 overflow-hidden rounded-lg border bg-white shadow-overlay">
            <label className="relative block border-b p-2">
              <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search country or code..."
                className="h-9 w-full rounded-md border pl-9 pr-3 text-xs outline-none focus:border-primary"
              />
            </label>
            <div className="scrollbar-thin max-h-56 overflow-y-auto p-1">
              {filtered.map((option) => (
                <button
                  type="button"
                  key={option.code}
                  onClick={() => choose(option)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-blue-50 hover:text-primary ${option.code === selected.code ? "bg-blue-50 font-semibold text-primary" : "text-slate-700"}`}
                >
                  <img
                    src={flagUrl(option.code)}
                    alt=""
                    className="h-4 w-5 shrink-0 rounded-[2px] object-cover shadow-sm"
                  />
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  <span className="text-slate-500">{option.dialCode}</span>
                  {option.code === selected.code && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
