import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { FetchHttpClient } from "../../../src/infrastructure/http/FetchHttpClient.js";
import { HttpRequestError } from "../../../src/infrastructure/http/HttpRequestError.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("FetchHttpClient", () => {
  it("retourne le JSON parse pour une reponse 200", async () => {
    server.use(
      http.get("https://api.test/data", () => HttpResponse.json({ hello: "world" }))
    );
    const client = new FetchHttpClient();

    const result = await client.getJson<{ hello: string }>("https://api.test/data");

    expect(result).toEqual({ hello: "world" });
  });

  it("leve HttpRequestError sur un statut non-2xx", async () => {
    server.use(http.get("https://api.test/fail", () => new HttpResponse(null, { status: 500 })));
    const client = new FetchHttpClient();

    await expect(client.getJson("https://api.test/fail")).rejects.toBeInstanceOf(HttpRequestError);
  });

  it("leve HttpRequestError sur un corps JSON invalide", async () => {
    server.use(
      http.get("https://api.test/bad-json", () => new HttpResponse("not json", { status: 200 }))
    );
    const client = new FetchHttpClient();

    await expect(client.getJson("https://api.test/bad-json")).rejects.toBeInstanceOf(HttpRequestError);
  });

  it("leve HttpRequestError quand la requete depasse le timeout configure", async () => {
    server.use(
      http.get("https://api.test/slow", async () => {
        await delay(50);
        return HttpResponse.json({ ok: true });
      })
    );
    const client = new FetchHttpClient();

    await expect(
      client.getJson("https://api.test/slow", { timeoutMs: 10 })
    ).rejects.toBeInstanceOf(HttpRequestError);
  });
});
