"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberForm } from "@/components/member-form";
import {
  MemberRow,
  MemberWithStatus,
  Discipline,
  Currency,
  MemberStatus,
  disciplineLabels,
} from "@/lib/types";
import {
  EXPIRING_THRESHOLD_DAYS,
  formatCurrency,
  formatDate,
  formatPhoneForWhatsApp,
  formatTenure,
} from "@/lib/member-utils";
import {
  addMember,
  updateMember,
  renewMember,
  setMemberActiveStatus,
  hardDeleteMember,
} from "@/lib/actions";
import {
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  AlertTriangle,
  Users,
  ShieldCheck,
  Clock3,
  OctagonAlert,
  Loader2,
  Ellipsis,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { fireSuccessConfetti } from "@/lib/confetti";

interface MembersTableProps {
  members: MemberWithStatus[];
}

const statusConfig: Record<
  MemberStatus,
  { label: string; className: string; rowClassName: string }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rowClassName: "",
  },
  expiring: {
    label: "Expiring",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    rowClassName: "bg-amber-50/70",
  },
  expired: {
    label: "Expired",
    className: "bg-red-100 text-red-700 border-red-200",
    rowClassName: "bg-red-50/80",
  },
  inactive: {
    label: "Inactive",
    className: "bg-sky-100 text-sky-700 border-sky-200",
    rowClassName: "bg-sky-50/70",
  },
};

const disciplineConfig: Record<Discipline, { className: string }> = {
  "week-1": {
    className: "bg-teal-100 text-teal-700 border-teal-200",
  },
  "week-2": {
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "week-3": {
    className: "bg-violet-100 text-violet-700 border-violet-200",
  },
  "day-pass": {
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  "routine-monthly": {
    className: "bg-green-100 text-green-700 border-green-200",
  },
  "simple-monthly": {
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  crossfit: {
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
  "personal-trainer": {
    className: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
};

export function MembersTable({ members }: MembersTableProps) {
  const PAGE_SIZE = 20;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [nameFilter, setNameFilter] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithStatus | null>(
    null,
  );
  const [noteMember, setNoteMember] = useState<MemberWithStatus | null>(null);
  const [phoneMember, setPhoneMember] = useState<MemberWithStatus | null>(null);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [renewingMemberId, setRenewingMemberId] = useState<string | null>(null);
  const [togglingMemberId, setTogglingMemberId] = useState<string | null>(null);
  const [hardDeletingMemberId, setHardDeletingMemberId] = useState<
    string | null
  >(null);
  const [memberToToggleActive, setMemberToToggleActive] =
    useState<MemberWithStatus | null>(null);
  const [openingWhatsAppId, setOpeningWhatsAppId] = useState<string | null>(
    null,
  );
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<
    Record<string, string>
  >({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function hydrateSignedUrls() {
      const storagePaths = Array.from(
        new Set(
          members
            .map((member) => member.photo_url)
            .filter((value) => value && !/^https?:\/\//i.test(value)),
        ),
      );

      if (storagePaths.length === 0) {
        setSignedPhotoUrls({});
        return;
      }

      const { data, error } = await supabase.storage
        .from("faces")
        .createSignedUrls(storagePaths, 60 * 60);

      if (!isMounted) return;
      if (error) {
        console.error("Failed to create signed URLs for member photos:", error);
        return;
      }

      const nextMap: Record<string, string> = {};
      for (const item of data) {
        if (item.path && item.signedUrl) {
          nextMap[item.path] = item.signedUrl;
        }
      }
      setSignedPhotoUrls(nextMap);
    }

    void hydrateSignedUrls();
    return () => {
      isMounted = false;
    };
  }, [members, supabase]);

  const totals = {
    total: members.length,
    active: members.filter((member) => member.status === "active").length,
    expiring: members.filter(
      (member) =>
        member.days_remaining >= 0 &&
        member.days_remaining <= EXPIRING_THRESHOLD_DAYS,
    ).length,
    expired: members.filter((member) => member.status === "expired").length,
  };

  const filteredMembers = members.filter((member) => {
    const normalizedNameFilter = nameFilter.trim().toLowerCase();
    const nameMatch =
      normalizedNameFilter === "" ||
      member.name.toLowerCase().includes(normalizedNameFilter);
    const disciplineMatch =
      disciplineFilter === "all" || member.discipline === disciplineFilter;
    const statusMatch =
      statusFilter === "all" || member.status === statusFilter;
    return nameMatch && disciplineMatch && statusMatch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [nameFilter, disciplineFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedMembers = filteredMembers.slice(
    pageStart,
    pageStart + PAGE_SIZE,
  );

  const handleEdit = (member: MemberWithStatus) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingMember(null);
    setFormOpen(true);
  };

  const handleSave = async (
    data: {
      name: string;
      photo_url: string;
      discipline: Discipline;
      monthly_fee: number;
      currency: Currency;
      start_date: string;
      end_date: string;
      phone: string;
      description: string;
    },
    id?: string,
  ) => {
    setIsSaving(true);
    try {
      if (id) {
        await updateMember(id, data);
        fireSuccessConfetti();
        toast.success("Membresía actualizada");
      } else {
        await addMember(data);
        fireSuccessConfetti();
        toast.success("Miembro agregado");
      }
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("DUPLICATE_MEMBER_FIRST_NAME_LAST_NAME")) {
        toast.error(
          "Ya existe un miembro con el mismo nombre y primer apellido",
        );
      } else {
        console.error("Failed to save member:", err);
        toast.error("No se pudo guardar el miembro");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!memberToToggleActive) return;
    const willBeActive = memberToToggleActive.status === "inactive";
    setTogglingMemberId(memberToToggleActive.id);
    try {
      await setMemberActiveStatus(memberToToggleActive.id, willBeActive);
      toast.success(
        willBeActive ? "Member marked as active" : "Member marked as inactive",
      );
      setMemberToToggleActive(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to update member active status:", err);
      toast.error("No se pudo actualizar el estado del miembro");
    } finally {
      setTogglingMemberId(null);
    }
  };

  const handleHardDelete = async () => {
    if (!memberToToggleActive) return;
    setHardDeletingMemberId(memberToToggleActive.id);
    try {
      await hardDeleteMember(memberToToggleActive.id);
      toast.success("Member deleted permanently");
      setMemberToToggleActive(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to permanently delete member:", err);
      toast.error("No se pudo eliminar el miembro del todo");
    } finally {
      setHardDeletingMemberId(null);
    }
  };

  const handleRenew = async (id: string) => {
    setRenewingMemberId(id);
    try {
      await renewMember(id);
      fireSuccessConfetti();
      toast.success("Membresía renovada (fecha fija mensual)");
      router.refresh();
    } catch (err) {
      console.error("Failed to renew member:", err);
      toast.error("No se pudo renovar la membresía");
    } finally {
      setRenewingMemberId(null);
    }
  };

  const handleWhatsApp = (member: MemberWithStatus) => {
    const formattedPhone = formatPhoneForWhatsApp(member.phone);
    if (!formattedPhone) {
      toast.error("Número inválido para WhatsApp");
      return;
    }
    const expirationDate = formatDate(member.end_date);
    const prefilledMessage = `Hola ${member.name}, te recordamos que tu membresía vence el ${expirationDate}.`;
    const encodedMessage = encodeURIComponent(prefilledMessage);

    setOpeningWhatsAppId(member.id);
    window.open(
      `https://wa.me/${formattedPhone}?text=${encodedMessage}`,
      "_blank",
    );
    toast("Abriendo WhatsApp", {
      description: `${member.name} · vence ${expirationDate}`,
    });
    setTimeout(
      () =>
        setOpeningWhatsAppId((current) =>
          current === member.id ? null : current,
        ),
      400,
    );
  };

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  const handleOpenPhoto = (member: MemberWithStatus) => {
    setSelectedMember(member);
    setPhotoOpen(true);
  };

  const handleOpenNote = (member: MemberWithStatus) => {
    if (!member.description?.trim()) return;
    setNoteMember(member);
    setNoteOpen(true);
  };

  const handleOpenPhone = (member: MemberWithStatus) => {
    if (!member.phone?.trim()) return;
    setPhoneMember(member);
    setPhoneOpen(true);
  };

  const resolvePhotoUrl = (photoValue: string) => {
    if (!photoValue) return "";
    if (/^https?:\/\//i.test(photoValue)) return photoValue;
    return signedPhotoUrls[photoValue] || "";
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <p className="text-2xl font-semibold">{totals.total}</p>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <p className="text-2xl font-semibold text-emerald-700">
              {totals.active}
            </p>
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Expiring ({EXPIRING_THRESHOLD_DAYS}d)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <p className="text-2xl font-semibold text-amber-700">
              {totals.expiring}
            </p>
            <Clock3 className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <p className="text-2xl font-semibold text-red-700">
              {totals.expired}
            </p>
            <OctagonAlert className="h-5 w-5 text-red-600" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 lg:py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl lg:text-2xl">Members</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredMembers.length === 0 ? 0 : pageStart + 1}-
              {Math.min(pageStart + PAGE_SIZE, filteredMembers.length)} de{" "}
              {filteredMembers.length}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:gap-3">
            <Input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Search by name..."
              className="w-full sm:w-[230px] lg:h-11 lg:text-base"
            />
            {isHydrated ? (
              <Select
                value={disciplineFilter}
                onValueChange={setDisciplineFilter}
              >
                <SelectTrigger className="w-full sm:w-[170px] lg:h-11 lg:text-base">
                  <SelectValue placeholder="All Disciplines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Disciplines</SelectItem>
                  {(
                    Object.entries(disciplineLabels) as [Discipline, string][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-10 w-full rounded-md border border-input bg-background sm:w-[170px] lg:h-11" />
            )}
            {isHydrated ? (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px] lg:h-11 lg:text-base">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="h-10 w-full rounded-md border border-input bg-background sm:w-[150px] lg:h-11" />
            )}
            <Button
              onClick={handleAdd}
              className="w-full sm:w-auto lg:h-11 lg:px-5 lg:text-base"
            >
              <Plus className="h-4 w-4" />
              Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="lg:text-base lg:[&_th]:h-12 lg:[&_th]:px-4 lg:[&_td]:px-4 lg:[&_td]:py-3">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Discipline
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Monthly Fee
                </TableHead>
                <TableHead className="hidden lg:table-cell">Expires</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Time in Gym
                </TableHead>
                <TableHead className="hidden xl:table-cell">Phone</TableHead>
                <TableHead className="hidden 2xl:table-cell">Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMembers.map((member) => {
                  const config = statusConfig[member.status];
                  return (
                    <TableRow
                      key={member.id}
                      className={`${config.rowClassName} transition-all duration-200`}
                    >
                      <TableCell className="font-medium lg:text-[1.05rem]">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenPhoto(member)}
                            className="rounded-full transition-transform duration-200 ease-out hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title="View photo"
                          >
                            <Avatar className="size-8 lg:size-10">
                              <AvatarImage
                                src={
                                  resolvePhotoUrl(member.photo_url) || undefined
                                }
                                alt={member.name}
                              />
                              <AvatarFallback className="text-xs font-semibold lg:text-sm">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                          <span
                            className="block max-w-[180px] truncate sm:max-w-[230px] lg:max-w-[280px]"
                            title={member.name}
                          >
                            {member.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="outline"
                          className={`${disciplineConfig[member.discipline].className} lg:px-3 lg:py-1 lg:text-sm`}
                        >
                          {disciplineLabels[member.discipline]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatCurrency(member.monthly_fee, member.currency)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(member.end_date)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            member.days_remaining < 0
                              ? "font-medium text-destructive"
                              : member.days_remaining <= EXPIRING_THRESHOLD_DAYS
                                ? "font-medium text-amber-600"
                                : "text-foreground"
                          }
                        >
                          {member.days_remaining < 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {`${Math.abs(member.days_remaining)}d overdue`}
                            </span>
                          ) : (
                            `${member.days_remaining}d`
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${config.className} lg:px-3 lg:py-1 lg:text-sm`}
                        >
                          {member.status === "expired" && (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {member.status === "active"
                          ? formatTenure(member.tenure_days)
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {member.phone?.trim() ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleOpenPhone(member)}
                          >
                            Ver telefono
                          </Button>
                        ) : (
                          "\u2014"
                        )}
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell">
                        {member.description?.trim() ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleOpenNote(member)}
                          >
                            Ver nota
                          </Button>
                        ) : (
                          "\u2014"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 lg:gap-2">
                          {(member.status === "expiring" ||
                            member.status === "expired" ||
                            member.status === "inactive") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm"
                              onClick={() => handleRenew(member.id)}
                              disabled={renewingMemberId === member.id}
                              title="Renew membership (fixed monthly date)"
                            >
                              {renewingMemberId === member.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : member.status === "inactive" ? (
                                "Reactivar"
                              ) : (
                                "Renovar"
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="transition-all duration-200 ease-out hover:scale-105 active:scale-95 lg:size-9"
                            onClick={() => handleWhatsApp(member)}
                            title="WhatsApp"
                          >
                            {openingWhatsAppId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary lg:h-5 lg:w-5" />
                            ) : (
                              <MessageCircle className="h-4 w-4 text-primary lg:h-5 lg:w-5" />
                            )}
                          </Button>
                          {isHydrated ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="transition-all duration-200 ease-out hover:scale-105 active:scale-95 lg:size-9"
                                  title="More actions"
                                >
                                  <Ellipsis className="h-4 w-4 lg:h-5 lg:w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => handleEdit(member)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit member
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setMemberToToggleActive(member)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                  Manage status
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="transition-all duration-200 ease-out lg:size-9"
                              title="More actions"
                              disabled
                            >
                              <Ellipsis className="h-4 w-4 lg:h-5 lg:w-5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 sm:px-6">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <MemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editingMember}
        onSave={handleSave}
        isSaving={isSaving}
      />
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedMember?.name}</DialogTitle>
            <DialogDescription>Member profile photo preview.</DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-3 pb-2">
              {resolvePhotoUrl(selectedMember.photo_url) ? (
                <>
                  <div className="overflow-hidden rounded-xl bg-muted">
                    <img
                      src={resolvePhotoUrl(selectedMember.photo_url)}
                      alt={selectedMember.name}
                      className="max-h-[75vh] w-full object-contain"
                    />
                  </div>
                  <div className="flex justify-end">
                    <a
                      href={resolvePhotoUrl(selectedMember.photo_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary underline underline-offset-4"
                    >
                      Open original image
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex justify-center">
                  <Avatar className="size-44 lg:size-56">
                    <AvatarFallback className="text-4xl font-semibold">
                      {getInitials(selectedMember.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={noteOpen}
        onOpenChange={(open) => {
          setNoteOpen(open);
          if (!open) setNoteMember(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Nota {noteMember ? `de ${noteMember.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <p className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {noteMember?.description || "Sin nota"}
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={phoneOpen}
        onOpenChange={(open) => {
          setPhoneOpen(open);
          if (!open) setPhoneMember(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Telefono{" "}
              {phoneMember ? (
                <span className="font-semibold text-primary">
                  {phoneMember.name}
                </span>
              ) : (
                ""
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {phoneMember?.phone?.trim() ? (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <p>{phoneMember?.phone || "Sin telefono"}</p>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`https://wa.me/${formatPhoneForWhatsApp(phoneMember.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${phoneMember.phone.replace(/\s+/g, "")}`}>
                    Llamar
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(memberToToggleActive)}
        onOpenChange={(open) => {
          if (!open && !togglingMemberId && !hardDeletingMemberId) {
            setMemberToToggleActive(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border-border/60 p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Manage member
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {memberToToggleActive
                ? memberToToggleActive.status === "inactive"
                  ? `${memberToToggleActive.name} is inactive. You can mark this member as active or delete permanently.`
                  : `${memberToToggleActive.name} can be marked as inactive (history preserved) or deleted permanently.`
                : "Member status will be updated."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={Boolean(togglingMemberId || hardDeletingMemberId)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              disabled={Boolean(togglingMemberId || hardDeletingMemberId)}
              className="bg-foreground text-background transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-foreground/90 active:scale-[0.98]"
            >
              {togglingMemberId ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : memberToToggleActive?.status === "inactive" ? (
                "Mark active"
              ) : (
                "Mark inactive"
              )}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleHardDelete}
              disabled={Boolean(togglingMemberId || hardDeletingMemberId)}
              className="bg-destructive text-white transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-destructive/90 active:scale-[0.98]"
            >
              {hardDeletingMemberId ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
