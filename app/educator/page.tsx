import { redirect } from "next/navigation";
/** Preserve old bookmarks; the learner flow no longer includes an educator. */
export default function LegacyEducatorPage() {
  redirect("/progress");
}
