import { describe, expect, it } from "vitest";
import { detectVerificationCode, InMemoryYouTubeVerificationStore } from "./verification.js";

describe("YouTube verification code boundary", () => {
  it("detects IRIS verification codes", () => {
    expect(detectVerificationCode("hello IRIS-ABC123")).toBe("IRIS-ABC123");
  });

  it("verifies a code once within 10 minutes for the target stream", async () => {
    const store = new InMemoryYouTubeVerificationStore();
    await store.createChallenge({ streamId: "stream_1", irisUserId: "usr_1", code: "IRIS-ABC123", now: new Date("2026-06-03T00:00:00.000Z") });
    const verified = await store.consumeCode({ streamId: "stream_1", youtubeAuthorChannelId: "UC1", message: "IRIS-ABC123", now: new Date("2026-06-03T00:09:00.000Z") });
    expect(verified?.iris_user_id).toBe("usr_1");
    await expect(store.getLink("UC1")).resolves.toMatchObject({ iris_user_id: "usr_1" });
    await expect(store.consumeCode({ streamId: "stream_1", youtubeAuthorChannelId: "UC1", message: "IRIS-ABC123", now: new Date("2026-06-03T00:09:01.000Z") })).resolves.toBeUndefined();
  });

  it("rejects expired and wrong-stream verification attempts", async () => {
    const store = new InMemoryYouTubeVerificationStore();
    await store.createChallenge({ streamId: "stream_1", irisUserId: "usr_1", code: "IRIS-XYZ789", now: new Date("2026-06-03T00:00:00.000Z") });
    await expect(store.consumeCode({ streamId: "stream_2", youtubeAuthorChannelId: "UC2", message: "IRIS-XYZ789", now: new Date("2026-06-03T00:01:00.000Z") })).resolves.toBeUndefined();
    await expect(store.consumeCode({ streamId: "stream_1", youtubeAuthorChannelId: "UC2", message: "IRIS-XYZ789", now: new Date("2026-06-03T00:11:00.000Z") })).resolves.toBeUndefined();
  });
});
