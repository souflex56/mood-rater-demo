declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_USER_ID?: string;
    ADMIN_BOOTSTRAP_EMAIL?: string;
    AUTH_PROXY_SECRET?: string;
    AUTH_SIGN_IN_PATH?: string;
    AUTH_SIGN_OUT_PATH?: string;
  }
}
