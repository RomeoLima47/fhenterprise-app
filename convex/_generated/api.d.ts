/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as analytics from "../analytics.js";
import type * as attachments from "../attachments.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as invitations from "../invitations.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as overdueChecker from "../overdueChecker.js";
import type * as projectMembers from "../projectMembers.js";
import type * as projects from "../projects.js";
import type * as tasks from "../tasks.js";
import type * as team from "../team.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  analytics: typeof analytics;
  attachments: typeof attachments;
  comments: typeof comments;
  crons: typeof crons;
  invitations: typeof invitations;
  notes: typeof notes;
  notifications: typeof notifications;
  overdueChecker: typeof overdueChecker;
  projectMembers: typeof projectMembers;
  projects: typeof projects;
  tasks: typeof tasks;
  team: typeof team;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
