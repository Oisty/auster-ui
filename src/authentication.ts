import { readable, type Subscriber } from "svelte/store";
import HttpStatusCode from "./httpStatusCodes";

//TODO figure out how to show sign in error (oops I forgot the sign in page might need to be server side rendered...)
// Sign in is a simple HTML form post to the sign in endpoint. The server sets a cookie and the page refreshes.
// The refresh causes the app to request the current authentication state again. We get the authentication state by
// attempting to fetch the users data which we need to always do anyways. If we get a 401 Unauthenticated response
// we show the sign in form mentioned before.
// The sign out is also just a button in a form post to the sign out endpoint after which the app will start again.
// We don't bother reading the cookie or interpreting its data which should be encrypted anyways.
// The advantage of cookie authentication is that we don't have to do a lot of state management like validating a token.
// It also enables us to put src urls to images that require authentication into img elements because the browser
// automatically attaches the cookie which authorizes the request.

type UnexpectedStatusCode = {
  unexpectedStatusCode: number;
};
type ResponseDeserializationError = {
  deserializationError: Error;
};
type AuthenticationError =
  | ConnectionError
  | UnexpectedStatusCode
  | ResponseDeserializationError;
type User = {
  name: string;
  // The url we can fetch the users avatar image from e.g. "/api/users/current/avatar"
  // This url is expected to be in a format that can be put into an img src attribute
  avatarSourceUrl: URL;
};
type Unauthenticated = "Unauthenticated";
type AuthenticatedUser = User;
type Authenticating = "Authenticating";
type AuthenticationState =
  | Authenticating
  | AuthenticatedUser
  | Unauthenticated
  | AuthenticationError;

type ConnectionError = {
  connectionError: Error;
};

// type AuthenticationStateStore = Readable<AuthenticationState>;

// Singleton since there can be only one authentication state. Might incorporate this into a general global "AppState" singleton later
// let currentAuthenticationState:
//   | Promise<AuthenticationStateStore>
//   | NotInitialized;

function start(set: Subscriber<Authenticating>) {
  getAuthenticationState().then(set);
}

const currentAuthenticationState = readable<AuthenticationState>(
  "Authenticating",
  start
);

async function getAuthenticationState(): Promise<AuthenticationState> {
  // Assume this is the current user introspection endpoint
  // Assume it requires "is authenticated" authorization
  const url = "/api/users/current";

  // We check if we are authenticated by retrieving the current users data.
  // If we get an unauthenticated error code the user is not authenticated and needs to sign in.
  // The browser sets and sends the cookie for authentication to the server automatically if a cookie is set
  // We can not make any assumptions about the cookie
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error(
      error,
      "Could not get current user for authentication state. Please check if connection is working."
    );

    return { connectionError: error };
  }

  if (!response.ok) {
    return { unexpectedStatusCode: response.status };
  }

  // This could be a one liner but we will add user data here later
  //TODO add user data
  if (response.status === HttpStatusCode.Unauthenticated)
    return "Unauthenticated";

  // Assume JSON has valid format 😬
  try {
    const user = (await response.json()) as User;
    return user;
  } catch (error) {
    return { deserializationError: error };
  }
}

// async function getCurrentAuthenticationStateInternal(): Promise<AuthenticationStateStore> {
//   // Else the authentication state has not been initialized yet and we fetch the current
//   const result = await getAuthenticationState();

//   const store = readable<AuthenticationState>(result);
//   return store;
// }

// async function getCurrentAuthenticationState(): Promise<AuthenticationStateStore> {
//   // This would require a mutex normally but from what I can tell it isn't needed in JS-land?
//   // The goal here is to not run multiple authentication requests when multiple components request
//   // the current authentications state (maybe a better solution is to solve this through a store?)
//   if (currentAuthenticationState === "NotInitialized")
//     currentAuthenticationState = getCurrentAuthenticationStateInternal();

//   return await currentAuthenticationState;
// }

const publicRoutes = new Set(["/debug/components"]);

function isAuthenticationRequired(route: string) {
  // I don't like writing this logic but I haven't found a router package handling authorized routes.
  // I should probably contribute to one

  // Assume all routes require "is authenticated" authorization and those that do not need to be explicitly added
  // This avoids giving users access to authorized pages accidentally
  // Authorization should be enforced on the server but this avoids a bad user experience by avoiding showing users
  // UI that breaks when they are not authorized
  // For now we just check for an one to one match. This doesn't handle dynamic url parts yet

  const isPublic = publicRoutes.has(route);
  return !isPublic;
}
export { isAuthenticationRequired, currentAuthenticationState };
