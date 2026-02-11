import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default admin credentials
const DEFAULT_ADMIN_EMAIL = "admin@dukasmart.app";
const DEFAULT_ADMIN_PASSWORD = "Admin";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, email } = body;

    // Admin login action - no auth required
    if (action === "admin_login") {
      const { username, password } = body;
      
      // Check default credentials first
      if (username === "Admin" && password === "Admin") {
        // Ensure the default admin account exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        let adminUser = existingUsers?.users?.find((u: any) => u.email === DEFAULT_ADMIN_EMAIL);
        
        if (!adminUser) {
          // Create the default admin user
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: DEFAULT_ADMIN_EMAIL,
            password: DEFAULT_ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { name: "Super Admin" },
          });
          if (createError) throw createError;
          adminUser = newUser.user;
        }

        // Ensure super_admin role exists
        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("id")
          .eq("user_id", adminUser.id)
          .eq("role", "super_admin")
          .maybeSingle();

        if (!existingRole) {
          await adminClient.from("user_roles").insert({
            user_id: adminUser.id,
            role: "super_admin",
          });
        }

        // Sign in as admin to get a session token
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const signInClient = createClient(supabaseUrl, anonKey);
        const { data: signInData, error: signInError } = await signInClient.auth.signInWithPassword({
          email: DEFAULT_ADMIN_EMAIL,
          password: DEFAULT_ADMIN_PASSWORD,
        });

        if (signInError) throw signInError;

        return new Response(JSON.stringify({
          success: true,
          session: signInData.session,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid admin credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    // Bootstrap: if no super_admins exist, the first caller becomes one
    if (action === "bootstrap") {
      const { count } = await adminClient
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "super_admin");

      if ((count ?? 0) > 0) {
        return new Response(
          JSON.stringify({ error: "Super admin already exists" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient.from("user_roles").insert({
        user_id: user.id,
        role: "super_admin",
      });

      return new Response(JSON.stringify({ success: true, message: "You are now super admin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require super_admin
    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Forbidden: super admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_admin") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) throw listError;

      const targetUser = users.find((u: any) => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "User not found. They must sign up first." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: insertError } = await adminClient.from("user_roles").insert({
        user_id: targetUser.id,
        role: "super_admin",
      });

      if (insertError) {
        if (insertError.code === "23505") {
          return new Response(JSON.stringify({ error: "User is already a super admin" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw insertError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_admin") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const targetUser = users.find((u: any) => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (targetUser.id === user.id) {
        const { count } = await adminClient
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "super_admin");
        if ((count ?? 0) <= 1) {
          return new Response(JSON.stringify({ error: "Cannot remove the last super admin" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUser.id)
        .eq("role", "super_admin");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_admins") {
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "super_admin");

      const { data: { users } } = await adminClient.auth.admin.listUsers();
      
      const admins = (roles || []).map((r: any) => {
        const u = users.find((u: any) => u.id === r.user_id);
        return {
          user_id: r.user_id,
          email: u?.email || "unknown",
          created_at: r.created_at,
        };
      });

      return new Response(JSON.stringify({ admins }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
