import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { useGlobalSearch } from "../../lib/globalSearch";
import { useStore } from "../../lib/store";
import { useThemeStore } from "../../lib/themeStore";
import { NotificationCenter } from "./NotificationCenter";

export function Topbar({ onOpenMobileNav, primaryAction }: { onOpenMobileNav: () => void; primaryAction?: { label: string; onClick: () => void } }) {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const results = useGlobalSearch(query);
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const searchRef = useRef<HTMLDivElement>(null);

  function toggleTheme() {
    // Cycles Light -> Dark -> Light for the quick topbar toggle.
    // "System" remains available from Settings > Appearance.
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-outline-variant flex justify-between items-center w-full px-4 lg:px-edge-margin-desktop py-stack-md h-[72px] flex-shrink-0">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button className="lg:hidden text-on-surface-variant" onClick={onOpenMobileNav}>
          <Icon name="menu" />
        </button>
        <div className="relative w-full max-w-xs" ref={searchRef}>
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search leads, clients, IDs, phone..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-primary text-body-sm font-body-sm h-10"
          />
          {searchFocused && query.trim() && (
            <div className="absolute top-12 left-0 w-full min-w-[320px] bg-surface-container-lowest border border-outline-variant rounded-lg shadow-soft-hover z-50 overflow-hidden">
              {results.length === 0 ? (
                <div className="px-4 py-3 text-body-sm font-body-sm text-on-surface-variant">No results for "{query}"</div>
              ) : (
                results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => {
                      navigate(r.path);
                      setQuery("");
                      setSearchFocused(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low text-left border-b border-outline-variant/50 last:border-0"
                  >
                    <Icon name={r.icon} className="text-on-surface-variant flex-shrink-0" size={18} />
                    <div className="min-w-0">
                      <div className="text-body-sm font-body-sm text-on-surface truncate">{r.label}</div>
                      <div className="text-xs text-on-surface-variant truncate">{r.sublabel}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-1 text-outline">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
          </button>
          <button onClick={() => navigate("/help")} className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors">
            <Icon name="help" />
          </button>
        </div>
        <NotificationCenter />
        {primaryAction && (
          <div className="hidden md:flex items-center border-l border-outline-variant pl-4">
            <Button variant="primary" size="sm" onClick={primaryAction.onClick} icon={<Icon name="add" size={16} />}>
              {primaryAction.label}
            </Button>
          </div>
        )}
        <button onClick={() => navigate("/settings")} className="ml-1">
          <Avatar name={currentUser.name} size={40} className="border border-outline-variant" />
        </button>
      </div>
    </header>
  );
}
