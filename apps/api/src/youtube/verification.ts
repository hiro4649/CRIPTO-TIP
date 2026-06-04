import { createPublicId, sha256Hex, type YouTubeViewerVerified } from "@cripto-tip/shared";

export const verificationCodeRegex = /\bIRIS-[A-Z0-9]{6}\b/;

export type PendingYouTubeVerification = {
  id: string;
  stream_id: string;
  iris_user_id: string;
  code_hash: string;
  expires_at: string;
  consumed_at?: string;
};

export type YouTubeViewerLink = {
  iris_user_id: string;
  youtube_author_channel_id: string;
  stream_id: string;
  verified_at: string;
};

export class InMemoryYouTubeVerificationStore {
  pending = new Map<string, PendingYouTubeVerification>();
  links = new Map<string, YouTubeViewerLink>();

  async createChallenge(args: { streamId: string; irisUserId: string; code: string; now?: Date }) {
    const now = args.now ?? new Date();
    const challenge: PendingYouTubeVerification = {
      id: createPublicId("ytv"),
      stream_id: args.streamId,
      iris_user_id: args.irisUserId,
      code_hash: await sha256Hex(args.code),
      expires_at: new Date(now.getTime() + 10 * 60_000).toISOString()
    };
    this.pending.set(challenge.id, challenge);
    return challenge;
  }

  async consumeCode(args: { streamId: string; youtubeAuthorChannelId: string; message: string; now?: Date }): Promise<YouTubeViewerVerified | undefined> {
    const code = detectVerificationCode(args.message);
    if (!code) return undefined;
    const codeHash = await sha256Hex(code);
    const now = args.now ?? new Date();
    for (const [id, challenge] of this.pending.entries()) {
      if (challenge.code_hash !== codeHash) continue;
      if (challenge.stream_id !== args.streamId) return undefined;
      if (challenge.consumed_at) return undefined;
      if (new Date(challenge.expires_at).getTime() < now.getTime()) return undefined;
      const verifiedAt = now.toISOString();
      this.pending.set(id, { ...challenge, consumed_at: verifiedAt });
      this.links.set(args.youtubeAuthorChannelId, { iris_user_id: challenge.iris_user_id, youtube_author_channel_id: args.youtubeAuthorChannelId, stream_id: args.streamId, verified_at: verifiedAt });
      return {
        event_type: "youtube.viewer.verified",
        event_id: createPublicId("ytv_evt"),
        iris_user_id: challenge.iris_user_id,
        youtube_author_channel_id: args.youtubeAuthorChannelId,
        code,
        expires_at: challenge.expires_at
      };
    }
    return undefined;
  }

  async getLink(youtubeAuthorChannelId: string) {
    return this.links.get(youtubeAuthorChannelId);
  }
}

export function detectVerificationCode(message: string) {
  return message.match(verificationCodeRegex)?.[0];
}
