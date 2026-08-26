export type ActionOk<T = undefined> = T extends undefined ? { ok: true } : { ok: true; data: T };
export type ActionFail = { ok: false; message: string; fieldErrors?: Record<string, string> };
export type ActionResult<T = undefined> = ActionOk<T> | ActionFail;

export const AUTH_REQUIRED = "საჭიროა ავტორიზაცია";
export const ADMIN_REQUIRED = "ადმინისტრატორის უფლება აუცილებელია";
export const GENERIC_LOGIN_ERROR = "ელ. ფოსტა ან პაროლი არასწორია";
export const GENERIC_SERVER_ERROR = "რაღაც შეცდომა მოხდა. სცადეთ ხელახლა.";
