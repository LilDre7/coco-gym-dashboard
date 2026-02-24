"use client";

import { useState } from "react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  formatCurrency,
  formatDate,
  formatPhoneForWhatsApp,
  formatTenure,
} from "@/lib/member-utils";
import { addMember, updateMember, deleteMember } from "@/lib/actions";
import { Plus, Pencil, Trash2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface MembersTableProps {
  members: MemberWithStatus[];
}

const statusConfig: Record<
  MemberStatus,
  { label: string; className: string; rowClassName: string }
> = {
  active: {
    label: "Active",
    className: "bg-primary/10 text-primary border-primary/20",
    rowClassName: "bg-primary/5",
  },
  expiring: {
    label: "Expiring",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    rowClassName: "bg-amber-50/50",
  },
  expired: {
    label: "Expired",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    rowClassName: "bg-destructive/5",
  },
  inactive: {
    label: "Inactive",
    className: "bg-muted text-muted-foreground border-border",
    rowClassName: "bg-muted/30",
  },
};

export function MembersTable({ members }: MembersTableProps) {
  const router = useRouter();
  const [nameFilter, setNameFilter] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithStatus | null>(
    null
  );
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    id?: string
  ) => {
    setIsSaving(true);
    try {
      if (id) {
        await updateMember(id, data);
      } else {
        await addMember(data);
      }
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to save member:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMember(id);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete member:", err);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 lg:py-6">
          <CardTitle className="text-xl lg:text-2xl">Members</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:gap-3">
            <Input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Search by name..."
              className="w-full sm:w-[230px] lg:h-11 lg:text-base"
            />
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] lg:h-11 lg:text-base">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring">Expiring</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} className="w-full sm:w-auto lg:h-11 lg:px-5 lg:text-base">
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
                <TableHead className="hidden lg:table-cell">Time in Gym</TableHead>
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
                filteredMembers.map((member) => {
                  const config = statusConfig[member.status];
                  return (
                    <TableRow key={member.id} className={config.rowClassName}>
                      <TableCell className="font-medium lg:text-[1.05rem]">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenPhoto(member)}
                            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title="View photo"
                          >
                            <Avatar className="size-8 lg:size-10">
                              <AvatarImage src={member.photo_url || ""} alt={member.name} />
                              <AvatarFallback className="text-xs font-semibold lg:text-sm">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                          <span>{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {disciplineLabels[member.discipline]}
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
                              : member.days_remaining <= 5
                                ? "font-medium text-amber-600"
                                : "text-foreground"
                          }
                        >
                          {member.days_remaining < 0
                            ? `${Math.abs(member.days_remaining)}d overdue`
                            : `${member.days_remaining}d`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${config.className} lg:px-3 lg:py-1 lg:text-sm`}
                        >
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {member.status === "active"
                          ? formatTenure(member.tenure_days)
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {member.phone}
                      </TableCell>
                      <TableCell className="hidden max-w-[200px] truncate 2xl:table-cell">
                        {member.description || "\u2014"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 lg:gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="lg:size-9"
                            onClick={() => handleWhatsApp(member.phone)}
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4 text-primary lg:h-5 lg:w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="lg:size-9"
                            onClick={() => handleEdit(member)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 lg:h-5 lg:w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="lg:size-9"
                            onClick={() => handleDelete(member.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive lg:h-5 lg:w-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
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
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-3 pb-2">
              {selectedMember.photo_url ? (
                <>
                  <div className="overflow-hidden rounded-xl bg-muted">
                    <img
                      src={selectedMember.photo_url}
                      alt={selectedMember.name}
                      className="max-h-[75vh] w-full object-contain"
                    />
                  </div>
                  <div className="flex justify-end">
                    <a
                      href={selectedMember.photo_url}
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
    </>
  );
}
