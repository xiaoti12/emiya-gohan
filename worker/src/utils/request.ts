import { HttpError } from "./httpError";

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "请求体不是合法 JSON");
  }
}
