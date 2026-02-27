"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  disciplineFeesCRC,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatPersonName } from "@/lib/member-utils";

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
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (member) {
      setName(formatPersonName(member.name));
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
      setPhotoPreviewUrl("");
    }
  }, [member, open]);

  useEffect(() => {
    let isMounted = true;
    async function loadPreview() {
      if (!photoUrl) {
        setPhotoPreviewUrl("");
        return;
      }
      if (/^https?:\/\//i.test(photoUrl)) {
        setPhotoPreviewUrl(photoUrl);
        return;
      }
      const { data, error } = await supabase.storage
        .from("faces")
        .createSignedUrl(photoUrl, 60 * 60);
      if (!isMounted) return;
      if (error) {
        console.error("Failed to create signed photo URL:", error);
        setPhotoPreviewUrl("");
        return;
      }
      setPhotoPreviewUrl(data.signedUrl);
    }
    void loadPreview();
    return () => {
      isMounted = false;
    };
  }, [photoUrl, supabase]);

  useEffect(() => {
    let isMounted = true;
    async function loadExchangeRate() {
      setIsRateLoading(true);
      try {
        const response = await fetch("/api/exchange-rate", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load exchange rate");
        const payload = (await response.json()) as { rate?: number };
        if (!isMounted) return;
        if (typeof payload.rate === "number" && Number.isFinite(payload.rate) && payload.rate > 0) {
          setExchangeRate(payload.rate);
        } else {
          setExchangeRate(null);
        }
      } catch {
        if (!isMounted) return;
        setExchangeRate(null);
      } finally {
        if (!isMounted) return;
        setIsRateLoading(false);
      }
    }

    if (open) {
      void loadExchangeRate();
    }

    return () => {
      isMounted = false;
    };
  }, [open]);

  const getFeeForDiscipline = (d: Discipline, c: Currency) => {
    const feeCRC = disciplineFeesCRC[d];
    if (c === "CRC") return feeCRC;
    if (!exchangeRate || exchangeRate <= 0) return 0;
    return Math.round((feeCRC / exchangeRate) * 100) / 100;
  };

  const handleDisciplineChange = (value: Discipline) => {
    setDiscipline(value);
    setMonthlyFee(getFeeForDiscipline(value, currency));
  };

  const handleCurrencyChange = (value: Currency) => {
    setCurrency(value);
    setMonthlyFee(getFeeForDiscipline(discipline, value));
  };

  useEffect(() => {
    if (currency !== "USD" || !exchangeRate || exchangeRate <= 0) return;
    setMonthlyFee(getFeeForDiscipline(discipline, "USD"));
  }, [currency, discipline, exchangeRate]);

  const handlePhotoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen");
      e.target.value = "";
      return;
    }

    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast.error("La imagen supera el limite de 5MB");
      e.target.value = "";
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No authenticated user");

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const oldPath =
        photoUrl && !/^https?:\/\//i.test(photoUrl) ? photoUrl : null;

      const { error: uploadError } = await supabase.storage
        .from("faces")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      if (oldPath && oldPath !== filePath) {
        const { error: removeError } = await supabase.storage
          .from("faces")
          .remove([oldPath]);
        if (removeError) {
          console.warn("Failed to remove previous photo:", removeError);
        }
      }

      setPhotoUrl(filePath);
      toast.success("Foto subida correctamente");
    } catch (error) {
      console.error("Photo upload failed:", error);
      toast.error("No se pudo subir la foto");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = formatPersonName(name);
    setName(normalizedName);
    onSave(
      {
        name: normalizedName,
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
              onBlur={(e) => setName(formatPersonName(e.target.value))}
              placeholder="Member name"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="photoUpload" className="text-sm font-medium">
              Foto del cliente
            </label>
            <div className="rounded-lg border border-dashed p-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-16">
                  <AvatarImage
                    src={photoPreviewUrl || undefined}
                    alt={name || "Client"}
                  />
                  <AvatarFallback className="text-xs">
                    {name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? "")
                      .join("") || "N/A"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Toma la foto desde el celular del gym y subela al momento.</p>
                  <p>La imagen se guarda privada en Supabase Storage.</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingPhoto}
                  onClick={() =>
                    document.getElementById("photoUploadCamera")?.click()
                  }
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  Tomar foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingPhoto}
                  onClick={() =>
                    document.getElementById("photoUploadFile")?.click()
                  }
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Subir archivo
                </Button>
              </div>
              <Input
                id="photoUploadCamera"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoFileChange}
              />
              <Input
                id="photoUploadFile"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoFileChange}
              />
              {photoUrl && (
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  Storage path: {photoUrl}
                </p>
              )}
            </div>
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
            {currency === "USD" && (
              <p className="text-xs text-muted-foreground">
                {isRateLoading
                  ? "Cargando tipo de cambio..."
                  : exchangeRate
                    ? `Tasa usada: 1 USD = ${exchangeRate.toFixed(2)} CRC`
                    : "No se pudo cargar la tasa. Puedes escribir el precio manualmente."}
              </p>
            )}
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
