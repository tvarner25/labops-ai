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
// GET EXPERIMENTS
// --------------------------------

if (url.pathname === "/api/experiments" && request.method === "GET") {
  try {
    const { results } = await env.DB.prepare(
      `SELECT
        id,
        title,
        project,
        objective,
        protocol,
        researcher,
        status,
        start_date,
        tags,
        created_at,
        updated_at
      FROM experiments
      ORDER BY created_at DESC`
    ).all();

    return Response.json({
      success: true,
      experiments: results
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Unable to load experiments."
      },
      { status: 500 }
    );
  }
}

    // --------------------------------
// GET EXPERIMENT NOTES
// --------------------------------

if (
  url.pathname.match(/^\/api\/experiments\/\d+\/notes$/) &&
  request.method === "GET"
) {
  try {
    const parts = url.pathname.split("/");
    const experimentId = parts[3];

    const { results } = await env.DB.prepare(
      `SELECT
        id,
        experiment_id,
        note,
        entry_type,
        created_at,
        updated_at
      FROM experiment_notes
      WHERE experiment_id = ?
      ORDER BY created_at DESC, id DESC`
    )
      .bind(experimentId)
      .all();

    return Response.json({
      success: true,
      notes: results
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Unable to load experiment notes."
      },
      { status: 500 }
    );
  }
}

// --------------------------------
// GET SINGLE EXPERIMENT
// --------------------------------
if (
  url.pathname.startsWith("/api/experiments/") &&
  request.method === "GET"
) {
  try {
    const id = url.pathname.split("/").pop();

    if (!id || !/^\d+$/.test(id)) {
      return Response.json(
        {
          success: false,
          error: "Invalid experiment ID."
        },
        { status: 400 }
      );
    }

    const experiment = await env.DB.prepare(
      `SELECT
        id,
        title,
        project,
        objective,
        protocol,
        researcher,
        status,
        start_date,
        tags,
        created_at,
        updated_at
      FROM experiments
      WHERE id = ?`
    )
      .bind(id)
      .first();

    if (!experiment) {
      return Response.json(
        {
          success: false,
          error: "Experiment not found."
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      experiment
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Unable to load experiment."
      },
      { status: 500 }
    );
  }
}
    // --------------------------------
// UPDATE EXPERIMENT
// --------------------------------

if (
  url.pathname.startsWith("/api/experiments/") &&
  request.method === "PUT"
) {
  try {
    const id = url.pathname.split("/").pop();

    if (!id || !/^\d+$/.test(id)) {
      return Response.json(
        {
          success: false,
          error: "Invalid experiment ID."
        },
        { status: 400 }
      );
    }

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

    const existing = await env.DB.prepare(
      `SELECT id FROM experiments WHERE id = ?`
    )
      .bind(id)
      .first();

    if (!existing) {
      return Response.json(
        {
          success: false,
          error: "Experiment not found."
        },
        { status: 404 }
      );
    }

    await env.DB.prepare(
      `UPDATE experiments
       SET
         title = ?,
         project = ?,
         objective = ?,
         protocol = ?,
         researcher = ?,
         status = ?,
         start_date = ?,
         tags = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(
        title,
        project,
        objective,
        protocol,
        researcher,
        status,
        startDate,
        tags,
        id
      )
      .run();

    return Response.json({
      success: true,
      experimentId: Number(id)
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Unable to update experiment."
      },
      { status: 500 }
    );
  }
}


// --------------------------------
// CREATE EXPERIMENT NOTE
// --------------------------------

if (
  url.pathname.match(/^\/api\/experiments\/\d+\/notes$/) &&
  request.method === "POST"
) {
  try {
    const parts = url.pathname.split("/");
    const experimentId = parts[3];

    const data = await request.json();

    const note = String(data.note || "").trim();
    const entryType = String(
      data.entry_type || "Observation"
    ).trim();

    if (!note) {
      return Response.json(
        {
          success: false,
          error: "Note cannot be empty."
        },
        { status: 400 }
      );
    }

    const experiment = await env.DB.prepare(
      `SELECT id
       FROM experiments
       WHERE id = ?`
    )
      .bind(experimentId)
      .first();

    if (!experiment) {
      return Response.json(
        {
          success: false,
          error: "Experiment not found."
        },
        { status: 404 }
      );
    }

    const result = await env.DB.prepare(
      `INSERT INTO experiment_notes
        (
          experiment_id,
          note,
          entry_type
        )
       VALUES (?, ?, ?)`
    )
      .bind(
        experimentId,
        note,
        entryType
      )
      .run();

    return Response.json({
      success: true,
      noteId: result.meta.last_row_id
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Unable to create experiment note."
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
