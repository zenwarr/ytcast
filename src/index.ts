import fastify from "fastify";
import { initDownloadCache, startOptimizeCache } from "./download";
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


  const port = process.env["PORT"] ?? 8080;
  await app.listen(port, "0.0.0.0");
  console.log("Application listening on port", port);

  await initDownloadCache();
  startLiveRecorder();
  startOptimizeCache();
}


startApp().catch(err => {
  console.error("Failed to initialize app", err);
});
