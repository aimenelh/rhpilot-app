"use client";
export function CookiePreferencesButton() {
 return <button type="button" className="text-sm text-ink-soft hover:underline" onClick={() => window.dispatchEvent(new Event("rhpilot:manage-cookies"))}>Gérer mes cookies</button>;
}
