import { Context } from "koa";
import { analyzeImage } from "../service/groq";

export default {
  async analyze(ctx: Context) {
    const file = ctx.request.files?.image as any;

    if (!file) {
      return ctx.badRequest("No image uploaded");
    }

    // FIX: handle different Strapi file structures safely
    const filePath = file.filepath || file.path;

    if (!filePath) {
      return ctx.internalServerError("File path not found in upload");
    }

    try {
      const result = await analyzeImage(filePath);
      return ctx.send({ success: true, result });
    } catch (error) {
  console.log(" FULL ERROR:", error);
  console.log(" STACK:", error.stack);

  return ctx.internalServerError({
    message: error.message,
    stack: error.stack,
  });
}
  },
};