import fastify from "fastify";
import path from "path";
import os from "os";
import fastifyStatic from "fastify-static";
import { initDownloadCache } from "./download_cache";
import { LogicError, getStatusCodeForError, ErrorCode, DEFAULT_ERROR_STATUS_CODE } from "./errors";
import { startLiveRecorder } from "./youtube_live";


async function startApp() {
  const app = fastify({
    logger: {
      level: "warn"
    }
  });


  app.setErrorHandler((error, req, res) => {
    console.error("request error", error);
    if (error instanceof LogicError) {
      res.status(getStatusCodeForError(error.code)).send({
        error: error.code,
        text: error.text
      });
    } else {
      res.status(DEFAULT_ERROR_STATUS_CODE).send({
        error: ErrorCode.Internal,
        text: "internal server error"
      });
    }
  });


  app.register(require("./api"));
  app.register(fastifyStatic, {
    root: [ path.join(__dirname, "static") ],
    prefix: "/static",
    allowedPath: (p: string, root: string | undefined) => {
      console.log("checking path", p, root);
      return p.startsWith(os.tmpdir() + "/");
    }
  });


  const port = process.env["PORT"] ?? 8080;
  await app.listen(port, "0.0.0.0");
  console.log("Application listening on port", port);

  await initDownloadCache();
  startLiveRecorder();
}


startApp().catch(err => {
  console.error("Failed to initialize app", err);
});
