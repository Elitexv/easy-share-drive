import { createFileRoute } from "@tanstack/react-router";
import { AuthPageContent, searchSchema } from "./auth";

export const Route = createFileRoute("/oauth/consents")({
  validateSearch: (s) => searchSchema.parse(s),
  component: OAuthConsentPage,
  head: () => ({
    meta: [
      { title: "Sign in — E-share" },
      { name: "description", content: "Sign in or create your E-share account." },
    ],
  }),
});

function OAuthConsentPage() {
  const search = Route.useSearch();
  return <AuthPageContent initialMode={search.mode} />;
}
