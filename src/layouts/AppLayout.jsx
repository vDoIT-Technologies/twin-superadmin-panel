import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../app/AuthContext";
import { FilterContext } from "../app/FilterContext";
import { FilterToolbar } from "../components/layout/FilterToolbar";
import { Sidebar } from "../components/layout/Sidebar";
import { superadminDemoData } from "../demo-data/superadminDemoData";
import {
  dropdownApiAvailable,
  getClientsDropdown,
  getTwinsDropdown,
  getUsersDropdown,
} from "../services";
import {
  Search,
  Bell,
  Columns2,
  CornerDownLeft,
  ChevronDown,
  LogOut,
  UserCircle2,
} from "lucide-react";

const breadcrumbTitles = {
  "/": "Overview",
  "/clients": "Clients",
  "/twins": "Twins",
  "/users": "Users",
  "/services": "Services",
  "/vault": "Vault",
  "/financial": "Cost & Billing",
  "/usage": "Usage Analytics",
  "/telemetry": "Telemetry / Logs",
  "/profile": "Profile",
};

const invalidUserNames = new Set([
  "",
  "-",
  "?",
  "-?",
  "n/a",
  "na",
  "null",
  "undefined",
]);

function getUserName(user) {
  const name = typeof user.name === "string" ? user.name.trim() : "";
  return invalidUserNames.has(name.toLowerCase()) ? "" : name;
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, profile, user } = useAuth();
  const { filters, setFilters } = useContext(FilterContext);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [twins, setTwins] = useState([]);
  const [users, setUsers] = useState([]);
  const searchRef = useRef(null);
  const profileMenuRef = useRef(null);
  const showFilterBar = location.pathname !== "/profile";
  const showOverviewControls = location.pathname === "/";
  const currentTitle =
    breadcrumbTitles[location.pathname] ??
    (location.pathname.startsWith("/clients/")
      ? "Clients"
      : location.pathname.startsWith("/twins/")
        ? "Twins"
        : location.pathname.startsWith("/users/")
          ? "Users"
          : "Overview");
  const profileName = profile.name || user?.name || "Super Admin";
  const profileEmail = profile.email || user?.email || "No email";
  const initials =
    profileName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SA";

  const updateFilters = (partial) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const selectedEnv = filters.envs.length === 1 ? filters.envs[0] : undefined;

  useEffect(() => {
    if (!isAuthenticated || !dropdownApiAvailable()) {
      return undefined;
    }

    let active = true;

    getClientsDropdown({ env: selectedEnv })
      .then((data) => {
        if (active) setClients(data);
      })
      .catch((error) => {
        console.error("[AppLayout] Failed to load clients:", error);
        if (active) setClients([]);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, selectedEnv]);

  useEffect(() => {
    if (!isAuthenticated || !dropdownApiAvailable()) {
      return undefined;
    }

    let active = true;

    getTwinsDropdown({
      env: selectedEnv,
      clientId: filters.client,
    })
      .then((data) => {
        if (active) setTwins(data);
      })
      .catch((error) => {
        console.error("[AppLayout] Failed to load twins:", error);
        if (active) setTwins([]);
      });

    return () => {
      active = false;
    };
  }, [filters.client, isAuthenticated, selectedEnv]);

  useEffect(() => {
    if (!isAuthenticated || !dropdownApiAvailable()) {
      return undefined;
    }

    let active = true;

    getUsersDropdown({
      env: selectedEnv,
      clientId: filters.client,
      twinId: filters.twin,
    })
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch((error) => {
        console.error("[AppLayout] Failed to load users:", error);
        if (active) setUsers([]);
      });

    return () => {
      active = false;
    };
  }, [filters.client, filters.twin, isAuthenticated, selectedEnv]);

  const vendorOptions = useMemo(
    () =>
      superadminDemoData.VENDORS.filter(
        (vendor) =>
          !filters.service ||
          superadminDemoData.byId
            .service(filters.service)
            ?.vendors.includes(vendor.id),
      ),
    [filters.service],
  );
  const clientDropdownOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id ?? client._id ?? client.value,
        label: client.name ?? client.label,
        meta: client.plan ?? "",
      })),
    [clients],
  );
  const twinDropdownOptions = useMemo(
    () =>
      twins.map((twin) => ({
        value: twin.id ?? twin._id ?? twin.value,
        label: twin.name ?? twin.label,
        meta: twin.clientName ?? twin.client?.name ?? "",
      })),
    [twins],
  );
  const userDropdownOptions = useMemo(
    () =>
      users.map((user) => {
        const name = getUserName(user);

        return {
          value: user.id ?? user._id ?? user.value,
          label: name || user.email || user.label || "Unknown user",
        };
      }),
    [users],
  );
  const serviceDropdownOptions = useMemo(
    () =>
      superadminDemoData.SERVICES.map((service) => ({
        value: service.id,
        label: service.name,
        meta: service.stack,
      })),
    [],
  );
  const vendorDropdownOptions = useMemo(
    () =>
      vendorOptions.map((vendor) => ({
        value: vendor.id,
        label: vendor.name,
        meta: vendor.cat,
      })),
    [vendorOptions],
  );
  const updateScopeFilter = (key, value) => {
    if (key === "client") {
      updateFilters({ client: value, twin: null, user: null });
      return;
    }

    if (key === "twin") {
      updateFilters({ twin: value, user: null });
      return;
    }

    if (key === "service") {
      updateFilters({ service: value, vendor: null });
      return;
    }

    updateFilters({ [key]: value });
  };

  const searchHits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const clients = superadminDemoData.CLIENTS.filter((client) =>
      client.name.toLowerCase().includes(q),
    )
      .slice(0, 4)
      .map((client) => ({
        key: `client-${client.id}`,
        type: "client",
        id: client.id,
        name: client.name,
        sub: client.plan,
        icon: <Building2 size={14} />,
        path: `/clients/${client.id}`,
      }));

    const twins = superadminDemoData.TWINS.filter((twin) =>
      twin.name.toLowerCase().includes(q),
    )
      .slice(0, 4)
      .map((twin) => ({
        key: `twin-${twin.id}`,
        type: "twin",
        id: twin.id,
        name: twin.name,
        sub: superadminDemoData.byId.client(twin.clientId)?.name ?? "",
        icon: <Bot size={14} />,
        path: `/twins/${twin.id}`,
      }));

    const users = superadminDemoData.USERS.filter((user) =>
      user.name.toLowerCase().includes(q),
    )
      .slice(0, 4)
      .map((user) => ({
        key: `user-${user.id}`,
        type: "user",
        id: user.id,
        name: user.name,
        sub: superadminDemoData.byId.client(user.clientId)?.name ?? "",
        icon: <Users size={14} />,
        path: `/users/${user.id}`,
      }));

    return [...clients, ...twins, ...users];
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setSearchOpen(false);
      }

      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSearchQuery("");
    setSearchOpen(false);
    setIsMobileSearchOpen(false);
    setProfileMenuOpen(false);
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") setIsMobileSidebarOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileSidebarOpen]);

  const openSearch = () => {
    if (searchQuery.trim()) {
      setSearchOpen(true);
    }
  };

  const selectSearchHit = (hit) => {
    setSearchQuery("");
    setSearchOpen(false);
    navigate(hit.path);
  };

  const handleProfileAction = (path) => {
    setProfileMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={isSidebarCollapsed}
        mobileOpen={isMobileSidebarOpen}
        onNavigate={() => setIsMobileSidebarOpen(false)}
        initials={initials}
        profileName={profileName}
        profileEmail={profileEmail}
      />
      <button
        type="button"
        className={`sidebar-backdrop${isMobileSidebarOpen ? " visible" : ""}`}
        aria-label="Close navigation"
        aria-hidden={!isMobileSidebarOpen}
        tabIndex={isMobileSidebarOpen ? 0 : -1}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      <div className="workspace">
        <div className="workspace-chrome">
          <header className="topbar">
            <div
              className={`topbar-title-group${isMobileSearchOpen ? " mobile-search-active" : ""}`}
            >
              <button
                className="icon-button topbar-toggle"
                type="button"
                aria-label={
                  isMobileSidebarOpen
                    ? "Close navigation"
                    : isSidebarCollapsed
                      ? "Expand sidebar"
                      : "Open navigation"
                }
                aria-expanded={isMobileSidebarOpen}
                aria-pressed={isSidebarCollapsed}
                onClick={() => {
                  if (window.matchMedia("(max-width: 1024px)").matches) {
                    setIsMobileSidebarOpen((value) => !value);
                    return;
                  }
                  setIsSidebarCollapsed((value) => !value);
                }}
              >
                <Columns2 size={16} />
              </button>
              <div className="breadcrumb">
                <span className="breadcrumb-current">{currentTitle}</span>
              </div>
            </div>

            <div
              className={`topbar-actions${isMobileSearchOpen ? " mobile-search-active" : ""}`}
            >
              <div
                className={`search-shell${isMobileSearchOpen ? " mobile-search-open" : ""}`}
                ref={searchRef}
              >
                <button
                  type="button"
                  className="icon-button mobile-search-trigger"
                  aria-label="Open search"
                  aria-expanded={isMobileSearchOpen}
                  onClick={() => {
                    setIsMobileSearchOpen(true);

                    window.requestAnimationFrame(() => {
                      searchRef.current?.querySelector("input")?.focus();
                    });
                  }}
                >
                  <Search size={16} />
                </button>

                <Search className="search-icon" size={16} />

                <input
                  type="text"
                  value={searchQuery}
                  placeholder="Search clients, twins, users..."
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setSearchQuery(nextQuery);
                    setSearchOpen(Boolean(nextQuery.trim()));
                  }}
                  onFocus={openSearch}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSearchQuery("");
                      setSearchOpen(false);
                      setIsMobileSearchOpen(false);
                      event.currentTarget.blur();
                    }
                  }}
                />

                <button
                  type="button"
                  className="mobile-search-close"
                  aria-label="Close search"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchOpen(false);
                    setIsMobileSearchOpen(false);
                  }}
                >
                  ×
                </button>

                {searchOpen ? (
                  <div
                    className="search-results"
                    role="listbox"
                    aria-label="Global search results"
                  >
                    {searchHits.length ? (
                      searchHits.map((hit) => (
                        <button
                          key={hit.key}
                          type="button"
                          className="search-result-button"
                          onClick={() => selectSearchHit(hit)}
                        >
                          <span className="search-result-icon">{hit.icon}</span>

                          <span className="search-result-copy">
                            <span className="search-result-name">
                              {hit.name}
                            </span>

                            <span className="search-result-meta">
                              {hit.type} · {hit.sub}
                            </span>
                          </span>

                          <CornerDownLeft
                            size={14}
                            className="search-result-enter"
                          />
                        </button>
                      ))
                    ) : (
                      <div className="search-results-empty">
                        No matches for "{searchQuery.trim()}"
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Notifications"
              >
                <Bell size={16} />
              </button>
              <div className="profile-menu-shell" ref={profileMenuRef}>
                <button
                  className="profile-menu-trigger"
                  type="button"
                  aria-label="Open profile menu"
                  aria-expanded={profileMenuOpen}
                  onClick={() => setProfileMenuOpen((value) => !value)}
                >
                  <div className="avatar-badge compact">{initials}</div>
                  <ChevronDown size={14} className="profile-menu-caret" />
                </button>
                {profileMenuOpen ? (
                  <div className="profile-menu-dropdown">
                    <button
                      type="button"
                      className="profile-menu-item"
                      onClick={() => handleProfileAction("/profile")}
                    >
                      <UserCircle2 size={15} />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      className="profile-menu-item danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          {showFilterBar ? (
            <FilterToolbar
              filters={filters}
              updateFilters={updateFilters}
              updateScopeFilter={updateScopeFilter}
              clientOptions={clientDropdownOptions}
              twinOptions={twinDropdownOptions}
              userOptions={userDropdownOptions}
              serviceOptions={serviceDropdownOptions}
              vendorOptions={vendorDropdownOptions}
              showOverviewControls={showOverviewControls}
            />
          ) : null}
        </div>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
