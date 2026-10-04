export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/early-access" && request.method === "POST") {
      try {
        const data = await request.json();

        const name = String(data.name || "").trim();
        const email = String(data.email || "").trim();
        const organization = String(data.organization || "").trim();
        const message = String(data.message || "").trim();

        if (!name || !email || !organization) {
          return Response.json(
            { success: false, error: "Missing required fields." },
            { status: 400 }
          );
        }

        if (!email.includes("@")) {
          return Response.json(
            { success: false, error: "Please enter a valid email." },
            { status: 400 }
          );
        }

        await env.DB.prepare(
          `INSERT INTO early_access
           (name, email, organization, message)
           VALUES (?, ?, ?, ?)`
        )
          .bind(name, email, organization, message)
          .run();

        return Response.json({ success: true });
      } catch (error) {
        console.error(error);

        return Response.json(
          { success: false, error: "Unable to submit request." },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
