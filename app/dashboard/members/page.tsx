import { getMembers } from "@/lib/actions";
import { enrichMemberData } from "@/lib/member-utils";
import { MembersTable } from "@/components/members-table";

export default async function MembersPage() {
  const members = await getMembers();
  const enrichedMembers = members.map(enrichMemberData);

  return (
    <main className="w-full space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground lg:text-3xl">Members</h1>
        <p className="text-muted-foreground lg:text-base">
          Manage your gym members and subscriptions
        </p>
      </div>

      <MembersTable members={enrichedMembers} />
    </main>
  );
}
