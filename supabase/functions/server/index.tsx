import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-f8fa42fe/health", (c) => {
  return c.json({ status: "ok" });
});

// Register endpoint
app.post("/make-server-f8fa42fe/auth/register", async (c) => {
  try {
    const { email, password, name, startingRole } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error(`Error creating user during registration: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Initialize player data in KV store
    const playerId = data.user.id;
    const playerData = {
      id: playerId,
      name,
      email,
      role: startingRole || 'citizen',
      karma: 0,
      faction: 'neutral',
      level: 1,
      experience: 0,
      gold: 100,
      
      // Stats
      stats: {
        hp: 100,
        mp: 50,
        physicalAtk: 10,
        magicAtk: 10,
        physicalDef: 10,
        magicDef: 10,
        dodge: 5, // percentage
        accuracy: 10, // percentage
      },
      
      // Equipment
      equipment: {
        helm: null,
        rightHand: null,
        leftHand: null,
        armor: null,
        boots: null,
      },
      
      // Inventory
      inventory: [],
      
      // Tutorial Progress
      tutorialProgress: {
        gotWeapon: false,
        trainedAtArena: false,
        defeatedBoars: 0,
        meditated: false,
        completed: false,
      },
      
      location: 'greenleaf_village',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`player:${playerId}`, playerData);

    return c.json({ 
      success: true, 
      user: data.user,
      playerData 
    });
  } catch (error) {
    console.error(`Registration error: ${error}`);
    return c.json({ error: "Registration failed" }, 500);
  }
});

// Get player data endpoint
app.get("/make-server-f8fa42fe/player", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error(`Authorization error while getting player data: ${error?.message}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const playerData = await kv.get(`player:${user.id}`);

    if (!playerData) {
      return c.json({ error: "Player data not found" }, 404);
    }

    return c.json({ player: playerData });
  } catch (error) {
    console.error(`Error fetching player data: ${error}`);
    return c.json({ error: "Failed to fetch player data" }, 500);
  }
});

// Update player data endpoint
app.put("/make-server-f8fa42fe/player", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error(`Authorization error while updating player data: ${error?.message}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const updates = await c.req.json();
    const currentData = await kv.get(`player:${user.id}`);

    if (!currentData) {
      return c.json({ error: "Player data not found" }, 404);
    }

    const updatedData = { ...currentData, ...updates };
    await kv.set(`player:${user.id}`, updatedData);

    return c.json({ success: true, player: updatedData });
  } catch (error) {
    console.error(`Error updating player data: ${error}`);
    return c.json({ error: "Failed to update player data" }, 500);
  }
});

// Complete tutorial step endpoint
app.post("/make-server-f8fa42fe/player/tutorial", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error(`Authorization error while completing tutorial step: ${error?.message}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const { step } = await c.req.json();
    const currentData = await kv.get(`player:${user.id}`);

    if (!currentData) {
      return c.json({ error: "Player data not found" }, 404);
    }

    // Initialize tutorial progress if not exists
    if (!currentData.tutorialProgress) {
      currentData.tutorialProgress = {
        gotWeapon: false,
        trainedAtArena: false,
        defeatedBoars: 0,
        meditated: false,
        completed: false
      };
    }

    // Update tutorial progress based on step
    switch (step) {
      case 'weapon':
        currentData.tutorialProgress.gotWeapon = true;
        break;
      case 'arena':
        currentData.tutorialProgress.trainedAtArena = true;
        break;
      case 'boars':
        currentData.tutorialProgress.defeatedBoars = 4;
        break;
      case 'meditate':
        currentData.tutorialProgress.meditated = true;
        break;
    }

    // Check if all tutorials are completed
    const progress = currentData.tutorialProgress;
    if (progress.gotWeapon && progress.trainedAtArena && 
        progress.defeatedBoars >= 4 && progress.meditated) {
      currentData.tutorialProgress.completed = true;
    }

    await kv.set(`player:${user.id}`, currentData);

    return c.json({ success: true, player: currentData });
  } catch (error) {
    console.error(`Error completing tutorial step: ${error}`);
    return c.json({ error: "Failed to complete tutorial step" }, 500);
  }
});

Deno.serve(app.fetch);