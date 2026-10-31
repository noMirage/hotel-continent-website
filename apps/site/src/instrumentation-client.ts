import { initBotId } from "botid/client/core";

// Vercel BotID: invisible bot check attached to the requests that submit public forms.
// Server Actions POST to the page URL, so all page POSTs are covered.
initBotId({
  protect: [
    { path: "/", method: "POST" },
    { path: "/*", method: "POST" },
  ],
});
