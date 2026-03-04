import { createBrowserRouter, Outlet } from "react-router";
import { GameProvider } from "./contexts/GameContext";
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

function RootLayout() {
  return (
    <GameProvider>
      <Outlet />
    </GameProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: LandingPage },
      { path: "login",      Component: LoginPage },
      { path: "register",   Component: RegisterPage },
      { path: "diagnostic", Component: DiagnosticPage },
      {
        path: "game",
        Component: GamePage,
        children: [
          { path: "village",             Component: VillagePage },
          { path: "village/chief-house", Component: ChiefHousePage },
          { path: "village/blacksmith",  Component: BlacksmithPage },
          { path: "village/temple",      Component: TemplePage },
          { path: "village/arena",       Component: ArenaPage },
          // Field / area locations — locationId matches worldMapData ids
          { path: "location/:locationId", Component: FieldPage },
        ],
      },
    ],
  },
]);
