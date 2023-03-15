<script lang="ts">
  import { Route, Router, navigate } from "svelte-routing";
  import SignIn from "./pages/SignIn.svelte";
  import Debug from "./debug/Components.svelte";
  import {
    currentAuthenticationState,
    isAuthenticationRequired,
  } from "./authentication";

  let url = "";

  //TODO Handle error in UI and log them
  const isAuthenticated =
    $currentAuthenticationState !== "Authenticating" &&
    $currentAuthenticationState !== "Unauthenticated" &&
    "name" in $currentAuthenticationState;

  // If not authenticated and route requires authentication, require user to sign in
  if (!isAuthenticated && isAuthenticationRequired(location.pathname)) {
    navigate("/signin");
  }
</script>

{#if $currentAuthenticationState === "Authenticating"}
  <!-- TODO add proper authenticating UI -->
  <p>Authenticating...</p>
{:else}
  <Router {url}>
    <Route path="signin" component={SignIn} />
    <Route path="debug/components" component={Debug} />
  </Router>
{/if}
