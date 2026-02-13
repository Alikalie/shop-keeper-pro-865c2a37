import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_ADMIN_EMAIL = "deswife@dukasmart.app";
const DEFAULT_ADMIN_PASSWORD = "Deswife";

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
      
      if (username === "Deswife" && password === "Deswife") {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        let adminUser = existingUsers?.users?.find((u: any) => u.email === DEFAULT_ADMIN_EMAIL);
        
        if (!adminUser) {
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: DEFAULT_ADMIN_EMAIL,
            password: DEFAULT_ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { name: "Super Admin" },
          });
          if (createError) throw createError;
          adminUser = newUser.user;
        }

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

    // Create staff - requires authenticated owner
    if (action === "create_staff") {
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

      const { staffName, staffEmail, staffPassword, staffRole } = body;

      if (!staffName || !staffEmail || !staffPassword) {
        return new Response(JSON.stringify({ error: "Name, email, and password are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check caller is owner
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("role, org_id, account_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!callerProfile || callerProfile.role !== "owner") {
        return new Response(JSON.stringify({ error: "Only owners can add staff" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check staff limits
      if (callerProfile.org_id) {
        const { data: org } = await adminClient
          .from("organizations")
          .select("max_staff, account_type")
          .eq("id", callerProfile.org_id)
          .maybeSingle();

        if (org) {
          const { count } = await adminClient
            .from("org_members")
            .select("*", { count: "exact", head: true })
            .eq("org_id", callerProfile.org_id);

          if ((count ?? 0) >= org.max_staff) {
            const limit = org.account_type === "personal" ? 3 : org.max_staff;
            return new Response(JSON.stringify({ 
              error: `Staff limit reached (${limit}). ${org.account_type === 'personal' ? 'Upgrade to Organization to add more.' : ''}` 
            }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Create the staff user account
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: staffEmail,
        password: staffPassword,
        email_confirm: true,
        user_metadata: { name: staffName },
      });

      if (createError) {
        if (createError.message?.includes("already been registered")) {
          return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw createError;
      }

      // Update the auto-created profile
      await adminClient
        .from("profiles")
        .update({ 
          role: staffRole || "staff",
          org_id: callerProfile.org_id,
          account_type: callerProfile.account_type,
        })
        .eq("user_id", newUser.user.id);

      // Add to org_members if org exists
      if (callerProfile.org_id) {
        await adminClient.from("org_members").insert({
          org_id: callerProfile.org_id,
          user_id: newUser.user.id,
          role: staffRole || "staff",
        });
      }

      // Copy shop settings for the staff (so they share the same shop context)
      const { data: ownerShop } = await adminClient
        .from("shop_settings")
        .select("name, address, phone, footer_message, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownerShop) {
        await adminClient
          .from("shop_settings")
          .update({
            name: ownerShop.name,
            address: ownerShop.address,
            phone: ownerShop.phone,
            footer_message: ownerShop.footer_message,
            logo_url: ownerShop.logo_url,
          })
          .eq("user_id", newUser.user.id);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        staff: { id: newUser.user.id, name: staffName, email: staffEmail, role: staffRole || "staff" } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List staff for an owner
    if (action === "list_staff") {
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

      // Get caller's org
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!callerProfile?.org_id) {
        // No org - just return own profile
        const { data: ownProfile } = await adminClient
          .from("profiles")
          .select("id, user_id, name, role, created_at")
          .eq("user_id", user.id);
        
        return new Response(JSON.stringify({ staff: ownProfile || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all org members' profiles
      const { data: members } = await adminClient
        .from("org_members")
        .select("user_id, role")
        .eq("org_id", callerProfile.org_id);

      const userIds = (members || []).map(m => m.user_id);
      
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, user_id, name, role, created_at")
        .in("user_id", userIds);

      // Get emails from auth
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      
      const staffList = (profiles || []).map(p => {
        const authUser = users.find((u: any) => u.id === p.user_id);
        return {
          ...p,
          email: authUser?.email || "unknown",
        };
      });

      return new Response(JSON.stringify({ staff: staffList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete staff
    if (action === "delete_staff") {
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

      const { staffUserId } = body;
      if (!staffUserId) {
        return new Response(JSON.stringify({ error: "Staff user ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cannot delete yourself
      if (staffUserId === user.id) {
        return new Response(JSON.stringify({ error: "Cannot remove yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check caller is owner
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("role, org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!callerProfile || callerProfile.role !== "owner") {
        return new Response(JSON.stringify({ error: "Only owners can remove staff" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove from org_members
      if (callerProfile.org_id) {
        await adminClient
          .from("org_members")
          .delete()
          .eq("org_id", callerProfile.org_id)
          .eq("user_id", staffUserId);
      }

      return new Response(JSON.stringify({ success: true }), {
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

    // List all registered users (for admin)
    if (action === "list_users") {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      
      const userList = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        name: u.user_metadata?.name || u.email,
      }));

      return new Response(JSON.stringify({ users: userList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete user (admin only)
    if (action === "delete_user") {
      const { userId } = body;
      if (!userId) {
        return new Response(JSON.stringify({ error: "User ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (userId === user.id) {
        return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
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
