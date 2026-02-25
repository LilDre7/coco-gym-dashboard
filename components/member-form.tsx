"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MemberRow,
  Discipline,
  Currency,
  disciplineLabels,
  disciplineFeesUSD,
  disciplineFeesCRC,
} from "@/lib/types";

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: MemberRow | null;
  onSave: (
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
  ) => void;
  isSaving?: boolean;
}

export function MemberForm({
  open,
  onOpenChange,
  member,
  onSave,
  isSaving,
}: MemberFormProps) {
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [discipline, setDiscipline] = useState<Discipline>("routine-monthly");
  const [currency, setCurrency] = useState<Currency>("CRC");
  const [monthlyFee, setMonthlyFee] = useState(36000);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (member) {
      setName(member.name);
      setPhotoUrl(member.photo_url || "");
      setDiscipline(member.discipline);
      setCurrency(member.currency || "CRC");
      setMonthlyFee(member.monthly_fee);
      setStartDate(member.start_date);
      setEndDate(member.end_date);
      setPhone(member.phone);
      setDescription(member.description);
    } else {
      setName("");
      setPhotoUrl("");
      setDiscipline("routine-monthly");
      setCurrency("CRC");
      setMonthlyFee(disciplineFeesCRC["routine-monthly"]);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setPhone("");
      setDescription("");
    }
  }, [member, open]);

  const getFeeForDiscipline = (d: Discipline, c: Currency) => {
    return c === "CRC" ? disciplineFeesCRC[d] : disciplineFeesUSD[d];
  };

  const handleDisciplineChange = (value: Discipline) => {
    setDiscipline(value);
    setMonthlyFee(getFeeForDiscipline(value, currency));
  };

  const handleCurrencyChange = (value: Currency) => {
    setCurrency(value);
    setMonthlyFee(getFeeForDiscipline(discipline, value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        name,
        photo_url: photoUrl,
        discipline,
        monthly_fee: monthlyFee,
        currency,
        start_date: startDate,
        end_date: endDate,
        phone,
        description,
      },
      member?.id
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {member ? "Edit Member" : "Add New Member"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Member name"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="photoUrl" className="text-sm font-medium">
              Photo URL
            </label>
            <Input
              id="photoUrl"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="discipline" className="text-sm font-medium">
                Discipline
              </label>
              <Select
                value={discipline}
                onValueChange={handleDisciplineChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(disciplineLabels) as [Discipline, string][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="currency" className="text-sm font-medium">
                Currency
              </label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="CRC">{"\u20A1 CRC (Colones)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="monthlyFee" className="text-sm font-medium">
              Monthly Fee ({currency === "CRC" ? "\u20A1" : "$"})
            </label>
            <Input
              id="monthlyFee"
              type="number"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(Number(e.target.value))}
              min={0}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start Date
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm font-medium">
                End Date
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+506 8888 8888"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : member
                  ? "Save Changes"
                  : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
