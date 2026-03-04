import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Token", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function createDefaultPlayerData(
  userId: string,
  email: string,
  name: string,
  role: string = "citizen",
) {
  return {
    id: userId,
    name,
    email,
    role,
    karma: 0,
    faction: "neutral",
    level: 1,
    experience: 0,
    gold: 100,
    stats: {
      hp: 100,
      mp: 50,
      physicalAtk: 10,
      magicAtk: 10,
      physicalDef: 10,
      magicDef: 10,
      dodge: 5,
      accuracy: 10,
    },
    equipment: {
      helm: null,
      rightHand: null,
      leftHand: null,
      armor: null,
      boots: null,
    },
    inventory: [],
    tutorialProgress: {
      gotWeapon: false,
      trainedAtArena: false,
      defeatedBoars: 0,
      meditated: false,
      completed: false,
    },
    location: "greenleaf_village",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Extract the user's JWT from the request.
 *
 * Strategy (in priority order):
 *   1. X-User-Token header   — explicit user token, bypasses gateway verification
 *   2. Authorization header  — may be user token OR anon key
 *
 * Then validate whichever token we find using the service-role client.
 */
async function getAuthUser(c: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY") ??
                      // fallback: parse from Authorization if it is the anon key
                      "";

  // Prefer X-User-Token (sent by our frontend to avoid gateway JWT check)
  const userTokenHeader = c.req.header("X-User-Token");
  // Fallback: regular Authorization header
  const authHeader = c.req.header("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  // Pick the right token to validate:
  // If X-User-Token is present, use it.
  // Else if Authorization is NOT the anon key, treat it as a user token.
  const tokenToValidate = userTokenHeader || bearerToken;

  if (!tokenToValidate) {
    return { user: null, error: "No token provided" };
  }

  // Create admin client to validate the token
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error } = await supabase.auth.getUser(tokenToValidate);

  if (error || !user) {
    return { user: null, error: error?.message ?? "Invalid token" };
  }

  return { user, error: null };
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/make-server-f8fa42fe/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Register ──────────────────────────────────────────────────────────────────
app.post("/make-server-f8fa42fe/auth/register", async (c) => {
  try {
    console.log("[REGISTER] Starting...");
    const { email, password, name, startingRole } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Create auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });

    if (error) {
      console.error("[REGISTER] Auth error:", error.message);
      return c.json({ error: error.message }, 400);
    }

    const userId = data.user.id;
    console.log("[REGISTER] User created:", userId);

    // Save player data
    const playerData = createDefaultPlayerData(
      userId,
      email,
      name,
      startingRole || "citizen",
    );

    for (let i = 0; i < 3; i++) {
      try {
        await kv.set(`player:${userId}`, playerData);
        const verify = await kv.get(`player:${userId}`);
        if (verify) {
          console.log("[REGISTER] Player data saved and verified");
          break;
        }
      } catch (err) {
        console.error(`[REGISTER] Save attempt ${i + 1} failed:`, err);
        if (i < 2) await new Promise((r) => setTimeout(r, 500));
      }
    }

    return c.json({ success: true, user: data.user, playerData });
  } catch (err) {
    console.error("[REGISTER] Unexpected error:", err);
    return c.json({ error: "Registration failed" }, 500);
  }
});

// ── GET player ────────────────────────────────────────────────────────────────
app.get("/make-server-f8fa42fe/player", async (c) => {
  try {
    console.log("[GET PLAYER] Request received");

    const { user, error: authError } = await getAuthUser(c);
    if (authError || !user) {
      console.error("[GET PLAYER] Auth failed:", authError);
      return c.json({ error: `Unauthorized: ${authError}` }, 401);
    }

    console.log("[GET PLAYER] Authenticated user:", user.id, user.email);

    let playerData = await kv.get(`player:${user.id}`);

    if (!playerData) {
      console.log("[GET PLAYER] Not found — auto-creating player...");
      const userName =
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "Player";

      playerData = createDefaultPlayerData(user.id, user.email!, userName);

      for (let i = 0; i < 3; i++) {
        try {
          await kv.set(`player:${user.id}`, playerData);
          const verify = await kv.get(`player:${user.id}`);
          if (verify) {
            console.log("[GET PLAYER] Auto-created player saved");
            playerData = verify;
            break;
          }
        } catch (err) {
          console.error(`[GET PLAYER] Auto-create attempt ${i + 1} failed:`, err);
          if (i < 2) await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (!playerData) {
        return c.json({ error: "Failed to create player data" }, 500);
      }
    }

    return c.json({ player: playerData });
  } catch (err: any) {
    console.error("[GET PLAYER] Error:", err?.message);
    return c.json({ error: "Failed to fetch player data" }, 500);
  }
});

// ── PUT player ────────────────────────────────────────────────────────────────
app.put("/make-server-f8fa42fe/player", async (c) => {
  try {
    const { user, error: authError } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const updates = await c.req.json();
    let currentData = await kv.get(`player:${user.id}`);

    if (!currentData) {
      const userName =
        user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Player";
      currentData = createDefaultPlayerData(user.id, user.email!, userName);
    }

    const updatedData = { ...currentData, ...updates };
    await kv.set(`player:${user.id}`, updatedData);

    return c.json({ success: true, player: updatedData });
  } catch (err: any) {
    console.error("[UPDATE PLAYER] Error:", err?.message);
    return c.json({ error: "Failed to update player" }, 500);
  }
});

// ── Tutorial step ─────────────────────────────────────────────────────────────
app.post("/make-server-f8fa42fe/player/tutorial", async (c) => {
  try {
    const { user, error: authError } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { step } = await c.req.json();
    let currentData = await kv.get(`player:${user.id}`);

    if (!currentData) {
      const userName =
        user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Player";
      currentData = createDefaultPlayerData(user.id, user.email!, userName);
    }

    if (!currentData.tutorialProgress) {
      currentData.tutorialProgress = {
        gotWeapon: false,
        trainedAtArena: false,
        defeatedBoars: 0,
        meditated: false,
        completed: false,
      };
    }

    switch (step) {
      case "weapon":
        currentData.tutorialProgress.gotWeapon = true;
        break;
      case "arena":
        currentData.tutorialProgress.trainedAtArena = true;
        break;
      case "boars":
        currentData.tutorialProgress.defeatedBoars = 4;
        break;
      case "meditate":
        currentData.tutorialProgress.meditated = true;
        break;
    }

    const p = currentData.tutorialProgress;
    if (p.gotWeapon && p.trainedAtArena && p.defeatedBoars >= 4 && p.meditated) {
      currentData.tutorialProgress.completed = true;
    }

    await kv.set(`player:${user.id}`, currentData);
    return c.json({ success: true, player: currentData });
  } catch (err: any) {
    console.error("[TUTORIAL] Error:", err?.message);
    return c.json({ error: "Failed to complete tutorial step" }, 500);
  }
});

Deno.serve(app.fetch);
