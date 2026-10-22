declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_USER_ID?: string;
    ADMIN_BOOTSTRAP_EMAIL?: string;
  }
}
