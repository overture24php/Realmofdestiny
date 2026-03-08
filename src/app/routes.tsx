import { createBrowserRouter, Outlet, Navigate } from "react-router";
import { GameProvider } from "./contexts/GameContext";
import GuestRoute from "./components/GuestRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import GamePage from "./pages/GamePage";
import VillagePage from "./pages/VillagePage";
import ChiefHousePage from "./pages/ChiefHousePage";
import BlacksmithPage from "./pages/BlacksmithPage";
import TemplePage from "./pages/TemplePage";
import ArenaPage from "./pages/ArenaPage";
import DiagnosticPage from "./pages/DiagnosticPage";
import FieldPage from "./pages/FieldPage";
import ClinicPage from "./pages/ClinicPage";
import AdminPage from "./pages/AdminPage";
import MarketPage from "./pages/MarketPage";
import FarmlandPage from "./pages/FarmlandPage";
import GuildPage from "./pages/GuildPage";
import RiverPage from "./pages/RiverPage";
import TownHallPage from "./pages/TownHallPage";

function RootLayout() {
  return (
    <GameProvider>
      <Outlet />
    </GameProvider>
  );
}

export const router = createBrowserRouter([
  // ── Admin panel — completely standalone, no GameProvider wrapping ────────────
  {
    path: "admin",
    Component: AdminPage,
  },

  // ── Safety redirects for shortened/legacy paths ──────────────────────────────
  { path: "clinic",              element: <Navigate to="/game/village/clinic"      replace /> },
  { path: "arena",               element: <Navigate to="/game/village/arena"       replace /> },
  { path: "blacksmith",          element: <Navigate to="/game/village/blacksmith"  replace /> },
  { path: "temple",              element: <Navigate to="/game/village/temple"      replace /> },
  { path: "village",             element: <Navigate to="/game/village"             replace /> },

  // ── Main app — all other routes wrapped in GameProvider ─────────────────────
  {
    path: "/",
    Component: RootLayout,
    children: [
      // ── Halaman publik — hanya untuk tamu (belum login) ─────────────────────
      {
        Component: GuestRoute,
        children: [
          { index: true, Component: LandingPage },
          { path: "login",    Component: LoginPage },
          { path: "register", Component: RegisterPage },
        ],
      },

      // ── Halaman diagnostik (bebas diakses) ──────────────────────────────────
      { path: "diagnostic", Component: DiagnosticPage },

      // ── Halaman dalam game (harus sudah login, dijaga oleh GamePage) ─────────
      {
        path: "game",
        Component: GamePage,
        children: [
          { path: "village",             Component: VillagePage },
          { path: "village/chief-house", Component: ChiefHousePage },
          { path: "village/blacksmith",  Component: BlacksmithPage },
          { path: "village/temple",      Component: TemplePage },
          { path: "village/arena",       Component: ArenaPage },
          { path: "village/clinic",      Component: ClinicPage },
          { path: "village/market",      Component: MarketPage },
          { path: "village/farmland",    Component: FarmlandPage },
          { path: "village/guild",       Component: GuildPage },
          { path: "village/river",       Component: RiverPage },
          { path: "village/town-hall",   Component: TownHallPage },
          // Field / area locations — locationId matches worldMapData ids
          { path: "location/:locationId", Component: FieldPage },
        ],
      },
    ],
  },
]);