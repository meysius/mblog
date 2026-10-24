import { Sidebar } from "./sidebar";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col md:pl-60">
      <Sidebar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 md:px-10 md:py-12">
        {children}
      </main>
    </div>
  );
}
