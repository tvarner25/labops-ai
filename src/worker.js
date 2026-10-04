export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ============================================================
    // EARLY ACCESS
    // ============================================================

    if (
      url.pathname === "/api/early-access" &&
      request.method === "POST"
    ) {
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


    // ============================================================
    // CREATE EXPERIMENT
    // ============================================================

    if (
      url.pathname === "/api/experiments" &&
      request.method === "POST"
    ) {
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


    // ============================================================
    // GET ALL EXPERIMENTS
    // ============================================================

    if (
      url.pathname === "/api/experiments" &&
      request.method === "GET"
    ) {
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


    // ============================================================
    // TASKS
    // ============================================================

    if (
      url.pathname === "/api/tasks" &&
      request.method === "GET"
    ) {
      try {
        const { results } = await env.DB.prepare(
          `SELECT
            tasks.id,
            tasks.experiment_id,
            tasks.title,
            tasks.description,
            tasks.assigned_to,
            tasks.due_date,
            tasks.priority,
            tasks.status,
            tasks.created_at,
            tasks.updated_at,
            experiments.title AS experiment_title
           FROM tasks
           LEFT JOIN experiments
             ON experiments.id = tasks.experiment_id
           ORDER BY
             CASE
               WHEN tasks.status = 'Completed' THEN 1
               ELSE 0
             END,
             CASE
               WHEN tasks.due_date IS NULL
                 OR tasks.due_date = ''
               THEN 1
               ELSE 0
             END,
             tasks.due_date ASC,
             tasks.created_at DESC`
        ).all();

        return Response.json({
          success: true,
          tasks: results
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to load tasks."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // CREATE TASK
    // ============================================================

    if (
      url.pathname === "/api/tasks" &&
      request.method === "POST"
    ) {
      try {
        const data = await request.json();

        const title = String(data.title || "").trim();
        const description = String(
          data.description || ""
        ).trim();
        const assignedTo = String(
          data.assigned_to || ""
        ).trim();
        const dueDate = String(
          data.due_date || ""
        ).trim();
        const priority = String(
          data.priority || "Medium"
        ).trim();
        const status = String(
          data.status || "To Do"
        ).trim();

        const experimentId =
          data.experiment_id === "" ||
          data.experiment_id == null
            ? null
            : Number(data.experiment_id);

        if (!title) {
          return Response.json(
            {
              success: false,
              error: "Task title is required."
            },
            { status: 400 }
          );
        }

        if (
          !["Low", "Medium", "High"].includes(priority)
        ) {
          return Response.json(
            {
              success: false,
              error: "Invalid priority."
            },
            { status: 400 }
          );
        }

        if (
          ![
            "To Do",
            "In Progress",
            "Completed"
          ].includes(status)
        ) {
          return Response.json(
            {
              success: false,
              error: "Invalid task status."
            },
            { status: 400 }
          );
        }

        if (experimentId !== null) {
          if (
            !Number.isInteger(experimentId) ||
            experimentId <= 0
          ) {
            return Response.json(
              {
                success: false,
                error: "Invalid experiment."
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
        }

        const result = await env.DB.prepare(
          `INSERT INTO tasks
          (
            experiment_id,
            title,
            description,
            assigned_to,
            due_date,
            priority,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            experimentId,
            title,
            description,
            assignedTo,
            dueDate,
            priority,
            status
          )
          .run();

        return Response.json({
          success: true,
          taskId: result.meta.last_row_id
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to create task."
          },
          { status: 500 }
        );
      }
    }


    const taskMatch = url.pathname.match(
      /^\/api\/tasks\/(\d+)$/
    );

    const experimentTasksMatch = url.pathname.match(
      /^\/api\/experiments\/(\d+)\/tasks$/
    );


    // ============================================================
    // GET TASKS FOR ONE EXPERIMENT
    // ============================================================

    if (
      experimentTasksMatch &&
      request.method === "GET"
    ) {
      try {
        const experimentId =
          experimentTasksMatch[1];

        const { results } = await env.DB.prepare(
          `SELECT
            id,
            experiment_id,
            title,
            description,
            assigned_to,
            due_date,
            priority,
            status,
            created_at,
            updated_at
           FROM tasks
           WHERE experiment_id = ?
           ORDER BY
             CASE
               WHEN status = 'Completed' THEN 1
               ELSE 0
             END,
             due_date ASC,
             created_at DESC`
        )
          .bind(experimentId)
          .all();

        return Response.json({
          success: true,
          tasks: results
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to load experiment tasks."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // GET SINGLE TASK
    // ============================================================

    if (
      taskMatch &&
      request.method === "GET"
    ) {
      try {
        const task = await env.DB.prepare(
          `SELECT
            tasks.*,
            experiments.title AS experiment_title
           FROM tasks
           LEFT JOIN experiments
             ON experiments.id = tasks.experiment_id
           WHERE tasks.id = ?`
        )
          .bind(taskMatch[1])
          .first();

        if (!task) {
          return Response.json(
            {
              success: false,
              error: "Task not found."
            },
            { status: 404 }
          );
        }

        return Response.json({
          success: true,
          task
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to load task."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // UPDATE TASK
    // ============================================================

    if (
      taskMatch &&
      request.method === "PUT"
    ) {
      try {
        const taskId = taskMatch[1];
        const data = await request.json();

        const title = String(data.title || "").trim();
        const description = String(
          data.description || ""
        ).trim();
        const assignedTo = String(
          data.assigned_to || ""
        ).trim();
        const dueDate = String(
          data.due_date || ""
        ).trim();
        const priority = String(
          data.priority || "Medium"
        ).trim();
        const status = String(
          data.status || "To Do"
        ).trim();

        const experimentId =
          data.experiment_id === "" ||
          data.experiment_id == null
            ? null
            : Number(data.experiment_id);

        if (!title) {
          return Response.json(
            {
              success: false,
              error: "Task title is required."
            },
            { status: 400 }
          );
        }

        if (
          !["Low", "Medium", "High"].includes(priority)
        ) {
          return Response.json(
            {
              success: false,
              error: "Invalid priority."
            },
            { status: 400 }
          );
        }

        if (
          ![
            "To Do",
            "In Progress",
            "Completed"
          ].includes(status)
        ) {
          return Response.json(
            {
              success: false,
              error: "Invalid task status."
            },
            { status: 400 }
          );
        }

        const existing = await env.DB.prepare(
          `SELECT id
           FROM tasks
           WHERE id = ?`
        )
          .bind(taskId)
          .first();

        if (!existing) {
          return Response.json(
            {
              success: false,
              error: "Task not found."
            },
            { status: 404 }
          );
        }

        if (experimentId !== null) {
          if (
            !Number.isInteger(experimentId) ||
            experimentId <= 0
          ) {
            return Response.json(
              {
                success: false,
                error: "Invalid experiment."
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
        }

        await env.DB.prepare(
          `UPDATE tasks
           SET
             experiment_id = ?,
             title = ?,
             description = ?,
             assigned_to = ?,
             due_date = ?,
             priority = ?,
             status = ?,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
          .bind(
            experimentId,
            title,
            description,
            assignedTo,
            dueDate,
            priority,
            status,
            taskId
          )
          .run();

        return Response.json({
          success: true,
          taskId: Number(taskId)
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to update task."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // DELETE TASK
    // ============================================================

    if (
      taskMatch &&
      request.method === "DELETE"
    ) {
      try {
        const taskId = taskMatch[1];

        const existing = await env.DB.prepare(
          `SELECT id
           FROM tasks
           WHERE id = ?`
        )
          .bind(taskId)
          .first();

        if (!existing) {
          return Response.json(
            {
              success: false,
              error: "Task not found."
            },
            { status: 404 }
          );
        }

        await env.DB.prepare(
          `DELETE FROM tasks
           WHERE id = ?`
        )
          .bind(taskId)
          .run();

        return Response.json({
          success: true
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to delete task."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // ROUTE MATCHING
    // ============================================================

    const notesListMatch = url.pathname.match(
      /^\/api\/experiments\/(\d+)\/notes$/
    );

    const singleNoteMatch = url.pathname.match(
      /^\/api\/experiments\/(\d+)\/notes\/(\d+)$/
    );

    const resultsListMatch = url.pathname.match(
      /^\/api\/experiments\/(\d+)\/results$/
    );

    const singleResultMatch = url.pathname.match(
      /^\/api\/experiments\/(\d+)\/results\/(\d+)$/
    );

    const experimentMatch = url.pathname.match(
      /^\/api\/experiments\/(\d+)$/
    );


    // ============================================================
    // GET EXPERIMENT NOTES
    // ============================================================

    if (
      notesListMatch &&
      request.method === "GET"
    ) {
      try {
        const experimentId =
          notesListMatch[1];

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


    // ============================================================
    // CREATE EXPERIMENT NOTE
    // ============================================================

    if (
      notesListMatch &&
      request.method === "POST"
    ) {
      try {
        const experimentId =
          notesListMatch[1];

        const data = await request.json();

        const note = String(
          data.note || ""
        ).trim();

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


    // ============================================================
    // UPDATE EXPERIMENT NOTE
    // ============================================================

    if (
      singleNoteMatch &&
      request.method === "PUT"
    ) {
      try {
        const experimentId =
          singleNoteMatch[1];

        const noteId =
          singleNoteMatch[2];

        const data = await request.json();

        const note = String(
          data.note || ""
        ).trim();

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

        const existingNote = await env.DB.prepare(
          `SELECT id
           FROM experiment_notes
           WHERE id = ?
           AND experiment_id = ?`
        )
          .bind(
            noteId,
            experimentId
          )
          .first();

        if (!existingNote) {
          return Response.json(
            {
              success: false,
              error: "Experiment entry not found."
            },
            { status: 404 }
          );
        }

        await env.DB.prepare(
          `UPDATE experiment_notes
           SET
             note = ?,
             entry_type = ?,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
           AND experiment_id = ?`
        )
          .bind(
            note,
            entryType,
            noteId,
            experimentId
          )
          .run();

        return Response.json({
          success: true,
          noteId: Number(noteId)
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to update experiment entry."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // DELETE EXPERIMENT NOTE
    // ============================================================

    if (
      singleNoteMatch &&
      request.method === "DELETE"
    ) {
      try {
        const experimentId =
          singleNoteMatch[1];

        const noteId =
          singleNoteMatch[2];

        const existingNote = await env.DB.prepare(
          `SELECT id
           FROM experiment_notes
           WHERE id = ?
           AND experiment_id = ?`
        )
          .bind(
            noteId,
            experimentId
          )
          .first();

        if (!existingNote) {
          return Response.json(
            {
              success: false,
              error: "Experiment entry not found."
            },
            { status: 404 }
          );
        }

        await env.DB.prepare(
          `DELETE FROM experiment_notes
           WHERE id = ?
           AND experiment_id = ?`
        )
          .bind(
            noteId,
            experimentId
          )
          .run();

        return Response.json({
          success: true
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
                        error: "Unable to delete experiment entry."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // GET EXPERIMENT RESULTS
    // ============================================================

    if (
      resultsListMatch &&
      request.method === "GET"
    ) {
      try {
        const experimentId =
          resultsListMatch[1];

        const { results } = await env.DB.prepare(
          `SELECT
            id,
            experiment_id,
            sample_name,
            measurement,
            value,
            unit,
            notes,
            created_at,
            updated_at
           FROM experiment_results
           WHERE experiment_id = ?
           ORDER BY created_at DESC, id DESC`
        )
          .bind(experimentId)
          .all();

        return Response.json({
          success: true,
          results
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to load experiment results."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // CREATE EXPERIMENT RESULT
    // ============================================================

    if (
      resultsListMatch &&
      request.method === "POST"
    ) {
      try {
        const experimentId =
          resultsListMatch[1];

        const data = await request.json();

        const sampleName = String(
          data.sample_name || ""
        ).trim();

        const measurement = String(
          data.measurement || ""
        ).trim();

        const unit = String(
          data.unit || ""
        ).trim();

        const notes = String(
          data.notes || ""
        ).trim();

        if (!measurement) {
          return Response.json(
            {
              success: false,
              error: "Measurement is required."
            },
            { status: 400 }
          );
        }

        if (
          data.value === "" ||
          data.value === null ||
          data.value === undefined
        ) {
          return Response.json(
            {
              success: false,
              error: "A numeric value is required."
            },
            { status: 400 }
          );
        }

        const value =
          Number(data.value);

        if (!Number.isFinite(value)) {
          return Response.json(
            {
              success: false,
              error: "Value must be a valid number."
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
          `INSERT INTO experiment_results
          (
            experiment_id,
            sample_name,
            measurement,
            value,
            unit,
            notes
          )
          VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            experimentId,
            sampleName,
            measurement,
            value,
            unit,
            notes
          )
          .run();

        return Response.json({
          success: true,
          resultId: result.meta.last_row_id
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to create experiment result."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // UPDATE EXPERIMENT RESULT
    // ============================================================

    if (
      singleResultMatch &&
      request.method === "PUT"
    ) {
      try {
        const experimentId =
          singleResultMatch[1];

        const resultId =
          singleResultMatch[2];

        const data = await request.json();

        const sampleName = String(
          data.sample_name || ""
        ).trim();

        const measurement = String(
          data.measurement || ""
        ).trim();

        const unit = String(
          data.unit || ""
        ).trim();

        const notes = String(
          data.notes || ""
        ).trim();

        if (!measurement) {
          return Response.json(
            {
              success: false,
              error: "Measurement is required."
            },
            { status: 400 }
          );
        }

        if (
          data.value === "" ||
          data.value === null ||
          data.value === undefined
        ) {
          return Response.json(
            {
              success: false,
              error: "A numeric value is required."
            },
            { status: 400 }
          );
        }

        const value =
          Number(data.value);

        if (!Number.isFinite(value)) {
          return Response.json(
            {
              success: false,
              error: "Value must be a valid number."
            },
            { status: 400 }
          );
        }

        const existingResult =
          await env.DB.prepare(
            `SELECT id
             FROM experiment_results
             WHERE id = ?
             AND experiment_id = ?`
          )
            .bind(
              resultId,
              experimentId
            )
            .first();

        if (!existingResult) {
          return Response.json(
            {
              success: false,
              error: "Result not found."
            },
            { status: 404 }
          );
        }

        await env.DB.prepare(
          `UPDATE experiment_results
           SET
             sample_name = ?,
             measurement = ?,
             value = ?,
             unit = ?,
             notes = ?,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
           AND experiment_id = ?`
        )
          .bind(
            sampleName,
            measurement,
            value,
            unit,
            notes,
            resultId,
            experimentId
          )
          .run();

        return Response.json({
          success: true,
          resultId: Number(resultId)
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to update experiment result."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // DELETE EXPERIMENT RESULT
    // ============================================================

    if (
      singleResultMatch &&
      request.method === "DELETE"
    ) {
      try {
        const experimentId =
          singleResultMatch[1];

        const resultId =
          singleResultMatch[2];

        const existingResult =
          await env.DB.prepare(
            `SELECT id
             FROM experiment_results
             WHERE id = ?
             AND experiment_id = ?`
          )
            .bind(
              resultId,
              experimentId
            )
            .first();

        if (!existingResult) {
          return Response.json(
            {
              success: false,
              error: "Result not found."
            },
            { status: 404 }
          );
        }

        await env.DB.prepare(
          `DELETE FROM experiment_results
           WHERE id = ?
           AND experiment_id = ?`
        )
          .bind(
            resultId,
            experimentId
          )
          .run();

        return Response.json({
          success: true
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Unable to delete experiment result."
          },
          { status: 500 }
        );
      }
    }


    // ============================================================
    // GET SINGLE EXPERIMENT
    // ============================================================

    if (
      experimentMatch &&
      request.method === "GET"
    ) {
      try {
        const id =
          experimentMatch[1];

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


    // ============================================================
    // UPDATE EXPERIMENT
    // ============================================================

    if (
      experimentMatch &&
      request.method === "PUT"
    ) {
      try {
        const id =
          experimentMatch[1];

        const data =
          await request.json();

        const title = String(
          data.title || ""
        ).trim();

        const project = String(
          data.project || ""
        ).trim();

        const objective = String(
          data.objective || ""
        ).trim();

        const protocol = String(
          data.protocol || ""
        ).trim();

        const researcher = String(
          data.researcher || ""
        ).trim();

        const status = String(
          data.status || "Planning"
        ).trim();

        const startDate = String(
          data.start_date || ""
        ).trim();

        const tags = String(
          data.tags || ""
        ).trim();

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
          `SELECT id
           FROM experiments
           WHERE id = ?`
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


    // ============================================================
    // STATIC WEBSITE
    // ============================================================

    return env.ASSETS.fetch(request);
  }
};
            
