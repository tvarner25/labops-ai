export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --------------------------------
    // EARLY ACCESS
    // --------------------------------

    if (url.pathname === "/api/early-access" && request.method === "POST") {
      try {
        const data = await request.json();

        const name = String(data.name || "").trim();
        const email = String(data.email || "").trim();
        const organization = String(data.organization || "").trim();
        const message = String(data.message || "").trim();

        if (!name || !email || !organization) {
          return Response.json(
            {
              success: false,
              error: "Missing required fields."
            },
            { status: 400 }
          );
        }

        if (!email.includes("@")) {
          return Response.json(
            {
              success: false,
              error: "Please enter a valid email."
            },
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

        return Response.json({
          success: true
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to submit request."
          },
          { status: 500 }
        );
      }
    }


    // --------------------------------
    // CREATE EXPERIMENT
    // --------------------------------

    if (url.pathname === "/api/experiments" && request.method === "POST") {
      try {
        const data = await request.json();

        const title = String(data.title || "").trim();
        const project = String(data.project || "").trim();
        const objective = String(data.objective || "").trim();
        const protocol = String(data.protocol || "").trim();
        const researcher = String(data.researcher || "").trim();
        const status = String(data.status || "Planning").trim();
        const startDate = String(data.start_date || "").trim();
        const tags = String(data.tags || "").trim();

        if (!title) {
          return Response.json(
            {
              success: false,
              error: "Experiment title is required."
            },
            { status: 400 }
          );
        }

        const result = await env.DB.prepare(
          `INSERT INTO experiments
          (
            title,
            project,
            objective,
            protocol,
            researcher,
            status,
            start_date,
            tags
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            title,
            project,
            objective,
            protocol,
            researcher,
            status,
            startDate,
            tags
          )
          .run();

        return Response.json({
          success: true,
          experimentId: result.meta.last_row_id
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to create experiment."
          },
          { status: 500 }
        );
      }
    }


    // --------------------------------
    // STATIC WEBSITE
    // --------------------------------

    return env.ASSETS.fetch(request);
  }
};
