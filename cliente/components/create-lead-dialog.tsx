"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createLead } from "@/services/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus } from "lucide-react"

export function CreateLeadDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    businessName: "",
    website: "",
    category: "",
    city: "",
  })

  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Lead created")
      setOpen(false)
      setForm({ businessName: "", website: "", category: "", city: "" })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.businessName.trim()) return toast.error("Business name is required")
    mutation.mutate({
      businessName: form.businessName,
      website: form.website || undefined,
      category: form.category || undefined,
      city: form.city || undefined,
    })
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <>
      <Button
        size="sm"
        className="gap-1.5 h-8 px-3 text-[13px] bg-violet-600 hover:bg-violet-500 text-white shadow-none"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        New Lead
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#111114] border-white/[0.08] text-zinc-100 shadow-2xl p-0 gap-0 overflow-hidden max-w-md">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <DialogTitle className="text-[15px] font-semibold text-zinc-100">
              New Lead
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <Field label="Business Name" required>
              <Input
                placeholder="Acme Corp"
                className="h-8 bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-700 text-[13px] focus-visible:ring-violet-500/30 focus-visible:border-violet-500/50"
                {...field("businessName")}
              />
            </Field>

            <Field label="Website">
              <Input
                placeholder="https://example.com"
                className="h-8 bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-700 text-[13px] focus-visible:ring-violet-500/30 focus-visible:border-violet-500/50"
                {...field("website")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Input
                  placeholder="Restaurant"
                  className="h-8 bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-700 text-[13px] focus-visible:ring-violet-500/30 focus-visible:border-violet-500/50"
                  {...field("category")}
                />
              </Field>
              <Field label="City">
                <Input
                  placeholder="New York"
                  className="h-8 bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-700 text-[13px] focus-visible:ring-violet-500/30 focus-visible:border-violet-500/50"
                  {...field("city")}
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-[13px] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3 text-[13px] bg-violet-600 hover:bg-violet-500 text-white shadow-none"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Creating..." : "Create Lead"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-violet-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}
