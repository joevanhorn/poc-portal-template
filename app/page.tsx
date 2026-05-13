import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import GuideClient from "./guide-client";
import { loadGuide } from "../lib/guide";
import { branding } from "../lib/branding";

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const { styles, body } = await loadGuide();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                {branding.fullTitle}
              </h1>
              <p className="text-xs text-gray-500">
                {session.user?.email}
              </p>
            </div>
          </div>
          <a
            href="/api/auth/signout"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </a>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
          <GuideClient styles={styles} body={body} />
        </div>
      </main>
    </div>
  );
}
